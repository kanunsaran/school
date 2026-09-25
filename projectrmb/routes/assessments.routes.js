const express = require('express');
const router = express.Router();
const { pool } = require('../db');

async function getTargetGradeIds(assessmentId) {
  const [rows] = await pool.query(
    `SELECT grade_idgrade FROM assessment_target_grades WHERE assessment_id = ?`,
    [assessmentId]
  );
  return rows.map((r) => r.grade_idgrade);
}

async function getScoreBands(assessmentId) {
  const [rows] = await pool.query(
    `SELECT band_id, assessment_id, min_score, max_score, label, description, color, order_no
     FROM assessment_score_bands
     WHERE assessment_id = ?
     ORDER BY order_no, band_id`,
    [assessmentId]
  );
  return rows;
}

async function insertScoreBands(assessmentId, bands) {
  for (const b of bands || []) {
    await pool.query(
      `INSERT INTO assessment_score_bands (assessment_id, min_score, max_score, label, description, color, order_no)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assessmentId, b.min_score ?? 0, b.max_score ?? 0, b.label || '', b.description || null, b.color || '#ec4899', b.order_no || 0]
    );
  }
}

async function getQuestionsWithOptions(assessmentId) {
  const [questions] = await pool.query(
    `SELECT question_id, question_text, question_type, order_no, required, category, max_rating
     FROM assessment_questions
     WHERE assessment_id = ?
     ORDER BY order_no, question_id`,
    [assessmentId]
  );
  if (!questions.length) return [];

  const questionIds = questions.map((q) => q.question_id);
  const [options] = await pool.query(
    `SELECT option_id, question_id, option_text, order_no, score
     FROM assessment_question_options
     WHERE question_id IN (?)
     ORDER BY order_no, option_id`,
    [questionIds]
  );

  const optionsByQuestion = {};
  options.forEach((o) => {
    if (!optionsByQuestion[o.question_id]) optionsByQuestion[o.question_id] = [];
    optionsByQuestion[o.question_id].push(o);
  });

  return questions.map((q) => ({ ...q, options: optionsByQuestion[q.question_id] || [] }));
}

async function insertQuestions(assessmentId, questions) {
  for (const q of questions || []) {
    // q.required อาจมาจาก JSON body (true/false/undefined) หรือจาก DB ผ่าน getQuestionsWithOptions (0/1)
    // ต้อง normalize ก่อน ไม่งั้น 0 !== false จะได้ true เสมอ (บั๊กที่เจอตอนทดสอบ duplicate)
    const isRequired = (q.required === undefined || q.required === null) ? true : Boolean(q.required);
    const [result] = await pool.query(
      `INSERT INTO assessment_questions (assessment_id, question_text, question_type, order_no, required, category, max_rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assessmentId, q.question_text, q.question_type, q.order_no || 0, isRequired, q.category || null, q.question_type === 'rating' ? (q.max_rating || 5) : null]
    );
    const questionId = result.insertId;

    if ((q.question_type === 'choice' || q.question_type === 'checkbox') && Array.isArray(q.options)) {
      for (const opt of q.options) {
        await pool.query(
          `INSERT INTO assessment_question_options (question_id, option_text, order_no, score) VALUES (?, ?, ?, ?)`,
          [questionId, opt.option_text, opt.order_no || 0, opt.score || 0]
        );
      }
    }
  }
}

// ---------------------- GET รายการทั้งหมด (สรุป ไม่รวมคำถามเต็ม) ----------------------
router.get('/', async (req, res) => {
  try {
    const { created_by_user_id } = req.query;
    const conditions = ['a.deleted_at IS NULL'];
    const params = [];
    if (created_by_user_id) { conditions.push('a.created_by_user_id = ?'); params.push(created_by_user_id); }

    const [rows] = await pool.query(
      `SELECT a.assessment_id, a.title, a.description, a.type, a.status, a.open_date, a.close_date,
              a.scoring_method, a.created_by_user_id, a.created_at, a.updated_at,
              (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.assessment_id) AS question_count,
              (SELECT COUNT(*) FROM assessment_responses r WHERE r.assessment_id = a.assessment_id) AS response_count
       FROM assessments a
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.created_at DESC`,
      params
    );

    const ids = rows.map((r) => r.assessment_id);
    let gradesByAssessment = {};
    if (ids.length) {
      const [grades] = await pool.query(
        `SELECT assessment_id, grade_idgrade FROM assessment_target_grades WHERE assessment_id IN (?)`,
        [ids]
      );
      grades.forEach((g) => {
        if (!gradesByAssessment[g.assessment_id]) gradesByAssessment[g.assessment_id] = [];
        gradesByAssessment[g.assessment_id].push(g.grade_idgrade);
      });
    }

    res.json(rows.map((r) => ({ ...r, target_grade_ids: gradesByAssessment[r.assessment_id] || [] })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET รายการเดียว (เต็ม พร้อมคำถาม+ตัวเลือก+เกณฑ์การแปลผล) ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT assessment_id, title, description, type, status, open_date, close_date,
              scoring_method, created_by_user_id, created_at, updated_at
       FROM assessments
       WHERE assessment_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });

    const target_grade_ids = await getTargetGradeIds(req.params.id);
    const questions = await getQuestionsWithOptions(req.params.id);
    const score_bands = await getScoreBands(req.params.id);

    res.json({ ...rows[0], target_grade_ids, questions, score_bands });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างแบบประเมินใหม่ (พร้อมกลุ่มเป้าหมาย+คำถาม+ตัวเลือก+เกณฑ์การแปลผลในคำขอเดียว) ----------------------
router.post('/', async (req, res) => {
  try {
    const {
      title, description, type, status, open_date, close_date, scoring_method,
      created_by_user_id, target_grade_ids, questions, score_bands,
    } = req.body;

    if (!title || !created_by_user_id) {
      return res.status(400).json({ message: 'title และ created_by_user_id จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO assessments (title, description, type, status, open_date, close_date, scoring_method, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, type || null, status || 'draft', open_date || null, close_date || null, scoring_method || 'sum', created_by_user_id]
    );
    const assessmentId = result.insertId;

    const gradeIds = Array.isArray(target_grade_ids) ? target_grade_ids : [];
    for (const gradeId of gradeIds) {
      await pool.query(
        `INSERT INTO assessment_target_grades (assessment_id, grade_idgrade) VALUES (?, ?)`,
        [assessmentId, gradeId]
      );
    }

    await insertQuestions(assessmentId, questions);
    await insertScoreBands(assessmentId, score_bands);

    const fullQuestions = await getQuestionsWithOptions(assessmentId);
    const fullBands = await getScoreBands(assessmentId);
    res.status(201).json({
      assessment_id: assessmentId,
      title, description: description || null, type: type || null, status: status || 'draft',
      open_date: open_date || null, close_date: close_date || null, scoring_method: scoring_method || 'sum', created_by_user_id,
      target_grade_ids: gradeIds, questions: fullQuestions, score_bands: fullBands,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข (แทนที่กลุ่มเป้าหมาย+คำถาม+เกณฑ์การแปลผลทั้งชุดถ้าส่งมา) ----------------------
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      title = null, description = null, type = null, status = null,
      open_date = null, close_date = null, scoring_method = null,
      target_grade_ids = null, questions = null, score_bands = null,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE assessments
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           type = COALESCE(?, type),
           status = COALESCE(?, status),
           open_date = COALESCE(?, open_date),
           close_date = COALESCE(?, close_date),
           scoring_method = COALESCE(?, scoring_method),
           updated_at = NOW()
       WHERE assessment_id = ? AND deleted_at IS NULL`,
      [title, description, type, status, open_date, close_date, scoring_method, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    if (Array.isArray(target_grade_ids)) {
      await pool.query(`DELETE FROM assessment_target_grades WHERE assessment_id = ?`, [id]);
      for (const gradeId of target_grade_ids) {
        await pool.query(
          `INSERT INTO assessment_target_grades (assessment_id, grade_idgrade) VALUES (?, ?)`,
          [id, gradeId]
        );
      }
    }

    if (Array.isArray(questions)) {
      // แทนที่คำถามทั้งชุด (ตัวเลือก/คำถามเดิมถูกลบตาม ON DELETE CASCADE)
      await pool.query(`DELETE FROM assessment_questions WHERE assessment_id = ?`, [id]);
      await insertQuestions(id, questions);
    }

    if (Array.isArray(score_bands)) {
      // response เดิมที่เคย matched_band_id อ้างเกณฑ์ชุดเก่าจะถูกเซ็ต NULL อัตโนมัติ (ON DELETE SET NULL) — คะแนนรวมเดิม (total_score) ยังอยู่
      await pool.query(`DELETE FROM assessment_score_bands WHERE assessment_id = ?`, [id]);
      await insertScoreBands(id, score_bands);
    }

    res.json({ message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE (soft delete) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE assessments SET deleted_at = NOW() WHERE assessment_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Not found or already deleted' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST ทำสำเนา ----------------------
router.post('/:id/duplicate', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT title, description, type, scoring_method, created_by_user_id
       FROM assessments WHERE assessment_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const original = rows[0];

    const [result] = await pool.query(
      `INSERT INTO assessments (title, description, type, status, scoring_method, created_by_user_id)
       VALUES (?, ?, ?, 'draft', ?, ?)`,
      [`${original.title} (สำเนา)`, original.description, original.type, original.scoring_method, original.created_by_user_id]
    );
    const newId = result.insertId;

    const gradeIds = await getTargetGradeIds(req.params.id);
    for (const gradeId of gradeIds) {
      await pool.query(`INSERT INTO assessment_target_grades (assessment_id, grade_idgrade) VALUES (?, ?)`, [newId, gradeId]);
    }

    const questions = await getQuestionsWithOptions(req.params.id);
    await insertQuestions(newId, questions.map((q) => ({
      question_text: q.question_text, question_type: q.question_type, order_no: q.order_no, required: q.required, category: q.category, max_rating: q.max_rating,
      options: q.options.map((o) => ({ option_text: o.option_text, order_no: o.order_no, score: o.score })),
    })));

    const bands = await getScoreBands(req.params.id);
    await insertScoreBands(newId, bands);

    const fullQuestions = await getQuestionsWithOptions(newId);
    const fullBands = await getScoreBands(newId);
    res.status(201).json({
      assessment_id: newId, title: `${original.title} (สำเนา)`, status: 'draft', scoring_method: original.scoring_method,
      target_grade_ids: gradeIds, questions: fullQuestions, score_bands: fullBands,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- GET/POST คำถาม ----------------------
router.get('/:id/questions', async (req, res) => {
  try {
    res.json(await getQuestionsWithOptions(req.params.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/questions', async (req, res) => {
  try {
    const { question_text, question_type, order_no, required, category, options } = req.body;
    if (!question_text || !question_type) {
      return res.status(400).json({ message: 'question_text และ question_type จำเป็น' });
    }
    await insertQuestions(req.params.id, [{ question_text, question_type, order_no, required, category, options }]);
    res.status(201).json(await getQuestionsWithOptions(req.params.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- GET/POST เกณฑ์การแปลผล ----------------------
router.get('/:id/score-bands', async (req, res) => {
  try {
    res.json(await getScoreBands(req.params.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET/POST คำตอบนักเรียน ----------------------
router.get('/:id/responses', async (req, res) => {
  try {
    const [responses] = await pool.query(
      `SELECT r.response_id, r.user_user_id, u.fullname, r.submitted_at, r.total_score, r.matched_band_id, r.category_scores,
              b.label AS matched_band_label, b.description AS matched_band_description, b.color AS matched_band_color
       FROM assessment_responses r
       JOIN users u ON u.user_id = r.user_user_id
       LEFT JOIN assessment_score_bands b ON b.band_id = r.matched_band_id
       WHERE r.assessment_id = ?
       ORDER BY r.submitted_at DESC`,
      [req.params.id]
    );

    if (!responses.length) return res.json([]);

    const responseIds = responses.map((r) => r.response_id);
    const [answers] = await pool.query(
      `SELECT answer_id, response_id, question_id, answer_text, selected_option_id
       FROM assessment_response_answers
       WHERE response_id IN (?)`,
      [responseIds]
    );

    const answersByResponse = {};
    answers.forEach((a) => {
      if (!answersByResponse[a.response_id]) answersByResponse[a.response_id] = [];
      answersByResponse[a.response_id].push(a);
    });

    res.json(responses.map((r) => {
      let category_scores = null;
      try {
        category_scores = r.category_scores ? JSON.parse(r.category_scores) : null;
      } catch {
        category_scores = null;
      }
      return { ...r, category_scores, answers: answersByResponse[r.response_id] || [] };
    }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ผู้ทำแบบประเมินส่งคำตอบ → ระบบตรวจคะแนนจากคำตอบที่ให้คะแนนได้ 2 แบบ:
// 1) choice/checkbox — ใช้คะแนนของ selected_option_id ที่ครูกำหนดไว้
// 2) rating — ค่าที่เลือก (1..max_rating) นับเป็นคะแนนตรงตัว (rating=3 ก็ 3 คะแนน)
// text ไม่มีคะแนนกำหนดไว้ ไม่นับ
// รวม/เฉลี่ยตาม scoring_method แล้วจับคู่กับเกณฑ์การแปลผล (score_bands) เพื่อหาผลลัพธ์ที่ตรงช่วงคะแนน
// scoring_method='category' จะแยกผลรวมคะแนนต่อหมวดหมู่ (category_scores) เพิ่มให้ด้วย นอกเหนือจาก total_score รวมปกติ
router.post('/:id/responses', async (req, res) => {
  try {
    const { user_user_id, answers } = req.body;
    const assessmentId = req.params.id;

    if (!user_user_id || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'user_user_id และ answers จำเป็น' });
    }

    const [assessmentRows] = await pool.query(`SELECT scoring_method FROM assessments WHERE assessment_id = ?`, [assessmentId]);
    const scoringMethod = assessmentRows[0]?.scoring_method || 'sum';

    const [questionRows] = await pool.query(
      `SELECT question_id, question_type, category FROM assessment_questions WHERE assessment_id = ?`,
      [assessmentId]
    );
    const questionById = Object.fromEntries(questionRows.map((q) => [q.question_id, q]));

    const [result] = await pool.query(
      `INSERT INTO assessment_responses (assessment_id, user_user_id) VALUES (?, ?)`,
      [assessmentId, user_user_id]
    );
    const responseId = result.insertId;

    let scoreSum = 0;
    let scoredCount = 0;
    const categoryScores = {};
    for (const a of answers) {
      await pool.query(
        `INSERT INTO assessment_response_answers (response_id, question_id, answer_text, selected_option_id)
         VALUES (?, ?, ?, ?)`,
        [responseId, a.question_id, a.answer_text || null, a.selected_option_id || null]
      );

      const q = questionById[a.question_id];
      let answerScore = null;
      if (a.selected_option_id) {
        const [optRows] = await pool.query(`SELECT score FROM assessment_question_options WHERE option_id = ?`, [a.selected_option_id]);
        if (optRows.length) answerScore = optRows[0].score;
      } else if (q?.question_type === 'rating' && a.answer_text !== undefined && a.answer_text !== null && a.answer_text !== '') {
        const n = Number(a.answer_text);
        if (!Number.isNaN(n)) answerScore = n;
      }

      if (answerScore !== null) {
        scoreSum += answerScore;
        scoredCount += 1;
        if (q?.category) {
          categoryScores[q.category] = (categoryScores[q.category] || 0) + answerScore;
        }
      }
    }

    // scoring_method 'none' = แบบสอบถามที่ไม่ต้องให้คะแนน (ครูปิดระบบคะแนนทั้งชุดไว้) ไม่ต้องคำนวณ/จับคู่เกณฑ์เลย
    let totalScore = null;
    let matchedBand = null;
    if (scoringMethod !== 'none') {
      totalScore = scoringMethod === 'average' && scoredCount > 0 ? Math.round(scoreSum / scoredCount) : scoreSum;
      const bands = await getScoreBands(assessmentId);
      matchedBand = bands.find((b) => totalScore >= b.min_score && totalScore <= b.max_score) || null;

      await pool.query(
        `UPDATE assessment_responses SET total_score = ?, matched_band_id = ?, category_scores = ? WHERE response_id = ?`,
        [totalScore, matchedBand?.band_id || null, scoringMethod === 'category' ? JSON.stringify(categoryScores) : null, responseId]
      );
    }

    res.status(201).json({
      response_id: responseId, assessment_id: Number(assessmentId), user_user_id, answers,
      total_score: totalScore, matched_band: matchedBand,
      category_scores: scoringMethod === 'category' ? categoryScores : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;

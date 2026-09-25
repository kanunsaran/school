// const express = require('express');
// const router = express.Router();
// const { pool } = require('../db');
// const { authRequired, requireRole } = require('../middlewares/auth');

// // ---------------------- GET ทั้งหมด ----------------------
// router.get('/', async (_req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT ass_id, title, description, deadline, chapter_chapter_id ,create_at , update_at
//        FROM assignment 
//        WHERE delete_at is null
//        ORDER BY ass_id DESC`
//     );
//     res.json(rows);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ---------------------- GET รายการเดียว ----------------------
// router.get('/:id', authRequired, async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT ass_id, title, description, deadline, chapter_chapter_id
//        FROM assignment 
//        WHERE ass_id = ?`,
//       [req.params.id]
//     );

//     if (!rows.length) return res.status(404).json({ message: 'Not found' });
//     res.json(rows[0]);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ---------------------- POST สร้างใหม่ ----------------------
// router.post('/', authRequired, async (req, res) => {
//   try {
//     const { title, description, deadline, chapter_chapter_id } = req.body;

//     if (!title || !chapter_chapter_id) {
//       return res.status(400).json({ message: 'title and chapter_chapter_id are required' });
//     }

//     const [result] = await pool.query(
//       `INSERT INTO assignment (title, description, deadline, chapter_chapter_id)
//        VALUES (?, ?, ?, ?)`,
//       [title, description, deadline, chapter_chapter_id]
//     );

//     res.status(201).json({
//       ass_id: result.insertId,
//       title,
//       description,
//       deadline,
//       chapter_chapter_id
//     });

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: e.message || 'Server error' });
//   }
// });

// // ---------------------- PUT แก้ไข ----------------------
// router.put('/:id', authRequired, async (req, res) => {
//   try {
//     const { title = null, description = null, deadline = null, chapter_chapter_id = null } = req.body;
//     const id = req.params.id;

//     const [result] = await pool.query(
//       `UPDATE assignment
//        SET 
//          title = COALESCE(?, title),
//          description = COALESCE(?, description),
//          deadline = COALESCE(?, deadline),
//          chapter_chapter_id = COALESCE(?, chapter_chapter_id)
//        WHERE ass_id = ?`,
//       [title, description, deadline, chapter_chapter_id, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(400).json({ message: 'No change or not found' });
//     }

//     res.json({ message: 'Updated' });

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ---------------------- DELETE ----------------------
// router.delete('/:id', authRequired, requireRole('admin'), async (req, res) => {
//   try {
//     const id = req.params.id;

//     const [result] = await pool.query(
//       `DELETE FROM assignment WHERE ass_id = ?`,
//       [id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: 'Not found or delete failed' });
//     }

//     res.json({ message: 'Deleted' });

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

// ตั้งค่า multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/assignment'); // โฟลเดอร์เก็บไฟล์ (ต้องสร้างโฟลเดอร์นี้)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '');
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// visibleOnly=true -> ใช้ฝั่งนักเรียน ซ่อนงานที่ครูตั้งเวลาโพสต์ล่วงหน้าไว้จนกว่าจะถึงเวลา
// (ไม่ใส่ query นี้ = พฤติกรรมเดิม เห็นงานทั้งหมด ใช้สำหรับฝั่งครู)
router.get('/', async (req, res) => {
  try {
    const { visibleOnly } = req.query;
    const [rows] = await pool.query(
      `SELECT assignment.ass_id, title, description, deadline, chapter_chapter_id ,create_at , update_at, youtube_url, link_url, scheduled_at, work_type, post_type, has_score, answer_format, score_assignment.max_score
       FROM assignment
       LEFT JOIN score_assignment ON assignment.ass_id = score_assignment.ass_id
       WHERE delete_at is null
       ${visibleOnly ? "AND (scheduled_at IS NULL OR scheduled_at <= NOW())" : ""}
       ORDER BY ass_id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: สร้าง Assignment + คะแนนเต็ม + ไฟล์แนบ (หลายไฟล์) + มอบหมายนักเรียนเฉพาะราย
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const {
      title,
      description,
      chapterTitle,
      chapterDesc,
      deadline,
      chapterId,
      points,
      youtube_url,
      link_url,
      assignees, // JSON string ของ user_id array, ว่าง [] = มอบหมายทั้งหมด
      classIds, // JSON string ของ class_id array (ห้องเรียนที่โพสต์ เลือกได้หลายห้อง)
      scheduled_at, // ตั้งเวลาโพสต์ล่วงหน้า (NULL = โพสต์ทันที)
      work_type, // 'individual' | 'group'
      post_type, // 'assignment' | 'question'
      has_score, // เฉพาะ post_type 'question': มีคะแนนหรือไม่ ('true'/'false' string จาก FormData)
      answer_format, // เฉพาะ post_type 'question': 'short' | 'long'
    } = req.body;

    // สร้าง assignment
    const [assignmentResult] = await pool.query(
      `INSERT INTO assignment (title, description, deadline, chapter_chapter_id, youtube_url, link_url, scheduled_at, work_type, post_type, has_score, answer_format)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description, deadline || null, chapterId, youtube_url || null, link_url || null, scheduled_at || null,
        work_type || 'individual', post_type || 'assignment', has_score === undefined ? true : has_score === 'true' || has_score === true,
        answer_format || 'long',
      ]
    );
    const assId = assignmentResult.insertId;

    // ห้องเรียนที่โพสต์ (เลือกได้หลายห้อง) — grade_id อ้างอิงตาราง grade (idgrade)
    const classIdList = classIds ? JSON.parse(classIds) : [];
    for (const gradeId of classIdList) {
      await pool.query(
        `INSERT INTO assignment_classes (ass_id, grade_id) VALUES (?, ?)`,
        [assId, gradeId]
      );
    }

    // คะแนนเต็ม
    await pool.query(
      `INSERT INTO score_assignment (ass_id, max_score) VALUES (?, ?)`,
      [assId, points || 0]
    );

    // ไฟล์แนบ (หลายไฟล์)
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
        await pool.query(
          `INSERT INTO assignment_files (ass_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`,
          [assId, originalName, `/uploads/assignment/${file.filename}`, file.mimetype]
        );
      }
    }

    // มอบหมายให้นักเรียนเฉพาะราย (ถ้าเลือก "เลือกบางคน")
    const assigneeIds = assignees ? JSON.parse(assignees) : [];
    if (assigneeIds.length > 0) {
      for (const userId of assigneeIds) {
        await pool.query(
          `INSERT INTO assignment_students (ass_id, user_id) VALUES (?, ?)`,
          [assId, userId]
        );
      }
    }
    // ถ้า assigneeIds ว่าง = มอบหมายให้นักเรียนทั้งหมด (ไม่ต้อง insert แถวไหนเลย ตีความว่า "ทั้งหมด" ตอน query)

    res.status(201).json({
      ass_id: assId,
      title,
      description,
      chapter: {
        chapter_id: chapterId,
        title: chapterTitle,
        description: chapterDesc
      },
      deadline: deadline || null,
      points: points || 0,
      youtube_url: youtube_url || null,
      link_url: link_url || null,
      scheduled_at: scheduled_at || null,
      classIds: classIdList,
      work_type: work_type || 'individual',
      post_type: post_type || 'assignment',
      has_score: has_score === undefined ? true : has_score === 'true' || has_score === true,
      answer_format: answer_format || 'long',
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- GET งานเดียวแบบเต็ม (รวมคะแนนเต็ม) ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.ass_id, a.title, a.description, a.deadline, a.scheduled_at,
              a.chapter_chapter_id, a.work_type, a.post_type, a.has_score, a.answer_format,
              a.youtube_url, a.link_url, sa.max_score
       FROM assignment a
       LEFT JOIN score_assignment sa ON sa.ass_id = a.ass_id
       WHERE a.ass_id = ? AND a.delete_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PUT แก้ไข (รองรับแนบไฟล์เพิ่ม + อัปเดตห้องเรียน/คะแนนเต็ม) ----------------------
router.put('/:id', upload.array('files', 10), async (req, res) => {
  try {
    const id = req.params.id;
    const {
      title = null, description = null, deadline = null, chapterId = null,
      youtube_url = null, link_url = null, scheduled_at = null,
      work_type = null, post_type = null, has_score = null, answer_format = null,
      points = null, classIds = null,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE assignment
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           deadline = COALESCE(?, deadline),
           chapter_chapter_id = COALESCE(?, chapter_chapter_id),
           youtube_url = COALESCE(?, youtube_url),
           link_url = COALESCE(?, link_url),
           scheduled_at = COALESCE(?, scheduled_at),
           work_type = COALESCE(?, work_type),
           post_type = COALESCE(?, post_type),
           has_score = COALESCE(?, has_score),
           answer_format = COALESCE(?, answer_format),
           update_at = NOW()
       WHERE ass_id = ? AND delete_at IS NULL`,
      [
        title, description, deadline, chapterId, youtube_url, link_url, scheduled_at,
        work_type, post_type, has_score === null ? null : (has_score === 'true' || has_score === true), answer_format,
        id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    if (points !== null) {
      const [existing] = await pool.query(`SELECT ass_id FROM score_assignment WHERE ass_id = ?`, [id]);
      if (existing.length) {
        await pool.query(`UPDATE score_assignment SET max_score = ? WHERE ass_id = ?`, [points, id]);
      } else {
        await pool.query(`INSERT INTO score_assignment (ass_id, max_score) VALUES (?, ?)`, [id, points]);
      }
    }

    if (classIds !== null) {
      const classIdList = JSON.parse(classIds);
      await pool.query(`DELETE FROM assignment_classes WHERE ass_id = ?`, [id]);
      for (const gradeId of classIdList) {
        await pool.query(`INSERT INTO assignment_classes (ass_id, grade_id) VALUES (?, ?)`, [id, gradeId]);
      }
    }

    if (req.files && req.files.length) {
      for (const file of req.files) {
        const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
        await pool.query(
          `INSERT INTO assignment_files (ass_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`,
          [id, originalName, `/uploads/assignment/${file.filename}`, file.mimetype]
        );
      }
    }

    res.json({ ass_id: id, message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- DELETE (soft delete) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE assignment SET delete_at = NOW() WHERE ass_id = ? AND delete_at IS NULL`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or already deleted' });
    }

    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ไฟล์แนบของงาน ----------------------
router.get('/:id/files', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT file_id, file_name, file_path, file_type
       FROM assignment_files
       WHERE ass_id = ?
       ORDER BY file_id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// คะแนนรายด้าน R/I/A/S/E/C (JSON) — ใช้วาดกราฟ RIASEC ในรายงาน; เพิ่มคอลัมน์ให้อัตโนมัติถ้ายังไม่มี
pool
  .query('ALTER TABLE user_type_result ADD COLUMN IF NOT EXISTS scores_json TEXT NULL')
  .catch((e) => console.error('add user_type_result.scores_json failed:', e.message));
// รหัสฮอลแลนด์ 3 ตัว (เช่น SIA) — result_code เดิมเก็บได้แค่ตัวเดียว
pool
  .query('ALTER TABLE user_type_result ADD COLUMN IF NOT EXISTS holland_code VARCHAR(3) NULL')
  .catch((e) => console.error('add user_type_result.holland_code failed:', e.message));
// ชื่อมิติตามไฟล์คู่มือ RIASEC ของโรงเรียน (S = นักช่วยเหลือ, E = ผู้นำ)
Promise.all([
  pool.query("UPDATE types SET type_name = 'Social (นักช่วยเหลือ)' WHERE type_code = 'S' AND type_name <> 'Social (นักช่วยเหลือ)'"),
  pool.query("UPDATE types SET type_name = 'Enterprising (ผู้นำ)' WHERE type_code = 'E' AND type_name <> 'Enterprising (ผู้นำ)'"),
]).catch((e) => console.error('rename RIASEC types failed:', e.message));

const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'];
// คะแนนแต่ละมิติต้องเป็นจำนวนเต็ม 10–50 (10 ข้อ × 1–5)
const validScores = (s) => s && typeof s === 'object' && RIASEC.every((c) => Number.isInteger(s[c]) && s[c] >= 10 && s[c] <= 50);

const SELECT_JOINED = `
  SELECT r.result_id, r.user_user_id, u.fullname,
         r.type_type_id, t.type_code, t.type_name,
         r.result_code, r.holland_code, r.test_date, r.scores_json,
         r.recommended_faculty_id, f.faculty_name, f.university_name
  FROM user_type_result r
  JOIN users u ON u.user_id = r.user_user_id
  LEFT JOIN types t ON t.type_id = r.type_type_id
  LEFT JOIN faculty f ON f.faculty_id = r.recommended_faculty_id
`;

// ---------------------- GET ทั้งหมด (join ชื่อ type/faculty มาด้วย) ----------------------
router.get('/', async (req, res) => {
  try {
    const { user_user_id } = req.query;
    const conditions = ['r.deleted_at IS NULL'];
    const params = [];
    if (user_user_id) { conditions.push('r.user_user_id = ?'); params.push(user_user_id); }

    const [rows] = await pool.query(
      `${SELECT_JOINED} WHERE ${conditions.join(' AND ')} ORDER BY r.result_id DESC`,
      params
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ของ user คนเดียว (แทน /me เดิมที่ต้องใช้ JWT) ----------------------
router.get('/user/:user_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${SELECT_JOINED} WHERE r.user_user_id = ? AND r.deleted_at IS NULL ORDER BY r.result_id DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST ----------------------
router.post('/', async (req, res) => {
  try {
    const { user_user_id, type_type_id, result_code, test_date, scores, holland_code } = req.body;
    let { recommended_faculty_id } = req.body;

    if (!user_user_id || !type_type_id) {
      return res.status(400).json({ message: 'user_user_id และ type_type_id จำเป็น' });
    }
    if (scores != null && !validScores(scores)) {
      return res.status(400).json({ message: 'คะแนนต้องมีครบ R I A S E C และอยู่ระหว่าง 10–50' });
    }
    if (holland_code != null && !/^[RIASEC]{3}$/.test(holland_code)) {
      return res.status(400).json({ message: 'holland_code ต้องเป็นรหัส 3 ตัวจาก R I A S E C' });
    }

    // ไม่ระบุคณะ → ใช้คณะที่ผูกกับกลุ่มบุคลิกภาพนี้ (ตาราง faculty.Type_type_id)
    if (!recommended_faculty_id) {
      const [fac] = await pool.query('SELECT faculty_id FROM faculty WHERE Type_type_id = ? AND deleted_at IS NULL ORDER BY faculty_id LIMIT 1', [type_type_id]);
      recommended_faculty_id = fac[0]?.faculty_id || null;
    }

    const [result] = await pool.query(`
      INSERT INTO user_type_result
      (user_user_id, type_type_id, result_code, holland_code, test_date, recommended_faculty_id, scores_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user_user_id, type_type_id, result_code || null, holland_code || null, test_date ? new Date(test_date) : new Date(), recommended_faculty_id || null, scores ? JSON.stringify(scores) : null]);

    res.status(201).json({
      result_id: result.insertId,
      user_user_id,
      type_type_id,
      result_code,
      holland_code: holland_code || null,
      test_date,
      recommended_faculty_id,
      scores: scores || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// ---------------------- PUT ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { result_code = null, recommended_faculty_id = null } = req.body;

    const [result] = await pool.query(`
      UPDATE user_type_result
      SET result_code = COALESCE(?, result_code),
          recommended_faculty_id = COALESCE(?, recommended_faculty_id)
      WHERE result_id = ? AND deleted_at IS NULL
    `, [result_code, recommended_faculty_id, req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE (Soft) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(`
      UPDATE user_type_result
      SET deleted_at = NOW()
      WHERE result_id = ?
    `, [req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

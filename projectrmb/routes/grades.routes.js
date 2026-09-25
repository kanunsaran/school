const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// รหัสเข้าชั้นเรียน 6 ตัว ตัดอักษร/ตัวเลขที่หน้าตาคล้ายกัน (0/O, 1/I) ออกกันพิมพ์สับสน
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateClassCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}
async function generateUniqueClassCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateClassCode();
    const [rows] = await pool.query(`SELECT idgrade FROM grade WHERE class_code = ?`, [code]);
    if (!rows.length) return code;
  }
  throw new Error('สร้างรหัสเข้าชั้นเรียนไม่สำเร็จ ลองใหม่อีกครั้ง');
}

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.idgrade, g.grade_name, g.section, g.track, g.year_year_id,
              g.semester, g.teacher_user_id, g.class_code, u.fullname AS teacher_name
       FROM grade g
       LEFT JOIN users u ON u.user_id = g.teacher_user_id
       WHERE g.deleted_at IS NULL
       ORDER BY g.idgrade DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET รายการเดียว ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.idgrade, g.grade_name, g.section, g.track, g.year_year_id,
              g.semester, g.teacher_user_id, g.class_code, u.fullname AS teacher_name
       FROM grade g
       LEFT JOIN users u ON u.user_id = g.teacher_user_id
       WHERE g.idgrade = ? AND g.deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Not found' });

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างห้องใหม่ (สุ่มรหัสเข้าชั้นเรียนให้อัตโนมัติ) ----------------------
router.post('/', async (req, res) => {
  try {
    const { grade_name, section, track, year_year_id, semester, teacher_user_id } = req.body;

    if (!grade_name || !section) {
      return res.status(400).json({ message: 'grade_name และ section จำเป็น' });
    }

    const classCode = await generateUniqueClassCode();

    const [result] = await pool.query(
      `INSERT INTO grade (grade_name, section, track, year_year_id, semester, teacher_user_id, class_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [grade_name, section, track, year_year_id, semester || null, teacher_user_id || null, classCode]
    );

    res.status(201).json({
      idgrade: result.insertId,
      grade_name, section, track, year_year_id, semester, teacher_user_id,
      class_code: classCode,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { grade_name, section, track, year_year_id, semester, teacher_user_id } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE grade
       SET grade_name = COALESCE(?, grade_name),
           section = COALESCE(?, section),
           track = COALESCE(?, track),
           year_year_id = COALESCE(?, year_year_id),
           semester = COALESCE(?, semester),
           teacher_user_id = COALESCE(?, teacher_user_id)
       WHERE idgrade = ? AND deleted_at IS NULL`,
      [grade_name, section, track, year_year_id, semester, teacher_user_id, id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({ message: 'No change or not found' });
    }

    res.json({ message: 'Updated' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE ลบ (soft delete) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE grade SET deleted_at = NOW() WHERE idgrade = ? AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or delete failed' });
    }

    res.json({ message: 'Deleted' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

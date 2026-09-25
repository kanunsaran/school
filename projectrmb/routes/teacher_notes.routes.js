const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// ---------------------- GET โน้ตของนักเรียนคนเดียว (?student_user_id=) — บันทึกลับ นักเรียนมองไม่เห็น ----------------------
router.get('/', authRequired, async (req, res) => {
  try {
    const { student_user_id } = req.query;
    if (!student_user_id) return res.status(400).json({ message: 'student_user_id จำเป็น' });

    const [rows] = await pool.query(
      `SELECT note_id, teacher_user_id, student_user_id, note_text, created_at, updated_at
       FROM teacher_student_notes
       WHERE student_user_id = ?
       ORDER BY created_at DESC`,
      [student_user_id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มโน้ต ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { teacher_user_id, student_user_id, note_text } = req.body;
    if (!teacher_user_id || !student_user_id || !note_text) {
      return res.status(400).json({ message: 'teacher_user_id, student_user_id, note_text จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO teacher_student_notes (teacher_user_id, student_user_id, note_text) VALUES (?, ?, ?)`,
      [teacher_user_id, student_user_id, note_text]
    );

    const [rows] = await pool.query(
      `SELECT note_id, teacher_user_id, student_user_id, note_text, created_at, updated_at
       FROM teacher_student_notes WHERE note_id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- DELETE ลบโน้ต ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM teacher_student_notes WHERE note_id = ?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// ---------------------- GET คำแนะนำของนักเรียนคนเดียว (?student_user_id=) — นักเรียนอ่านได้ ไม่ใช่บันทึกลับ ----------------------
router.get('/', async (req, res) => {
  try {
    const { student_user_id } = req.query;
    if (!student_user_id) return res.status(400).json({ message: 'student_user_id จำเป็น' });

    const [rows] = await pool.query(
      `SELECT advice_id, teacher_user_id, student_user_id, advice_text, created_at, updated_at
       FROM assessment_advice
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

// ---------------------- POST เพิ่มคำแนะนำ ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { teacher_user_id, student_user_id, advice_text } = req.body;
    if (!teacher_user_id || !student_user_id || !advice_text) {
      return res.status(400).json({ message: 'teacher_user_id, student_user_id, advice_text จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO assessment_advice (teacher_user_id, student_user_id, advice_text) VALUES (?, ?, ?)`,
      [teacher_user_id, student_user_id, advice_text]
    );

    const [rows] = await pool.query(
      `SELECT advice_id, teacher_user_id, student_user_id, advice_text, created_at, updated_at
       FROM assessment_advice WHERE advice_id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- DELETE ลบคำแนะนำ ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM assessment_advice WHERE advice_id = ?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// ---------------------- GET ตารางสอนของครูคนเดียว (?teacher_user_id=) ----------------------
router.get('/', async (req, res) => {
  try {
    const { teacher_user_id } = req.query;
    if (!teacher_user_id) return res.status(400).json({ message: 'teacher_user_id จำเป็น' });

    const [rows] = await pool.query(
      `SELECT schedule_id, teacher_user_id, weekday, period, classroom, subject, created_at
       FROM teaching_schedule
       WHERE teacher_user_id = ?
       ORDER BY weekday ASC, period ASC`,
      [teacher_user_id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มคาบสอน ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { teacher_user_id, weekday, period, classroom, subject } = req.body;
    if (teacher_user_id == null || weekday == null || period == null) {
      return res.status(400).json({ message: 'teacher_user_id, weekday, period จำเป็น' });
    }

    const [existing] = await pool.query(
      `SELECT schedule_id, classroom FROM teaching_schedule WHERE teacher_user_id = ? AND weekday = ? AND period = ?`,
      [teacher_user_id, weekday, period]
    );
    if (existing.length) {
      return res.status(409).json({ message: `มีคาบสอนอยู่ในวันและคาบนี้แล้ว (ห้อง ${existing[0].classroom || '-'})` });
    }

    const [result] = await pool.query(
      `INSERT INTO teaching_schedule (teacher_user_id, weekday, period, classroom, subject)
       VALUES (?, ?, ?, ?, ?)`,
      [teacher_user_id, weekday, period, classroom || null, subject || 'แนะแนว']
    );

    const [rows] = await pool.query(
      `SELECT schedule_id, teacher_user_id, weekday, period, classroom, subject, created_at
       FROM teaching_schedule WHERE schedule_id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'มีคาบสอนอยู่ในวันและคาบนี้แล้ว' });
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- DELETE ลบคาบสอน ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM teaching_schedule WHERE schedule_id = ?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

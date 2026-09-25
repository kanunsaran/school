const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

async function attachReplies(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.appointment_id);
  const [replies] = await pool.query(
    `SELECT r.reply_id, r.appointment_appointment_id, r.user_user_id, u.fullname AS author_name, r.content, r.created_at
     FROM appointment_reply r
     JOIN users u ON u.user_id = r.user_user_id
     WHERE r.appointment_appointment_id IN (?)
     ORDER BY r.created_at ASC`,
    [ids]
  );

  const repliesByAppointment = {};
  replies.forEach((r) => {
    if (!repliesByAppointment[r.appointment_appointment_id]) repliesByAppointment[r.appointment_appointment_id] = [];
    repliesByAppointment[r.appointment_appointment_id].push(r);
  });

  return rows.map((r) => ({ ...r, replies: repliesByAppointment[r.appointment_id] || [] }));
}

// ---------------------- GET ทั้งหมด (filter ?teacher_user_id= หรือ ?student_user_id=) ----------------------
router.get('/', async (req, res) => {
  try {
    const { teacher_user_id, student_user_id } = req.query;
    const conditions = [];
    const params = [];
    if (teacher_user_id) { conditions.push('a.teacher_user_id = ?'); params.push(teacher_user_id); }
    if (student_user_id) { conditions.push('a.student_user_id = ?'); params.push(student_user_id); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT a.appointment_id,
              a.teacher_user_id, t.fullname AS teacher_name,
              a.student_user_id, s.fullname AS student_name,
              a.appointment_date, a.appointment_time, a.note, a.status,
              a.created_at, a.updated_at
       FROM appointment a
       JOIN users t ON t.user_id = a.teacher_user_id
       JOIN users s ON s.user_id = a.student_user_id
       ${where}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      params
    );

    res.json(await attachReplies(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET รายการเดียว ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.appointment_id,
              a.teacher_user_id, t.fullname AS teacher_name,
              a.student_user_id, s.fullname AS student_name,
              a.appointment_date, a.appointment_time, a.note, a.status,
              a.created_at, a.updated_at
       FROM appointment a
       JOIN users t ON t.user_id = a.teacher_user_id
       JOIN users s ON s.user_id = a.student_user_id
       WHERE a.appointment_id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });

    const [full] = await attachReplies(rows);
    res.json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างนัดหมาย ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { teacher_user_id, student_user_id, appointment_date, appointment_time, note } = req.body;

    if (!teacher_user_id || !student_user_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: 'teacher_user_id, student_user_id, appointment_date, appointment_time จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO appointment (teacher_user_id, student_user_id, appointment_date, appointment_time, note)
       VALUES (?, ?, ?, ?, ?)`,
      [teacher_user_id, student_user_id, appointment_date, appointment_time, note || null]
    );

    res.status(201).json({
      appointment_id: result.insertId,
      teacher_user_id,
      student_user_id,
      appointment_date,
      appointment_time,
      note: note || null,
      status: 'confirmed',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไขนัดหมาย (เลื่อนวัน/เวลา/แก้ note/สถานะ) ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const {
      appointment_date = null,
      appointment_time = null,
      note = null,
      status = null,
    } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE appointment
       SET appointment_date = COALESCE(?, appointment_date),
           appointment_time = COALESCE(?, appointment_time),
           note = COALESCE(?, note),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE appointment_id = ?`,
      [appointment_date, appointment_time, note, status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE ยกเลิกนัด ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE appointment SET status = 'cancelled', updated_at = NOW() WHERE appointment_id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Cancelled' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST ตอบกลับใต้นัดหมาย ----------------------
router.post('/:id/reply', authRequired, async (req, res) => {
  try {
    const { user_user_id, content } = req.body;
    const appointmentId = req.params.id;

    if (!user_user_id || !content) {
      return res.status(400).json({ message: 'user_user_id และ content จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO appointment_reply (appointment_appointment_id, user_user_id, content) VALUES (?, ?, ?)`,
      [appointmentId, user_user_id, content]
    );

    const [rows] = await pool.query(
      `SELECT r.reply_id, r.appointment_appointment_id, r.user_user_id, u.fullname AS author_name, r.content, r.created_at
       FROM appointment_reply r
       JOIN users u ON u.user_id = r.user_user_id
       WHERE r.reply_id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;

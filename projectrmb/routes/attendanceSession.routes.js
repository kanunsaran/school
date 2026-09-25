const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ---------------------- GET เซสชันที่เปิดอยู่ล่าสุดของห้องนี้ ----------------------
router.get('/active', async (req, res) => {
  try {
    const { grade_id } = req.query;
    if (!grade_id) return res.status(400).json({ message: 'ต้องระบุ grade_id' });

    const [rows] = await pool.query(
      `SELECT * FROM attendance_session
       WHERE grade_idgrade = ? AND status = 'open'
       ORDER BY session_id DESC LIMIT 1`,
      [grade_id]
    );

    res.json(rows[0] || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เปิดเซสชันใหม่ (สร้างรหัส 6 หลัก) ----------------------
router.post('/', async (req, res) => {
  try {
    const { grade_idgrade, session_date, period, start_time, end_time } = req.body;
    if (!grade_idgrade || !session_date || !period || !start_time || !end_time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    const [result] = await pool.query(
      `INSERT INTO attendance_session (grade_idgrade, session_date, period, start_time, end_time, code, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [grade_idgrade, session_date, period, start_time, end_time, code]
    );

    res.status(201).json({
      session_id: result.insertId,
      grade_idgrade,
      session_date,
      period,
      start_time,
      end_time,
      code,
      status: 'open',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PUT ปิดเซสชัน (เอง หรือหมดเวลา) + ตั้งคนที่ยัง not_checked เป็น absent ----------------------
router.put('/:id/close', async (req, res) => {
  try {
    const id = req.params.id;

    const [[session]] = await pool.query('SELECT * FROM attendance_session WHERE session_id = ?', [id]);
    if (!session) return res.status(404).json({ message: 'Not found' });

    await pool.query(`UPDATE attendance_session SET status = 'closed' WHERE session_id = ?`, [id]);

    const [targets] = await pool.query(
      `SELECT attendance_id FROM attendance
       WHERE grade_idgrade = ? AND attendance_date = ? AND status = 'not_checked'`,
      [session.grade_idgrade, session.session_date]
    );

    if (targets.length) {
      const ids = targets.map((t) => t.attendance_id);
      await pool.query(`UPDATE attendance SET status = 'absent' WHERE attendance_id IN (?)`, [ids]);
      await pool.query(
        `INSERT INTO attendance_log (attendance_attendance_id, teacher_name, from_status, to_status)
         VALUES ${ids.map(() => '(?, ?, ?, ?)').join(', ')}`,
        ids.flatMap((aid) => [aid, 'ระบบ (หมดเวลาเซสชัน)', 'not_checked', 'absent'])
      );
    }

    res.json({ message: 'Closed', absentCount: targets.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

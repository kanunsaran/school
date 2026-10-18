const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET เซสชันที่เปิดอยู่ล่าสุดของห้องนี้ ----------------------
// รหัสเช็กชื่อส่งให้เฉพาะครู — นักเรียนเห็นแค่ว่าเปิดอยู่ (ไม่งั้นเปิด DevTools ก็เห็นรหัส)
router.get('/active', authRequired, async (req, res) => {
  try {
    const { grade_id } = req.query;
    if (!grade_id) return res.status(400).json({ message: 'ต้องระบุ grade_id' });

    const [rows] = await pool.query(
      `SELECT * FROM attendance_session
       WHERE grade_idgrade = ? AND status = 'open'
       ORDER BY session_id DESC LIMIT 1`,
      [grade_id]
    );

    const row = rows[0] || null;
    if (row && req.user?.role !== 'teacher') delete row.code;
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เปิดเซสชันใหม่ (สร้างรหัส 6 หลัก) ----------------------
router.post('/', authRequired, requireRole('teacher'), async (req, res) => {
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
router.put('/:id/close', authRequired, requireRole('teacher'), async (req, res) => {
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

// เวลาไทยตอนนี้ (ไทยไม่มีเวลาออมแสง) — ไม่พึ่งเขตเวลาของเครื่อง/ฐานข้อมูล ซึ่งอาจเป็น UTC
const bangkokNow = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

// ---------------------- POST นักเรียนเช็กชื่อเอง (พิมพ์รหัส หรือสแกน QR) ----------------------
// ตรวจรหัสที่เซิร์ฟเวอร์: เซสชันต้องเปิดอยู่ ยังไม่หมดเวลา และนักเรียนต้องอยู่ในห้องนั้น
router.post('/checkin', authRequired, requireRole('student'), async (req, res) => {
  try {
    const code = String(req.body.code || '').trim();
    const gradeId = req.body.grade_id || null;
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: 'รหัสเช็กชื่อต้องเป็นตัวเลข 6 หลัก' });

    const [sessions] = await pool.query(
      `SELECT s.*, DATE_FORMAT(s.session_date, '%Y-%m-%d') AS date_str, TIME_FORMAT(s.end_time, '%H:%i:%s') AS end_str
       FROM attendance_session s
       JOIN enroll e ON e.grade_idgrade = s.grade_idgrade AND e.user_user_id = ? AND e.deleted_at IS NULL
       WHERE s.code = ? AND s.status = 'open' ${gradeId ? 'AND s.grade_idgrade = ?' : ''}
       ORDER BY s.session_id DESC LIMIT 1`,
      gradeId ? [req.user.id, code, gradeId] : [req.user.id, code]
    );
    const session = sessions[0];
    if (!session) return res.status(400).json({ message: 'รหัสไม่ถูกต้อง หรือครูยังไม่ได้เปิดเช็กชื่อในห้องของคุณ' });
    const now = bangkokNow();
    if (`${session.date_str} ${session.end_str}` < now) return res.status(400).json({ message: 'หมดเวลาเช็กชื่อคาบนี้แล้ว' });

    // มีแถวของวันนั้นอยู่แล้วหรือยัง (ไม่มี = สร้างก่อน)
    await pool.query(
      `INSERT INTO attendance (grade_idgrade, user_user_id, attendance_date, status)
       SELECT ?, ?, ?, 'not_checked' FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM attendance WHERE grade_idgrade = ? AND user_user_id = ? AND attendance_date = ?)`,
      [session.grade_idgrade, req.user.id, session.date_str, session.grade_idgrade, req.user.id, session.date_str]
    );
    const [[row]] = await pool.query(
      'SELECT attendance_id, status FROM attendance WHERE grade_idgrade = ? AND user_user_id = ? AND attendance_date = ? ORDER BY attendance_id DESC LIMIT 1',
      [session.grade_idgrade, req.user.id, session.date_str]
    );
    const base = { grade_id: session.grade_idgrade, period: session.period, date: session.date_str };
    if (row.status !== 'not_checked') return res.json({ ...base, status: row.status, already: true });

    await pool.query(`UPDATE attendance SET status = 'present', checkin_time = ? WHERE attendance_id = ?`, [now.slice(11), row.attendance_id]);
    await pool.query(
      `INSERT INTO attendance_log (attendance_attendance_id, teacher_name, from_status, to_status) VALUES (?, ?, 'not_checked', 'present')`,
      [row.attendance_id, 'นักเรียนเช็กชื่อเอง (รหัส/QR)']
    );
    res.json({ ...base, status: 'present', already: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

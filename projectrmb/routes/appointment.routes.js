const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');
const { notifyAppointment } = require('../utils/appointmentMail');

// คอลัมน์ผู้สร้างนัด (ครูนัดนักเรียน / นักเรียนขอนัดครู) — เพิ่มให้อัตโนมัติถ้ายังไม่มี (ไม่กระทบข้อมูลเดิม)
pool
  .query('ALTER TABLE appointment ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL')
  .catch((e) => console.error('add appointment.created_by_user_id failed:', e.message));

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
              a.created_by_user_id,
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

// ---------------------- GET ตรวจอีเมลก่อนเปิด Gmail ของครู (?student_ids=1,2) ----------------------
// ครูที่ล็อกอิน + นักเรียนที่เลือก: มีอีเมลในระบบไหม รูปแบบถูกไหม และเคยเข้าสู่ระบบแล้วหรือยัง (จากตาราง tokens)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
router.get('/email-check', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const ids = String(req.query.student_ids || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 100);
    const lookup = async (userIds) => {
      if (!userIds.length) return [];
      const [rows] = await pool.query(
        `SELECT u.user_id, u.fullname, u.email, MAX(t.created_at) AS last_login_at
         FROM users u LEFT JOIN tokens t ON t.user_id = u.user_id
         WHERE u.user_id IN (?) AND u.deleted_at IS NULL
         GROUP BY u.user_id, u.fullname, u.email`,
        [userIds]
      );
      return rows.map((r) => {
        const email = String(r.email || '').trim();
        return {
          user_id: r.user_id,
          fullname: r.fullname,
          email: EMAIL_RE.test(email) ? email : null,
          has_email: EMAIL_RE.test(email),
          logged_in_before: Boolean(r.last_login_at),
          last_login_at: r.last_login_at,
        };
      });
    };
    const [teacher] = await lookup([req.user.id]);
    res.json({ teacher: teacher || null, students: await lookup(ids) });
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
              a.created_by_user_id,
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
    const { teacher_user_id, appointment_date, appointment_time, note } = req.body;
    // นักเรียนนัดได้เฉพาะตัวเอง (ไม่เชื่อ student_user_id จาก body)
    const student_user_id = req.user?.role === 'student' ? req.user.id : req.body.student_user_id;
    const created_by_user_id = req.user?.id || null;

    if (!teacher_user_id || !student_user_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: 'teacher_user_id, student_user_id, appointment_date, appointment_time จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO appointment (teacher_user_id, student_user_id, appointment_date, appointment_time, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teacher_user_id, student_user_id, appointment_date, appointment_time, note || null, created_by_user_id]
    );

    // แจ้งอีกฝ่ายทางอีเมล (ไม่ได้ตั้งค่า SMTP / ไม่มีอีเมล → ข้าม แต่สร้างนัดสำเร็จตามปกติ)
    const email = await notifyAppointment(result.insertId, 'created', created_by_user_id);

    res.status(201).json({
      email,
      appointment_id: result.insertId,
      teacher_user_id,
      student_user_id,
      appointment_date,
      appointment_time,
      note: note || null,
      status: 'confirmed',
      created_by_user_id,
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
    const [[before]] = await pool.query(
      `SELECT DATE_FORMAT(appointment_date, '%Y-%m-%d') AS d, TIME_FORMAT(appointment_time, '%H:%i') AS t, status FROM appointment WHERE appointment_id = ?`,
      [id]
    );

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

    // แจ้งทางอีเมลเมื่อเลื่อนวัน/เวลา หรือยกเลิก (แก้แค่หมายเหตุไม่ส่ง)
    const moved = (appointment_date && appointment_date !== before?.d) || (appointment_time && String(appointment_time).slice(0, 5) !== before?.t);
    const cancelled = status === 'cancelled' && before?.status !== 'cancelled';
    const email = cancelled || moved ? await notifyAppointment(id, cancelled ? 'cancelled' : 'updated', req.user?.id) : null;

    res.json({ message: 'Updated', email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE ยกเลิกนัด ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE appointment SET status = 'cancelled', updated_at = NOW() WHERE appointment_id = ? AND status <> 'cancelled'`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      const [exists] = await pool.query('SELECT 1 FROM appointment WHERE appointment_id = ?', [req.params.id]);
      if (!exists.length) return res.status(404).json({ message: 'Not found' });
      return res.json({ message: 'Cancelled', email: null }); // ยกเลิกไปแล้ว ไม่ส่งซ้ำ
    }

    const email = await notifyAppointment(req.params.id, 'cancelled', req.user?.id);
    res.json({ message: 'Cancelled', email });
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

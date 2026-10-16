const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');
const { notifyAppointment } = require('../utils/appointmentMail');

// คอลัมน์ผู้สร้างนัด (ครูนัดนักเรียน / นักเรียนขอนัดครู) — เพิ่มให้อัตโนมัติถ้ายังไม่มี (ไม่กระทบข้อมูลเดิม)
pool
  .query('ALTER TABLE appointment ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL')
  .catch((e) => console.error('add appointment.created_by_user_id failed:', e.message));

// การตอบรับนัด: ฝ่ายที่ถูกนัดกดยืนยัน/ปฏิเสธ — ปฏิเสธพร้อมเหตุผลและวันเวลาที่สะดวกแทนได้
// status: pending (รอยืนยัน) | confirmed | declined | cancelled
pool
  .query(
    `ALTER TABLE appointment
       ADD COLUMN IF NOT EXISTS response_note TEXT NULL,
       ADD COLUMN IF NOT EXISTS proposed_date DATE NULL,
       ADD COLUMN IF NOT EXISTS proposed_time VARCHAR(10) NULL,
       ADD COLUMN IF NOT EXISTS responded_at DATETIME NULL`
  )
  .catch((e) => console.error('add appointment response columns failed:', e.message));

const RESPONSE_COLS = `a.response_note, DATE_FORMAT(a.proposed_date, '%Y-%m-%d') AS proposed_date, a.proposed_time, a.responded_at`;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// ผู้สร้างนัด (นัดเก่าที่ไม่ได้บันทึกผู้สร้าง ถือว่าครูเป็นผู้นัด) — อีกฝ่ายคือผู้ถูกนัด
const creatorOf = (a) => String(a.created_by_user_id ?? a.teacher_user_id);
const inviteeOf = (a) => (creatorOf(a) === String(a.teacher_user_id) ? String(a.student_user_id) : String(a.teacher_user_id));

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
              ${RESPONSE_COLS},
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
              ${RESPONSE_COLS},
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
      `INSERT INTO appointment (teacher_user_id, student_user_id, appointment_date, appointment_time, note, created_by_user_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
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
      status: 'pending',
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

    // เลื่อนวัน/เวลา → อีกฝ่ายต้องยืนยันใหม่ (ล้างคำขอเปลี่ยนเวลาเดิม)
    const movedNow = (appointment_date && appointment_date !== before?.d) || (appointment_time && String(appointment_time).slice(0, 5) !== before?.t);
    if (movedNow && !status && before?.status !== 'cancelled') {
      await pool.query(
        `UPDATE appointment SET status = 'pending', response_note = NULL, proposed_date = NULL, proposed_time = NULL, responded_at = NULL WHERE appointment_id = ?`,
        [id]
      );
    }

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

// ---------------------- POST ตอบรับนัด ----------------------
// action: confirm | decline (ผู้ถูกนัด) • accept_proposal = ผู้นัดเลื่อนไปวันเวลาที่อีกฝ่ายเสนอ (ถือว่ายืนยันแล้ว)
router.post('/:id/respond', authRequired, async (req, res) => {
  try {
    const { action } = req.body;
    const me = String(req.user.id);
    const [[a]] = await pool.query(
      `SELECT appointment_id, teacher_user_id, student_user_id, created_by_user_id, status,
              DATE_FORMAT(proposed_date, '%Y-%m-%d') AS proposed_date, proposed_time
       FROM appointment WHERE appointment_id = ?`,
      [req.params.id]
    );
    if (!a) return res.status(404).json({ message: 'ไม่พบนัดหมาย' });
    if (![String(a.teacher_user_id), String(a.student_user_id)].includes(me)) return res.status(403).json({ message: 'ไม่ใช่นัดหมายของคุณ' });
    if (a.status === 'cancelled') return res.status(409).json({ message: 'นัดหมายนี้ถูกยกเลิกแล้ว' });

    if (action === 'confirm' || action === 'decline') {
      if (inviteeOf(a) !== me) return res.status(403).json({ message: 'ผู้ที่ถูกนัดเท่านั้นที่ยืนยันหรือปฏิเสธได้' });
      if (action === 'confirm') {
        await pool.query(
          `UPDATE appointment SET status = 'confirmed', response_note = NULL, proposed_date = NULL, proposed_time = NULL, responded_at = NOW() WHERE appointment_id = ?`,
          [a.appointment_id]
        );
      } else {
        const reason = String(req.body.reason || '').trim().slice(0, 500) || null;
        const pDate = req.body.proposed_date || null;
        const pTime = req.body.proposed_time ? String(req.body.proposed_time).slice(0, 5) : null;
        if ((pDate && !DATE_RE.test(pDate)) || (pTime && !TIME_RE.test(pTime))) return res.status(400).json({ message: 'วันหรือเวลาที่เสนอไม่ถูกต้อง' });
        if (pTime && !pDate) return res.status(400).json({ message: 'กรุณาเลือกวันที่สะดวกด้วย' });
        const [[{ today }]] = await pool.query(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today`);
        if (pDate && pDate < today) return res.status(400).json({ message: 'วันที่เสนอต้องเป็นวันนี้หรือหลังจากนี้' });
        await pool.query(
          `UPDATE appointment SET status = 'declined', response_note = ?, proposed_date = ?, proposed_time = ?, responded_at = NOW() WHERE appointment_id = ?`,
          [reason, pDate, pTime, a.appointment_id]
        );
      }
      const email = await notifyAppointment(a.appointment_id, action === 'confirm' ? 'confirmed' : 'declined', me);
      return res.json({ status: action === 'confirm' ? 'confirmed' : 'declined', email });
    }

    if (action === 'accept_proposal') {
      if (creatorOf(a) !== me) return res.status(403).json({ message: 'ผู้นัดเท่านั้นที่เลื่อนตามคำขอได้' });
      if (a.status !== 'declined' || !a.proposed_date || !a.proposed_time) return res.status(409).json({ message: 'ไม่มีวันเวลาที่อีกฝ่ายเสนอไว้' });
      await pool.query(
        `UPDATE appointment SET appointment_date = proposed_date, appointment_time = proposed_time, status = 'confirmed',
                response_note = NULL, proposed_date = NULL, proposed_time = NULL, responded_at = NOW()
         WHERE appointment_id = ?`,
        [a.appointment_id]
      );
      const email = await notifyAppointment(a.appointment_id, 'rescheduled', me);
      return res.json({ status: 'confirmed', email });
    }

    res.status(400).json({ message: 'action ต้องเป็น confirm, decline หรือ accept_proposal' });
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

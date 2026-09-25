const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

async function attachMessages(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.request_id);
  const [messages] = await pool.query(
    `SELECT message_id, request_id, sender_user_id, sender_role, message_text, created_at
     FROM consultation_messages
     WHERE request_id IN (?)
     ORDER BY created_at ASC`,
    [ids]
  );

  const messagesByRequest = {};
  messages.forEach((m) => {
    if (!messagesByRequest[m.request_id]) messagesByRequest[m.request_id] = [];
    messagesByRequest[m.request_id].push(m);
  });

  return rows.map((r) => ({ ...r, messages: messagesByRequest[r.request_id] || [] }));
}

// ---------------------- GET ทั้งหมด (filter ?student_user_id= หรือ ?teacher_user_id= หรือ ?status=) ----------------------
router.get('/', async (req, res) => {
  try {
    const { student_user_id, teacher_user_id, status } = req.query;
    const conditions = [];
    const params = [];
    if (student_user_id) { conditions.push('cr.student_user_id = ?'); params.push(student_user_id); }
    if (status) { conditions.push('cr.status = ?'); params.push(status); }
    if (teacher_user_id) {
      // ไม่มีคอลัมน์ teacher_user_id ตรงๆ ในตาราง — ใช้ครูประจำชั้นของนักเรียน (enroll -> grade.teacher_user_id)
      conditions.push(
        `EXISTS (
           SELECT 1 FROM enroll e
           JOIN grade g ON g.idgrade = e.grade_idgrade
           WHERE e.user_user_id = cr.student_user_id AND g.teacher_user_id = ?
         )`
      );
      params.push(teacher_user_id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT cr.request_id,
              cr.student_user_id, s.fullname AS student_name,
              cr.category, cr.subject, cr.status,
              cr.created_at, cr.updated_at
       FROM consultation_requests cr
       JOIN users s ON s.user_id = cr.student_user_id
       ${where}
       ORDER BY cr.created_at DESC`,
      params
    );

    res.json(await attachMessages(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET รายการเดียว ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cr.request_id,
              cr.student_user_id, s.fullname AS student_name,
              cr.category, cr.subject, cr.status,
              cr.created_at, cr.updated_at
       FROM consultation_requests cr
       JOIN users s ON s.user_id = cr.student_user_id
       WHERE cr.request_id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });

    const [full] = await attachMessages(rows);
    res.json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างคำขอปรึกษา (พร้อมข้อความแรก) ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { student_user_id, category, subject, message } = req.body;

    if (!student_user_id || !category || !message) {
      return res.status(400).json({ message: 'student_user_id, category, message จำเป็น' });
    }

    const requestId = await withTransaction(async (conn) => {
      const [result] = await conn.query(
        `INSERT INTO consultation_requests (student_user_id, category, subject)
         VALUES (?, ?, ?)`,
        [student_user_id, category, subject || null]
      );

      await conn.query(
        `INSERT INTO consultation_messages (request_id, sender_user_id, sender_role, message_text)
         VALUES (?, ?, 'student', ?)`,
        [result.insertId, student_user_id, message]
      );

      return result.insertId;
    });

    const [rows] = await pool.query(
      `SELECT cr.request_id,
              cr.student_user_id, s.fullname AS student_name,
              cr.category, cr.subject, cr.status,
              cr.created_at, cr.updated_at
       FROM consultation_requests cr
       JOIN users s ON s.user_id = cr.student_user_id
       WHERE cr.request_id = ?`,
      [requestId]
    );

    const [full] = await attachMessages(rows);
    res.status(201).json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT เปลี่ยนสถานะ (ครูเท่านั้น) ----------------------
router.put('/:id', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'done'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน ${validStatuses.join(', ')}` });
    }

    const [result] = await pool.query(
      `UPDATE consultation_requests SET status = ?, updated_at = NOW() WHERE request_id = ?`,
      [status, req.params.id]
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

// ---------------------- DELETE ลบคำขอปรึกษา (ไม่บังคับใช้งาน เผื่ออนาคต) ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM consultation_requests WHERE request_id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST ตอบกลับในเธรด ----------------------
router.post('/:id/reply', authRequired, async (req, res) => {
  try {
    const { sender_user_id, sender_role, message_text } = req.body;
    const requestId = req.params.id;

    if (!sender_user_id || !sender_role || !message_text) {
      return res.status(400).json({ message: 'sender_user_id, sender_role, message_text จำเป็น' });
    }
    if (!['student', 'teacher'].includes(sender_role)) {
      return res.status(400).json({ message: "sender_role ต้องเป็น 'student' หรือ 'teacher'" });
    }

    const [result] = await pool.query(
      `INSERT INTO consultation_messages (request_id, sender_user_id, sender_role, message_text)
       VALUES (?, ?, ?, ?)`,
      [requestId, sender_user_id, sender_role, message_text]
    );

    if (sender_role === 'teacher') {
      await pool.query(
        `UPDATE consultation_requests SET status = 'in_progress', updated_at = NOW()
         WHERE request_id = ? AND status = 'pending'`,
        [requestId]
      );
    }

    const [rows] = await pool.query(
      `SELECT message_id, request_id, sender_user_id, sender_role, message_text, created_at
       FROM consultation_messages
       WHERE message_id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;

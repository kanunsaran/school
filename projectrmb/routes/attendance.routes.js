const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ---------------------- GET รายชื่อ + สถานะ ของห้อง+วันที่ ----------------------
// ถ้านักเรียนที่ enroll ห้องนี้ยังไม่มีแถว attendance ของวันนี้ ให้สร้างแถว not_checked ให้อัตโนมัติก่อน แล้วค่อย select
router.get('/', async (req, res) => {
  try {
    const { grade_id, date } = req.query;
    if (!grade_id || !date) {
      return res.status(400).json({ message: 'ต้องระบุ grade_id และ date' });
    }

    // backfill: เติมแถว not_checked ให้ทุกคนที่ enroll ห้องนี้แต่ยังไม่มีแถว attendance ของวันนี้
    await pool.query(
      `INSERT INTO attendance (grade_idgrade, user_user_id, attendance_date, status)
       SELECT e.grade_idgrade, e.user_user_id, ?, 'not_checked'
       FROM enroll e
       WHERE e.grade_idgrade = ?
         AND e.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM attendance a
           WHERE a.grade_idgrade = e.grade_idgrade
             AND a.user_user_id = e.user_user_id
             AND a.attendance_date = ?
         )`,
      [date, grade_id, date]
    );

    const [rows] = await pool.query(
      `SELECT a.attendance_id, a.grade_idgrade, a.user_user_id, a.attendance_date,
              a.checkin_time, a.method, a.status, a.note,
              u.fullname, u.email, u.student_code,
              e.seat_no
       FROM attendance a
       JOIN users u ON u.user_id = a.user_user_id
       LEFT JOIN enroll e ON e.grade_idgrade = a.grade_idgrade
         AND e.user_user_id = a.user_user_id AND e.deleted_at IS NULL
       WHERE a.grade_idgrade = ? AND a.attendance_date = ?
       ORDER BY e.seat_no IS NULL, e.seat_no, u.fullname`,
      [grade_id, date]
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PUT แก้ไขแถวเดียว (สถานะ/เวลา/หมายเหตุ) ----------------------
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { status, checkin_time, note, teacher_name } = req.body;

    const [[current]] = await pool.query('SELECT status FROM attendance WHERE attendance_id = ?', [id]);
    if (!current) return res.status(404).json({ message: 'Not found' });

    await pool.query(
      `UPDATE attendance
       SET status = COALESCE(?, status),
           checkin_time = ?,
           note = COALESCE(?, note)
       WHERE attendance_id = ?`,
      [status, checkin_time || null, note, id]
    );

    if (status && status !== current.status) {
      await pool.query(
        `INSERT INTO attendance_log (attendance_attendance_id, teacher_name, from_status, to_status)
         VALUES (?, ?, ?, ?)`,
        [id, teacher_name || null, current.status, status]
      );
    }

    res.json({ message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เช็กชื่อทั้งห้อง (ครูเช็กให้คนที่ยัง not_checked ทั้งหมด) ----------------------
router.post('/bulk-checkin', async (req, res) => {
  try {
    const { grade_id, date, teacher_name } = req.body;
    if (!grade_id || !date) return res.status(400).json({ message: 'ต้องระบุ grade_id และ date' });

    const [targets] = await pool.query(
      `SELECT attendance_id FROM attendance
       WHERE grade_idgrade = ? AND attendance_date = ? AND status = 'not_checked'`,
      [grade_id, date]
    );

    if (targets.length === 0) return res.json({ updated: 0 });

    const ids = targets.map((t) => t.attendance_id);
    await pool.query(
      `UPDATE attendance
       SET status = 'present', checkin_time = CURTIME(), method = 'teacher'
       WHERE attendance_id IN (?)`,
      [ids]
    );

    await pool.query(
      `INSERT INTO attendance_log (attendance_attendance_id, teacher_name, from_status, to_status)
       VALUES ${ids.map(() => '(?, ?, ?, ?)').join(', ')}`,
      ids.flatMap((id) => [id, teacher_name || null, 'not_checked', 'present'])
    );

    res.json({ updated: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เปลี่ยนสถานะหลายแถวพร้อมกัน (bulk action ในตาราง) ----------------------
router.post('/bulk-status', async (req, res) => {
  try {
    const { ids, status, teacher_name } = req.body;
    if (!Array.isArray(ids) || !ids.length || !status) {
      return res.status(400).json({ message: 'ต้องระบุ ids และ status' });
    }

    const [rows] = await pool.query(
      `SELECT attendance_id, status FROM attendance WHERE attendance_id IN (?)`,
      [ids]
    );

    await pool.query(`UPDATE attendance SET status = ? WHERE attendance_id IN (?)`, [status, ids]);

    const changed = rows.filter((r) => r.status !== status);
    if (changed.length) {
      await pool.query(
        `INSERT INTO attendance_log (attendance_attendance_id, teacher_name, from_status, to_status)
         VALUES ${changed.map(() => '(?, ?, ?, ?)').join(', ')}`,
        changed.flatMap((r) => [r.attendance_id, teacher_name || null, r.status, status])
      );
    }

    res.json({ updated: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มหมายเหตุหลายแถวพร้อมกัน ----------------------
router.post('/bulk-note', async (req, res) => {
  try {
    const { ids, note } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ต้องระบุ ids' });

    await pool.query(`UPDATE attendance SET note = ? WHERE attendance_id IN (?)`, [note, ids]);
    res.json({ updated: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET สถิติย้อนหลัง (ช่วงวันที่) สำหรับกราฟวงกลม/แท่ง ----------------------
router.get('/history', async (req, res) => {
  try {
    const { grade_id, from, to } = req.query;
    if (!grade_id || !from || !to) {
      return res.status(400).json({ message: 'ต้องระบุ grade_id, from, to' });
    }

    const [byDate] = await pool.query(
      `SELECT attendance_date,
              SUM(status = 'present') AS present,
              SUM(status = 'late') AS late,
              SUM(status = 'leave') AS leave_count,
              SUM(status = 'absent') AS absent
       FROM attendance
       WHERE grade_idgrade = ? AND attendance_date BETWEEN ? AND ?
       GROUP BY attendance_date
       ORDER BY attendance_date`,
      [grade_id, from, to]
    );

    const [totals] = await pool.query(
      `SELECT
              SUM(status = 'present') AS present,
              SUM(status = 'late') AS late,
              SUM(status = 'leave') AS leave_count,
              SUM(status = 'absent') AS absent
       FROM attendance
       WHERE grade_idgrade = ? AND attendance_date BETWEEN ? AND ?`,
      [grade_id, from, to]
    );

    res.json({ byDate, totals: totals[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET audit log ของห้อง+วันที่ ----------------------
router.get('/log', async (req, res) => {
  try {
    const { grade_id, date } = req.query;
    if (!grade_id || !date) return res.status(400).json({ message: 'ต้องระบุ grade_id และ date' });

    const [rows] = await pool.query(
      `SELECT l.log_id, l.teacher_name, l.from_status, l.to_status, l.changed_at, u.fullname
       FROM attendance_log l
       JOIN attendance a ON a.attendance_id = l.attendance_attendance_id
       JOIN users u ON u.user_id = a.user_user_id
       WHERE a.grade_idgrade = ? AND a.attendance_date = ?
       ORDER BY l.changed_at DESC`,
      [grade_id, date]
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET สรุปรายคน (สำหรับ Drawer รายละเอียดนักเรียน) ----------------------
router.get('/student/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { grade_id } = req.query;

    const [rows] = await pool.query(
      `SELECT
         SUM(status = 'present') AS presentDays,
         SUM(status = 'late') AS lateDays,
         SUM(status = 'leave') AS leaveDays,
         SUM(status = 'absent') AS absentDays,
         COUNT(*) AS totalDays
       FROM attendance
       WHERE user_user_id = ? AND grade_idgrade = ?`,
      [user_id, grade_id]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

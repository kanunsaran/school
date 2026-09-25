const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT enroll_id, enroll_date, grade_idgrade, user_user_id, class_class_id, seat_no
       FROM enroll
       ORDER BY enroll_id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET รายการเดียว ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT enroll_id, enroll_date, grade_idgrade, user_user_id, class_class_id, seat_no
       FROM enroll
       WHERE enroll_id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างใหม่ ----------------------
router.post('/', async (req, res) => {
  try {
    const { enroll_date, grade_idgrade, class_class_id, user_user_id, seat_no } = req.body;

    if (!enroll_date || !grade_idgrade || !class_class_id || !user_user_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO enroll (enroll_date, grade_idgrade, user_user_id, class_class_id, seat_no)
       VALUES (?, ?, ?, ?, ?)`,
      [enroll_date, grade_idgrade, user_user_id, class_class_id, seat_no || null]
    );

    res.status(201).json({
      enroll_id: result.insertId,
      enroll_date,
      grade_idgrade,
      user_user_id,
      class_class_id,
      seat_no,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- POST เข้าร่วมชั้นเรียนด้วยรหัส (นักเรียนกรอกรหัสจากครู) ----------------------
router.post('/join', async (req, res) => {
  try {
    const { class_code, user_user_id } = req.body;

    if (!class_code || !user_user_id) {
      return res.status(400).json({ message: 'class_code และ user_user_id จำเป็น' });
    }

    const [grades] = await pool.query(
      `SELECT idgrade, grade_name, section, track
       FROM grade
       WHERE class_code = ? AND deleted_at IS NULL`,
      [class_code.trim().toUpperCase()]
    );

    if (!grades.length) {
      return res.status(404).json({ message: 'ไม่พบห้องเรียนที่ใช้รหัสนี้ ตรวจสอบรหัสอีกครั้ง' });
    }

    const grade = grades[0];

    const [existing] = await pool.query(
      `SELECT enroll_id FROM enroll WHERE grade_idgrade = ? AND user_user_id = ? AND deleted_at IS NULL`,
      [grade.idgrade, user_user_id]
    );

    if (existing.length) {
      return res.status(409).json({ message: 'นักเรียนอยู่ในห้องเรียนนี้อยู่แล้ว', grade });
    }

    await pool.query(
      `INSERT INTO enroll (enroll_date, grade_idgrade, user_user_id)
       VALUES (CURDATE(), ?, ?)`,
      [grade.idgrade, user_user_id]
    );

    res.status(201).json({ message: 'เข้าร่วมชั้นเรียนสำเร็จ', grade });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', async (req, res) => {
  try {
    const {
      enroll_date = null,
      grade_idgrade = null,
      class_class_id = null,
      seat_no = null
    } = req.body;

    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE enroll
       SET enroll_date = COALESCE(?, enroll_date),
           grade_idgrade = COALESCE(?, grade_idgrade),
           class_class_id = COALESCE(?, class_class_id),
           seat_no = COALESCE(?, seat_no)
       WHERE enroll_id = ?`,
      [enroll_date, grade_idgrade, class_class_id, seat_no, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'No change or not found' });
    }

    res.json({ message: 'Updated' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE ลบข้อมูล ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM enroll WHERE enroll_id = ?',
      [id]
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

module.exports = router;

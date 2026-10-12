const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// เกรดเฉลี่ยของนักเรียน (GPAX ม.ปลาย + เกรดเฉลี่ยรายวิชาหลัก) — นักเรียนกรอกเองในหน้าเป้าหมาย ครูดูได้
// เก็บแยกจาก student_general_info.form_data เพื่อไม่ให้การบันทึกแบบฟอร์มข้อมูลทั่วไปเขียนทับ
pool
  .query(`CREATE TABLE IF NOT EXISTS student_grades (
    student_user_id INT NOT NULL PRIMARY KEY,
    gpax DECIMAL(3,2) NULL,
    as_of_term VARCHAR(10) NULL,
    subject_gpa TEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)
  .catch((e) => console.error('create student_grades failed:', e.message));

const TERMS = ['4/1', '4/2', '5/1', '5/2', '6/1', '6/2'];
const SUBJECTS = ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา'];
const gpaOk = (v) => v === null || (typeof v === 'number' && v >= 0 && v <= 4);
const toGpa = (v) => (v === '' || v == null ? null : Math.round(Number(v) * 100) / 100);

const canSee = (req, userId) => req.user.role === 'teacher' || String(req.user.id) === String(userId);

const shape = (row) =>
  row
    ? {
        student_user_id: row.student_user_id,
        gpax: row.gpax == null ? null : Number(row.gpax),
        as_of_term: row.as_of_term,
        subject_gpa: row.subject_gpa ? JSON.parse(row.subject_gpa) : {},
        updated_at: row.updated_at,
      }
    : null;

// GET /student-grades/:userId
router.get('/:userId', authRequired, async (req, res) => {
  try {
    if (!canSee(req, req.params.userId)) return res.status(403).json({ message: 'ดูได้เฉพาะเกรดของตัวเอง' });
    const [rows] = await pool.query('SELECT * FROM student_grades WHERE student_user_id = ?', [req.params.userId]);
    res.json(shape(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /student-grades/:userId  { gpax, as_of_term, subject_gpa: { คณิตศาสตร์: 3.5, ... } } — นักเรียนแก้ได้เฉพาะของตัวเอง
router.put('/:userId', authRequired, async (req, res) => {
  try {
    const userId = req.params.userId;
    if (String(req.user.id) !== String(userId)) return res.status(403).json({ message: 'แก้ไขได้เฉพาะเกรดของตัวเอง' });

    const gpax = toGpa(req.body.gpax);
    const term = req.body.as_of_term || null;
    const subjects = {};
    Object.entries(req.body.subject_gpa || {}).forEach(([k, v]) => {
      if (SUBJECTS.includes(k) && toGpa(v) !== null) subjects[k] = toGpa(v);
    });
    if (!gpaOk(gpax) || Object.values(subjects).some((v) => !gpaOk(v))) {
      return res.status(400).json({ message: 'เกรดต้องอยู่ระหว่าง 0.00 – 4.00' });
    }
    if (term && !TERMS.includes(term)) return res.status(400).json({ message: 'ภาคเรียนไม่ถูกต้อง' });

    await pool.query(
      `INSERT INTO student_grades (student_user_id, gpax, as_of_term, subject_gpa) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE gpax = VALUES(gpax), as_of_term = VALUES(as_of_term), subject_gpa = VALUES(subject_gpa)`,
      [userId, gpax, term, JSON.stringify(subjects)]
    );
    const [rows] = await pool.query('SELECT * FROM student_grades WHERE student_user_id = ?', [userId]);
    res.json(shape(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

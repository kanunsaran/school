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
  .then(() => pool.query('ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS terms_json LONGTEXT NULL'))
  .catch((e) => console.error('create student_grades failed:', e.message));

// ---------- ผลการเรียนรายภาคเรียน (จากใบผลการเรียนที่อัปโหลด) ----------
const GRADES = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส', 'ผ', 'มผ'];
const NUMERIC = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0'];
const GROUP_BY_PREFIX = { ท: 'ภาษาไทย', ค: 'คณิตศาสตร์', ว: 'วิทยาศาสตร์', ส: 'สังคมศึกษา', อ: 'ภาษาอังกฤษ' };
const counted = (c) => NUMERIC.includes(c.grade) && c.code[0] !== 'ก' && c.credit > 0;
// ค่าเฉลี่ยถ่วงน้ำหนักหน่วยกิต ตัดทศนิยม 2 ตำแหน่ง (แบบระบบผลการเรียนของโรงเรียน)
const weighted = (list) => {
  const cr = list.reduce((a, c) => a + c.credit, 0);
  return cr ? Math.floor((list.reduce((a, c) => a + c.credit * Number(c.grade), 0) / cr) * 100) / 100 : null;
};
const cleanTerms = (terms) => {
  const out = {};
  Object.entries(terms || {}).forEach(([term, t]) => {
    if (!TERMS.includes(term)) throw new Error('ภาคเรียนไม่ถูกต้อง');
    const courses = (t?.courses || []).slice(0, 60).map((c) => {
      const credit = Number(c.credit);
      const grade = String(c.grade ?? '');
      const code = String(c.code || '').trim().slice(0, 12);
      if (!code || !(credit > 0 && credit <= 40) || (grade && !GRADES.includes(grade))) throw new Error(`ข้อมูลวิชา ${code || '(ไม่มีรหัส)'} ไม่ถูกต้อง`);
      return { code, name: String(c.name || '').trim().slice(0, 120), credit, grade };
    });
    if (courses.length) out[term] = { courses, gpa: weighted(courses.filter(counted)) };
  });
  return out;
};
const summarize = (terms) => {
  const all = Object.values(terms).flatMap((t) => t.courses).filter(counted);
  const subject_gpa = {};
  Object.entries(GROUP_BY_PREFIX).forEach(([p, g]) => {
    const v = weighted(all.filter((c) => c.code[0] === p));
    if (v != null) subject_gpa[g] = v;
  });
  return { gpax: weighted(all), subject_gpa, as_of_term: TERMS.filter((t) => terms[t]).pop() || null };
};

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
        terms: row.terms_json ? JSON.parse(row.terms_json) : {},
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

// PUT /student-grades/:userId  { gpax, as_of_term, subject_gpa: { คณิตศาสตร์: 3.5, ... }, terms?: { '4/1': { courses: [{code,name,credit,grade}] } } } — นักเรียนแก้ได้เฉพาะของตัวเอง
router.put('/:userId', authRequired, async (req, res) => {
  try {
    const userId = req.params.userId;
    if (String(req.user.id) !== String(userId)) return res.status(403).json({ message: 'แก้ไขได้เฉพาะเกรดของตัวเอง' });

    let gpax = toGpa(req.body.gpax);
    let term = req.body.as_of_term || null;
    const subjects = {};
    Object.entries(req.body.subject_gpa || {}).forEach(([k, v]) => {
      if (SUBJECTS.includes(k) && toGpa(v) !== null) subjects[k] = toGpa(v);
    });
    if (!gpaOk(gpax) || Object.values(subjects).some((v) => !gpaOk(v))) {
      return res.status(400).json({ message: 'เกรดต้องอยู่ระหว่าง 0.00 – 4.00' });
    }
    if (term && !TERMS.includes(term)) return res.status(400).json({ message: 'ภาคเรียนไม่ถูกต้อง' });

    // มีผลการเรียนรายภาคเรียน → คำนวณ GPAX/เกรดรายวิชาจากรายวิชาจริง (ทับค่าที่กรอกเอง)
    let terms = null;
    if (req.body.terms !== undefined) {
      try {
        terms = cleanTerms(req.body.terms);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    } else {
      const [old] = await pool.query('SELECT terms_json FROM student_grades WHERE student_user_id = ?', [userId]);
      terms = old[0]?.terms_json ? JSON.parse(old[0].terms_json) : {};
    }
    if (Object.keys(terms).length) {
      const sum = summarize(terms);
      if (sum.gpax != null) gpax = sum.gpax;
      term = sum.as_of_term;
      Object.assign(subjects, sum.subject_gpa);
    }

    await pool.query(
      `INSERT INTO student_grades (student_user_id, gpax, as_of_term, subject_gpa, terms_json) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE gpax = VALUES(gpax), as_of_term = VALUES(as_of_term), subject_gpa = VALUES(subject_gpa), terms_json = VALUES(terms_json)`,
      [userId, gpax, term, JSON.stringify(subjects), JSON.stringify(terms)]
    );
    const [rows] = await pool.query('SELECT * FROM student_grades WHERE student_user_id = ?', [userId]);
    res.json(shape(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

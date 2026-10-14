const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// คำแนะนำจากครูถึงนักเรียน (หน้าผลการประเมินฝั่งครู → แสดงในหน้าผลแบบประเมินของนักเรียน)
// หัวข้อคำแนะนำ (topic) เพิ่มทีหลัง — แถวเก่าที่ไม่มีหัวข้อยังใช้ได้
pool
  .query('ALTER TABLE assessment_advice ADD COLUMN IF NOT EXISTS topic VARCHAR(100) NULL AFTER student_user_id')
  .catch((e) => console.error('add assessment_advice.topic failed:', e.message));

const TOPICS = ['การเตรียมตัวเข้าศึกษาต่อ', 'การเลือกสาขาและอาชีพ', 'การวางแผนพัฒนาตนเอง', 'อื่น ๆ'];
const MAX_TEXT = 2000;

const SELECT_ADVICE = `
  SELECT a.advice_id, a.teacher_user_id, a.student_user_id, a.topic, a.advice_text, a.created_at, a.updated_at,
         t.fullname AS teacher_name
  FROM assessment_advice a
  LEFT JOIN users t ON t.user_id = a.teacher_user_id`;

const isTeacher = (req) => req.user?.role === 'teacher';

// ตรวจข้อมูลที่ส่งมา คืนข้อความผิดพลาด หรือ null
const validate = ({ topic, advice_text }) => {
  if (!TOPICS.includes(topic)) return 'กรุณาเลือกหัวข้อคำแนะนำ';
  const text = String(advice_text || '').trim();
  if (!text) return 'กรุณาเขียนคำแนะนำ';
  if (text.length > MAX_TEXT) return `คำแนะนำยาวได้ไม่เกิน ${MAX_TEXT} ตัวอักษร`;
  return null;
};

// ---------------------- GET คำแนะนำของนักเรียนคนเดียว (?student_user_id=) ----------------------
// ครูอ่านได้ทุกคน • นักเรียนอ่านได้เฉพาะของตัวเอง
router.get('/', authRequired, async (req, res) => {
  try {
    const { student_user_id } = req.query;
    if (!student_user_id) return res.status(400).json({ message: 'student_user_id จำเป็น' });
    if (!isTeacher(req) && String(req.user?.id) !== String(student_user_id)) {
      return res.status(403).json({ message: 'ดูได้เฉพาะคำแนะนำของตัวเอง' });
    }
    const [rows] = await pool.query(`${SELECT_ADVICE} WHERE a.student_user_id = ? ORDER BY a.updated_at DESC, a.advice_id DESC`, [
      student_user_id,
    ]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มคำแนะนำ (ครูเท่านั้น — ผู้ให้คำแนะนำ = ครูที่ล็อกอิน) ----------------------
router.post('/', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const { student_user_id, topic } = req.body;
    if (!student_user_id) return res.status(400).json({ message: 'student_user_id จำเป็น' });
    const err = validate(req.body);
    if (err) return res.status(400).json({ message: err });
    const text = String(req.body.advice_text).trim();

    const [students] = await pool.query(
      `SELECT u.user_id FROM users u JOIN roles r ON r.role_id = u.role_role_id
       WHERE u.user_id = ? AND r.role_name = 'student' AND u.deleted_at IS NULL`,
      [student_user_id]
    );
    if (!students.length) return res.status(404).json({ message: 'ไม่พบนักเรียน' });

    // กันกดบันทึกซ้ำ: ข้อความเดียวกันจากครูคนเดิมถึงนักเรียนคนเดิมภายใน 1 นาที
    const [dup] = await pool.query(
      `SELECT advice_id FROM assessment_advice
       WHERE teacher_user_id = ? AND student_user_id = ? AND topic = ? AND advice_text = ? AND created_at > NOW() - INTERVAL 1 MINUTE`,
      [req.user.id, student_user_id, topic, text]
    );
    if (dup.length) return res.status(409).json({ message: 'บันทึกคำแนะนำนี้ไปแล้ว' });

    const [result] = await pool.query(
      `INSERT INTO assessment_advice (teacher_user_id, student_user_id, topic, advice_text) VALUES (?, ?, ?, ?)`,
      [req.user.id, student_user_id, topic, text]
    );
    const [rows] = await pool.query(`${SELECT_ADVICE} WHERE a.advice_id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'บันทึกคำแนะนำไม่สำเร็จ' });
  }
});

// ---------------------- PUT แก้ไขคำแนะนำ (เฉพาะครูที่เขียนคำแนะนำนั้น) ----------------------
router.put('/:id', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const err = validate(req.body);
    if (err) return res.status(400).json({ message: err });
    const [found] = await pool.query('SELECT teacher_user_id FROM assessment_advice WHERE advice_id = ?', [req.params.id]);
    if (!found.length) return res.status(404).json({ message: 'ไม่พบคำแนะนำ' });
    if (String(found[0].teacher_user_id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'แก้ไขได้เฉพาะคำแนะนำที่คุณเขียน' });
    }
    await pool.query('UPDATE assessment_advice SET topic = ?, advice_text = ? WHERE advice_id = ?', [
      req.body.topic,
      String(req.body.advice_text).trim(),
      req.params.id,
    ]);
    const [rows] = await pool.query(`${SELECT_ADVICE} WHERE a.advice_id = ?`, [req.params.id]);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'แก้ไขคำแนะนำไม่สำเร็จ' });
  }
});

// ---------------------- DELETE ลบคำแนะนำ (เฉพาะครูที่เขียนคำแนะนำนั้น) ----------------------
router.delete('/:id', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const [found] = await pool.query('SELECT teacher_user_id FROM assessment_advice WHERE advice_id = ?', [req.params.id]);
    if (!found.length) return res.status(404).json({ message: 'Not found' });
    if (String(found[0].teacher_user_id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'ลบได้เฉพาะคำแนะนำที่คุณเขียน' });
    }
    await pool.query('DELETE FROM assessment_advice WHERE advice_id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

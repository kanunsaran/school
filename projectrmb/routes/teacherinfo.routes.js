const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ---------------------- GET ข้อมูลทั่วไปของครูคนหนึ่ง ----------------------
router.get('/:user_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT teacher_user_id, form_data, avatar_url, created_at, updated_at
       FROM teacher_general_info
       WHERE teacher_user_id = ?`,
      [req.params.user_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'ยังไม่เคยกรอกข้อมูล' });
    }

    // MariaDB เก็บคอลัมน์ JSON เป็น LONGTEXT ภายใน mysql2 เลยไม่ auto-parse ให้ ต้อง parse เอง
    res.json({ ...rows[0], form_data: JSON.parse(rows[0].form_data) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PUT บันทึก/อัปเดตข้อมูลทั่วไป (สร้างใหม่ถ้ายังไม่มี) ----------------------
router.put('/:user_id', async (req, res) => {
  try {
    const { form_data, avatar_url } = req.body;
    const userId = req.params.user_id;

    if (form_data === undefined) {
      return res.status(400).json({ message: 'form_data จำเป็น' });
    }

    await pool.query(
      `INSERT INTO teacher_general_info (teacher_user_id, form_data, avatar_url)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         form_data = VALUES(form_data),
         avatar_url = COALESCE(VALUES(avatar_url), avatar_url),
         updated_at = NOW()`,
      [userId, JSON.stringify(form_data), avatar_url || null]
    );

    const [rows] = await pool.query(
      `SELECT teacher_user_id, form_data, avatar_url, created_at, updated_at
       FROM teacher_general_info
       WHERE teacher_user_id = ?`,
      [userId]
    );

    res.json({ ...rows[0], form_data: JSON.parse(rows[0].form_data) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- POST อัปโหลดรูปโปรไฟล์ (สร้างแถวใหม่ถ้ายังไม่เคยมีข้อมูล) ----------------------
router.post('/:user_id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'avatar จำเป็น' });

    const userId = req.params.user_id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await pool.query(
      `INSERT INTO teacher_general_info (teacher_user_id, form_data, avatar_url)
       VALUES (?, '{}', ?)
       ON DUPLICATE KEY UPDATE avatar_url = VALUES(avatar_url), updated_at = NOW()`,
      [userId, avatarUrl]
    );

    res.json({ avatar_url: avatarUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;

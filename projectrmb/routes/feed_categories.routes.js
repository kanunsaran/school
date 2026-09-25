const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// ---------------------- GET หมวดหมู่ทั้งหมดที่ครูตั้งเอง (เปิดสาธารณะ ให้ทุกคนเห็นตัวกรองเดียวกัน) ----------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT category_id, category_key, label, color_index, created_by_user_id, created_at
       FROM feed_categories
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มหมวดหมู่ใหม่ ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { category_key, label, color_index, created_by_user_id } = req.body;
    if (!category_key || !label || created_by_user_id == null) {
      return res.status(400).json({ message: 'category_key, label, created_by_user_id จำเป็น' });
    }

    const [existing] = await pool.query(`SELECT category_id, category_key, label, color_index, created_by_user_id, created_at FROM feed_categories WHERE category_key = ?`, [category_key]);
    if (existing.length) return res.status(200).json(existing[0]); // มีอยู่แล้ว คืนตัวเดิมแทนสร้างซ้ำ

    const [result] = await pool.query(
      `INSERT INTO feed_categories (category_key, label, color_index, created_by_user_id) VALUES (?, ?, ?, ?)`,
      [category_key, label, color_index || 0, created_by_user_id]
    );

    const [rows] = await pool.query(
      `SELECT category_id, category_key, label, color_index, created_by_user_id, created_at FROM feed_categories WHERE category_id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'มีหมวดหมู่นี้อยู่แล้ว' });
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;

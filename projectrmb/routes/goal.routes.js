const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT goal_id, goal_text, faculty_name, career_field, user_user_id, created_at, updated_at
       FROM goal
       WHERE deleted_at IS NULL
       ORDER BY goal_id DESC`
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
      `SELECT goal_id, goal_text, faculty_name, career_field, user_user_id, created_at, updated_at
       FROM goal
       WHERE goal_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มเป้าหมาย ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const clean = (v) => (typeof v === 'string' ? v.trim() : '');
    const goal_text = clean(req.body.goal_text);
    const faculty_name = clean(req.body.faculty_name);
    const career_field = clean(req.body.career_field);
    const userId = req.user.id;

    // ต้องมีคณะหรืออาชีพอย่างน้อย 1 ช่อง (เหตุผล/แรงบันดาลใจไม่บังคับ)
    if (!faculty_name && !career_field) {
      return res.status(400).json({ message: 'กรอกคณะที่สนใจ หรืออาชีพเป้าหมาย อย่างน้อย 1 ช่อง' });
    }

    const [result] = await pool.query(
      `INSERT INTO goal (goal_text, faculty_name, career_field, user_user_id)
       VALUES (?, ?, ?, ?)`,
      [goal_text || null, faculty_name || null, career_field || null, userId]
    );

    res.status(201).json({
      goal_id: result.insertId,
      goal_text,
      faculty_name,
      career_field,
      user_user_id: userId
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไขเป้าหมาย ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { goal_text = null, faculty_name = null, career_field = null } = req.body;
    const id = req.params.id;

    // นักเรียนแก้ได้เฉพาะเป้าหมายของตัวเอง (ครูแก้ได้)
    const [own] = await pool.query('SELECT user_user_id FROM goal WHERE goal_id = ? AND deleted_at IS NULL', [id]);
    if (!own.length) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'teacher' && String(own[0].user_user_id) !== String(req.user.id)) {
      return res.status(403).json({ message: 'แก้ไขได้เฉพาะเป้าหมายของตัวเอง' });
    }

    const [result] = await pool.query(
      `UPDATE goal
       SET goal_text = COALESCE(?, goal_text),
           faculty_name = COALESCE(?, faculty_name),
           career_field = COALESCE(?, career_field)
       WHERE goal_id = ? AND deleted_at IS NULL`,
      [goal_text, faculty_name, career_field, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or no change' });
    }

    res.json({ message: 'Updated' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE (Soft Delete) ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE goal
       SET deleted_at = NOW()
       WHERE goal_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or already deleted' });
    }

    res.json({ message: 'Soft deleted' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

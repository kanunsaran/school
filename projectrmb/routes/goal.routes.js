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
    const { goal_text, faculty_name, career_field } = req.body;
    const userId = req.user.id;

    if (!goal_text || !faculty_name || !career_field) {
      return res.status(400).json({ message: 'goal_text, faculty_name, career_field are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO goal (goal_text, faculty_name, career_field, user_user_id)
       VALUES (?, ?, ?, ?)`,
      [goal_text, faculty_name, career_field, userId]
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

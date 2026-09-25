const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT post_id, content, category, color, tape, timestamp, user_user_id, created_at, updated_at
       FROM postit
       WHERE deleted_at IS NULL
       ORDER BY post_id DESC`
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
      `SELECT post_id, content, category, color, tape, timestamp, user_user_id, created_at, updated_at
       FROM postit
       WHERE post_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่ม Post-it ----------------------
router.post('/', async (req, res) => {
  try {
    const { content, category, user_user_id, color, tape } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'content is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO postit (content, category, user_user_id, color, tape) VALUES (?, ?, ?, ?, ?)`,
      [content, category, user_user_id || 1, color || null, tape || null]
    );

    res.status(201).json({
      post_id: result.insertId,
      content,
      category,
      user_user_id: user_user_id || 1,
      color,
      tape,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});


// ---------------------- PUT แก้ไข Post-it (เฉพาะเจ้าของ) ----------------------
router.put('/:id', async (req, res) => {
  try {
    const {
      content = null,
      category = null,
      color = null,
      tape = null,
      user_user_id,
    } = req.body;
    const id = req.params.id;

    const [rows] = await pool.query(
      `SELECT user_user_id FROM postit WHERE post_id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    if (String(rows[0].user_user_id) !== String(user_user_id)) {
      return res.status(403).json({ message: 'แก้ไขได้เฉพาะโพสต์ของตัวเอง' });
    }

    const [result] = await pool.query(
      `UPDATE postit
       SET content = COALESCE(?, content),
           category = COALESCE(?, category),
           color = COALESCE(?, color),
           tape = COALESCE(?, tape)
       WHERE post_id = ? AND deleted_at IS NULL`,
      [content, category, color, tape, id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({ message: 'No change or not found' });
    }

    res.json({ message: 'Updated' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE (Soft Delete, เฉพาะเจ้าของ) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { user_user_id } = req.query;

    const [rows] = await pool.query(
      `SELECT user_user_id FROM postit WHERE post_id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found or already deleted' });
    if (String(rows[0].user_user_id) !== String(user_user_id)) {
      return res.status(403).json({ message: 'ลบได้เฉพาะโพสต์ของตัวเอง' });
    }

    await pool.query(
      `UPDATE postit SET deleted_at = NOW() WHERE post_id = ? AND deleted_at IS NULL`,
      [id]
    );

    res.json({ message: 'Deleted' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

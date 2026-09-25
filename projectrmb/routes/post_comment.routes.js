const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT comment_id, comment_text, timestamp, user_user_id, postit_post_id, created_at, updated_at
       FROM post_comment
       WHERE deleted_at IS NULL
       ORDER BY comment_id DESC`
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
      `SELECT comment_id, comment_text, timestamp, user_user_id, postit_post_id, created_at, updated_at
       FROM post_comment
       WHERE comment_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่ม Comment ----------------------
router.post('/', async (req, res) => {
  console.log("sdsdss")
  try {
    const { comment_text, postit_post_id , user_user_id } = req.body;
    // const userId = req.body.id;

    if (!comment_text || !postit_post_id) {
      return res.status(400).json({ message: 'comment_text and postit_post_id are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO post_comment (comment_text, user_user_id, postit_post_id)
       VALUES (?, ?, ?)`,
      [comment_text, user_user_id, postit_post_id]
    );

    res.status(201).json({
      comment_id: result.insertId,
      comment_text,
      user_user_id: user_user_id,
      postit_post_id
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข Comment ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { comment_text = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE post_comment
       SET comment_text = COALESCE(?, comment_text)
       WHERE comment_id = ? AND deleted_at IS NULL`,
      [comment_text, id]
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
      `UPDATE post_comment
       SET deleted_at = NOW()
       WHERE comment_id = ? AND deleted_at IS NULL`,
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

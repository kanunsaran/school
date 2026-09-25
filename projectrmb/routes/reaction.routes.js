const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT reaction_id, type, user_user_id, postit_post_id, postcomment_comment_id, created_at
       FROM reaction
       WHERE deleted_at IS NULL
       ORDER BY reaction_id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่ม Reaction ----------------------
router.post('/', async (req, res) => {
  try {
    const { type, postit_post_id = null, postcomment_comment_id = null } = req.body;
    const userId = null;

    if (!type) {
      return res.status(400).json({ message: 'type is required' });
    }

    if ((!postit_post_id && !postcomment_comment_id) || (postit_post_id && postcomment_comment_id)) {
      return res.status(400).json({ message: 'Must provide either postit_post_id or postcomment_comment_id' });
    }

    const [result] = await pool.query(
      `INSERT INTO reaction (type, user_user_id, postit_post_id, postcomment_comment_id)
       VALUES (?, ?, ?, ?)`,
      [type, userId, postit_post_id, postcomment_comment_id]
    );

    res.status(201).json({
      reaction_id: result.insertId,
      type,
      user_user_id: userId,
      postit_post_id,
      postcomment_comment_id
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- DELETE (Soft delete reaction) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE reaction
       SET deleted_at = NOW()
       WHERE reaction_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or already deleted' });
    }

    res.json({ message: 'Reaction removed' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- COUNT LIKE ของโพสต์ ----------------------
router.get('/count/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM reaction
       WHERE postit_post_id = ?
       AND type = 'like'
       AND deleted_at IS NULL`,
      [postId]
    );

    res.json({ total: rows[0].total });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- สถานะไลก์ + จำนวนไลก์ของโพสต์ ----------------------
// GET /reaction/like-status?postit_post_id=14&user_user_id=1
router.get('/like-status', async (req, res) => {
  try {
    const { postit_post_id, user_user_id } = req.query;
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM reaction WHERE postit_post_id = ? AND type = 'like' AND deleted_at IS NULL`,
      [postit_post_id]
    );

    let liked = false;
    if (user_user_id) {
      const [likedRows] = await pool.query(
        `SELECT reaction_id FROM reaction WHERE postit_post_id = ? AND type = 'like' AND user_user_id = ? AND deleted_at IS NULL`,
        [postit_post_id, user_user_id]
      );
      liked = likedRows.length > 0;
    }

    res.json({ count: countRows[0].count, liked });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- Toggle ไลก์/reaction ----------------------
// POST /reaction/toggle
router.post('/toggle', async (req, res) => {
  try {
    const { type, postit_post_id, user_user_id } = req.body;
    if (!type || !postit_post_id || !user_user_id) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const [existing] = await pool.query(
      `SELECT reaction_id FROM reaction WHERE postit_post_id = ? AND type = ? AND user_user_id = ? AND deleted_at IS NULL`,
      [postit_post_id, type, user_user_id]
    );

    if (existing.length > 0) {
      await pool.query(`UPDATE reaction SET deleted_at = NOW() WHERE reaction_id = ?`, [existing[0].reaction_id]);
    } else {
      await pool.query(
        `INSERT INTO reaction (type, user_user_id, postit_post_id) VALUES (?, ?, ?)`,
        [type, user_user_id, postit_post_id]
      );
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM reaction WHERE postit_post_id = ? AND type = 'like' AND deleted_at IS NULL`,
      [postit_post_id]
    );

    res.json({ count: countRows[0].count, liked: existing.length === 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /feed-post-comments?post_id=123
router.get("/", async (req, res) => {
  try {
    const { post_id } = req.query;
    const [rows] = await pool.query(
      `SELECT c.comment_id, c.post_id, c.user_id, c.content, c.created_at, c.parent_comment_id,
              u.fullname AS author_name
       FROM feed_post_comments c
       JOIN users u ON u.user_id = c.user_id
       WHERE c.post_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [post_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch comments", detail: err.message });
  }
});

router.post("/new", async (req, res) => {
  try {
    const { post_id, user_id, content, parent_comment_id } = req.body;
    if (!post_id || !user_id || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const [result] = await pool.query(
      `INSERT INTO feed_post_comments (post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)`,
      [post_id, user_id, content, parent_comment_id || null]
    );
    res.json({ comment_id: result.insertId, parent_comment_id: parent_comment_id || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create new comment" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, content } = req.body;
    if (!user_id || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const [rows] = await pool.query(
      `SELECT user_id FROM feed_post_comments WHERE comment_id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (String(rows[0].user_id) !== String(user_id)) {
      return res.status(403).json({ error: "You can only edit your own comment" });
    }

    await pool.query(`UPDATE feed_post_comments SET content = ? WHERE comment_id = ?`, [content, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update comment", detail: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    const [rows] = await pool.query(
      `SELECT user_id FROM feed_post_comments WHERE comment_id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (String(rows[0].user_id) !== String(user_id)) {
      return res.status(403).json({ error: "You can only delete your own comment" });
    }

    await pool.query(`UPDATE feed_post_comments SET deleted_at = NOW() WHERE comment_id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete comment", detail: err.message });
  }
});

module.exports = router;

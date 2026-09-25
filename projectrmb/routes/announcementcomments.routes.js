const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /announcement-comments?news_id=123
router.get("/", async (req, res) => {
  try {
    const { news_id } = req.query;
    const [rows] = await pool.query(
      `SELECT c.comment_id, c.news_id, c.user_id, c.content, c.created_at,
              u.fullname AS author_name
       FROM announcement_comments c
       JOIN users u ON u.user_id = c.user_id
       WHERE c.news_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [news_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch comments", detail: err.message });
  }
});

router.post("/new", async (req, res) => {
  try {
    const { news_id, user_id, content } = req.body;
    if (!news_id || !user_id || !content) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const [result] = await pool.query(
      `INSERT INTO announcement_comments (news_id, user_id, content) VALUES (?, ?, ?)`,
      [news_id, user_id, content]
    );
    res.json({ comment_id: result.insertId });
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
      `SELECT user_id FROM announcement_comments WHERE comment_id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (String(rows[0].user_id) !== String(user_id)) {
      return res.status(403).json({ error: "You can only edit your own comment" });
    }

    await pool.query(`UPDATE announcement_comments SET content = ? WHERE comment_id = ?`, [content, id]);
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
      `SELECT user_id FROM announcement_comments WHERE comment_id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (String(rows[0].user_id) !== String(user_id)) {
      return res.status(403).json({ error: "You can only delete your own comment" });
    }

    await pool.query(`UPDATE announcement_comments SET deleted_at = NOW() WHERE comment_id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete comment", detail: err.message });
  }
});

module.exports = router;

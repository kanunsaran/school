const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (req, res) => {
  try {
    const { post_id, user_id } = req.query;
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as count FROM feed_post_likes WHERE post_id = ?`,
      [post_id]
    );

    let liked = false;
    if (user_id) {
      const [likedRows] = await pool.query(
        `SELECT like_id FROM feed_post_likes WHERE post_id = ? AND user_id = ?`,
        [post_id, user_id]
      );
      liked = likedRows.length > 0;
    }

    res.json({ count: countRows[0].count, liked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch likes", detail: err.message });
  }
});

router.post("/toggle", async (req, res) => {
  try {
    const { post_id, user_id } = req.body;
    if (!post_id || !user_id) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const [existing] = await pool.query(
      `SELECT like_id FROM feed_post_likes WHERE post_id = ? AND user_id = ?`,
      [post_id, user_id]
    );

    if (existing.length > 0) {
      await pool.query(`DELETE FROM feed_post_likes WHERE like_id = ?`, [existing[0].like_id]);
    } else {
      await pool.query(`INSERT INTO feed_post_likes (post_id, user_id) VALUES (?, ?)`, [post_id, user_id]);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as count FROM feed_post_likes WHERE post_id = ?`,
      [post_id]
    );

    res.json({ count: countRows[0].count, liked: existing.length === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle like", detail: err.message });
  }
});

module.exports = router;

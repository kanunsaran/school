const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /likes?news_id=14&user_id=1
router.get("/", async (req, res) => {
  try {
    const { news_id, user_id } = req.query;
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as count FROM news_likes WHERE news_id = ?`,
      [news_id]
    );

    let liked = false;
    if (user_id) {
      const [likedRows] = await pool.query(
        `SELECT like_id FROM news_likes WHERE news_id = ? AND user_id = ?`,
        [news_id, user_id]
      );
      liked = likedRows.length > 0;
    }

    res.json({ count: countRows[0].count, liked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch likes", detail: err.message });
  }
});

// POST /likes/toggle
router.post("/toggle", async (req, res) => {
  try {
    const { news_id, user_id } = req.body;
    if (!news_id || !user_id) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const [existing] = await pool.query(
      `SELECT like_id FROM news_likes WHERE news_id = ? AND user_id = ?`,
      [news_id, user_id]
    );

    if (existing.length > 0) {
      await pool.query(`DELETE FROM news_likes WHERE like_id = ?`, [existing[0].like_id]);
    } else {
      await pool.query(`INSERT INTO news_likes (news_id, user_id) VALUES (?, ?)`, [news_id, user_id]);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as count FROM news_likes WHERE news_id = ?`,
      [news_id]
    );

    res.json({ count: countRows[0].count, liked: existing.length === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle like", detail: err.message });
  }
});

module.exports = router;
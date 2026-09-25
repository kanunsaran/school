const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT video_id, filename, filepath, chapter_chapter_id, created_at, updated_at
       FROM file_videos
       WHERE deleted_at IS NULL
       ORDER BY video_id DESC`
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
      `SELECT video_id, filename, filepath, chapter_chapter_id, created_at, updated_at
       FROM file_videos
       WHERE video_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มวิดีโอ ----------------------
router.post('/', async (req, res) => {
  try {
    const { filename, filepath, chapter_chapter_id } = req.body;

    if (!filename || !filepath || !chapter_chapter_id) {
      return res.status(400).json({ message: 'filename, filepath, chapter_chapter_id are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO file_videos (filename, filepath, chapter_chapter_id)
       VALUES (?, ?, ?)`,
      [filename, filepath, chapter_chapter_id]
    );

    res.status(201).json({
      video_id: result.insertId,
      filename,
      filepath,
      chapter_chapter_id
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { filename = null, filepath = null, chapter_chapter_id = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE file_videos
       SET filename = COALESCE(?, filename),
           filepath = COALESCE(?, filepath),
           chapter_chapter_id = COALESCE(?, chapter_chapter_id)
       WHERE video_id = ? AND deleted_at IS NULL`,
      [filename, filepath, chapter_chapter_id, id]
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
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE file_videos
       SET deleted_at = NOW()
       WHERE video_id = ? AND deleted_at IS NULL`,
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

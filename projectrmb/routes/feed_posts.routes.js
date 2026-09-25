const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/feed/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

async function insertFiles(postId, files) {
  const saved = [];
  for (const file of files) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const filePath = `/uploads/feed/${file.filename}`;
    const isImage = file.mimetype.startsWith('image/');

    const [result] = await pool.query(
      `INSERT INTO feed_post_files (post_id, file_url, file_name, file_type, is_image) VALUES (?, ?, ?, ?, ?)`,
      [postId, filePath, originalName, file.mimetype, isImage]
    );

    saved.push({
      file_id: result.insertId,
      file_url: filePath,
      file_name: originalName,
      file_type: file.mimetype,
      is_image: isImage,
    });
  }
  return saved;
}

// ---------------------- GET ทั้งหมด (ปักหมุดขึ้นก่อน) ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.post_id, p.author_id, p.title, p.content, p.category, p.event_date, p.event_end_date,
              p.link_url, p.pinned, p.created_at, p.updated_at,
              u.fullname AS author_name
       FROM feed_posts p
       JOIN users u ON u.user_id = p.author_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.pinned DESC, p.created_at DESC`
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
      `SELECT p.post_id, p.author_id, p.title, p.content, p.category, p.event_date, p.event_end_date,
              p.link_url, p.pinned, p.created_at, p.updated_at,
              u.fullname AS author_name
       FROM feed_posts p
       JOIN users u ON u.user_id = p.author_id
       WHERE p.post_id = ? AND p.deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ไฟล์แนบของโพสต์ ----------------------
router.get('/:id/files', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT file_id, file_url, file_name, file_type, is_image
       FROM feed_post_files
       WHERE post_id = ?
       ORDER BY file_id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างโพสต์ใหม่ (multipart รับไฟล์ได้เลย) ----------------------
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { title, content, category, event_date, event_end_date, link_url, author_id } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ message: 'title, content, category จำเป็น' });
    }
    if (category === 'event' && !event_date) {
      return res.status(400).json({ message: 'event_date จำเป็นเมื่อ category เป็น event' });
    }

    const [result] = await pool.query(
      `INSERT INTO feed_posts (author_id, title, content, category, event_date, event_end_date, link_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [author_id || 1, title, content, category, event_date || null, event_end_date || null, link_url || null]
    );
    const postId = result.insertId;

    const files = req.files && req.files.length ? await insertFiles(postId, req.files) : [];

    res.status(201).json({
      post_id: postId,
      author_id: author_id || 1,
      title,
      content,
      category,
      event_date: event_date || null,
      event_end_date: event_end_date || null,
      link_url: link_url || null,
      pinned: false,
      files,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', async (req, res) => {
  try {
    const {
      title = null,
      content = null,
      category = null,
      event_date = null,
      event_end_date = null,
      link_url = null,
    } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE feed_posts
       SET title = COALESCE(?, title),
           content = COALESCE(?, content),
           category = COALESCE(?, category),
           event_date = COALESCE(?, event_date),
           event_end_date = COALESCE(?, event_end_date),
           link_url = COALESCE(?, link_url),
           updated_at = NOW()
       WHERE post_id = ? AND deleted_at IS NULL`,
      [title, content, category, event_date, event_end_date, link_url, id]
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

// ---------------------- DELETE (soft delete) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE feed_posts SET deleted_at = NOW() WHERE post_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or already deleted' });
    }

    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PATCH ปักหมุด (toggle) ----------------------
router.patch('/:id/pin', async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await pool.query(
      `SELECT pinned FROM feed_posts WHERE post_id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });

    const newPinned = !rows[0].pinned;
    await pool.query(`UPDATE feed_posts SET pinned = ? WHERE post_id = ?`, [newPinned, id]);

    res.json({ post_id: Number(id), pinned: newPinned });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มไฟล์แนบให้โพสต์ที่มีอยู่แล้ว ----------------------
router.post('/:id/upload', upload.array('files', 10), async (req, res) => {
  try {
    const postId = req.params.id;

    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const files = await insertFiles(postId, req.files);
    res.json({ message: 'upload success', files });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'upload error' });
  }
});

// ---------------------- DELETE ไฟล์แนบทีละไฟล์ ----------------------
router.delete('/files/:fileId', async (req, res) => {
  try {
    await pool.query(`DELETE FROM feed_post_files WHERE file_id = ?`, [req.params.fileId]);
    res.json({ message: 'File deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

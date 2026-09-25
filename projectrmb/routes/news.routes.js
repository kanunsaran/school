const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });


// ---------------------- GET ข่าวทั้งหมด ----------------------
router.get('/', async (_req, res) => {
    try {

        const [rows] = await pool.query(
            `SELECT news_id, class_id, title, content, created_at, user_id, youtube_url, link_url, file_url, file_name
FROM news
WHERE deleted_at IS NULL
ORDER BY created_at DESC;`
        );

        res.json(rows);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});


// ---------------------- GET ข่าวเดียว ----------------------
router.get('/:id', async (req, res) => {

    try {

        const [rows] = await pool.query(
            `SELECT news_id, class_id, title, content, created_at, user_id, youtube_url, link_url, file_url, file_name
       FROM news
       WHERE news_id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json(rows[0]);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }

});


// ---------------------- POST สร้างข่าว ----------------------
router.post('/', async (req, res) => {

    try {

        const { class_id, title, content, youtube_url, link_url, file_url } = req.body;
        const userId = "2";

        if (!class_id || !title || !content) {
            return res.status(400).json({ message: 'class_id, title, content required' });
        }

        const [result] = await pool.query(
            `INSERT INTO news (class_id, title, content, user_id, youtube_url, link_url, file_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [class_id, title, content, userId, youtube_url || null, link_url || null, file_url || null]
        );

        res.status(201).json({
            news_id: result.insertId,
            class_id,
            title,
            content,
            youtube_url,
            link_url,
            file_url,
            user_id: userId
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message || 'Server error' });
    }

});

// ---------------------- PUT แก้ข่าว ----------------------
router.put('/:id', async (req, res) => {

  try {

    const {
      title = null,
      content = null,
      youtube_url = null,
      link_url = null,
      file_url = null,
      remove_file = false
    } = req.body;

    const id = req.params.id;

    // remove_file = true -> ลบไฟล์แนบออกโดยตั้งใจ (COALESCE จะไม่ยอมให้ตั้งเป็น NULL ปกติ)
    const [result] = await pool.query(
      `UPDATE news
       SET title = COALESCE(?, title),
           content = COALESCE(?, content),
           youtube_url = COALESCE(?, youtube_url),
           link_url = COALESCE(?, link_url),
           file_url = ${remove_file ? "NULL" : "COALESCE(?, file_url)"},
           file_name = ${remove_file ? "NULL" : "file_name"},
           updated_at = NOW()
       WHERE news_id = ?`,
      remove_file
        ? [title, content, youtube_url, link_url, id]
        : [title, content, youtube_url, link_url, file_url, id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({ message: 'No change or not found' });
    }

    res.json({
      message: 'Updated',
      data: {
        news_id: id,
        title,
        content,
        youtube_url,
        link_url,
        file_url: remove_file ? null : file_url
      }
    });

  } catch (e) {

    console.error(e);
    res.status(500).json({ message: 'Server error' });

  }

});


// ---------------------- DELETE ข่าว ----------------------
router.delete('/:id', async (req, res) => {

    try {

        const id = req.params.id;

        const [result] = await pool.query(
            `UPDATE news
       SET deleted_at = NOW()
       WHERE news_id = ?
       AND deleted_at IS NULL`,
            [id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Not found or already deleted' });
        }

        res.json({ message: 'Deleted (soft delete)' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }

});


// ---------------------- Upload ไฟล์แนบ (รองรับหลายไฟล์ต่อโพสต์ เก็บลง news_files) ----------------------
// ใช้ตอนโพสต์ใหม่: สร้าง news ก่อน (POST /) แล้วค่อยเรียก upload ด้วย news_id ที่ได้กลับมา
router.post("/:id/upload", upload.array("files", 10), async (req, res) => {
    try {

        const newsId = req.params.id;

        if (!req.files || !req.files.length) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const savedFiles = [];
        for (const file of req.files) {
            // แก้ชื่อไฟล์ภาษาไทย/ไม่ใช่ ASCII ที่เพี้ยนจาก multer (decode ผิดเป็น latin1)
            const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
            const filePath = `/uploads/${file.filename}`;

            const [result] = await pool.query(
                `INSERT INTO news_files (news_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`,
                [newsId, originalName, filePath, file.mimetype]
            );

            savedFiles.push({
                file_id: result.insertId,
                file_url: filePath,
                file_name: originalName,
                file_type: file.mimetype
            });
        }

        res.json({ message: "upload success", files: savedFiles });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "upload error" });
    }
});

// ---------------------- ดึงไฟล์แนบทั้งหมดของข่าว ----------------------
router.get("/:id/files", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT file_id, file_name, file_path AS file_url, file_type FROM news_files WHERE news_id = ? ORDER BY file_id`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server error" });
    }
});

// ---------------------- ลบไฟล์แนบทีละไฟล์ (ใช้ตอนแก้ไขโพสต์แล้วผู้ใช้กดลบไฟล์) ----------------------
router.delete("/files/:id", async (req, res) => {
    try {
        await pool.query(`DELETE FROM news_files WHERE file_id = ?`, [req.params.id]);
        res.json({ message: "File deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server error" });
    }
});

module.exports = router;
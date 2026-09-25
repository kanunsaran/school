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

// // ---------------------- GET ทั้งหมด ----------------------
// router.get('/', async (_req, res) => {
//   try {

//     const [rows] = await pool.query(
//       `SELECT news_id, title, content, created_at, user_user_id
//        FROM announcements
//        WHERE deleted_at IS NULL
//        ORDER BY created_at DESC`
//     );

//     res.json(rows);

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }
// });


// // ---------------------- GET รายการเดียว ----------------------
// router.get('/:id', async (req, res) => {

//   try {

//     const [rows] = await pool.query(
//       `SELECT news_id, title, content, created_at, user_user_id
//        FROM announcements
//        WHERE news_id = ?
//        AND deleted_at IS NULL`,
//       [req.params.id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ message: 'Not found' });
//     }

//     res.json(rows[0]);

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }

// });


// // ---------------------- POST สร้างใหม่ ----------------------
// router.post('/', async (req, res) => {

//   try {

//     const { title, content } = req.body;
//     const userId = req.user?.id || 1;

//     if (!title || !content) {
//       return res.status(400).json({ message: 'title & content are required' });
//     }

//     const [result] = await pool.query(
//       `INSERT INTO announcements (title, content, user_user_id)
//        VALUES (?, ?, ?)`,
//       [title, content, userId]
//     );

//     res.status(201).json({
//       news_id: result.insertId,
//       title,
//       content,
//       user_user_id: userId
//     });

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: e.message || 'Server error' });
//   }

// });


// // ---------------------- PUT แก้ไข ----------------------
// router.put('/:id', async (req, res) => {

//   try {

//     const { title = null, content = null } = req.body;
//     const id = req.params.id;

//     const [result] = await pool.query(
//       `UPDATE announcements
//        SET title = COALESCE(?, title),
//            content = COALESCE(?, content),
//            updated_at = NOW()
//        WHERE news_id = ?
//        AND deleted_at IS NULL`,
//       [title, content, id]
//     );

//     if (!result.affectedRows) {
//       return res.status(400).json({ message: 'No change or not found' });
//     }

//     res.json({ message: 'Updated' });

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }

// });


// // ---------------------- SOFT DELETE ----------------------
// router.patch('/:id/delete', async (req, res) => {

//   try {

//     const id = req.params.id;

//     const [result] = await pool.query(
//       `UPDATE announcements
//        SET deleted_at = NOW()
//        WHERE news_id = ?
//        AND deleted_at IS NULL`,
//       [id]
//     );

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: 'Not found or already deleted' });
//     }

//     res.json({ message: 'Soft deleted' });

//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: 'Server error' });
//   }

// });
// router.post("/:id/upload", upload.single("file"), async (req, res) => {
//   try {

//     const newsId = req.params.id;

//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const fileName = req.file.filename;
//     const filePath = `/uploads/${fileName}`;
//     const fileType = req.file.mimetype;

//     await pool.query(
//       `INSERT INTO announcement_files
//       (news_id, file_name, file_path, file_type)
//       VALUES (?, ?, ?, ?)`,
//       [newsId, fileName, filePath, fileType]
//     );

//     res.json({
//       message: "upload success",
//       file: filePath,
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "upload error" });
//   }
// });

// router.get("/:id/files", async (req, res) => {
//   try {

//     const [rows] = await pool.query(
//       `SELECT * FROM announcement_files
//        WHERE news_id = ?`,
//       [req.params.id]
//     );

//     res.json(rows);

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "server error" });
//   }
// });

// module.exports = router;
router.get('/', async (_req, res) => {
  try {

    const [rows] = await pool.query(
      `SELECT
        news_id,
        title,
        content,
        youtube_url,
        link_url,
        timestamp,
        created_at,
        updated_at,
        user_user_id
      FROM announcements
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`
    );

    res.json(rows);

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/:id', async (req, res) => {
  try {

    const [rows] = await pool.query(
      `SELECT
        news_id,
        title,
        content,
        youtube_url,
        link_url,
        timestamp,
        created_at,
        updated_at,
        user_user_id
      FROM announcements
      WHERE news_id = ?
      AND deleted_at IS NULL`,
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
router.post('/', async (req, res) => {
  try {

    const {
      title,
      content,
      youtube_url,
      link_url
    } = req.body;

    const userId = req.user?.id || 1;

    if (!title || !content) {
      return res.status(400).json({
        message: 'title & content are required'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO announcements
      (
        title,
        content,
        youtube_url,
        link_url,
        user_user_id
      )
      VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        content,
        youtube_url || null,
        link_url || null,
        userId
      ]
    );

    res.status(201).json({
      news_id: result.insertId,
      title,
      content,
      youtube_url,
      link_url,
      user_user_id: userId
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: e.message || 'Server error'
    });
  }
});
router.put('/:id', async (req, res) => {
  try {

    const {
      title = null,
      content = null,
      youtube_url = null,
      link_url = null
    } = req.body;

    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE announcements
      SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        youtube_url = COALESCE(?, youtube_url),
        link_url = COALESCE(?, link_url),
        updated_at = NOW()
      WHERE news_id = ?
      AND deleted_at IS NULL`,
      [
        title,
        content,
        youtube_url,
        link_url,
        id
      ]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        message: 'No change or not found'
      });
    }

    res.json({
      message: 'Updated'
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: 'Server error'
    });
  }
});
// ---------------------- SOFT DELETE ----------------------
router.patch('/:id/delete', async (req, res) => {
  try {

    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE announcements
       SET deleted_at = NOW()
       WHERE news_id = ?
       AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Not found or already deleted'
      });
    }

    res.json({
      message: 'Soft deleted'
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: 'Server error'
    });
  }
});


// ---------------------- Upload File ----------------------
router.post("/:id/upload", upload.array("files", 10), async (req, res) => {
  try {

    const newsId = req.params.id;

    if (!req.files || !req.files.length) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    const savedFiles = [];
    for (const file of req.files) {
      // แก้ชื่อไฟล์ภาษาไทย/ไม่ใช่ ASCII ที่เพี้ยนจาก multer (decode ผิดเป็น latin1)
      const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
      const filePath = `/uploads/${file.filename}`;

      const [result] = await pool.query(
        `INSERT INTO announcement_files
        (news_id, file_name, file_path, file_type)
        VALUES (?, ?, ?, ?)`,
        [
          newsId,
          originalName,
          filePath,
          file.mimetype
        ]
      );

      savedFiles.push({
        file_id: result.insertId,
        file_url: filePath,
        file_name: originalName,
        file_type: file.mimetype
      });
    }

    res.json({
      message: "Upload success",
      files: savedFiles
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Upload error"
    });
  }
});


// ---------------------- Get Files ----------------------
router.get("/:id/files", async (req, res) => {
  try {

    const [rows] = await pool.query(
      `SELECT *
       FROM announcement_files
       WHERE news_id = ?
       ORDER BY file_id`,
      [req.params.id]
    );

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});


// ---------------------- Delete File ----------------------
router.delete("/files/:id", async (req, res) => {
  try {

    await pool.query(
      `DELETE FROM announcement_files
       WHERE file_id = ?`,
      [req.params.id]
    );

    res.json({
      message: "File deleted"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error"
    });
  }
});

module.exports = router;
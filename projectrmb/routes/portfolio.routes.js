const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/portfolio/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------------- GET ทั้งหมด (filter ได้: student_user_id, grade_id, status, visibility) ----------------------
router.get('/', async (req, res) => {
  try {
    const { student_user_id, grade_id, status, visibility } = req.query;

    const conditions = ['w.deleted_at IS NULL'];
    const params = [];
    if (student_user_id) { conditions.push('w.student_user_id = ?'); params.push(student_user_id); }
    if (grade_id) { conditions.push('w.grade_idgrade = ?'); params.push(grade_id); }
    if (status) { conditions.push('w.status = ?'); params.push(status); }
    if (visibility) { conditions.push('w.visibility = ?'); params.push(visibility); }

    const [rows] = await pool.query(
      `SELECT w.work_id, w.student_user_id, w.grade_idgrade, w.title, w.description, w.category,
              w.visibility, w.file_type, w.link_url, w.status, w.teacher_comment,
              w.reviewed_by, w.reviewed_at, w.created_at, w.updated_at,
              u.fullname AS student_name,
              r.fullname AS reviewer_name
       FROM portfolio_works w
       JOIN users u ON u.user_id = w.student_user_id
       LEFT JOIN users r ON r.user_id = w.reviewed_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY w.created_at DESC`,
      params
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
      `SELECT w.work_id, w.student_user_id, w.grade_idgrade, w.title, w.description, w.category,
              w.visibility, w.file_type, w.link_url, w.status, w.teacher_comment,
              w.reviewed_by, w.reviewed_at, w.created_at, w.updated_at,
              u.fullname AS student_name,
              r.fullname AS reviewer_name
       FROM portfolio_works w
       JOIN users u ON u.user_id = w.student_user_id
       LEFT JOIN users r ON r.user_id = w.reviewed_by
       WHERE w.work_id = ? AND w.deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ไฟล์แนบของผลงาน ----------------------
router.get('/:id/files', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT file_id, file_url, file_name, file_type, cover_url
       FROM portfolio_files
       WHERE work_id = ?
       ORDER BY file_id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างผลงานใหม่ ----------------------
// ใช้ตอนสร้างใหม่: สร้าง work ก่อน แล้วค่อยเรียก /:id/upload ด้วย work_id ที่ได้กลับมา (แบบเดียวกับ /news)
router.post('/', async (req, res) => {
  try {
    const {
      student_user_id,
      grade_idgrade,
      title,
      description,
      category,
      visibility,
      file_type,
      link_url,
    } = req.body;

    if (!student_user_id || !title) {
      return res.status(400).json({ message: 'student_user_id และ title จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO portfolio_works
        (student_user_id, grade_idgrade, title, description, category, visibility, file_type, link_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_user_id,
        grade_idgrade || null,
        title,
        description || null,
        category || null,
        visibility || 'private',
        file_type || null,
        link_url || null,
      ]
    );

    res.status(201).json({
      work_id: result.insertId,
      student_user_id,
      grade_idgrade: grade_idgrade || null,
      title,
      description: description || null,
      category: category || null,
      visibility: visibility || 'private',
      file_type: file_type || null,
      link_url: link_url || null,
      status: 'รอคำแนะนำ',
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
      description = null,
      category = null,
      visibility = null,
      file_type = null,
      link_url = null,
      grade_idgrade = null,
    } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE portfolio_works
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           visibility = COALESCE(?, visibility),
           file_type = COALESCE(?, file_type),
           link_url = COALESCE(?, link_url),
           grade_idgrade = COALESCE(?, grade_idgrade),
           updated_at = NOW()
       WHERE work_id = ? AND deleted_at IS NULL`,
      [title, description, category, visibility, file_type, link_url, grade_idgrade, id]
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

// ---------------------- PATCH ให้คำแนะนำ (ครูรีวิว) ----------------------
router.patch('/:id/review', async (req, res) => {
  try {
    const { status, teacher_comment, reviewed_by } = req.body;
    const id = req.params.id;

    if (!status) {
      return res.status(400).json({ message: 'status จำเป็น' });
    }

    const [result] = await pool.query(
      `UPDATE portfolio_works
       SET status = ?,
           teacher_comment = COALESCE(?, teacher_comment),
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE work_id = ? AND deleted_at IS NULL`,
      [status, teacher_comment || null, reviewed_by || null, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Reviewed', status, teacher_comment: teacher_comment || null, reviewed_by: reviewed_by || null });
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
      `UPDATE portfolio_works SET deleted_at = NOW() WHERE work_id = ? AND deleted_at IS NULL`,
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

// ---------------------- Upload ไฟล์ผลงาน (multipart, แบบเดียวกับ /news/:id/upload) ----------------------
// ไฟล์จริงเก็บด้วย multer ปกติ ส่วน cover_url เป็น data URL/base64 ที่ frontend สร้างเอง ส่งมาเป็น text field ใน body เดียวกัน
router.post('/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const workId = req.params.id;
    const { cover_url } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const filePath = `/uploads/portfolio/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO portfolio_files (work_id, file_url, file_name, file_type, cover_url)
       VALUES (?, ?, ?, ?, ?)`,
      [workId, filePath, originalName, req.file.mimetype, cover_url || null]
    );

    res.json({
      message: 'upload success',
      file_id: result.insertId,
      file_url: filePath,
      file_name: originalName,
      file_type: req.file.mimetype,
      cover_url: cover_url || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'upload error' });
  }
});

module.exports = router;

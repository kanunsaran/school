const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/send_ass/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT send_id, file_path, timestamp, score, user_user_id, assignment_ass_id, group_id, teacher_comment, is_released, created_at, updated_at
       FROM send_ass
       WHERE deleted_at IS NULL
       ORDER BY send_id DESC`
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
      `SELECT send_id, file_path, timestamp, score, user_user_id, assignment_ass_id, group_id, teacher_comment, is_released, created_at, updated_at
       FROM send_ass
       WHERE send_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST ส่งงาน ----------------------
router.post('/', async (req, res) => {
  try {
    const { file_path, assignment_ass_id, user_user_id, group_id } = req.body;
    const userId = user_user_id;

    if (!file_path || !assignment_ass_id || !userId) {
      return res.status(400).json({ message: 'file_path, assignment_ass_id and user_user_id are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO send_ass (file_path, user_user_id, assignment_ass_id, group_id)
       VALUES (?, ?, ?, ?)`,
      [file_path, userId, assignment_ass_id, group_id || null]
    );

    res.status(201).json({
      send_id: result.insertId,
      file_path,
      user_user_id: userId,
      assignment_ass_id,
      group_id: group_id || null
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT ให้คะแนน / แก้ path ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { file_path = null, score = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE send_ass
       SET file_path = COALESCE(?, file_path),
           score = COALESCE(?, score)
       WHERE send_id = ? AND deleted_at IS NULL`,
      [file_path, score, id]
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

// ---------------------- DELETE (Soft delete submission) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE send_ass
       SET deleted_at = NOW()
       WHERE send_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or already deleted' });
    }

    res.json({ message: 'Submission removed' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// กลุ่มเป้าหมายของงาน: ถ้ามี assignment_students (มอบหมายรายคน) ใช้รายชื่อนั้น
// ไม่งั้นถ้ามี assignment_classes (มอบหมายทั้งห้อง) ใช้นักเรียนที่ enroll ห้องนั้น
// ไม่มีทั้งคู่ = มอบหมายให้นักเรียนทั้งหมด
function targetAudienceCTE(selectClause) {
  return `
    WITH target AS (
      SELECT u.user_id, u.fullname
      FROM users u
      WHERE u.role_role_id = 2 AND u.deleted_at IS NULL
      AND (
        CASE
          WHEN EXISTS (SELECT 1 FROM assignment_students WHERE ass_id = ?)
            THEN u.user_id IN (SELECT user_id FROM assignment_students WHERE ass_id = ?)
          WHEN EXISTS (SELECT 1 FROM assignment_classes WHERE ass_id = ?)
            THEN u.user_id IN (
              SELECT e.user_user_id FROM enroll e
              JOIN assignment_classes ac ON ac.grade_id = e.grade_idgrade
              WHERE ac.ass_id = ? AND e.deleted_at IS NULL
            )
          ELSE TRUE
        END
      )
    )
    ${selectClause} FROM target
    WHERE user_id NOT IN (
      SELECT user_user_id FROM send_ass WHERE assignment_ass_id = ? AND deleted_at IS NULL
    )
  `;
}

router.get('/not-submit/:ass_id', async (req, res) => {
  try {
    const assId = req.params.ass_id;

    const [rows] = await pool.query(
      targetAudienceCTE('SELECT user_id, fullname'),
      [assId, assId, assId, assId, assId]
    );

    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/submitted/:ass_id', async (req, res) => {
  try {
    const assId = req.params.ass_id;

    const [rows] = await pool.query(`
      SELECT u.user_id, u.fullname, s.send_id, s.file_path, s.timestamp, s.score,
             s.group_id, s.teacher_comment, s.is_released
      FROM send_ass s
      JOIN users u ON u.user_id = s.user_user_id
      WHERE s.assignment_ass_id = ?
      AND s.deleted_at IS NULL
    `, [assId]);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/count/submitted/:ass_id', async (req, res) => {
  try {
    const assId = req.params.ass_id;

    const [[row]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM send_ass
      WHERE assignment_ass_id = ?
      AND deleted_at IS NULL
    `, [assId]);

    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/count/not-submit/:ass_id', async (req, res) => {
  try {
    const assId = req.params.ass_id;

    const [[row]] = await pool.query(
      targetAudienceCTE('SELECT COUNT(*) AS total'),
      [assId, assId, assId, assId, assId]
    );

    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ---------------------- PATCH คำแนะนำจากครู + สถานะเผยแพร่ ----------------------
router.patch('/:id/comment', async (req, res) => {
  try {
    const { teacher_comment = null, is_released = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE send_ass
       SET teacher_comment = COALESCE(?, teacher_comment),
           is_released = COALESCE(?, is_released)
       WHERE send_id = ? AND deleted_at IS NULL`,
      [teacher_comment, is_released, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Updated', teacher_comment, is_released });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ไฟล์แนบของการส่งงาน ----------------------
router.get('/:id/files', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT file_id, file_url, file_name, file_type
       FROM send_ass_files
       WHERE send_id = ?
       ORDER BY file_id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST อัปโหลดไฟล์แนบของการส่งงาน (หลายไฟล์) ----------------------
router.post('/:id/files', upload.array('files', 10), async (req, res) => {
  try {
    const sendId = req.params.id;

    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const saved = [];
    for (const file of req.files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const filePath = `/uploads/send_ass/${file.filename}`;

      const [result] = await pool.query(
        `INSERT INTO send_ass_files (send_id, file_url, file_name, file_type) VALUES (?, ?, ?, ?)`,
        [sendId, filePath, originalName, file.mimetype]
      );

      saved.push({ file_id: result.insertId, file_url: filePath, file_name: originalName, file_type: file.mimetype });
    }

    res.json({ message: 'upload success', files: saved });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'upload error' });
  }
});

module.exports = router;



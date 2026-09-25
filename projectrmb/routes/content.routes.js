const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/content');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '');
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

async function getClassIds(contentId) {
  const [rows] = await pool.query(
    `SELECT grade_id FROM content_classes WHERE content_id = ?`,
    [contentId]
  );
  return rows.map((r) => r.grade_id);
}

async function attachClassIds(rows) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.content_id);
  const [links] = await pool.query(
    `SELECT content_id, grade_id FROM content_classes WHERE content_id IN (?)`,
    [ids]
  );
  const classIdsByContent = {};
  links.forEach((l) => {
    if (!classIdsByContent[l.content_id]) classIdsByContent[l.content_id] = [];
    classIdsByContent[l.content_id].push(l.grade_id);
  });
  return rows.map((r) => ({ ...r, class_ids: classIdsByContent[r.content_id] || [] }));
}

// visibleOnly=true -> ใช้ฝั่งนักเรียน (เผื่ออนาคตอยากซ่อนเนื้อหาบางอย่าง ตอนนี้ยังไม่มี scheduled_at เลยไม่มีผลต่างจาก GET ปกติ)
// grade_id -> กรองเฉพาะเนื้อหาที่ผูกกับห้องนี้ (join content_classes)
router.get('/', async (req, res) => {
  try {
    const { grade_id } = req.query;

    // เนื้อหาที่ไม่ได้ผูกห้องไว้เลย (ไม่มีแถวใน content_classes) ถือว่ามองเห็นได้ทุกห้อง
    // ตาม convention เดียวกับ assignment_classes/assignment_students ใน /assignment
    const [rows] = await pool.query(
      grade_id
        ? `SELECT c.content_id, c.title, c.body, c.chapter_chapter_id, c.created_at, c.updated_at
           FROM content c
           WHERE c.deleted_at IS NULL
           AND (
             NOT EXISTS (SELECT 1 FROM content_classes cc WHERE cc.content_id = c.content_id)
             OR EXISTS (SELECT 1 FROM content_classes cc WHERE cc.content_id = c.content_id AND cc.grade_id = ?)
           )
           ORDER BY c.content_id DESC`
        : `SELECT content_id, title, body, chapter_chapter_id, created_at, updated_at
           FROM content
           WHERE deleted_at IS NULL
           ORDER BY content_id DESC`,
      grade_id ? [grade_id] : []
    );

    res.json(await attachClassIds(rows));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างเนื้อหา + ไฟล์แนบ (หลายไฟล์) + ห้องเรียน + นักเรียนเฉพาะราย ----------------------
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const {
      title,
      body,
      chapterId,
      assignees,  // JSON string ของ user_id array, ว่าง [] = ทั้งหมด
      classIds,   // JSON string ของ grade_id array
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO content (title, body, chapter_chapter_id) VALUES (?, ?, ?)`,
      [title, body || null, chapterId || null]
    );
    const contentId = result.insertId;

    // ห้องเรียนที่โพสต์ (เลือกได้หลายห้อง) — grade_id อ้างอิงตาราง grade (idgrade)
    const classIdList = classIds ? JSON.parse(classIds) : [];
    for (const gradeId of classIdList) {
      await pool.query(
        `INSERT INTO content_classes (content_id, grade_id) VALUES (?, ?)`,
        [contentId, gradeId]
      );
    }

    // ไฟล์แนบ (หลายไฟล์)
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        await pool.query(
          `INSERT INTO content_files (content_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`,
          [contentId, originalName, `/uploads/content/${file.filename}`, file.mimetype]
        );
      }
    }

    // มอบหมายให้นักเรียนเฉพาะราย (ถ้าเลือก "เลือกบางคน")
    const assigneeIds = assignees ? JSON.parse(assignees) : [];
    if (assigneeIds.length > 0) {
      for (const userId of assigneeIds) {
        await pool.query(
          `INSERT INTO content_students (content_id, user_id) VALUES (?, ?)`,
          [contentId, userId]
        );
      }
    }
    // ถ้า assigneeIds ว่าง = มองเห็นได้ทุกคน (ไม่ต้อง insert แถวไหนเลย ตีความว่า "ทั้งหมด" ตอน query)

    res.status(201).json({
      content_id: contentId,
      title,
      body: body || null,
      chapter_chapter_id: chapterId || null,
      classIds: classIdList,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- GET เนื้อหาเดียวแบบเต็ม ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT content_id, title, body, chapter_chapter_id, created_at, updated_at
       FROM content
       WHERE content_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const [full] = await attachClassIds(rows);
    res.json(full);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ห้องเรียนที่ผูกกับเนื้อหานี้ ----------------------
router.get('/:id/classes', async (req, res) => {
  try {
    res.json(await getClassIds(req.params.id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ไฟล์แนบของเนื้อหา ----------------------
router.get('/:id/files', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT file_id, file_name, file_path, file_type
       FROM content_files
       WHERE content_id = ?
       ORDER BY file_id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { title = null, body = null, chapterId = null, classIds = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE content
       SET title = COALESCE(?, title),
           body = COALESCE(?, body),
           chapter_chapter_id = COALESCE(?, chapter_chapter_id),
           updated_at = NOW()
       WHERE content_id = ? AND deleted_at IS NULL`,
      [title, body, chapterId, id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({ message: 'No change or not found' });
    }

    // ถ้าส่ง classIds มา (array แม้จะว่างเปล่า) ให้แทนที่ห้องเรียนที่ผูกไว้ทั้งชุด
    if (Array.isArray(classIds)) {
      await pool.query(`DELETE FROM content_classes WHERE content_id = ?`, [id]);
      for (const gradeId of classIds) {
        await pool.query(`INSERT INTO content_classes (content_id, grade_id) VALUES (?, ?)`, [id, gradeId]);
      }
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
    const [result] = await pool.query(
      `UPDATE content SET deleted_at = NOW() WHERE content_id = ? AND deleted_at IS NULL`,
      [req.params.id]
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

module.exports = router;

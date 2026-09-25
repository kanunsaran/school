const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT class_id, class_name, description, year_year_id
       FROM class_subject
       ORDER BY class_id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET รายการเดียว ----------------------
router.get('/:id', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT class_id, class_name, description, year_year_id
       FROM class_subject
       WHERE class_id = ?`,
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Not found' });

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างใหม่ ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { class_name, description, year_year_id } = req.body;

    if (!class_name) {
      return res.status(400).json({ message: 'class_name is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO class_subject (class_name, description, year_year_id)
       VALUES (?, ?, ?)`,
      [class_name, description, year_year_id]
    );

    res.status(201).json({
      class_id: result.insertId,
      class_name,
      description,
      year_year_id
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { class_name, description, year_year_id } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE class_subject
       SET 
         class_name = COALESCE(?, class_name),
         description = COALESCE(?, description),
         year_year_id = COALESCE(?, year_year_id)
       WHERE class_id = ?`,
      [class_name, description, year_year_id, id]
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

// ---------------------- DELETE ลบ ----------------------
router.delete('/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `DELETE FROM class_subject WHERE class_id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or delete failed' });
    }

    res.json({ message: 'Deleted' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT faculty_id, faculty_name, university_name, Type_type_id
       FROM faculty
       ORDER BY faculty_id DESC`
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
      `SELECT faculty_id, faculty_name, university_name, Type_type_id
       FROM faculty
       WHERE faculty_id = ?`,
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

// ---------------------- POST สร้างใหม่ ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { faculty_name, university_name, Type_type_id } = req.body;

    if (!faculty_name || !university_name || !Type_type_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO faculty (faculty_name, university_name, Type_type_id)
       VALUES (?, ?, ?)`,
      [faculty_name, university_name, Type_type_id]
    );

    res.status(201).json({
      faculty_id: result.insertId,
      faculty_name,
      university_name,
      Type_type_id
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const {
      faculty_name = null,
      university_name = null,
      Type_type_id = null
    } = req.body;

    const [result] = await pool.query(
      `UPDATE faculty
       SET faculty_name = COALESCE(?, faculty_name),
           university_name = COALESCE(?, university_name),
           Type_type_id = COALESCE(?, Type_type_id)
       WHERE faculty_id = ?`,
      [faculty_name, university_name, Type_type_id, req.params.id]
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

// ---------------------- DELETE ลบข้อมูล ----------------------
router.delete('/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM faculty WHERE faculty_id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

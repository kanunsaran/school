const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT year_id, year_name FROM years ORDER BY year_id DESC'
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
      'SELECT year_id, year_name FROM years WHERE year_id = ?',
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างใหม่ ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { year_name } = req.body;

    if (!year_name) {
      return res.status(400).json({ message: 'year_name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO years (year_name) VALUES (?)',
      [year_name]
    );

    res.status(201).json({
      year_id: result.insertId,
      year_name
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { year_name = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE years
       SET year_name = COALESCE(?, year_name)
       WHERE year_id = ?`,
      [year_name, id]
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

// ---------------------- DELETE ลบข้อมูล ----------------------
router.delete('/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM years WHERE year_id = ?',
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

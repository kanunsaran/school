const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

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

// ---------------------- DELETE ลบข้อมูล ----------------------

module.exports = router;

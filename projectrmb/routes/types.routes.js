const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT type_id, type_code, type_name, description, created_at
      FROM types
      WHERE deleted_at IS NULL
      ORDER BY type_id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET รายการเดียว ----------------------

// ---------------------- POST ----------------------
router.post('/',  async (req, res) => {
  try {
    const { type_code, type_name, description } = req.body;

    if (!type_code || !type_name) {
      return res.status(400).json({ message: 'type_code & type_name required' });
    }

    const [result] = await pool.query(`
      INSERT INTO types (type_code, type_name, description)
      VALUES (?, ?, ?)
    `, [type_code, type_name, description]);

    res.status(201).json({
      type_id: result.insertId,
      type_code,
      type_name,
      description
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ---------------------- PUT ----------------------

// ---------------------- DELETE (Soft) ----------------------

module.exports = router;

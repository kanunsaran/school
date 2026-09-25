const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

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
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT type_id, type_code, type_name, description, created_at
      FROM types
      WHERE type_id = ? AND deleted_at IS NULL
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { type_code = null, type_name = null, description = null } = req.body;

    const [result] = await pool.query(`
      UPDATE types
      SET type_code = COALESCE(?, type_code),
          type_name = COALESCE(?, type_name),
          description = COALESCE(?, description)
      WHERE type_id = ? AND deleted_at IS NULL
    `, [type_code, type_name, description, req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Updated' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE (Soft) ----------------------
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(`
      UPDATE types SET deleted_at = NOW()
      WHERE type_id = ? AND deleted_at IS NULL
    `, [req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

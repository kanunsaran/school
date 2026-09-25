const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT type_id, type_code, type_name, description FROM type ORDER BY type_id DESC'
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
      'SELECT type_id, type_code, type_name, description FROM type WHERE type_id = ?',
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
    const { type_code, type_name, description } = req.body;

    if (!type_code || !type_name) {
      return res.status(400).json({ message: 'type_code & type_name are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO type (type_code, type_name, description)
       VALUES (?, ?, ?)`,
      [type_code, type_name, description || null]
    );

    res.status(201).json({
      type_id: result.insertId,
      type_code,
      type_name,
      description: description || null
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { type_code = null, type_name = null, description = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE type
       SET type_code = COALESCE(?, type_code),
           type_name = COALESCE(?, type_name),
           description = COALESCE(?, description)
       WHERE type_id = ?`,
      [type_code, type_name, description, id]
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

// ---------------------- DELETE ลบ ----------------------
router.delete('/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM type WHERE type_id = ?',
      [id]
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

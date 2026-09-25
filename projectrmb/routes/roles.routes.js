const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT role_id, role_name, created_at, updated_at
       FROM roles
       WHERE deleted_at IS NULL
       ORDER BY role_id DESC`
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
      `SELECT role_id, role_name, created_at, updated_at
       FROM roles
       WHERE role_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่ม Role ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const { role_name } = req.body;

    if (!role_name) {
      return res.status(400).json({ message: 'role_name is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO roles (role_name)
       VALUES (?)`,
      [role_name]
    );

    res.status(201).json({
      role_id: result.insertId,
      role_name
    });

  } catch (e) {
    console.error(e);

    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Role already exists' });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PUT แก้ไข Role ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { role_name = null } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE roles
       SET role_name = COALESCE(?, role_name)
       WHERE role_id = ? AND deleted_at IS NULL`,
      [role_name, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or no change' });
    }

    res.json({ message: 'Updated' });

  } catch (e) {
    console.error(e);

    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Role name already exists' });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE (Soft Delete) ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE roles
       SET deleted_at = NOW()
       WHERE role_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or already deleted' });
    }

    res.json({ message: 'Soft deleted' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

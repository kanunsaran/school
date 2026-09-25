const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT question_id, question_text, order_no
       FROM question
       ORDER BY question_id DESC`
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
      `SELECT question_id, question_text, order_no
       FROM question
       WHERE question_id = ?`,
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
    const { question_text, order_no } = req.body;

    if (!question_text) {
      return res.status(400).json({ message: 'question_text is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO question (question_text, order_no)
       VALUES (?, ?)`,
      [question_text, order_no]
    );

    res.status(201).json({
      question_id: result.insertId,
      question_text,
      order_no
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { question_text, order_no } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE question
       SET 
         question_text = COALESCE(?, question_text),
         order_no = COALESCE(?, order_no)
       WHERE question_id = ?`,
      [question_text, order_no, id]
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
      `DELETE FROM question WHERE question_id = ?`,
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

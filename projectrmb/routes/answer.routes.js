const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        answer_id,
        answer_text,
        question_question_id,
        mapped_type_id
       FROM answer
       ORDER BY answer_id DESC`
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
      `SELECT 
        answer_id,
        answer_text,
        question_question_id,
        mapped_type_id
       FROM answer
       WHERE answer_id = ?`,
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
    const { answer_text, question_question_id, mapped_type_id } = req.body;

    if (!answer_text || !question_question_id || !mapped_type_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO answer 
        (answer_text, question_question_id, mapped_type_id)
       VALUES (?, ?, ?)`,
      [answer_text, question_question_id, mapped_type_id]
    );

    res.status(201).json({
      answer_id: result.insertId,
      answer_text,
      question_question_id,
      mapped_type_id
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
      answer_text = null, 
      question_question_id = null, 
      mapped_type_id = null 
    } = req.body;

    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE answer
       SET answer_text = COALESCE(?, answer_text),
           question_question_id = COALESCE(?, question_question_id),
           mapped_type_id = COALESCE(?, mapped_type_id)
       WHERE answer_id = ?`,
      [answer_text, question_question_id, mapped_type_id, id]
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
      'DELETE FROM answer WHERE answer_id = ?',
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

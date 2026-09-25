const express = require('express');
const router = express.Router();
const { pool } = require('../db');


// ---------------------- GET คะแนนเต็มทั้งหมด ----------------------
router.get('/', async (_req, res) => {
    try {

        const [rows] = await pool.query(
            `SELECT score_assignment_id, ass_id, max_score, created_at
             FROM score_assignment
             WHERE deleted_at IS NULL
             ORDER BY created_at DESC`
        );

        res.json(rows);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});


// ---------------------- GET คะแนนเต็มงานเดียว ----------------------
router.get('/:id', async (req, res) => {
    try {

        const [rows] = await pool.query(
            `SELECT *
             FROM score_assignment
             WHERE score_assignment_id = ?
             AND deleted_at IS NULL`,
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


// ---------------------- POST สร้างคะแนนเต็ม ----------------------
router.post('/', async (req, res) => {
    try {

        const { ass_id, max_score } = req.body;

        if (!ass_id || !max_score) {
            return res.status(400).json({ message: 'ass_id and max_score required' });
        }

        const [result] = await pool.query(
            `INSERT INTO score_assignment (ass_id, max_score)
             VALUES (?, ?)`,
            [ass_id, max_score]
        );

        res.status(201).json({
            score_assignment_id: result.insertId,
            ass_id,
            max_score
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
    }
});


// ---------------------- PUT แก้คะแนนเต็ม ----------------------
router.put('/:id', async (req, res) => {
    try {

        const { max_score = null } = req.body;
        const id = req.params.id;

        const [result] = await pool.query(
            `UPDATE score_assignment
             SET max_score = COALESCE(?, max_score),
                 updated_at = NOW()
             WHERE score_assignment_id = ?`,
            [max_score, id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({
            message: 'Updated',
            score_assignment_id: id
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});


// ---------------------- DELETE (soft delete) ----------------------
router.delete('/:id', async (req, res) => {
    try {

        const id = req.params.id;

        const [result] = await pool.query(
            `UPDATE score_assignment
             SET deleted_at = NOW()
             WHERE score_assignment_id = ?
             AND deleted_at IS NULL`,
            [id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Not found or already deleted' });
        }

        res.json({ message: 'Deleted' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
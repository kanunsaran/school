const express = require('express');
const router = express.Router();
const { pool } = require('../db');


// ---------------------- GET คะแนนทั้งหมด ----------------------
router.get('/', async (_req, res) => {
    try {

        const [rows] = await pool.query(`
            SELECT 
                su.score_user_id,
                su.ass_id,
                su.user_id,
                su.score,
                su.created_at,
                a.title,
                u.fullname AS student_name
            FROM score_user su
            LEFT JOIN assignment a 
                ON su.ass_id = a.ass_id
            LEFT JOIN users u
                ON su.user_id = u.user_id
            WHERE su.deleted_at IS NULL
            ORDER BY su.created_at DESC;
        `);

        const students = {};

        rows.forEach(r => {

            if (!students[r.user_id]) {
                students[r.user_id] = {
                    name: r.student_name,
                    scores: {}
                };
            }

            students[r.user_id].scores[`c${r.ass_id}`] = r.score;

        });

        res.json(Object.values(students));

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }
});


// ---------------------- GET คะแนนคนเดียว ----------------------
router.get('/:id', async (req, res) => {
    try {

        const [rows] = await pool.query(
            `SELECT *
             FROM score_user
             WHERE score_user_id = ?
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


// ---------------------- POST ให้คะแนน ----------------------
router.post('/', async (req, res) => {
    try {

        const { ass_id, user_id, score } = req.body;

        if (!ass_id || !user_id || score === undefined) {
            return res.status(400).json({ message: 'ass_id, user_id, score required' });
        }

        const [result] = await pool.query(
            `INSERT INTO score_user (ass_id, user_id, score)
             VALUES (?, ?, ?)`,
            [ass_id, user_id, score]
        );

        res.status(201).json({
            score_user_id: result.insertId,
            ass_id,
            user_id,
            score
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
    }
});


// ---------------------- PUT แก้คะแนน ----------------------
router.put('/:id', async (req, res) => {
    try {

        const { score = null } = req.body;
        const id = req.params.id;

        const [result] = await pool.query(
            `UPDATE score_user
             SET score = COALESCE(?, score),
                 updated_at = NOW()
             WHERE score_user_id = ?`,
            [score, id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json({
            message: 'Updated',
            score_user_id: id
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});


// ---------------------- DELETE คะแนน ----------------------
router.delete('/:id', async (req, res) => {
    try {

        const id = req.params.id;

        const [result] = await pool.query(
            `UPDATE score_user
             SET deleted_at = NOW()
             WHERE score_user_id = ?
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
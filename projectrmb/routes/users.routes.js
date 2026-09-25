const express = require('express');
const router = express.Router();
const { pool } = require('../db');


// ---------------------- GET users ทั้งหมด ----------------------
router.get('/', async (_req, res) => {

    try {

        const [rows] = await pool.query(
            `SELECT user_id, username, fullname, email, dob, role_role_id, student_code, created_at
             FROM users
             WHERE deleted_at IS NULL
             ORDER BY created_at DESC`
        );

        res.json(rows);

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }

});

router.get('/student', async (_req, res) => {

    try {

        const [rows] = await pool.query(
            `SELECT user_id, username, fullname, email, dob, role_role_id, student_code, created_at
             FROM users
             WHERE deleted_at IS NULL and role_role_id = 2
             ORDER BY created_at DESC`
        );

        res.json(rows);

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }

});

router.get('/teacher', async (_req, res) => {

    try {

        const [rows] = await pool.query(
            `SELECT user_id, username, fullname, email, dob, role_role_id, student_code, created_at
             FROM users
             WHERE deleted_at IS NULL  and role_role_id = 1
             ORDER BY created_at DESC`
        );

        res.json(rows);

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }

});


// ---------------------- GET user คนเดียว ----------------------
router.get('/:id', async (req, res) => {

    try {

        const [rows] = await pool.query(
            `SELECT user_id, username, fullname, email, dob, role_role_id, student_code, created_at
             FROM users
             WHERE user_id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(rows[0]);

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }

});


// ---------------------- POST สร้าง user ----------------------
router.post('/', async (req, res) => {

    try {

        const { username, password, fullname, email, dob, role_role_id, student_code } = req.body;

        if (!username || !password || !fullname || !email) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const [result] = await pool.query(
            `INSERT INTO users
            (username, password, fullname, email, dob, role_role_id, student_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, password, fullname, email, dob || null, role_role_id || 1, student_code || null]
        );

        res.status(201).json({
            user_id: result.insertId,
            username,
            fullname,
            email,
            student_code
        });

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }

});


// ---------------------- PUT แก้ user ----------------------
router.put('/:id', async (req, res) => {

    try {

        const {
            username = null,
            fullname = null,
            email = null,
            dob = null,
            student_code = null
        } = req.body;

        const id = req.params.id;

        const [result] = await pool.query(
            `UPDATE users
             SET username = COALESCE(?, username),
                 fullname = COALESCE(?, fullname),
                 email = COALESCE(?, email),
                 dob = COALESCE(?, dob),
                 student_code = COALESCE(?, student_code),
                 updated_at = NOW()
             WHERE user_id = ?`,
            [username, fullname, email, dob, student_code, id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'User updated'
        });

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }

});


// ---------------------- DELETE user (soft delete) ----------------------
router.delete('/:id', async (req, res) => {

    try {

        const id = req.params.id;

        const [result] = await pool.query(
            `UPDATE users
             SET deleted_at = NOW()
             WHERE user_id = ?
             AND deleted_at IS NULL`,
            [id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'User not found or already deleted' });
        }

        res.json({ message: 'User deleted' });

    } catch (e) {

        console.error(e);
        res.status(500).json({ message: 'Server error' });

    }

});

module.exports = router;
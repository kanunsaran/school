const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const SELECT_JOINED = `
  SELECT r.result_id, r.user_user_id, u.fullname,
         r.type_type_id, t.type_code, t.type_name,
         r.result_code, r.test_date,
         r.recommended_faculty_id, f.faculty_name, f.university_name
  FROM user_type_result r
  JOIN users u ON u.user_id = r.user_user_id
  LEFT JOIN types t ON t.type_id = r.type_type_id
  LEFT JOIN faculty f ON f.faculty_id = r.recommended_faculty_id
`;

// ---------------------- GET ทั้งหมด (join ชื่อ type/faculty มาด้วย) ----------------------
router.get('/', async (req, res) => {
  try {
    const { user_user_id } = req.query;
    const conditions = ['r.deleted_at IS NULL'];
    const params = [];
    if (user_user_id) { conditions.push('r.user_user_id = ?'); params.push(user_user_id); }

    const [rows] = await pool.query(
      `${SELECT_JOINED} WHERE ${conditions.join(' AND ')} ORDER BY r.result_id DESC`,
      params
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET ของ user คนเดียว (แทน /me เดิมที่ต้องใช้ JWT) ----------------------
router.get('/user/:user_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${SELECT_JOINED} WHERE r.user_user_id = ? AND r.deleted_at IS NULL ORDER BY r.result_id DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST ----------------------
router.post('/', async (req, res) => {
  try {
    const { user_user_id, type_type_id, result_code, test_date, recommended_faculty_id } = req.body;

    if (!user_user_id || !type_type_id) {
      return res.status(400).json({ message: 'user_user_id และ type_type_id จำเป็น' });
    }

    const [result] = await pool.query(`
      INSERT INTO user_type_result
      (user_user_id, type_type_id, result_code, test_date, recommended_faculty_id)
      VALUES (?, ?, ?, ?, ?)
    `, [user_user_id, type_type_id, result_code || null, test_date || new Date(), recommended_faculty_id || null]);

    res.status(201).json({
      result_id: result.insertId,
      user_user_id,
      type_type_id,
      result_code,
      test_date,
      recommended_faculty_id
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// ---------------------- PUT ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { result_code = null, recommended_faculty_id = null } = req.body;

    const [result] = await pool.query(`
      UPDATE user_type_result
      SET result_code = COALESCE(?, result_code),
          recommended_faculty_id = COALESCE(?, recommended_faculty_id)
      WHERE result_id = ? AND deleted_at IS NULL
    `, [result_code, recommended_faculty_id, req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE (Soft) ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(`
      UPDATE user_type_result
      SET deleted_at = NOW()
      WHERE result_id = ?
    `, [req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ message: 'Not found' });

    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

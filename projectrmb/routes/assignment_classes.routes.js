const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /assignment_classes — คืนความสัมพันธ์งาน<->ห้องเรียนทั้งหมด
// filter ได้ด้วย ?ass_id= หรือ ?grade_id=
router.get('/', async (req, res) => {
  try {
    const { ass_id, grade_id } = req.query;

    const conditions = [];
    const params = [];
    if (ass_id) { conditions.push('ass_id = ?'); params.push(ass_id); }
    if (grade_id) { conditions.push('grade_id = ?'); params.push(grade_id); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT id, ass_id, grade_id FROM assignment_classes ${where} ORDER BY id`,
      params
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

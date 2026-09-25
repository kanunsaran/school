const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ---------------------- GET กลุ่มทั้งหมด (filter ได้ด้วย ?assignment_ass_id=) ----------------------
router.get('/', async (req, res) => {
  try {
    const { assignment_ass_id } = req.query;

    const conditions = [];
    const params = [];
    if (assignment_ass_id) { conditions.push('g.assignment_ass_id = ?'); params.push(assignment_ass_id); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [groups] = await pool.query(
      `SELECT g.group_id, g.assignment_ass_id, g.group_name, g.created_at
       FROM submission_groups g
       ${where}
       ORDER BY g.group_id DESC`,
      params
    );

    if (!groups.length) return res.json([]);

    const groupIds = groups.map((g) => g.group_id);
    const [members] = await pool.query(
      `SELECT m.group_id, m.user_user_id, u.fullname
       FROM submission_group_members m
       JOIN users u ON u.user_id = m.user_user_id
       WHERE m.group_id IN (?)`,
      [groupIds]
    );

    const membersByGroup = {};
    members.forEach((m) => {
      if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = [];
      membersByGroup[m.group_id].push({ user_user_id: m.user_user_id, fullname: m.fullname });
    });

    res.json(groups.map((g) => ({ ...g, members: membersByGroup[g.group_id] || [] })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- GET กลุ่มเดียว ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT group_id, assignment_ass_id, group_name, created_at
       FROM submission_groups
       WHERE group_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });

    const [members] = await pool.query(
      `SELECT m.user_user_id, u.fullname
       FROM submission_group_members m
       JOIN users u ON u.user_id = m.user_user_id
       WHERE m.group_id = ?`,
      [req.params.id]
    );

    res.json({ ...rows[0], members });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST สร้างกลุ่มใหม่ (พร้อมสมาชิกในคำขอเดียว) ----------------------
router.post('/', async (req, res) => {
  try {
    const { assignment_ass_id, group_name, member_user_ids } = req.body;

    if (!assignment_ass_id || !group_name) {
      return res.status(400).json({ message: 'assignment_ass_id และ group_name จำเป็น' });
    }

    const [result] = await pool.query(
      `INSERT INTO submission_groups (assignment_ass_id, group_name) VALUES (?, ?)`,
      [assignment_ass_id, group_name]
    );
    const groupId = result.insertId;

    const memberIds = Array.isArray(member_user_ids) ? member_user_ids : [];
    for (const userId of memberIds) {
      await pool.query(
        `INSERT INTO submission_group_members (group_id, user_user_id) VALUES (?, ?)`,
        [groupId, userId]
      );
    }

    res.status(201).json({
      group_id: groupId,
      assignment_ass_id,
      group_name,
      members: memberIds,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไขชื่อกลุ่ม/สมาชิก ----------------------
router.put('/:id', async (req, res) => {
  try {
    const { group_name = null, member_user_ids = null } = req.body;
    const id = req.params.id;

    if (group_name) {
      await pool.query(`UPDATE submission_groups SET group_name = ? WHERE group_id = ?`, [group_name, id]);
    }

    if (Array.isArray(member_user_ids)) {
      await pool.query(`DELETE FROM submission_group_members WHERE group_id = ?`, [id]);
      for (const userId of member_user_ids) {
        await pool.query(
          `INSERT INTO submission_group_members (group_id, user_user_id) VALUES (?, ?)`,
          [id, userId]
        );
      }
    }

    res.json({ message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- DELETE ลบกลุ่ม ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM submission_groups WHERE group_id = ?`, [req.params.id]);

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

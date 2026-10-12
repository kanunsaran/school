const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// นักเรียนตั้งเป้าหมายได้หลายข้อ เรียงลำดับด้วย priority (1 = เป้าหมายหลัก) — เพิ่มคอลัมน์ให้อัตโนมัติถ้ายังไม่มี
const MAX_GOALS = 3;
pool
  .query('ALTER TABLE goal ADD COLUMN IF NOT EXISTS priority TINYINT NULL')
  .catch((e) => console.error('add goal.priority failed:', e.message));

// เรียงเป้าหมายของนักเรียนใหม่เป็น 1..n (ให้ goal ที่ระบุอยู่ตำแหน่ง moveToPos ถ้ามี)
async function renumber(userId, moveId = null, moveToPos = null) {
  const [rows] = await pool.query(
    'SELECT goal_id FROM goal WHERE user_user_id = ? AND deleted_at IS NULL ORDER BY COALESCE(priority, 99), created_at, goal_id',
    [userId]
  );
  let ids = rows.map((r) => r.goal_id);
  if (moveId != null && moveToPos != null) {
    ids = ids.filter((id) => String(id) !== String(moveId));
    ids.splice(Math.max(0, Math.min(ids.length, moveToPos - 1)), 0, Number(moveId));
  }
  await Promise.all(ids.map((id, i) => pool.query('UPDATE goal SET priority = ? WHERE goal_id = ?', [i + 1, id])));
}

// เจ้าของเป้าหมายหรือครูเท่านั้นที่แก้/ลบได้ — คืนแถวเป้าหมาย หรือส่ง error กลับไปแล้ว
async function ownGoal(req, res) {
  const [rows] = await pool.query('SELECT goal_id, user_user_id FROM goal WHERE goal_id = ? AND deleted_at IS NULL', [req.params.id]);
  if (!rows.length) {
    res.status(404).json({ message: 'Not found' });
    return null;
  }
  if (req.user.role !== 'teacher' && String(rows[0].user_user_id) !== String(req.user.id)) {
    res.status(403).json({ message: 'แก้ไขได้เฉพาะเป้าหมายของตัวเอง' });
    return null;
  }
  return rows[0];
}

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT goal_id, goal_text, faculty_name, career_field, user_user_id, priority, created_at, updated_at
       FROM goal
       WHERE deleted_at IS NULL
       ORDER BY user_user_id, COALESCE(priority, 99), goal_id DESC`
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
      `SELECT goal_id, goal_text, faculty_name, career_field, user_user_id, priority, created_at, updated_at
       FROM goal
       WHERE goal_id = ? AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เพิ่มเป้าหมาย ----------------------
router.post('/', authRequired, async (req, res) => {
  try {
    const clean = (v) => (typeof v === 'string' ? v.trim() : '');
    const goal_text = clean(req.body.goal_text);
    const faculty_name = clean(req.body.faculty_name);
    const career_field = clean(req.body.career_field);
    const userId = req.user.id;

    // ต้องมีคณะหรืออาชีพอย่างน้อย 1 ช่อง (เหตุผล/แรงบันดาลใจไม่บังคับ)
    if (!faculty_name && !career_field) {
      return res.status(400).json({ message: 'กรอกคณะที่สนใจ หรืออาชีพเป้าหมาย อย่างน้อย 1 ช่อง' });
    }

    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM goal WHERE user_user_id = ? AND deleted_at IS NULL', [userId]);
    if (n >= MAX_GOALS) {
      return res.status(400).json({ message: `ตั้งเป้าหมายได้สูงสุด ${MAX_GOALS} ข้อ — ลบหรือแก้ไขเป้าหมายเดิมก่อน` });
    }

    const [result] = await pool.query(
      `INSERT INTO goal (goal_text, faculty_name, career_field, user_user_id, priority)
       VALUES (?, ?, ?, ?, ?)`,
      [goal_text || null, faculty_name || null, career_field || null, userId, n + 1]
    );
    await renumber(userId);

    res.status(201).json({
      goal_id: result.insertId,
      goal_text,
      faculty_name,
      career_field,
      user_user_id: userId,
      priority: n + 1,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไขเป้าหมาย ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { goal_text = null, faculty_name = null, career_field = null, priority = null } = req.body;
    const id = req.params.id;

    // นักเรียนแก้ได้เฉพาะเป้าหมายของตัวเอง (ครูแก้ได้)
    const own = await ownGoal(req, res);
    if (!own) return;
    // เปลี่ยนลำดับ (เช่น ตั้งเป็นเป้าหมายหลัก = 1) แล้วเรียงข้ออื่นใหม่
    if (priority != null) {
      await renumber(own.user_user_id, id, Number(priority));
      if (goal_text == null && faculty_name == null && career_field == null) return res.json({ message: 'Updated' });
    }

    const [result] = await pool.query(
      `UPDATE goal
       SET goal_text = COALESCE(?, goal_text),
           faculty_name = COALESCE(?, faculty_name),
           career_field = COALESCE(?, career_field)
       WHERE goal_id = ? AND deleted_at IS NULL`,
      [goal_text, faculty_name, career_field, id]
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

// ---------------------- DELETE (Soft Delete) ----------------------
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const own = await ownGoal(req, res);
    if (!own) return;

    const [result] = await pool.query(
      `UPDATE goal
       SET deleted_at = NOW()
       WHERE goal_id = ? AND deleted_at IS NULL`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Not found or already deleted' });
    }

    await renumber(own.user_user_id);
    res.json({ message: 'Soft deleted' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

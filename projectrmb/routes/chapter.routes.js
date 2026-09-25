const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// ---------------------- GET ทั้งหมด ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT chapter_id, title, description, class_class_id FROM chapter ORDER BY chapter_id DESC'
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
      'SELECT chapter_id, title, description, class_class_id FROM chapter WHERE chapter_id = ?',
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
    const { title, description, class_class_id } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO chapter (title, description, class_class_id)
       VALUES (?, ?, ?)`,
      [title, description, class_class_id]
    );

    res.status(201).json({
      chapter_id: result.insertId,
      title,
      description,
      class_class_id
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// ---------------------- PUT แก้ไข ----------------------
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { title, description, class_class_id } = req.body;
    const id = req.params.id;

    const [result] = await pool.query(
      `UPDATE chapter
       SET 
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         class_class_id = COALESCE(?, class_class_id)
       WHERE chapter_id = ?`,
      [title, description, class_class_id, id]
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

// ---------------------- DELETE ----------------------
router.delete('/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM chapter WHERE chapter_id = ?',
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

router.get('/chapter/:chapterId', async (req,res)=>{
  try{

    const [rows] = await pool.query(
      `SELECT *
       FROM assignment
       WHERE chapter_chapter_id = ?`,
      [req.params.chapterId]
    )

    res.json(rows)

  }catch(err){
    console.log(err)
    res.status(500).json({message:'server error'})
  }
})

// GET: ดึงหัวข้อทั้งหมด
router.get('/chapter', authRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT chapter_id, title, description FROM chapter ORDER BY chapter_id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/chapter', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const [result] = await pool.query(
      `INSERT INTO chapter (title, description) VALUES (?, ?)`,
      [title, description || '']
    );

    res.status(201).json({
      chapter_id: result.insertId,
      title,
      description: description || ''
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;

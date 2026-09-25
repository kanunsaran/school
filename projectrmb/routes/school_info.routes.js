const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');

// รูปสีประจำโรงเรียน (แทนการเลือกจาก color picker ที่สีเพี้ยนจากของจริง) — อัปโหลดได้สูงสุด 3 รูป ตามช่องสีที่ 0/1/2
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/school_info'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '');
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });
const colorImageFields = [0, 1, 2].map((i) => ({ name: `color_image_${i}`, maxCount: 1 }));

function parseRow(row) {
  if (!row) return null;
  const parseJSON = (v, fallback) => {
    try {
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    ...row,
    phones: parseJSON(row.phones, []),
    emails: parseJSON(row.emails, []),
    colors: parseJSON(row.colors, []),
  };
}

// ---------------------- GET ข้อมูลโรงเรียน (สาธารณะ — นักเรียนดูได้) ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM school_info WHERE id = 1`);
    res.json(parseRow(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- PUT แก้ไขข้อมูลโรงเรียน (เฉพาะครู) ----------------------
router.put('/', authRequired, requireRole('teacher'), upload.fields(colorImageFields), async (req, res) => {
  try {
    const {
      school_name_th = null, school_name_en = null, subtitle = null, description = null, address = null,
      phones = null, emails = null, website_url = null, facebook_url = null,
      motto_pali = null, motto_translation = null, slogan = null, colors = null,
    } = req.body;

    // colors ส่งมาเป็น JSON string [{name, image_url}, ...] (image_url เดิม ถ้าช่องนั้นไม่ได้อัปโหลดรูปใหม่)
    // ไฟล์ใหม่ที่แนบมาด้วย (color_image_0/1/2) จะทับ image_url ของช่องนั้นตาม index
    let colorsParsed = null;
    if (colors) {
      try {
        colorsParsed = JSON.parse(colors);
        colorsParsed.forEach((c, i) => {
          const uploaded = req.files?.[`color_image_${i}`]?.[0];
          if (uploaded) c.image_url = `/uploads/school_info/${uploaded.filename}`;
        });
      } catch {
        colorsParsed = null;
      }
    }

    await pool.query(
      `UPDATE school_info
       SET school_name_th = COALESCE(?, school_name_th),
           school_name_en = COALESCE(?, school_name_en),
           subtitle = COALESCE(?, subtitle),
           description = COALESCE(?, description),
           address = COALESCE(?, address),
           phones = COALESCE(?, phones),
           emails = COALESCE(?, emails),
           website_url = COALESCE(?, website_url),
           facebook_url = COALESCE(?, facebook_url),
           motto_pali = COALESCE(?, motto_pali),
           motto_translation = COALESCE(?, motto_translation),
           slogan = COALESCE(?, slogan),
           colors = COALESCE(?, colors),
           updated_by_user_id = ?
       WHERE id = 1`,
      [
        school_name_th, school_name_en, subtitle, description, address,
        phones ? JSON.stringify(JSON.parse(phones)) : null,
        emails ? JSON.stringify(JSON.parse(emails)) : null,
        website_url, facebook_url, motto_pali, motto_translation, slogan,
        colorsParsed ? JSON.stringify(colorsParsed) : null,
        req.user.id,
      ]
    );

    const [rows] = await pool.query(`SELECT * FROM school_info WHERE id = 1`);
    res.json(parseRow(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;

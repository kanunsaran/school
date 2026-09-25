// const express = require('express');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { pool } = require('../db');
// const router = express.Router();

// //  สมัครสมาชิก
// router.post('/register', async (req, res) => {
//   try {
//     const { name, email, password, role = 'user' } = req.body;

//     const hash = await bcrypt.hash(password, 10);

//     const [result] = await pool.query(
//       'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
//       [name, email, hash, role]
//     );

//     res.status(201).json({ message: 'Registered', id: result.insertId });
//   } catch (err) {
//     res.status(400).json({ message: 'Email already exists' });
//   }
// });

// //  ล็อกอิน รับ token
// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
//   if (!rows.length) return res.status(404).json({ message: 'Email not found' });

//   const user = rows[0];

//   const ok = await bcrypt.compare(password, user.password);
//   if (!ok) return res.status(401).json({ message: 'Invalid password' });

//   const token = jwt.sign(
//     { id: user.id, role: user.role, email: user.email },
//     process.env.JWT_SECRET || 'mysecret',
//     { expiresIn: '1d' }
//   );

//   await pool.query('INSERT INTO tokens (user_id, token) VALUES (?, ?)', [user.id, token]);

//   res.json({ message: 'Logged in', token });
// });

// //  Logout
// router.post('/logout', async (req, res) => {
//   const auth = req.headers.authorization;
//   if (!auth?.startsWith('Bearer '))
//     return res.status(401).json({ message: 'No token provided' });

//   const token = auth.split(' ')[1];
//   await pool.query('DELETE FROM tokens WHERE token = ?', [token]);

//   res.json({ message: 'Logged out' });
// });

// module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { pool, withTransaction } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');
const router = express.Router();

// ------------------------------
//   สมัครสมาชิก (Register)
// ------------------------------
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullname, email, dob, role, role_role_id } = req.body;

    // เดิม field นี้อ่านแค่ role_role_id (ตัวเลข) เท่านั้น ถ้า frontend ส่ง role เป็น string
    // (เช่น "student"/"teacher") มาแทน จะถูกเพิกเฉยเงียบๆ แล้ว fallback เป็น teacher เสมอ
    let roleId = role_role_id;
    if (!roleId) {
      roleId = role === 'teacher' ? 1 : 2; // ไม่ระบุ = ค่าเริ่มต้นเป็นนักเรียน
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (username, password, fullname, email, dob, role_role_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hash, fullname, email, dob, roleId]
    );

    res.status(201).json({ 
      message: 'Registered',
      id: result.insertId
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Email or Username already exists' });
  }
});

// ------------------------------
//   ล็อกอิน (Login) → ส่ง token
// ------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? ',
    [email]
  );

  if (!rows.length)
    return res.status(404).json({ message: 'Username not found' });

  const user = rows[0];

  const ok = await bcrypt.compare(password, user.password);
  if (!ok)
    return res.status(401).json({ message: 'Invalid password' });

  // ดึง role_name จากตาราง roles
  const [role] = await pool.query(
    'SELECT role_name FROM roles WHERE role_id = ?',
    [user.role_role_id]
  );

  const token = jwt.sign(
    {
      id: user.user_id,
      email: user.email,
      role: role[0]?.role_name || "unknown"
    },
    process.env.JWT_SECRET || 'mysecret',
    { expiresIn: '1d' }
  );

  // เก็บ token (แล้วแต่คุณว่าจะใช้ตาราง tokens หรือไม่)
  await pool.query(
    'INSERT INTO tokens (user_id, token) VALUES (?, ?)',
    [user.user_id, token]
  );

  res.json({
    message: 'Logged in',
    id: user.user_id,
    user_id: user.user_id,
    fullname: user.fullname,
    email: user.email,
    role: role[0]?.role_name,
    token
  });
});

// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   const [rows] = await pool.query(
//     'SELECT * FROM users WHERE email = ?',
//     [email]
//   );

//   if (!rows.length)
//     return res.status(404).json({ message: 'Email not found' });

//   const user = rows[0];

//   const ok = await bcrypt.compare(password, user.password);
//   if (!ok)
//     return res.status(401).json({ message: 'Invalid password' });

//   const roleName =
//     user.role_role_id === 1 ? "teacher" :
//     user.role_role_id === 2 ? "student" :
//     "unknown";

//   const token = jwt.sign(
//     {
//       id: user.user_id,
//       username: user.username,
//       role: roleName
//     },
//     process.env.JWT_SECRET || 'mysecret',
//     { expiresIn: '1d' }
//   );

//   res.json({ token });
// });

// ------------------------------
//   ออกจากระบบ (Logout)
// ------------------------------
router.post('/logout', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT user_id, email, password, role_role_id FROM users WHERE email = ?',
      [email.trim()]
    );

    if (rows.length === 0)
      return res.status(401).json({ message: 'User not found' });

    const user = rows[0];

    // ✅ compare bcrypt
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ message: 'Wrong password' });

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role_role_id },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// ── Google Login ──────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { email, name, picture } = req.body;

    if (!email) return res.status(400).json({ message: 'ข้อมูลไม่ครบ' });

    // ค้นหา user จาก email
    const [rows] = await pool.query(
      'SELECT users.*, roles.role_name FROM users JOIN roles ON users.role_role_id = roles.role_id WHERE email = ?',
      [email]
    );

    let user, roleName;

    if (rows.length > 0) {
      // มี user อยู่แล้ว → login ได้เลย
      user = rows[0];
      roleName = user.role_name;
    } else {
      // ยังไม่มี user → สร้างใหม่ (role_role_id = 2 = student)
      const username = email.split('@')[0];
      const [result] = await pool.query(
        `INSERT INTO users (username, password, fullname, email, role_role_id)
         VALUES (?, ?, ?, ?, ?)`,
        [username, '', name, email, 2]
      );
      user = { user_id: result.insertId, fullname: name, email };
      roleName = 'student';
    }

    // สร้าง JWT
    const token = jwt.sign(
      { id: user.user_id, email, role: roleName },
      process.env.JWT_SECRET || 'mysecret',
      { expiresIn: '1d' }
    );

    // เก็บ token ในตาราง tokens
    await pool.query(
      'INSERT INTO tokens (user_id, token) VALUES (?, ?)',
      [user.user_id, token]
    );

    res.json({
      message: 'Google login success',
      id: user.user_id,
      user_id: user.user_id,
      fullname: user.fullname,
      email: user.email || email,
      role: roleName,
      token
    });

  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

// ------------------------------
//   นำเข้านักเรียนเป็นชุด (Bulk import) — ครูเท่านั้น
//   body: { students: [{ first_name, last_name, fullname, email, password, seat_no,
//                         grade_id, grade_name, section, is_new_class }] }
//   grade_id ใช้เมื่อเลือกห้องที่มีอยู่แล้ว, ถ้า grade_id ว่างหรือ is_new_class=true
//   จะ find-or-create ห้องจาก grade_name+section แทน (กันสร้างซ้ำภายใน batch เดียวกันด้วย gradeCache)
// ------------------------------
router.post('/students/import', authRequired, requireRole('teacher'), async (req, res) => {
  const { students } = req.body;

  if (!Array.isArray(students) || !students.length) {
    return res.status(400).json({ message: 'students ต้องเป็น array และมีอย่างน้อย 1 แถว' });
  }

  const results = [];
  const gradeCache = new Map(); // กันสร้างห้องซ้ำเมื่อหลายแถวใน batch นี้อ้างถึงห้องใหม่ห้องเดียวกัน

  for (const row of students) {
    const {
      first_name, last_name, fullname, email, password, seat_no,
      grade_id, grade_name, section, is_new_class,
    } = row || {};

    if (!first_name || !last_name || !fullname || !email || !password) {
      results.push({ email: email || null, success: false, message: 'first_name, last_name, fullname, email, password จำเป็น' });
      continue;
    }
    if (!grade_id && (!grade_name || !section)) {
      results.push({ email, success: false, message: 'ต้องระบุ grade_id หรือ grade_name+section' });
      continue;
    }

    try {
      const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
      if (existing.length) {
        results.push({ email, success: false, message: 'อีเมลนี้มีผู้ใช้อยู่แล้ว' });
        continue;
      }

      let grade;
      if (grade_id && !is_new_class) {
        const [grades] = await pool.query(
          'SELECT idgrade, grade_name, section FROM grade WHERE idgrade = ?',
          [grade_id]
        );
        if (!grades.length) {
          results.push({ email, success: false, message: 'grade_id ไม่ถูกต้อง' });
          continue;
        }
        grade = grades[0];
      } else {
        const cacheKey = `${grade_name}::${section}`;
        if (gradeCache.has(cacheKey)) {
          grade = gradeCache.get(cacheKey);
        } else {
          const [matched] = await pool.query(
            'SELECT idgrade, grade_name, section FROM grade WHERE grade_name = ? AND section = ? AND deleted_at IS NULL',
            [grade_name, section]
          );
          if (matched.length) {
            grade = matched[0];
          } else {
            const [created] = await pool.query(
              'INSERT INTO grade (grade_name, section, teacher_user_id) VALUES (?, ?, ?)',
              [grade_name, section, req.user.id]
            );
            grade = { idgrade: created.insertId, grade_name, section };
          }
          gradeCache.set(cacheKey, grade);
        }
      }

      const userId = await withTransaction(async (conn) => {
        const hash = await bcrypt.hash(password, 10);

        const [userResult] = await conn.query(
          `INSERT INTO users (username, password, fullname, email, role_role_id)
           VALUES (?, ?, ?, ?, 2)`,
          [first_name, hash, fullname, email]
        );
        const newUserId = userResult.insertId;

        await conn.query(
          `INSERT INTO enroll (enroll_date, grade_idgrade, user_user_id, seat_no)
           VALUES (CURDATE(), ?, ?, ?)`,
          [grade.idgrade, newUserId, seat_no || null]
        );

        const formData = {
          meta: {
            classroom: `ม.${grade.grade_name}`,
            room: grade.section,
            roll_number: seat_no != null ? String(seat_no) : null,
          },
          personal: {
            first_name,
            last_name,
          },
        };

        await conn.query(
          `INSERT INTO student_general_info (student_user_id, form_data)
           VALUES (?, ?)`,
          [newUserId, JSON.stringify(formData)]
        );

        return newUserId;
      });

      results.push({ email, success: true, user_id: userId, grade_id: grade.idgrade, created_new_class: !grade_id || !!is_new_class });
    } catch (e) {
      console.error(e);
      results.push({ email, success: false, message: e.message || 'Server error' });
    }
  }

  res.status(201).json({ results });
});

module.exports = router;

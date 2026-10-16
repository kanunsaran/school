const express = require('express');
const axios = require('axios');
const router = express.Router();
const { pool } = require('../db');
const { authRequired, requireRole } = require('../middlewares/auth');
const { getAccount, oauthConfigured, SEND_SCOPE, accessCache, encrypt } = require('../utils/gmailSender');
const { decrypt } = require('../utils/tokenCrypto');

// การเชื่อมต่อ Gmail ของครู (ใช้ส่งอีเมลแจ้งนัดหมายจากอีเมลของครูเอง) — ครูจัดการได้เฉพาะของตัวเอง

const myEmail = async (userId) => {
  const [rows] = await pool.query('SELECT email FROM users WHERE user_id = ?', [userId]);
  return String(rows[0]?.email || '').trim();
};

// ---------------------- GET สถานะการเชื่อมต่อของครูที่ล็อกอิน ----------------------
router.get('/', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const account = await getAccount(req.user.id);
    res.json({
      available: oauthConfigured(),
      connected: Boolean(account),
      email: account?.email || null,
      system_email: (await myEmail(req.user.id)) || null,
      connected_at: account?.updated_at || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------- POST เชื่อมต่อ (รับ authorization code จากปุ่ม Google) ----------------------
router.post('/google', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    if (!oauthConfigured()) return res.status(503).json({ message: 'ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อ Gmail (GOOGLE_CLIENT_SECRET)' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'code จำเป็น' });

    let tokens;
    try {
      ({ data: tokens } = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: 'postmessage',
          grant_type: 'authorization_code',
        }),
        { timeout: 10000 }
      ));
    } catch (e) {
      console.error('gmail connect token exchange failed:', JSON.stringify(e.response?.data || e.message).slice(0, 300));
      return res.status(400).json({ message: 'เชื่อมต่อกับ Google ไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }
    if (!String(tokens.scope || '').split(' ').includes(SEND_SCOPE)) {
      return res.status(400).json({ message: 'ยังไม่ได้อนุญาตให้ส่งอีเมล — กดเชื่อมต่อใหม่และติ๊กอนุญาต "ส่งอีเมลในนามคุณ"' });
    }

    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      timeout: 10000,
    });
    const googleEmail = String(profile.email || '').trim();
    const systemEmail = await myEmail(req.user.id);
    // ต้องเป็นอีเมลเดียวกับบัญชีครูในระบบ (กันเชื่อม Gmail คนอื่น)
    if (!systemEmail) return res.status(400).json({ message: 'บัญชีครูของคุณยังไม่มีอีเมลในระบบ — ติดต่อผู้ดูแลระบบเพื่อเพิ่มอีเมลก่อน' });
    if (googleEmail.toLowerCase() !== systemEmail.toLowerCase()) {
      return res.status(400).json({ message: `บัญชี Google ที่เลือก (${googleEmail}) ไม่ตรงกับอีเมลของคุณในระบบ (${systemEmail})` });
    }

    let refreshEnc;
    if (tokens.refresh_token) refreshEnc = encrypt(tokens.refresh_token);
    else {
      const existing = await getAccount(req.user.id);
      if (!existing) {
        return res.status(400).json({
          message: 'Google ไม่ส่งสิทธิ์ระยะยาวมา — ไปที่ myaccount.google.com/permissions ลบสิทธิ์ของแอปนี้ แล้วกดเชื่อมต่อใหม่',
        });
      }
      refreshEnc = existing.refresh_token_enc;
    }
    await pool.query(
      `INSERT INTO teacher_mail_accounts (user_id, email, refresh_token_enc) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), refresh_token_enc = VALUES(refresh_token_enc), updated_at = NOW()`,
      [req.user.id, googleEmail, refreshEnc]
    );
    accessCache.set(req.user.id, { token: tokens.access_token, exp: Date.now() + (tokens.expires_in || 3600) * 1000 });
    res.json({ connected: true, email: googleEmail });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เชื่อมต่อ Gmail ไม่สำเร็จ' });
  }
});

// ---------------------- DELETE ยกเลิกการเชื่อมต่อ (เพิกถอนสิทธิ์ที่ Google ด้วย) ----------------------
router.delete('/', authRequired, requireRole('teacher'), async (req, res) => {
  try {
    const account = await getAccount(req.user.id);
    if (account) {
      await axios
        .post('https://oauth2.googleapis.com/revoke', new URLSearchParams({ token: decrypt(account.refresh_token_enc) }), { timeout: 10000 })
        .catch(() => {});
      await pool.query('DELETE FROM teacher_mail_accounts WHERE user_id = ?', [req.user.id]);
      accessCache.delete(req.user.id);
    }
    res.json({ connected: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

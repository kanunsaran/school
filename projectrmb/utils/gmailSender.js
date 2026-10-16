// ส่งอีเมลจาก Gmail ของครูแต่ละคน (Gmail API + OAuth ที่ครูกด "เชื่อมต่อ Gmail" ไว้)
// ต้องตั้ง GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET และเปิด Gmail API ในโปรเจกต์ Google Cloud เดียวกับปุ่มล็อกอิน Google
const axios = require('axios');
const MailComposer = require('nodemailer/lib/mail-composer');
const { pool } = require('../db');
const { encrypt, decrypt } = require('./tokenCrypto');

pool
  .query(
    `CREATE TABLE IF NOT EXISTS teacher_mail_accounts (
       user_id INT NOT NULL PRIMARY KEY,
       email VARCHAR(255) NOT NULL,
       refresh_token_enc TEXT NOT NULL,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     )`
  )
  .catch((e) => console.error('create teacher_mail_accounts failed:', e.message));

const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const oauthConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const accessCache = new Map(); // user_id → { token, exp }

async function getAccount(userId) {
  const [rows] = await pool.query('SELECT user_id, email, refresh_token_enc, updated_at FROM teacher_mail_accounts WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function accessTokenFor(account) {
  const cached = accessCache.get(account.user_id);
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  const { data } = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: decrypt(account.refresh_token_enc),
      grant_type: 'refresh_token',
    }),
    { timeout: 10000 }
  );
  accessCache.set(account.user_id, { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 });
  return data.access_token;
}

// ส่งจาก Gmail ของ userId — คืน null ถ้าครูยังไม่ได้เชื่อม (ให้ไปใช้ช่องทางอื่น)
async function sendFromTeacherGmail(userId, { to, subject, text, html, attachments, fromName }) {
  if (!oauthConfigured()) return null;
  const account = await getAccount(userId);
  if (!account) return null;
  if (!to) return { sent: false, reason: 'no_email' };
  const log = (where, e) => console.error(`gmail ${where} failed:`, e.response?.status, JSON.stringify(e.response?.data || e.message).slice(0, 300));
  const send = async () => {
    const token = await accessTokenFor(account);
    const raw = await new MailComposer({
      from: fromName ? { name: fromName, address: account.email } : account.email,
      to,
      subject,
      text,
      html,
      attachments,
    })
      .compile()
      .build();
    await axios.post(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      { raw: raw.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
    );
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await send();
      return { sent: true, to, via: 'gmail', from: account.email };
    } catch (e) {
      log(attempt ? 'send (retry)' : 'send', e);
      // ครูเพิกถอนสิทธิ์/สิทธิ์หมดอายุ (invalid_grant) → ลบการเชื่อมต่อ ให้ครูเชื่อมใหม่
      // (invalid_client = ตั้งค่า client secret ฝั่งเซิร์ฟเวอร์ผิด — ไม่ลบการเชื่อมต่อของครู)
      if (e.response?.data?.error === 'invalid_grant') {
        await pool.query('DELETE FROM teacher_mail_accounts WHERE user_id = ?', [userId]).catch(() => {});
        accessCache.delete(account.user_id);
        return { sent: false, reason: 'gmail_revoked', to };
      }
      // access token หมดอายุก่อนเวลา → ขอใหม่แล้วลองอีกครั้งเดียว
      if (e.response?.status === 401 && e.config?.url?.includes('gmail.googleapis.com') && attempt === 0) {
        accessCache.delete(account.user_id);
        continue;
      }
      return { sent: false, reason: 'send_failed', to };
    }
  }
  return { sent: false, reason: 'send_failed', to };
}

module.exports = { sendFromTeacherGmail, getAccount, oauthConfigured, SEND_SCOPE, accessCache, encrypt };

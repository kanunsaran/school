// เข้ารหัสข้อมูลลับก่อนเก็บลงฐานข้อมูล (AES-256-GCM) — กุญแจจาก MAIL_TOKEN_KEY (ไม่ตั้ง = ใช้ JWT_SECRET)
const crypto = require('crypto');

const key = () => crypto.createHash('sha256').update(String(process.env.MAIL_TOKEN_KEY || process.env.JWT_SECRET || '')).digest();

exports.encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
};

exports.decrypt = (packed) => {
  const [iv, tag, data] = String(packed).split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

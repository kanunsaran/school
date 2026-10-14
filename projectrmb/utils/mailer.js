// ส่งอีเมลผ่าน SMTP (nodemailer) — ตั้งค่าใน projectrmb/.env:
//   SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS, MAIL_FROM (ไม่ใส่ = ใช้ SMTP_USER)
//   APP_URL = ลิงก์หน้าเว็บที่แนบในอีเมล (ไม่ใส่ = ใช้ CORS_ORIGIN)
// ยังไม่ตั้งค่า → ไม่ส่ง แต่ระบบอื่นทำงานปกติ (คืน { sent: false, reason: 'not_configured' })
const nodemailer = require('nodemailer');

let transporter = null;
const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
};

const appUrl = () => (process.env.APP_URL || process.env.CORS_ORIGIN || '').split(',')[0].trim().replace(/\/$/, '');

async function sendMail({ to, subject, text, html, attachments }) {
  if (!configured()) return { sent: false, reason: 'not_configured' };
  if (!to) return { sent: false, reason: 'no_email' };
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || `"ระบบแนะแนว" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });
    return { sent: true, to };
  } catch (e) {
    console.error('sendMail failed:', e.message);
    return { sent: false, reason: 'send_failed', to };
  }
}

module.exports = { sendMail, mailConfigured: configured, appUrl };

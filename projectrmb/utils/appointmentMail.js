// อีเมลแจ้งนัดหมาย (สร้าง / เลื่อน / ยกเลิก) ถึงอีกฝ่ายของนัด + ไฟล์ปฏิทิน .ics ให้กดเพิ่มลงปฏิทินได้
// ครูสร้างนัด → ส่งถึงนักเรียน • นักเรียนสร้างนัด → ส่งถึงครู • ไม่ส่งหาคนที่เป็นผู้กระทำเอง
const { pool } = require('../db');
const { sendMail, appUrl } = require('./mailer');

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const thaiDate = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
};
const hhmm = (t) => String(t).slice(0, 5);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const icsText = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// เวลาในไฟล์ปฏิทินเป็น UTC (เวลาไทย − 7 ชม. ไทยไม่มีเวลาออมแสง) ใช้ได้ทุกโปรแกรมปฏิทิน • นัดละ 30 นาที
const utc = (ymd, minutes) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes - 7 * 60)).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
};
function buildIcs(a, kind) {
  const [h, m] = hhmm(a.time).split(':').map(Number);
  const start = utc(a.date, h * 60 + m);
  const end = utc(a.date, h * 60 + m + 30);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//guidance//appointment//TH',
    `METHOD:${kind === 'cancelled' ? 'CANCEL' : 'PUBLISH'}`,
    'BEGIN:VEVENT',
    `UID:appointment-${a.id}@guidance`,
    `SEQUENCE:${Math.floor(Date.now() / 1000)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsText(`นัดหมาย: ${a.note || 'พบครูแนะแนว'}`)}`,
    `DESCRIPTION:${icsText(`ครู ${a.teacherName} • นักเรียน ${a.studentName}`)}`,
    `STATUS:${kind === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

const TITLE = { created: 'นัดหมายใหม่', updated: 'เลื่อนนัดหมาย', cancelled: 'ยกเลิกนัดหมาย' };

// kind: created | updated | cancelled • actorId = ผู้ทำรายการ (ไม่ส่งหาตัวเอง)
async function notifyAppointment(appointmentId, kind, actorId) {
  try {
    const [rows] = await pool.query(
      `SELECT a.appointment_id AS id, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS date, a.appointment_time AS time, a.note,
              a.teacher_user_id, t.fullname AS teacherName, t.email AS teacherEmail,
              a.student_user_id, s.fullname AS studentName, s.email AS studentEmail
       FROM appointment a
       JOIN users t ON t.user_id = a.teacher_user_id
       JOIN users s ON s.user_id = a.student_user_id
       WHERE a.appointment_id = ?`,
      [appointmentId]
    );
    const a = rows[0];
    if (!a) return { sent: false, reason: 'not_found' };
    const toStudent = String(actorId) !== String(a.student_user_id);
    const to = toStudent ? a.studentEmail : a.teacherEmail;
    const toName = toStudent ? a.studentName : a.teacherName;
    const otherName = toStudent ? `ครู${a.teacherName}` : `นักเรียน ${a.studentName}`;
    const when = `${thaiDate(a.date)} เวลา ${hhmm(a.time)} น.`;
    const intro = {
      created: `${otherName} นัดหมายกับคุณ`,
      updated: `${otherName} เปลี่ยนวันหรือเวลานัดหมาย`,
      cancelled: `${otherName} ยกเลิกนัดหมาย`,
    }[kind];
    const link = appUrl() ? `${appUrl()}/${toStudent ? 'studentcalendar' : 'TeacherCalendar'}` : '';
    const subject = `${TITLE[kind]}: ${when}${a.note ? ` — ${a.note}` : ''}`;
    const text = [`สวัสดี ${toName}`, '', intro, `วันเวลา: ${when}`, a.note ? `เรื่อง: ${a.note}` : '', link ? `ดูในระบบ: ${link}` : '', '', 'อีเมลนี้ส่งอัตโนมัติจากระบบแนะแนว กรุณาอย่าตอบกลับ']
      .filter((x) => x !== '')
      .join('\n');
    const html = `<div style="font-family:Tahoma,sans-serif;font-size:15px;color:#222;line-height:1.6">
  <p>สวัสดี ${esc(toName)}</p>
  <p>${esc(intro)}</p>
  <table style="border-collapse:collapse;margin:8px 0">
    <tr><td style="padding:4px 12px 4px 0;color:#888">วันเวลา</td><td style="padding:4px 0"><b${kind === 'cancelled' ? ' style="text-decoration:line-through"' : ''}>${esc(when)}</b></td></tr>
    ${a.note ? `<tr><td style="padding:4px 12px 4px 0;color:#888">เรื่อง</td><td style="padding:4px 0">${esc(a.note)}</td></tr>` : ''}
    <tr><td style="padding:4px 12px 4px 0;color:#888">${toStudent ? 'ครู' : 'นักเรียน'}</td><td style="padding:4px 0">${esc(toStudent ? a.teacherName : a.studentName)}</td></tr>
  </table>
  ${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#ec4899;color:#fff;padding:8px 16px;border-radius:10px;text-decoration:none">ดูนัดหมายในระบบ</a></p>` : ''}
  ${kind !== 'cancelled' ? '<p style="color:#888;font-size:13px">แนบไฟล์ปฏิทิน (.ics) — เปิดเพื่อเพิ่มนัดหมายลงปฏิทินของคุณ</p>' : ''}
  <p style="color:#aaa;font-size:12px">อีเมลนี้ส่งอัตโนมัติจากระบบแนะแนว กรุณาอย่าตอบกลับ</p>
</div>`;
    // ผู้ส่งแสดงเป็นชื่อของฝ่ายที่นัด และตอบกลับถึงอีเมลของฝ่ายนั้นโดยตรง
    const sender = toStudent ? { name: `ครู${a.teacherName}`, email: a.teacherEmail } : { name: a.studentName, email: a.studentEmail };
    return await sendMail({
      to,
      fromName: `${sender.name} (ระบบแนะแนว)`,
      replyTo: sender.email || undefined,
      subject,
      text,
      html,
      attachments: [{ filename: 'appointment.ics', content: buildIcs(a, kind), contentType: `text/calendar; charset=utf-8; method=${kind === 'cancelled' ? 'CANCEL' : 'PUBLISH'}` }],
    });
  } catch (e) {
    console.error('notifyAppointment failed:', e.message);
    return { sent: false, reason: 'error' };
  }
}

module.exports = { notifyAppointment, buildIcs };

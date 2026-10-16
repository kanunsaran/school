// เปิดหน้าเขียนอีเมลใน Gmail ของครู (บัญชีตามอีเมลในระบบ — authuser) พร้อมข้อความแจ้งนัดหมาย
// ครูกด "ส่ง" เองใน Gmail ระบบไม่ได้เก็บรหัสผ่านอีเมลของใคร
// ข้อความต้องสั้น: บัญชีที่ล็อกอินผ่าน Microsoft (เช่น @kkumail.com) ส่งลิงก์ทั้งเส้นต่อไปหน้าล็อกอินของ Microsoft
// ถ้ายาวเกิน จะเจอ AADSTS90015 (query string too long) — อักษรไทยในลิงก์ยาวขึ้น ~9 เท่า
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const thaiDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
};
const hhmm = (t) => String(t).slice(0, 5);

// ลิงก์เขียนอีเมลใน Gmail: นักเรียนคนเดียว = ส่งถึง (to) • หลายคน = สำเนาลับ (bcc) เพื่อไม่เปิดเผยอีเมลของกันและกัน
export const gmailComposeLink = ({ from, to, subject, body }) => {
  const q = new URLSearchParams({ authuser: from, view: "cm", fs: "1", tf: "1", su: subject, body });
  if (to.length === 1) q.set("to", to[0]);
  else {
    q.set("to", from);
    q.set("bcc", to.join(","));
  }
  return `https://mail.google.com/mail/?${q}`;
};

// ข้อความอีเมลแจ้งนัดหมาย (สั้นที่สุดที่ยังครบ) kind: created | cancelled
export const appointmentEmail = ({ kind, teacherName, date, time, note, appUrl }) => {
  const when = `${thaiDate(date)} ${hhmm(time)} น.`;
  const subject = `${kind === "cancelled" ? "ยกเลิกนัด" : "นัดหมาย"} ${when}`;
  const body = [
    kind === "cancelled" ? `ครูขอยกเลิกนัดวันที่ ${when}` : `ครูนัดพบวันที่ ${when}`,
    note ? `เรื่อง: ${note.length > 80 ? `${note.slice(0, 80)}…` : note}` : null,
    appUrl ? `ดูนัดในระบบ: ${appUrl}/studentcalendar` : null,
    teacherName ? `ครู${teacherName}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, body };
};

// สำรอง: เปิดโปรแกรมอีเมลในเครื่อง (เช่น Outlook) — ใช้ข้อความเดียวกัน
export const mailtoLink = ({ to, subject, body }) =>
  `mailto:${to.length === 1 ? encodeURIComponent(to[0]) : ""}?${new URLSearchParams({ ...(to.length > 1 ? { bcc: to.join(",") } : {}), subject, body })
    .toString()
    .replace(/\+/g, "%20")}`;

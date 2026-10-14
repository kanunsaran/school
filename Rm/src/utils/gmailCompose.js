// เปิดหน้าเขียนอีเมลใน Gmail ของครู (บัญชีตามอีเมลในระบบ — authuser) พร้อมข้อความแจ้งนัดหมาย
// ครูกด "ส่ง" เองใน Gmail ระบบไม่ได้เก็บรหัสผ่านอีเมลของใคร
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const thaiDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
};
const hhmm = (t) => String(t).slice(0, 5);

// เวลาไทย → UTC (ไทยไม่มีเวลาออมแสง) รูปแบบ 20261020T033000Z
const utcStamp = (ymd, minutes) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes - 7 * 60)).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
};

// ลิงก์ "เพิ่มลง Google Calendar" (นัดละ 30 นาที)
export const googleCalendarLink = ({ date, time, title, details }) => {
  const [h, m] = hhmm(time).split(":").map(Number);
  const start = utcStamp(date, h * 60 + m);
  const end = utcStamp(date, h * 60 + m + 30);
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${start}/${end}`, details: details || "" });
  return `https://calendar.google.com/calendar/render?${q}`;
};

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

// ข้อความอีเมลแจ้งนัดหมาย kind: created | cancelled
export const appointmentEmail = ({ kind, teacherName, studentName, date, time, note, appUrl }) => {
  const when = `${thaiDate(date)} เวลา ${hhmm(time)} น.`;
  const title = `นัดหมาย: ${note || "พบครูแนะแนว"}`;
  const subject = `${kind === "cancelled" ? "ยกเลิกนัดหมาย" : "นัดหมายกับครูแนะแนว"}: ${when}${note ? ` — ${note}` : ""}`;
  // null = ไม่มีบรรทัดนี้ • "" = เว้นบรรทัด
  const body = [
    `สวัสดี${studentName ? ` ${studentName}` : "นักเรียน"}`,
    "",
    kind === "cancelled" ? `ครูขอยกเลิกนัดหมายวันที่ ${when}` : `ครู${teacherName ? `${teacherName} ` : ""}นัดหมายกับคุณ`,
    kind === "cancelled" ? null : `วันเวลา: ${when}`,
    note ? `เรื่อง: ${note}` : null,
    kind === "cancelled" ? null : `เพิ่มลงปฏิทิน: ${googleCalendarLink({ date, time, title, details: `ครู${teacherName || ""}` })}`,
    appUrl ? `ดูในระบบ: ${appUrl}/studentcalendar` : null,
    "",
    `ครู${teacherName || ""}`,
  ]
    .filter((x) => x !== null)
    .join("\n");
  return { subject, body };
};

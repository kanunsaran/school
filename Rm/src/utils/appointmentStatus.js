// สถานะนัดหมาย (ใช้ร่วมกันทั้งปฏิทินครู ปฏิทินนักเรียน และหน้าโฮม)
// pending = รอยืนยัน (เหลืองอ่อน) • confirmed = ยืนยันแล้ว (เขียวอ่อน) • declined = ไม่สะดวก (แดงอ่อน)
export const STATUS_STYLE = {
  pending: { label: "รอยืนยัน", badge: "bg-amber-100 text-amber-800", card: "border-amber-200 bg-amber-50/60" },
  confirmed: { label: "ยืนยันแล้ว", badge: "bg-emerald-50 text-emerald-700", card: "border-gray-200" },
  declined: { label: "ไม่สะดวก", badge: "bg-red-50 text-red-600", card: "border-red-200 bg-red-50/40" },
};
export const statusCardClass = (status) => (STATUS_STYLE[status || "confirmed"] || STATUS_STYLE.confirmed).card;

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// วันที่จากฐานข้อมูล (อาจเป็น ISO มีเวลา) → YYYY-MM-DD ตามเวลาเครื่อง
export const apptDateKey = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : dateKey(new Date(v)));

// แถวนัดจาก API: รอ "ฉัน" ตอบอยู่ไหม (ผู้ถูกนัด = อีกฝ่ายของผู้สร้างนัด • นัดเก่าที่ไม่มีผู้สร้าง ถือว่าครูนัด)
export const awaitsMyReply = (a, myId) => {
  if (a.status !== "pending") return false;
  const creator = String(a.created_by_user_id ?? a.teacher_user_id);
  const invitee = creator === String(a.teacher_user_id) ? String(a.student_user_id) : String(a.teacher_user_id);
  return invitee === String(myId) && apptDateKey(a.appointment_date) >= dateKey(new Date());
};

// "17 ตุลาคม 2569" และ "15:00 น." แบบเดียวกับหน้าอื่นของเว็บ
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const thaiDateLong = (ymd) => {
  const [y, m, d] = apptDateKey(ymd).split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
};
export const thaiTime = (t) => (t ? `${String(t).slice(0, 5)} น.` : "");

// สีตามสถานะนัดหมาย (ใช้ร่วมกันทั้งปฏิทินครูและนักเรียน)
// pending = รอยืนยัน (เหลือง) • confirmed = ยืนยันแล้ว (เขียว) • declined = ไม่สะดวก (แดง)
export const STATUS_STYLE = {
  pending: { label: "รอยืนยัน", badge: "bg-amber-100 text-amber-800 border border-amber-300", card: "border-l-4 border-l-amber-400 bg-amber-50/30" },
  confirmed: { label: "ยืนยันแล้ว", badge: "bg-emerald-100 text-emerald-800 border border-emerald-300", card: "border-l-4 border-l-emerald-500" },
  declined: { label: "ไม่สะดวก", badge: "bg-red-100 text-red-700 border border-red-300", card: "border-l-4 border-l-red-400 bg-red-50/30" },
};
export const statusCardClass = (status) => (STATUS_STYLE[status || "confirmed"] || STATUS_STYLE.confirmed).card;

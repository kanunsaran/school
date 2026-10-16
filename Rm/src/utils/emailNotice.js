// สรุปผลการส่งอีเมลแจ้งนัดหมาย จากค่า email ที่ backend คืนมา ({ sent, reason }) — who = "นักเรียน" / "ครู"
export const emailNoticeText = (emails, who) => {
  const list = (emails || []).filter(Boolean);
  if (!list.length) return "";
  if (list.some((e) => e.reason === "not_configured")) return "ยังไม่ได้ตั้งค่าการส่งอีเมลของระบบ จึงยังไม่ได้ส่งอีเมลแจ้ง";
  if (list.some((e) => e.reason === "gmail_revoked")) return "การเชื่อมต่อ Gmail หมดอายุหรือถูกยกเลิก — กดเชื่อมต่อ Gmail ใหม่";
  const sent = list.filter((e) => e.sent).length;
  const noEmail = list.filter((e) => e.reason === "no_email").length;
  const failed = list.length - sent - noEmail;
  return [
    sent && `ส่งอีเมลแจ้ง${who}${list.length > 1 ? ` ${sent} คน` : ""}แล้ว${list.find((e) => e.via === "gmail")?.from ? ` จาก ${list.find((e) => e.via === "gmail").from}` : ""}`,
    noEmail && `${who}${list.length > 1 ? ` ${noEmail} คน` : ""}ไม่มีอีเมลในระบบ`,
    failed && `ส่งอีเมลไม่สำเร็จ${list.length > 1 ? ` ${failed} คน` : ""}`,
  ]
    .filter(Boolean)
    .join(" • ");
};

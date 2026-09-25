// ระบบ "คำขอปรึกษา" ตอนนี้ต่อกับ backend จริงแล้ว (endpoint /consultation) ผ่าน callapi_user.jsx
// (getConsultationRequests / createConsultationRequest / updateConsultationStatus / replyToConsultation)
// ไฟล์นี้เหลือแค่ค่าคงที่ที่ใช้ร่วมกัน + ตัวแปลงข้อมูลจาก shape ของ backend ให้เป็น shape เดิมที่หน้าเว็บใช้อยู่แล้ว

export const CONSULTATION_CATEGORIES = ["การเรียน", "การเลือกคณะ", "TCAS", "อาชีพในอนาคต", "ปัญหาส่วนตัว", "อื่นๆ"];

export const STATUS_META = {
  pending: { label: "รอดำเนินการ", cls: "bg-amber-50 text-amber-700" },
  in_progress: { label: "กำลังดำเนินการ", cls: "bg-blue-50 text-blue-700" },
  done: { label: "เสร็จสิ้น", cls: "bg-emerald-50 text-emerald-700" },
};

// แปลงแถวดิบจาก GET /consultation (request_id, student_user_id, student_name, messages:[{message_id,sender_role,message_text,created_at}], ...)
// ให้เป็น shape เดิม {id, studentUserId, studentName, messages:[{id,sender,text,at}], ...} ที่ Consultations.jsx/StudentConsultations.jsx ใช้อยู่แล้ว
export const normalizeConsultation = (raw) => ({
  id: raw.request_id,
  studentUserId: raw.student_user_id,
  studentName: raw.student_name,
  subject: raw.subject,
  category: raw.category,
  status: raw.status,
  createdAt: raw.created_at,
  messages: (raw.messages || []).map((m) => ({
    id: m.message_id,
    sender: m.sender_role,
    text: m.message_text,
    at: m.created_at,
  })),
});

// ครูเปิดอ่านคำขอนี้แล้ว — เก็บแค่ฝั่งเบราว์เซอร์ของครูเอง (จุดสีชมพูในลิสต์เป็นความสะดวก UI ล้วนๆ ไม่ต้องพึ่ง backend)
const READ_KEY = "consultation_read_at_v1";

const readReadMap = () => {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "{}");
  } catch {
    return {};
  }
};

export const markConsultationRead = (id) => {
  const map = readReadMap();
  map[id] = new Date().toISOString();
  localStorage.setItem(READ_KEY, JSON.stringify(map));
};

export const isConsultationUnread = (id, latestActivityAt) => {
  const lastRead = readReadMap()[id];
  return !lastRead || new Date(latestActivityAt) > new Date(lastRead);
};

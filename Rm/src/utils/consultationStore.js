// ⚠️ ระบบ "คำขอปรึกษา" ยังไม่มีตารางรองรับใน backend เลย และยังไม่มีหน้าให้นักเรียนส่งคำขอปรึกษาจริง
// (ไม่มีทั้งตารางเก็บคำขอ และไม่มี UI ฝั่งนักเรียนให้กดขอคำปรึกษา) เก็บไว้ใน localStorage ไปก่อน
// มีปุ่ม "จำลองคำขอ" ให้ครูทดสอบ UI ได้ (ผูกกับนักเรียนจริงในระบบ) ดูสเปกที่ขอ backend เพิ่มท้ายไฟล์

const STORAGE_KEY = "consultation_requests_v1";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const CONSULTATION_CATEGORIES = ["เลือกคณะ/สาขา", "การเรียน", "TCAS", "อาชีพในอนาคต", "ปัญหาส่วนตัว", "อื่นๆ"];

export const STATUS_META = {
  pending: { label: "รอดำเนินการ", cls: "bg-amber-50 text-amber-700" },
  in_progress: { label: "กำลังดำเนินการ", cls: "bg-blue-50 text-blue-700" },
  done: { label: "เสร็จสิ้น", cls: "bg-emerald-50 text-emerald-700" },
};

const newId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function getConsultations() {
  return readJSON(STORAGE_KEY, []);
}

export function getConsultation(id) {
  return getConsultations().find((c) => c.id === id) || null;
}

function saveAll(list) {
  writeJSON(STORAGE_KEY, list);
  return list;
}

// จำลองคำขอปรึกษา — ใช้ตอนทดสอบ UI เท่านั้น เพราะยังไม่มีหน้าให้นักเรียนส่งคำขอจริง
export function createConsultation({ studentUserId, studentName, roomLabel, subject, category, message }) {
  const list = getConsultations();
  const now = new Date().toISOString();
  const item = {
    id: newId(),
    studentUserId,
    studentName,
    roomLabel,
    subject,
    category: category || CONSULTATION_CATEGORIES[0],
    message,
    status: "pending",
    createdAt: now,
    messages: [],
  };
  saveAll([item, ...list]);
  return item;
}

export function updateStatus(id, status) {
  const list = getConsultations();
  const next = list.map((c) => (c.id === id ? { ...c, status } : c));
  saveAll(next);
  return next.find((c) => c.id === id);
}

export function addMessage(id, { sender, text }) {
  const list = getConsultations();
  const now = new Date().toISOString();
  const next = list.map((c) => {
    if (c.id !== id) return c;
    const messages = [...c.messages, { id: newId(), sender, text, at: now }];
    // ครูตอบครั้งแรก ก็ขยับสถานะจาก "รอดำเนินการ" เป็น "กำลังดำเนินการ" ให้อัตโนมัติ
    const status = sender === "teacher" && c.status === "pending" ? "in_progress" : c.status;
    return { ...c, messages, status };
  });
  saveAll(next);
  return next.find((c) => c.id === id);
}

export function deleteConsultation(id) {
  saveAll(getConsultations().filter((c) => c.id !== id));
}

/*
================= สเปกที่ขอให้ backend เพิ่ม (ระบบคำขอปรึกษา) =================

1. หน้าฝั่งนักเรียน — ต้องมี UI ให้นักเรียนกด "ขอคำปรึกษา" ได้เอง (ตอนนี้ไม่มีเลย ไม่ใช่แค่ backend ที่ขาด)
   เลือกหมวดหมู่ + พิมพ์รายละเอียด แล้วส่งเข้าคิวของครูแนะแนว

2. ตารางใหม่ `consultation_requests`
   request_id PK, student_user_id FK -> users.user_id, category ENUM(...), subject, message,
   status ENUM('pending','in_progress','done'), created_at, updated_at

3. ตารางใหม่ `consultation_messages` (ข้อความโต้ตอบไปกลับ)
   message_id PK, request_id FK -> consultation_requests.request_id, sender_user_id FK -> users.user_id,
   sender_role ENUM('student','teacher'), message_text, created_at

4. Endpoints ที่ต้องการ
   GET/POST      /consultations                — list (ครู, กรองตามสถานะ/นักเรียน/ห้องได้) + สร้างคำขอ (นักเรียน)
   GET/PUT       /consultations/:id             — ดูรายละเอียด/แก้สถานะ
   GET/POST       /consultations/:id/messages    — ดู/ส่งข้อความในเธรด

หมายเหตุ: "ข้อมูลประกอบ" ในหน้าคำขอปรึกษา (ผลประเมิน RIASEC, เป้าหมายของนักเรียน) ดึงจากตารางจริงที่มีอยู่แล้ว
(user_type_result/type/faculty และ goal) ไม่ต้องรอ backend เพิ่ม — มีแค่ตัวคำขอปรึกษาเองเท่านั้นที่ยังไม่มีที่เก็บจริง
*/

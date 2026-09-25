// ข้อมูลแบบประเมิน (assessments/questions/responses) ย้ายไปเก็บ backend จริงแล้ว ผ่าน callapi_user.jsx (getAssessmentsList, createAssessmentApi ฯลฯ)
// ไฟล์นี้เหลือแค่ค่าคงที่ + log กิจกรรมล่าสุด (สร้าง/แก้ไข/เผยแพร่/ทำสำเนา/ลบ) ซึ่งเป็นความสะดวก UI ฝั่งเบราว์เซอร์เครื่องนี้เท่านั้น ไม่จำเป็นต้องมีตาราง backend

const ACTIVITY_KEY = "assessment_activity_log_v1";

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

export const ASSESSMENT_TYPES = ["ความสนใจ", "บุคลิกภาพ", "ทักษะ", "เป้าหมาย", "ความถนัด", "อื่นๆ"];

export const QUESTION_TYPES = [
  { value: "choice", label: "ตัวเลือก (เลือกได้ข้อเดียว)" },
  { value: "checkbox", label: "ตัวเลือก (เลือกได้หลายข้อ)" },
  { value: "text", label: "คำตอบแบบข้อความ" },
  { value: "rating", label: "คะแนนความเห็น (1-5)" },
];

const newId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function getActivityLog() {
  return readJSON(ACTIVITY_KEY, []);
}

export function logActivity(action, title) {
  const list = getActivityLog();
  const entry = { id: newId(), action, title, at: new Date().toISOString() };
  writeJSON(ACTIVITY_KEY, [entry, ...list].slice(0, 20));
}

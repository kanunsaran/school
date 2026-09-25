// ⚠️ ระบบ "แบบประเมิน" (นอกเหนือจาก Holland/RIASEC ที่มีตารางจริงอยู่แล้ว: question/answer/type/user_type_result)
// ยังไม่มีตารางรองรับใน backend เลย (ไม่มีแนวคิด "แบบประเมินหลายชุดที่ครูสร้างเอง" อยู่ในสคีมาปัจจุบัน)
// เก็บไว้ใน localStorage ไปก่อน ให้สร้าง/แก้ไข/ลบ/ทำสำเนาได้จริงฝั่งเครื่องนี้ ดูสเปกที่ขอ backend เพิ่มท้ายไฟล์

const STORAGE_KEY = "custom_assessments_v1";
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

export function getAssessments() {
  return readJSON(STORAGE_KEY, []);
}

export function getAssessment(id) {
  return getAssessments().find((a) => a.id === id) || null;
}

function saveAll(list) {
  writeJSON(STORAGE_KEY, list);
  return list;
}

const newId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ประวัติการใช้งานจริงของครูคนนี้ในเครื่องนี้ (สร้าง/แก้ไข/เผยแพร่/ทำสำเนา/ลบ) — ไม่ใช่ข้อมูลปลอม แค่ไม่มี "นักเรียนทำแบบประเมิน"
// จริงเพราะยังไม่มีหน้าให้นักเรียนทำแบบประเมินที่สร้างเอง (ดูสเปกท้ายไฟล์)
export function getActivityLog() {
  return readJSON(ACTIVITY_KEY, []);
}

function logActivity(action, title) {
  const list = getActivityLog();
  const entry = { id: newId(), action, title, at: new Date().toISOString() };
  writeJSON(ACTIVITY_KEY, [entry, ...list].slice(0, 20));
}

export function createAssessment(data) {
  const list = getAssessments();
  const now = new Date().toISOString();
  const assessment = {
    id: newId(),
    title: data.title || "แบบประเมินไม่มีชื่อ",
    description: data.description || "",
    type: data.type || ASSESSMENT_TYPES[0],
    targetGradeIds: data.targetGradeIds || [],
    status: data.status || "draft", // draft | scheduled | published | closed
    openDate: data.openDate || "",
    closeDate: data.closeDate || "",
    questions: data.questions || [],
    createdAt: now,
    updatedAt: now,
  };
  saveAll([assessment, ...list]);
  logActivity(assessment.status === "published" ? "publish" : "create", assessment.title);
  return assessment;
}

export function updateAssessment(id, patch) {
  const list = getAssessments();
  const prev = list.find((a) => a.id === id);
  const next = list.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a));
  saveAll(next);
  const updated = next.find((a) => a.id === id);
  logActivity(prev?.status !== "published" && updated?.status === "published" ? "publish" : "edit", updated?.title);
  return updated;
}

export function deleteAssessment(id) {
  const target = getAssessment(id);
  saveAll(getAssessments().filter((a) => a.id !== id));
  if (target) logActivity("delete", target.title);
}

export function duplicateAssessment(id) {
  const original = getAssessment(id);
  if (!original) return null;
  const list = getAssessments();
  const now = new Date().toISOString();
  const copy = {
    ...original,
    id: newId(),
    title: `${original.title} (สำเนา)`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  saveAll([copy, ...list]);
  logActivity("duplicate", copy.title);
  return copy;
}

/*
================= สเปกที่ขอให้ backend เพิ่ม (ระบบแบบประเมินหลายชุด) =================

1. ตารางใหม่ `assessments`
   assessment_id PK, title, description, type ENUM(...), status ENUM('draft','scheduled','published','closed'),
   open_date DATETIME NULL, close_date DATETIME NULL, created_by_user_id FK -> users.user_id, created_at, updated_at

2. ตารางใหม่ `assessment_target_grades` (แบบประเมินหนึ่งชุด กำหนดกลุ่มเป้าหมายได้หลายห้อง/หลายชั้นปี)
   id PK, assessment_id FK -> assessments.assessment_id, grade_idgrade FK -> grade.idgrade

3. ตารางใหม่ `assessment_questions`
   question_id PK, assessment_id FK -> assessments.assessment_id, question_text, question_type ENUM('choice','checkbox','text','rating'),
   order_no INT, required BOOLEAN

4. ตารางใหม่ `assessment_question_options` (สำหรับ question_type = choice/checkbox)
   option_id PK, question_id FK -> assessment_questions.question_id, option_text, order_no

5. ตารางใหม่ `assessment_responses` + `assessment_response_answers` (บันทึกคำตอบของนักเรียนแต่ละคน)
   response_id PK, assessment_id FK, user_user_id FK -> users.user_id, submitted_at
   answer_id PK, response_id FK, question_id FK, answer_text หรือ selected_option_id

6. Endpoints ที่ต้องการ
   GET/POST    /assessments                 — list + create
   GET/PUT/DELETE /assessments/:id           — detail, edit, delete
   POST        /assessments/:id/duplicate
   GET/POST    /assessments/:id/questions
   GET/POST    /assessments/:id/responses    — บันทึก/ดูคำตอบนักเรียน (ใช้คำนวณ "ผู้ทำแล้ว/ทั้งหมด" จริง)

หมายเหตุ: แบบประเมิน Holland Code (RIASEC) ที่มีอยู่แล้วในระบบ (ตาราง question/answer/type/user_type_result)
เป็นแบบทดสอบเดี่ยว ๆ ที่ผูกตายตัว ไม่ได้อยู่ในระบบแบบประเมินหลายชุดนี้ — แสดงเป็นการ์ด "แบบประเมินประจำระบบ" แยกต่างหาก
ในหน้ารายการ (เขียนข้อมูลคงที่ไว้ในโค้ดฝั่ง frontend ไม่ได้ดึงจาก backend เพราะไม่มีแนวคิด "assessment definition" ของ Holland ในตารางจริง)
*/

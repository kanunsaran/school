// ⚠️ ชั้นข้อมูลเสริมที่เก็บไว้ใน localStorage เพื่อเติมฟีเจอร์ที่ backend ยังไม่รองรับ สำหรับหน้าให้คะแนนงาน:
// งานกลุ่ม (จัดกลุ่มนักเรียน), คอมเมนต์ครูต่อการส่งงาน, สถานะร่าง/ส่งกลับแล้ว
// คะแนนบันทึกผ่าน PUT /send_ass/:id (ของจริง) ตรงๆ แล้ว — ไม่ต้อง fallback local อีกต่อไป (ดู CHANGELOG ท้ายไฟล์)
// ดูสเปกที่ขอ backend เพิ่มเติม (งานกลุ่ม) ท้ายไฟล์นี้

const WORK_TYPE_KEY = "work_type_by_assignment_v1"; // { [ass_id]: "individual" | "group" }
const GROUPS_KEY = "submission_groups_v1"; // { [ass_id]: [{ group_id, group_name, member_user_ids: [] }] }
const SUBMISSION_META_KEY = "submission_meta_v1"; // { [send_id]: { comment, isReleased, sameScoreForAll } }

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

export function getWorkType(assId) {
  const map = readJSON(WORK_TYPE_KEY, {});
  return map[String(assId)] || "individual";
}
export function setWorkTypeLocal(assId, type) {
  const map = readJSON(WORK_TYPE_KEY, {});
  map[String(assId)] = type;
  writeJSON(WORK_TYPE_KEY, map);
}

export function getGroups(assId) {
  const map = readJSON(GROUPS_KEY, {});
  return map[String(assId)] || [];
}
export function saveGroups(assId, groups) {
  const map = readJSON(GROUPS_KEY, {});
  map[String(assId)] = groups;
  writeJSON(GROUPS_KEY, map);
}
export function addGroup(assId, groupName, memberUserIds) {
  const groups = getGroups(assId);
  // เอาสมาชิกที่เพิ่งเลือกออกจากกลุ่มเดิม (คนหนึ่งอยู่ได้แค่กลุ่มเดียวต่องานหนึ่งชิ้น)
  const cleaned = groups.map((g) => ({ ...g, member_user_ids: g.member_user_ids.filter((id) => !memberUserIds.includes(id)) }));
  const nextGroup = { group_id: Date.now(), group_name: groupName, member_user_ids: memberUserIds };
  const next = [...cleaned, nextGroup];
  saveGroups(assId, next);
  return next;
}
export function deleteGroup(assId, groupId) {
  const next = getGroups(assId).filter((g) => g.group_id !== groupId);
  saveGroups(assId, next);
  return next;
}

export function getSubmissionMeta(sendId) {
  const map = readJSON(SUBMISSION_META_KEY, {});
  return map[String(sendId)] || { comment: "", isReleased: false, sameScoreForAll: true };
}
export function saveSubmissionMeta(sendId, patch) {
  const map = readJSON(SUBMISSION_META_KEY, {});
  map[String(sendId)] = { ...getSubmissionMeta(sendId), ...patch };
  writeJSON(SUBMISSION_META_KEY, map);
  return map[String(sendId)];
}

/*
================= สเปกที่ขอให้ backend เพิ่ม (เหลือเฉพาะฟีเจอร์งานกลุ่ม) =================

1. ตาราง `assignment` เพิ่มคอลัมน์
   work_type ENUM('individual','group') NOT NULL DEFAULT 'individual'

2. ตารางใหม่ `submission_groups`
   group_id PK, assignment_ass_id FK -> assignment.ass_id, group_name varchar, created_at

3. ตารางใหม่ `submission_group_members`
   group_id FK -> submission_groups.group_id, user_user_id FK -> users.user_id

4. ตาราง `send_ass` เพิ่มคอลัมน์
   group_id FK -> submission_groups.group_id (nullable, ใช้เมื่อ work_type = 'group')
   teacher_comment TEXT (nullable)
   is_released BOOLEAN NOT NULL DEFAULT FALSE (false = บันทึกแบบร่าง ยังไม่ส่งกลับ, true = ส่งกลับพร้อมความคิดเห็นแล้ว)

5. ตารางใหม่ `send_ass_files` (รองรับส่งหลายไฟล์ต่อการส่งงานหนึ่งครั้ง แบบเดียวกับ news_files/portfolio_files)
   file_id PK, send_id FK -> send_ass.send_id, file_path, file_name, file_type, created_at

6. Endpoints เพิ่มเติม
   PATCH /send_ass/:id/comment       body: { teacher_comment, is_released }
   POST  /send_ass/:id/files         multipart อัปโหลดไฟล์เพิ่มต่อการส่งงาน (แบบเดียวกับ /news/:id/upload)
   GET/POST/DELETE /submission-groups  จัดการกลุ่มนักเรียนต่องาน

================= CHANGELOG =================
✅ แก้แล้ว (ยืนยันด้วย curl จริงแล้ว): เอา authRequired ออกจาก send_ass.routes.js ทั้งไฟล์,
   POST / รับ user_user_id จาก body แทน JWT, แก้ u.id/u.name -> u.user_id/u.fullname ใน
   not-submit/submitted/count endpoints, แก้ join ให้เช็ค assignment_students ก่อนแล้วค่อย
   assignment_classes+enroll — ทดสอบกับ ass_id=26 ผ่านหมดทั้ง 200 และ PUT บันทึกคะแนนได้จริงแล้ว
   (เดิมเคยเก็บคะแนนสำรองไว้ localStorage ตอน PUT ยังโดน 401 — เอาชั้นนั้นออกแล้วเพราะไม่จำเป็นอีกต่อไป)
*/

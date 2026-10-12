// เป้าหมายการศึกษาต่อของนักเรียน (ตาราง goal) — นักเรียน 1 คนตั้งได้หลายข้อ เรียงด้วย priority (1 = เป้าหมายหลัก)
// ใช้ฟังก์ชันเดียวกันทุกหน้า เพื่อให้ "เป้าหมายหลัก" ตรงกันทั้งฝั่งนักเรียนและครู

export const MAX_GOALS = 5;
// อันดับ 1 = เป้าหมายหลัก, ที่เหลือเรียกตามอันดับ
export const GOAL_RANK_LABEL = Array.from({ length: MAX_GOALS }, (_, i) => (i === 0 ? "เป้าหมายหลัก" : `อันดับ ${i + 1}`));

// ชื่อย่อมหาวิทยาลัยในไฟล์ข้อมูลคณะ → ชื่อเต็มตาม myTCAS (ใช้เทียบกับมหาวิทยาลัยที่นักเรียนเลือก)
const UNI_SHORT = {
  "จุฬาฯ": "จุฬาลงกรณ์มหาวิทยาลัย",
  "มจธ.": "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
  "มจพ.": "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ",
  "ลาดกระบัง": "สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง",
  "ม.ศิลปากร": "มหาวิทยาลัยศิลปากร",
};
export const fullUniName = (name) => {
  const n = String(name || "").replace(/\s*\(.*?\)\s*/g, "").trim();
  return UNI_SHORT[n] || n;
};
export const sameUni = (a, b) => Boolean(a && b) && fullUniName(a) === fullUniName(b);

// ลิงก์ myTCAS ของหลักสูตรในมหาวิทยาลัยที่เลือก (ถ้ามีในข้อมูล) — programs/links เรียงคู่กัน รูปแบบ "ชื่อย่อ: ชื่อหลักสูตร"
export const programLinkFor = (facultyRow, uni) => {
  if (!facultyRow || !uni) return null;
  const i = (facultyRow.programs || []).findIndex((p) => sameUni(p.split(":")[0], uni));
  return i >= 0 && facultyRow.links?.[i] ? { program: facultyRow.programs[i].split(":").slice(1).join(":").trim(), link: facultyRow.links[i] } : null;
};

// เรียง: priority น้อยก่อน (ข้อมูลเก่าที่ไม่มี priority ไว้ท้าย เรียงจากใหม่ไปเก่า)
export const sortGoals = (goals) =>
  [...(goals || [])].sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99) || new Date(b.created_at) - new Date(a.created_at) || b.goal_id - a.goal_id
  );

export const goalsOf = (goals, userId) => sortGoals((goals || []).filter((g) => String(g.user_user_id) === String(userId) && !g.deleted_at));

export const primaryGoalOf = (goals, userId) => goalsOf(goals, userId)[0] || null;

// ---------- เกรดเฉลี่ย ----------
export const GRADE_TERMS = ["4/1", "4/2", "5/1", "5/2", "6/1", "6/2"];
export const GRADE_SUBJECTS = ["คณิตศาสตร์", "วิทยาศาสตร์", "ภาษาไทย", "ภาษาอังกฤษ", "สังคมศึกษา"];
// วิชาในคอลัมน์ "วิชาที่ควรเน้น" → กลุ่มสาระที่นักเรียนกรอกเกรดไว้
const SUBJECT_GROUP = { ฟิสิกส์: "วิทยาศาสตร์", เคมี: "วิทยาศาสตร์", ชีววิทยา: "วิทยาศาสตร์", "อังกฤษ": "ภาษาอังกฤษ" };
export const gradeForSubject = (grades, subject) => {
  const key = SUBJECT_GROUP[subject] || subject;
  const v = grades?.subject_gpa?.[key];
  return v == null ? null : Number(v);
};

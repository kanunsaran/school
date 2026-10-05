import {
  getGoals,
  getTypeResults,
  getTypes,
  getFaculties,
  getAssAll,
  getAllSubmissions,
  getAssignmentClasses,
  getStudentGeneralInfo,
  getStudentAttendanceRecords,
  getAssessmentAdvice,
} from "../callapi/callapi_user.jsx";

// รวบรวมข้อมูลสำหรับ "รายงานรายบุคคล / ตารางสรุปทั้งห้อง" จากฐานข้อมูล แล้ววิเคราะห์ให้ครู
// (จุดเด่น, ความสอดคล้องเป้าหมายกับ RIASEC, สิ่งที่ควรพัฒนา) — ใช้กับระบบสร้างรายงานตัวเดียว

export const SECTIONS = {
  general: "ข้อมูลทั่วไป",
  goal: "เป้าหมายการศึกษาต่อ",
  holland: "ผลการประเมิน Holland (RIASEC)",
  analysis: "ผลการวิเคราะห์และคำแนะนำครู",
  submissions: "ผลการส่งงานวิชาแนะแนว",
  attendance: "การเข้าเรียน / เช็กชื่อ",
};

export const REPORT_TYPES = {
  guidance: {
    icon: "🎯",
    label: "เป้าหมายและการแนะแนว",
    title: "รายงานการแนะแนวรายบุคคล",
    classTitle: "สรุปเป้าหมายและการแนะแนวทั้งห้อง",
    defaults: ["general", "goal", "holland", "analysis"],
  },
  submissions: {
    icon: "📚",
    label: "ผลการส่งงานวิชาแนะแนว",
    title: "รายงานผลการส่งงานวิชาแนะแนว",
    classTitle: "สรุปผลการส่งงานวิชาแนะแนวทั้งห้อง",
    defaults: ["submissions"],
  },
  attendance: {
    icon: "📅",
    label: "การเข้าเรียน",
    title: "รายงานการเข้าเรียนวิชาแนะแนว",
    classTitle: "สรุปการเข้าเรียนวิชาแนะแนวทั้งห้อง",
    defaults: ["attendance"],
  },
};

export const RIASEC = ["R", "I", "A", "S", "E", "C"];
export const RIASEC_TH = {
  R: "นักปฏิบัติ",
  I: "นักคิดวิเคราะห์",
  A: "นักสร้างสรรค์",
  S: "นักสังคม",
  E: "นักบริหาร",
  C: "นักจัดระเบียบ",
};
// คำที่บ่งบอกสายคณะ/อาชีพของแต่ละด้าน — ใช้ประเมินความสอดคล้องของเป้าหมายกับผล RIASEC
const RIASEC_KEYWORDS = {
  R: ["วิศวกรรม", "ช่าง", "เกษตร", "เทคนิค", "อุตสาหกรรม", "สถาปัตย", "ทหาร", "ตำรวจ", "กีฬา", "พละ", "ประมง", "ป่าไม้", "ซ่อม", "นักบิน"],
  I: ["วิทยาศาสตร์", "แพทย", "เภสัช", "ทันต", "วิจัย", "คอมพิวเตอร์", "วิทยาการ", "ไอที", "ฟิสิกส์", "เคมี", "ชีว", "คณิต", "สัตวแพทย", "เทคนิคการแพทย์", "โปรแกรม", "ข้อมูล"],
  A: ["ศิลป", "ออกแบบ", "สถาปัตย", "ดนตรี", "นิเทศ", "การแสดง", "กราฟิก", "แฟชั่น", "สื่อ", "ภาพยนตร์", "วรรณ", "อักษร", "นักเขียน", "ช่างภาพ", "ดีไซน์"],
  S: ["ครุ", "ศึกษาศาสตร์", "ครู", "พยาบาล", "จิตวิทยา", "สังคม", "แนะแนว", "สาธารณสุข", "กายภาพ", "สังคมสงเคราะห์", "มนุษย", "บริการ", "โรงแรม", "ท่องเที่ยว"],
  E: ["บริหาร", "ธุรกิจ", "นิติ", "กฎหมาย", "การตลาด", "เศรษฐ", "รัฐศาสตร์", "การเมือง", "ผู้ประกอบการ", "ขาย", "การจัดการ", "นักการทูต", "ทนาย"],
  C: ["บัญชี", "การเงิน", "สถิติ", "เลขานุการ", "ธนาคาร", "ภาษี", "ประกัน", "ธุรการ", "คลัง", "สารสนเทศ", "เอกสาร"],
};

const parseJson = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const dash = (v) => (v == null || v === "" || (Array.isArray(v) && !v.length) ? "-" : v);
const thaiDate = (d) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-");

// ---------- โหลดข้อมูลทั้งหมดของนักเรียนชุดนี้ ----------
// students: [{ user_id, fullname, student_code, gradeId, seatNo }], classes: [{ id, grade_name, section, track }]
export const loadReportData = async (students, classes, onProgress) => {
  const [goals, results, types, faculties, assignments, submissions] = await Promise.all([
    getGoals().catch(() => []),
    getTypeResults().catch(() => []),
    getTypes().catch(() => []),
    getFaculties().catch(() => []),
    getAssAll().catch(() => []),
    getAllSubmissions().catch(() => []),
  ]);
  const gradeIds = [...new Set(students.map((s) => s.gradeId).filter(Boolean).map(String))];
  const assByGrade = {};
  await Promise.all(
    gradeIds.map((g) =>
      getAssignmentClasses({ grade_id: g })
        .then((rows) => (assByGrade[g] = new Set((rows || []).map((r) => String(r.ass_id)))))
        .catch(() => (assByGrade[g] = new Set()))
    )
  );

  const out = [];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const [info, records, advice] = await Promise.all([
      getStudentGeneralInfo(s.user_id).catch(() => null),
      getStudentAttendanceRecords(s.user_id, s.gradeId).catch(() => []),
      getAssessmentAdvice(s.user_id).catch(() => []),
    ]);
    const fd = parseJson(info?.form_data) || {};
    const goal = (goals || []).filter((g) => String(g.user_user_id) === String(s.user_id) && !g.deleted_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
    const result = (results || []).filter((r) => String(r.user_user_id) === String(s.user_id)).sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0] || null;
    const type = result ? (types || []).find((t) => String(t.type_id) === String(result.type_type_id)) : null;
    const faculty = result ? (faculties || []).find((f) => String(f.faculty_id) === String(result.recommended_faculty_id)) : null;
    const cls = (classes || []).find((c) => String(c.id ?? c.idgrade) === String(s.gradeId));

    // งานที่มอบหมายให้ห้องของนักเรียน (ถ้าระบบยังไม่ได้ผูกงานกับห้อง ใช้งานทั้งหมด)
    const gradeAss = s.gradeId && assByGrade[String(s.gradeId)]?.size ? assByGrade[String(s.gradeId)] : null;
    const myAssignments = (assignments || []).filter((a) => !gradeAss || gradeAss.has(String(a.ass_id)));
    const mySubs = (submissions || []).filter((x) => String(x.user_user_id) === String(s.user_id));
    const work = myAssignments
      .map((a) => {
        const sub = mySubs.filter((x) => String(x.assignment_ass_id) === String(a.ass_id)).sort((x, y) => new Date(y.created_at || y.timestamp) - new Date(x.created_at || x.timestamp))[0];
        const at = sub ? sub.created_at || sub.timestamp : null;
        const late = sub && a.deadline && at && new Date(at) > new Date(a.deadline);
        const overdue = !sub && a.deadline && new Date(a.deadline) < new Date();
        return {
          title: a.title,
          deadline: a.deadline,
          submittedAt: at,
          status: sub ? (late ? "ส่งช้า" : "ส่งแล้ว") : overdue ? "ไม่ส่ง (เลยกำหนด)" : "ยังไม่ส่ง",
          score: sub?.score != null ? `${sub.score}${a.max_score ? `/${a.max_score}` : ""}` : sub ? "รอตรวจ" : "-",
          scorePct: sub?.score != null && a.max_score ? (Number(sub.score) / Number(a.max_score)) * 100 : null,
          late: !!late,
          done: !!sub,
          overdue: !!overdue,
        };
      })
      .sort((x, y) => new Date(x.deadline || 0) - new Date(y.deadline || 0));

    const att = { present: 0, late: 0, leave: 0, absent: 0, total: 0 };
    (records || []).forEach((r) => {
      if (r.status === "not_checked") return;
      att.total++;
      if (att[r.status] != null) att[r.status]++;
    });

    out.push({
      student: s,
      classLabel: cls ? `${cls.grade_name}/${cls.section}${cls.track ? ` (${cls.track})` : ""}` : null,
      avatarUrl: info?.avatar_url || null,
      fd,
      goal,
      result,
      scores: parseJson(result?.scores_json),
      type,
      faculty,
      types: types || [],
      advice: advice || [],
      work,
      attendance: { ...att, records: (records || []).filter((r) => r.status !== "not_checked") },
    });
    onProgress?.((i + 1) / students.length);
  }
  return out;
};

// ---------- วิเคราะห์ ----------
export const rankRiasec = (d) => {
  if (d.scores) return RIASEC.map((c) => [c, Number(d.scores[c]) || 0]).sort((a, b) => b[1] - a[1]);
  if (d.result?.result_code) return [[d.result.result_code, null]];
  return [];
};

export const riasecCode = (d) => {
  const r = rankRiasec(d);
  if (!r.length) return "-";
  return d.scores ? r.slice(0, 3).map(([c]) => c).join("-") : r[0][0];
};

const goalText = (d) =>
  [d.goal?.faculty_name, d.goal?.career_field, d.goal?.goal_text, ...(d.fd.interests?.interested_careers || [])].filter(Boolean).join(" ");

export const goalAlignment = (d) => {
  const ranked = rankRiasec(d);
  const text = goalText(d);
  if (!ranked.length || !text) return { level: "ยังประเมินไม่ได้", detail: !ranked.length ? "นักเรียนยังไม่ได้ทำแบบประเมิน Holland" : "นักเรียนยังไม่ได้ตั้งเป้าหมาย" };
  const hit = (code) => RIASEC_KEYWORDS[code].some((k) => text.includes(k));
  const top = ranked.slice(0, d.scores ? 3 : 1).map(([c]) => c);
  if (hit(top[0])) return { level: "สูง", detail: `เป้าหมายตรงกับด้านที่โดดเด่นที่สุด (${top[0]} – ${RIASEC_TH[top[0]]})` };
  const second = top.slice(1).find(hit);
  if (second) return { level: "ปานกลาง", detail: `เป้าหมายสอดคล้องกับด้านรอง (${second} – ${RIASEC_TH[second]})` };
  return { level: "ควรทบทวน", detail: "เป้าหมายยังไม่สอดคล้องกับด้านที่โดดเด่น ควรพูดคุยเพื่อสำรวจทางเลือกเพิ่มเติม" };
};

export const analysisOf = (d) => {
  const ranked = rankRiasec(d);
  const strengths = [];
  if (ranked.length) {
    ranked.slice(0, d.scores ? 2 : 1).forEach(([c]) => {
      const t = d.types.find((x) => x.type_code === c);
      strengths.push(`${c} – ${RIASEC_TH[c]}${t?.description ? `: ${t.description}` : ""}`);
    });
  }
  if (d.fd.interests?.special_ability) strengths.push(`ความสามารถพิเศษ: ${d.fd.interests.special_ability}`);
  if (d.fd.education?.favorite_subject) strengths.push(`วิชาที่ชอบมากที่สุด: ${d.fd.education.favorite_subject}`);

  const improve = [];
  if (d.scores) {
    const low = ranked.slice(-2).map(([c]) => `${c} (${RIASEC_TH[c]})`);
    improve.push(`ด้านที่คะแนนน้อย: ${low.join(", ")} — ลองทำกิจกรรมที่ฝึกทักษะด้านนี้เพิ่ม`);
  }
  const attPct = d.attendance.total ? Math.round(((d.attendance.present + d.attendance.late) / d.attendance.total) * 100) : null;
  if (attPct != null && attPct < 80) improve.push(`การเข้าเรียน ${attPct}% (ต่ำกว่า 80%) ควรติดตามสาเหตุ`);
  const missing = d.work.filter((w) => w.overdue).length;
  if (missing) improve.push(`มีงานที่ไม่ได้ส่ง ${missing} ชิ้น`);
  if (d.fd.education?.least_favorite_subject) improve.push(`วิชาที่ไม่ถนัด: ${d.fd.education.least_favorite_subject}`);
  if (!improve.length) improve.push("ยังไม่พบประเด็นที่ต้องเร่งพัฒนา");

  const advice = d.advice.slice(0, 3).map((a) => `${a.advice_text} (${thaiDate(a.created_at)})`);
  return { strengths: strengths.length ? strengths : ["-"], alignment: goalAlignment(d), improve, advice: advice.length ? advice : ["ยังไม่มีคำแนะนำจากครู"] };
};

// ---------- ข้อมูลทั่วไป (สรุปจากแบบฟอร์มที่นักเรียนกรอก) ----------
export const generalRows = (d) => {
  const p = d.fd.personal || {};
  const ct = d.fd.contact || {};
  const ad = d.fd.address || {};
  const fam = d.fd.family || {};
  const person = (x) => (x ? [x.first_name, x.last_name].filter(Boolean).join(" ") : "");
  const withJob = (x) => [person(x), x?.occupation ? `(${x.occupation})` : ""].filter(Boolean).join(" ");
  return [
    ["ชื่อเล่น", dash(p.nickname)],
    ["วันเกิด", p.dob ? `${thaiDate(p.dob)}${p.age ? ` (${p.age} ปี)` : ""}` : "-"],
    ["โทรศัพท์", dash(ct.phone)],
    ["ศาสนา / สัญชาติ", [p.religion, p.nationality].filter(Boolean).join(" / ") || "-"],
    ["ที่อยู่", [ad.house_no, ad.road && `ถ.${ad.road}`, ad.subdistrict && `ต.${ad.subdistrict}`, ad.district && `อ.${ad.district}`, ad.province && `จ.${ad.province}`].filter(Boolean).join(" ") || "-"],
    ["บิดา", withJob(fam.father) || "-"],
    ["มารดา", withJob(fam.mother) || "-"],
    ["อาศัยอยู่กับ", dash(fam.living_with === "อื่นๆ" ? fam.living_with_other : fam.living_with)],
    ["งานอดิเรก", dash(d.fd.interests?.hobby)],
    ["โรคประจำตัว", dash(d.fd.health?.chronic_disease)],
  ];
};

export const goalRows = (d) => {
  const it = d.fd.interests || {};
  return [
    ["เป้าหมาย", dash(d.goal?.goal_text)],
    ["คณะที่อยากเข้า", dash(d.goal?.faculty_name)],
    ["สายอาชีพที่สนใจ", dash(d.goal?.career_field)],
    ["อาชีพที่สนใจ (แบบฟอร์ม)", (it.interested_careers || []).filter(Boolean).join(", ") || "-"],
    ["ระดับการศึกษาที่ตั้งใจ", dash(it.student_edu_goal)],
    ["ผู้ปกครองคาดหวัง", [it.guardian_expected_career, it.guardian_edu_goal].filter(Boolean).join(" • ") || "-"],
  ];
};

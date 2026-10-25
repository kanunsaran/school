import {
  getGoals,
  getTypeResults,
  getAssAll,
  getAllSubmissions,
  getAssignmentClasses,
  getStudentGeneralInfo,
  getStudentAttendanceRecords,
  getAssessmentAdvice,
} from "../callapi/callapi_user.jsx";
import { primaryGoalOf } from "./goals.js";
import { latestResultOf, loadRiasecData, recommendedFaculties } from "./riasecResults.js";
import { goalTargets, analyzeTarget } from "./riasecScoring.js";

// รวบรวมข้อมูลสำหรับ "รายงานรายบุคคล / ตารางสรุปทั้งห้อง" จากฐานข้อมูล แล้ววิเคราะห์ให้ครู
// (จุดเด่น, ความสอดคล้องเป้าหมายกับ RIASEC, สิ่งที่ควรพัฒนา) — ใช้กับระบบสร้างรายงานตัวเดียว

export const SECTIONS = {
  general: "ข้อมูลทั่วไป",
  goal: "เป้าหมายการศึกษาต่อ",
  holland: "ผลแบบประเมินความสนใจ (RIASEC)",
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
  S: "นักช่วยเหลือ",
  E: "ผู้นำ",
  C: "นักจัดระเบียบ",
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
  const [goals, results, riasecData, assignments, submissions] = await Promise.all([
    getGoals().catch(() => []),
    getTypeResults().catch(() => []),
    loadRiasecData(),
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
    const goal = primaryGoalOf(goals, s.user_id);
    // ผลแบบประเมินความสนใจล่าสุดที่มีคะแนนครบ 6 ด้าน (ชุดเดียวกับหน้าผลของนักเรียน)
    const result = latestResultOf(results, s.user_id);
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
      scores: result?.scores || null,
      riasec: result?.riasec || null,
      faculties: recommendedFaculties(riasecData, result?.riasec),
      riasecData,
      advice: advice || [],
      work,
      attendance: { ...att, records: (records || []).filter((r) => r.status !== "not_checked") },
    });
    onProgress?.((i + 1) / students.length);
  }
  return out;
};

// ---------- วิเคราะห์ ----------
export const rankRiasec = (d) => (d.riasec ? d.riasec.ranked.map((c) => [c, Number(d.scores[c]) || 0]) : []);

export const riasecCode = (d) => (d.riasec ? d.riasec.code.split("").join("-") : "-");

// ความสอดคล้องเป้าหมายกับผล — ใช้ goalTargets + analyzeTarget เดียวกับหน้าผลของนักเรียนและหน้าผลการประเมินของครู
const LEVEL_TH = { high: "สูง", medium: "ปานกลาง", low: "ต่ำ" };
export const goalAlignment = (d) => {
  if (!d.riasec) return { level: "ยังประเมินไม่ได้", detail: "นักเรียนยังไม่ได้ทำแบบประเมินความสนใจ" };
  if (!d.goal || ![d.goal.faculty_name, d.goal.goal_text, d.goal.career_field].some((v) => String(v || "").trim())) return { level: "ยังประเมินไม่ได้", detail: "นักเรียนยังไม่ได้ตั้งเป้าหมาย" };
  const target = d.riasecData ? goalTargets(d.riasecData, d.goal)[0] : null;
  if (!target) return { level: "ยังประเมินไม่ได้", detail: "ไม่พบคณะของเป้าหมายนี้ในข้อมูลของงานแนะแนว" };
  const a = analyzeTarget(d.riasecData, d.riasec, target);
  const dim = `${a.faculty.dim} – ${RIASEC_TH[a.faculty.dim]}`;
  const detail =
    a.kind === "recommended"
      ? `ตาราง 120 รหัสของงานแนะแนวแนะนำ${a.faculty.name}สำหรับรหัส ${a.viaCode || d.riasec.code}`
      : a.kind === "main"
      ? `${a.faculty.name}เป็นสาขาด้าน ${dim} ซึ่งเป็นความสนใจเด่นอันดับ ${a.rank} ของนักเรียน`
      : `${a.faculty.name}เป็นสาขาด้าน ${dim} ซึ่งไม่อยู่ในความสนใจเด่น 3 อันดับแรก ควรพูดคุยเพื่อสำรวจทางเลือกเพิ่มเติม`;
  return { level: LEVEL_TH[a.displayLevel] || "ยังประเมินไม่ได้", detail };
};

export const analysisOf = (d) => {
  const ranked = rankRiasec(d);
  const strengths = [];
  if (ranked.length) {
    ranked.slice(0, 2).forEach(([c]) => {
      const traits = d.riasecData?.dimensions?.[c]?.traits;
      strengths.push(`${c} – ${RIASEC_TH[c]}${traits ? `: ${traits}` : ""}`);
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
    ["มหาวิทยาลัยที่อยากเข้า", dash(d.goal?.university_name)],
    ["สายอาชีพที่สนใจ", dash(d.goal?.career_field)],
    ["อาชีพที่สนใจ (แบบฟอร์ม)", (it.interested_careers || []).filter(Boolean).join(", ") || "-"],
    ["ระดับการศึกษาที่ตั้งใจ", dash(it.student_edu_goal)],
    ["ผู้ปกครองคาดหวัง", [it.guardian_expected_career, it.guardian_edu_goal].filter(Boolean).join(" • ") || "-"],
  ];
};

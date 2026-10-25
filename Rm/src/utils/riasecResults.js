// ผลแบบสำรวจความสนใจ RIASEC ฝั่งครู — ใช้เฉพาะแบบทดสอบปัจจุบัน (60 ข้อ มีคะแนนครบ 6 ด้านใน scores_json)
// ผลจากระบบเดิม (มีแค่ตัวอักษรเดียว ไม่มีคะแนน) ไม่นับเป็น "ทำแล้ว" — ใช้เกณฑ์เดียวกับหน้าผลของนักเรียน (hooks/useMyRiasec.js)
import { resultFromScores, RIASEC_ORDER, facultiesForCode } from "./riasecScoring.js";

export const RIASEC_TEST_TITLE = "แบบสำรวจความสนใจ RIASEC";

export const parseScores = (v) => {
  let s = v;
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!s || typeof s !== "object") return null;
  return RIASEC_ORDER.every((c) => Number.isFinite(Number(s[c]))) ? Object.fromEntries(RIASEC_ORDER.map((c) => [c, Number(s[c])])) : null;
};

const newestFirst = (a, b) => new Date(b.test_date) - new Date(a.test_date) || b.result_id - a.result_id;

// Map user_id → แถวผลล่าสุดของแบบทดสอบปัจจุบัน + { scores, riasec } (riasec = resultFromScores)
export const latestCurrentResults = (rows) => {
  const map = new Map();
  [...(rows || [])].sort(newestFirst).forEach((r) => {
    const id = String(r.user_user_id);
    if (map.has(id)) return;
    const scores = parseScores(r.scores_json ?? r.scores);
    if (scores) map.set(id, { ...r, scores, riasec: resultFromScores(scores) });
  });
  return map;
};

// นักเรียนที่มีแต่ผลจากระบบเดิม (ต้องทำแบบทดสอบใหม่จึงจะมีคะแนน 6 ด้าน)
export const legacyOnlyUserIds = (rows, latestMap) =>
  new Set((rows || []).map((r) => String(r.user_user_id)).filter((id) => !latestMap.has(id)));

// ชื่อไทยของแต่ละด้าน (ตรงกับชีต "คู่มือมิติ RIASEC" ใน riasec.json)
export const RIASEC_NAME_TH = { R: "นักปฏิบัติ", I: "นักคิดวิเคราะห์", A: "นักสร้างสรรค์", S: "นักช่วยเหลือ", E: "ผู้นำ", C: "นักจัดระเบียบ" };

// ผลล่าสุดของนักเรียน 1 คน (null = ยังไม่ได้ทำแบบทดสอบปัจจุบัน)
export const latestResultOf = (rows, userId) => latestCurrentResults((rows || []).filter((r) => String(r.user_user_id) === String(userId))).get(String(userId)) || null;

// "ISR · นักคิดวิเคราะห์ นักช่วยเหลือ นักปฏิบัติ"
export const resultLabel = (riasec) => (riasec ? `${riasec.code} · ${riasec.code.split("").map((c) => RIASEC_NAME_TH[c]).join(" ")}` : "");

// ข้อมูลคณะ/อาชีพจาก Excel ของงานแนะแนว (โหลดครั้งเดียว แยกไฟล์ ไม่ถ่วงหน้าอื่น)
let riasecDataPromise = null;
export const loadRiasecData = () => (riasecDataPromise ||= import("../data/riasec.json").then((m) => m.default).catch(() => null));

// สาขาที่ตาราง 120 รหัสของงานแนะแนวแนะนำสำหรับรหัสนี้ (ชุดเดียวกับหน้าผลของนักเรียน)
export const recommendedFaculties = (data, riasec) => (data && riasec ? facultiesForCode(data, riasec.code).map((f) => f.label) : []);

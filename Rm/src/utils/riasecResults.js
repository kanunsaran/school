// ผลแบบสำรวจความสนใจ RIASEC ฝั่งครู — ใช้เฉพาะแบบทดสอบปัจจุบัน (60 ข้อ มีคะแนนครบ 6 ด้านใน scores_json)
// ผลจากระบบเดิม (มีแค่ตัวอักษรเดียว ไม่มีคะแนน) ไม่นับเป็น "ทำแล้ว" — ใช้เกณฑ์เดียวกับหน้าผลของนักเรียน (hooks/useMyRiasec.js)
import { resultFromScores, RIASEC_ORDER } from "./riasecScoring.js";

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

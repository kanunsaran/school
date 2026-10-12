import { useEffect, useState } from "react";
import { getTypeResultsByUser } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { resultFromScores } from "../utils/riasecScoring.js";

const parse = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

// ผลแบบทดสอบ RIASEC ของนักเรียนที่ล็อกอินอยู่ + ฐานข้อมูลคณะ/อาชีพ (โหลดแยกไฟล์ ไม่ถ่วงหน้าอื่น)
// fresh = ผลที่เพิ่งทำเสร็จ (ส่งมาจากหน้าแบบทดสอบ) ใช้แสดงทันทีโดยไม่ต้องรอโหลด
// คืน { loading, data, latest, history } — latest = { ...ผลคำนวณ, date } | { legacy, code, date } | null
export default function useMyRiasec(fresh) {
  const [state, setState] = useState({ loading: true, data: null, latest: null, history: [] });
  useEffect(() => {
    let alive = true;
    const userId = getCurrentUser()?.user_id;
    Promise.all([
      import("../data/riasec.json").then((m) => m.default),
      userId ? getTypeResultsByUser(userId).catch(() => []) : Promise.resolve([]),
    ]).then(([data, rows]) => {
      if (!alive) return;
      const history = (rows || [])
        .filter((r) => String(r.user_user_id) === String(userId))
        .sort((a, b) => new Date(b.test_date) - new Date(a.test_date) || b.result_id - a.result_id)
        .map((r) => {
          const scores = parse(r.scores_json);
          // ผลเก่าก่อนระบบเก็บคะแนนรายด้าน มีแค่ตัวอักษรเดียว
          return scores ? { ...resultFromScores(scores), date: r.test_date } : { legacy: true, code: r.result_code || r.type_code, date: r.test_date };
        });
      const latest = fresh?.scores ? { ...resultFromScores(fresh.scores), date: fresh.date || new Date().toISOString() } : history[0] || null;
      setState({ loading: false, data, latest, history });
    });
    return () => {
      alive = false;
    };
  }, [fresh]);
  return state;
}

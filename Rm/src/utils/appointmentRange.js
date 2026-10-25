// นัดหมายหลายวัน: date = วันเริ่ม, endDate = วันสุดท้าย (null = นัดวันเดียว) — คีย์วันที่รูปแบบ "YYYY-MM-DD"
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
export const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDaysKey = (key, n) => {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};
// จำนวนวันจาก a ถึง b (a = b → 0)
export const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / 86400000);

// วันสุดท้ายของนัด (นัดวันเดียว = วันเริ่ม)
export const lastDayOf = (a) => a.endDate || a.date;
// นัดนี้ครอบคลุมวันที่ key หรือไม่
export const coversDay = (a, key) => a.date <= key && key <= lastDayOf(a);
// นัดนี้ยังไม่จบ ณ วันที่ key (ใช้กับ "นัดหมายที่จะถึงนี้")
export const notOverBy = (a, key) => lastDayOf(a) >= key;

// วันที่ทุกวันของนัด
export const daysOf = (a) => {
  const out = [];
  for (let k = a.date; k <= lastDayOf(a); k = addDaysKey(k, 1)) out.push(k);
  return out;
};

// "27 ต.ค. 2569" • "27–29 ต.ค. 2569" • "30 ต.ค. – 2 พ.ย. 2569" • ข้ามปี "30 ธ.ค. 2569 – 2 ม.ค. 2570"
export const rangeLabel = (start, end) => {
  const s = keyToDate(start);
  if (!end || end === start) return `${s.getDate()} ${THAI_MONTHS_SHORT[s.getMonth()]} ${s.getFullYear() + 543}`;
  const e = keyToDate(end);
  if (s.getFullYear() !== e.getFullYear())
    return `${s.getDate()} ${THAI_MONTHS_SHORT[s.getMonth()]} ${s.getFullYear() + 543} – ${e.getDate()} ${THAI_MONTHS_SHORT[e.getMonth()]} ${e.getFullYear() + 543}`;
  if (s.getMonth() !== e.getMonth())
    return `${s.getDate()} ${THAI_MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${THAI_MONTHS_SHORT[e.getMonth()]} ${e.getFullYear() + 543}`;
  return `${s.getDate()}–${e.getDate()} ${THAI_MONTHS_SHORT[s.getMonth()]} ${s.getFullYear() + 543}`;
};
// ป้ายสั้นบอกวันสุดท้ายของนัดหลายวัน เช่น "ถึง 29 ต.ค." (นัดวันเดียว = "")
export const untilLabel = (a) => {
  if (!a.endDate || a.endDate === a.date) return "";
  const e = keyToDate(a.endDate);
  return `ถึง ${e.getDate()} ${THAI_MONTHS_SHORT[e.getMonth()]}`;
};
// ต่อท้ายป้ายนัด เช่น " (3 วัน)"
export const durationSuffix = (start, end) => (end && end !== start ? ` (${daysBetween(start, end) + 1} วัน)` : "");

// จัดนัดลงทุกวันที่นัดครอบคลุม เรียงตามเวลา — ใช้กับช่องปฏิทิน
export const groupByDay = (appointments) => {
  const map = {};
  for (const a of appointments) for (const k of daysOf(a)) (map[k] ||= []).push(a);
  Object.values(map).forEach((list) => list.sort((x, y) => String(x.time).localeCompare(String(y.time))));
  return map;
};

// ---------- แถบนัดในปฏิทินรายสัปดาห์ (นัดหลายวัน = แถบยาวแถบเดียวพาดข้ามวัน) ----------
// weekKeys = คีย์วันที่ 7 ช่องของสัปดาห์ (ช่องว่างนอกเดือน = null)
// คืน { bars: [{ s, e, lane, label, count, waiting, past, multi }], lanes }
//   s/e = ช่องแรก/ช่องสุดท้ายในสัปดาห์ (0–6) • lane = แถวของแถบ (แถบที่ทับกันวางคนละแถว)
//   นัดหลายวันที่ต่อไปสัปดาห์ถัดไป ต่อท้าย "(ถึง 12 พ.ย.)" • หัวข้อ+ช่วงวันเดียวกันหลายคน = แถบเดียว ×จำนวน
export const weekBars = (weekKeys, appointments, { labelOf, needsReply, todayKey }) => {
  const idx = weekKeys.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return { bars: [], lanes: 0 };
  const first = weekKeys[idx[0]];
  const last = weekKeys[idx[idx.length - 1]];
  const groups = new Map();
  for (const a of appointments) {
    const end = lastDayOf(a);
    if (a.date > last || end < first) continue;
    const s = weekKeys.indexOf(a.date < first ? first : a.date);
    const e = weekKeys.indexOf(end > last ? last : end);
    const multi = end > a.date;
    const label = labelOf(a) + (multi && end > last ? ` (${untilLabel(a)})` : "");
    const key = `${label}|${s}|${e}`;
    const g = groups.get(key);
    const waiting = Boolean(needsReply) && end >= todayKey && needsReply(a);
    if (g) {
      g.count++;
      g.waiting ||= waiting;
    } else groups.set(key, { s, e, label, count: 1, waiting, past: end < todayKey, multi });
  }
  // แถบยาวก่อน แล้ววางลงแถวแรกที่ว่างตลอดช่วง
  const bars = [...groups.values()].sort((x, y) => y.e - y.s - (x.e - x.s) || x.s - y.s);
  const used = [];
  for (const b of bars) {
    let lane = 0;
    while ((used[lane] || []).some((c) => c >= b.s && c <= b.e)) lane++;
    (used[lane] ||= []).push(...Array.from({ length: b.e - b.s + 1 }, (_, i) => b.s + i));
    b.lane = lane;
  }
  return { bars, lanes: used.length };
};

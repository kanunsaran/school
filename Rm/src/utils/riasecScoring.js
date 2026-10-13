// คิดคะแนนแบบสำรวจความสนใจ RIASEC ตามไฟล์ "วิธีคิดคะแนน-RIASEC"
// 60 ข้อ มิติละ 10 ข้อ ตอบ 1–5 (ทุกข้อเป็นข้อความเชิงบวก ไม่กลับคะแนน) → คะแนนแต่ละมิติ 10–50
// รหัสฮอลแลนด์ = 3 มิติที่คะแนนสูงสุด • คะแนนเท่ากันเรียงตามลำดับหกเหลี่ยม R-I-A-S-E-C และแจ้งรหัสอื่นที่เป็นไปได้

export const RIASEC_ORDER = ["R", "I", "A", "S", "E", "C"];
export const ITEMS_PER_DIM = 10;
export const MIN_SCORE = ITEMS_PER_DIM * 1;
export const MAX_SCORE = ITEMS_PER_DIM * 5;

// ระดับคำตอบตามไฟล์วิธีคิดคะแนน (5 = ตรงกับฉันมากที่สุด … 1 = น้อยที่สุด)
export const ANSWER_SCALE = [
  { value: 1, label: "น้อยที่สุด" },
  { value: 2, label: "น้อย" },
  { value: 3, label: "ปานกลาง" },
  { value: 4, label: "มาก" },
  { value: 5, label: "ตรงกับฉันมากที่สุด" },
];

// ค่าความแตกต่าง (สูงสุด − ต่ำสุด) ที่ถือว่า "คะแนนใกล้กันทุกมิติ" — ไฟล์ไม่ได้กำหนดตัวเลข
// ระบบตั้งไว้ที่ 5 คะแนน (เท่ากับต่างกันเฉลี่ยไม่ถึงครึ่งระดับต่อข้อ)
export const LOW_DIFFERENTIATION = 5;

// answers: [{ code: "R", value: 1-5 }] → { R: n, I: n, ... }
export const sumScores = (answers) => {
  const scores = Object.fromEntries(RIASEC_ORDER.map((c) => [c, 0]));
  answers.forEach(({ code, value }) => {
    if (scores[code] === undefined) throw new Error(`มิติไม่ถูกต้อง: ${code}`);
    const v = Number(value);
    if (!(v >= 1 && v <= 5)) throw new Error(`คำตอบต้องอยู่ระหว่าง 1–5 (ได้ ${value})`);
    scores[code] += v;
  });
  return scores;
};

// เรียงมากไปน้อย คะแนนเท่ากันใช้ลำดับหกเหลี่ยม
export const rankDimensions = (scores) =>
  [...RIASEC_ORDER].sort((a, b) => scores[b] - scores[a] || RIASEC_ORDER.indexOf(a) - RIASEC_ORDER.indexOf(b));

const permutations = (arr) =>
  arr.length <= 1 ? [arr] : arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
const combinations = (arr, k) =>
  k === 0 ? [[]] : arr.flatMap((x, i) => combinations(arr.slice(i + 1), k - 1).map((c) => [x, ...c]));

// รหัส 3 ตัวทั้งหมดที่เป็นไปได้เมื่อมีคะแนนเท่ากันในช่วง 3 อันดับแรก (ตัวแรกคือรหัสหลักตามลำดับหกเหลี่ยม)
export const possibleCodes = (scores, limit = 6) => {
  const ranked = rankDimensions(scores);
  const groups = [];
  ranked.forEach((c) => {
    const g = groups[groups.length - 1];
    if (g && scores[g[0]] === scores[c]) g.push(c);
    else groups.push([c]);
  });
  let partials = [[]];
  let slots = 3;
  for (const g of groups) {
    if (slots === 0) break;
    const take = Math.min(slots, g.length);
    const options = combinations(g, take).flatMap(permutations);
    partials = partials.flatMap((p) => options.map((o) => [...p, ...o]));
    slots -= take;
  }
  const primary = ranked.slice(0, 3).join("");
  const all = [...new Set(partials.map((p) => p.join("")))];
  return [primary, ...all.filter((c) => c !== primary)].slice(0, limit);
};

// ระยะห่างบนหกเหลี่ยม: 1 = ติดกัน, 2 = ห่าง 1 ช่อง, 3 = ตรงข้าม
export const hexDistance = (a, b) => {
  const d = Math.abs(RIASEC_ORDER.indexOf(a) - RIASEC_ORDER.indexOf(b));
  return Math.min(d, 6 - d);
};
const CONSISTENCY = { 1: "high", 2: "medium", 3: "low" };

// คะแนนที่บันทึกไว้แล้ว ({R..C}) → ผลเดียวกับ scoreRiasec (ใช้ตอนเปิดหน้าผลจากฐานข้อมูล)
export const resultFromScores = (scores) => {
  const ranked = rankDimensions(scores);
  const codes = possibleCodes(scores);
  const values = RIASEC_ORDER.map((c) => Number(scores[c]) || 0);
  const differentiation = Math.max(...values) - Math.min(...values);
  return {
    scores,
    ranked,
    code: codes[0],
    alternativeCodes: codes.slice(1),
    hasTie: codes.length > 1,
    differentiation,
    lowDifferentiation: differentiation <= LOW_DIFFERENTIATION,
    consistency: CONSISTENCY[hexDistance(codes[0][0], codes[0][1])],
  };
};

// ผลรวมทั้งหมดของแบบสำรวจจากคำตอบ 60 ข้อ
export const scoreRiasec = (answers) => resultFromScores(sumScores(answers));

export const scorePercent = (score) => Math.round((Number(score) / MAX_SCORE) * 100);

// ---------- เชื่อมกับฐานข้อมูลคณะ/อาชีพ (riasec.json) ----------

// คณะที่รหัสแนะนำ → แถวข้อมูลคณะ (ชื่อเทียบเท่าอาจชี้ได้หลายแถว)
export const facultiesForCode = (data, code) => {
  const entry = data.codes[code];
  if (!entry) return [];
  return entry.faculties.map((label) => {
    const names = data.faculties.some((f) => f.name === label) ? [label] : data.aliases[label] || [];
    return { label, rows: names.map((n) => data.faculties.find((f) => f.name === n)).filter(Boolean) };
  });
};

const clean = (s) =>
  String(s || "")
    .replace(/คณะ|สาขาวิชา|สาขา|หลักสูตร|ภาควิชา|[()\s]/g, "")
    .trim();

// คำย่อ/คำเรียกที่นักเรียนใช้บ่อย → คำเต็มที่ตรงกับชื่อในฐานข้อมูล (ระบบกำหนดเอง ไม่ได้มาจากไฟล์)
const NICKNAMES = [
  [/วิศวะ/g, "วิศวกรรม"], [/สถาปัตย์(?!ยกรรม)/g, "สถาปัตยกรรม"], [/ทันตะ/g, "ทันตแพทย"], [/หมอฟัน/g, "ทันตแพทย"],
  [/สัตวแพทย์|หมอสัตว์|สัตวะ/g, "สัตวแพทย"], [/หมอ(?!ฟัน|สัตว์)/g, "แพทย"], [/ไอที|IT\b/gi, "เทคโนโลยีสารสนเทศ"],
  [/คอม(?!พิวเตอร์)/g, "คอมพิวเตอร์"], [/^ครู$|ครูสอน|เป็นครู/g, "ครุศาสตร์"], [/นิเทศ(?!ศาสตร์|ศิลป์)/g, "นิเทศศาสตร์"],
  [/เภสัช(?!ศาสตร์)/g, "เภสัชศาสตร์"], [/เศรษฐ(?!ศาสตร์)/g, "เศรษฐศาสตร์"],
];

// คำค้น → แถวคณะ (คำกว้างที่ใช้ร่วมหลายแถว เช่น "บริหารธุรกิจ", "วิศวกรรม" ชี้ไปทุกแถวนั้น)
const facultyKeywords = (data) => {
  const map = new Map();
  const add = (kw, rows) => {
    const k = clean(kw);
    if (k.length < 3) return;
    [k, k.replace(/ศาสตร์$/, "")].forEach((key, i) => {
      if (i === 1 && (key === k || key.length < 4)) return;
      const cur = map.get(key) || [];
      rows.forEach((r) => !cur.includes(r) && cur.push(r));
      map.set(key, cur);
    });
  };
  const byBase = {};
  data.faculties.forEach((f) => {
    add(f.name, [f]);
    f.name.split("/").forEach((part) => add(part, [f]));
    const base = f.name.replace(/\(.*?\)/g, "");
    (byBase[clean(base)] ||= []).push(f);
    if (/^วิศวกรรม/.test(f.name)) (byBase["วิศวกรรม"] ||= []).push(f);
  });
  Object.entries(byBase).forEach(([base, rows]) => add(base, rows));
  Object.entries(data.aliases).forEach(([alias, targets]) => add(alias, targets.map((t) => data.faculties.find((f) => f.name === t)).filter(Boolean)));
  return map;
};

// หาแถวคณะจากข้อความเป้าหมายที่นักเรียนพิมพ์เอง เช่น "คณะแพทยศาสตร์ ม.ขอนแก่น" — เลือกคำที่ตรงยาวที่สุด
// (คำยาวกว่าชนะ เช่น "สัตวแพทยศาสตร์" ชนะ "แพทยศาสตร์") คืน { label, rows } หรือ null
export const matchGoalFaculties = (data, goalText) => {
  let text = String(goalText || "");
  NICKNAMES.forEach(([re, to]) => (text = text.replace(re, to)));
  const goal = clean(text);
  if (!goal) return null;
  let best = null;
  facultyKeywords(data).forEach((rows, k) => {
    if (goal.includes(k) && (!best || k.length > best.k.length)) best = { k, rows };
  });
  if (!best) return null;
  return { label: best.rows.length === 1 ? best.rows[0].name : best.k, rows: best.rows };
};
export const matchGoalFaculty = (data, goalText) => matchGoalFaculties(data, goalText)?.rows[0] || null;

// ความสอดคล้องระหว่างเป้าหมายกับผล (บอกความสนใจ ไม่ได้วัดความสามารถ — ไม่แสดงเป็นเปอร์เซ็นต์)
// high: คณะเป้าหมายอยู่ในคณะที่รหัสแนะนำ หรือมิติของคณะตรงตัวแรกของรหัส
// medium: มิติของคณะตรงตัวที่ 2–3 • low: ไม่อยู่ใน 3 ตัวแรก • unknown: หาคณะในฐานข้อมูลไม่เจอ • none: ยังไม่ตั้งเป้าหมาย
const LEVEL_RANK = { high: 3, medium: 2, low: 1 };
const alignOne = (data, faculty, code) => {
  const recommended = facultiesForCode(data, code).some((x) => x.rows.some((r) => r.name === faculty.name));
  const pos = code.indexOf(faculty.dim);
  if (recommended) return { level: "high", faculty, reason: "recommended", position: pos };
  if (pos === 0) return { level: "high", faculty, reason: "top", position: pos };
  if (pos > 0) return { level: "medium", faculty, reason: "secondary", position: pos };
  return { level: "low", faculty, reason: "outside", position: -1 };
};
export const goalAlignment = (data, goalText, code) => {
  if (!String(goalText || "").trim()) return { level: "none" };
  const match = matchGoalFaculties(data, goalText);
  if (!match) return { level: "unknown" };
  // เป้าหมายกว้าง (เช่น "บริหารธุรกิจ") ครอบคลุมหลายแขนง — ใช้แขนงที่เข้ากับผลมากที่สุด
  const best = match.rows.map((f) => alignOne(data, f, code)).sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0];
  return { ...best, label: match.label, candidates: match.rows };
};

// ---------- เป้าหมายของนักเรียน: คณะ / อาชีพ / ข้อความเป้าหมาย ----------

// อาชีพที่นักเรียนพิมพ์ → แถวคณะที่มีอาชีพนั้นในคอลัมน์ "อาชีพที่เกี่ยวข้อง" (คำยาวสุดชนะ)
export const matchCareerFaculties = (data, careerText) => {
  const text = clean(careerText);
  if (text.length < 2) return null;
  let best = null;
  data.faculties.forEach((f) =>
    f.careers.forEach((career) => {
      const c = clean(career);
      if (c.length < 3) return;
      // อาชีพในไฟล์อยู่ในข้อความนักเรียน หรือขึ้นต้นด้วยคำที่นักเรียนพิมพ์ ("พยาบาล" → "พยาบาลวิชาชีพ" แต่ไม่ใช่ "โรงพยาบาล")
      if ((text.includes(c) || c.startsWith(text)) && (!best || c.length > best.len)) best = { len: c.length, career, rows: [f] };
      else if (best && c === clean(best.career) && !best.rows.includes(f)) best.rows.push(f);
    })
  );
  return best ? { label: best.career, rows: best.rows } : null;
};

// เป้าหมายทั้งหมดที่หาเจอในฐานข้อมูล เรียงตามความสำคัญ: คณะที่ระบุ → สาขาจากข้อความเป้าหมาย → อาชีพ
// goal = แถวจากตาราง goal { faculty_name, career_field, goal_text }
export const goalTargets = (data, goal) => {
  if (!goal) return [];
  const raw = [
    { source: "faculty", input: goal.faculty_name, match: matchGoalFaculties(data, goal.faculty_name) },
    { source: "text", input: goal.goal_text, match: matchGoalFaculties(data, goal.goal_text) },
    { source: "career", input: goal.career_field, match: matchCareerFaculties(data, goal.career_field) || matchGoalFaculties(data, goal.career_field) },
  ];
  const seen = new Set();
  return raw.filter((t) => {
    if (!t.match) return false;
    const key = t.match.rows.map((r) => r.name).sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
export const hasGoal = (goal) => Boolean(goal && [goal.faculty_name, goal.career_field, goal.goal_text].some((v) => String(v || "").trim()));

// ---------- ความสอดคล้องแบบรองรับคะแนนเท่ากัน ----------
// เกณฑ์เดียวกับ alignOne แต่ "อันดับ" นับแบบคะแนนเท่ากันได้อันดับเดียวกัน (เช่น I = A = 36 อยู่อันดับ 3 ร่วมกัน → ทั้งคู่อยู่ใน 3 ด้านแรก)
// และ "สาขาที่รหัสแนะนำ" นับรวมรหัสทางเลือกที่เกิดจากคะแนนเท่ากัน
const alignResult = (data, faculty, result) => {
  const codes = [result.code, ...(result.alternativeCodes || [])];
  const viaCode = codes.find((c) => facultiesForCode(data, c).some((x) => x.rows.some((r) => r.name === faculty.name)));
  const rank = denseRank(result.scores, faculty.dim);
  const tied = tiedWith(result.scores, faculty.dim);
  const base = { faculty, rank, tied, viaCode: viaCode || null };
  if (viaCode) return { ...base, level: "high", reason: "recommended" };
  if (rank === 1) return { ...base, level: "high", reason: "top" };
  if (rank <= 3) return { ...base, level: "medium", reason: "secondary" };
  return { ...base, level: "low", reason: "outside" };
};

// ด้านเด่นของนักเรียน (อันดับ ≤ maxRank แบบนับคะแนนเท่ากัน)
export const topDims = (result, maxRank = 3) => RIASEC_ORDER.filter((c) => denseRank(result.scores, c) <= maxRank);

// สาขาทางเลือกเพิ่มเติม: ต้องเกี่ยวกับทั้ง "เป้าหมาย" และ "ความสนใจของนักเรียน" พร้อมเหตุผลจากไฟล์ข้อมูล
// - อยู่กลุ่มด้านเดียวกับสาขาเป้าหมาย (เป้าหมายด้าน A → ทางเลือกต้องเป็นสาขาด้าน A ไม่ใช่สาขาด้าน S ที่บังเอิญมีตัว A ในรหัส)
// - ไฟล์จับคู่สาขานั้นกับรหัสที่มีทั้งด้านของเป้าหมายและด้านเด่นของนักเรียน
// - ใช้วิชาหลักร่วมกับเป้าหมาย หรือมีอาชีพปลายทางเดียวกัน • ไม่พบ = ไม่แสดง (ไม่สร้างคำแนะนำเอง)
// ---------- งานของสาขา (อาชีพ + ทักษะจากไฟล์) ----------
// แตกข้อความในไฟล์เป็นหน่วยย่อย: อาชีพแต่ละตัว และทักษะแต่ละข้อ / คุณลักษณะแต่ละวลี
const skillUnits = (f) => f.skills.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
const traitUnits = (f) => f.traits.split(/\s+และ|\s+/).map((x) => x.replace(/^และ/, "").trim()).filter((x) => x.length > 2);
const workUnits = (f) => [...f.careers, ...skillUnits(f)];

// คำบอกลักษณะงานเฉพาะทาง ใช้ช่วยหาว่าสองสาขาทำงานคล้ายกันหรือไม่ (ข้อความที่แสดงมาจากไฟล์ทั้งหมด)
// ไม่ใส่คำกว้าง ๆ ที่แทบทุกสาขามี เช่น ครู/สอน/วิจัย/ผู้จัดการ/ระบบ
// "สี" ต้องเป็นคำเดี่ยว (ไม่ใช่ส่วนหนึ่งของ "เสี่ยง") — label ใช้ตอนแสดงผล
const COLOR_KW = Object.assign(/(?<!รัง)สี(?=$|[\s,/]|และ)/, { label: "สี" });
const WORK_KW = [
  "วาด", "ภาพประกอบ", "ศิลปะ", "ออกแบบ", "กราฟิก", COLOR_KW, "องค์ประกอบ", "3 มิติ", "วัสดุ", "สเก็ตช์", "ร่างแบบ", "เขียนแบบ",
  "ภายใน", "ผลิตภัณฑ์", "บรรจุภัณฑ์", "แบรนด์", "วิดีโอ", "ตัดต่อ", "เล่าเรื่อง", "คอนเทนต์", "ภาพยนตร์", "แอนิเมชัน", "ถ่ายภาพ", "ดนตรี",
  "แสดง", "ข่าว", "แปล", "ภาษา", "เด็ก", "เกม", "ซอฟต์แวร์", "เขียนโปรแกรม", "ข้อมูล", "สถิติ", "AI", "ผู้ป่วย", "เภสัช", "แพทย์", /(?<!โรง)พยาบาล/,
  "สุขภาพ", "ฟื้นฟู", "กายภาพ", "รังสี", "ห้องปฏิบัติการ", "ชีว", "เคมี", "กฎหมาย", "บัญชี", "ภาษี", "การเงิน", "ธนาคาร", "การลงทุน", "การตลาด",
  "นโยบาย", "ชุมชน", "จิตวิทยา", "กีฬา", "อาหาร", "โภชนา", "สัตว์", "พืช", "ป่าไม้", "ประมง", "เกษตร", "สิ่งแวดล้อม", "ก่อสร้าง", "ไฟฟ้า",
  "เครื่องจักร", "ยานยนต์", "การบิน", "โลจิสติกส์", "โรงแรม", "ท่องเที่ยว", "อีเวนต์", "ประชาสัมพันธ์", "ความปลอดภัย", "UX", "หน้าจอ", "อัญมณี", "เครือข่าย",
];
const kwHit = (k, text) => (typeof k === "string" ? text.includes(k) : k.test(text));
const KW_LABEL = { ออกแบบ: "การออกแบบ", ชีว: "ชีววิทยา", โภชนา: "โภชนาการ", แสดง: "การแสดง", แปล: "การแปล", เขียนโปรแกรม: "การเขียนโปรแกรม" };
const kwLabel = (k) => (typeof k === "string" ? KW_LABEL[k] || k : k.label || String(k));

// ---------- ความสนใจของนักเรียน ↔ สิ่งที่สาขาต้องการ ----------
// คำช่วยจับคู่ด้าน RIASEC กับวลีในไฟล์คณะ (คุณลักษณะที่คณะต้องการ + ทักษะที่ควรพัฒนา)
const DIM_KW = {
  A: ["สร้างสรรค์", "จินตนาการ", "ออกแบบ", "ศิลปะ", "ผลงาน", "แสดงออก", "วาด", "ร่างแบบ", "เขียนแบบ", /(?<!สุข|กาย|ส|คุณ)ภาพ/, "เล่าเรื่อง", "องค์ประกอบ", "ดนตรี", "การแสดง", "นาฏศิลป์", "ตัดต่อ", "แอนิเมชัน", "กราฟิก", "แฟชั่น", "การเขียน", "การใช้ภาษา", "พื้นที่", COLOR_KW],
  I: ["วิเคราะห์", "ตรรกะ", "แก้ปัญหา", "วิทยาศาสตร์", "ค้นคว้า", "ทดลอง", "คำนวณ", "คณิตศาสตร์", "ช่างสังเกต", "การสังเกต", "วิจัย", "เหตุผล", "ตีความ", "สถิติ", "ชีววิทยา", "เคมี", "ฟิสิกส์", "กายวิภาค", "สรีรวิทยา", "นิเวศ", "โภชนศาสตร์", "ข้อเท็จจริง", "เขียนโปรแกรม", "อัลกอริทึม"],
  S: ["สื่อสาร", "ดูแล", "ช่วยเหลือ", "เข้าใจผู้", "ผู้อื่น", "สอน", "ผู้เรียน", "ผู้ป่วย", "ชุมชน", "ทำงานร่วม", "เป็นทีม", "เป็นคณะ", "บริการ", "สัมภาษณ์", "เห็นอกเห็นใจ", "เข้าใจคน", "เข้าใจมนุษย์", "การฟัง", "รับฟัง", "เข้าใจเด็ก", "พัฒนาการเด็ก", "ให้ความรู้", "ให้คำปรึกษา", "ทำงานกับคน", "อ่อนโยน", "ใส่ใจสังคม"],
  E: ["ผู้นำ", "นำเสนอ", "โน้มน้าว", "ตัดสินใจ", "บริหาร", "เจรจา", "ธุรกิจ", "การตลาด", "แบรนด์", "การจัดการ", "ประสานงาน", "โต้แย้ง", "กลยุทธ์", "การเมือง", "จัดกิจกรรม", "เขียนโครงการ"],
  C: [/ละเอียด(?!อ่อน)/, "รอบคอบ", "เป็นระบบ", "ขั้นตอน", "มาตรฐาน", "รับผิดชอบ", "ระเบียบ", "วินัย", "บัญชี", "ข้อมูล", "คุณภาพ", "วางแผน", "ประเมินความเสี่ยง", "ความประณีต", "รักษาความลับ", "ตัวเลข", "กฎหมาย"],
  R: ["ลงมือ", "ปฏิบัติ", "เครื่องมือ", "งานช่าง", "ภาคสนาม", "ตัดเย็บ", "โมเดล", "วัสดุ", "เครื่องจักร", "ร่างกาย", "ประกอบอาหาร", "ทักษะกีฬา", "ต้นแบบ", "วงจรไฟฟ้า", "ฮาร์ดแวร์"],
};

// วลีของสาขา (คุณลักษณะที่คณะต้องการ + ทักษะที่ควรพัฒนา) จัดให้ "ด้านที่วลีนั้นสื่อถึงจริง" เพียงด้านเดียว
// โดยพิจารณาทั้ง 6 ด้าน (ด้านหลักของสาขาก่อน) แล้วจึงดูว่าด้านนั้นเป็นความสนใจเด่นของนักเรียนหรือไม่
// → "การสื่อสารด้วยภาพ" เป็นของด้าน A (ภาพ) ไม่ถูกยกให้ด้าน S เพียงเพราะมีคำว่า "สื่อสาร"
// คืน [{ code, phrases, mine }] — mine = ด้านนี้เป็นความสนใจเด่นของนักเรียน (อันดับ ≤ 3 แบบนับคะแนนเท่ากัน)
export const interestLinks = (data, result, faculty) => {
  const mine = topDims(result);
  const order = [faculty.dim, ...RIASEC_ORDER.filter((c) => c !== faculty.dim).sort((a, b) => result.scores[b] - result.scores[a])];
  const units = [...traitUnits(faculty), ...skillUnits(faculty)];
  const groups = new Map();
  const used = [];
  units.forEach((u) => {
    // ไม่นับวลีที่ซ้อนกับวลีที่เลือกแล้ว (เช่น "การคิดวิเคราะห์" กับ "การคิดวิเคราะห์เชิงเหตุผล")
    if (used.some((x) => x.includes(u) || u.includes(x))) return;
    const owner = order.find((c) => DIM_KW[c].some((k) => kwHit(k, u)));
    if (!owner) return;
    used.push(u);
    groups.set(owner, [...(groups.get(owner) || []), u]);
  });
  return order.filter((c) => groups.has(c)).map((code) => ({ code, phrases: groups.get(code), mine: mine.includes(code) }));
};

// สาขาทางเลือกเพิ่มเติม — แสดงเฉพาะสาขาที่มีข้อมูลรองรับครบทั้งสองข้อ:
// 1) ตารางรหัสของงานแนะแนวจัดสาขานั้นไว้คู่กับสาขาเป้าหมาย (อยู่ในรหัสเดียวกัน) และรหัสนั้นมีด้านเด่นของนักเรียน
// 2) งานใกล้กับเป้าหมายจริง: อาชีพ/ทักษะในไฟล์มีลักษณะงานเฉพาะทางร่วมกัน
// ไม่พบ = ไม่แสดง (ไม่สร้างคำแนะนำเอง)
export const relatedAlternatives = (data, result, goalFaculty, excludeNames = [], limit = 3) => {
  const mine = topDims(result);
  const goalText = workUnits(goalFaculty).join(" ");
  const goalKw = WORK_KW.filter((k) => kwHit(k, goalText));
  const found = new Map();
  Object.entries(data.codes).forEach(([code, entry]) => {
    if (!entry.faculties.includes(goalFaculty.name)) return;
    const shared = code.split("").filter((c) => mine.includes(c));
    if (!shared.length) return;
    facultiesForCode(data, code).forEach((f) =>
      f.rows.forEach((r) => {
        if (r.name === goalFaculty.name || excludeNames.includes(r.name)) return;
        const cur = found.get(r.name) || { row: r, codes: [], dims: new Set() };
        cur.codes.push(code);
        code.split("").forEach((c) => (mine.includes(c) || c === goalFaculty.dim) && cur.dims.add(c));
        found.set(r.name, cur);
      })
    );
  });
  return [...found.values()]
    .map((x) => {
      const kws = goalKw.filter((k) => workUnits(x.row).some((u) => kwHit(k, u)));
      const units = workUnits(x.row);
      return {
        row: x.row,
        codes: x.codes,
        dims: RIASEC_ORDER.filter((c) => x.dims.has(c)),
        // ลักษณะงานที่เหมือนเป้าหมาย (คำ) และอาชีพ/ทักษะของสาขาทางเลือกที่มีคำนั้น (ข้อความจากไฟล์)
        shared: kws.map(kwLabel),
        work: units.filter((u) => kws.some((k) => kwHit(k, u))).slice(0, 3),
        // ส่วนที่ต่างจากเป้าหมาย: ทักษะของสาขาทางเลือกที่ไม่เกี่ยวกับงานร่วม (ช่วยให้นักเรียนเปรียบเทียบ)
        differs: skillUnits(x.row).filter((u) => !kws.some((k) => kwHit(k, u))).slice(0, 2),
      };
    })
    .filter((x) => x.work.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || b.codes.length - a.codes.length)
    .slice(0, limit);
};

// วิเคราะห์ความสอดคล้องของเป้าหมาย 1 รายการกับผล RIASEC (รองรับคะแนนเท่ากัน)
export const analyzeTarget = (data, result, target) => {
  const evaluated = target.match.rows.map((f) => alignResult(data, f, result));
  evaluated.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);
  const best = evaluated[0];
  return {
    ...best,
    source: target.source,
    input: target.input,
    label: target.match.label,
    candidates: target.match.rows,
    dimScore: result.scores[best.faculty.dim],
    dimRank: best.rank,
    alternatives: relatedAlternatives(data, result, best.faculty, target.match.rows.map((r) => r.name)),
  };
};

// ---------- คำแนะนำเฉพาะบุคคล ----------
// ทุกข้อความมาจากคอลัมน์ในไฟล์ข้อมูลคณะ–อาชีพ (Excel) ของ "คณะในเป้าหมายที่นักเรียนตั้ง" เท่านั้น
// ถ้ายังไม่ตั้งเป้าหมาย/หาคณะในไฟล์ไม่เจอ จึงใช้คณะที่ไฟล์จับคู่กับรหัส RIASEC ของนักเรียนแทน (และบอกนักเรียนตรง ๆ)
export const personalAdvice = (data, result, analyses = []) => {
  const goalRows = [...new Map(analyses.map((a) => [a.faculty.name, a.faculty])).values()];
  const usesGoal = goalRows.length > 0;
  const focus = usesGoal ? goalRows : facultiesForCode(data, result.code).flatMap((f) => f.rows).slice(0, 2);
  // ด้านของเป้าหมายที่ยังไม่อยู่ใน 3 อันดับแรก → ลักษณะเด่นของด้านนั้นจากชีต "คู่มือมิติ RIASEC"
  const toExplore = [...new Set(goalRows.map((f) => f.dim))]
    .filter((d) => !result.code.includes(d))
    .map((d) => ({ code: d, traits: data.dimensions[d].traits, score: result.scores[d] }));
  return {
    usesGoal,
    focus,
    perFaculty: focus.map((f) => ({
      name: f.name,
      dim: f.dim,
      subjects: f.subjects, // วิชาที่ควรเน้น
      skills: f.skills, // ทักษะที่ควรพัฒนา
      traits: f.traits, // ลักษณะ/คุณลักษณะที่คณะต้องการ
      advice: f.advice, // คำแนะนำสำหรับนักเรียน
      track: f.track, // สายการเรียนที่แนะนำ
      exam: f.exam, // สิ่งที่ควรเตรียมสอบ
      universities: f.universities, // มหาวิทยาลัยตัวอย่าง
      careers: f.careers, // อาชีพที่เกี่ยวข้อง
      programs: f.programs, // หลักสูตรที่พบใน myTCAS
      link: f.links[0] || null,
    })),
    toExplore,
  };
};

// ---------- ลำดับแบบรองรับคะแนนเท่ากัน ----------
// อันดับ = 1 + จำนวนด้านที่ได้คะแนนมากกว่า (ด้านที่คะแนนเท่ากันได้อันดับเดียวกัน)
export const denseRank = (scores, c) => 1 + RIASEC_ORDER.filter((x) => scores[x] > scores[c]).length;
export const tiedWith = (scores, c) => RIASEC_ORDER.filter((x) => x !== c && scores[x] === scores[c]);

// ---------- ส่วน B: คำแนะนำจากผล RIASEC (ไม่ขึ้นกับเป้าหมาย) ----------
// ใช้ข้อมูลจริงจากไฟล์: ลักษณะเด่นของ 3 ด้านแรก, ความหมายของรหัส, และคอลัมน์ "คำแนะนำสำหรับนักเรียน" / "ทักษะที่ควรพัฒนา"
// ของสาขาที่ไฟล์จับคู่กับรหัสของนักเรียน — ไม่รวมสาขาที่อยู่ในเป้าหมายแล้ว (ส่วน A แสดงอยู่) เพื่อไม่ให้ซ้ำ
export const riasecAdvice = (data, result, excludeNames = []) => {
  const codes = [result.code, ...result.alternativeCodes];
  const rows = [];
  codes.forEach((code) =>
    facultiesForCode(data, code).forEach((f) =>
      f.rows.forEach((r) => {
        if (!excludeNames.includes(r.name) && !rows.some((x) => x.row.name === r.name)) rows.push({ row: r, code });
      })
    )
  );
  // สาขาที่อยู่กลุ่มด้านเด่นอันดับต้นของนักเรียนมาก่อน (ไม่ใช้ลำดับในไฟล์)
  const w = (dim) => Math.max(0, 4 - denseRank(result.scores, dim));
  rows.sort((a, b) => w(b.row.dim) - w(a.row.dim));
  return {
    strengths: result.code.split("").map((c) => ({ code: c, traits: data.dimensions[c].traits, rank: denseRank(result.scores, c), tied: tiedWith(result.scores, c) })),
    workStyles: codes.map((c) => ({ code: c, meaning: data.codes[c].meaning })),
    activities: rows.slice(0, 3).map(({ row }) => ({ faculty: row.name, text: row.advice })),
    skills: rows.slice(0, 3).map(({ row }) => ({ faculty: row.name, text: row.skills })),
    explore: rows,
  };
};

// ---------- อาชีพที่เกี่ยวข้อง (ไม่เกิน 3) ----------
// แถวคณะที่มีอาชีพนี้ — ตรงตัวก่อน ไม่งั้นใช้ชื่อที่ขึ้นต้นเหมือนกันอย่างน้อย 4 ตัวอักษร
// (ไฟล์เขียนชื่ออาชีพต่างกันเล็กน้อยระหว่างชีต เช่น "พยาบาล" กับ "พยาบาลวิชาชีพ", "เภสัชกรชุมชน" กับ "เภสัชกรโรงพยาบาล")
const commonPrefix = (a, b) => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
};
const careerFacultyRows = (data, career, within = data.faculties) => {
  const exact = within.filter((f) => f.careers.includes(career));
  if (exact.length) return exact;
  return within.filter((f) => f.careers.some((c) => commonPrefix(c, career) >= Math.min(4, career.length)));
};

// 4.1 ใต้ผล RIASEC: อาชีพของรหัส (ตาราง 120 รหัส) มาก่อน แล้วจึงอาชีพของสาขาที่รหัสแนะนำ
// เรียงตามความสัมพันธ์: อยู่ในรายการของรหัสโดยตรง + สาขาที่อาชีพนั้นอยู่ตรงกับด้านอันดับสูงของนักเรียน
export const careersForResult = (data, result, limit = 3) => {
  // น้ำหนักตามอันดับแบบนับคะแนนเท่ากัน (ด้านที่เสมอกันได้น้ำหนักเท่ากัน)
  const weight = (dim) => Math.max(0, 4 - denseRank(result.scores, dim));
  // คะแนนเท่ากัน → รหัสทางเลือกมีน้ำหนักเท่ารหัสหลัก (ลำดับรหัสหลักมาจากการเรียงตามหกเหลี่ยม ไม่ใช่ความต่างของความสนใจ)
  const codes = [result.code, ...(result.alternativeCodes || [])];
  const recommended = [...new Set(codes.flatMap((c) => facultiesForCode(data, c).flatMap((f) => f.rows)))];
  const cand = new Map();
  const add = (career, base, via) => {
    const near = careerFacultyRows(data, career, recommended);
    const rows = near.length ? near : careerFacultyRows(data, career);
    const best = rows.sort((a, b) => weight(b.dim) - weight(a.dim))[0] || via || null;
    const score = base + (best ? weight(best.dim) : 0);
    const cur = cand.get(career);
    if (!cur || score > cur.score) cand.set(career, { title: career, score, faculty: best, source: base >= 10 ? "code" : "faculty" });
  };
  codes.forEach((code) => data.codes[code].careers.forEach((c) => add(c, 10)));
  recommended.forEach((r) => r.careers.forEach((c) => add(c, 0, r)));
  return [...cand.values()].sort((a, b) => b.score - a.score).slice(0, limit);
};

// 4.2 ใต้คำแนะนำตามเป้าหมาย: (1) อาชีพที่นักเรียนตั้งไว้ ถ้ามีในข้อมูลของสาขาเป้าหมาย
// (2) อาชีพอื่นของสาขาเดียวกัน (สาขาที่มีอาชีพเป้าหมาย หรือสาขาแรกของเป้าหมาย)
// (3) ถ้าเป้าหมายมีหลายสาขา สลับหยิบทีละสาขา — ไม่เติมอาชีพจากสาขาอื่นที่นักเรียนไม่ได้เลือก ถ้ามีไม่ครบ 3 ก็แสดงเท่าที่มี
export const careersForGoal = (data, result, goalRows, careerText, limit = 3) => {
  const out = [];
  const push = (title, source, faculty) => {
    if (out.length < limit && !out.some((x) => x.title === title)) out.push({ title, source, faculty });
  };
  const mine = String(careerText || "").trim();
  const isMine = (c) => Boolean(mine) && (c === mine || c.startsWith(mine) || mine.includes(c));
  const primary = goalRows.find((f) => f.careers.some(isMine)) || goalRows[0];
  if (!primary) return out;
  primary.careers.filter(isMine).forEach((c) => push(c, "goal", primary));
  // เป้าหมายมีหลายสาขา (เช่น คณะ + สาขาจากข้อความเป้าหมาย) → สลับหยิบทีละสาขา ให้ทุกสาขาในเป้าหมายมีอาชีพแสดง
  const rows = [primary, ...goalRows.filter((f) => f !== primary)];
  const depth = Math.max(...rows.map((f) => f.careers.length));
  for (let i = 0; i < depth; i++) rows.forEach((f) => f.careers[i] && push(f.careers[i], isMine(f.careers[i]) ? "goal" : "faculty", f));
  return out;
};


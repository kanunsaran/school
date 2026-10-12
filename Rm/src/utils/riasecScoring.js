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

// สาขาเชื่อม: คณะที่ไฟล์จับคู่ไว้กับรหัสซึ่งมีทั้งด้านเด่นอันดับ 1 ของนักเรียน และด้านของเป้าหมาย
// (เช่น นักเรียน S… ที่ตั้งเป้าหมายด้าน A → รหัส SA?, S?A → ศิลปศึกษา, กิจกรรมบำบัด …)
export const bridgeFaculties = (data, studentCode, goalDim, excludeNames = [], limit = 3) => {
  const top = studentCode[0];
  if (!goalDim || goalDim === top) return [];
  const count = new Map();
  Object.keys(data.codes)
    .filter((c) => c[0] === top && c.includes(goalDim))
    .forEach((c) =>
      facultiesForCode(data, c).forEach((f) =>
        f.rows.forEach((r) => {
          if (excludeNames.includes(r.name)) return;
          const cur = count.get(r.name) || { row: r, codes: [] };
          cur.codes.push(c);
          count.set(r.name, cur);
        })
      )
    );
  return [...count.values()].sort((a, b) => b.codes.length - a.codes.length).slice(0, limit);
};

// วิเคราะห์ความสอดคล้องของเป้าหมาย 1 รายการกับผล RIASEC (ใช้เกณฑ์เดียวกับ goalAlignment)
export const analyzeTarget = (data, result, target) => {
  const evaluated = target.match.rows.map((f) => alignOne(data, f, result.code));
  evaluated.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);
  const best = evaluated[0];
  const dim = best.faculty.dim;
  return {
    ...best,
    source: target.source,
    input: target.input,
    label: target.match.label,
    candidates: target.match.rows,
    dimScore: result.scores[dim],
    dimRank: result.ranked.indexOf(dim) + 1,
    // สาขาเชื่อมแสดงเฉพาะเมื่อด้านของเป้าหมายไม่อยู่ใน 3 อันดับแรก
    bridges: best.level !== "low" ? [] : bridgeFaculties(data, result.code, dim, target.match.rows.map((r) => r.name)),
  };
};

// ---------- คำแนะนำเฉพาะบุคคล (เลือกข้อความจากคอลัมน์ในไฟล์ ไม่แต่งข้อมูลใหม่) ----------
// focus = แถวคณะที่ใช้เป็นหลัก: คณะเป้าหมาย (ถ้ามี) ไม่งั้นคณะแรกที่รหัสแนะนำ
export const personalAdvice = (data, result, analyses = []) => {
  const recommendedRows = facultiesForCode(data, result.code).flatMap((f) => f.rows);
  const goalRows = analyses.map((a) => a.faculty);
  const focusRows = goalRows.length ? goalRows : recommendedRows.slice(0, 1);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];

  // วิชาที่คณะซึ่งตรงกับรหัสใช้บ่อยที่สุด (นับจากคอลัมน์ "วิชาที่ควรเน้น")
  const freq = {};
  recommendedRows.forEach((r) => r.subjects.forEach((s) => (freq[s] = (freq[s] || 0) + 1)));
  const commonSubjects = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s);

  const weakGoalDims = uniq(analyses.filter((a) => a.level !== "high").map((a) => a.faculty.dim));
  return {
    usesGoal: goalRows.length > 0,
    focus: focusRows,
    study: {
      focusSubjects: focusRows.map((r) => ({ faculty: r.name, subjects: r.subjects })),
      commonSubjects,
    },
    skills: {
      strengths: result.code.split("").map((c) => ({ code: c, traits: data.dimensions[c].traits })),
      focusSkills: focusRows.map((r) => ({ faculty: r.name, skills: r.skills, traits: r.traits })),
      // ด้านของเป้าหมายที่ยังไม่อยู่ใน 3 อันดับแรก → ลักษณะของด้านนั้นตามคู่มือมิติ
      toExplore: weakGoalDims.filter((d) => !result.code.includes(d)).map((d) => ({ code: d, traits: data.dimensions[d].traits, score: result.scores[d] })),
    },
    activities: uniq([...focusRows, ...recommendedRows].map((r) => r.advice)).slice(0, 4).map((text) => ({
      text,
      faculty: [...focusRows, ...recommendedRows].find((r) => r.advice === text).name,
    })),
    prepare: focusRows.map((r) => ({ faculty: r.name, track: r.track, exam: r.exam, universities: r.universities, link: r.links[0] || null })),
    careers: {
      fromGoal: uniq(focusRows.flatMap((r) => r.careers)),
      fromCode: data.codes[result.code].careers,
    },
  };
};

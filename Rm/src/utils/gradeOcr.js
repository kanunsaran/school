import { prepareImage, detectGrids, zoomGrid, inkRatio, cleanText } from "./scheduleOcr.js";

// อ่าน "ผลการเรียน" จากรูปแคปหน้าจอระบบเกรดของโรงเรียน (ตาราง: รหัสวิชา | ชื่อวิชา | หน่วยกิต | คะแนน… | ผลการเรียน (ปกติ/แก้ตัว/เรียนซ้ำ/เกรด))
// หาเส้นตาราง → อ่านเฉพาะช่องที่ใช้ทีละช่อง (ตัวเลขอ่านแบบตัวเลขล้วน แม่นกว่าอ่านทั้งรูป) → ให้นักเรียนตรวจ/แก้ก่อนบันทึก

export const GRADE_OPTIONS = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0", "ร", "มส", "ผ", "มผ"];
export const NUMERIC_GRADES = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"];

// ตัวอักษรนำหน้ารหัสวิชา (หลักสูตรแกนกลางฯ) → กลุ่มสาระ
export const GROUP_BY_PREFIX = {
  ท: "ภาษาไทย",
  ค: "คณิตศาสตร์",
  ว: "วิทยาศาสตร์",
  ส: "สังคมศึกษา",
  พ: "สุขศึกษาและพลศึกษา",
  ศ: "ศิลปะ",
  ง: "การงานอาชีพ",
  อ: "ภาษาอังกฤษ",
  จ: "ภาษาต่างประเทศ",
  ญ: "ภาษาต่างประเทศ",
  ฝ: "ภาษาต่างประเทศ",
  ข: "ภาษาต่างประเทศ",
  ย: "ภาษาต่างประเทศ",
  I: "การศึกษาค้นคว้า (IS)",
  ก: "กิจกรรมพัฒนาผู้เรียน",
};
// ชื่อวิชา → ตัวอักษรนำหน้า (ใช้เมื่อ OCR อ่านตัวอักษรนำหน้ารหัสผิด)
const PREFIX_BY_NAME = [
  [/แนะแนว|กิจกรรม|ส่งเสริม|ลูกเสือ|ชุมนุม|บำเพ็ญ/, "ก"],
  [/IS|ค้นคว้า|องค์ความรู้|สื่อสารและการนำเสนอ/, "I"],
  [/อังกฤษ/, "อ"],
  [/จีน/, "จ"],
  [/ญี่ปุ่น|ญี่ปุน/, "ญ"],
  [/ฝรั่งเศส/, "ฝ"],
  [/เกาหลี/, "ข"],
  [/คณิต/, "ค"],
  [/การงาน|อาชีพ/, "ง"],
  [/วิทยาศาสตร์|ฟิสิกส์|เคมี|ชีว|โลก|ดาราศาสตร์|เทคโนโลยี|วิทยาการคำนวณ|ออกแบบ/, "ว"],
  [/สังคม|ประวัติ|หน้าที่|พลเมือง|ทุจริต|ศาสนา|เศรษฐ|ภูมิศาสตร์/, "ส"],
  [/สุขศึกษา|พลศึกษา|กีฬา/, "พ"],
  [/ศิลป|สิลป|ศิลบ|ดนตรี|นาฏ/, "ศ"],
  [/ภาษาไทย|วรรณ/, "ท"],
];
export const prefixFromName = (name) => PREFIX_BY_NAME.find(([re]) => re.test(name || ""))?.[1] || null;

// "35" → 3.5, "05" → 0.5, "10" → 1.0 (OCR มักทำจุดหาย); หน่วยกิตกิจกรรมเป็นชั่วโมง เช่น 20.0
const fixDecimal = (raw) => {
  const t = String(raw || "").replace(/[^\d.]/g, "");
  if (!t) return null;
  if (t.includes(".")) return Number(t);
  if (t.length === 2) return Number(`${t[0]}.${t[1]}`);
  if (t.length === 3 && t.endsWith("0")) return Number(`${t.slice(0, 2)}.${t[2]}`);
  return Number(t);
};
export const normalizeGrade = (raw) => {
  const txt = String(raw || "").trim();
  if (/มผ/.test(txt)) return "มผ";
  if (/มส/.test(txt)) return "มส";
  if (/^ผ/.test(txt)) return "ผ";
  if (/^ร/.test(txt) && !/\d/.test(txt)) return "ร";
  const n = fixDecimal(txt);
  if (n == null || Number.isNaN(n)) return "";
  const s = String(n);
  return NUMERIC_GRADES.includes(s) ? s : "";
};
export const normalizeCredit = (raw) => {
  const n = fixDecimal(raw);
  return n == null || Number.isNaN(n) || n <= 0 || n > 40 ? null : n;
};

// ---------- คำนวณ ----------
// วิชาที่นับเกรด = มีเกรดตัวเลข และไม่ใช่กิจกรรม (ก)
const counts = (c) => NUMERIC_GRADES.includes(String(c.grade)) && c.code?.[0] !== "ก" && Number(c.credit) > 0;
const weighted = (list) => {
  const cr = list.reduce((a, c) => a + Number(c.credit), 0);
  return cr ? Math.floor((list.reduce((a, c) => a + Number(c.credit) * Number(c.grade), 0) / cr) * 100) / 100 : null;
};
// GPA ของภาคเรียน (ถ่วงน้ำหนักด้วยหน่วยกิต ตัดทศนิยม 2 ตำแหน่งแบบระบบโรงเรียน)
export const termGpa = (courses) => weighted((courses || []).filter(counts));
export const groupOf = (code) => GROUP_BY_PREFIX[String(code || "")[0]] || null;

// เดาภาคเรียนจากรหัสวิชา: ท 3 1 1 0 1 → ม.ปลาย ปีที่ 1 (ม.4), เลขท้ายคี่ = ภาค 1 / คู่ = ภาค 2 (ใช้วิชาพื้นฐานที่ระบุปี)
export const guessTerm = (courses) => {
  const votes = {};
  (courses || []).forEach((c) => {
    const m = String(c.code || "").match(/^[^\d]{1,2}(\d)(\d)(\d)(\d{2})$/);
    if (!m || m[1] !== "3" || m[2] === "0") return;
    const t = `${Number(m[2]) + 3}/${Number(m[4]) % 2 === 1 ? 1 : 2}`;
    votes[t] = (votes[t] || 0) + 1;
  });
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
};

// ---------- OCR ----------
// ช่วง y ที่มีตัวหนังสือในคอลัมน์ (ตัดเส้นตารางที่ลากเต็มความกว้างทิ้ง) → 1 ช่วง = 1 แถววิชา
const textBands = (gray, w, x0, x1, y0, y1, th) => {
  const width = Math.max(1, x1 - x0);
  const rows = [];
  for (let y = y0; y < y1; y++) {
    let n = 0;
    for (let x = x0; x < x1; x++) if (gray[(y * w + x) * 4] < th) n++;
    rows.push(n > 0 && n < width * 0.7 ? n : 0); // แถวที่มืดเกือบเต็ม = เส้นตาราง
  }
  const bands = [];
  let start = -1;
  rows.forEach((n, i) => {
    if (n && start < 0) start = i;
    if ((!n || i === rows.length - 1) && start >= 0) {
      bands.push({ top: y0 + start, h: i - start });
      start = -1;
    }
  });
  // รวมช่วงที่ห่างกันน้อย (สระบน/ล่างของภาษาไทย) แล้วตัดช่วงเล็กเกิน (สิ่งรบกวน)
  const merged = [];
  const typical = [...bands].sort((a, b) => b.h - a.h)[Math.floor(bands.length / 3)]?.h || 20;
  bands.forEach((b) => {
    const last = merged[merged.length - 1];
    if (last && b.top - (last.top + last.h) < typical * 0.35) last.h = b.top + b.h - last.top;
    else merged.push({ ...b });
  });
  return merged.filter((b) => b.h >= typical * 0.4);
};

// รหัสวิชา เช่น "ว31181" — OCR อาจอ่านตัวนำหน้าเป็นอักษรละติน หรืออ่าน I เป็น 1
const LATIN_PREFIX = { w: "พ", W: "พ", l: "I", "|": "I", i: "I" };
export const parseCode = (text) => {
  const t = String(text || "").replace(/\s+/g, "");
  const m = t.match(/([^\d]?)(\d{5,6})/);
  if (!m) return null;
  let digits = m[2];
  let prefix = m[1];
  if (digits.length === 6) {
    if (!GROUP_BY_PREFIX[prefix] && digits[0] === "1") prefix = "I";
    digits = digits.slice(-5);
  }
  prefix = LATIN_PREFIX[prefix] || prefix;
  return { prefix, digits };
};
const DIGIT_PARAMS = { tessedit_char_whitelist: "0123456789.", tessedit_pageseg_mode: "7" };
const TEXT_PARAMS = { tessedit_char_whitelist: "", tessedit_pageseg_mode: "7" };

const pickTable = (grids) => [...grids].sort((a, b) => b.ys.length * b.xs.length - a.ys.length * a.xs.length)[0];

export const readGradeReport = async (file, onProgress) => {
  const { createWorker } = await import("tesseract.js");
  const canvas = await prepareImage(file);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const grids = detectGrids(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, canvas.inkThreshold);
  if (!grids.length) throw new Error("ไม่พบตารางในรูป — ลองแคปให้เห็นเส้นตารางชัด ๆ");
  // เส้นขอบซ้าย/ขวาของตารางในภาพแคปมักจางจนหาไม่เจอ → คอลัมน์รหัสวิชาหลุดไปอยู่นอกกริด
  // ถ้าด้านซ้ายของเส้นแรกมีตัวหนังสือ ให้เพิ่มคอลัมน์จากขอบรูปเข้าไป
  const table = pickTable(grids);
  const gray0 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const midRows = { top: table.ys[Math.floor(table.ys.length / 3)], height: table.ys[Math.floor((table.ys.length * 2) / 3)] - table.ys[Math.floor(table.ys.length / 3)] };
  if (table.xs[0] > 40 && inkRatio(gray0, canvas.width, { left: 4, width: table.xs[0] - 8, ...midRows }, canvas.inkThreshold) > 0.01) {
    table.xs = [2, ...table.xs];
  }
  const { target, grid } = zoomGrid(canvas, table);
  const gray = target.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, target.width, target.height).data;
  const { xs, ys } = grid;
  const nCols = xs.length - 1;
  const nRows = ys.length - 1;
  const pad = Math.max(3, Math.round(target.width / 500));
  const rectOf = (r, c) => ({ left: xs[c] + pad, top: ys[r] + pad, width: Math.max(1, xs[c + 1] - xs[c] - pad * 2), height: Math.max(1, ys[r + 1] - ys[r] - pad * 2) });
  const hasInk = (r, c) => {
    const rect = rectOf(r, c);
    return rect.width > 6 && rect.height > 6 && inkRatio(gray, target.width, rect, target.inkThreshold) > 0.002;
  };

  const worker = await createWorker("tha+eng", 1);
  let mode = null;
  const read = async (r, c, params) => {
    if (!hasInk(r, c)) return "";
    if (mode !== params) {
      await worker.setParameters(params);
      mode = params;
    }
    const { data } = await worker.recognize(target, { rectangle: rectOf(r, c) });
    return cleanText(data.text);
  };

  try {
    // หัวตาราง: หาคอลัมน์ "หน่วยกิต" และ "เกรด" (อ่าน 3 แถวแรก) — ไม่เจอใช้ตำแหน่งตามรูปแบบมาตรฐาน
    let creditCol = 2;
    let gradeCol = Math.max(3, nCols - 2);
    const headRows = Math.min(3, nRows);
    // อ่านเฉพาะคอลัมน์ที่น่าจะเป็นหน่วยกิต (ซ้าย) และผลการเรียน (ขวา) ให้เร็วขึ้น
    const headCols = [...new Set([1, 2, 3, ...Array.from({ length: 6 }, (_, i) => nCols - 1 - i)])].filter((c) => c >= 0 && c < nCols);
    for (const c of headCols) {
      for (let r = 0; r < headRows; r++) {
        const t = await read(r, c, TEXT_PARAMS);
        if (/หน่วย|กิต/.test(t)) creditCol = c;
        if (/เกรด/.test(t)) gradeCol = c;
      }
      onProgress?.((0.15 * (headCols.indexOf(c) + 1)) / headCols.length);
    }

    // แถวข้อมูล: ใช้แถบตัวหนังสือในคอลัมน์รหัสวิชา (เส้นแนวนอนบางเส้นจางจนหาไม่เจอ ทำให้ 2 วิชารวมเป็นแถวเดียว)
    // หาทั้งตาราง — แถวหัวตารางไม่มีรหัสวิชาจึงถูกข้ามเอง
    const bands = textBands(gray, target.width, xs[0] + pad, xs[1] - pad, ys[0] + pad, ys[nRows], target.inkThreshold);
    const rectAt = (band, c) => {
      const m = Math.round(band.h * 0.45);
      return { left: xs[c] + pad, top: Math.max(0, band.top - m), width: Math.max(1, xs[c + 1] - xs[c] - pad * 2), height: band.h + m * 2 };
    };
    const readAt = async (band, c, params) => {
      if (mode !== params) {
        await worker.setParameters(params);
        mode = params;
      }
      const { data } = await worker.recognize(target, { rectangle: rectAt(band, c) });
      return cleanText(data.text);
    };

    const courses = [];
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const codeText = await readAt(band, 0, TEXT_PARAMS);
      const code = parseCode(codeText);
      if (code) {
        const name = (await readAt(band, 1, TEXT_PARAMS)).replace(/^[([|'"]+/, "").trim();
        const ocrPrefix = code.prefix;
        const namePrefix = prefixFromName(name);
        const prefix = namePrefix && namePrefix !== ocrPrefix ? namePrefix : GROUP_BY_PREFIX[ocrPrefix] ? ocrPrefix : namePrefix || ocrPrefix;
        let credit = normalizeCredit(await readAt(band, creditCol, DIGIT_PARAMS));
        if (credit == null) credit = normalizeCredit(await readAt(band, creditCol, TEXT_PARAMS));
        let grade = normalizeGrade(await readAt(band, gradeCol, DIGIT_PARAMS));
        if (!grade) grade = normalizeGrade(await readAt(band, gradeCol, TEXT_PARAMS));
        if (!grade && prefix === "ก") grade = "ผ";
        courses.push({ code: `${prefix}${code.digits}`, name, credit, grade });
      }
      onProgress?.(0.15 + (0.85 * (i + 1)) / Math.max(1, bands.length));
    }
    return { courses, term: guessTerm(courses), gpa: termGpa(courses), info: { grid: `${nRows}x${nCols}`, creditCol, gradeCol } };
  } finally {
    await worker.terminate();
  }
};

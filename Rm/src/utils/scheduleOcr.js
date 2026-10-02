import { PERIOD_OPTIONS } from "./teachingScheduleStore.js";

// อ่านตารางสอนจากรูปด้วย OCR (Tesseract ทำงานในเบราว์เซอร์ ไม่ส่งรูปออกไปไหน)
// แนวคิด: หา "หัวแถววัน" (จันทร์..ศุกร์) และ "หัวคอลัมน์คาบ" (เลขคาบ 1-8 หรือเวลา 08.30) จากตำแหน่งคำในรูป
// แล้วจับคำที่เหลือลงช่อง (วัน, คาบ) ตามตำแหน่ง → ได้รายการคาบสอนให้ครูตรวจ/แก้ก่อนบันทึก

const PERIOD_COUNT = PERIOD_OPTIONS.length;

const norm = (t) => (t || "").replace(/[\s.:()[\]|]/g, "").toLowerCase();

// ชื่อวันเต็ม/ย่อ ไทย-อังกฤษ → 0=จันทร์ ... 4=ศุกร์ (ตัวย่อตัวเดียวใช้เฉพาะคำที่อยู่ซ้ายสุดของรูป)
const DAY_FULL = [
  [0, /^(วัน)?จันทร์|^mon/],
  [1, /^(วัน)?อังคาร|^tue/],
  [3, /^(วัน)?พฤหัส|^พฤ$|^thu/],
  [2, /^(วัน)?พุธ|^wed/],
  [4, /^(วัน)?ศุกร์|^fri/],
];
const DAY_SHORT = { จ: 0, อ: 1, พ: 2, พฤ: 3, ศ: 4 };

// ชิ้นส่วนชื่อวันที่ OCR มักอ่านออกแม้คำเพี้ยน (เช่น "พฤษหัสบดี", "ศกร์")
const DAY_PARTS = [
  [3, /พฤห|หัส|บดี|thu/],
  [0, /จันท|ันทร|mon/],
  [1, /อังค|องคา|ังคาร|tue/],
  [2, /พุธ|wed/],
  [4, /ศุก|ศก|กร์|ุกร|fri/],
];

export const detectDay = (text, isLeftmost) => {
  const t = norm(text);
  if (!t) return null;
  for (const [day, re] of DAY_FULL) if (re.test(t)) return day;
  if (isLeftmost && t in DAY_SHORT) return DAY_SHORT[t];
  if (isLeftmost) for (const [day, re] of DAY_PARTS) if (re.test(t)) return day;
  return null;
};

// แถวที่อ่านชื่อวันไม่ออก: เดาจากแถวข้างเคียง (วันเรียงจันทร์→ศุกร์) / ไม่เจอเลยแต่มี 5 แถว = จันทร์..ศุกร์
export const fillMissingDays = (days) => {
  const out = [...days];
  if (out.every((d) => d == null)) return out.length === 5 ? [0, 1, 2, 3, 4] : out;
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < out.length; i++) {
      if (out[i] != null) continue;
      const prev = out[i - 1];
      const next = out[i + 1];
      const guess = prev != null ? prev + 1 : next != null ? next - 1 : null;
      if (guess != null && guess >= 0 && guess <= 4 && !out.includes(guess)) out[i] = guess;
    }
  }
  return out;
};

// หัวคอลัมน์คาบ: "1".."8", "คาบ1", "คาบที่1" หรือเวลาเริ่มคาบ "08.30"/"8:30"
export const detectPeriod = (text) => {
  const raw = (text || "").trim();
  const t = norm(raw);
  const m = t.match(/^(?:คาบ(?:ที่)?)?([1-9])$/);
  if (m && +m[1] <= PERIOD_COUNT) return +m[1];
  const time = raw.match(/(\d{1,2})\s*[.:]\s*(\d{2})/);
  if (time) {
    const hhmm = `${time[1].padStart(2, "0")}:${time[2]}`;
    const p = PERIOD_OPTIONS.find((o) => o.time.startsWith(hhmm));
    if (p) return p.period;
  }
  return null;
};

const IGNORE_CELL = /พัก|lunch|break|เที่ยง/i;

// แยก "ห้อง" (เช่น ม.6/2, 6/12) ออกจากข้อความในช่อง ที่เหลือถือเป็นชื่อวิชา
export const splitCellText = (text) => {
  const roomRe = /(ม\.?\s*)?([1-6])\s*[/\\-]\s*(\d{1,2})(?!\d)/;
  // ไม่มีเลขห้อง แต่ระบุระดับชั้น เช่น "ม.3"
  const gradeRe = /ม\.\s*([1-6])(?!\s*[/\d])/;
  // OCR ทำ "/" หาย เช่น "3/17 335" → "317 335": ตัวเลข 2-3 หลักตามด้วยเลขห้องเรียน = ชั้น/ห้อง
  const lostSlash = /(^|\s)([1-6])(\d{1,2})(?=\s+\d{3,4}(\s|$))/;
  const ls = !text.match(roomRe) && text.match(lostSlash);
  if (ls) {
    return splitCellText(text.replace(ls[0], `${ls[1]}${ls[2]}/${ls[3]}`));
  }
  const m = text.match(roomRe) || text.match(gradeRe);
  const classroom = !m ? "" : m[3] ? `${m[2]}/${m[3]}` : `ม.${m[1]}`;
  const subject = text
    .replace(m ? m[0] : "", " ")
    .replace(/\s+/g, " ")
    .trim()
    // ตัดคำที่เป็นตัวเลข/เครื่องหมายล้วน (เลขห้องเรียน "1134", เศษ OCR "2.") แต่เก็บรหัสวิชาอย่าง "ก32907"
    .split(" ")
    .filter((tok) => !/^[\d.,:;/\\-]+$/.test(tok))
    .join(" ");
  return { classroom, subject };
};

const center = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

// words: [{ text, bbox: {x0,y0,x1,y1} }] จาก Tesseract
// คืน { entries: [{ day, period, classroom, subject, raw }], info: { daysFound, periodsFound } }
export const parseScheduleFromWords = (words, imageWidth) => {
  const clean = words.filter((w) => w.text && w.text.trim() && w.bbox);
  const minX = Math.min(...clean.map((w) => w.bbox.x0));
  const leftLimit = minX + imageWidth * 0.18;

  // 1) หัวแถววัน — ถ้าวันเดียวกันเจอหลายคำ ใช้คำที่อยู่ซ้ายสุด
  const dayRows = new Map();
  clean.forEach((w) => {
    const day = detectDay(w.text, w.bbox.x0 <= leftLimit);
    if (day == null || w.bbox.x0 > leftLimit) return;
    const cur = dayRows.get(day);
    if (!cur || w.bbox.x0 < cur.word.bbox.x0) dayRows.set(day, { day, y: center(w.bbox).y, word: w });
  });
  const rows = [...dayRows.values()].sort((a, b) => a.y - b.y);
  if (rows.length === 0) return { entries: [], info: { daysFound: 0, periodsFound: 0 } };

  const gap = rows.length > 1 ? (rows[rows.length - 1].y - rows[0].y) / (rows.length - 1) : 80;
  const labelH = Math.max(...rows.map((r) => r.word.bbox.y1 - r.word.bbox.y0));
  const dayWords = new Set(rows.map((r) => r.word));
  const dayColRight = Math.max(...rows.map((r) => r.word.bbox.x1));

  // 2) หัวคอลัมน์คาบ — คำที่อยู่เหนือแถววันแรก
  const headerBottom = rows[0].y - labelH * 0.6;
  const periodCols = new Map();
  clean.forEach((w) => {
    if (center(w.bbox).y > headerBottom || w.bbox.x0 < dayColRight - 4) return;
    const p = detectPeriod(w.text);
    if (p != null && !periodCols.has(p)) periodCols.set(p, { period: p, x: center(w.bbox).x, word: w });
  });
  const cols = [...periodCols.values()].sort((a, b) => a.x - b.x);
  const headerWords = new Set(cols.map((c) => c.word));

  // ไม่เจอหัวคาบ (หรือเจอน้อยเกินไป) → แบ่งพื้นที่ขวาของคอลัมน์วันเป็นช่องเท่าๆ กัน
  const maxX = Math.max(...clean.map((w) => w.bbox.x1));
  const colWidth = (maxX - dayColRight) / PERIOD_COUNT;
  const periodOfX = (x) => {
    if (cols.length >= 2) {
      let best = cols[0];
      cols.forEach((c) => {
        if (Math.abs(c.x - x) < Math.abs(best.x - x)) best = c;
      });
      return best.period;
    }
    const idx = Math.floor((x - dayColRight) / colWidth);
    return Math.min(PERIOD_COUNT, Math.max(1, idx + 1));
  };

  // ชื่อวันชิดบนของแถว (แบบ PDF โรงเรียน) หรืออยู่กึ่งกลาง?
  // สมมติชิดบน แล้วดูว่าบรรทัดแรกของช่องส่วนใหญ่อยู่ระดับเดียวกับชื่อวันไหม
  const dataWords = clean.filter((w) => {
    const c = center(w.bbox);
    return !dayWords.has(w) && c.x > dayColRight && c.y >= headerBottom && c.y < rows[rows.length - 1].y + gap;
  });
  const firstLineOfCell = new Map();
  dataWords.forEach((w) => {
    const y = center(w.bbox).y;
    let ri = -1;
    rows.forEach((r, i) => {
      if (r.y - labelH * 0.6 <= y) ri = i;
    });
    if (ri < 0) return;
    const key = `${ri}-${periodOfX(center(w.bbox).x)}`;
    firstLineOfCell.set(key, Math.min(firstLineOfCell.get(key) ?? Infinity, y - rows[ri].y));
  });
  const offsets = [...firstLineOfCell.values()];
  const topAligned = offsets.length > 0 && offsets.filter((o) => Math.abs(o) <= labelH * 0.6).length >= offsets.length * 0.7;

  const lead = labelH * 0.6;
  rows.forEach((r, i) => {
    if (topAligned) {
      r.top = r.y - lead;
      r.bottom = i === rows.length - 1 ? r.y + gap - lead : rows[i + 1].y - lead;
    } else {
      r.top = i === 0 ? r.y - gap / 2 : (rows[i - 1].y + r.y) / 2;
      r.bottom = i === rows.length - 1 ? r.y + gap / 2 : (r.y + rows[i + 1].y) / 2;
    }
  });

  // 3) จับคำลงช่อง (วัน, คาบ)
  const cells = new Map();
  clean.forEach((w) => {
    if (dayWords.has(w) || headerWords.has(w)) return;
    const c = center(w.bbox);
    if (c.x <= dayColRight) return;
    const row = rows.find((r) => c.y >= r.top && c.y < r.bottom);
    if (!row) return;
    const period = periodOfX(c.x);
    const key = `${row.day}-${period}`;
    if (!cells.has(key)) cells.set(key, { day: row.day, period, words: [] });
    cells.get(key).words.push(w);
  });

  const entries = [...cells.values()]
    .map((cell) => {
      const raw = cell.words
        .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
        .map((w) => w.text.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return { day: cell.day, period: cell.period, raw, ...splitCellText(raw) };
    })
    // ตัดช่องว่าง/ช่องพักกลางวัน/ขยะที่ OCR อ่านได้แค่ตัวเดียว
    .filter((e) => e.raw.replace(/[^\p{L}\p{N}]/gu, "").length >= 2 && !IGNORE_CELL.test(e.raw))
    .sort((a, b) => a.day - b.day || a.period - b.period);

  return { entries, info: { daysFound: rows.length, periodsFound: cols.length } };
};

// ---------- เตรียมรูป: ขยาย → ขาวดำ → หาเกณฑ์มืด (Otsu) → แก้รูปเอียง ----------
const toGray = (ctx, w, h) => {
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    px[i] = px[i + 1] = px[i + 2] = g;
  }
  ctx.putImageData(data, 0, 0);
  return px;
};

// เกณฑ์แยกหมึก/พื้นหลังอัตโนมัติจากฮิสโตแกรม (รูปถ่ายแสงไม่เท่ากันก็ยังใช้ได้)
export const otsuThreshold = (px) => {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < px.length; i += 16) hist[px[i] | 0]++;
  const total = hist.reduce((a, b) => a + b, 0);
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];
  let wb = 0, sb = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) {
    wb += hist[t];
    if (!wb) continue;
    const wf = total - wb;
    if (!wf) break;
    sb += t * hist[t];
    const v = wb * wf * (sb / wb - (sumAll - sb) / wf) ** 2;
    if (v > best) {
      best = v;
      th = t;
    }
  }
  return th;
};

// หามุมเอียง (−4°..4°) ที่ทำให้หมึกเรียงเป็นแถวคมที่สุด
export const estimateSkew = (px, w, h, th) => {
  const pts = [];
  const step = Math.max(2, Math.round(w / 1000));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (px[(y * w + x) * 4] < th) pts.push(x, y);
  let best = 0, bestScore = -1;
  for (let i = -16; i <= 16; i++) {
    const a = i * 0.25;
    const t = Math.tan((a * Math.PI) / 180);
    const rows = new Float64Array(h + w);
    for (let k = 0; k < pts.length; k += 2) {
      const yy = Math.floor(pts[k + 1] + pts[k] * t) + (w >> 1);
      if (yy >= 0 && yy < rows.length) rows[yy]++;
    }
    // คะแนน = ผลรวม 8 แถวที่หมึกหนาแน่นที่สุด — เส้นตารางยาวจะเป็นยอดแหลมเฉพาะตอนมุมถูก
    const top = Array.from(rows).sort((a, b) => b - a).slice(0, 8);
    const score = top.reduce((a, b) => a + b, 0);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
};

export const prepareImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(3, Math.max(1, 3000 / img.width));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      let canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      let ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      let px = toGray(ctx, w, h);
      const th = otsuThreshold(px);

      const skew = estimateSkew(px, w, h, th);
      if (Math.abs(skew) >= 0.25) {
        const rotated = document.createElement("canvas");
        rotated.width = w;
        rotated.height = h;
        const rctx = rotated.getContext("2d", { willReadFrequently: true });
        rctx.fillStyle = "#fff";
        rctx.fillRect(0, 0, w, h);
        rctx.translate(w / 2, h / 2);
        rctx.rotate((skew * Math.PI) / 180);
        rctx.drawImage(canvas, -w / 2, -h / 2);
        canvas = rotated;
        ctx = rctx;
      }
      canvas.inkThreshold = th;
      canvas.skew = skew;
      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("เปิดรูปไม่ได้"));
    img.src = URL.createObjectURL(file);
  });

// ---------- หาเส้นตาราง ----------
// แถว/คอลัมน์ของพิกเซลที่มืดเกือบทั้งแนว = เส้นตาราง → ตำแหน่งเส้นแนวนอน (ys) และแนวตั้ง (xs)
const groupLines = (counts, threshold, mergeDist) => {
  const lines = [];
  let start = -1;
  for (let i = 0; i <= counts.length; i++) {
    const on = i < counts.length && counts[i] >= threshold;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      const c = Math.round((start + i - 1) / 2);
      if (lines.length && c - lines[lines.length - 1] < mergeDist) lines[lines.length - 1] = Math.round((lines[lines.length - 1] + c) / 2);
      else lines.push(c);
      start = -1;
    }
  }
  return lines;
};

// เส้นตาราง = เส้น "บาง" ที่ลากยาวต่อเนื่อง (สองข้างของเส้นเป็นพื้นขาว) → พื้นที่สีเข้มทึบ เช่น แถบเมนู/ขอบจอ
// ในภาพแคปหน้าจอ จะไม่ถูกนับเป็นเส้น; 1 รูปอาจมีหลายตาราง → คืนเป็นหลายกริด
const longestRun = (len, isOn, maxGap) => {
  let best = 0, run = 0, gap = 0;
  for (let i = 0; i < len; i++) {
    if (isOn(i)) {
      run += gap + 1;
      gap = 0;
      if (run > best) best = run;
    } else if (run > 0 && gap < maxGap) {
      gap++;
    } else {
      run = 0;
      gap = 0;
    }
  }
  return best;
};

export const detectGrids = (gray, w, h, th) => {
  const t = Math.max(3, Math.round(w / 500)); // เส้นหนาไม่เกิน ~2t px
  const dark = (x, y) => gray[(y * w + x) * 4] < th;
  // เส้นบาง = มีพื้นขาวภายในระยะ t ทั้งสองฝั่ง (รองรับเส้นคู่ที่ชิดกัน) / พื้นที่ทึบ = ไม่มี
  const thinH = (x, y) => {
    if (!dark(x, y)) return false;
    let up = false, down = false;
    for (let k = 1; k <= t && !(up && down); k++) {
      if (!up && !dark(x, y - k)) up = true;
      if (!down && !dark(x, y + k)) down = true;
    }
    return up && down;
  };
  const thinV = (x, y) => {
    if (!dark(x, y)) return false;
    let l = false, r = false;
    for (let k = 1; k <= t && !(l && r); k++) {
      if (!l && !dark(x - k, y)) l = true;
      if (!r && !dark(x + k, y)) r = true;
    }
    return l && r;
  };

  const hRun = new Array(h).fill(0);
  // จุดตัดกับเส้นแนวตั้งทำให้เส้นขาดเป็นช่วงสั้นๆ → ยอมให้ข้ามช่องว่างได้ ~3t
  const bridge = t * 3;
  for (let y = t; y < h - t; y++) hRun[y] = longestRun(w, (x) => thinH(x, y), bridge);
  const allYs = groupLines(hRun, w * 0.25, t * 2);
  if (allYs.length < 3) return [];

  // แยกเป็นตาราง: ระยะห่างระหว่างเส้นแนวนอนที่ใหญ่ผิดปกติ = คนละตาราง
  const gaps = allYs.slice(1).map((y, i) => y - allYs[i]).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] || 1;
  const clusters = [[allYs[0]]];
  for (let i = 1; i < allYs.length; i++) {
    if (allYs[i] - allYs[i - 1] > median * 3) clusters.push([]);
    clusters[clusters.length - 1].push(allYs[i]);
  }

  const columnsFor = (ys) => {
    const top = ys[0];
    const bottom = ys[ys.length - 1];
    const vRun = new Array(w).fill(0);
    for (let x = t; x < w - t; x++) {
      let run = 0, best = 0, gap = 0;
      for (let y = top; y <= bottom; y++) {
        if (thinV(x, y)) {
          run += gap + 1;
          gap = 0;
          if (run > best) best = run;
        } else if (run > 0 && gap < bridge) gap++;
        else {
          run = 0;
          gap = 0;
        }
      }
      vRun[x] = best;
    }
    return groupLines(vRun, (bottom - top) * 0.6, t * 2);
  };

  // ไม่เจอเส้นแนวตั้งที่ยาวพอ = น่าจะรวมสองตารางเข้าด้วยกัน → แบ่งตรงช่องห่างที่กว้างที่สุดแล้วลองใหม่
  const grids = [];
  const findGrids = (ys, depth = 0) => {
    if (ys.length < 3) return;
    const xs = columnsFor(ys);
    if (xs.length >= 3) {
      grids.push({ xs, ys });
      return;
    }
    if (depth > 4 || ys.length < 6) return;
    let cut = 1;
    for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > ys[cut] - ys[cut - 1]) cut = i;
    findGrids(ys.slice(0, cut), depth + 1);
    findGrids(ys.slice(cut), depth + 1);
  };
  clusters.forEach((ys) => findGrids(ys));
  return grids;
};

// ช่องว่างจริงไหม (แทบไม่มีหมึก) — ข้าม OCR ช่องว่างให้เร็วขึ้น
const inkRatio = (gray, w, r, th) => {
  let n = 0;
  for (let y = r.top; y < r.top + r.height; y += 2)
    for (let x = r.left; x < r.left + r.width; x += 2) if (gray[(y * w + x) * 4] < th) n++;
  return n / ((r.width / 2) * (r.height / 2));
};

const cleanText = (t) => (t || "").replace(/[|_~=]/g, " ").replace(/\s+/g, " ").trim();

// ตารางในรูปเล็ก (เช่น แคปทั้งหน้าจอ) ตัวหนังสือในช่องเล็กเกินจะอ่านตัวเลขผิด (3 → จ)
// → ตัดเฉพาะตารางมาขยายให้แถวสูงราว 200px ก่อนอ่าน
const zoomGrid = (canvas, grid) => {
  const gaps = grid.ys.slice(1).map((y, i) => y - grid.ys[i]).sort((a, b) => a - b);
  const rowH = gaps[Math.floor(gaps.length / 2)] || 200;
  const f = Math.min(3, 200 / rowH, 4500 / (grid.xs[grid.xs.length - 1] - grid.xs[0]));
  if (f < 1.15) return { target: canvas, grid };
  const m = 8;
  const x0 = Math.max(0, grid.xs[0] - m);
  const y0 = Math.max(0, grid.ys[0] - m);
  const x1 = Math.min(canvas.width, grid.xs[grid.xs.length - 1] + m);
  const y1 = Math.min(canvas.height, grid.ys[grid.ys.length - 1] + m);
  const target = document.createElement("canvas");
  target.width = Math.round((x1 - x0) * f);
  target.height = Math.round((y1 - y0) * f);
  const ctx = target.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, target.width, target.height);
  target.inkThreshold = canvas.inkThreshold;
  return {
    target,
    grid: { xs: grid.xs.map((x) => Math.round((x - x0) * f)), ys: grid.ys.map((y) => Math.round((y - y0) * f)) },
  };
};

// อ่านทีละช่องของตาราง: แถวแรก = หัวคาบ, คอลัมน์แรก = วัน
const readByGrid = async (worker, canvas, grid, onProgress) => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const gray = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const { xs, ys } = grid;
  const pad = Math.max(4, Math.round(canvas.width / 400));
  const rectOf = (r, c) => ({
    left: xs[c] + pad,
    top: ys[r] + pad,
    width: Math.max(1, xs[c + 1] - xs[c] - pad * 2),
    height: Math.max(1, ys[r + 1] - ys[r] - pad * 2),
  });

  const nRows = ys.length - 1;
  const nCols = xs.length - 1;
  const total = nRows * nCols;
  let done = 0;
  const texts = [];
  for (let r = 0; r < nRows; r++) {
    texts.push([]);
    for (let c = 0; c < nCols; c++) {
      const rect = rectOf(r, c);
      let text = "";
      if (rect.width > 8 && rect.height > 8 && inkRatio(gray, canvas.width, rect, canvas.inkThreshold) > 0.002) {
        const { data } = await worker.recognize(canvas, { rectangle: rect });
        text = cleanText(data.text);
      }
      texts[r].push(text);
      done++;
      if (onProgress) onProgress(done / total);
    }
  }

  // หัวตาราง = แถวที่ช่องส่วนใหญ่เป็นเลขคาบ/เวลา (บางโรงเรียนมี 2 แถว: เลขคาบ + เวลา)
  // แถวถัดจากหัวตารางทั้งหมดคือแถววัน (แม้ OCR อ่านชื่อวันไม่ออก)
  const isHeaderRow = (row) => {
    const cells = row.slice(1).filter(Boolean);
    return cells.length >= 2 && cells.filter((t) => detectPeriod(t.split(" ")[0]) != null || detectPeriod(t) != null).length >= cells.length * 0.5;
  };
  let lastHeaderRow = -1;
  texts.forEach((row, r) => {
    if (r < nRows - 1 && isHeaderRow(row)) lastHeaderRow = r;
  });
  const rowDaysRaw = texts.map((row) => detectDay(row[0], true));
  let firstDayRow = lastHeaderRow + 1;
  // ข้ามแถวว่าง (เช่น เส้นคู่ใต้หัวตาราง)
  while (firstDayRow < nRows - 1 && texts[firstDayRow].every((t) => !t)) firstDayRow++;
  if (firstDayRow < 1) firstDayRow = rowDaysRaw.findIndex((d, i) => i > 0 && d != null);
  if (firstDayRow < 1) firstDayRow = 1;

  // หัวคอลัมน์ → เลขคาบ (คอลัมน์ "พัก" ข้าม); อ่านเลขคาบไม่ออกให้เรียงต่อจากคอลัมน์ก่อนหน้า
  const colPeriod = [];
  let next = 1;
  for (let c = 1; c < nCols; c++) {
    const heads = texts.slice(0, firstDayRow).map((row) => row[c]).filter(Boolean);
    const head = heads.join(" ");
    if (heads.length === 0) {
      colPeriod[c] = next <= PERIOD_COUNT ? next : null;
      if (colPeriod[c]) next = colPeriod[c] + 1;
      continue;
    }
    if (IGNORE_CELL.test(head)) {
      colPeriod[c] = null;
      continue;
    }
    // ลองทีละช่องหัว (เลขคาบก่อน แล้วค่อยเวลา)
    const p = heads.map((h) => detectPeriod(h.split(" ")[0]) ?? detectPeriod(h)).find((x) => x != null) ?? null;
    colPeriod[c] = p ?? (next <= PERIOD_COUNT ? next : null);
    if (colPeriod[c]) next = colPeriod[c] + 1;
  }

  const entries = [];
  const dataRows = [];
  for (let r = firstDayRow; r < nRows; r++) if (texts[r].some(Boolean)) dataRows.push(r);
  const filled = fillMissingDays(dataRows.map((r) => rowDaysRaw[r]));
  const rowDays = {};
  dataRows.forEach((r, i) => (rowDays[r] = filled[i]));
  const daysFound = filled.filter((d) => d != null).length;
  for (const r of dataRows) {
    const day = rowDays[r];
    if (day == null) continue;
    for (let c = 1; c < nCols; c++) {
      const raw = texts[r][c];
      const period = colPeriod[c];
      if (!period || !raw || IGNORE_CELL.test(raw)) continue;
      if (raw.replace(/[^\p{L}\p{N}]/gu, "").length < 2) continue;
      entries.push({ day, period, raw, ...splitCellText(raw) });
    }
  }
  return {
    entries,
    info: { daysFound, periodsFound: colPeriod.filter(Boolean).length, grid: `${ys.length}x${xs.length}` },
  };
};

// OCR ทั้งรูป → รายการคาบสอน; onProgress(0..1)
export const readScheduleFromImage = async (file, onProgress) => {
  const { createWorker } = await import("tesseract.js");
  const canvas = await prepareImage(file);
  let gridMode = false;
  const worker = await createWorker("tha+eng", 1, {
    logger: (m) => {
      // ระหว่างโหลดข้อมูลภาษา (ครั้งแรก) ยังไม่มี progress ของการอ่าน
      if (m.status === "recognizing text" && onProgress && !gridMode) onProgress(m.progress);
    },
  });
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const grids = detectGrids(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, canvas.inkThreshold);
    if (grids.length) {
      gridMode = true;
      await worker.setParameters({ tessedit_pageseg_mode: "6" });
      // หลายตารางในรูปเดียว → ใช้ตารางที่อ่านคาบได้มากที่สุด
      let best = null;
      for (let g = 0; g < grids.length; g++) {
        const { target, grid } = zoomGrid(canvas, grids[g]);
        const res = await readByGrid(worker, target, grid, (p) => onProgress?.((g + p) / grids.length));
        if (!best || res.entries.length > best.entries.length) best = res;
      }
      best.info.skew = canvas.skew;
      best.info.tables = grids.length;
      if (best.entries.length > 0) return best;
      gridMode = false;
      await worker.setParameters({ tessedit_pageseg_mode: "3" });
    }
    // ตารางไม่มีเส้น → ใช้ตำแหน่งคำทั้งรูป
    const { data } = await worker.recognize(canvas, {}, { blocks: true });
    const words = [];
    (data.blocks || []).forEach((b) =>
      (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => (l.words || []).forEach((w) => words.push(w))))
    );
    const res = parseScheduleFromWords(words, canvas.width);
    res.info.skew = canvas.skew;
    res.info.grid = grids.length ? `${grids.length} grid(s), no entries` : "none";
    return res;
  } finally {
    await worker.terminate();
  }
};

// ---------- PDF ----------
// PDF ที่สร้างจาก Excel/Word มีตัวหนังสือจริงฝังอยู่ → ดึงข้อความ+ตำแหน่งได้ตรงๆ ไม่ต้อง OCR
// 1 หน้ามีได้หลายตาราง (หลายครู) แบ่งตามบรรทัด "ครู..." แล้วให้ครูเลือกตารางของตัวเอง
const pdfWordsOfPage = async (page) => {
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const pieces = tc.items
    .filter((i) => i.str && i.str.replaceAll("\u0000", "").trim())
    .map((i) => {
      const x = i.transform[4];
      const y = i.transform[5];
      const h = Math.abs(i.transform[3]) || i.height || 10;
      return { text: i.str.replaceAll("\u0000", ""), h, bbox: { x0: x, x1: x + (i.width || h * i.str.length * 0.5), y0: vp.height - y - h, y1: vp.height - y } };
    })
    .sort((a, b) => a.bbox.y1 - b.bbox.y1 || a.bbox.x0 - b.bbox.x0);

  // ภาษาไทยใน PDF มักถูกเก็บเป็นชิ้นเล็กๆ (เช่น "ลู" "กเ" "สื" "อ") → ต่อชิ้นที่อยู่บรรทัดเดียวกันและชิดกันกลับเป็นคำ
  const words = [];
  for (const pc of pieces) {
    const last = words[words.length - 1];
    const sameLine = last && Math.abs(last.bbox.y1 - pc.bbox.y1) < pc.h * 0.3;
    const gap = last ? pc.bbox.x0 - last.bbox.x1 : Infinity;
    if (sameLine && gap > -pc.h * 0.3 && gap < pc.h * 0.25) {
      last.text += pc.text;
      last.bbox.x1 = Math.max(last.bbox.x1, pc.bbox.x1);
      last.bbox.y0 = Math.min(last.bbox.y0, pc.bbox.y0);
    } else {
      words.push({ ...pc, bbox: { ...pc.bbox } });
    }
  }
  // ช่องว่างในข้อความ = คำแยก (เช่น "แนะแนว 3/5" ในชิ้นเดียว) — คงไว้เป็นคำเดียว ตัดช่องว่างหัวท้าย
  words.forEach((w) => (w.text = w.text.replace(/\s+/g, " ").trim()));
  return { words: words.filter((w) => w.text), width: vp.width, height: vp.height };
};

const TEACHER_ANCHOR = /^ครู(?!ที่ปรึกษา)/;

const splitTablesByTeacher = (words) => {
  const anchors = words.filter((w) => TEACHER_ANCHOR.test(w.text)).sort((a, b) => a.bbox.y0 - b.bbox.y0);
  if (anchors.length === 0) return [{ name: "", words }];
  return anchors.map((a, i) => {
    const top = a.bbox.y0 - 4;
    const bottom = i + 1 < anchors.length ? anchors[i + 1].bbox.y0 - (anchors[i + 1].bbox.y1 - anchors[i + 1].bbox.y0) * 3 : Infinity;
    // ชื่อครูอาจแยกเป็นหลายชิ้นในบรรทัดเดียวกัน
    const nameParts = words
      .filter((w) => Math.abs(w.bbox.y0 - a.bbox.y0) < 3 && w.bbox.x0 >= a.bbox.x0 - 1 && w.bbox.x0 < a.bbox.x0 + 250 && !/กลุ่มสาระ|รวม|คาบ/.test(w.text))
      .sort((x, y) => x.bbox.x0 - y.bbox.x0);
    return { name: nameParts.map((w) => w.text).join(" ").replace(/\s+/g, " "), words: words.filter((w) => w.bbox.y0 >= top && w.bbox.y0 < bottom) };
  });
};

export const readSchedulesFromPdf = async (file, onProgress) => {
  const pdfjsLib = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

  const tables = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const { words, width } = await pdfWordsOfPage(page);
    splitTablesByTeacher(words).forEach((t, k) => {
      const res = parseScheduleFromWords(t.words, width);
      if (res.entries.length) tables.push({ name: t.name || `หน้า ${n} ตารางที่ ${k + 1}`, page: n, entries: res.entries, info: { ...res.info, source: "pdf-text" } });
    });
    if (onProgress) onProgress(n / pdf.numPages);
  }
  if (tables.length) return tables;

  // ไม่มีตัวหนังสือในไฟล์ (PDF สแกน) → แปลงแต่ละหน้าเป็นรูปแล้ว OCR
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 3000 / page.getViewport({ scale: 1 }).width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const res = await readScheduleFromImage(new File([blob], `page-${n}.png`, { type: "image/png" }), (p) =>
      onProgress?.((n - 1 + p) / pdf.numPages)
    );
    if (res.entries.length) tables.push({ name: `หน้า ${n}`, page: n, entries: res.entries, info: { ...res.info, source: "pdf-ocr" } });
  }
  return tables;
};

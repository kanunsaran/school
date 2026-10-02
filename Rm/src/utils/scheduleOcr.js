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
  const roomRe = /(ม\.?\s*)?([1-6])\s*[/\\-]\s*(\d{1,2})/;
  const m = text.match(roomRe);
  const classroom = m ? `${m[2]}/${m[3]}` : "";
  const subject = text
    .replace(m ? m[0] : "", " ")
    .replace(/\s+/g, " ")
    .trim()
    // เศษเลข/จุดที่ OCR ติดมา เช่น "แนะแนว 2."
    .replace(/^[\s\d.,:;/\\-]+|[\s\d.,:;/\\-]+$/g, "");
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
  rows.forEach((r, i) => {
    r.top = i === 0 ? r.y - gap / 2 : (rows[i - 1].y + r.y) / 2;
    r.bottom = i === rows.length - 1 ? r.y + gap / 2 : (r.y + rows[i + 1].y) / 2;
  });
  const dayWords = new Set(rows.map((r) => r.word));
  const dayColRight = Math.max(...rows.map((r) => r.word.bbox.x1));

  // 2) หัวคอลัมน์คาบ — คำที่อยู่เหนือแถววันแรก
  const headerBottom = rows[0].top;
  const periodCols = new Map();
  clean.forEach((w) => {
    if (center(w.bbox).y > headerBottom || w.bbox.x0 < dayColRight - 4) return;
    const p = detectPeriod(w.text);
    if (p != null && !periodCols.has(p)) periodCols.set(p, { period: p, x: center(w.bbox).x, word: w });
  });
  const cols = [...periodCols.values()].sort((a, b) => a.x - b.x);
  const headerWords = new Set(cols.map((c) => c.word));

  // ไม่เจอหัวคาบ (หรือเจอน้อยเกินไป) → แบ่งพื้นที่ขวาของคอลัมน์วันเป็น 8 ช่องเท่าๆ กัน
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

export const detectGrid = (gray, w, h, th) => {
  const dark = (x, y) => gray[(y * w + x) * 4] < th;
  const rowCounts = new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 2) if (dark(x, y)) rowCounts[y]++;
  const ys = groupLines(rowCounts, Math.max(...rowCounts) * 0.5, h * 0.008);
  if (ys.length < 3) return null;

  const top = ys[0];
  const bottom = ys[ys.length - 1];
  const colCounts = new Array(w).fill(0);
  for (let x = 0; x < w; x++) for (let y = top; y <= bottom; y += 2) if (dark(x, y)) colCounts[x]++;
  const xs = groupLines(colCounts, ((bottom - top) / 2) * 0.5, w * 0.006);
  if (xs.length < 3) return null;
  return { xs, ys };
};

// ช่องว่างจริงไหม (แทบไม่มีหมึก) — ข้าม OCR ช่องว่างให้เร็วขึ้น
const inkRatio = (gray, w, r, th) => {
  let n = 0;
  for (let y = r.top; y < r.top + r.height; y += 2)
    for (let x = r.left; x < r.left + r.width; x += 2) if (gray[(y * w + x) * 4] < th) n++;
  return n / ((r.width / 2) * (r.height / 2));
};

const cleanText = (t) => (t || "").replace(/[|_~=]/g, " ").replace(/\s+/g, " ").trim();

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

  // หัวคอลัมน์ → เลขคาบ (คอลัมน์ "พัก" ข้าม); อ่านเลขคาบไม่ออกให้เรียงต่อจากคอลัมน์ก่อนหน้า
  const colPeriod = [];
  let next = 1;
  for (let c = 1; c < nCols; c++) {
    const head = texts[0][c];
    if (IGNORE_CELL.test(head)) {
      colPeriod[c] = null;
      continue;
    }
    const firstToken = head.split(" ")[0];
    const p = detectPeriod(firstToken) ?? detectPeriod(head);
    colPeriod[c] = p ?? (next <= PERIOD_COUNT ? next : null);
    if (colPeriod[c]) next = colPeriod[c] + 1;
  }

  const entries = [];
  const rowDays = fillMissingDays(texts.slice(1).map((row) => detectDay(row[0], true)));
  const daysFound = rowDays.filter((d) => d != null).length;
  for (let r = 1; r < nRows; r++) {
    const day = rowDays[r - 1];
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
    const grid = detectGrid(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, canvas.inkThreshold);
    if (grid) {
      gridMode = true;
      await worker.setParameters({ tessedit_pageseg_mode: "6" });
      const res = await readByGrid(worker, canvas, grid, onProgress);
      res.info.skew = canvas.skew;
      if (res.entries.length > 0) return res;
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
    res.info.grid = grid ? `${grid.ys.length}x${grid.xs.length} (no entries)` : "none";
    return res;
  } finally {
    await worker.terminate();
  }
};

// ตรวจงานเบื้องต้นตามเกณฑ์ของครู แบบไม่ใช้ AI — รันในเซิร์ฟเวอร์เอง ไม่ส่งข้อมูลออกไปไหน ไม่มีค่าใช้จ่าย
// เกณฑ์ 1 บรรทัด = 1 ข้อ:  ชื่อเกณฑ์ (คะแนน): คำสำคัญ, คำสำคัญ|คำที่ใช้แทนได้, ...
//   เช่น  อธิบายความหมาย RIASEC (4 คะแนน): บุคลิกภาพ, อาชีพ, ความสนใจ|สนใจ
//   ต้องการแค่บางคำ ใส่ "อย่างน้อย N" หรือ [N] ในชื่อเกณฑ์ เช่น  ยกตัวอย่างอาชีพอย่างน้อย 2 อาชีพ (3 คะแนน): วิศวกร, แพทย์, ครู, นักออกแบบ
// ผลลัพธ์ใช้รูปแบบเดียวกับผลตรวจของ AI (status/summary/missing/spelling/suggestions/suggested_score/score_reason)

const MIN_WORDS = 15; // สั้นกว่านี้ถือว่าข้อมูลไม่พอประเมิน

// คำที่มักสะกดผิด → คำที่ถูก (ตรวจเฉพาะคำที่ไม่ไปชนคำที่ถูกต้อง)
const COMMON_MISSPELLINGS = [
  ['อนุญาติ', 'อนุญาต'], ['สังเกตุ', 'สังเกต'], ['โอกาศ', 'โอกาส'], ['ปรากฎ', 'ปรากฏ'], ['กฏ', 'กฎ'],
  ['ผลลัพท์', 'ผลลัพธ์'], ['ศรีษะ', 'ศีรษะ'], ['บรรยากาส', 'บรรยากาศ'], ['คลินิค', 'คลินิก'],
  ['ไอศครีม', 'ไอศกรีม'], ['ทะเลสาป', 'ทะเลสาบ'], ['รสชาด', 'รสชาติ'], ['เกล็ดความรู้', 'เกร็ดความรู้'],
  ['จลาจร', 'จลาจล'], ['อีเมล์', 'อีเมล'], ['ลายเซ็นต์', 'ลายเซ็น'], ['กระทันหัน', 'กะทันหัน'],
  ['ปฎิ', 'ปฏิ'], ['บุคคลิก', 'บุคลิก'], ['โควต้า', 'โควตา'], ['เวป', 'เว็บ'], ['ทักษะะ', 'ทักษะ'],
  ['คุณสมบัต ', 'คุณสมบัติ '], ['ประสพการณ์', 'ประสบการณ์'], ['ประสบการ ', 'ประสบการณ์ '], ['เอกลักษ ', 'เอกลักษณ์ '],
];

const STOPWORDS = new Set(['และ', 'หรือ', 'ของ', 'ที่', 'ใน', 'การ', 'ความ', 'ได้', 'ให้', 'กับ', 'เป็น', 'มี', 'จาก', 'เรื่อง', 'อย่าง', 'น้อย', 'ข้อ', 'ตัวอย่าง', 'อธิบาย', 'ระบุ', 'บอก']);

// ตัวอักษรไทยจาก PDF บางไฟล์แยก "ำ" เป็น ํ+า — รวมให้เป็นตัวเดียวกันก่อนเทียบ
const normalize = (s) => String(s || '')
  .normalize('NFC')
  .replace(/ํา/g, 'ำ')
  .replace(/[​-‍﻿]/g, '')
  .toLowerCase();
const squash = (s) => normalize(s).replace(/\s+/g, '');

const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
const wordsOf = (s) => [...segmenter.segment(normalize(s))].filter((x) => x.isWordLike).map((x) => x.segment);

// แปลงข้อความเกณฑ์ของครูเป็นรายการ { title, points, groups: [[คำหลัก, คำแทน...], ...] }
function parseCriteria(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim();
    if (!line) continue;
    const colon = line.search(/[:：]/);
    const head = colon >= 0 ? line.slice(0, colon) : line;
    const tail = colon >= 0 ? line.slice(colon + 1) : '';
    const pm = head.match(/\(?\s*(\d+(?:\.\d+)?)\s*(คะแนน|คะ\.|pts?|points?)\s*\)?/i);
    const points = pm ? Number(pm[1]) : null;
    const title = head.replace(pm ? pm[0] : '', '').trim() || head.trim();
    let groups = tail.split(/[,，、;]/).map((g) => g.split('|').map((w) => w.trim()).filter(Boolean)).filter((g) => g.length);
    if (!groups.length) {
      // ไม่ได้ใส่คำสำคัญ — ใช้คำในชื่อเกณฑ์แทน (ตัดคำเชื่อม/คำสั่งทั่วไปออก)
      groups = [...new Set(wordsOf(title).filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)))].map((w) => [w]);
    }
    // [N] จากฟอร์มเกณฑ์มาก่อน ไม่งั้นอ่าน "อย่างน้อย N" ในชื่อเกณฑ์ที่พิมพ์เอง
    const nm = head.match(/\[(\d+)\]/) || head.match(/อย่างน้อย\s*(\d+)/);
    const need = nm ? Math.min(Number(nm[1]), groups.length) : groups.length;
    out.push({ title: title.replace(/\s*\[\d+\]\s*/, ' ').trim(), points, groups, need: Math.max(1, need), derived: !tail.trim() });
  }
  return out;
}

const roundHalf = (n) => Math.round(n * 2) / 2;

function findMisspellings(text) {
  const t = normalize(text);
  const found = [];
  // คำผิดในรายการไม่มีตัวไหนเป็นส่วนหนึ่งของคำที่ถูก จึงเจอ = ผิดจริง (ท้ายด้วยช่องว่าง = ต้องจบคำตรงนั้น)
  for (const [wrong, right] of COMMON_MISSPELLINGS) {
    if (`${t} `.includes(normalize(wrong))) found.push({ original: wrong.trim(), suggestion: right.trim() });
    if (found.length >= 5) break;
  }
  return found;
}

/**
 * @param {{ texts: string[], criteriaText: string, maxScore: number|null, title?: string }} input
 */
function reviewByRules({ texts, criteriaText, maxScore }) {
  const fullText = texts.filter(Boolean).join('\n\n');
  const hay = squash(fullText);
  const wordCount = wordsOf(fullText).length;
  const criteria = parseCriteria(criteriaText);
  const spelling = findMisspellings(fullText);

  if (!hay) {
    return {
      status: 'insufficient', summary: 'ไม่พบข้อความในงานที่ระบบตรวจได้', missing: [], spelling: [],
      suggestions: ['ส่งงานเป็นข้อความ, Word (.docx), .txt หรือ PDF ที่มีตัวอักษร (ไม่ใช่ภาพสแกน)'],
      suggested_score: null, score_reason: 'ไม่มีข้อความให้ตรวจ', criteria: [], word_count: 0,
    };
  }

  if (!criteria.length) {
    return {
      status: wordCount < MIN_WORDS ? 'insufficient' : 'needs_improvement',
      summary: `ครูยังไม่ได้กำหนดเกณฑ์ ระบบจึงตรวจได้แค่ความยาวของงาน (${wordCount} คำ) และคำผิดที่พบบ่อย`,
      missing: [], spelling,
      suggestions: wordCount < MIN_WORDS ? ['คำตอบสั้นมาก ลองอธิบายเพิ่มพร้อมยกตัวอย่าง'] : [],
      suggested_score: null, score_reason: 'กำหนดเกณฑ์และคำสำคัญก่อน ระบบจึงเสนอคะแนนได้', criteria: [], word_count: wordCount,
    };
  }

  // น้ำหนักคะแนน: ใช้คะแนนที่ครูใส่ในแต่ละข้อ ไม่ใส่ = แบ่งเท่ากัน • รวมแล้วปรับให้เท่าคะแนนเต็มของงาน
  const given = criteria.map((c) => c.points ?? 0);
  const sumGiven = given.reduce((a, b) => a + b, 0);
  const total = maxScore ?? (sumGiven || null);
  const weights = criteria.map((c) => {
    if (total == null) return null;
    if (sumGiven > 0) return ((c.points ?? 0) / sumGiven) * total;
    return total / criteria.length;
  });

  const detail = criteria.map((c, i) => {
    const hits = [];
    const misses = [];
    for (const g of c.groups) {
      const hit = g.find((w) => hay.includes(squash(w)));
      if (hit) hits.push(hit); else misses.push(g[0]);
    }
    const ratio = c.groups.length ? Math.min(hits.length, c.need) / c.need : 0;
    const result = ratio === 1 ? 'met' : ratio > 0 ? 'partial' : 'not_met';
    const score = weights[i] != null ? roundHalf(weights[i] * ratio) : null;
    return { criterion: c.title, result, hits, misses, need: c.need, of: c.groups.length, score, max: weights[i] != null ? roundHalf(weights[i]) : null, derived: c.derived };
  });

  const allMet = detail.every((d) => d.result === 'met');
  const short = wordCount < MIN_WORDS;
  const status = short ? 'insufficient' : allMet ? 'complete' : 'needs_improvement';
  const metCount = detail.filter((d) => d.result === 'met').length;

  const missing = detail
    .filter((d) => d.result !== 'met')
    .slice(0, 5)
    .map((d) => (d.need < d.of
      ? `${d.criterion} — พบ ${d.hits.length} จากที่ต้องการ ${d.need} (เช่น ${d.misses.slice(0, 3).join(', ')})`
      : `${d.criterion} — ยังไม่พบ: ${d.misses.join(', ')}`));

  const suggestions = [];
  if (short) suggestions.push('คำตอบสั้นมาก ลองอธิบายให้ละเอียดขึ้นพร้อมยกตัวอย่าง');
  detail.filter((d) => d.result !== 'met').slice(0, 2).forEach((d) => {
    suggestions.push(`เพิ่มเนื้อหาเรื่อง "${d.criterion}" ให้ครบ เช่น ${d.misses.slice(0, 3).join(', ')}`);
  });
  if (spelling.length) suggestions.push('ตรวจการสะกดคำก่อนส่งงาน');
  if (!suggestions.length) suggestions.push('ทำได้ดีมาก ตอบครบทุกประเด็นตามเกณฑ์');

  const scored = detail.every((d) => d.score != null);
  const suggested = scored && !short ? roundHalf(detail.reduce((a, d) => a + d.score, 0)) : null;
  const scoreReason = scored
    ? detail.map((d, i) => `ข้อ ${i + 1} ${d.criterion}: พบ ${Math.min(d.hits.length, d.need)}/${d.need} ประเด็น → ${d.score}/${d.max}`).join('\n')
      + (short ? '\nงานสั้นเกินไป จึงไม่เสนอคะแนน' : '')
    : 'ยังไม่ได้กำหนดคะแนนเต็มของงาน จึงไม่เสนอคะแนน';

  return {
    status,
    summary: short
      ? `งานสั้นมาก (${wordCount} คำ) พบประเด็นตามเกณฑ์ ${metCount}/${detail.length} ข้อ`
      : `พบประเด็นครบ ${metCount} จาก ${detail.length} ข้อตามเกณฑ์ของครู (ความยาว ${wordCount} คำ)`,
    missing,
    spelling,
    suggestions: suggestions.slice(0, 3),
    suggested_score: suggested != null && maxScore != null ? Math.min(suggested, maxScore) : suggested,
    score_reason: scoreReason,
    criteria: detail,
    word_count: wordCount,
  };
}

module.exports = { reviewByRules, parseCriteria, normalize, findMisspellings };

// แปลงเกณฑ์การให้คะแนนระหว่าง "ฟอร์มที่ครูกรอก" กับข้อความที่ backend เก็บ (ai_review_criteria.criteria)
// ข้อความ 1 บรรทัด = 1 ข้อ:  ชื่อเกณฑ์ (คะแนน คะแนน) [ต้องเจอกี่คำ]: คำสำคัญ, คำสำคัญ
// รูปแบบเดียวกับที่ projectrmb/utils/ruleReview.js อ่าน

const clean = (s) => String(s || "").replace(/[:：,，\n\r[\]]/g, " ").replace(/\s+/g, " ").trim();

export const emptyRow = () => ({ title: "", points: "", keywords: [], need: "all" });

export function serializeCriteria(rows) {
  return rows
    .map((r) => ({ ...r, title: clean(r.title.replace(/[()]/g, " ")), keywords: r.keywords.map(clean).filter(Boolean) }))
    .filter((r) => r.title || r.keywords.length)
    .map((r, i) => {
      const title = r.title || `เกณฑ์ข้อ ${i + 1}`;
      const pts = String(r.points).trim() !== "" && Number(r.points) >= 0 ? ` (${Number(r.points)} คะแนน)` : "";
      const need = r.need === "all" ? r.keywords.length : Math.min(Number(r.need) || 1, r.keywords.length);
      const head = `${i + 1}. ${title}${pts}${r.keywords.length ? ` [${need}]` : ""}`;
      return r.keywords.length ? `${head}: ${r.keywords.join(", ")}` : head;
    })
    .join("\n");
}

export function parseCriteriaText(text) {
  const rows = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim();
    if (!line) continue;
    const colon = line.search(/[:：]/);
    let head = colon >= 0 ? line.slice(0, colon) : line;
    const tail = colon >= 0 ? line.slice(colon + 1) : "";
    const pm = head.match(/\(?\s*(\d+(?:\.\d+)?)\s*(คะแนน|คะ\.|pts?|points?)\s*\)?/i);
    if (pm) head = head.replace(pm[0], "");
    const nm = head.match(/\[(\d+)\]/);
    if (nm) head = head.replace(nm[0], "");
    const keywords = tail.split(/[,，、;]/).map((w) => w.trim()).filter(Boolean);
    const need = nm && Number(nm[1]) < keywords.length ? Number(nm[1]) : "all";
    rows.push({ title: head.trim(), points: pm ? pm[1] : "", keywords, need });
  }
  return rows;
}

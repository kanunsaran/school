import { useState } from "react";
import { FaPlus, FaTimes, FaTrashAlt } from "react-icons/fa";
import { emptyRow } from "../utils/criteriaFormat.js";

// ฟอร์มเกณฑ์การให้คะแนนสำหรับครู — กรอกเป็นช่อง ไม่ต้องจำรูปแบบข้อความ
// rows: [{ title, points, keywords: [], need: "all" | number }]
function KeywordInput({ keywords, onChange }) {
  const [draft, setDraft] = useState("");
  const add = (text) => {
    const words = text.split(/[,，]/).map((w) => w.trim()).filter(Boolean).filter((w) => !keywords.includes(w));
    if (words.length) onChange([...keywords, ...words]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 focus-within:border-pink-400">
      {keywords.map((k) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-full bg-pink-50 text-pink-700 px-2.5 py-0.5 text-[13px]">
          {k}
          <button type="button" onClick={() => onChange(keywords.filter((x) => x !== k))} className="bg-transparent !p-0 text-pink-400 hover:text-pink-600" aria-label={`ลบคำ ${k}`}>
            <FaTimes className="text-[10px]" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(draft); }
          if (e.key === "Backspace" && !draft && keywords.length) onChange(keywords.slice(0, -1));
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={keywords.length ? "เพิ่มคำ แล้วกด Enter" : "พิมพ์คำที่ต้องมีในคำตอบ แล้วกด Enter"}
        className="flex-1 min-w-[160px] border-none outline-none bg-transparent text-[13.5px] py-0.5"
      />
    </div>
  );
}

export default function CriteriaEditor({ rows, onChange, maxScore }) {
  const update = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const total = rows.reduce((a, r) => a + (Number(r.points) || 0), 0);
  const hasPoints = rows.some((r) => String(r.points).trim() !== "");

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-500 shrink-0">ข้อ {i + 1}</span>
            <input
              value={r.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="สิ่งที่ต้องการให้นักเรียนตอบ เช่น ยกตัวอย่างอาชีพที่สนใจ"
              className="flex-1 min-w-0 h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-[14px] outline-none focus:border-pink-400"
            />
            <input
              type="number" min="0" step="0.5"
              value={r.points}
              onChange={(e) => update(i, { points: e.target.value })}
              placeholder="คะแนน"
              className="w-20 h-9 rounded-lg border border-gray-200 bg-white px-2 text-center text-[14px] outline-none focus:border-pink-400"
              aria-label={`คะแนนข้อ ${i + 1}`}
            />
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="shrink-0 h-9 w-9 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 bg-transparent flex items-center justify-center" aria-label={`ลบข้อ ${i + 1}`}>
              <FaTrashAlt className="text-[13px]" />
            </button>
          </div>
          <div>
            <div className="text-[12.5px] text-gray-500 mb-1">คำสำคัญที่ควรมีในคำตอบ</div>
            <KeywordInput keywords={r.keywords} onChange={(keywords) => update(i, { keywords })} />
          </div>
          {r.keywords.length > 1 && (
            <label className="flex items-center gap-2 text-[13px] text-gray-600">
              ได้คะแนนเต็มข้อนี้เมื่อเจอ
              <select
                value={r.need}
                onChange={(e) => update(i, { need: e.target.value === "all" ? "all" : Number(e.target.value) })}
                className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[13px] outline-none focus:border-pink-400"
              >
                <option value="all">ครบทุกคำ</option>
                {Array.from({ length: r.keywords.length - 1 }, (_, k) => k + 1).map((n) => (
                  <option key={n} value={n}>อย่างน้อย {n} คำ</option>
                ))}
              </select>
            </label>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" onClick={() => onChange([...rows, emptyRow()])} className="h-8 px-3 rounded-full border border-dashed border-pink-300 bg-white text-pink-600 text-[13px] hover:bg-pink-50 flex items-center gap-1.5">
          <FaPlus className="text-[10px]" /> เพิ่มเกณฑ์
        </button>
        {hasPoints && (
          <span className={`text-[12.5px] ${maxScore != null && total !== Number(maxScore) ? "text-amber-600" : "text-gray-400"}`}>
            รวม {total} คะแนน{maxScore != null ? ` / คะแนนเต็มของงาน ${maxScore}` : ""}
            {maxScore != null && total !== Number(maxScore) && " — ระบบจะปรับสัดส่วนให้เท่าคะแนนเต็ม"}
          </span>
        )}
      </div>
    </div>
  );
}

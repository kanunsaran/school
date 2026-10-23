import { useEffect, useState } from "react";
import { FaClipboardCheck, FaChevronDown, FaChevronUp, FaCheckCircle, FaExclamationTriangle, FaQuestionCircle } from "react-icons/fa";
import CriteriaEditor from "./CriteriaEditor.jsx";
import { emptyRow, parseCriteriaText, serializeCriteria } from "../utils/criteriaFormat.js";
import {
  getAiReviewStatus, getAiReviewCriteria, saveAiReviewCriteria, getAiReview, runAiReview,
} from "../callapi/callapi_user.jsx";

// ผลตรวจเบื้องต้นในหน้าครูตรวจงาน — "ตรวจตามเกณฑ์" ใช้ได้เสมอ (ในเซิร์ฟเวอร์ ไม่ใช้ AI), "ตรวจด้วย AI" ขึ้นเมื่อตั้ง ANTHROPIC_API_KEY
// ผลทุกแบบเป็นข้อมูลประกอบเท่านั้น
// ปุ่มใช้คะแนน/ข้อเสนอแนะแค่เติมลงฟอร์มของครู ไม่บันทึกคะแนนจริงจนกว่าครูกดบันทึกเอง
const STATUS = {
  complete: { label: "ครบถ้วน", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: FaCheckCircle },
  needs_improvement: { label: "ควรปรับปรุง", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: FaExclamationTriangle },
  insufficient: { label: "ข้อมูลไม่เพียงพอ", cls: "bg-gray-50 text-gray-600 border-gray-200", icon: FaQuestionCircle },
};

const formatDateTime = (d) => (d ? new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

// รองรับผลตรวจรูปแบบเดิม (ก่อนย่อผล) ที่บันทึกไว้แล้วด้วย
const normalize = (r) => ({
  status: r.status,
  summary: r.summary,
  missing: r.missing ?? r.completeness?.missing ?? [],
  spelling: r.spelling ?? r.language_issues ?? [],
  suggestions: r.suggestions ?? r.improvements ?? [],
  suggested_score: r.suggested_score ?? null,
  score_reason: r.score_reason || "",
  redacted_count: r.redacted_count || 0,
  method: r.method || "ai",
  criteria: r.criteria || [],
});
const CRITERION = {
  met: { label: "ครบ", cls: "text-emerald-700 bg-emerald-50" },
  partial: { label: "บางส่วน", cls: "text-amber-700 bg-amber-50" },
  not_met: { label: "ยังไม่พบ", cls: "text-rose-700 bg-rose-50" },
};

function List({ title, items, dot }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[13.5px] font-medium text-gray-700 mb-1">{title}</div>
      <ul className="flex flex-col gap-1">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-[14px] text-gray-700 leading-relaxed">
            <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AiReviewPanel({ assId, sendId, maxScore, onUseComment, onUseScore }) {
  const [enabled, setEnabled] = useState(false); // มี AI ให้ใช้ไหม (ตรวจตามเกณฑ์ใช้ได้เสมอ)
  const [provider, setProvider] = useState(null); // "cloudflare" | "claude" 
  const [rows, setRows] = useState([emptyRow()]);
  const [savedCriteria, setSavedCriteria] = useState("");
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null); // { text, files }

  useEffect(() => {
    getAiReviewStatus()
      .then((s) => { setEnabled(!!s?.enabled); setProvider(s?.provider || null); })
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!assId) return;
    getAiReviewCriteria(assId)
      .then((c) => {
        setSavedCriteria(c);
        const parsed = parseCriteriaText(c);
        setRows(parsed.length ? parsed : [emptyRow()]);
        if (!c) setCriteriaOpen(true);
      })
      .catch(() => {});
  }, [assId]);

  useEffect(() => {
    setReview(null);
    setError(null);
    if (!sendId) return;
    let alive = true;
    getAiReview(sendId).then((r) => alive && setReview(r)).catch(() => {});
    return () => { alive = false; };
  }, [sendId]);

  const handleRun = async (mode) => {
    if (!sendId || running) return;
    setRunning(mode);
    setError(null);
    try {
      const criteria = serializeCriteria(rows);
      if (criteria !== savedCriteria.trim()) {
        const c = await saveAiReviewCriteria(assId, criteria);
        setSavedCriteria(c);
      }
      setReview(await runAiReview(sendId, mode));
    } catch (err) {
      setError({ text: err.response?.data?.message || "ตรวจด้วย AI ไม่สำเร็จ ลองใหม่อีกครั้ง", files: err.response?.data?.files || [] });
    } finally {
      setRunning(false);
    }
  };

  const result = review?.result ? normalize(review.result) : null;
  const st = result ? STATUS[result.status] || STATUS.insufficient : null;
  const skipped = (review?.files || []).filter((f) => !f.read);
  const unredacted = (review?.files || []).filter((f) => f.read && f.unredacted);
  const isComplete = result?.status === "complete";
  const feedback = result?.suggestions?.length ? `${isComplete ? "" : "ข้อเสนอแนะ: "}${result.suggestions.join(" ")}` : "";

  return (
    <div className="pt-5 mt-5 border-t border-gray-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center"><FaClipboardCheck className="text-[14px]" /></span>
          <span className="text-[14.5px] font-semibold text-gray-900">ผู้ช่วยตรวจงานเบื้องต้น</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleRun("rules")}
            disabled={!sendId || !!running}
            className="h-9 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running === "rules" ? "กำลังตรวจ..." : "ตรวจตามเกณฑ์"}
          </button>
          {enabled && (
            <button
              type="button"
              onClick={() => handleRun("ai")}
              disabled={!sendId || !!running}
              className="h-9 px-4 rounded-xl border border-pink-200 bg-white text-pink-600 hover:bg-pink-50 text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running === "ai" ? "AI กำลังตรวจ..." : "ตรวจด้วย AI"}
            </button>
          )}
        </div>
      </div>
      <div className="mt-1.5 text-[12.5px] text-gray-400 leading-relaxed">
        ระบบเทียบงานกับคำสำคัญในเกณฑ์ของครู (ตรวจในเซิร์ฟเวอร์ ไม่ส่งข้อมูลออกนอกระบบ) • ผลเป็นการตรวจเบื้องต้น ครูเป็นผู้ตัดสินและบันทึกคะแนนเอง
        {enabled && provider === "cloudflare" && " • ปุ่มตรวจด้วย AI ส่งเฉพาะโจทย์ เกณฑ์ และข้อความในงาน (ปิดชื่อ/รหัสแล้ว ไม่ส่งรูป) ไปให้ Cloudflare Workers AI ซึ่งไม่นำข้อมูลไปฝึกโมเดล • Built with Llama"}
        {enabled && provider === "claude" && " • ปุ่มตรวจด้วย AI ส่งเฉพาะโจทย์ เกณฑ์ และงานไปให้ Claude โดยปิดชื่อ/รหัสในข้อความก่อน (PDF และรูปส่งตามต้นฉบับ)"}
      </div>

      <div className="mt-3">
        <button type="button" onClick={() => setCriteriaOpen((v) => !v)} className="text-[13.5px] text-gray-600 hover:text-pink-600 bg-transparent !p-0 flex items-center gap-1.5">
          {criteriaOpen ? <FaChevronUp className="text-[11px]" /> : <FaChevronDown className="text-[11px]" />}
          เกณฑ์การให้คะแนน {savedCriteria ? "(กำหนดแล้ว — กดเพื่อดูหรือแก้ไข)" : "(ยังไม่ได้กำหนด)"}
        </button>
        {criteriaOpen && (
          <div className="mt-2">
            <div className="text-[12.5px] text-gray-500 mb-2 leading-relaxed">
              ใส่สิ่งที่ต้องการให้นักเรียนตอบเป็นข้อ ๆ พร้อมคำสำคัญ ระบบจะหาคำเหล่านี้ในงานของนักเรียน
              เจอครบ = ได้คะแนนเต็มข้อนั้น • ใช้กับนักเรียนทุกคนในงานนี้ และบันทึกให้เองเมื่อกดตรวจ
            </div>
            <CriteriaEditor rows={rows} onChange={setRows} maxScore={maxScore} />
          </div>
        )}
      </div>

      {running && (
        <div className="mt-3 rounded-xl bg-pink-50/60 border border-pink-100 px-3.5 py-3 text-[13.5px] text-pink-700">
          {running === "ai" ? "AI กำลังอ่านงานและตรวจตามเกณฑ์…" : "กำลังเทียบงานกับเกณฑ์…"}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5 text-[13.5px] text-rose-700">
          {error.text}
          {error.files.filter((f) => !f.read).map((f) => (
            <div key={f.name} className="text-[12.5px] text-rose-600 mt-0.5">• {f.name}: {f.reason}</div>
          ))}
        </div>
      )}

      {result && !running && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-white px-3.5 py-3 flex flex-col gap-3">
          <div>
            <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[13px] font-semibold ${st.cls}`}>
              <st.icon className="text-[12px]" /> {st.label}
            </span>
            <span className="ml-2 text-[12.5px] text-gray-400">{result.method === "rules" ? "ตรวจตามเกณฑ์" : "ตรวจด้วย AI"}</span>
            <p className="mt-2 text-[14px] text-gray-800 leading-relaxed">{result.summary}</p>
          </div>

          {result.criteria.length > 0 && (
            <div>
              <div className="text-[13.5px] font-medium text-gray-700 mb-1">ผลตามเกณฑ์</div>
              <div className="flex flex-col gap-1">
                {result.criteria.map((c, i) => {
                  const cr = CRITERION[c.result] || CRITERION.not_met;
                  return (
                    <div key={i} className="flex items-start gap-2 text-[13.5px]">
                      <span className={`shrink-0 text-[12px] px-2 py-0.5 rounded-full ${cr.cls}`}>{cr.label}</span>
                      <span className="text-gray-700">
                        {c.criterion}
                        {c.hits?.length > 0 && <span className="text-gray-400"> — พบ: {c.hits.join(", ")}</span>}
                      </span>
                      {c.score != null && <span className="ml-auto shrink-0 text-gray-500">{c.score}/{c.max}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <List title="ประเด็นสำคัญที่ยังขาด" items={result.missing} dot="bg-amber-400" />

          {result.spelling.length > 0 && (
            <div>
              <div className="text-[13.5px] font-medium text-gray-700 mb-1">{result.method === "rules" ? "คำที่มักสะกดผิด" : "คำผิดสำคัญ"}</div>
              <div className="flex flex-col gap-1">
                {result.spelling.map((l, i) => (
                  <div key={i} className="text-[13.5px] text-gray-700">
                    <span className="line-through decoration-rose-300 text-gray-500">{l.original}</span>
                    <span className="mx-1.5 text-gray-400">→</span>
                    <span className="text-emerald-700">{l.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <List title={isComplete ? "คำชมและแนวทางต่อยอด (ไม่มีผลต่อคะแนน)" : "ข้อเสนอแนะสำหรับนักเรียน"} items={result.suggestions} dot="bg-emerald-400" />

          {(result.suggested_score != null || result.score_reason) && (
            <div className="rounded-lg bg-pink-50/60 border border-pink-100 px-3 py-2 text-[13.5px] text-gray-700">
              คะแนนที่ระบบเสนอ: <b className="text-pink-700">{result.suggested_score ?? "ไม่เสนอ"}</b>
              {result.suggested_score != null && <> / {maxScore ?? "-"}</>}
              {result.score_reason && <div className="text-[13px] text-gray-500 mt-0.5 whitespace-pre-line">{result.score_reason}</div>}
            </div>
          )}

          {skipped.length > 0 && (
            <div className="text-[12.5px] text-gray-500">
              ไฟล์ที่ไม่ได้ตรวจ: {skipped.map((f) => `${f.name} (${f.reason})`).join(", ")}
            </div>
          )}
          {(result.redacted_count > 0 || unredacted.length > 0) && (
            <div className="text-[12.5px] text-gray-400">
              {result.redacted_count > 0 && `ปิดข้อมูลส่วนตัวก่อนส่ง ${result.redacted_count} จุด`}
              {result.redacted_count > 0 && unredacted.length > 0 && " • "}
              {unredacted.length > 0 && `ส่ง ${unredacted.map((f) => f.name).join(", ")} ตามต้นฉบับ (ปิดชื่อในไฟล์ประเภทนี้ไม่ได้)`}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {onUseComment && feedback && (
              <button type="button" onClick={() => onUseComment(feedback)} className="h-8 px-3 rounded-full border border-pink-200 bg-white text-pink-600 text-[13px] hover:bg-pink-50">
                ใส่ข้อเสนอแนะลงความคิดเห็นครู
              </button>
            )}
            {onUseScore && result.suggested_score != null && (
              <button type="button" onClick={() => onUseScore(result.suggested_score)} className="h-8 px-3 rounded-full border border-gray-200 bg-white text-gray-600 text-[13px] hover:bg-gray-50">
                ใช้คะแนนที่เสนอ (ยังไม่บันทึก)
              </button>
            )}
          </div>
          <div className="text-[12px] text-gray-400">ตรวจเมื่อ {formatDateTime(review.created_at)} น.</div>
        </div>
      )}
    </div>
  );
}

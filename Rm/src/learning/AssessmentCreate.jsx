import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { FaArrowLeft, FaPlus, FaTrash, FaGripLines, FaChevronUp, FaChevronDown } from "react-icons/fa";
import { getClasses } from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import {
  ASSESSMENT_TYPES, QUESTION_TYPES, getAssessment, createAssessment, updateAssessment,
} from "../utils/assessmentStore.js";

const PINK = "#db2777";
const newLocalId = () => `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const emptyQuestion = () => ({
  id: newLocalId(),
  text: "",
  type: "choice",
  required: true,
  choices: [{ id: newLocalId(), text: "ตัวเลือก 1" }, { id: newLocalId(), text: "ตัวเลือก 2" }],
});

export default function AssessmentCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [classesList, setClassesList] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(ASSESSMENT_TYPES[0]);
  const [targetGradeIds, setTargetGradeIds] = useState([]);
  const [openDate, setOpenDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClasses()
      .then((data) => setClassesList((data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }))))
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนไม่สำเร็จ:", err));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const existing = getAssessment(id);
    if (!existing) {
      Swal.fire({ icon: "error", title: "ไม่พบแบบประเมินนี้" });
      navigate("/assessments");
      return;
    }
    setTitle(existing.title);
    setDescription(existing.description);
    setType(existing.type);
    setTargetGradeIds(existing.targetGradeIds || []);
    setOpenDate(existing.openDate || "");
    setCloseDate(existing.closeDate || "");
    setQuestions(existing.questions?.length ? existing.questions : [emptyQuestion()]);
  }, [id, isEdit, navigate]);

  const toggleGrade = (gradeId) => {
    setTargetGradeIds((prev) => (prev.includes(gradeId) ? prev.filter((g) => g !== gradeId) : [...prev, gradeId]));
  };

  const updateQuestion = (qid, patch) => {
    setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (qid) => setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.id !== qid) : prev));

  const moveQuestion = (index, dir) => {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addChoice = (qid) => {
    updateQuestion(qid, {
      choices: [...(questions.find((q) => q.id === qid)?.choices || []), { id: newLocalId(), text: `ตัวเลือก ${(questions.find((q) => q.id === qid)?.choices.length || 0) + 1}` }],
    });
  };
  const updateChoice = (qid, choiceId, text) => {
    const q = questions.find((qq) => qq.id === qid);
    updateQuestion(qid, { choices: q.choices.map((c) => (c.id === choiceId ? { ...c, text } : c)) });
  };
  const removeChoice = (qid, choiceId) => {
    const q = questions.find((qq) => qq.id === qid);
    if (q.choices.length <= 1) return;
    updateQuestion(qid, { choices: q.choices.filter((c) => c.id !== choiceId) });
  };

  const canSave = title.trim().length > 0;

  const buildPayload = (status) => ({
    title: title.trim(),
    description: description.trim(),
    type,
    targetGradeIds,
    openDate,
    closeDate,
    status: status === "published" && openDate && new Date(openDate) > new Date() ? "scheduled" : status,
    questions: questions.map((q) => ({ ...q, text: q.text.trim() || "คำถามไม่มีชื่อ" })),
  });

  const handleSave = async (status) => {
    if (!canSave) {
      Swal.fire({ icon: "warning", title: "กรอกชื่อแบบประเมินก่อน" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (isEdit) {
        updateAssessment(id, payload);
      } else {
        createAssessment(payload);
      }
      await Swal.fire({
        icon: "success",
        title: status === "draft" ? "บันทึกแบบร่างแล้ว" : "เผยแพร่แบบประเมินแล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
      navigate("/assessments");
    } finally {
      setSaving(false);
    }
  };

  const targetSummary = useMemo(() => {
    if (targetGradeIds.length === 0) return "ยังไม่เลือกกลุ่มเป้าหมาย";
    return targetGradeIds
      .map((gid) => classesList.find((c) => String(c.id) === String(gid)))
      .filter(Boolean)
      .map((c) => gradeLabel(c))
      .join(", ");
  }, [targetGradeIds, classesList]);

  return (
    <div className="min-h-screen w-full bg-gray-50 flex text-[14px] text-gray-800">
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/assessments")}
            className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-900 bg-transparent"
          >
            <FaArrowLeft size={12} /> กลับไปหน้าแบบประเมิน
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("draft")}
              className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] text-gray-600 disabled:opacity-50"
            >
              บันทึกแบบร่าง
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("published")}
              className="h-10 px-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13px] font-semibold disabled:opacity-50"
            >
              เผยแพร่
            </button>
          </div>
        </div>

        <div className="max-w-[860px] mx-auto px-6 py-8 flex flex-col gap-5">
          {/* Title card — โทน Google Form: แถบสีชมพูบาง ๆ ด้านบน + ชื่อ/คำอธิบายแก้ตรงในการ์ด */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-2" style={{ backgroundColor: PINK }} />
            <div className="p-6">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ชื่อแบบประเมิน"
                className="w-full text-[24px] font-bold text-gray-900 outline-none border-b-2 border-transparent focus:border-pink-400 pb-2"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="คำอธิบายแบบประเมิน (ไม่บังคับ)"
                rows={2}
                className="w-full mt-3 text-[13.5px] text-gray-500 outline-none border-b border-transparent focus:border-pink-300 resize-none"
              />
            </div>
          </div>

          {/* Settings card */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
            <div className="text-[14px] font-semibold text-gray-900 mb-4">ตั้งค่าแบบประเมิน</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-[12.5px] text-gray-500 block mb-1.5">ประเภท</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[13.5px] outline-none focus:border-pink-400">
                  {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12.5px] text-gray-500 block mb-1.5">กลุ่มเป้าหมาย</label>
                <div className="text-[12px] text-gray-400 mb-1.5 truncate" title={targetSummary}>{targetSummary}</div>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-gray-100 rounded-xl p-2">
                  {classesList.length === 0 && <div className="text-[12px] text-gray-400 px-1">ไม่พบห้องเรียน</div>}
                  {classesList.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleGrade(String(c.id))}
                      className={`h-8 px-3 rounded-full text-[12px] border transition-colors ${
                        targetGradeIds.includes(String(c.id))
                          ? "bg-pink-600 border-pink-600 text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {gradeLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12.5px] text-gray-500 block mb-1.5">วันที่เปิดให้ทำ</label>
                <input type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[13.5px] outline-none focus:border-pink-400" />
              </div>
              <div>
                <label className="text-[12.5px] text-gray-500 block mb-1.5">วันที่ปิด</label>
                <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[13.5px] outline-none focus:border-pink-400" />
              </div>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, index) => (
            <div key={q.id} className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-3">
                <FaGripLines className="text-gray-300 mt-3 shrink-0" size={14} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      placeholder={`คำถามที่ ${index + 1}`}
                      className="flex-1 min-w-40 text-[15px] font-medium text-gray-900 outline-none border-b-2 border-gray-100 focus:border-pink-400 pb-1.5"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, { type: e.target.value })}
                      className="h-9 rounded-lg border border-gray-200 px-2.5 text-[12.5px] outline-none focus:border-pink-400"
                    >
                      {QUESTION_TYPES.map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                    </select>
                  </div>

                  {(q.type === "choice" || q.type === "checkbox") && (
                    <div className="mt-4 flex flex-col gap-2">
                      {q.choices.map((c) => (
                        <div key={c.id} className="flex items-center gap-2">
                          <span className={`w-4 h-4 shrink-0 border border-gray-300 ${q.type === "choice" ? "rounded-full" : "rounded"}`} />
                          <input
                            value={c.text}
                            onChange={(e) => updateChoice(q.id, c.id, e.target.value)}
                            className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-[13px] outline-none focus:border-pink-400"
                          />
                          <button type="button" onClick={() => removeChoice(q.id, c.id)} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent">
                            <FaTrash size={11} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addChoice(q.id)} className="self-start text-[12.5px] text-pink-600 hover:underline bg-transparent mt-1">
                        + เพิ่มตัวเลือก
                      </button>
                    </div>
                  )}

                  {q.type === "text" && (
                    <input disabled placeholder="คำตอบแบบข้อความ (ตัวอย่าง)" className="mt-4 w-full h-10 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[13px] text-gray-400" />
                  )}

                  {q.type === "rating" && (
                    <div className="mt-4 flex items-center gap-3 text-gray-400 text-[13px]">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">{n}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-gray-100">
                    <label className="flex items-center gap-2 text-[12.5px] text-gray-500">
                      <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} className="accent-pink-600" />
                      บังคับตอบ
                    </label>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500 flex items-center justify-center bg-transparent">
                        <FaChevronUp size={11} />
                      </button>
                      <button type="button" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500 flex items-center justify-center bg-transparent">
                        <FaChevronDown size={11} />
                      </button>
                      <button type="button" onClick={() => removeQuestion(q.id)} disabled={questions.length <= 1} className="w-8 h-8 rounded-lg hover:bg-red-50 disabled:opacity-30 text-red-500 flex items-center justify-center bg-transparent">
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="h-12 rounded-2xl border-2 border-dashed border-gray-200 hover:border-pink-300 hover:bg-pink-50/40 text-[13.5px] text-gray-500 hover:text-pink-600 flex items-center justify-center gap-2 bg-white"
          >
            <FaPlus size={12} /> เพิ่มคำถาม
          </button>
        </div>
      </main>
    </div>
  );
}

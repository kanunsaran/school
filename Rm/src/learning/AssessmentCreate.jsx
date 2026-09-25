import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  FaArrowLeft, FaPlus, FaTrash, FaGripLines, FaChevronUp, FaChevronDown, FaCalculator, FaLayerGroup,
} from "react-icons/fa";
import { getClasses, getAssessmentById, createAssessmentApi, updateAssessmentApi } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { gradeLabel } from "../utils/gradeLabel.js";
import ThaiCalendarField from "../components/ThaiCalendarField.jsx";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";
import { QUESTION_TYPES, logActivity } from "../utils/assessmentStore.js";

const PINK = "#ec4899";
const newLocalId = () => `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// สไตล์ react-select เดียวกับที่ใช้ทั้งเว็บ แต่ป้าย multi-value (chip) ของ "กลุ่มเป้าหมาย" ให้เป็นสีชมพูเข้มทึบเหมือนปุ่ม/สถานะ selected ที่ใช้ทั่วเว็บ
const pinkMultiSelectStyles = {
  ...bigFilterSelectStyles,
  multiValue: (base) => ({ ...base, backgroundColor: PINK, borderRadius: "8px" }),
  multiValueLabel: (base) => ({ ...base, color: "#fff", fontWeight: 500 }),
  multiValueRemove: (base) => ({ ...base, color: "#fff", ":hover": { backgroundColor: "#db2777", color: "#fff" } }),
};

// คำถามประเภทไหนกำหนดคะแนนต่อตัวเลือกได้ (text/rating ไม่มีแนวคิดคะแนนต่อตัวเลือก)
const isScorable = (type) => type === "choice" || type === "checkbox";

const SCORING_METHODS = [
  { value: "sum", label: "คะแนนรวม", desc: "รวมคะแนนจากทุกคำถามเป็นคะแนนรวมเดียว" },
  { value: "category", label: "คะแนนตามหมวดหมู่", desc: "แยกคะแนนตามหมวดหมู่ที่กำหนด" },
  { value: "average", label: "คะแนนเฉลี่ย", desc: "คำนวณคะแนนเฉลี่ยจากทุกคำถาม" },
];

// แปลงคำถาม+ตัวเลือกจาก backend (question_text, question_type, options:[{option_text, score}], category, max_rating)
// ให้เป็น shape ฟอร์มเดิม {text, type, category, maxRating, choices:[{text, score}]}
const normalizeQuestion = (q) => ({
  id: newLocalId(),
  text: q.question_text,
  type: q.question_type,
  required: !!q.required,
  category: q.category || "",
  maxRating: q.max_rating || 5,
  choices: (q.options || []).map((o) => ({ id: newLocalId(), text: o.option_text, score: o.score ?? 0 })),
});

// กลับด้าน: จากฟอร์มไปเป็น payload ที่ backend ต้องการ
const denormalizeQuestion = (q, order_no) => ({
  question_text: q.text,
  question_type: q.type,
  order_no,
  required: q.required,
  category: q.category?.trim() || null,
  max_rating: q.type === "rating" ? (Number(q.maxRating) || 5) : null,
  options: isScorable(q.type) ? q.choices.map((c, i) => ({ option_text: c.text, order_no: i, score: Number(c.score) || 0 })) : [],
});

const emptyQuestion = () => ({
  id: newLocalId(),
  text: "",
  type: "choice",
  required: true,
  category: "",
  maxRating: 5,
  choices: [{ id: newLocalId(), text: "ตัวเลือก 1", score: 0 }, { id: newLocalId(), text: "ตัวเลือก 2", score: 0 }],
});

const emptyBand = () => ({ id: newLocalId(), min_score: 0, max_score: 0, label: "", description: "" });

const normalizeBand = (b) => ({
  id: newLocalId(),
  min_score: b.min_score ?? 0,
  max_score: b.max_score ?? 0,
  label: b.label || "",
  description: b.description || "",
});

export default function AssessmentCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [classesList, setClassesList] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetGradeIds, setTargetGradeIds] = useState([]);
  const [openDate, setOpenDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [hasScoring, setHasScoring] = useState(true);
  const [scoringMethod, setScoringMethod] = useState("sum");
  const [scoreBands, setScoreBands] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClasses()
      .then((data) => setClassesList((data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }))))
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนไม่สำเร็จ:", err));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getAssessmentById(id)
      .then((existing) => {
        if (!existing) {
          Swal.fire({ icon: "error", title: "ไม่พบแบบประเมินนี้" });
          navigate("/assessments");
          return;
        }
        setTitle(existing.title || "");
        setDescription(existing.description || "");
        setTargetGradeIds((existing.target_grade_ids || []).map(String));
        setOpenDate(existing.open_date || "");
        setCloseDate(existing.close_date || "");
        const qs = (existing.questions || []).map(normalizeQuestion);
        setQuestions(qs.length ? qs : [emptyQuestion()]);
        setHasScoring(existing.scoring_method !== "none");
        setScoringMethod(existing.scoring_method && existing.scoring_method !== "none" ? existing.scoring_method : "sum");
        setScoreBands((existing.score_bands || []).map(normalizeBand));
      })
      .catch(() => {
        Swal.fire({ icon: "error", title: "ไม่พบแบบประเมินนี้" });
        navigate("/assessments");
      });
  }, [id, isEdit, navigate]);

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
      choices: [...(questions.find((q) => q.id === qid)?.choices || []), { id: newLocalId(), text: `ตัวเลือก ${(questions.find((q) => q.id === qid)?.choices.length || 0) + 1}`, score: 0 }],
    });
  };
  const updateChoice = (qid, choiceId, patch) => {
    const q = questions.find((qq) => qq.id === qid);
    updateQuestion(qid, { choices: q.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)) });
  };
  const removeChoice = (qid, choiceId) => {
    const q = questions.find((qq) => qq.id === qid);
    if (q.choices.length <= 1) return;
    updateQuestion(qid, { choices: q.choices.filter((c) => c.id !== choiceId) });
  };

  // คะแนนรวมสูงสุด/ต่ำสุดที่เป็นไปได้ — รวมจากตัวเลือกสูงสุด/ต่ำสุดของคำถาม choice/checkbox
  // บวกคำถามคะแนนความเห็น (rating) ซึ่งคะแนนเริ่มที่ 1 เสมอถึงคะแนนเต็มที่ครูตั้งไว้ (maxRating)
  const scoreRange = useMemo(() => {
    let min = 0;
    let max = 0;
    questions.forEach((q) => {
      if (isScorable(q.type) && q.choices.length) {
        const scores = q.choices.map((c) => Number(c.score) || 0);
        min += Math.min(...scores);
        max += Math.max(...scores);
      } else if (q.type === "rating") {
        min += 1;
        max += Number(q.maxRating) || 5;
      }
    });
    return { min, max };
  }, [questions]);

  // ตัวเลือกหมวดหมู่ที่เคยพิมพ์ไว้แล้วในแบบประเมินนี้ ให้คำถามข้ออื่นเลือกซ้ำได้จาก dropdown แทนต้องพิมพ์ใหม่ทุกครั้ง
  const categoryOptions = useMemo(() => {
    const set = new Set(questions.map((q) => q.category).filter(Boolean));
    return Array.from(set).map((c) => ({ value: c, label: c }));
  }, [questions]);

  const hasScoreRange = scoreRange.min !== 0 || scoreRange.max !== 0;
  // ห้ามกำหนดช่วงคะแนนเกินคะแนนรวมสูงสุด/ต่ำกว่าคะแนนรวมต่ำสุดที่เป็นไปได้จริงจากคำถามที่ตั้งไว้
  const clampToScoreRange = (val) => {
    if (!hasScoreRange) return val === "" ? "" : Number(val) || 0;
    const n = Number(val);
    if (Number.isNaN(n)) return scoreRange.min;
    return Math.min(Math.max(n, scoreRange.min), scoreRange.max);
  };

  const addBand = () => setScoreBands((prev) => [...prev, emptyBand()]);
  const updateBand = (bid, patch) => setScoreBands((prev) => prev.map((b) => (b.id === bid ? { ...b, ...patch } : b)));
  const removeBand = (bid) => setScoreBands((prev) => prev.filter((b) => b.id !== bid));

  const canSave = title.trim().length > 0;

  // เช็คก่อนเผยแพร่จริง — ช่องที่ต้องเป็นตัวเลขแต่ว่าง/ไม่ใช่เลข และช่องที่จำเป็นแต่ยังไม่กรอก
  const getValidationErrors = () => {
    const errors = [];
    if (!title.trim()) errors.push("ยังไม่ได้กรอกชื่อแบบประเมิน");

    questions.forEach((q, qi) => {
      const qLabel = `คำถามที่ ${qi + 1}`;
      if (!q.text.trim()) errors.push(`${qLabel}: ยังไม่ได้กรอกข้อความคำถาม`);

      if (isScorable(q.type)) {
        q.choices.forEach((c, ci) => {
          if (!c.text.trim()) errors.push(`${qLabel} ตัวเลือกที่ ${ci + 1}: ยังไม่ได้กรอกข้อความตัวเลือก`);
          if (hasScoring && (c.score === "" || Number.isNaN(Number(c.score)))) errors.push(`${qLabel} ตัวเลือกที่ ${ci + 1}: คะแนนต้องเป็นตัวเลข`);
        });
      }

      if (q.type === "rating" && hasScoring && (q.maxRating === "" || Number.isNaN(Number(q.maxRating)) || Number(q.maxRating) < 2)) {
        errors.push(`${qLabel}: คะแนนเต็มของคำถามความเห็นต้องเป็นตัวเลขอย่างน้อย 2`);
      }

      if (hasScoring && scoringMethod === "category" && !q.category?.trim()) {
        errors.push(`${qLabel}: ยังไม่ได้เลือกหมวดหมู่`);
      }
    });

    if (hasScoring) {
      scoreBands.forEach((b, bi) => {
        const bLabel = `เกณฑ์การแปลผลลำดับที่ ${bi + 1}`;
        if (!b.label.trim()) errors.push(`${bLabel}: ยังไม่ได้ตั้งชื่อผลลัพธ์`);
        if (b.min_score === "" || Number.isNaN(Number(b.min_score))) errors.push(`${bLabel}: คะแนนเริ่มต้นต้องเป็นตัวเลข`);
        if (b.max_score === "" || Number.isNaN(Number(b.max_score))) errors.push(`${bLabel}: คะแนนสิ้นสุดต้องเป็นตัวเลข`);
      });
    }

    return errors;
  };

  const buildPayload = (status) => {
    const currentUser = getCurrentUser();
    return {
      title: title.trim(),
      description: description.trim(),
      target_grade_ids: targetGradeIds,
      open_date: openDate || null,
      close_date: closeDate || null,
      status: status === "published" && openDate && new Date(openDate) > new Date() ? "scheduled" : status,
      created_by_user_id: currentUser?.user_id,
      scoring_method: hasScoring ? scoringMethod : "none",
      questions: questions.map((q, i) => denormalizeQuestion({ ...q, text: q.text.trim() || "คำถามไม่มีชื่อ" }, i)),
      score_bands: hasScoring
        ? scoreBands.map((b, i) => ({
            min_score: Number(b.min_score) || 0,
            max_score: Number(b.max_score) || 0,
            label: b.label.trim() || "ไม่มีชื่อผลลัพธ์",
            description: b.description,
            order_no: i,
          }))
        : [],
    };
  };

  const handleSave = async (status) => {
    if (!canSave) {
      Swal.fire({ icon: "warning", title: "กรอกชื่อแบบประเมินก่อน" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (isEdit) {
        await updateAssessmentApi(id, payload);
        logActivity("edit", payload.title);
      } else {
        await createAssessmentApi(payload);
        logActivity(status === "draft" ? "create" : "publish", payload.title);
      }
      await Swal.fire({
        icon: "success",
        title: status === "draft" ? "บันทึกแบบร่างแล้ว" : "เผยแพร่แบบประเมินแล้ว",
        timer: 1200,
        showConfirmButton: false,
      });
      navigate("/assessments");
    } catch (err) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err?.response?.data?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  };

  // เผยแพร่คือของจริง นักเรียนเห็นทันที เลยเช็คให้ครบก่อน (ช่องจำเป็นที่ยังไม่กรอก + ช่องตัวเลขที่ค่าไม่ถูกต้อง) แล้วให้เช็คสรุปอีกรอบก่อนยิงเข้าฐานข้อมูล
  const handlePublishClick = async () => {
    const errors = getValidationErrors();
    if (errors.length) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลให้ครบก่อนเผยแพร่",
        html: `<ul style="text-align:left;font-size:13.5px;line-height:1.7;padding-left:18px;margin:0">${errors.map((e) => `<li>${e}</li>`).join("")}</ul>`,
      });
      return;
    }
    const methodLabel = hasScoring ? SCORING_METHODS.find((m) => m.value === scoringMethod)?.label : "ไม่มีคะแนน";
    const result = await Swal.fire({
      title: "ยืนยันเผยแพร่แบบประเมินนี้?",
      html: `<div style="text-align:left;font-size:14px;line-height:1.7">
        <div><b>ชื่อ:</b> ${title.trim()}</div>
        <div><b>จำนวนคำถาม:</b> ${questions.length} ข้อ</div>
        <div><b>การให้คะแนน:</b> ${methodLabel}</div>
      </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "เผยแพร่เลย",
      cancelButtonText: "ขอเช็คอีกที",
      confirmButtonColor: PINK,
    });
    if (!result.isConfirmed) return;
    handleSave("published");
  };

  const gradeOptions = useMemo(
    () => classesList.map((c) => ({ value: String(c.id), label: gradeLabel(c) })),
    [classesList]
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 flex text-[15.5px] text-gray-800">
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/assessments")}
            className="flex items-center gap-2 text-[14.5px] text-gray-600 hover:text-gray-900 bg-transparent"
          >
            <FaArrowLeft size={12} /> กลับไปหน้ารายการแบบประเมิน
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("draft")}
              className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[14.5px] text-gray-600 disabled:opacity-50"
            >
              บันทึกแบบร่าง
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handlePublishClick}
              className="h-10 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14.5px] font-semibold disabled:opacity-50"
            >
              เผยแพร่
            </button>
          </div>
        </div>

        <div className="max-w-350 mx-auto px-6 py-8 grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6 items-start">
          {/* ===== LEFT: ข้อมูลแบบประเมิน + คำถาม ===== */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* Title card */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-2" style={{ backgroundColor: PINK }} />
              <div className="p-6">
                <div className="text-[15.5px] font-semibold text-gray-900 mb-4">ข้อมูลแบบประเมิน</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ชื่อแบบประเมิน"
                  className="w-full text-[22px] font-bold text-gray-900 outline-none border-b-2 border-transparent focus:border-pink-400 pb-2"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="คำอธิบายแบบประเมิน (ไม่บังคับ)"
                  rows={2}
                  className="w-full mt-3 text-[15px] text-gray-500 outline-none border-b border-transparent focus:border-pink-300 resize-none"
                />
              </div>
            </div>

            {/* Settings card — แยกออกจาก title card เพื่อไม่ให้ overflow-hidden ของแถบสีบนตัดขอบ dropdown/ปฏิทินที่เปิดจากในนี้ */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-[14px] text-gray-500 block mb-1.5">กลุ่มเป้าหมาย</label>
                  <Select
                    styles={pinkMultiSelectStyles}
                    isMulti
                    isSearchable
                    placeholder="เลือกกลุ่มเป้าหมาย"
                    noOptionsMessage={() => "ไม่พบห้องเรียน"}
                    value={gradeOptions.filter((o) => targetGradeIds.includes(o.value))}
                    onChange={(opts) => setTargetGradeIds((opts || []).map((o) => o.value))}
                    options={gradeOptions}
                  />
                </div>
                <div>
                  <label className="text-[14px] text-gray-500 block mb-1.5">วันที่เปิดให้ทำ</label>
                  <ThaiCalendarField value={openDate} onChange={setOpenDate} heightClass="h-11" bgClass="bg-white" />
                </div>
                <div>
                  <label className="text-[14px] text-gray-500 block mb-1.5">วันที่ปิด</label>
                  <ThaiCalendarField value={closeDate} onChange={setCloseDate} min={openDate} heightClass="h-11" bgClass="bg-white" />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
              <div className="text-[15.5px] font-semibold text-gray-900 mb-4">คำถามและการให้คะแนน</div>

              <div className="flex flex-col gap-5">
                {questions.map((q, index) => (
                  <div key={q.id} className="rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start gap-3">
                      <FaGripLines className="text-gray-300 mt-3 shrink-0" size={14} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <input
                            value={q.text}
                            onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                            placeholder={`คำถามที่ ${index + 1}`}
                            className="flex-1 min-w-40 text-[16px] font-medium text-gray-900 outline-none border-b-2 border-gray-100 focus:border-pink-400 pb-1.5"
                          />
                          <Select
                            styles={bigFilterSelectStyles}
                            className="w-56 shrink-0"
                            value={QUESTION_TYPES.find((qt) => qt.value === q.type)}
                            onChange={(opt) => updateQuestion(q.id, { type: opt.value })}
                            options={QUESTION_TYPES}
                            isSearchable={false}
                          />
                        </div>

                        {hasScoring && scoringMethod === "category" && (
                          <div className="mt-3 max-w-72">
                            <label className="text-[12.5px] text-gray-500 block mb-1">หมวดหมู่</label>
                            <CreatableSelect
                              styles={bigFilterSelectStyles}
                              isClearable
                              placeholder="เลือกหรือพิมพ์หมวดหมู่ใหม่"
                              formatCreateLabel={(input) => `+ เพิ่มหมวดหมู่ "${input}"`}
                              value={q.category ? { value: q.category, label: q.category } : null}
                              onChange={(opt) => updateQuestion(q.id, { category: opt?.value || "" })}
                              options={categoryOptions}
                            />
                          </div>
                        )}

                        {isScorable(q.type) && hasScoring && (
                          <div className="mt-4 flex flex-col gap-2">
                            <div className="flex items-center justify-end pr-11">
                              <span className="text-[12.5px] text-gray-400 w-20 text-center">คะแนน</span>
                            </div>
                            {q.choices.map((c) => (
                              <div key={c.id} className="flex items-center gap-2">
                                <span className={`w-4 h-4 shrink-0 border border-gray-300 ${q.type === "choice" ? "rounded-full" : "rounded"}`} />
                                <input
                                  value={c.text}
                                  onChange={(e) => updateChoice(q.id, c.id, { text: e.target.value })}
                                  className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-[14.5px] outline-none focus:border-pink-400"
                                />
                                <input
                                  type="number"
                                  value={c.score}
                                  onChange={(e) => updateChoice(q.id, c.id, { score: e.target.value })}
                                  className="w-20 h-10 rounded-lg border border-gray-200 px-2 text-[14.5px] text-center outline-none focus:border-pink-400"
                                />
                                <button type="button" onClick={() => removeChoice(q.id, c.id)} className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent">
                                  <FaTrash size={12} />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => addChoice(q.id)} className="self-start text-[14px] text-pink-600 hover:underline bg-transparent mt-1">
                              + เพิ่มตัวเลือก
                            </button>
                          </div>
                        )}

                        {isScorable(q.type) && !hasScoring && (
                          <div className="mt-4 flex flex-col gap-2">
                            {q.choices.map((c) => (
                              <div key={c.id} className="flex items-center gap-2">
                                <span className={`w-4 h-4 shrink-0 border border-gray-300 ${q.type === "choice" ? "rounded-full" : "rounded"}`} />
                                <input
                                  value={c.text}
                                  onChange={(e) => updateChoice(q.id, c.id, { text: e.target.value })}
                                  className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-[14.5px] outline-none focus:border-pink-400"
                                />
                                <button type="button" onClick={() => removeChoice(q.id, c.id)} className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent">
                                  <FaTrash size={12} />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => addChoice(q.id)} className="self-start text-[14px] text-pink-600 hover:underline bg-transparent mt-1">
                              + เพิ่มตัวเลือก
                            </button>
                          </div>
                        )}

                        {q.type === "text" && (
                          <input disabled placeholder="คำตอบแบบข้อความ (ตัวอย่าง) — ไม่มีคะแนนกำกับ" className="mt-4 w-full h-10 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[14.5px] text-gray-400" />
                        )}

                        {q.type === "rating" && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="text-[13px] text-gray-500">คะแนนเต็ม (1 ถึง)</span>
                              <input
                                type="number"
                                min={2}
                                value={q.maxRating}
                                onChange={(e) => updateQuestion(q.id, { maxRating: e.target.value })}
                                className="w-16 h-8 rounded-lg border border-gray-200 px-2 text-[13.5px] text-center outline-none focus:border-pink-400"
                              />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap text-gray-400 text-[14.5px]">
                              {Array.from({ length: Math.max(2, Number(q.maxRating) || 5) }, (_, i) => i + 1).map((n) => (
                                <span key={n} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center">{n}</span>
                              ))}
                            </div>
                            {hasScoring && <div className="text-[12px] text-gray-400 mt-2">คะแนนตรงกับตัวเลขที่เลือก (เช่น เลือก 3 ได้ 3 คะแนน)</div>}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-5 pt-3 border-t border-gray-100">
                          <label className="flex items-center gap-2 text-[14px] text-gray-500">
                            <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} className="accent-pink-600" />
                            บังคับตอบ
                          </label>
                          <div className="flex items-center gap-1">
                            <button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="w-9 h-9 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500 flex items-center justify-center bg-transparent">
                              <FaChevronUp size={11} />
                            </button>
                            <button type="button" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="w-9 h-9 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500 flex items-center justify-center bg-transparent">
                              <FaChevronDown size={11} />
                            </button>
                            <button type="button" onClick={() => removeQuestion(q.id)} disabled={questions.length <= 1} className="w-9 h-9 rounded-lg hover:bg-red-50 disabled:opacity-30 text-red-500 flex items-center justify-center bg-transparent">
                              <FaTrash size={13} />
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
                  className="h-12 rounded-2xl border-2 border-dashed border-gray-200 hover:border-pink-300 hover:bg-pink-50/40 text-[15px] text-gray-500 hover:text-pink-600 flex items-center justify-center gap-2 bg-white"
                >
                  <FaPlus size={12} /> เพิ่มคำถาม
                </button>
              </div>
            </div>
          </div>

          {/* ===== RIGHT: การคำนวณคะแนน + เกณฑ์การแปลผล ===== */}
          <div className="flex flex-col gap-5 min-w-0 xl:sticky xl:top-20">
            {/* การคำนวณคะแนน */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[15.5px] font-semibold text-gray-900">
                  <FaCalculator className="text-pink-500" size={15} /> การคำนวณคะแนน
                </div>
                <label className="flex items-center gap-2 text-[13px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={!hasScoring} onChange={(e) => setHasScoring(!e.target.checked)} className="accent-pink-500" />
                  ไม่มีคะแนน
                </label>
              </div>

              {hasScoring ? (
                <>
                  <div className="flex flex-col gap-2.5">
                    {SCORING_METHODS.map((m) => (
                      <label
                        key={m.value}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                          scoringMethod === m.value ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={scoringMethod === m.value}
                          onChange={() => setScoringMethod(m.value)}
                          className="mt-1 accent-pink-500"
                        />
                        <div>
                          <div className="text-[14.5px] font-medium text-gray-900">{m.label}</div>
                          <div className="text-[13px] text-gray-500">{m.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl bg-emerald-50 p-4 text-center">
                      <div className="text-[13px] text-emerald-700 mb-1">คะแนนรวมสูงสุด</div>
                      <div className="text-[22px] font-bold text-emerald-700">{scoreRange.max} คะแนน</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4 text-center">
                      <div className="text-[13px] text-gray-500 mb-1">คะแนนรวมต่ำสุด</div>
                      <div className="text-[22px] font-bold text-gray-700">{scoreRange.min} คะแนน</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[13.5px] text-gray-400 py-2">แบบประเมินนี้เป็นแบบสอบถามทั่วไป ไม่ต้องคิดคะแนน/แปลผล</div>
              )}
            </div>

            {/* เกณฑ์การแปลผล */}
            {hasScoring && (
              <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-[15.5px] font-semibold text-gray-900 mb-1">
                  <FaLayerGroup className="text-pink-500" size={14} /> เกณฑ์การแปลผล
                </div>
                <div className="text-[13px] text-gray-400 mb-4">กำหนดช่วงคะแนนและผลลัพธ์ที่แสดงให้ผู้ทำแบบประเมิน</div>

                <div className="flex flex-col">
                  {scoreBands.map((b, i) => (
                    <div key={b.id} className={`flex flex-col gap-2 py-3.5 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                      <div className="flex items-center gap-2 text-[14px]">
                        <span className="text-gray-400 shrink-0">คะแนน</span>
                        <input
                          type="number"
                          value={b.min_score}
                          onChange={(e) => updateBand(b.id, { min_score: clampToScoreRange(e.target.value) })}
                          className="w-14 text-center border-b border-gray-200 focus:border-pink-400 outline-none py-1 bg-transparent"
                        />
                        <span className="text-gray-400 shrink-0">ถึง</span>
                        <input
                          type="number"
                          value={b.max_score}
                          onChange={(e) => updateBand(b.id, { max_score: clampToScoreRange(e.target.value) })}
                          className="w-14 text-center border-b border-gray-200 focus:border-pink-400 outline-none py-1 bg-transparent"
                        />
                        <button type="button" onClick={() => removeBand(b.id)} className="ml-auto shrink-0 text-red-400 hover:text-red-600 bg-transparent">
                          <FaTrash size={12} />
                        </button>
                      </div>
                      <input
                        value={b.label}
                        onChange={(e) => updateBand(b.id, { label: e.target.value })}
                        placeholder="ชื่อผลลัพธ์ เช่น ระดับสูงมาก"
                        className="w-full border-b border-gray-200 focus:border-pink-400 outline-none py-1.5 text-[14.5px] font-medium text-gray-900 bg-transparent"
                      />
                      <textarea
                        value={b.description}
                        onChange={(e) => updateBand(b.id, { description: e.target.value })}
                        placeholder="คำอธิบายผลลัพธ์ (ไม่บังคับ)"
                        rows={2}
                        className="w-full border-b border-gray-200 focus:border-pink-400 outline-none py-1.5 text-[13.5px] text-gray-600 resize-none bg-transparent"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addBand}
                    className={`h-11 rounded-xl border-2 border-dashed border-gray-200 hover:border-pink-300 hover:bg-pink-50/40 text-[14px] text-gray-500 hover:text-pink-600 flex items-center justify-center gap-2 bg-white ${scoreBands.length ? "mt-3.5" : ""}`}
                  >
                    <FaPlus size={11} /> เพิ่มช่วงคะแนน
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { FaTimes, FaSearch, FaCheck, FaDownload, FaArrowLeft, FaUser, FaUsers, FaSchool, FaFilePdf, FaTable } from "react-icons/fa";
import { SECTIONS, REPORT_TYPES, loadReportData } from "../utils/studentReportData.js";
import { buildIndividualReport, buildClassSummary } from "../utils/studentReport.js";
import { downloadBlob, safeFileName, todayStamp } from "../utils/reportPdf.js";
import { gradeLabel } from "../utils/gradeLabel.js";

// ระบบสร้างรายงานนักเรียน: ① ประเภท → ② กลุ่มนักเรียน → ③ เลือกข้อมูล → ④ ดูตัวอย่าง → ⑤ ส่งออก PDF
const STEPS = ["ประเภท", "นักเรียน", "ข้อมูล", "ตัวอย่าง"];
const SCOPES = [
  { key: "single", label: "รายบุคคล", hint: "เลือกนักเรียน 1 คน" },
  { key: "multi", label: "เลือกหลายคน", hint: "ติ๊กเลือกนักเรียนหลายคน" },
  { key: "class", label: "ทั้งห้อง", hint: "นักเรียนทุกคนในห้อง" },
];
const scopeIcon = (i) => [<FaUser key="u" className="mx-auto mb-1" size={18} />, <FaUsers key="m" className="mx-auto mb-1" size={18} />, <FaSchool key="c" className="mx-auto mb-1" size={18} />][i];
const TYPE_DESC = {
  guidance: "ข้อมูลทั่วไป เป้าหมาย ผล Holland (RIASEC) และคำแนะนำครู",
  submissions: "งานที่มอบหมาย การส่งงาน ส่งช้า/ค้างส่ง และคะแนน",
  attendance: "สรุป มา/สาย/ลา/ขาด และรายการเช็กชื่อรายวัน",
};

const card = (active) =>
  `w-full text-left rounded-2xl border-2 p-3.5 transition flex items-start gap-3 ${
    active ? "border-pink-500 bg-pink-50/70" : "border-gray-200 bg-white hover:border-pink-200"
  }`;

export default function ReportWizard({ students, classes, initialType = null, preselectedIds = [], defaultRoom = "", onClose }) {
  const [step, setStep] = useState(initialType ? 2 : 1);
  const [typeKey, setTypeKey] = useState(initialType || "guidance");
  const [scope, setScope] = useState(preselectedIds.length > 1 ? "multi" : preselectedIds.length === 1 ? "single" : defaultRoom ? "class" : "single");
  const [picked, setPicked] = useState(() => new Set(preselectedIds.map(String)));
  const [room, setRoom] = useState(defaultRoom || classes[0]?.id || "");
  const [q, setQ] = useState("");
  const [sections, setSections] = useState(() => new Set(REPORT_TYPES[initialType || "guidance"].defaults));
  const [format, setFormat] = useState("individual"); // individual | table (เฉพาะทั้งห้อง)
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null); // { blob, images, filename }
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && progress == null && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, progress]);

  const chooseType = (k) => {
    setTypeKey(k);
    setSections(new Set(REPORT_TYPES[k].defaults));
  };

  const classOf = (s) => classes.find((c) => String(c.id) === String(s.gradeId));
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return students
      .filter((s) => !t || s.fullname?.toLowerCase().includes(t) || String(s.student_code || "").toLowerCase().includes(t) || String(s.seatNo ?? "") === t)
      .sort((a, b) => String(a.gradeId).localeCompare(String(b.gradeId)) || (Number(a.seatNo) || 999) - (Number(b.seatNo) || 999));
  }, [students, q]);

  const targets = useMemo(() => {
    const bySeat = (a, b) => (Number(a.seatNo) || 999) - (Number(b.seatNo) || 999);
    if (scope === "class") return students.filter((s) => String(s.gradeId) === String(room)).sort(bySeat);
    const list = students.filter((s) => picked.has(String(s.user_id)));
    return scope === "single" ? list.slice(0, 1) : list;
  }, [scope, room, picked, students]);

  const pickStudent = (id) => {
    id = String(id);
    setPicked((prev) => {
      if (scope === "single") return new Set([id]);
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isTable = scope === "class" && format === "table";
  const canNext = step === 1 || (step === 2 && targets.length > 0) || (step === 3 && (isTable || sections.size > 0));

  const roomText = scope === "class" ? gradeLabel(classes.find((c) => String(c.id) === String(room)) || {}) : null;
  const fileName = () => {
    const t = REPORT_TYPES[typeKey];
    if (isTable) return `${t.classTitle}_ม.${safeFileName(roomText)}_${todayStamp()}.pdf`;
    if (targets.length === 1) return `${t.title}_${safeFileName(targets[0].fullname)}_${todayStamp()}.pdf`;
    return `${t.title}_${scope === "class" ? `ม.${safeFileName(roomText)}` : `${targets.length}คน`}_${todayStamp()}.pdf`;
  };

  const generate = async () => {
    setStep(4);
    setPreview(null);
    setError("");
    setProgress(0);
    try {
      const data = await loadReportData(targets, classes, (p) => setProgress(Math.round(p * 45)));
      const onP = (p) => setProgress(45 + Math.round(p * 55));
      const out = isTable ? await buildClassSummary(data, typeKey, roomText, onP) : await buildIndividualReport(data, typeKey, [...sections], onP);
      setPreview({ ...out, filename: fileName() });
    } catch (err) {
      console.error("สร้างรายงานไม่สำเร็จ:", err);
      setError("สร้างรายงานไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setProgress(null);
    }
  };

  const next = () => (step === 3 ? generate() : setStep(step + 1));
  const back = () => {
    if (step === 4) setPreview(null);
    setStep(step - 1);
  };

  const t = REPORT_TYPES[typeKey];

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={(e) => e.target === e.currentTarget && progress == null && onClose()}>
      <div className={`bg-white w-full ${step === 4 ? "sm:max-w-3xl" : "sm:max-w-xl"} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[90vh]`}>
        {/* หัว + ขั้นตอน */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[19px] font-bold text-gray-900">สร้างรายงานนักเรียน</div>
            <button type="button" onClick={onClose} disabled={progress != null} aria-label="ปิด" className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent !p-0">
              <FaTimes size={13} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const state = n < step ? "done" : n === step ? "cur" : "todo";
              return (
                <div key={label} className={`flex items-center gap-1.5 min-w-0 ${n < STEPS.length ? "flex-1" : ""}`}>
                  <span className={`w-6 h-6 rounded-full text-[12.5px] font-bold flex items-center justify-center shrink-0 ${state === "todo" ? "bg-gray-100 text-gray-400" : "bg-pink-500 text-white"}`}>
                    {state === "done" ? <FaCheck size={9} /> : n}
                  </span>
                  <span className={`text-[13.5px] truncate ${state === "cur" ? "text-pink-600 font-semibold" : "hidden sm:inline text-gray-400"}`}>{label}</span>
                  {n < STEPS.length && <span className={`h-0.5 flex-1 rounded ${n < step ? "bg-pink-300" : "bg-gray-100"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {/* ① ประเภท */}
          {step === 1 && (
            <div className="space-y-2.5">
              <div className="text-[15px] font-semibold text-gray-700">① เลือกประเภทรายงาน</div>
              {Object.entries(REPORT_TYPES).map(([k, v]) => (
                <button key={k} type="button" onClick={() => chooseType(k)} className={card(typeKey === k)}>
                  <span className="text-[26px] leading-none mt-0.5">{v.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[16.5px] font-bold text-gray-900">{v.label}</span>
                    <span className="block text-[14px] text-gray-500 leading-snug">{TYPE_DESC[k]}</span>
                  </span>
                  <span className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 ${typeKey === k ? "border-pink-500 bg-pink-500 ring-2 ring-inset ring-white" : "border-gray-300"}`} />
                </button>
              ))}
            </div>
          )}

          {/* ② กลุ่มนักเรียน */}
          {step === 2 && (
            <div>
              <div className="text-[15px] font-semibold text-gray-700 mb-2.5">② เลือกกลุ่มนักเรียน</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {SCOPES.map(({ key, label, hint }, idx) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setScope(key);
                      if (key === "single" && picked.size > 1) setPicked(new Set([...picked].slice(0, 1)));
                    }}
                    className={`rounded-2xl border-2 px-2 py-3 text-center transition ${scope === key ? "border-pink-500 bg-pink-50/70 text-pink-600" : "border-gray-200 bg-white text-gray-500 hover:border-pink-200"}`}
                  >
                    {scopeIcon(idx)}
                    <span className="block text-[15px] font-bold text-gray-900">{label}</span>
                    <span className="hidden sm:block text-[12.5px] text-gray-500 leading-tight">{hint}</span>
                  </button>
                ))}
              </div>

              {scope === "class" ? (
                <div>
                  <label className="block text-[14px] text-gray-500 mb-1">ห้องเรียน</label>
                  <select value={room} onChange={(e) => setRoom(e.target.value)} className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-[15.5px] outline-none focus:border-pink-400">
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>ม.{gradeLabel(c)} ({students.filter((s) => String(s.gradeId) === String(c.id)).length} คน)</option>
                    ))}
                  </select>
                  <div className="mt-2 text-[14px] text-gray-500">นักเรียนในห้องนี้ {targets.length} คน</div>
                </div>
              ) : (
                <div>
                  <div className="relative mb-2">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ รหัส หรือเลขที่..." className="w-full h-10 rounded-xl border border-gray-200 pl-9 pr-3 text-[15px] outline-none focus:border-pink-400" />
                  </div>
                  <div className="flex items-center justify-between text-[13.5px] text-gray-500 mb-1.5">
                    <span>{scope === "single" ? "เลือก 1 คน" : `เลือกแล้ว ${targets.length} คน`}</span>
                    {scope === "multi" && picked.size > 0 && (
                      <button type="button" onClick={() => setPicked(new Set())} className="text-pink-600 bg-transparent !p-0">ล้างที่เลือก</button>
                    )}
                  </div>
                  <div className="border border-gray-100 rounded-xl max-h-[40dvh] overflow-y-auto divide-y divide-gray-50">
                    {filtered.length === 0 && <div className="py-6 text-center text-[14.5px] text-gray-400">ไม่พบนักเรียน</div>}
                    {filtered.map((s) => {
                      const on = picked.has(String(s.user_id));
                      const c = classOf(s);
                      return (
                        <button key={s.user_id} type="button" onClick={() => pickStudent(s.user_id)} className={`w-full flex items-center gap-3 px-3 py-2 text-left !rounded-none ${on ? "bg-pink-50" : "bg-white hover:bg-gray-50"}`}>
                          <span className={`w-5 h-5 shrink-0 flex items-center justify-center ${scope === "single" ? "rounded-full" : "rounded-md"} ${on ? "bg-pink-500 text-white" : "border-2 border-gray-300"}`}>
                            {on && <FaCheck size={9} />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[15px] text-gray-900 truncate">{s.fullname}</span>
                            <span className="block text-[12.5px] text-gray-500">
                              {c ? `ม.${gradeLabel(c)}` : "ไม่มีห้อง"}{s.seatNo != null ? ` • เลขที่ ${s.seatNo}` : ""}{s.student_code ? ` • ${s.student_code}` : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ③ เลือกข้อมูล */}
          {step === 3 && (
            <div>
              {scope === "class" && (
                <div className="mb-4">
                  <div className="text-[15px] font-semibold text-gray-700 mb-2">รูปแบบรายงาน</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { k: "individual", label: "รายงานรายบุคคล", hint: "1 คนเริ่มหน้าใหม่ รวมใน PDF เดียว" },
                      { k: "table", label: "ตารางสรุปทั้งห้อง", hint: "แถวละคน ดูภาพรวมทั้งห้อง" },
                    ].map(({ k, label, hint }) => (
                      <button key={k} type="button" onClick={() => setFormat(k)} className={card(format === k)}>
                        {k === "table" ? <FaTable className={`mt-1 shrink-0 ${format === k ? "text-pink-500" : "text-gray-400"}`} size={16} /> : <FaFilePdf className={`mt-1 shrink-0 ${format === k ? "text-pink-500" : "text-gray-400"}`} size={16} />}
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold text-gray-900">{label}</span>
                          <span className="block text-[12.5px] text-gray-500 leading-tight">{hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isTable ? (
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-[14.5px] text-gray-600">
                  ตารางสรุปจะแสดง:{" "}
                  <b className="text-gray-800">
                    {typeKey === "guidance" ? "นักเรียน • เป้าหมาย • RIASEC • ความสอดคล้อง" : typeKey === "submissions" ? "มอบหมาย • ส่งแล้ว • ตรงเวลา • ส่งช้า • ยังไม่ส่ง • คะแนนเฉลี่ย" : "มา • สาย • ลา • ขาด • % เข้าเรียน"}
                  </b>
                </div>
              ) : (
                <>
                  <div className="text-[15px] font-semibold text-gray-700">③ เลือกข้อมูลที่จะใส่ในรายงาน</div>
                  <div className="text-[13.5px] text-gray-500 mb-2">ติ๊กเฉพาะหัวข้อที่ต้องการ — หัวข้อที่ไม่ได้เลือกจะไม่อยู่ใน PDF</div>
                  <div className="space-y-1.5">
                    {Object.entries(SECTIONS).map(([k, label]) => {
                      const on = sections.has(k);
                      return (
                        <label key={k} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer ${on ? "border-pink-300 bg-pink-50/60" : "border-gray-200 bg-white"}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setSections((prev) => {
                                const n = new Set(prev);
                                n.has(k) ? n.delete(k) : n.add(k);
                                return n;
                              })
                            }
                            className="w-5 h-5 accent-pink-500"
                          />
                          <span className="flex-1 text-[15.5px] text-gray-800">{label}</span>
                          {t.defaults.includes(k) && <span className="text-[12px] text-pink-600 bg-pink-100 rounded-full px-2">แนะนำ</span>}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ④ ตัวอย่าง */}
          {step === 4 && (
            <div>
              {progress != null && (
                <div className="py-10 text-center">
                  <div className="text-[15px] text-gray-600 mb-2">{progress < 45 ? "กำลังรวบรวมข้อมูลนักเรียน..." : "กำลังจัดหน้ารายงาน..."} {progress}%</div>
                  <div className="h-2 max-w-sm mx-auto bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              {error && <div className="py-8 text-center text-[15px] text-red-500">{error}</div>}
              {preview && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[14px] text-gray-600">
                    <span>
                      {t.icon} {isTable ? t.classTitle : t.title} • {targets.length} คน • <b>{preview.images.length} หน้า</b>
                    </span>
                    <span className="text-gray-400 truncate max-w-full">{preview.filename}</span>
                  </div>
                  <div className="bg-gray-100 rounded-xl p-3 space-y-3">
                    {preview.images.map((src, i) => (
                      <img key={i} src={src} alt={`หน้า ${i + 1}`} className="w-full rounded-md shadow bg-white" />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ปุ่ม */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {step > 1 ? (
            <button type="button" onClick={back} disabled={progress != null} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-600 hover:bg-gray-50 flex items-center gap-2">
              <FaArrowLeft size={11} /> ย้อนกลับ
            </button>
          ) : (
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-600 hover:bg-gray-50">ยกเลิก</button>
          )}
          {step < 4 ? (
            <button type="button" onClick={next} disabled={!canNext} className="h-10 px-5 rounded-xl !bg-pink-500 hover:!bg-pink-600 disabled:!bg-pink-200 text-white text-[15px] font-semibold">
              {step === 3 ? "ดูตัวอย่าง" : "ถัดไป"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!preview}
              onClick={() => preview && downloadBlob(preview.blob, preview.filename)}
              className="h-10 px-5 rounded-xl !bg-pink-500 hover:!bg-pink-600 disabled:!bg-pink-200 text-white text-[15px] font-semibold flex items-center gap-2"
            >
              <FaDownload size={12} /> ส่งออก PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

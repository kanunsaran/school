import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaChevronDown,
  FaBold,
  FaItalic,
  FaUnderline,
  FaListUl,
  FaLink,
  FaGoogleDrive,
  FaYoutube,
  FaPlus,
  FaUpload,
  FaUsers,
  FaRegCalendarAlt,
  FaQuestionCircle,
} from "react-icons/fa";

/**
 * ✅ QuestionCreatePage
 * - Fullscreen overlay (fixed inset-0)
 * - Left: question + type, description, attachments
 * - Right: class, assignees, points, due (calendar picker style), topic, checkboxes
 */
export default function QuestionCreatePage() {
  const navigate = useNavigate();

  // ===== mock data =====
  const classes = useMemo(() => ["วิชาแนะแนว 6/17", "วิชาแนะแนว 6/16"], []);
  const topics = useMemo(() => ["ไม่มีหัวข้อ", "บทที่ 1", "บทที่ 2"], []);
  const pointsList = useMemo(() => [100, 50, 20, 10, 5, 0], []);
  const qTypes = useMemo(
    () => ["คำตอบสั้นๆ", "ย่อหน้า", "ตัวเลือกหลายข้อ", "เช็คบ็อกซ์"],
    []
  );

  // ===== form state =====
  const [question, setQuestion] = useState("");
  const [qType, setQType] = useState(qTypes[0]);
  const [desc, setDesc] = useState("");

  const [selectedClass, setSelectedClass] = useState(classes[0]);
  const [assignees, setAssignees] = useState("นักเรียนทั้งหมด");
  const [points, setPoints] = useState(100);
  const [topic, setTopic] = useState(topics[0]);

  // ✅ due date/time
  const [dueOpen, setDueOpen] = useState(false);
  const [dueDate, setDueDate] = useState(""); // yyyy-mm-dd
  const [dueTime, setDueTime] = useState(""); // HH:mm

  // ✅ checkboxes
  const [studentsReply, setStudentsReply] = useState(false);
  const [studentsEdit, setStudentsEdit] = useState(false);

  // ✅ toolbar state (ทำให้มีสีตอนกด)
  const [fmt, setFmt] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    link: false,
  });
  const toggleFmt = (key) => setFmt((p) => ({ ...p, [key]: !p[key] }));

  const toolBtnClass = (active) =>
    `w-9 h-9 rounded-lg flex items-center justify-center transition-colors
     ${active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`;

  // top-right button dropdown (mock)
  const [askMenuOpen, setAskMenuOpen] = useState(false);
  const askWrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!askWrapRef.current) return;
      if (!askWrapRef.current.contains(e.target)) setAskMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const canAsk = question.trim().length > 0;

  const onAsk = () => {
    if (!canAsk) return;
    console.log("ASK QUESTION", {
      question,
      qType,
      desc,
      selectedClass,
      assignees,
      points,
      dueDate: dueDate || null,
      dueTime: dueDate ? (dueTime || null) : null,
      topic,
      studentsReply,
      studentsEdit,
      fmt, // ✅ ดูสถานะ toolbar ได้
    });
    navigate("/classwork");
  };

  return (
    <div className="fixed inset-0 bg-white text-gray-800 overflow-hidden">
      {/* ===== Top Bar (fixed) ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        {/* left */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
            title="ปิด"
          >
            <FaTimes className="text-gray-700" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FaQuestionCircle className="text-gray-700" />
            </div>
            <div className="text-[18px] font-semibold text-gray-900">คำถาม</div>
          </div>
        </div>

        {/* right (Ask button group) */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={askWrapRef}>
            <div className="flex items-center">
              <button
                type="button"
                disabled={!canAsk}
                onClick={onAsk}
                className={`h-11 px-8 rounded-l-full font-semibold transition-colors ${
                  canAsk
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                ถาม
              </button>
              <button
                type="button"
                disabled={!canAsk}
                onClick={() => setAskMenuOpen((v) => !v)}
                className={`h-11 w-12 rounded-r-full flex items-center justify-center transition-colors ${
                  canAsk
                    ? "bg-blue-700 text-white hover:bg-blue-800"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                title="ตัวเลือกเพิ่มเติม"
              >
                <FaChevronDown />
              </button>
            </div>

            {askMenuOpen && canAsk && (
              <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden z-50">
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 text-[14px]"
                  onClick={() => {
                    console.log("schedule (mock)");
                    setAskMenuOpen(false);
                  }}
                >
                  กำหนดเวลาโพสต์ (mock)
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 text-[14px]"
                  onClick={() => {
                    console.log("save draft (mock)");
                    setAskMenuOpen(false);
                  }}
                >
                  บันทึกเป็นฉบับร่าง (mock)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="absolute left-0 right-0 top-16 bottom-0 w-full overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-12 gap-8 w-full">
          {/* LEFT */}
          <div className="col-span-12 xl:col-span-9">
            {/* Main card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              {/* Question row: input + type dropdown */}
              <div className="grid grid-cols-12 gap-4">
                {/* Question */}
                <div className="col-span-12 lg:col-span-8">
                  <label className="block text-[13px] font-semibold text-gray-700">
                    คำถาม<span className="text-red-500">*</span>
                  </label>

                  <div className="mt-3 rounded-xl bg-[#E9EEF6] px-4 py-3 relative">
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder=""
                      className="w-full bg-transparent outline-none text-[16px] text-gray-900 placeholder:text-gray-400"
                    />
                    <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-blue-600 rounded-b-xl" />
                  </div>

                  <div className="mt-3 text-[12px] text-gray-500">*จำเป็น</div>
                </div>

                {/* Question Type */}
                <div className="col-span-12 lg:col-span-4">
                  <label className="block text-[13px] font-semibold text-gray-700">
                    ประเภทคำถาม
                  </label>

                  <div className="mt-3 relative">
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value)}
                      className="w-full h-[54px] rounded-xl border border-gray-200 bg-gray-50 px-4 pr-10 outline-none focus:border-blue-400 font-semibold text-gray-800"
                    >
                      {qTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={9}
                  placeholder="คำแนะนำ (ไม่บังคับ)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 outline-none focus:border-blue-400 resize-none"
                />

                {/* ✅ toolbar (มีสีตอนกด) */}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleFmt("bold")}
                    className={toolBtnClass(fmt.bold)}
                    title="Bold"
                  >
                    <FaBold />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFmt("italic")}
                    className={toolBtnClass(fmt.italic)}
                    title="Italic"
                  >
                    <FaItalic />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFmt("underline")}
                    className={toolBtnClass(fmt.underline)}
                    title="Underline"
                  >
                    <FaUnderline />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFmt("list")}
                    className={toolBtnClass(fmt.list)}
                    title="List"
                  >
                    <FaListUl />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFmt("link")}
                    className={toolBtnClass(fmt.link)}
                    title="Link"
                  >
                    <FaLink />
                  </button>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[14px] font-semibold text-gray-900">แนบ</div>
              <div className="mt-4 flex flex-wrap gap-8">
                <AttachButton icon={<FaGoogleDrive />} label="ไดรฟ์" />
                <AttachButton icon={<FaYoutube />} label="YouTube" />
                <AttachButton icon={<FaPlus />} label="สร้าง" />
                <AttachButton icon={<FaUpload />} label="อัปโหลด" />
                <AttachButton icon={<FaLink />} label="ลิงก์" />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-12 xl:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[14px] font-semibold text-gray-900">สำหรับ</div>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-blue-400"
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="mt-6 text-[14px] font-semibold text-gray-900">
                มอบหมายให้
              </div>
              <button
                type="button"
                onClick={() =>
                  setAssignees((p) =>
                    p === "นักเรียนทั้งหมด" ? "เลือกบางคน (mock)" : "นักเรียนทั้งหมด"
                  )
                }
                className="mt-3 w-full h-12 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 text-blue-700 font-semibold"
              >
                <FaUsers />
                {assignees}
              </button>

              <div className="mt-6 text-[14px] font-semibold text-gray-900">
                คะแนน
              </div>
              <select
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="mt-3 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-blue-400"
              >
                {pointsList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* ✅ ครบกำหนด (calendar style) */}
              <div className="mt-6 text-[14px] font-semibold text-gray-900">
                ครบกำหนด
              </div>
              <DueDatePopover
                open={dueOpen}
                onOpenChange={setDueOpen}
                dueDate={dueDate}
                setDueDate={setDueDate}
                dueTime={dueTime}
                setDueTime={setDueTime}
              />

              <div className="mt-6 text-[14px] font-semibold text-gray-900">
                หัวข้อ
              </div>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-blue-400"
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* checkboxes */}
              <div className="mt-7 space-y-4">
                <label className="flex items-center gap-3 text-[14px] text-gray-800 select-none">
                  <input
                    type="checkbox"
                    checked={studentsReply}
                    onChange={(e) => setStudentsReply(e.target.checked)}
                    className="w-5 h-5 accent-blue-600"
                  />
                  นักเรียนตอบกลับเพื่อนได้
                </label>

                <label className="flex items-center gap-3 text-[14px] text-gray-800 select-none">
                  <input
                    type="checkbox"
                    checked={studentsEdit}
                    onChange={(e) => setStudentsEdit(e.target.checked)}
                    className="w-5 h-5 accent-blue-600"
                  />
                  นักเรียนสามารถแก้ไขคำตอบได้
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== DueDate Popover (calendar button like your screenshot) ===== */
function DueDatePopover({ open, onOpenChange, dueDate, setDueDate, dueTime, setDueTime }) {
  const wrapRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  const formatThaiLike = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "";
    const [y, m, d] = yyyy_mm_dd.split("-");
    return `${d}/${m}/${y}`;
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) onOpenChange(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  const openNativeDatePicker = () => {
    if (!dateRef.current) return;
    if (typeof dateRef.current.showPicker === "function") dateRef.current.showPicker();
    else {
      dateRef.current.focus();
      dateRef.current.click();
    }
  };

  return (
    <div className="relative mt-3" ref={wrapRef}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-[13px] text-gray-700">
          {dueDate
            ? `${formatThaiLike(dueDate)}${dueTime ? ` ${dueTime}` : ""}`
            : "ไม่มีวันที่ครบกำหนด"}
        </span>
        <FaChevronDown className="text-[12px] text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[340px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden z-50">
          <div className="px-5 py-4 text-[14px] font-semibold text-gray-900">
            วันที่และเวลาที่ครบกำหนด
          </div>
          <div className="border-t border-gray-200" />

          <div className="p-5 space-y-4">
            {/* date box */}
            <div>
              <div className="rounded-xl bg-[#E9EEF6] px-4 py-3 relative">
                <div className="text-[13px] font-semibold text-blue-700">
                  วันที่ครบกำหนด
                </div>
                <div className="mt-1 text-[16px] text-gray-900">
                  {dueDate ? formatThaiLike(dueDate) : "ไม่มีวันที่ครบกำหนด"}
                </div>
                <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-blue-600 rounded-b-xl" />

                <button
                  type="button"
                  onClick={openNativeDatePicker}
                  title="เปิดปฏิทิน"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-200/60 hover:bg-gray-200 flex items-center justify-center"
                >
                  <FaRegCalendarAlt className="text-gray-700" />
                </button>

                <input
                  ref={dateRef}
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setTimeout(() => timeRef.current?.focus(), 0);
                  }}
                  className="absolute opacity-0 pointer-events-none"
                  tabIndex={-1}
                />
              </div>

              <div className="mt-2 text-[12px] text-gray-500">DD/MM/YYYY</div>

              {dueDate && (
                <button
                  type="button"
                  onClick={() => {
                    setDueDate("");
                    setDueTime("");
                  }}
                  className="mt-2 text-[12px] text-gray-500 hover:text-gray-700 underline"
                >
                  ล้างวันครบกำหนด
                </button>
              )}
            </div>

            {/* time */}
            <div>
              <div className="text-[13px] font-semibold text-gray-900">
                เวลา (ไม่บังคับ)
              </div>
              <input
                ref={timeRef}
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
                className={`mt-2 w-full h-12 rounded-xl border px-4 outline-none ${
                  dueDate
                    ? "border-gray-200 bg-gray-50 focus:border-blue-400"
                    : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              />
              <div className="mt-1 text-[11px] text-gray-500">
                เลือกวันก่อนถึงจะเลือกเวลาได้
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-xl hover:bg-gray-100 text-gray-700 font-medium"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Attach button ===== */
function AttachButton({ icon, label }) {
  return (
    <button type="button" className="flex flex-col items-center gap-2 w-[86px] hover:opacity-90">
      <div className="w-14 h-14 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-gray-700">
        {icon}
      </div>
      <div className="text-[13px] text-gray-700">{label}</div>
    </button>
  );
}

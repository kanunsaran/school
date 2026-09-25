import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
  FaTimes,
  FaQuestionCircle,
  FaChevronDown,
  FaLink,
  FaImage,
  FaVideo,
  FaFileAlt,
  FaUsers,
  FaPaperclip,
} from "react-icons/fa";
import Swal from "sweetalert2";
import Select from "react-select";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { getStudent, getClasses, getEnrollments, getAssignmentById, getAssignmentFiles, getAssignmentClasses, updateAssignment } from "../callapi/callapi_user.jsx";
import { API_BASE, formatFullThaiDate, formatThaiTimeLabel } from "../utils/feedShared.js";
import { resolveFileUrl } from "../utils/media.js";
import PromptModal from "../components/PromptModal.jsx";
import ThaiCalendarPicker from "../components/ThaiCalendarPicker.jsx";
import ThaiTimeField from "../components/ThaiTimeField.jsx";

const dateToStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const timeToStr = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// วันนี้/เวลานี้ ใช้กันเลือกวันหรือเวลาย้อนหลัง
const getTodayStr = () => dateToStr(new Date());
const getNowTimeStr = () => timeToStr(new Date());

// แสดงห้องจาก grades เป็น "ม.6/17 (วิทย์-คณิต)"
const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

// สไตล์ react-select แบบ form field เต็มความสูง h-12 ให้เข้าชุดกับ input อื่นในฟอร์มนี้ (bg-gray-50, rounded-xl) — เหมือนกับ WorkCreate.jsx เพื่อให้อยู่ Design System เดียวกัน
const formSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "48px",
    height: "48px",
    borderRadius: "12px",
    borderColor: state.isFocused ? "#f472b6" : "#e5e7eb",
    backgroundColor: "#f9fafb",
    boxShadow: "none",
    fontSize: "16px",
    cursor: "pointer",
    "&:hover": { borderColor: "#f472b6" },
  }),
  valueContainer: (base) => ({ ...base, height: "48px", padding: "0 16px" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: "none" }),
  indicatorsContainer: (base) => ({ ...base, height: "48px" }),
  singleValue: (base) => ({ ...base, color: "#111827" }),
  menu: (base) => ({ ...base, borderRadius: "12px", overflow: "hidden", zIndex: 20 }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    borderRadius: "8px",
    fontSize: "16px",
    backgroundColor: state.isSelected ? "#ec4899" : state.isFocused ? "#fdf2f8" : "white",
    color: state.isSelected ? "white" : "#374151",
    cursor: "pointer",
  }),
};

// ⚠️ หน้านี้ใช้ตาราง assignment/send_ass เดียวกับ "งาน" (backend ยังไม่มีตาราง question แยก) —
// คำถามคือ assignment แถวหนึ่งที่ทำ flag post_type='question' ไว้ (คอลัมน์จริงในตาราง assignment)
// การให้คะแนน: ถ้า "ไม่มีคะแนน" ส่ง points=0 ไปด้วย แล้วหน้า QuestionDetail/StudentQuestionDetail จะอ่าน assignment.has_score มาซ่อน UI คะแนนทั้งหมด
export default function QuestionCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams(); // มีค่า = โหมดแก้ไขคำถามเดิม, ไม่มี = สร้างใหม่

  const pointsList = useMemo(() => [100, 50, 20, 10, 5, 0], []);

  const MAX_FILES = 10;
  const MAX_SIZE_MB = 10;

  // ===== form state =====
  const [question, setQuestion] = useState("");
  const [desc, setDesc] = useState("");
  const [hasScore, setHasScore] = useState(true);
  const [answerFormat, setAnswerFormat] = useState("long"); // "short" (input บรรทัดเดียว) | "long" (textarea)
  const [points, setPoints] = useState(100);
  const [chapters, setChapters] = useState([]);
  const [chapter, setChapter] = useState(null);
  const [existingFiles, setExistingFiles] = useState([]); // ไฟล์ที่แนบไว้เดิม (โหมดแก้ไข) — แสดงอ่านอย่างเดียว

  // ===== สำหรับ (หลายห้องได้จริงจาก grades) =====
  const [classesList, setClassesList] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [classesOpen, setClassesOpen] = useState(false);

  // ===== attachments (ไฟล์/ลิงก์/youtube) เหมือน WorkCreate.jsx =====
  const [attachments, setAttachments] = useState([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  // ===== มอบหมายให้ (multi-select นักเรียนจริง) =====
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assigneeMode, setAssigneeMode] = useState("all"); // "all" | "some"
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assigneesOpen, setAssigneesOpen] = useState(false);

  const availableStudents = useMemo(() => {
    if (selectedClassIds.length === 0) return [];
    const selectedClassIdStrs = new Set(selectedClassIds.map(String));
    const enrolledIds = new Set(
      enrollments
        .filter((e) => selectedClassIdStrs.has(String(e.grade_idgrade)))
        .map((e) => String(e.user_user_id))
    );
    return students.filter((s) => enrolledIds.has(String(s.user_id)));
  }, [students, enrollments, selectedClassIds]);

  useEffect(() => {
    setSelectedStudentIds((prev) => {
      const availableIds = new Set(availableStudents.map((s) => s.user_id));
      const next = prev.filter((id) => availableIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [availableStudents]);

  // ✅ due date/time
  const [dueOpen, setDueOpen] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");

  // ===== เวลาโพสต์ (ทันที หรือ ตั้งเวลาล่วงหน้า) =====
  const [postOpen, setPostOpen] = useState(false);
  const [postMode, setPostMode] = useState("now");
  const [postDate, setPostDate] = useState("");
  const [postTime, setPostTime] = useState("");

  const canAsk = question.trim().length > 0 && selectedClassIds.length > 0;

  useEffect(() => {
    fetch(`${API_BASE}/chapter`, { method: "GET" })
      .then(res => res.json())
      .then(data => {
        setChapters(data);
        if (data.length > 0) setChapter(data[0].chapter_id);
      });

    getStudent()
      .then((data) => setStudents(data || []))
      .catch((err) => console.error("โหลดรายชื่อนักเรียนไม่สำเร็จ:", err));

    getEnrollments()
      .then((data) => setEnrollments(data || []))
      .catch((err) => console.error("โหลดข้อมูลการเชื่อมห้องไม่สำเร็จ:", err));

    getClasses()
      .then((data) => {
        const list = (data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        setClassesList(list);

        if (id) return;

        const gradeIdFromUrl = searchParams.get("gradeId");
        const matched = list.find((c) => String(c.id) === gradeIdFromUrl);
        if (matched) {
          setSelectedClassIds([matched.id]);
        } else if (list.length > 0) {
          setSelectedClassIds([list[0].id]);
        }
      })
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนไม่สำเร็จ:", err));
  }, [id, searchParams]);

  // โหมดแก้ไข: โหลดข้อมูลคำถามเดิมมา prefill ฟอร์ม
  useEffect(() => {
    if (!id) return;
    const loadForEdit = async () => {
      try {
        const [assignment, files, links] = await Promise.all([
          getAssignmentById(id),
          getAssignmentFiles(id).catch(() => []),
          getAssignmentClasses({ ass_id: id }).catch(() => []),
        ]);
        setQuestion(assignment.title || "");
        setDesc(assignment.description || "");
        const scored = !!assignment.has_score;
        setHasScore(scored);
        setPoints(scored ? (assignment.max_score ?? 100) : 100);
        setAnswerFormat(assignment.answer_format || "long");
        if (assignment.chapter_chapter_id) setChapter(assignment.chapter_chapter_id);
        setExistingFiles(files || []);
        setSelectedClassIds((links || []).map((l) => l.grade_id));

        if (assignment.deadline) {
          const d = new Date(assignment.deadline);
          setDueDate(dateToStr(d));
          setDueTime(timeToStr(d));
        }
        if (assignment.scheduled_at) {
          const d = new Date(assignment.scheduled_at);
          setPostMode("scheduled");
          setPostDate(dateToStr(d));
          setPostTime(timeToStr(d));
        }
      } catch (err) {
        console.error("โหลดข้อมูลคำถามเดิมไม่สำเร็จ:", err);
        Swal.fire({ icon: "error", title: "โหลดข้อมูลคำถามไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
      }
    };
    loadForEdit();
  }, [id]);

  // ============ แนบลิงก์ ============
  const confirmAttachLink = (url) => {
    setAttachments((prev) => [
      ...prev.filter((a) => a.type !== "link"),
      { id: Date.now(), type: "link", url },
    ]);
    setLinkDialogOpen(false);
  };

  // ============ อัปโหลดไฟล์จากเครื่อง ============
  const openFilePicker = (accept) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  };

  const handleFileSelected = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const currentFileCount = attachments.filter((a) => a.type === "file").length;
    if (currentFileCount + selected.length > MAX_FILES) {
      Swal.fire("แนบไฟล์เกินจำนวน", `แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์`, "warning");
      e.target.value = "";
      return;
    }

    const oversize = selected.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversize) {
      Swal.fire("ไฟล์ใหญ่เกินไป", `แต่ละไฟล์ต้องไม่เกิน ${MAX_SIZE_MB}MB (${oversize.name})`, "warning");
      e.target.value = "";
      return;
    }

    const newAttachments = selected.map((f, i) => ({
      id: Date.now() + i,
      type: "file",
      file: f,
      name: f.name,
      isImage: f.type.startsWith("image/"),
      isVideo: f.type.startsWith("video/"),
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ============ มอบหมายให้ ============
  const toggleStudent = (userId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const assigneesLabel =
    assigneeMode === "all"
      ? "นักเรียนทั้งหมด"
      : selectedStudentIds.length > 0
        ? `เลือกแล้ว ${selectedStudentIds.length} คน`
        : "เลือกนักเรียน";

  // ============ สำหรับ (ห้องเรียน) ============
  const toggleClass = (classId) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const classesLabel =
    selectedClassIds.length === 0
      ? "เลือกห้อง"
      : classesList
          .filter((c) => selectedClassIds.includes(c.id))
          .map((c) => gradeLabel(c))
          .join(", ");

  // ============ เพิ่มหัวข้อใหม่ ============
  const confirmAddChapter = async ({ title: titleVal, description: descVal }) => {
    try {
      const res = await fetch(`${API_BASE}/chapter/chapter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleVal, description: descVal }),
      });
      const newChapter = await res.json();
      setChapters((prev) => [newChapter, ...prev]);
      setChapter(newChapter.chapter_id);
      setChapterDialogOpen(false);
    } catch (err) {
      console.error("เพิ่มหัวข้อไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "เพิ่มหัวข้อไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const onAsk = async () => {
    if (!canAsk) return;

    if (assigneeMode === "some" && selectedStudentIds.length === 0) {
      Swal.fire("ยังไม่ได้เลือกนักเรียน", "เลือกนักเรียนอย่างน้อย 1 คน หรือเปลี่ยนเป็น 'นักเรียนทั้งหมด'", "warning");
      return;
    }

    if (postMode === "scheduled" && !postDate) {
      Swal.fire("ยังไม่ได้ตั้งเวลาโพสต์", "เลือกวันที่จะโพสต์ หรือเปลี่ยนเป็น 'โพสต์ทันที'", "warning");
      return;
    }

    const link = attachments.find((a) => a.type === "link");
    const isYoutubeLink = link && /(?:youtube\.com|youtu\.be)/i.test(link.url);
    const files = attachments.filter((a) => a.type === "file").map((a) => a.file);

    const formData = new FormData();
    formData.append("title", question);
    formData.append("description", desc);
    formData.append("chapterId", chapter);
    formData.append("points", hasScore ? points : 0);
    formData.append("post_type", "question");
    formData.append("has_score", hasScore);
    formData.append("answer_format", answerFormat);
    formData.append("classIds", JSON.stringify(selectedClassIds));
    formData.append(
      "assignees",
      JSON.stringify(assigneeMode === "all" ? [] : selectedStudentIds)
    );
    if (link && isYoutubeLink) formData.append("youtube_url", link.url);
    if (link && !isYoutubeLink) formData.append("link_url", link.url);
    if (dueDate) formData.append("deadline", `${dueDate} ${dueTime || "00:00"}`);
    if (postMode === "scheduled" && postDate) {
      formData.append("scheduled_at", `${postDate} ${postTime || "00:00"}`);
    }
    files.forEach((f) => formData.append("files", f));

    try {
      if (id) {
        await updateAssignment(id, formData);
      } else {
        const res = await fetch(`${API_BASE}/assignment`, {
          method: "POST",
          body: formData,
        });

        const text = await res.text();
        console.log(res.status, text);

        if (!res.ok) throw new Error(text || "ส่งคำถามไม่สำเร็จ");
      }

      const returnGradeId = searchParams.get("gradeId");
      navigate(returnGradeId ? `/classroom/${returnGradeId}/work` : "/work");
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: id ? "บันทึกการแก้ไขไม่สำเร็จ" : "สร้างคำถามไม่สำเร็จ", text: err.message || "ลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div className="fixed inset-0 bg-white text-gray-800 overflow-hidden">
      {/* ===== Top Bar (fixed) ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            type="button" style={{backgroundColor: "white"}}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700"
            title="ปิด"
          >
            <FaTimes className="text-gray-700" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FaQuestionCircle className="text-gray-700" />
            </div>
            <div className="text-[19.5px] font-semibold text-gray-900">{id ? "แก้ไขคำถาม" : "คำถาม"}</div>
          </div>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            disabled={!canAsk}
            onClick={onAsk}
            className={`h-11 px-6 rounded-xl font-semibold text-[16px] transition-colors ${
              canAsk ? "bg-pink-500 text-white hover:bg-pink-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {id ? "บันทึกการแก้ไข" : "มอบหมายคำถาม"}
          </button>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="absolute left-0 right-0 top-16 bottom-0 w-full overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-12 gap-8 w-full">
          {/* LEFT */}
          <div className="col-span-12 xl:col-span-9">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="block text-[14.5px] font-semibold text-pink-700">
                คำถาม<span className="text-red-500">*</span>
              </label>

              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-pink-400"
              />

              <div className="mt-3 text-[13.5px] text-gray-500">*จำเป็น</div>

              <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden">
                <CKEditor
                  editor={ClassicEditor}
                  data={desc}
                  onChange={(event, editor) => setDesc(editor.getData())}
                  config={{
                    placeholder: "คำแนะนำ (ไม่บังคับ)",
                    toolbar: ["bold", "italic", "underline", "bulletedList", "numberedList", "link"],
                  }}
                />
              </div>

              {existingFiles.length > 0 && (
                <div className="mt-4">
                  <div className="text-[14px] text-gray-500 mb-1.5">ไฟล์ที่แนบไว้เดิม</div>
                  <div className="flex flex-col gap-2">
                    {existingFiles.map((f, i) => (
                      <a
                        key={f.file_id ?? i}
                        href={resolveFileUrl(API_BASE, f.file_path || f.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 text-[16px] text-blue-600 hover:underline"
                      >
                        <FaPaperclip className="text-blue-500 shrink-0" />
                        <span className="truncate">{f.file_name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  {attachments.filter((a) => a.type === "file" && a.isImage).length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {attachments.filter((a) => a.type === "file" && a.isImage).map((item) => (
                        <div key={item.id} className="relative shrink-0" style={{ width: 96, height: 96 }}>
                          <img src={item.previewUrl} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                          <button
                            onClick={() => removeAttachment(item.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-500 flex items-center justify-center shadow"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {attachments.filter((a) => !(a.type === "file" && a.isImage)).map((item) => (
                    <div key={item.id} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.type === "link" && <FaLink className="text-purple-500 shrink-0" />}
                        {item.type === "file" && item.isVideo && <FaVideo className="text-red-500 shrink-0" />}
                        {item.type === "file" && !item.isVideo && <FaPaperclip className="text-blue-500 shrink-0" />}

                        {item.type === "file" ? (
                          <span className="text-[16px] text-gray-700 truncate">{item.name}</span>
                        ) : (
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-[16px] text-blue-600 hover:underline truncate">
                            {item.url}
                          </a>
                        )}
                      </div>

                      <button onClick={() => removeAttachment(item.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              multiple
              className="hidden"
            />

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[16px] font-semibold text-gray-900">แนบ</div>
              <div className="mt-4 flex flex-wrap gap-6">
                <AttachButton icon={<FaImage className="text-emerald-500" />} label="รูปภาพ" onClick={() => openFilePicker("image/*")} />
                <AttachButton icon={<FaFileAlt className="text-blue-500" />} label="ไฟล์" onClick={() => openFilePicker(".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip")} />
                <AttachButton icon={<FaLink className="text-purple-500" />} label="ลิงก์" onClick={() => setLinkDialogOpen(true)} />
                <AttachButton icon={<FaVideo className="text-red-500" />} label="วิดีโอ" onClick={() => openFilePicker("video/*")} />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-12 xl:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[16px] font-semibold text-gray-900">การให้คะแนน</div>
              <div className="mt-3 flex flex-col gap-2">
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${!hasScore ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="hasScore" checked={!hasScore} onChange={() => setHasScore(false)} className="accent-pink-500" />
                  <span className="text-[16px] text-gray-800">ไม่มีคะแนน</span>
                </label>
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${hasScore ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="hasScore" checked={hasScore} onChange={() => setHasScore(true)} className="accent-pink-500" />
                  <span className="text-[16px] text-gray-800">มีคะแนน</span>
                </label>
              </div>

              {hasScore && (
                <>
                  <div className="mt-5 text-[16px] font-semibold text-gray-900">คะแนนเต็ม</div>
                  <input
                    type="number"
                    min="0"
                    value={points}
                    onChange={(e) => setPoints(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="กรอกคะแนนเต็ม"
                    className="mt-3 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-pink-400"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pointsList.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPoints(p)}
                        style={{ backgroundColor: "white" }}
                        className={`h-8 px-3 rounded-full border text-[13.5px] transition-colors ${
                          points === p
                            ? "border-pink-400 bg-pink-50 text-pink-700 font-semibold"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[16px] font-semibold text-gray-900">รูปแบบคำตอบ</div>
              <div className="mt-3 flex flex-col gap-2">
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${answerFormat === "short" ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="answerFormat" checked={answerFormat === "short"} onChange={() => setAnswerFormat("short")} className="accent-pink-500" />
                  <span className="text-[16px] text-gray-800">คำตอบสั้น</span>
                </label>
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${answerFormat === "long" ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="answerFormat" checked={answerFormat === "long"} onChange={() => setAnswerFormat("long")} className="accent-pink-500" />
                  <span className="text-[16px] text-gray-800">คำตอบยาว</span>
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[16px] font-semibold text-gray-900">สำหรับ</div>
              <ClassesPopover
                open={classesOpen}
                onOpenChange={setClassesOpen}
                classesList={classesList}
                selectedClassIds={selectedClassIds}
                toggleClass={toggleClass}
                label={classesLabel}
              />

              <div className="mt-6 text-[16px] font-semibold text-gray-900">มอบหมายให้</div>
              <AssigneesPopover
                open={assigneesOpen}
                onOpenChange={setAssigneesOpen}
                students={availableStudents}
                assigneeMode={assigneeMode}
                setAssigneeMode={setAssigneeMode}
                selectedStudentIds={selectedStudentIds}
                toggleStudent={toggleStudent}
                setSelectedStudentIds={setSelectedStudentIds}
                label={assigneesLabel}
              />

              <div className="mt-6 text-[16px] font-semibold text-gray-900">เวลาโพสต์</div>
              <PostTimePopover
                open={postOpen}
                onOpenChange={setPostOpen}
                postMode={postMode}
                setPostMode={setPostMode}
                postDate={postDate}
                setPostDate={setPostDate}
                postTime={postTime}
                setPostTime={setPostTime}
              />

              <div className="mt-6 text-[16px] font-semibold text-gray-900" >ครบกำหนด</div>
              <DueDatePopover
                open={dueOpen}
                onOpenChange={setDueOpen}
                dueDate={dueDate}
                setDueDate={setDueDate}
                dueTime={dueTime}
                setDueTime={setDueTime}
              />

              <div className="mt-6 text-[16px] font-semibold text-gray-900">หัวข้อ</div>

              <Select
                className="mt-3"
                styles={formSelectStyles}
                value={chapters.map((c) => ({ value: c.chapter_id, label: c.title })).find((o) => String(o.value) === String(chapter)) || null}
                onChange={(opt) => setChapter(opt.value)}
                options={chapters.map((c) => ({ value: c.chapter_id, label: c.title }))}
                placeholder="เลือกหัวข้อ"
                isSearchable={false}
              />

              <button
                type="button"
                style={{ backgroundColor: "#ffff" }}
                onClick={() => setChapterDialogOpen(true)}
                className="mt-2 w-full h-10 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-pink-700 font-semibold"
              >
                + เพิ่มหัวข้อใหม่
              </button>
            </div>
          </div>
        </div>
      </div>

      {linkDialogOpen && (
        <PromptModal
          title="แนบลิงก์"
          icon={FaLink}
          label="URL"
          placeholder="วาง URL ที่นี่... (วางลิงก์ YouTube ได้เลย)"
          confirmLabel="แนบ"
          onConfirm={confirmAttachLink}
          onClose={() => setLinkDialogOpen(false)}
        />
      )}

      {chapterDialogOpen && (
        <AddChapterDialog onConfirm={confirmAddChapter} onClose={() => setChapterDialogOpen(false)} />
      )}
    </div>
  );
}

/* ===== DueDate Popover (Material-like) ===== */
function DueDatePopover({ open, onOpenChange, dueDate, setDueDate, dueTime, setDueTime }) {
  const wrapRef = useRef(null);
  const [mode, setMode] = useState(dueDate ? "scheduled" : "none");

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  const chooseNone = () => {
    setMode("none");
    setDueDate("");
    setDueTime("");
  };

  return (
    <div className="relative mt-3" ref={wrapRef}>
      <button style={{backgroundColor: "white"}}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-[14.5px] text-gray-700">
          {dueDate ? `กำหนดแล้ว: ${formatFullThaiDate(dueDate)}${dueTime ? ` ${formatThaiTimeLabel(dueTime)}` : ""}` : "ไม่มีวันครบกำหนด"}
        </span>
        <FaChevronDown className="text-[13.5px] text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[340px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] z-50">
          <div className="p-3 border-b border-gray-100">
            <button style={{backgroundColor: mode === "none" ? "" : "white"}}
              type="button"
              onClick={chooseNone}
              className={`w-full text-left px-3 py-2 rounded-xl text-[16px] ${mode === "none" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
            >
              ไม่มีวันครบกำหนด
            </button>
            <button style={{backgroundColor: mode === "scheduled" ? "" : "white"}}
              type="button"
              onClick={() => setMode("scheduled")}
              className={`mt-1 w-full text-left px-3 py-2 rounded-xl text-[16px] ${mode === "scheduled" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
            >
              ตั้งวันครบกำหนด
            </button>
          </div>

          {mode === "scheduled" && (
            <div className="p-4 space-y-4">
              <ThaiCalendarPicker value={dueDate} min={getTodayStr()} onChange={setDueDate} />

              <div>
                <div className="text-[14.5px] font-semibold text-gray-900 mb-2">เวลา (ไม่บังคับ)</div>
                <ThaiTimeField
                  value={dueTime}
                  onChange={setDueTime}
                  min={dueDate === getTodayStr() ? getNowTimeStr() : undefined}
                  disabled={!dueDate}
                />
                {!dueDate && <div className="mt-1 text-[12.5px] text-gray-500">เลือกวันก่อนถึงจะเลือกเวลาได้</div>}
              </div>

              {dueDate && (
                <button style={{backgroundColor: "white"}}
                  type="button"
                  onClick={chooseNone}
                  className="text-[13.5px] text-gray-500 hover:text-gray-700 underline"
                >
                  ล้างวันครบกำหนด
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 p-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Assignees Popover (เลือกนักเรียนจริงจากรายชื่อ) ===== */
function AssigneesPopover({
  open,
  onOpenChange,
  students,
  assigneeMode,
  setAssigneeMode,
  selectedStudentIds,
  toggleStudent,
  setSelectedStudentIds,
  label,
}) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) onOpenChange(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        style={{ backgroundColor: "#ffff" }}
        onClick={() => onOpenChange(!open)}
        className="mt-3 w-full h-12 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 text-pink-700 font-semibold"
      >
        <FaUsers />
        {label}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[280px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden z-50">
          <div className="p-3 border-b border-gray-100">
            <button
              type="button"
              style={{ backgroundColor: "white" }}
              onClick={() => setAssigneeMode("all")}
              className={`w-full text-left px-3 py-2 rounded-xl text-[16px] ${
                assigneeMode === "all" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              นักเรียนทั้งหมด
            </button>
            <button
              type="button"
              style={{ backgroundColor: "white" }}
              onClick={() => setAssigneeMode("some")}
              className={`mt-1 w-full text-left px-3 py-2 rounded-xl text-[16px] ${
                assigneeMode === "some" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              เลือกบางคน
            </button>
          </div>

          {assigneeMode === "some" && (
            <div className="max-h-[280px] overflow-y-auto p-2">
              {students.length === 0 && (
                <div className="px-3 py-4 text-[16px] text-gray-400 text-center">ไม่พบรายชื่อนักเรียน</div>
              )}

              {students.map((s) => (
                <label
                  key={s.user_id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer text-[16px] text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(s.user_id)}
                    onChange={() => toggleStudent(s.user_id)}
                    className="w-4 h-4"
                  />
                  {s.fullname}
                </label>
              ))}

              {students.length > 0 && (
                <div className="flex gap-2 px-3 pt-2 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    style={{ backgroundColor: "white" }}
                    onClick={() => setSelectedStudentIds(students.map((s) => s.user_id))}
                    className="text-[13.5px] text-blue-600 hover:underline"
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    style={{ backgroundColor: "white" }}
                    onClick={() => setSelectedStudentIds([])}
                    className="text-[13.5px] text-gray-400 hover:underline"
                  >
                    ไม่เลือกเลย
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Classes Popover (เลือกได้หลายห้องจาก grades จริง) ===== */
function ClassesPopover({ open, onOpenChange, classesList, selectedClassIds, toggleClass, label }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) onOpenChange(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  return (
    <div className="relative mt-3" ref={wrapRef}>
      <button
        type="button"
        style={{ backgroundColor: "white" }}
        onClick={() => onOpenChange(!open)}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-[14.5px] text-gray-700 truncate text-left">{label}</span>
        <FaChevronDown className="text-[13.5px] text-gray-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[280px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden z-50">
          <div className="max-h-[280px] overflow-y-auto p-2">
            {classesList.length === 0 && (
              <div className="px-3 py-4 text-[16px] text-gray-400 text-center">ไม่พบห้องเรียน</div>
            )}

            {classesList.map((c) => {
              const checked = selectedClassIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-[16px] ${
                    checked ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleClass(c.id)}
                    className="w-4 h-4 accent-pink-500"
                  />
                  {gradeLabel(c)}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Post-time Popover (โพสต์ทันที หรือ ตั้งเวลาโพสต์ล่วงหน้า) ===== */
function PostTimePopover({ open, onOpenChange, postMode, setPostMode, postDate, setPostDate, postTime, setPostTime }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) onOpenChange(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  const label =
    postMode === "now"
      ? "โพสต์ทันที"
      : postDate
        ? `ตั้งเวลา: ${formatFullThaiDate(postDate)}${postTime ? ` ${formatThaiTimeLabel(postTime)}` : ""}`
        : "ตั้งเวลาโพสต์";

  return (
    <div className="relative mt-3" ref={wrapRef}>
      <button
        type="button"
        style={{ backgroundColor: "white" }}
        onClick={() => onOpenChange(!open)}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-[14.5px] text-gray-700">{label}</span>
        <FaChevronDown className="text-[13.5px] text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[300px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] z-50">
          <div className="p-3 border-b border-gray-100">
            <button
              type="button"
              style={{ backgroundColor: "white" }}
              onClick={() => setPostMode("now")}
              className={`w-full text-left px-3 py-2 rounded-xl text-[16px] ${
                postMode === "now" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              โพสต์ทันที
            </button>
            <button
              type="button"
              style={{ backgroundColor: "white" }}
              onClick={() => setPostMode("scheduled")}
              className={`mt-1 w-full text-left px-3 py-2 rounded-xl text-[16px] ${
                postMode === "scheduled" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              ตั้งเวลาโพสต์
            </button>
          </div>

          {postMode === "scheduled" && (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[14.5px] font-semibold text-gray-900 mb-2">วันที่โพสต์</div>
                <ThaiCalendarPicker value={postDate} min={getTodayStr()} onChange={setPostDate} />
              </div>

              <PostTimeField postDate={postDate} postTime={postTime} setPostTime={setPostTime} />
            </div>
          )}

          <div className="flex justify-end gap-2 p-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== ปุ่มเลือกเวลาโพสต์ (คลิกแล้วเปิดนาฬิกาไทยแบบ custom) ===== */
function PostTimeField({ postDate, postTime, setPostTime }) {
  return (
    <div>
      <div className="text-[14.5px] font-semibold text-gray-900 mb-2">เวลาโพสต์</div>
      <ThaiTimeField
        value={postTime}
        onChange={setPostTime}
        min={postDate === getTodayStr() ? getNowTimeStr() : undefined}
        disabled={!postDate}
      />
    </div>
  );
}

/* ===== Attach button ===== */
function AttachButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 w-[86px] hover:opacity-90" style={{backgroundColor: "white"}}>
      <div className="w-14 h-14 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-gray-700">
        {icon}
      </div>
      <div className="text-[14.5px] text-gray-700">{label}</div>
    </button>
  );
}

/* ===== เพิ่มหัวข้อใหม่ — ชื่อหัวข้อ (บังคับ) + คำอธิบาย (ไม่บังคับ) หน้าตาเข้าชุดกับ PromptModal ===== */
function AddChapterDialog({ onConfirm, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const trimmed = title.trim();

  const confirm = () => {
    if (!trimmed) return;
    onConfirm({ title: trimmed, description: description.trim() });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] max-w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[17.5px] font-bold text-gray-900">เพิ่มหัวข้อใหม่</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-transparent">
            <FaTimes size={16} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[14.5px] font-medium text-gray-700 mb-1.5">ชื่อหัวข้อ</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ชื่อหัวข้อ"
              autoFocus
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-[16.5px] outline-none focus:border-pink-400"
            />
          </div>
          <div>
            <label className="block text-[14.5px] font-medium text-gray-700 mb-1.5">คำอธิบายหัวข้อ (ไม่บังคับ)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="คำอธิบายหัวข้อ (ไม่บังคับ)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[16.5px] leading-relaxed outline-none focus:border-pink-400 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[16px] font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!trimmed}
            className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[16px] font-semibold"
          >
            เพิ่มหัวข้อ
          </button>
        </div>
      </div>
    </div>
  );
}

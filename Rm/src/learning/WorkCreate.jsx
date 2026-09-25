import { API_URL } from "../config.js";
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaTimes,
  FaRegClipboard,
  FaChevronDown,
  FaLink,
  FaImage,
  FaVideo,
  FaFileAlt,
  FaUsers,
  FaRegCalendarAlt,
  FaPaperclip,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { getStudent, getClasses, getEnrollments } from "../callapi/callapi_user.jsx";
import { setWorkTypeLocal } from "../utils/submissionExtras.js";

// วันนี้/เวลานี้ ใช้กันเลือกวันหรือเวลาย้อนหลัง
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const getNowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// แสดงห้องจาก grades เป็น "ม.6/17 (วิทย์-คณิต)"
const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

export default function WorkCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pointsList = useMemo(() => [100, 50, 20, 10, 5, 0], []);

  const MAX_FILES = 10;
  const MAX_SIZE_MB = 10;

  // ===== form state =====
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [points, setPoints] = useState(100);
  const [chapters, setChapters] = useState([]);
  const [chapter, setChapter] = useState(null);
  // ⚠️ backend ยังไม่มีคอลัมน์เก็บประเภทงาน ส่งไปเป็น work_type เผื่อไว้ก่อน (เก็บสำรองไว้ฝั่ง local ด้วยผ่าน setWorkType ของ submissionExtras)
  const [workType, setWorkType] = useState("individual"); // "individual" | "group"

  // ===== สำหรับ (หลายห้องได้จริงจาก grades) — ห้องที่ครูกดเข้ามาจาก ?gradeId=... จะถูกติ๊กไว้ให้อัตโนมัติ เพิ่มห้องอื่นได้อีก =====
  const [classesList, setClassesList] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [classesOpen, setClassesOpen] = useState(false);

  // ===== attachments (ไฟล์/ลิงก์/youtube) เหมือน PostComposerModal =====
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  // ===== มอบหมายให้ (multi-select นักเรียนจริง — กรองตามห้องที่เลือกไว้ผ่าน enroll) =====
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assigneeMode, setAssigneeMode] = useState("all"); // "all" | "some"
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assigneesOpen, setAssigneesOpen] = useState(false);

  // เลือกห้องไหนไว้ ก็ให้เลือกนักเรียนได้แค่คนที่ enroll อยู่ห้องนั้น ๆ (เลือกหลายห้องได้ก็รวมกัน)
  // หมายเหตุ: user_user_id จาก /enroll เป็น string ("1") แต่ user_id จาก getStudent() เป็น number (1)
  // เทียบตรง ๆ ด้วย Set.has จะไม่ match กันเลย เลยต้องแปลงเป็น String ก่อนเทียบทุกจุด
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

  // ถ้าลดห้องออกแล้วนักเรียนที่ติ๊กไว้ไม่อยู่ในรายชื่อที่เลือกได้แล้ว ให้เอาออกจากที่เลือกไว้ด้วย
  useEffect(() => {
    setSelectedStudentIds((prev) => {
      const availableIds = new Set(availableStudents.map((s) => s.user_id));
      const next = prev.filter((id) => availableIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [availableStudents]);

  // ✅ due date/time (ใช้งานจริง)
  const [dueOpen, setDueOpen] = useState(false);
  const [dueDate, setDueDate] = useState(""); // yyyy-mm-dd
  const [dueTime, setDueTime] = useState(""); // HH:mm

  // ===== เวลาโพสต์ (ทันที หรือ ตั้งเวลาล่วงหน้า) =====
  const [postOpen, setPostOpen] = useState(false);
  const [postMode, setPostMode] = useState("now"); // "now" | "scheduled"
  const [postDate, setPostDate] = useState("");
  const [postTime, setPostTime] = useState("");

  const canAssign = title.trim().length > 0 && selectedClassIds.length > 0;

  useEffect(() => {
    fetch(`${API_URL}/chapter`, { method: "GET" })
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
        // ตาราง grade จริงใช้ idgrade เป็น primary key (ไม่ใช่ id หรือ grade_id)
        const list = (data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        setClassesList(list);

        // ห้องที่ครูกดเข้ามาจาก ?gradeId=... ให้ติ๊กไว้อัตโนมัติ ไม่งั้น default เป็นห้องแรกในรายการ
        const gradeIdFromUrl = searchParams.get("gradeId");
        const matched = list.find((c) => String(c.id) === gradeIdFromUrl);
        if (matched) {
          setSelectedClassIds([matched.id]);
        } else if (list.length > 0) {
          setSelectedClassIds([list[0].id]);
        }
      })
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนไม่สำเร็จ:", err));
  }, []);

  // ============ แนบลิงก์ (auto-detect youtube ตอน submit ไม่ต้องมีปุ่มแยก) ============
  const attachLink = async () => {
    const result = await Swal.fire({
      title: "แนบลิงก์",
      input: "text",
      inputPlaceholder: "วาง URL ที่นี่... (วางลิงก์ YouTube ได้เลย)",
      showCancelButton: true,
      confirmButtonText: "แนบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#db2777",
    });

    if (!result.isConfirmed || !result.value) return;

    setAttachments((prev) => [
      ...prev.filter((a) => a.type !== "link"),
      { id: Date.now(), type: "link", url: result.value },
    ]);
  };

  // ============ อัปโหลดไฟล์จากเครื่อง (รูปภาพ/ไฟล์/วิดีโอ เลือกได้หลายไฟล์) ============
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

  // ============ เพิ่มหัวข้อใหม่ (ป็อปอัพธีมเดียวกับหน้าอื่น แทน prompt() ของเบราว์เซอร์) ============
  const handleAddChapter = async () => {
    const { value: formValues } = await Swal.fire({
      title: "เพิ่มหัวข้อใหม่",
      html:
        '<input id="swal-chapter-title" class="swal2-input" placeholder="ชื่อหัวข้อ">' +
        '<textarea id="swal-chapter-desc" class="swal2-textarea" placeholder="คำอธิบายหัวข้อ (ไม่บังคับ)"></textarea>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "เพิ่มหัวข้อ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#db2777",
      preConfirm: () => {
        const titleVal = document.getElementById("swal-chapter-title").value.trim();
        const descVal = document.getElementById("swal-chapter-desc").value.trim();
        if (!titleVal) {
          Swal.showValidationMessage("กรอกชื่อหัวข้อก่อนนะคะ");
          return false;
        }
        return { title: titleVal, description: descVal };
      },
    });

    if (!formValues) return;

    try {
      const res = await fetch(`${API_URL}/chapter/chapter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const newChapter = await res.json();
      setChapters((prev) => [newChapter, ...prev]);
      setChapter(newChapter.chapter_id);
    } catch (err) {
      console.error("เพิ่มหัวข้อไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "เพิ่มหัวข้อไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const onAssign = async () => {
    if (!canAssign) return;

    if (assigneeMode === "some" && selectedStudentIds.length === 0) {
      Swal.fire("ยังไม่ได้เลือกนักเรียน", "เลือกนักเรียนอย่างน้อย 1 คน หรือเปลี่ยนเป็น 'นักเรียนทั้งหมด'", "warning");
      return;
    }

    if (postMode === "scheduled" && !postDate) {
      Swal.fire("ยังไม่ได้ตั้งเวลาโพสต์", "เลือกวันที่จะโพสต์ หรือเปลี่ยนเป็น 'โพสต์ทันที'", "warning");
      return;
    }

    // ลิงก์ YouTube แนบผ่านปุ่ม "ลิงก์" ตัวเดียว แล้วเช็ค pattern เอาว่าเป็น YouTube หรือลิงก์ทั่วไปตอนส่ง
    const link = attachments.find((a) => a.type === "link");
    const isYoutubeLink = link && /(?:youtube\.com|youtu\.be)/i.test(link.url);
    const files = attachments.filter((a) => a.type === "file").map((a) => a.file);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", desc);
    formData.append("chapterId", chapter);
    formData.append("points", points);
    formData.append("classIds", JSON.stringify(selectedClassIds));
    formData.append(
      "assignees",
      JSON.stringify(assigneeMode === "all" ? [] : selectedStudentIds)
    );
    // ⚠️ backend ยังไม่มีคอลัมน์นี้ ส่งไปเผื่อไว้ (เผื่อ backend อ่านแล้วเก็บ) แต่หลักยึดค่าจาก setWorkTypeLocal ด้านล่างเป็นความจริงตอนนี้
    formData.append("work_type", workType);
    if (link && isYoutubeLink) formData.append("youtube_url", link.url);
    if (link && !isYoutubeLink) formData.append("link_url", link.url);
    if (dueDate) formData.append("deadline", `${dueDate} ${dueTime || "00:00"}`);
    if (postMode === "scheduled" && postDate) {
      formData.append("scheduled_at", `${postDate} ${postTime || "00:00"}`);
    }
    files.forEach((f) => formData.append("files", f));

    try {
      // เปลี่ยนเป็น URL backend จริง + ส่ง cookie สำหรับ auth
      const res = await fetch(`${API_URL}/assignment`, {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      console.log(res.status, text); // debug ดูว่าตอบอะไร

      if (!res.ok) throw new Error(text || "ส่งงานไม่สำเร็จ");

      // backend ยังไม่มีคอลัมน์ work_type ให้จำไว้ฝั่งนี้ก่อน หน้าให้คะแนนงานจะได้รู้ว่างานนี้เป็นงานเดี่ยวหรือกลุ่ม
      try {
        const created = JSON.parse(text);
        const newAssId = created?.ass_id ?? created?.insertId ?? created?.id;
        if (newAssId) setWorkTypeLocal(newAssId, workType);
      } catch {
        // เผื่อ backend ไม่ได้ตอบ JSON กลับมา ไม่ต้องพังทั้งฟอร์ม
      }

      // ถ้าเปิดมาจากแท็บ "งานในชั้นเรียน" ของห้องใดห้องหนึ่ง (?gradeId=...) ก็กลับไปที่แท็บนั้นของห้องนั้น ไม่งั้นกลับไปหน้า /work แบบเดิม
      const returnGradeId = searchParams.get("gradeId");
      navigate(returnGradeId ? `/classroom/${returnGradeId}/work` : "/work");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด: " + err.message);
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
              <FaRegClipboard className="text-gray-700" />
            </div>
            <div className="text-[18px] font-semibold text-gray-900">งาน</div>
          </div>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            disabled={!canAssign}
            onClick={onAssign}
            className={`h-11 px-6 rounded-full font-semibold text-sm transition-colors ${
              canAssign ? "bg-pink-600 text-white hover:bg-pink-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            มอบหมาย
          </button>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="absolute left-0 right-0 top-16 bottom-0 w-full overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-12 gap-8 w-full">
          {/* LEFT */}
          <div className="col-span-12 xl:col-span-9">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <label className="block text-[13px] font-semibold text-pink-700">
                ชื่อ<span className="text-red-500">*</span>
              </label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-pink-400"
              />

              <div className="mt-3 text-[12px] text-gray-500">*จำเป็น</div>

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
                          <span className="text-sm text-gray-700 truncate">{item.name}</span>
                        ) : (
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">
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
              <div className="text-[14px] font-semibold text-gray-900">แนบ</div>
              <div className="mt-4 flex flex-wrap gap-6">
                <AttachButton icon={<FaImage className="text-emerald-500" />} label="รูปภาพ" onClick={() => openFilePicker("image/*")} />
                <AttachButton icon={<FaFileAlt className="text-blue-500" />} label="ไฟล์" onClick={() => openFilePicker(".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip")} />
                <AttachButton icon={<FaLink className="text-purple-500" />} label="ลิงก์" onClick={attachLink} />
                <AttachButton icon={<FaVideo className="text-red-500" />} label="วิดีโอ" onClick={() => openFilePicker("video/*")} />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-12 xl:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[14px] font-semibold text-gray-900">ประเภทงาน</div>
              <div className="mt-3 flex flex-col gap-2">
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${workType === "individual" ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="workType" checked={workType === "individual"} onChange={() => setWorkType("individual")} className="accent-pink-500" />
                  <span className="text-[14px] text-gray-800">งานเดี่ยว</span>
                </label>
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${workType === "group" ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="workType" checked={workType === "group"} onChange={() => setWorkType("group")} className="accent-pink-500" />
                  <span className="text-[14px] text-gray-800">งานกลุ่ม</span>
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[14px] font-semibold text-gray-900">สำหรับ</div>
              <ClassesPopover
                open={classesOpen}
                onOpenChange={setClassesOpen}
                classesList={classesList}
                selectedClassIds={selectedClassIds}
                toggleClass={toggleClass}
                label={classesLabel}
              />

              <div className="mt-6 text-[14px] font-semibold text-gray-900">มอบหมายให้</div>
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

              <div className="mt-6 text-[14px] font-semibold text-gray-900">คะแนน</div>
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
                    className={`h-8 px-3 rounded-full border text-[12px] transition-colors ${
                      points === p
                        ? "border-pink-400 bg-pink-50 text-pink-700 font-semibold"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="mt-6 text-[14px] font-semibold text-gray-900">เวลาโพสต์</div>
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

              <div className="mt-6 text-[14px] font-semibold text-gray-900" >ครบกำหนด</div>
              <DueDatePopover
  open={dueOpen}
  onOpenChange={setDueOpen}
  dueDate={dueDate}
  setDueDate={setDueDate}
  dueTime={dueTime}
  setDueTime={setDueTime}
/>

              <div className="mt-6 text-[14px] font-semibold text-gray-900">หัวข้อ</div>

              <select
                value={chapter || ''}
                onChange={(e) => setChapter(e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-pink-400"
              >
                {chapters.map((c) => (
                  <option key={c.chapter_id} value={c.chapter_id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                style={{ backgroundColor: "#ffff" }}
                onClick={handleAddChapter}
                className="mt-2 w-full h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-pink-700 font-semibold"
              >
                + เพิ่มหัวข้อใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== DueDate Popover (Material-like) ===== */
function DueDatePopover({ open, onOpenChange, dueDate, setDueDate, dueTime, setDueTime }) {
  const wrapRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);

  const formatThaiLike = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "";
    const [y, m, d] = yyyy_mm_dd.split("-");
    return `${d}/${m}/${y}`;
  };

  // click outside close
  useMemo(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) onOpenChange(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onOpenChange]);

  const openNativeDatePicker = () => {
    if (!dateRef.current) return;
    // Chrome/Edge: เปิดปฏิทินจริง ๆ
    if (typeof dateRef.current.showPicker === "function") {
      dateRef.current.showPicker();
    } else {
      // fallback
      dateRef.current.focus();
      dateRef.current.click();
    }
  };

  return (
    <div className="relative mt-3" ref={wrapRef}>
      {/* trigger row (เหมือน dropdown) */}
      <button style={{backgroundColor: "white"}}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-[13px] text-gray-700">
          {dueDate ? `กำหนดแล้ว: ${formatThaiLike(dueDate)}${dueTime ? ` ${dueTime}` : ""}` : "ไม่มีวันครบกำหนด"}
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
            {/* Date field (หน้าตาแบบรูป) */}
            <div>
              <div className="rounded-xl bg-[#E9EEF6] px-4 py-3 relative">
                <div className="text-[13px] font-semibold text-pink-700">วันที่ครบกำหนด</div>

                <div className="mt-1 text-[16px] text-gray-900">
                  {dueDate ? formatThaiLike(dueDate) : "ไม่มีวันที่ครบกำหนด"}
                </div>

                {/* bottom accent line */}
                <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-pink-600 rounded-b-xl" />

                {/* calendar icon */}
                <button style={{backgroundColor: "white"}}
                  type="button"
                  onClick={openNativeDatePicker}
                  title="เปิดปฏิทิน"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-200/60 hover:bg-gray-200 flex items-center justify-center"
                >
                  <FaRegCalendarAlt className="text-gray-700" />
                </button>

                {/* real input (hidden but functional) */}
                <input
                  ref={dateRef}
                  type="date"
                  min={getTodayStr()}
                  value={dueDate}
                  onChange={(e) => {
                    // กันเลือกวันย้อนหลัง (เผื่อพิมพ์เองข้าม min)
                    if (e.target.value && e.target.value < getTodayStr()) {
                      Swal.fire("เลือกวันย้อนหลังไม่ได้", "กรุณาเลือกวันนี้หรือวันในอนาคต", "warning");
                      return;
                    }
                    setDueDate(e.target.value);
                    // ถ้าเลือกวันแล้ว ยังไม่มีเวลา ให้เด้งไปเลือกเวลาได้
                    setTimeout(() => timeRef.current?.focus(), 0);
                  }}
                  className="absolute opacity-0 pointer-events-none"
                  tabIndex={-1}
                />
              </div>

              <div className="mt-2 text-[12px] text-gray-500">DD/MM/YYYY</div>

              {dueDate && (
                <button style={{backgroundColor: "white"}}
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

            {/* Time field */}
            <div>
              <div className="text-[13px] font-semibold text-gray-900">เวลา (ไม่บังคับ)</div>
              <input
                ref={timeRef}
                type="time"
                min={dueDate === getTodayStr() ? getNowTimeStr() : undefined}
                value={dueTime}
                onChange={(e) => {
                  // ถ้าเลือกวันที่เป็นวันนี้ ห้ามเลือกเวลาย้อนหลัง
                  if (dueDate === getTodayStr() && e.target.value && e.target.value < getNowTimeStr()) {
                    Swal.fire("เลือกเวลาย้อนหลังไม่ได้", "กรุณาเลือกเวลาปัจจุบันหรือหลังจากนี้", "warning");
                    return;
                  }
                  setDueTime(e.target.value);
                }}
                disabled={!dueDate}
                className={`mt-2 w-full h-12 rounded-xl border px-4 outline-none ${dueDate
                    ? "border-gray-200 bg-gray-50 focus:border-pink-400"
                    : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
              />
              <div className="mt-1 text-[11px] text-gray-500">
                เลือกวันก่อนถึงจะเลือกเวลาได้
              </div>
            </div>

            {/* actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button style={{backgroundColor: "white"}}
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-xl hover:bg-gray-100 text-gray-700 font-medium"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold"
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
        className="mt-3 w-full h-12 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 text-pink-700 font-semibold"
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
              className={`w-full text-left px-3 py-2 rounded-xl text-sm ${
                assigneeMode === "all" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              นักเรียนทั้งหมด
            </button>
            <button
              type="button"
              style={{ backgroundColor: "white" }}
              onClick={() => setAssigneeMode("some")}
              className={`mt-1 w-full text-left px-3 py-2 rounded-xl text-sm ${
                assigneeMode === "some" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              เลือกบางคน
            </button>
          </div>

          {assigneeMode === "some" && (
            <div className="max-h-[280px] overflow-y-auto p-2">
              {students.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">ไม่พบรายชื่อนักเรียน</div>
              )}

              {students.map((s) => (
                <label
                  key={s.user_id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
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
                    className="text-xs text-blue-600 hover:underline"
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    style={{ backgroundColor: "white" }}
                    onClick={() => setSelectedStudentIds([])}
                    className="text-xs text-gray-400 hover:underline"
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
        <span className="text-[13px] text-gray-700 truncate text-left">{label}</span>
        <FaChevronDown className="text-[12px] text-gray-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[280px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden z-50">
          <div className="max-h-[280px] overflow-y-auto p-2">
            {classesList.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">ไม่พบห้องเรียน</div>
            )}

            {classesList.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedClassIds.includes(c.id)}
                  onChange={() => toggleClass(c.id)}
                  className="w-4 h-4"
                />
                {gradeLabel(c)}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Post-time Popover (โพสต์ทันที หรือ ตั้งเวลาโพสต์ล่วงหน้า) ===== */
function PostTimePopover({ open, onOpenChange, postMode, setPostMode, postDate, setPostDate, postTime, setPostTime }) {
  const wrapRef = useRef(null);

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

  const label =
    postMode === "now"
      ? "โพสต์ทันที"
      : postDate
        ? `ตั้งเวลา: ${formatThaiLike(postDate)}${postTime ? ` ${postTime}` : ""}`
        : "ตั้งเวลาโพสต์";

  return (
    <div className="relative mt-3" ref={wrapRef}>
      <button
        type="button"
        style={{ backgroundColor: "white" }}
        onClick={() => onOpenChange(!open)}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-[13px] text-gray-700">{label}</span>
        <FaChevronDown className="text-[12px] text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[300px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden z-50">
          <div className="p-3 border-b border-gray-100">
            <button
              type="button"
              style={{ backgroundColor: "white" }}
              onClick={() => setPostMode("now")}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm ${
                postMode === "now" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              โพสต์ทันที
            </button>
            <button
              type="button"
              style={{ backgroundColor: "white" }}
              onClick={() => setPostMode("scheduled")}
              className={`mt-1 w-full text-left px-3 py-2 rounded-xl text-sm ${
                postMode === "scheduled" ? "bg-pink-50 text-pink-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              ตั้งเวลาโพสต์
            </button>
          </div>

          {postMode === "scheduled" && (
            <div className="p-4 space-y-3">
              <div>
                <div className="text-[13px] font-semibold text-gray-900">วันที่โพสต์</div>
                <input
                  type="date"
                  min={getTodayStr()}
                  value={postDate}
                  onChange={(e) => {
                    if (e.target.value && e.target.value < getTodayStr()) {
                      Swal.fire("เลือกวันย้อนหลังไม่ได้", "กรุณาเลือกวันนี้หรือวันในอนาคต", "warning");
                      return;
                    }
                    setPostDate(e.target.value);
                  }}
                  className="mt-2 w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <div className="text-[13px] font-semibold text-gray-900">เวลาโพสต์</div>
                <input
                  type="time"
                  min={postDate === getTodayStr() ? getNowTimeStr() : undefined}
                  value={postTime}
                  disabled={!postDate}
                  onChange={(e) => {
                    if (postDate === getTodayStr() && e.target.value && e.target.value < getNowTimeStr()) {
                      Swal.fire("เลือกเวลาย้อนหลังไม่ได้", "กรุณาเลือกเวลาปัจจุบันหรือหลังจากนี้", "warning");
                      return;
                    }
                    setPostTime(e.target.value);
                  }}
                  className={`mt-2 w-full h-12 rounded-xl border px-4 outline-none ${postDate
                      ? "border-gray-200 bg-gray-50 focus:border-pink-400"
                      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 p-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
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
      <div className="text-[13px] text-gray-700">{label}</div>
    </button>
  );
}

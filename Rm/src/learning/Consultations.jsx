import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import PageLoading from "../components/PageLoading.jsx";
import {
  FaSearch, FaPaperPlane, FaPaperclip, FaCommentDots,
  FaBullseye, FaChartBar, FaStickyNote, FaTrash, FaInfoCircle, FaUserGraduate,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import GradientPopup from "../components/GradientPopup.jsx";
import Avatar from "../components/Avatar.jsx";
import {
  getEnrollments, getClasses, getTypeResults, getTypes, getGoals,
  getConsultationRequests, updateConsultationStatus, replyToConsultation,
  getTeacherNotes, addTeacherNote, deleteTeacherNote, getStudentGeneralInfo,
} from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { notAvailableYet } from "../utils/feedShared.js";
import { getCurrentUser } from "../utils/auth.js";
import {
  STATUS_META, CONSULTATION_CATEGORIES, normalizeConsultation, markConsultationRead, isConsultationUnread,
} from "../utils/consultationStore.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";

// แปลงแถวดิบจาก GET /teacher-notes (note_id, note_text, created_at, ...) ให้เป็น shape เดิม {id, text, createdAt} ที่หน้านี้ใช้อยู่แล้ว
const normalizeNote = (raw) => ({ id: raw.note_id, text: raw.note_text, createdAt: raw.created_at });

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([key, meta]) => ({ value: key, label: meta.label }));
const STATUS_FILTER_OPTIONS = [{ value: "", label: "สถานะ: ทั้งหมด" }, ...STATUS_OPTIONS];
const SUBJECT_FILTER_OPTIONS = [{ value: "", label: "หัวข้อ: ทั้งหมด" }, ...CONSULTATION_CATEGORIES.map((c) => ({ value: c, label: c }))];

const formatDate = (d) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const formatTime = (d) => new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// รวมข้อความติดกันจากคนเดิมเป็นกลุ่มเดียว — โชว์ป้ายชื่อผู้ส่งครั้งเดียว และเวลาแค่ใต้ข้อความสุดท้ายของกลุ่ม
const groupMessages = (messages) => {
  const groups = [];
  messages.forEach((m) => {
    const last = groups[groups.length - 1];
    if (last && last.sender === m.sender) last.items.push(m);
    else groups.push({ sender: m.sender, items: [m] });
  });
  return groups;
};

// เวลาแบบย่อในลิสต์แชท: วันนี้โชว์เวลา, เมื่อวานโชว์ "เมื่อวาน", ก่อนหน้านั้นโชว์ "N วันก่อน"
const formatListTime = (d) => {
  const date = new Date(d);
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return formatTime(d);
  if (diffDays === 1) return "เมื่อวาน";
  if (diffDays < 7) return `${diffDays} วันก่อน`;
  return formatDate(d);
};

export default function ConsultationsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [enrollments, setEnrollments] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [typeResults, setTypeResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [notesTick, setNotesTick] = useState(0);
  const [showStudentInfo, setShowStudentInfo] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const messagesEndRef = useRef(null);
  const replyTextareaRef = useRef(null);

  const refreshItems = () =>
    getConsultationRequests({ teacher_user_id: currentUser?.user_id })
      .then((data) => setItems((data || []).map(normalizeConsultation)))
      .catch(() => setItems([]));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [enrollData, gradeData, typeResultData, typeData, goalData] = await Promise.all([
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTypeResults().catch(() => []),
          getTypes().catch(() => []),
          getGoals().catch(() => []),
          refreshItems(),
        ]);
        setEnrollments(enrollData || []);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setTypeResults(typeResultData || []);
        setTypes(typeData || []);
        setGoals(goalData || []);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gradeByUserId = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (!map.has(String(e.user_user_id))) map.set(String(e.user_user_id), e.grade_idgrade);
    });
    return map;
  }, [enrollments]);

  // เวลากิจกรรมล่าสุดของคำขอ — ใช้ทั้งจัดเรียงและโชว์พรีวิวในลิสต์
  const latestActivityAt = (c) => (c.messages.length > 0 ? c.messages[c.messages.length - 1].at : c.createdAt);
  // ยังไม่อ่าน = ยังไม่เคยเปิดดูเลย หรือมีความเคลื่อนไหวใหม่หลังครั้งล่าสุดที่เปิดอ่าน (เก็บสถานะอ่านแล้วไว้ฝั่งเบราว์เซอร์ครูเอง)
  const isUnread = (c) => isConsultationUnread(c.id, latestActivityAt(c));

  // แยกเป็นรายนักเรียนจริง (1 แถว/1 คน) แทนที่จะแยกตามคำขอแต่ละใบ — ใช้คำขอล่าสุดของนักเรียนคนนั้นเป็นตัวแทน
  const studentGroups = useMemo(() => {
    const map = new Map();
    items.forEach((c) => {
      const key = String(c.studentUserId);
      const existing = map.get(key);
      if (!existing || new Date(latestActivityAt(c)) > new Date(latestActivityAt(existing))) map.set(key, c);
    });
    return Array.from(map.values()).sort((a, b) => new Date(latestActivityAt(b)) - new Date(latestActivityAt(a)));
  }, [items]);

  // รูปโปรไฟล์จริงของนักเรียนแต่ละคนที่เคยขอคำปรึกษา — มีก็ใช้จริง ไม่มีก็ให้ Avatar component fallback เป็นวงกลมสีชมพู+ตัวอักษรแรกเอง
  const [studentInfoByUser, setStudentInfoByUser] = useState({});
  useEffect(() => {
    const toFetch = studentGroups.filter((c) => !(c.studentUserId in studentInfoByUser));
    if (toFetch.length === 0) return;
    Promise.all(
      toFetch.map((c) =>
        getStudentGeneralInfo(c.studentUserId)
          .then((res) => [c.studentUserId, res])
          .catch(() => [c.studentUserId, null])
      )
    ).then((entries) => {
      setStudentInfoByUser((prev) => {
        const next = { ...prev };
        entries.forEach(([id, res]) => { next[id] = res; });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentGroups]);

  const filteredGroups = useMemo(() => {
    let list = studentGroups;
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (subjectFilter) list = list.filter((c) => c.subject === subjectFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => (c.studentName || "").toLowerCase().includes(q) || (c.subject || "").toLowerCase().includes(q));
    }
    return list;
  }, [studentGroups, search, statusFilter, subjectFilter]);

  const selected = items.find((c) => c.id === selectedId) || null;

  // เข้ามาปุ๊บขึ้นของคนล่าสุดให้เลยฝั่งขวา ไม่ต้องให้เลือกเอง
  useEffect(() => {
    if (!selectedId && studentGroups.length > 0) setSelectedId(studentGroups[0].id);
  }, [selectedId, studentGroups]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedId, selected?.messages?.length]);

  // ช่องพิมพ์ตอบกลับ: สูงเท่าที่พิมพ์จริง พิมพ์ยาวขึ้นค่อยขยายลงมา
  useEffect(() => {
    const el = replyTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [replyText]);

  // เปิดดูแล้วถือว่าอ่านแล้ว — เคลียร์จุดสีชมพูในลิสต์
  useEffect(() => {
    if (selected && isUnread(selected)) {
      markConsultationRead(selected.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const latestTypeResultFor = (userId) =>
    typeResults.filter((r) => String(r.user_user_id) === String(userId)).sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0];
  const latestGoalFor = (userId) =>
    goals.filter((g) => String(g.user_user_id) === String(userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  const selectedGrade = selected ? classesList.find((c) => String(c.id) === String(gradeByUserId.get(String(selected.studentUserId)))) : null;
  const selectedTypeResult = selected ? latestTypeResultFor(selected.studentUserId) : null;
  const selectedType = selectedTypeResult ? types.find((t) => String(t.type_id) === String(selectedTypeResult.type_type_id)) : null;
  const selectedGoal = selected ? latestGoalFor(selected.studentUserId) : null;
  const studentHistory = selected ? items.filter((c) => c.studentUserId === selected.studentUserId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
  const [selectedNotes, setSelectedNotes] = useState([]);
  const loadNotes = () => {
    if (!selected) { setSelectedNotes([]); return; }
    getTeacherNotes(selected.studentUserId)
      .then((data) => setSelectedNotes((data || []).map(normalizeNote)))
      .catch(() => setSelectedNotes([]));
  };
  useEffect(loadNotes, [selected, notesTick]);

  const handleSend = async () => {
    if (!selected || !replyText.trim()) return;
    try {
      await replyToConsultation(selected.id, {
        sender_user_id: currentUser?.user_id,
        sender_role: "teacher",
        message_text: replyText.trim(),
      });
      markConsultationRead(selected.id);
      setReplyText("");
      await refreshItems();
    } catch {
      Swal.fire({ icon: "error", title: "ส่งข้อความไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const handleStatusChange = async (status) => {
    if (!selected) return;
    try {
      await updateConsultationStatus(selected.id, status);
      await refreshItems();
    } catch {
      Swal.fire({ icon: "error", title: "เปลี่ยนสถานะไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const openNoteModal = () => {
    if (!selected) return;
    setNoteText("");
    setShowNoteModal(true);
  };

  const handleSubmitNote = async () => {
    if (!selected || !noteText.trim()) return;
    try {
      await addTeacherNote({ teacher_user_id: currentUser?.user_id, student_user_id: selected.studentUserId, note_text: noteText.trim() });
      setNotesTick((t) => t + 1);
      setShowNoteModal(false);
    } catch {
      Swal.fire({ icon: "error", title: "บันทึกโน้ตไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!selected) return;
    try {
      await deleteTeacherNote(noteId);
      setNotesTick((t) => t + 1);
    } catch {
      Swal.fire({ icon: "error", title: "ลบโน้ตไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div className="h-screen bg-white flex text-gray-900 overflow-hidden">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full flex flex-col overflow-hidden pt-24 bg-white">
        <div className="px-6 md:px-8 mb-4 shrink-0">
          <h1 className="page-title">คำขอปรึกษา</h1>
          <p className="page-subtitle mt-1">จัดการคำขอคำปรึกษาจากนักเรียน</p>
        </div>

        {loading ? (
          <PageLoading />
        ) : items.length === 0 ? (
          <div className="mx-6 md:mx-8 rounded-2xl border border-dashed border-gray-200 py-20 text-center text-gray-400">
            <FaCommentDots size={28} className="mx-auto mb-3 text-gray-300" />
            <div className="text-[15.5px] mb-1">ยังไม่มีคำขอปรึกษาเข้ามา</div>
            <div className="text-[14px] text-gray-400 max-w-md mx-auto">
              นักเรียนยังไม่ได้ส่งคำขอปรึกษาเข้ามาเลย
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 px-6 md:px-8 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5 h-full">
            {/* ===== ซ้าย: รายการนักเรียน (1 แถวต่อ 1 คนจริง) — เส้นคั่นแทนกรอบครอบ ===== */}
            <div className="min-w-0 xl:border-r xl:border-gray-200 xl:pr-5 flex flex-col h-full overflow-hidden">
              <div className="pb-3 border-b border-gray-100 shrink-0">
                <div className="text-[16.5px] font-semibold text-gray-900 mb-2">รายการนักเรียน</div>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อนักเรียน..."
                    className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[15px] outline-none focus:border-pink-400"
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Select
                      styles={bigFilterSelectStyles}
                      value={STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)}
                      onChange={(opt) => setStatusFilter(opt.value)}
                      options={STATUS_FILTER_OPTIONS}
                      isSearchable={false}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Select
                      styles={bigFilterSelectStyles}
                      value={SUBJECT_FILTER_OPTIONS.find((o) => o.value === subjectFilter)}
                      onChange={(opt) => setSubjectFilter(opt.value)}
                      options={SUBJECT_FILTER_OPTIONS}
                      isSearchable={false}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {filteredGroups.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[14.5px]">ไม่พบนักเรียน</div>
                ) : (
                  filteredGroups.map((c) => {
                    const isSelected = selectedId === c.id;
                    return (
                      <button
                        type="button"
                        key={c.studentUserId}
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left py-4 px-2 rounded-lg transition ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 bg-white"}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar src={studentInfoByUser[c.studentUserId]?.avatar_url} name={c.studentName} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[15.5px] font-semibold text-gray-900 truncate">{c.studentName}</div>
                              <span className="text-[13px] text-gray-400 shrink-0">{formatListTime(latestActivityAt(c))}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <div className="text-[14.5px] text-gray-500 truncate">{c.subject}</div>
                              {isUnread(c) && <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />}
                            </div>
                            <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_META[c.status].cls}`}>
                              {STATUS_META[c.status].label}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {!selected ? (
              <div className="text-center text-gray-400 py-16">เลือกนักเรียนเพื่อดูคำขอปรึกษา</div>
            ) : (
              <div className="min-w-0 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[18.5px] font-bold text-gray-900 truncate">หัวข้อ: {selected.subject}</div>
                      <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_META[selected.status].cls}`}>{STATUS_META[selected.status].label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[14px] text-gray-500 mt-1">
                      <FaUserGraduate className="text-gray-400 shrink-0" size={13} />
                      {selected.studentName} · {selectedGrade ? gradeLabel(selectedGrade) : "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowStudentInfo((v) => !v)}
                      className={`h-11 px-3.5 rounded-lg border text-[14.5px] font-medium flex items-center gap-1.5 ${showStudentInfo ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"}`}
                    >
                      <FaInfoCircle size={13} /> ข้อมูลนักเรียน
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAssessment((v) => !v)}
                      className={`h-11 px-3.5 rounded-lg border text-[14.5px] font-medium flex items-center gap-1.5 ${showAssessment ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"}`}
                    >
                      <FaChartBar size={13} /> ผลประเมิน
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotes((v) => !v)}
                      className={`h-11 px-3.5 rounded-lg border text-[14.5px] font-medium flex items-center gap-1.5 ${showNotes ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"}`}
                    >
                      <FaStickyNote size={13} /> โน้ตครู
                    </button>
                    <Select
                      styles={bigFilterSelectStyles}
                      className="w-44 shrink-0"
                      value={STATUS_OPTIONS.find((o) => o.value === selected.status)}
                      onChange={(opt) => handleStatusChange(opt.value)}
                      options={STATUS_OPTIONS}
                      isSearchable={false}
                    />
                  </div>
                </div>

                {showStudentInfo && (
                  <div className="p-4 border-b border-gray-100 shrink-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={studentInfoByUser[selected.studentUserId]?.avatar_url} name={selected.studentName} size={48} />
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-gray-900 truncate">{selected.studentName}</div>
                          <div className="text-[13px] text-gray-400">
                            {selectedGrade ? gradeLabel(selectedGrade) : "-"} · ขอคำปรึกษาแล้ว {studentHistory.length} ครั้ง
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => navigate("/student")} className="text-[13.5px] text-pink-600 hover:underline bg-transparent shrink-0">ดูโปรไฟล์เต็ม →</button>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1"><FaBullseye className="text-pink-400" size={12} /> เป้าหมายการศึกษาต่อ</div>
                      {selectedGoal ? (
                        <>
                          <div className="text-[14px] font-medium text-gray-900">{selectedGoal.faculty_name || "-"}</div>
                          {selectedGoal.career_field && <div className="text-[12.5px] text-gray-500 mt-0.5">{selectedGoal.career_field}</div>}
                        </>
                      ) : (
                        <div className="text-[13px] text-gray-400">ยังไม่ได้ตั้งเป้าหมาย</div>
                      )}
                    </div>
                  </div>
                )}

                {showAssessment && (
                  <div className="p-4 border-b border-gray-100 shrink-0">
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1"><FaChartBar className="text-blue-400" size={12} /> ผลประเมิน RIASEC ล่าสุด</div>
                      {selectedTypeResult ? (
                        <>
                          <div className="text-[14px] font-semibold text-pink-700">{selectedType?.type_name || "-"}</div>
                          <div className="text-[12.5px] text-gray-400 mt-0.5">{formatDate(selectedTypeResult.test_date)}</div>
                          <button type="button" onClick={() => navigate("/assessments/results")} className="mt-1 text-[13px] text-pink-600 hover:underline bg-transparent">ดูรายละเอียด →</button>
                        </>
                      ) : (
                        <div className="text-[13px] text-gray-400">ยังไม่ได้ทำแบบประเมิน</div>
                      )}
                    </div>
                  </div>
                )}

                {showNotes && (
                  <div className="p-4 border-b border-gray-100 shrink-0">
                    <div className="rounded-xl border border-dashed border-gray-200 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700"><FaStickyNote className="text-amber-400" size={12} /> โน้ตของครู</div>
                        <button type="button" onClick={openNoteModal} className="h-8 px-3 rounded-full border border-pink-200 bg-pink-50 text-pink-700 text-[13px] font-medium">+ เพิ่มโน้ต</button>
                      </div>
                      {selectedNotes.length === 0 ? (
                        <div className="text-[13px] text-gray-400">ยังไม่มีโน้ต</div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {selectedNotes.map((n) => (
                            <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                              <div className="min-w-0">
                                <div className="text-[13.5px] text-gray-700 whitespace-pre-line">{n.text}</div>
                                <div className="text-[11.5px] text-gray-400 mt-0.5">{formatDateTime(n.createdAt)}</div>
                              </div>
                              <button type="button" onClick={() => handleDeleteNote(n.id)} className="text-gray-300 hover:text-red-500 shrink-0 bg-transparent">
                                <FaTrash size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5">
                  {groupMessages(selected.messages).map((g, gi) => (
                    <div key={gi} className={`max-w-[80%] flex flex-col gap-1 ${g.sender === "teacher" ? "ml-auto items-end" : "items-start"}`}>
                      {g.items.map((m) => (
                        <div key={m.id} className={`w-fit rounded-xl px-4 py-3 ${g.sender === "teacher" ? "bg-pink-100 text-gray-900" : "bg-gray-100 text-gray-800"}`}>
                          <div className="text-[16px] whitespace-pre-line">{m.text}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-100 shrink-0 flex items-end gap-2">
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => notAvailableYet("แนบไฟล์")}
                      className="absolute left-2 bottom-2.5 w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent flex items-center justify-center"
                    >
                      <FaPaperclip size={14} />
                    </button>
                    <textarea
                      ref={replyTextareaRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={1}
                      placeholder="พิมพ์ข้อความตอบกลับ..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-[16px] outline-none focus:border-pink-400 resize-none overflow-hidden leading-relaxed"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!replyText.trim()}
                    className="h-11 w-11 shrink-0 rounded-xl bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center disabled:opacity-40"
                  >
                    <FaPaperPlane size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </main>

      <GradientPopup
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        icon={<FaStickyNote size={21} />}
        title="เพิ่มโน้ตของครู"
        subtitle="บันทึกส่วนตัวเกี่ยวกับนักเรียนคนนี้ นักเรียนจะไม่เห็นข้อความนี้"
        onSubmit={handleSubmitNote}
        submitLabel="บันทึก"
        submitDisabled={!noteText.trim()}
      >
        <div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
            maxLength={500}
            rows={4}
            autoFocus
            placeholder="บันทึกนี้นักเรียนจะไม่เห็น..."
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-pink-400 resize-none"
          />
          <div className="text-right text-[12.5px] text-gray-400 mt-1">{noteText.length}/500</div>
        </div>
      </GradientPopup>
    </div>
  );
}

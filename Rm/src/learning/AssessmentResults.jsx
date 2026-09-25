import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  FaSearch, FaDownload, FaTimes, FaUser, FaFolderOpen, FaCommentDots, FaCheck,
  FaFileAlt, FaFilePdf, FaLink, FaVideo, FaPaperPlane, FaTrash,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import PromptModal from "../components/PromptModal.jsx";
import Avatar from "../components/Avatar.jsx";
import {
  getStudent, getEnrollments, getClasses, getTypeResults, getTypes, getFaculties,
  getGoals, getPortfolioWorks, getPortfolioWorkFiles, getConsultationRequests,
  getAssessmentsList, getAssessmentAdvice, addAssessmentAdvice, deleteAssessmentAdvice,
} from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import PageLoading from "../components/PageLoading.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { CONSULTATION_CATEGORIES, normalizeConsultation } from "../utils/consultationStore.js";
import { API_BASE } from "../utils/feedShared.js";
import { resolveFileUrl } from "../utils/media.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";

// แปลงแถวดิบจาก GET /assessment-advice (advice_id, advice_text, created_at, ...) ให้เป็น shape เดิม {id, text, createdAt}
const normalizeAdvice = (raw) => ({ id: raw.advice_id, text: raw.advice_text, createdAt: raw.created_at });

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "สถานะ: ทั้งหมด" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "not_done", label: "ยังไม่ได้ทำ" },
];

const STATUS_META = {
  completed: { label: "เสร็จสิ้น", cls: "bg-emerald-50 text-emerald-700" },
  not_done: { label: "ยังไม่ได้ทำ", cls: "bg-red-50 text-red-600" },
};

const formatDateTime = (d) => (d ? new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-");
const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function AssessmentResultsPage() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [typeResults, setTypeResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [goals, setGoals] = useState([]);
  const [portfolioWorks, setPortfolioWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedWorkFiles, setSelectedWorkFiles] = useState([]);
  const [adviceTick, setAdviceTick] = useState(0);
  const [adviceDialogOpen, setAdviceDialogOpen] = useState(false);
  const currentUser = getCurrentUser();

  const [customAssessments, setCustomAssessments] = useState([]);
  useEffect(() => {
    getAssessmentsList().then((data) => setCustomAssessments(data || [])).catch(() => setCustomAssessments([]));
  }, []);
  const assessmentOptions = useMemo(
    () => [{ id: "holland", title: "Holland Code (RIASEC)" }, ...customAssessments.map((a) => ({ id: a.assessment_id, title: a.title }))],
    [customAssessments]
  );
  const assessmentSelectOptions = useMemo(() => assessmentOptions.map((a) => ({ value: a.id, label: a.title })), [assessmentOptions]);

  const [assessmentFilter, setAssessmentFilter] = useState("holland");
  const [roomFilter, setRoomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const PAGE_SIZE = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData, typeResultData, typeData, facultyData, goalData, workData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTypeResults().catch(() => []),
          getTypes().catch(() => []),
          getFaculties().catch(() => []),
          getGoals().catch(() => []),
          getPortfolioWorks().catch(() => []),
        ]);
        setStudents(studentData || []);
        setEnrollments(enrollData || []);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setTypeResults(typeResultData || []);
        setTypes(typeData || []);
        setFaculties(facultyData || []);
        setGoals(goalData || []);
        setPortfolioWorks(workData || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const gradeByUserId = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (!map.has(String(e.user_user_id))) map.set(String(e.user_user_id), { gradeId: e.grade_idgrade, seatNo: e.seat_no });
    });
    return map;
  }, [enrollments]);

  const latestResultByUserId = useMemo(() => {
    const map = new Map();
    typeResults.forEach((r) => {
      const existing = map.get(String(r.user_user_id));
      if (!existing || new Date(r.test_date) > new Date(existing.test_date)) map.set(String(r.user_user_id), r);
    });
    return map;
  }, [typeResults]);

  const isHolland = assessmentFilter === "holland";

  const rows = useMemo(() => {
    let list = students.map((s) => {
      const enroll = gradeByUserId.get(String(s.user_id));
      const result = isHolland ? latestResultByUserId.get(String(s.user_id)) : null;
      return {
        student: s,
        gradeId: enroll?.gradeId ?? null,
        seatNo: enroll?.seatNo ?? null,
        result,
        status: result ? "completed" : "not_done",
      };
    });
    if (roomFilter) list = list.filter((r) => String(r.gradeId) === String(roomFilter));
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.student.fullname?.toLowerCase().includes(q) || r.student.student_code?.toLowerCase?.().includes(q));
    }
    list = list.slice().sort((a, b) => a.student.fullname.localeCompare(b.student.fullname, "th"));
    return list;
  }, [students, gradeByUserId, latestResultByUserId, roomFilter, statusFilter, search, isHolland]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [roomFilter, statusFilter, search, assessmentFilter]);

  const toggleCheck = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCheckAll = () => {
    setCheckedIds((prev) => (prev.size === paged.length ? new Set() : new Set(paged.map((r) => r.student.user_id))));
  };

  const roomSelectOptions = useMemo(
    () => [{ value: "", label: "ทุกห้องที่สอน" }, ...classesList.map((c) => ({ value: String(c.id), label: gradeLabel(c) }))],
    [classesList]
  );

  const exportTargets = checkedIds.size > 0 ? rows.filter((r) => checkedIds.has(r.student.user_id)) : rows;

  const selected = rows.find((r) => r.student.user_id === selectedId) || null;

  // เข้ามาปุ๊บขึ้นคนแรกในลิสต์ให้เลย ไม่ต้องเลือกเอง
  useEffect(() => {
    if (!loading && !selectedId && paged.length > 0) setSelectedId(paged[0].student.user_id);
  }, [loading, selectedId, paged]);
  const selectedType = selected?.result ? types.find((t) => String(t.type_id) === String(selected.result.type_type_id)) : null;
  const selectedFaculty = selected?.result ? faculties.find((f) => String(f.faculty_id) === String(selected.result.recommended_faculty_id)) : null;
  const selectedGrade = selected?.gradeId ? classesList.find((c) => String(c.id) === String(selected.gradeId)) : null;

  // คณะอื่นในแค็ตตาล็อกที่ตรงกับกลุ่มบุคลิกภาพเดียวกัน (จริงจาก faculty.Type_type_id) ไม่ใช่ "Top 3" ตายตัว เพราะข้อมูลจริงมีเท่าที่มี
  const matchingFaculties = useMemo(() => {
    if (!selectedType) return [];
    return faculties.filter((f) => String(f.Type_type_id) === String(selectedType.type_id));
  }, [faculties, selectedType]);

  const selectedGoal = useMemo(() => {
    if (!selected) return null;
    return goals.filter((g) => String(g.user_user_id) === String(selected.student.user_id)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
  }, [goals, selected]);

  const selectedLatestWork = useMemo(() => {
    if (!selected) return null;
    return portfolioWorks
      .filter((w) => String(w.student_user_id) === String(selected.student.user_id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
  }, [portfolioWorks, selected]);

  useEffect(() => {
    setSelectedWorkFiles([]);
    if (selectedLatestWork?.work_id) {
      getPortfolioWorkFiles(selectedLatestWork.work_id).then(setSelectedWorkFiles).catch(() => setSelectedWorkFiles([]));
    }
  }, [selectedLatestWork?.work_id]);

  const [selectedConsultations, setSelectedConsultations] = useState([]);
  useEffect(() => {
    if (!selected) { setSelectedConsultations([]); return; }
    getConsultationRequests({ student_user_id: selected.student.user_id })
      .then((data) => setSelectedConsultations((data || []).map(normalizeConsultation).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
      .catch(() => setSelectedConsultations([]));
  }, [selected]);

  const [selectedAdvice, setSelectedAdvice] = useState([]);
  useEffect(() => {
    if (!selected) { setSelectedAdvice([]); return; }
    getAssessmentAdvice(selected.student.user_id)
      .then((data) => setSelectedAdvice((data || []).map(normalizeAdvice)))
      .catch(() => setSelectedAdvice([]));
  }, [selected, adviceTick]);

  const confirmAddAdvice = async (text) => {
    if (!selected) return;
    try {
      await addAssessmentAdvice({ teacher_user_id: currentUser?.user_id, student_user_id: selected.student.user_id, advice_text: text });
      setAdviceTick((t) => t + 1);
      setAdviceDialogOpen(false);
    } catch {
      Swal.fire({ icon: "error", title: "บันทึกคำแนะนำไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const handleDeleteAdvice = async (adviceId) => {
    if (!selected) return;
    try {
      await deleteAssessmentAdvice(adviceId);
      setAdviceTick((t) => t + 1);
    } catch {
      Swal.fire({ icon: "error", title: "ลบคำแนะนำไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const downloadReport = () => {
    const header = ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ห้อง", "แบบประเมิน", "วันที่ทำ", "สถานะ", "กลุ่มบุคลิกภาพ", "คณะแนะนำ"];
    const csvRows = exportTargets.map((r) => {
      const c = classesList.find((c) => String(c.id) === String(r.gradeId));
      const t = r.result ? types.find((tt) => String(tt.type_id) === String(r.result.type_type_id)) : null;
      const f = r.result ? faculties.find((ff) => String(ff.faculty_id) === String(r.result.recommended_faculty_id)) : null;
      return [
        r.student.student_code || "",
        r.student.fullname || "",
        c ? gradeLabel(c) : "",
        assessmentOptions.find((a) => a.id === assessmentFilter)?.title || "",
        r.result ? formatDateTime(r.result.test_date) : "",
        STATUS_META[r.status].label,
        t?.type_name || "",
        f ? `${f.faculty_name} (${f.university_name})` : "",
      ].map(csvEscape).join(",");
    });
    const csv = "﻿" + [header.map(csvEscape).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ผลการประเมิน_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="mb-6">
          <h1 className="page-title">ผลการประเมิน</h1>
          <p className="page-subtitle mt-1">ดูผลการประเมินของนักเรียนรายบุคคล</p>
        </div>

        {/* ===== ตัวกรอง — ยาวเต็มความกว้างหน้า ===== */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="relative flex-1 min-w-55">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อนักเรียน / รหัสนักเรียน" className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[15px] outline-none focus:border-pink-400" />
          </div>
          <Select
            styles={bigFilterSelectStyles}
            className="w-64"
            value={assessmentSelectOptions.find((o) => o.value === assessmentFilter)}
            onChange={(opt) => setAssessmentFilter(opt.value)}
            options={assessmentSelectOptions}
            isSearchable={false}
          />
          <Select
            styles={bigFilterSelectStyles}
            className="w-52"
            value={roomSelectOptions.find((o) => o.value === roomFilter)}
            onChange={(opt) => setRoomFilter(opt.value)}
            options={roomSelectOptions}
            isSearchable={false}
          />
          <Select
            styles={bigFilterSelectStyles}
            className="w-48"
            value={STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)}
            onChange={(opt) => setStatusFilter(opt.value)}
            options={STATUS_FILTER_OPTIONS}
            isSearchable={false}
          />
          <button type="button" onClick={downloadReport} className="h-11 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14.5px] font-semibold flex items-center gap-2">
            <FaDownload size={12} /> ดาวน์โหลด{checkedIds.size > 0 ? ` (${checkedIds.size})` : ""}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_640px] gap-6 items-stretch">
          {/* ===== ซ้าย: รายชื่อ — เส้นคั่นแทนกรอบครอบ ===== */}
          <div className="min-w-0 xl:border-r xl:border-gray-200 xl:pr-6">

            <div className="mb-2 text-[14.5px] text-gray-500">พบนักเรียน {rows.length} คน</div>

            {!isHolland && (
              <div className="mb-3 rounded-xl bg-amber-50 text-amber-700 text-[14px] px-4 py-2.5">
                แบบประเมินนี้เป็นแบบที่สร้างเอง ระบบยังไม่มีหน้าให้นักเรียนทำจริง จึงยังไม่มีผู้ทำ
              </div>
            )}

            <div className="overflow-hidden">
              {loading ? (
                <PageLoading />
              ) : paged.length === 0 ? (
                <div className="text-center text-gray-400 py-14 text-[14.5px]">ไม่พบนักเรียน</div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleCheckAll}
                    className="w-full px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 text-[14px] text-gray-500 bg-transparent hover:bg-gray-50"
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${paged.length > 0 && checkedIds.size === paged.length ? "bg-pink-500 text-white" : "border-2 border-gray-300"}`}>
                      {paged.length > 0 && checkedIds.size === paged.length && <FaCheck size={9} />}
                    </span>
                    เลือกทั้งหมด{checkedIds.size > 0 && ` (เลือกแล้ว ${checkedIds.size})`}
                  </button>
                  <div className="divide-y divide-gray-50">
                    {paged.map((r) => {
                      const isSelected = selectedId === r.student.user_id;
                      const isChecked = checkedIds.has(r.student.user_id);
                      return (
                        <button
                          type="button"
                          key={r.student.user_id}
                          onClick={() => setSelectedId(r.student.user_id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 bg-white"}`}
                        >
                          <span
                            role="checkbox"
                            aria-checked={isChecked}
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); toggleCheck(r.student.user_id); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleCheck(r.student.user_id); } }}
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 cursor-pointer ${isChecked ? "bg-pink-500 text-white" : "border-2 border-gray-300"}`}
                          >
                            {isChecked && <FaCheck size={9} />}
                          </span>
                          <Avatar name={r.student.fullname} size={40} />
                          <div className="flex-1 min-w-0 text-[15px] font-medium text-gray-900 truncate">{r.student.fullname}</div>
                          <span className={`text-[12.5px] font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_META[r.status].cls}`}>{STATUS_META[r.status].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-10 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[14.5px]">ก่อนหน้า</button>
                <span className="text-[14.5px] text-gray-500">หน้า {page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-10 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[14.5px]">ถัดไป</button>
              </div>
            )}
          </div>

          {/* ===== ขวา: รายละเอียด ===== */}
          <div className="min-w-0 h-full flex flex-col">
          <div className="mb-2 text-[14.5px] text-transparent select-none shrink-0" aria-hidden="true">พบนักเรียน</div>
          <div className="flex-1 flex flex-col xl:sticky xl:top-24 overflow-y-auto">
            {!selected ? (
              <div className="flex-1 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                <FaUser size={22} className="text-gray-300" />
                เลือกนักเรียนเพื่อดูผลการประเมิน
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[17.5px] font-semibold text-gray-900">ผลการประเมินของนักเรียน</div>
                  <button type="button" onClick={() => setSelectedId(null)} className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent">
                    <FaTimes size={14} />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 min-w-0 max-w-70">
                    <Avatar name={selected.student.fullname} size={56} />
                    <div className="min-w-0">
                      <div className="text-[16.5px] font-bold text-gray-900 truncate">{selected.student.fullname}</div>
                      <div className="text-[13.5px] text-gray-500 truncate">
                        {selected.seatNo != null && `เลขที่ ${selected.seatNo} · `}{selectedGrade ? gradeLabel(selectedGrade) : "ยังไม่ระบุห้อง"}
                      </div>
                      <div className="text-[13.5px] text-gray-500 truncate">รหัสนักเรียน {selected.student.student_code}</div>
                    </div>
                  </div>
                  {selected.result && (
                    <div className="text-right shrink-0">
                      <span className={`inline-block text-[12.5px] font-medium px-2.5 py-1 rounded-full ${STATUS_META[selected.status].cls}`}>{STATUS_META[selected.status].label}</span>
                      <div className="text-[12.5px] text-gray-400 mt-1">{formatDateTime(selected.result.test_date)}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  <button type="button" onClick={() => navigate("/portfolio")} className="h-10 px-3.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-[14px] font-medium flex items-center gap-1.5">
                    <FaFolderOpen size={12} /> ดู Portfolio
                  </button>
                </div>

                {!selected.result ? (
                  <div className="rounded-xl bg-gray-50 text-gray-400 text-[14.5px] px-4 py-6 text-center">นักเรียนคนนี้ยังไม่ได้ทำแบบประเมินนี้</div>
                ) : (
                  <>
                    {/* กล่องไฮไลต์เดียวที่ยังใช้กรอบ — ที่เหลือคั่นด้วยเส้นแบ่งแทน กันดูรก */}
                    <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-5 mb-4">
                      <div className="text-[14.5px] text-pink-700/70 mb-1">กลุ่มบุคลิกภาพที่โดดเด่น</div>
                      <div className="text-[21px] font-bold text-pink-800">{selectedType?.type_name || "-"}</div>
                      {selectedType?.description && <p className="text-[14px] text-gray-600 mt-2">{selectedType.description}</p>}
                      <div className="text-[12.5px] text-gray-400 mt-3">
                        ระบบยังไม่ได้เก็บคะแนนแยกราย 6 มิติ (RIASEC) ต่อคำถาม จึงยังแสดงกราฟเรดาร์แบบละเอียดไม่ได้ — แสดงเฉพาะกลุ่มบุคลิกภาพหลักที่สรุปผลได้จริงเท่านั้น
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100 border-t border-gray-100 mb-4">
                      {(selectedFaculty || matchingFaculties.length > 0) && (
                        <div className="py-4">
                          <div className="text-[14px] text-gray-500 mb-2">คณะที่แนะนำตามกลุ่มบุคลิกภาพ</div>
                          <div className="flex flex-col gap-2">
                            {selectedFaculty && (
                              <div>
                                <div className="text-[15.5px] font-semibold text-gray-900">{selectedFaculty.faculty_name}</div>
                                <div className="text-[13.5px] text-gray-500">{selectedFaculty.university_name}</div>
                              </div>
                            )}
                            {matchingFaculties.filter((f) => f.faculty_id !== selectedFaculty?.faculty_id).map((f) => (
                              <div key={f.faculty_id} className="pt-2 border-t border-gray-50">
                                <div className="text-[14.5px] font-medium text-gray-800">{f.faculty_name}</div>
                                <div className="text-[13px] text-gray-500">{f.university_name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedGoal && (
                        <div className="py-4">
                          <div className="text-[14px] text-gray-500 mb-1.5 flex items-center gap-1.5">🚩 เป้าหมายของนักเรียน</div>
                          <div className="text-[15px] text-gray-900"><span className="text-gray-500">อยากเรียน:</span> <span className="font-medium">{selectedGoal.faculty_name}</span></div>
                          {selectedGoal.career_field && <div className="text-[14.5px] text-gray-700 mt-0.5"><span className="text-gray-500">อาชีพที่สนใจ:</span> {selectedGoal.career_field}</div>}
                          {selectedGoal.goal_text && <div className="text-[14px] text-gray-600 mt-1.5">{selectedGoal.goal_text}</div>}
                        </div>
                      )}

                      <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Portfolio ล่าสุด */}
                        <div>
                          <div className="text-[14px] text-gray-500 mb-2">Portfolio ล่าสุด</div>
                          {!selectedLatestWork ? (
                            <div className="text-[13.5px] text-gray-400 py-4 text-center">ยังไม่มีผลงาน</div>
                          ) : (
                            <button type="button" onClick={() => navigate("/portfolio")} className="w-full text-left bg-transparent">
                              <WorkThumb work={selectedLatestWork} file={selectedWorkFiles[0]} />
                              <div className="text-[14px] text-gray-800 font-medium truncate mt-2">{selectedLatestWork.title}</div>
                              <div className="text-[12.5px] text-gray-400">อัปโหลดเมื่อ {formatDate(selectedLatestWork.created_at)}</div>
                            </button>
                          )}
                        </div>

                        {/* ประวัติการให้คำปรึกษา */}
                        <div>
                          <div className="text-[14px] text-gray-500 mb-2">ประวัติการให้คำปรึกษา</div>
                          {selectedConsultations.length === 0 ? (
                            <div className="text-[13.5px] text-gray-400 py-4 text-center">ยังไม่มีประวัติ</div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {selectedConsultations.slice(0, 3).map((c) => (
                                <div key={c.id} className="text-[13px]">
                                  <div className="text-gray-400">{formatDate(c.createdAt)}</div>
                                  <div className="text-gray-700 truncate">เรื่อง: {c.subject || CONSULTATION_CATEGORIES[0]}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button type="button" onClick={() => navigate("/consultations")} className="mt-2 text-[13.5px] text-pink-600 hover:underline bg-transparent">ดูทั้งหมด →</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* คำแนะนำถึงนักเรียน — ตรงข้ามกับโน้ตลับ นักเรียนเห็นข้อความนี้ได้ */}
                <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 mt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[14px] text-pink-700 font-medium flex items-center gap-1.5">
                      <FaCommentDots size={12} /> คำแนะนำถึงนักเรียน (นักเรียนเห็นได้)
                    </div>
                    <button type="button" onClick={() => setAdviceDialogOpen(true)} className="h-8 px-2.5 rounded-full border border-pink-200 bg-white text-pink-700 text-[12.5px] font-medium flex items-center gap-1">
                      <FaPaperPlane size={10} /> ให้คำแนะนำ
                    </button>
                  </div>
                  {selectedAdvice.length === 0 ? (
                    <div className="text-[13.5px] text-gray-400">ยังไม่มีคำแนะนำ</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedAdvice.map((n) => (
                        <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg bg-white px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-[14px] text-gray-700 whitespace-pre-line">{n.text}</div>
                            <div className="text-[12px] text-gray-400 mt-1">{formatDateTime(n.createdAt)}</div>
                          </div>
                          <button type="button" onClick={() => handleDeleteAdvice(n.id)} className="text-gray-300 hover:text-red-500 shrink-0 bg-transparent">
                            <FaTrash size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </main>

      {adviceDialogOpen && (
        <PromptModal
          title="ให้คำแนะนำ"
          label="คำแนะนำ"
          placeholder="นักเรียนจะเห็นข้อความนี้..."
          confirmLabel="ส่งคำแนะนำ"
          multiline
          onConfirm={confirmAddAdvice}
          onClose={() => setAdviceDialogOpen(false)}
        />
      )}
    </div>
  );
}

function WorkThumb({ work, file }) {
  const cover = file?.cover_url || (file?.file_url ? resolveFileUrl(API_BASE, file.file_url) : null);
  const Icon = work.file_type === "link" ? FaLink : work.file_type === "video" ? FaVideo : file?.file_type === "application/pdf" ? FaFilePdf : FaFileAlt;
  return (
    <div className="w-full aspect-video rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center border border-gray-100">
      {cover ? <img src={cover} className="w-full h-full object-cover" /> : <Icon className="text-gray-300" size={22} />}
    </div>
  );
}

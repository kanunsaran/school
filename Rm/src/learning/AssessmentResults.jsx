import { useEffect, useMemo, useState } from "react";
import ExportMenu from "../components/ExportMenu.jsx";
import { exportReportPdf, safeFileName, todayStamp } from "../utils/reportPdf.js";
import { exportReportExcel } from "../utils/reportExcel.js";
import ResponsiveSheet from "../components/ResponsiveSheet.jsx";
import { isBelowXl } from "../utils/breakpoints.js";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  FaSearch, FaTimes, FaUser, FaCommentDots, FaCheck, FaPaperPlane, FaTrash,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import Avatar from "../components/Avatar.jsx";
import useStudentAvatars from "../hooks/useStudentAvatars.js";
import {
  getStudent, getEnrollments, getClasses, getTypeResults,
  getGoals,
  getAssessmentsList, getAssessmentAdvice, addAssessmentAdvice, updateAssessmentAdvice, deleteAssessmentAdvice,
} from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import PageLoading from "../components/PageLoading.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";
import { goalsOf, fullUniName } from "../utils/goals.js";
import { ADVICE_MAX } from "../utils/adviceTopics.js";
import { interestSummaryText, joinTh, TRAIT_NOUN } from "../utils/riasecSummary.js";
import { latestCurrentResults, legacyOnlyUserIds, RIASEC_TEST_TITLE } from "../utils/riasecResults.js";
import { RIASEC_ORDER, MAX_SCORE, denseRank, facultiesForCode, goalTargets, analyzeTarget, exploreFaculties } from "../utils/riasecScoring.js";

const LEVEL_META = {
  high: { label: "สอดคล้องสูง", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "สอดคล้องปานกลาง", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "สอดคล้องต่ำ", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};
const BAR = { R: "bg-red-400", I: "bg-blue-400", A: "bg-yellow-400", S: "bg-green-400", E: "bg-purple-400", C: "bg-gray-400" };


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

export default function AssessmentResultsPage() {
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [typeResults, setTypeResults] = useState([]);
  const [riasecData, setRiasecData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = getCurrentUser();

  const [customAssessments, setCustomAssessments] = useState([]);
  useEffect(() => {
    getAssessmentsList().then((data) => setCustomAssessments(data || [])).catch(() => setCustomAssessments([]));
  }, []);
  const assessmentOptions = useMemo(
    () => [{ id: "holland", title: RIASEC_TEST_TITLE }, ...customAssessments.map((a) => ({ id: a.assessment_id, title: a.title }))],
    [customAssessments]
  );
  const assessmentSelectOptions = useMemo(() => assessmentOptions.map((a) => ({ value: a.id, label: a.title })), [assessmentOptions]);

  const [assessmentFilter, setAssessmentFilter] = useState("holland");
  const [roomFilter, setRoomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false); // มือถือ/ไอแพด: ผลการประเมินเป็นป๊อปอัพ
  const [checkedIds, setCheckedIds] = useState(new Set());
  const PAGE_SIZE = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData, typeResultData, data, goalData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTypeResults().catch(() => []),
          import("../data/riasec.json").then((m) => m.default).catch(() => null),
          getGoals().catch(() => []),
        ]);
        setStudents(studentData || []);
        setEnrollments(enrollData || []);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setTypeResults(typeResultData || []);
        setRiasecData(data);
        setGoals(goalData || []);
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

  // ผลล่าสุดของแบบทดสอบปัจจุบัน (มีคะแนน 6 ด้าน) — ผลระบบเดิมไม่นับเป็น "เสร็จสิ้น"
  const latestResultByUserId = useMemo(() => latestCurrentResults(typeResults), [typeResults]);
  const legacyOnly = useMemo(() => legacyOnlyUserIds(typeResults, latestResultByUserId), [typeResults, latestResultByUserId]);

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
  const avatarByUser = useStudentAvatars(rows.map((r) => r.student.user_id));
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
  const selectedGrade = selected?.gradeId ? classesList.find((c) => String(c.id) === String(selected.gradeId)) : null;

  // สาขาที่ข้อมูลแนะแนวแนะนำสำหรับรหัสของนักเรียน (เกณฑ์เดียวกับหน้าผลของนักเรียน)
  const codeFaculties = (res) =>
    riasecData && res ? [...new Set(facultiesForCode(riasecData, res.riasec.code).flatMap((x) => x.rows.map((r) => r.name)))] : [];

  // เป้าหมายทั้งหมดของนักเรียน (เรียงเป้าหมายหลักก่อน) + ระดับความสอดคล้องกับผลล่าสุด — analyzeTarget เดียวกับหน้าผลของนักเรียน
  const selectedGoals = useMemo(() => {
    if (!selected) return [];
    return goalsOf(goals, selected.student.user_id).map((g) => {
      const target = riasecData ? goalTargets(riasecData, { faculty_name: g.faculty_name, goal_text: g.goal_text })[0] : null;
      const level = target && selected.result ? analyzeTarget(riasecData, selected.result.riasec, target).displayLevel : null;
      // สาขาในฐานข้อมูลที่ตรงกับเป้าหมาย (เป้าหมายกว้างหลายแขนง → แขนงที่ analyzeTarget เลือก)
      const faculty = target ? (selected.result ? analyzeTarget(riasecData, selected.result.riasec, target).faculty : target.match.rows[0]) : null;
      return { goal: g, level, faculty, unknown: Boolean(riasecData && !target) };
    });
  }, [goals, selected, riasecData]);

  // สาขาที่ระบบแนะนำ (≤ 3) ไม่รวมสาขาที่เป็นเป้าหมายอยู่แล้ว — exploreFaculties เดียวกับหน้าผลของนักเรียน
  const selectedExplore = useMemo(() => {
    if (!riasecData || !selected?.result) return [];
    const goalNames = selectedGoals.flatMap((x) => (x.faculty ? [x.faculty.name] : []));
    return exploreFaculties(riasecData, selected.result.riasec, goalNames, 3);
  }, [riasecData, selected, selectedGoals]);
  const mainGoalFaculty = selectedGoals[0]?.faculty || null;


  // ---------- ส่งออกรายงานผลการประเมิน (PDF อ่านง่าย / Excel) ----------
  const resultsReport = () => {
    const assessmentTitle = assessmentOptions.find((a) => a.id === assessmentFilter)?.title || "แบบประเมิน";
    const room = roomFilter ? classesList.find((c) => String(c.id) === String(roomFilter)) : null;
    const list = exportTargets.map((r, i) => {
      const c = classesList.find((cc) => String(cc.id) === String(r.gradeId));
      return {
        no: i + 1,
        code: r.student.student_code,
        name: r.student.fullname,
        room: c ? gradeLabel(c) : null,
        seat: r.seatNo,
        date: r.result ? formatDateTime(r.result.test_date) : null,
        status: STATUS_META[r.status].label,
        type: r.result?.riasec.code || null,
        faculty: codeFaculties(r.result).slice(0, 3).join(", ") || null,
      };
    });
    const done = exportTargets.filter((r) => r.status === "completed").length;
    const total = exportTargets.length;
    const columns = [
      { label: "ลำดับ", key: "no", width: "5%", align: "center" },
      { label: "รหัส", key: "code", width: "8%" },
      { label: "ชื่อ-นามสกุล", key: "name", width: "20%" },
      { label: "ห้อง", key: "room", width: "10%" },
      { label: "เลขที่", key: "seat", width: "5%", align: "center" },
      { label: "สถานะ", key: "status", width: "9%", align: "center" },
      { label: "วันที่ทำ", key: "date", width: "13%" },
      { label: "รหัส RIASEC", key: "type", width: "10%", align: "center" },
      { label: "สาขาที่แนะนำสำหรับรหัส", key: "faculty", width: "20%" },
    ];
    return {
      title: `รายงานผล ${assessmentTitle}`,
      subtitle: room ? `ห้อง ${gradeLabel(room)}` : "ทุกห้องที่สอน",
      info: [
        ["แบบประเมิน", assessmentTitle],
        ["ห้อง", room ? gradeLabel(room) : "ทุกห้อง"],
        ["สถานะ", statusFilter ? STATUS_META[statusFilter]?.label : null],
        ["ขอบเขต", checkedIds.size > 0 ? `นักเรียนที่เลือก ${checkedIds.size} คน` : null],
      ],
      summary: [
        { label: "นักเรียนทั้งหมด", value: `${total} คน`, tone: "gray" },
        { label: "ทำแล้ว", value: done, tone: "green" },
        { label: "ยังไม่ได้ทำ", value: total - done, tone: "red" },
        { label: "ทำแล้ว (%)", value: total ? `${Math.round((done / total) * 100)}%` : "-", tone: "blue" },
      ],
      table: { columns, rows: list },
      emptyText: "ไม่มีนักเรียนตามเงื่อนไขที่เลือก",
      orientation: "landscape",
      fileBase: `ผลการประเมิน_${safeFileName(room ? gradeLabel(room) : "ทุกห้อง")}_${todayStamp()}`,
    };
  };
  const exportResultsPdf = async () => {
    const r = resultsReport();
    await exportReportPdf({ ...r, filename: `${r.fileBase}.pdf` });
  };
  const exportResultsExcel = async () => {
    const r = resultsReport();
    await exportReportExcel({ title: r.title, info: r.info, columns: r.table.columns, rows: r.table.rows, sheetName: "ผลการประเมิน", filename: `${r.fileBase}.xlsx` });
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
            className="w-full sm:w-64"
            value={assessmentSelectOptions.find((o) => o.value === assessmentFilter)}
            onChange={(opt) => setAssessmentFilter(opt.value)}
            options={assessmentSelectOptions}
            isSearchable={false}
          />
          <Select
            styles={bigFilterSelectStyles}
            className="w-full sm:w-52"
            value={roomSelectOptions.find((o) => o.value === roomFilter)}
            onChange={(opt) => setRoomFilter(opt.value)}
            options={roomSelectOptions}
            isSearchable={false}
          />
          <Select
            styles={bigFilterSelectStyles}
            className="w-full sm:w-48"
            value={STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)}
            onChange={(opt) => setStatusFilter(opt.value)}
            options={STATUS_FILTER_OPTIONS}
            isSearchable={false}
          />
          <ExportMenu label={`ดาวน์โหลด${checkedIds.size > 0 ? ` (${checkedIds.size})` : ""}`} onPdf={exportResultsPdf} onExcel={exportResultsExcel} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_640px] gap-6 items-stretch">
          {/* ===== ซ้าย: รายชื่อ — เส้นคั่นแทนกรอบครอบ ===== */}
          <div className="min-w-0 xl:border-r xl:border-gray-200 xl:pr-6">
            {/* จอใหญ่: รายชื่อติดอยู่กับที่ เลื่อนอ่านผลด้านขวาได้โดยไม่ต้องเลื่อนกลับมาหารายชื่อ */}
            <div className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">

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
                          onClick={() => {
                            setSelectedId(r.student.user_id);
                            if (isBelowXl()) setSheetOpen(true);
                          }}
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
                          <Avatar src={avatarByUser[String(r.student.user_id)]} name={r.student.fullname} size={40} />
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
          </div>

          {/* ===== ขวา: รายละเอียด (จอเล็ก = ป๊อปอัพ) ===== */}
          <ResponsiveSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          <div className="min-w-0 h-full flex flex-col">
          <div className="hidden xl:block mb-2 text-[14.5px] text-transparent select-none shrink-0" aria-hidden="true">พบนักเรียน</div>
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
                  <button type="button" onClick={() => setSelectedId(null)} className="hidden xl:flex w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 items-center justify-center bg-transparent">
                    <FaTimes size={14} />
                  </button>
                </div>

                {/* ① ข้อมูลนักเรียน */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 min-w-0 max-w-70">
                    <Avatar src={avatarByUser[String(selected.student.user_id)]} name={selected.student.fullname} size={56} />
                    <div className="min-w-0">
                      <div className="text-[16.5px] font-bold text-gray-900 truncate">{selected.student.fullname}</div>
                      <div className="text-[13.5px] text-gray-500 truncate">
                        {selected.seatNo != null ? `เลขที่ ${selected.seatNo} · ` : ""}
                        {selectedGrade ? gradeLabel(selectedGrade) : "ไม่มีข้อมูลห้อง"}
                      </div>
                      <div className="text-[13.5px] text-gray-500 truncate">รหัสนักเรียน {selected.student.student_code || "-"}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[12.5px] font-medium px-2.5 py-1 rounded-full ${STATUS_META[selected.status].cls}`}>{STATUS_META[selected.status].label}</span>
                    {selected.result && <div className="text-[12.5px] text-gray-400 mt-1">ทำล่าสุด {formatDateTime(selected.result.test_date)}</div>}
                  </div>
                </div>

                {/* ② ผลความสนใจ */}
                <PanelSection title="ผลความสนใจ (RIASEC)">
                  {!selected.result ? (
                    <div className="rounded-xl bg-gray-50 text-gray-400 text-[14px] px-4 py-5 text-center">
                      นักเรียนคนนี้ยังไม่ได้ทำแบบประเมินนี้
                      {legacyOnly.has(String(selected.student.user_id)) && (
                        <div className="mt-1 text-[13px]">มีผลจากระบบเดิมที่ไม่มีคะแนนราย 6 ด้าน — ให้นักเรียนทำแบบทดสอบใหม่</div>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const res = selected.result.riasec;
                      const sc = selected.result.scores;
                      const dims = riasecData?.dimensions || {};
                      const top = res.ranked.filter((c) => denseRank(sc, c) <= 3);
                      return (
                        <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
                          <div className="flex flex-wrap items-end gap-x-2.5">
                            <span className="text-[28px] leading-none font-bold tracking-wider text-pink-800">{res.code}</span>
                            {res.alternativeCodes.length > 0 && res.alternativeCodes.length <= 2 && (
                              <span className="text-[13.5px] text-gray-400">หรือ {res.alternativeCodes.join(", ")}</span>
                            )}
                            <span className="ml-auto flex flex-wrap gap-1.5">
                              {top.map((c) => (
                                <span key={c} className="rounded-full bg-white px-2.5 py-0.5 text-[12.5px] font-medium text-gray-700 shadow-sm">
                                  {dims[c]?.nameTh || c}
                                </span>
                              ))}
                            </span>
                          </div>
                          <p className="mt-2.5 text-[14px] text-gray-700 leading-6">{interestSummaryText(sc, "นักเรียน")}</p>
                          <div className="mt-3 space-y-1.5">
                            {RIASEC_ORDER.map((c) => (
                              <div key={c} className="flex items-center gap-2 text-[13px]">
                                <span className="w-28 shrink-0 truncate text-gray-600">
                                  {c} · {dims[c]?.nameTh || ""}
                                </span>
                                <span className="h-2 flex-1 rounded-full bg-white">
                                  <span className={`block h-2 rounded-full ${BAR[c]}`} style={{ width: `${(sc[c] / MAX_SCORE) * 100}%` }} />
                                </span>
                                <span className="w-12 shrink-0 text-right font-medium text-gray-700">
                                  {sc[c]}/{MAX_SCORE}
                                </span>
                              </div>
                            ))}
                          </div>
                          {res.lowDifferentiation && <div className="mt-2 text-[12.5px] text-sky-700">คะแนนทุกด้านใกล้เคียงกัน</div>}
                          <div className="mt-2 text-[12px] text-gray-400">บอกความสนใจ ไม่ได้วัดความสามารถ</div>
                        </div>
                      );
                    })()
                  )}
                </PanelSection>

                {/* ③ เป้าหมายที่นักเรียนตั้งเอง */}
                <PanelSection title="🚩 เป้าหมายที่นักเรียนตั้งเอง">
                  {selectedGoals.length === 0 ? (
                    <div className="text-[13.5px] text-gray-400">นักเรียนยังไม่ได้ตั้งเป้าหมาย</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedGoals.map(({ goal: g, level, unknown }, i) => (
                        <div key={g.goal_id} className={`rounded-xl border px-3.5 py-2.5 ${i === 0 ? "border-pink-100 bg-pink-50/30" : "border-gray-100"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[12.5px] text-gray-400">{i === 0 ? "เป้าหมายหลัก" : `เป้าหมายสำรอง (อันดับ ${i + 1})`}</div>
                              <div className="text-[15px] font-medium text-gray-900">
                                {g.faculty_name || g.career_field || "-"}
                                <span className="font-normal text-gray-500"> • {g.university_name || "ยังไม่เลือกมหาวิทยาลัย"}</span>
                              </div>
                            </div>
                            {level ? (
                              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold ${LEVEL_META[level].cls}`}>{LEVEL_META[level].label}</span>
                            ) : unknown ? (
                              <span className="shrink-0 text-[12px] text-gray-400">ไม่พบสาขานี้ในข้อมูล</span>
                            ) : null}
                          </div>
                          {g.goal_text && <div className="text-[13.5px] text-gray-500 mt-0.5">“{g.goal_text}”</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </PanelSection>

                {/* ⑤ ข้อมูลประกอบการแนะแนว */}
                <PanelSection title="ข้อมูลประกอบการแนะแนว">
                  <div className="text-[15px] font-semibold text-gray-800">
                    สาขาที่ระบบแนะนำ <span className="font-normal text-gray-400">(จากผลความสนใจ — ไม่ใช่เป้าหมายของนักเรียน)</span>
                  </div>
                  {!selected.result ? (
                    <div className="mt-1 text-[14.5px] text-gray-400">ต้องมีผลแบบประเมินก่อน</div>
                  ) : selectedExplore.length === 0 ? (
                    <div className="mt-1 text-[14.5px] text-gray-400">ไม่มีข้อมูลสาขาที่เชื่อมกับความสนใจเด่นได้ชัดเจน</div>
                  ) : (
                    <ol className="mt-1.5 space-y-2">
                      {selectedExplore.map(({ row, code, links }, i) => {
                        const link = links.find((l) => l.code === row.dim) || links[0];
                        return (
                          <li key={row.name} className="text-[15px] text-gray-700 leading-7">
                            <span className="font-medium text-gray-900">
                              {i + 1}. {row.name}
                            </span>{" "}
                            <span className="text-[13px] text-pink-600">รหัส {code}</span>
                            <div className="text-[14.5px] text-gray-500">
                              เกี่ยวข้องกับ{joinTh(link.phrases.slice(0, 2))} ซึ่งเชื่อมโยงกับความสนใจด้าน{TRAIT_NOUN[link.code]}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  <div className="mt-4 text-[15px] font-semibold text-gray-800">
                    แนวทางเตรียมตัวสำหรับเป้าหมายหลัก{mainGoalFaculty ? `: ${mainGoalFaculty.name}` : ""}
                  </div>
                  {!mainGoalFaculty ? (
                    <div className="mt-1 text-[14.5px] text-gray-400">
                      {selectedGoals.length ? "ไม่พบสาขาเป้าหมายหลักในข้อมูลแนะแนว" : "นักเรียนยังไม่ได้ตั้งเป้าหมาย"}
                    </div>
                  ) : (
                    <GoalPrep faculty={mainGoalFaculty} goalUni={selectedGoals[0].goal.university_name} />
                  )}
                </PanelSection>

                {/* ⑥ ประวัติคำแนะนำจากครู */}
                {/* คำแนะนำถึงนักเรียน — บันทึกลงตาราง assessment_advice และแสดงในหน้าผลแบบประเมินของนักเรียน */}
                <AdviceEditor key={selected.student.user_id} studentId={selected.student.user_id} currentUserId={currentUser?.user_id} />
              </>
            )}
          </div>
          </div>
          </ResponsiveSheet>
        </div>
      </main>

    </div>
  );
}

const formatDateTimeShort = (d) => (d ? new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const toast = (icon, title) => Swal.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 2200 });
const apiError = (e, fallback) => e?.response?.data?.message || fallback;

// คำแนะนำถึงนักเรียน: เลือกหัวข้อ + เขียนข้อความ → บันทึกลงฐานข้อมูล (นักเรียนเห็นในหน้าผลแบบประเมิน)
// ครูแก้ไข/ลบได้เฉพาะคำแนะนำที่ตัวเองเขียน (ตรวจซ้ำที่ backend)
function AdviceEditor({ studentId, currentUserId }) {
  const [items, setItems] = useState(null); // null = กำลังโหลด
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadError(false);
    getAssessmentAdvice(studentId)
      .then((rows) => setItems(rows || []))
      .catch(() => {
        setItems([]);
        setLoadError(true);
      });
  };
  useEffect(load, [studentId]);

  const reset = () => {
    setText("");
    setEditingId(null);
  };
  const canSave = text.trim() && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editingId) await updateAssessmentAdvice(editingId, { advice_text: text.trim() });
      else await addAssessmentAdvice({ student_user_id: studentId, advice_text: text.trim() });
      toast("success", editingId ? "บันทึกการแก้ไขแล้ว" : "บันทึกคำแนะนำแล้ว นักเรียนจะเห็นในหน้าผลแบบประเมิน");
      reset();
      load();
    } catch (e) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: apiError(e, "ลองใหม่อีกครั้ง") });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    const ok = await Swal.fire({
      title: "ลบคำแนะนำนี้?",
      text: "นักเรียนจะไม่เห็นคำแนะนำนี้อีก",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    try {
      await deleteAssessmentAdvice(a.advice_id);
      if (editingId === a.advice_id) reset();
      toast("success", "ลบคำแนะนำแล้ว");
      load();
    } catch (e) {
      Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: apiError(e, "ลองใหม่อีกครั้ง") });
    }
  };

  const latest = items?.length ? items.reduce((m, a) => (new Date(a.updated_at) > new Date(m.updated_at) ? a : m)) : null;

  return (
    <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 mt-1">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-[14.5px] text-pink-700 font-semibold flex items-center gap-1.5">
          <FaCommentDots size={12} /> ประวัติคำแนะนำจากครู (นักเรียนเห็นได้)
        </div>
        {items !== null && (
          <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-medium ${latest ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            {latest ? `ให้คำแนะนำแล้ว · ล่าสุด ${formatDateTimeShort(latest.updated_at)}` : "ยังไม่มีคำแนะนำ"}
          </span>
        )}
      </div>

      {items === null ? (
        <div className="text-[13.5px] text-gray-400 mb-3">กำลังโหลด...</div>
      ) : loadError ? (
        <div className="text-[13.5px] text-red-600 mb-3">
          โหลดคำแนะนำไม่สำเร็จ{" "}
          <button type="button" onClick={load} className="underline bg-transparent !p-0">
            ลองใหม่
          </button>
        </div>
      ) : (
        items.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {items.map((a) => {
              const mine = String(a.teacher_user_id) === String(currentUserId);
              const edited = a.updated_at && a.created_at && new Date(a.updated_at) - new Date(a.created_at) > 1000;
              return (
                <div key={a.advice_id} className={`rounded-xl bg-white px-3.5 py-2.5 ${editingId === a.advice_id ? "ring-2 ring-pink-300" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    {a.topic ? <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[12px] font-medium text-pink-700">{a.topic}</span> : <span />}
                    {mine && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(a.advice_id);
                            setText(a.advice_text);
                          }}
                          className="h-7 px-2 rounded-lg text-[12.5px] text-gray-500 hover:bg-gray-100 bg-transparent"
                        >
                          แก้ไข
                        </button>
                        <button type="button" onClick={() => remove(a)} className="h-7 w-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 bg-transparent grid place-items-center">
                          <FaTrash size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 text-[14px] text-gray-700 whitespace-pre-line">{a.advice_text}</div>
                  <div className="mt-1 text-[12px] text-gray-400">
                    {a.teacher_name ? `โดย ${a.teacher_name} · ` : ""}
                    {formatDateTimeShort(a.created_at)}
                    {edited ? ` · แก้ไขล่าสุด ${formatDateTimeShort(a.updated_at)}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <div className="rounded-xl bg-white p-3.5">
        <label className="text-[13.5px] font-semibold text-gray-700" htmlFor="advice-text">
          {editingId ? "แก้ไขคำแนะนำ" : latest ? "เพิ่มคำแนะนำ" : "เขียนคำแนะนำ"}
        </label>
        <textarea
          id="advice-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, ADVICE_MAX))}
          rows={4}
          placeholder="เช่น ลองศึกษาหลักสูตรที่สนใจจากลิงก์ myTCAS และเริ่มเก็บผลงานที่เกี่ยวข้อง"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] outline-none focus:border-pink-400 resize-y"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-gray-400">
            {text.length}/{ADVICE_MAX} ตัวอักษร
          </span>
          <div className="flex items-center gap-2">
            {editingId && (
              <button type="button" onClick={reset} disabled={saving} className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-[13.5px] text-gray-600 hover:bg-gray-50">
                ยกเลิก
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="h-9 px-4 rounded-lg !bg-pink-500 hover:!bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13.5px] font-medium flex items-center gap-1.5"
            >
              <FaPaperPlane size={10} /> {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึกคำแนะนำ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// หัวข้อย่อยในแผงขวา — คั่นด้วยเส้น ไม่ใช้การ์ดซ้อน
function PanelSection({ title, children }) {
  return (
    <section className="border-t border-gray-100 py-4">
      <h3 className="mb-2 text-[16px] font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

// แนวทางเตรียมตัวแบบสรุปของสาขาเป้าหมายหลัก (ข้อมูลแนะแนวของโรงเรียน) + หลักสูตรใน myTCAS ถ้ามีลิงก์ที่ตรวจแล้ว
function GoalPrep({ faculty, goalUni }) {
  const programs = (faculty.programs || [])
    .map((pg, k) => {
      const [uni, ...rest] = pg.split(":");
      return { uni: fullUniName(uni.trim()), name: rest.join(":").trim(), link: faculty.links?.[k] };
    })
    .filter((x) => x.link);
  const fromGoal = goalUni ? programs.find((x) => x.uni === fullUniName(goalUni)) : null;
  const pick = fromGoal || programs[0] || null;
  const rows = [
    ["วิชาที่ควรเน้น", (faculty.subjects || []).join(", ")],
    ["สายการเรียนที่แนะนำ", faculty.track],
    ["ทักษะที่ช่วยให้พร้อม", faculty.skills],
    ["คำแนะนำการเตรียมสอบ (ทั่วไป ไม่ใช่เกณฑ์รับเข้า)", faculty.exam],
  ].filter(([, v]) => v);
  return (
    <div className="mt-1.5 space-y-1.5 text-[15px] leading-7">
      {rows.map(([k, v]) => (
        <div key={k}>
          <span className="text-gray-500">{k}: </span>
          <span className="text-gray-800">{v}</span>
        </div>
      ))}
      <div>
        <span className="text-gray-500">หลักสูตรและเกณฑ์รับสมัคร: </span>
        {pick ? (
          <a href={pick.link} target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-2 hover:text-sky-800">
            {pick.uni} บน myTCAS ↗
          </a>
        ) : (
          <span className="text-gray-400">ไม่มีข้อมูลหลักสูตรที่ตรวจสอบแล้ว</span>
        )}
        {pick && !fromGoal && goalUni && <span className="text-[13px] text-gray-400"> (ไม่พบหลักสูตรของ{goalUni}ในข้อมูล)</span>}
      </div>
      <div className="text-[13px] text-gray-400">ที่มา: ข้อมูลแนะแนวของโรงเรียน • หลักสูตรจาก myTCAS — ตรวจประกาศของมหาวิทยาลัยก่อนสมัคร</div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import {
  FaPlus, FaSearch, FaEye, FaPen, FaEllipsisV, FaStar, FaHeart,
  FaLightbulb, FaBullseye, FaBrain, FaFileAlt, FaClipboardList, FaUserFriends, FaRegClock,
  FaEdit, FaRocket, FaCopy, FaTrash, FaHistory,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  getClasses, getStudent, getTypeResults,
  getAssessmentsList, deleteAssessmentApi, duplicateAssessmentApi,
} from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { gradeLabel } from "../utils/gradeLabel.js";
import { notAvailableYet } from "../utils/feedShared.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";
import PageLoading from "../components/PageLoading.jsx";
import { getActivityLog, logActivity } from "../utils/assessmentStore.js";

// แปลงแถวดิบจาก GET /assessments (assessment_id, open_date, target_grade_ids, question_count, response_count, ...)
// ให้เป็น shape เดิม {id, openDate, targetGradeIds, ...} ที่หน้านี้ใช้อยู่แล้ว
const normalizeAssessment = (raw) => ({
  id: raw.assessment_id,
  title: raw.title,
  description: raw.description || "",
  type: raw.type,
  status: raw.status,
  openDate: raw.open_date || "",
  closeDate: raw.close_date || "",
  targetGradeIds: (raw.target_grade_ids || []).map(String),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  createdByUserId: raw.created_by_user_id,
  questionCount: raw.question_count || 0,
  responseCount: raw.response_count || 0,
});

const TYPE_META = {
  "ความสนใจ": { icon: FaStar, cls: "bg-purple-50 text-purple-600" },
  "บุคลิกภาพ": { icon: FaHeart, cls: "bg-pink-50 text-pink-600" },
  "ทักษะ": { icon: FaLightbulb, cls: "bg-amber-50 text-amber-600" },
  "เป้าหมาย": { icon: FaBullseye, cls: "bg-emerald-50 text-emerald-600" },
  "ความถนัด": { icon: FaBrain, cls: "bg-blue-50 text-blue-600" },
  "อื่นๆ": { icon: FaFileAlt, cls: "bg-gray-100 text-gray-500" },
};

const STATUS_META = {
  draft: { label: "ร่าง", cls: "bg-gray-100 text-gray-500" },
  scheduled: { label: "รอเปิดใช้งาน", cls: "bg-blue-50 text-blue-600" },
  published: { label: "เปิดใช้งาน", cls: "bg-emerald-50 text-emerald-700" },
  closed: { label: "ปิดการใช้งาน", cls: "bg-amber-50 text-amber-700" },
};

const ACTIVITY_META = {
  create: { icon: FaEdit, cls: "bg-blue-50 text-blue-600", verb: "สร้างแบบประเมินใหม่" },
  edit: { icon: FaPen, cls: "bg-amber-50 text-amber-600", verb: "แก้ไขแบบประเมิน" },
  publish: { icon: FaRocket, cls: "bg-emerald-50 text-emerald-600", verb: "เผยแพร่แบบประเมิน" },
  duplicate: { icon: FaCopy, cls: "bg-purple-50 text-purple-600", verb: "ทำสำเนาแบบประเมิน" },
  delete: { icon: FaTrash, cls: "bg-red-50 text-red-600", verb: "ลบแบบประเมิน" },
};

const HOLLAND_ID = "holland-riasec";

const STATUS_OPTIONS = [{ value: "", label: "สถานะ: ทั้งหมด" }, ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))];

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "");
const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const daysLeftLabel = (closeDate) => {
  if (!closeDate) return "ไม่กำหนด";
  const diff = Math.ceil((new Date(closeDate).setHours(23, 59, 59, 999) - Date.now()) / 86400000);
  if (diff < 0) return "ปิดแล้ว";
  if (diff === 0) return "ปิดวันนี้";
  return `เหลือ ${diff} วัน`;
};

export default function AssessmentListPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [customList, setCustomList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [hollandRespondedCount, setHollandRespondedCount] = useState(0);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("all"); // all | mine | system
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const refreshLocal = () => {
    getAssessmentsList({ created_by_user_id: currentUser?.user_id })
      .then((data) => setCustomList((data || []).map(normalizeAssessment)))
      .catch(() => setCustomList([]));
    setActivityLog(getActivityLog());
  };

  useEffect(() => {
    refreshLocal();
    const load = async () => {
      setLoading(true);
      try {
        const [gradeData, students, typeResults] = await Promise.all([
          getClasses().catch(() => []),
          getStudent().catch(() => []),
          getTypeResults().catch(() => []),
        ]);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setStudentCount((students || []).length);
        // กรองเฉพาะผลของนักเรียนจริง (พบข้อมูลทดสอบของบัญชีครูปนอยู่ในตาราง user_type_result)
        const studentIds = new Set((students || []).map((s) => String(s.user_id)));
        const uniqueRespondents = new Set((typeResults || []).filter((r) => studentIds.has(String(r.user_user_id))).map((r) => String(r.user_user_id)));
        setHollandRespondedCount(uniqueRespondents.size);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // แบบประเมิน Holland Code (RIASEC) — ประจำระบบ เขียนข้อมูลนิ่งไว้ในโค้ด (ไม่มี "assessment definition" ในตารางจริง)
  // แต่ตัวเลขผู้ตอบแล้ว/นักเรียนทั้งหมด ดึงจริงจาก user_type_result + users/student
  const hollandAssessment = useMemo(
    () => ({
      id: HOLLAND_ID,
      title: "Holland Code (RIASEC)",
      description: "แบบประเมินความสนใจและอาชีพตามทฤษฎี RIASEC",
      type: "ความสนใจ",
      isSystem: true,
      status: "published",
      openDate: "",
      closeDate: "",
      targetGradeIds: [],
      responded: hollandRespondedCount,
      total: studentCount,
      createdAt: null,
    }),
    [hollandRespondedCount, studentCount]
  );

  const allAssessments = useMemo(() => {
    const custom = customList.map((a) => {
      const targetStudents = a.targetGradeIds.length
        ? studentCount // ยังไม่มีข้อมูล enroll ต่อแบบประเมิน แสดงประมาณจากนักเรียนทั้งหมดเมื่อกำหนดกลุ่มเป้าหมายไว้
        : studentCount;
      return { ...a, isSystem: false, responded: a.responseCount, total: a.targetGradeIds.length ? targetStudents : 0 };
    });
    return [hollandAssessment, ...custom];
  }, [customList, hollandAssessment, studentCount]);

  const filtered = useMemo(() => {
    let list = allAssessments;
    if (tab === "mine") list = list.filter((a) => !a.isSystem);
    if (tab === "system") list = list.filter((a) => a.isSystem);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    if (gradeFilter) list = list.filter((a) => a.isSystem || a.targetGradeIds.includes(gradeFilter));
    list = list.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [allAssessments, tab, search, statusFilter, gradeFilter]);

  const stats = useMemo(() => {
    const created = allAssessments.length;
    const published = allAssessments.filter((a) => a.status === "published").length;
    const totalResponded = allAssessments.reduce((sum, a) => sum + (a.responded || 0), 0);
    const totalPossible = allAssessments.reduce((sum, a) => sum + (a.total || 0), 0);
    const publishedWithClose = allAssessments.filter((a) => a.status === "published" && a.closeDate).length;
    const waiting = allAssessments.filter((a) => a.status === "draft" || a.status === "scheduled").length;
    return {
      created,
      published,
      totalResponded,
      totalPossible,
      pct: totalPossible > 0 ? Math.round((totalResponded / totalPossible) * 100) : 0,
      publishedCount: published,
      publishedWithClose,
      waiting,
    };
  }, [allAssessments]);

  const gradeOptions = useMemo(
    () => [{ value: "", label: "กลุ่มเป้าหมาย: ทั้งหมด" }, ...classesList.map((c) => ({ value: String(c.id), label: gradeLabel(c) }))],
    [classesList]
  );

  const mineCount = customList.length;

  const handleDelete = async (a) => {
    const result = await Swal.fire({
      title: `ลบ "${a.title}"?`,
      text: "ลบแล้วกู้คืนไม่ได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAssessmentApi(a.id);
      logActivity("delete", a.title);
      refreshLocal();
    } catch {
      Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
    setOpenMenuId(null);
  };

  const handleDuplicate = async (a) => {
    try {
      await duplicateAssessmentApi(a.id);
      logActivity("duplicate", a.title);
      refreshLocal();
    } catch {
      Swal.fire({ icon: "error", title: "ทำสำเนาไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
    setOpenMenuId(null);
  };

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="page-title">แบบประเมินทั้งหมด</h1>
            <p className="page-subtitle mt-1">จัดการแบบประเมินที่คุณสร้างและแบบประเมินประจำระบบ</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/assessments/create")}
              className="h-11 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-[15.5px] flex items-center gap-2"
            >
              <FaPlus size={12} /> สร้างแบบประเมินใหม่
            </button>
          </div>
        </div>

        {/* ===== Stat cards ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FaClipboardList} cardCls="bg-pink-50" iconCls="bg-pink-100 text-pink-600" label="แบบประเมินที่สร้าง" value={`${stats.created} แบบ`} sub={`เผยแพร่แล้ว ${stats.publishedCount} แบบ`} />
          <StatCard icon={FaUserFriends} cardCls="bg-blue-50" iconCls="bg-blue-100 text-blue-600" label="นักเรียนที่ตอบแล้ว (รวม)" value={`${stats.totalResponded} คน`} sub={`จากผู้ตอบทั้งหมด ${stats.totalPossible} คน (${stats.pct}%)`} />
          <StatCard icon={FaRocket} cardCls="bg-emerald-50" iconCls="bg-emerald-100 text-emerald-600" label="กำลังเปิดใช้งาน" value={`${stats.published} แบบ`} sub={`กำหนดปิด ${stats.publishedWithClose} แบบ`} />
          <StatCard icon={FaRegClock} cardCls="bg-amber-50" iconCls="bg-amber-100 text-amber-600" label="รอเปิดใช้งาน" value={`${stats.waiting} แบบ`} sub="ยังไม่ถึงกำหนดเปิด/เป็นร่าง" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="min-w-0">
            {/* ===== Filters ===== */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <div className="relative flex-1 min-w-55">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อแบบประเมิน"
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[15px] outline-none focus:border-pink-400"
                />
              </div>
              <Select
                styles={bigFilterSelectStyles}
                className="w-56"
                value={gradeOptions.find((o) => o.value === gradeFilter)}
                onChange={(opt) => setGradeFilter(opt.value)}
                options={gradeOptions}
                isSearchable={false}
              />
              <Select
                styles={bigFilterSelectStyles}
                className="w-52"
                value={STATUS_OPTIONS.find((o) => o.value === statusFilter)}
                onChange={(opt) => setStatusFilter(opt.value)}
                options={STATUS_OPTIONS}
                isSearchable={false}
              />
            </div>

            {/* ===== Tabs ===== */}
            <div className="flex items-center gap-2 mb-4">
              {[
                { key: "all", label: "ทั้งหมด" },
                { key: "mine", label: `ของฉัน${mineCount ? ` (${mineCount})` : ""}` },
                { key: "system", label: "ประจำระบบ" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`h-10 px-4 rounded-full text-[14.5px] font-medium transition-colors ${
                    tab === t.key ? "bg-pink-500 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ===== Table ===== */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1.1fr_0.9fr_1.2fr_1fr_0.9fr] gap-2 px-4 py-2.5 text-[13px] text-gray-400 border-b border-gray-100">
                <div>ชื่อแบบประเมิน</div>
                <div>ประเภท</div>
                <div>กลุ่มเป้าหมาย</div>
                <div>สถานะ</div>
                <div>ผู้ตอบแล้ว/ทั้งหมด</div>
                <div>ช่วงเวลา</div>
                <div className="text-right">จัดการ</div>
              </div>

              {loading ? (
                <PageLoading />
              ) : filtered.length === 0 ? (
                <div className="text-center text-gray-400 py-14 text-[14.5px]">ไม่พบแบบประเมิน</div>
              ) : (
                filtered.map((a) => {
                  const typeMeta = TYPE_META[a.type] || TYPE_META["อื่นๆ"];
                  const pct = a.total > 0 ? Math.round((a.responded / a.total) * 100) : 0;
                  const gradeLabels = a.isSystem
                    ? "นักเรียนทั้งหมด"
                    : a.targetGradeIds.length
                    ? a.targetGradeIds.map((id) => classesList.find((c) => String(c.id) === String(id))).filter(Boolean).map((c) => gradeLabel(c)).join(", ") || "-"
                    : "ยังไม่กำหนด";
                  return (
                    <div key={a.id} className="grid grid-cols-[2fr_1fr_1.1fr_0.9fr_1.2fr_1fr_0.9fr] gap-2 px-4 py-3.5 border-b border-gray-50 items-center hover:bg-gray-50/60">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.cls}`}>
                          <typeMeta.icon size={15} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                            {a.title}
                            {a.isSystem && <span className="text-[11.5px] font-medium px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 shrink-0">ประจำระบบ</span>}
                          </div>
                          <div className="text-[13px] text-gray-400 truncate">{a.description}</div>
                          {a.createdAt && <div className="text-[12px] text-gray-300 mt-0.5">สร้างเมื่อ {formatDate(a.createdAt)}</div>}
                        </div>
                      </div>
                      <div>
                        <span className="text-[13px] font-medium px-2 py-1 rounded-lg bg-gray-50 text-gray-600">{a.type}</span>
                      </div>
                      <div className="text-[13.5px] text-gray-600 truncate" title={gradeLabels}>{gradeLabels}</div>
                      <div>
                        <span className={`text-[12.5px] font-medium px-2 py-1 rounded-full ${STATUS_META[a.status].cls}`}>{STATUS_META[a.status].label}</span>
                      </div>
                      <div>
                        <div className="text-[14px] text-gray-700">{a.responded} / {a.total} คน <span className="text-gray-400">({pct}%)</span></div>
                        <div className="h-1.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-[13.5px] text-gray-600">
                        {a.openDate || a.closeDate ? (
                          <>
                            <div>{formatDate(a.openDate) || "?"} - {formatDate(a.closeDate) || "ไม่กำหนด"}</div>
                            <div className="text-[12.5px] text-gray-400">{daysLeftLabel(a.closeDate)}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">ไม่กำหนด</span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1 relative">
                        <button type="button" onClick={() => notAvailableYet("ดูผลแบบประเมิน")} title="ดูผล" className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center bg-transparent">
                          <FaEye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => (a.isSystem ? notAvailableYet("แก้ไขแบบประเมินประจำระบบ") : navigate(`/assessments/${a.id}/edit`))}
                          title="แก้ไข"
                          className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center bg-transparent"
                        >
                          <FaPen size={12} />
                        </button>
                        {!a.isSystem && (
                          <button
                            type="button"
                            onClick={() => setOpenMenuId((prev) => (prev === a.id ? null : a.id))}
                            title="เพิ่มเติม"
                            className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center bg-transparent"
                          >
                            <FaEllipsisV size={12} />
                          </button>
                        )}
                        {openMenuId === a.id && (
                          <div className="absolute right-0 top-9 w-40 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden z-20 py-1">
                            <button type="button" onClick={() => handleDuplicate(a)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left bg-transparent text-[14px] text-gray-700">
                              <FaCopy size={11} /> ทำสำเนา
                            </button>
                            <button type="button" onClick={() => handleDelete(a)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-left bg-transparent text-[14px] text-red-600">
                              <FaTrash size={11} /> ลบ
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 text-[13.5px] text-gray-400 flex items-center gap-1.5">
              <FaHistory size={10} /> แบบประเมิน "ของฉัน" บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น (ระบบยังไม่มีตารางเก็บแบบประเมินหลายชุดฝั่ง backend)
            </div>
          </div>

          {/* ===== Right sidebar ===== */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[15.5px] font-semibold text-gray-900 mb-4">การใช้งานล่าสุดของฉัน</div>
              {activityLog.length === 0 ? (
                <div className="text-[14px] text-gray-400">ยังไม่มีการใช้งาน</div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {activityLog.slice(0, 6).map((entry) => {
                    const meta = ACTIVITY_META[entry.action] || ACTIVITY_META.edit;
                    return (
                      <div key={entry.id} className="flex items-start gap-2.5">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
                          <meta.icon size={12} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[14px] text-gray-700">{meta.verb}</div>
                          <div className="text-[13.5px] text-gray-500 truncate">{entry.title}</div>
                          <div className="text-[12.5px] text-gray-300 mt-0.5">{formatDateTime(entry.at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, cardCls, iconCls, label, value, sub }) {
  const Comp = icon;
  return (
    <div className={`rounded-2xl p-4 flex items-start gap-3 ${cardCls}`}>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Comp size={17} />
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] text-gray-600 truncate">{label}</div>
        <div className="text-[21px] font-bold text-gray-900">{value}</div>
        <div className="text-[12.5px] text-gray-500 truncate">{sub}</div>
      </div>
    </div>
  );
}

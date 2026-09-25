import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FaPlus, FaUpload, FaSearch, FaThList, FaTh, FaEye, FaPen, FaEllipsisV, FaStar, FaHeart,
  FaLightbulb, FaBullseye, FaBrain, FaFileAlt, FaClipboardList, FaUserFriends, FaRegClock,
  FaEdit, FaRocket, FaCopy, FaTrash, FaHistory,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getClasses, getStudent, getTypeResults } from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { notAvailableYet } from "../utils/feedShared.js";
import {
  getAssessments, deleteAssessment, duplicateAssessment, getActivityLog, ASSESSMENT_TYPES,
} from "../utils/assessmentStore.js";

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

  const [customList, setCustomList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [hollandRespondedCount, setHollandRespondedCount] = useState(0);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("all"); // all | mine | system
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [openMenuId, setOpenMenuId] = useState(null);

  const refreshLocal = () => {
    setCustomList(getAssessments());
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
      return { ...a, isSystem: false, responded: 0, total: a.targetGradeIds.length ? targetStudents : 0 };
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
    if (typeFilter) list = list.filter((a) => a.type === typeFilter);
    if (gradeFilter) list = list.filter((a) => a.isSystem || a.targetGradeIds.includes(gradeFilter));
    list = list.slice().sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title, "th");
      if (sortBy === "responded") return (b.responded || 0) - (a.responded || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return list;
  }, [allAssessments, tab, search, statusFilter, typeFilter, gradeFilter, sortBy]);

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
    deleteAssessment(a.id);
    refreshLocal();
    setOpenMenuId(null);
  };

  const handleDuplicate = (a) => {
    duplicateAssessment(a.id);
    refreshLocal();
    setOpenMenuId(null);
  };

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">แบบประเมินทั้งหมด</h1>
            <p className="text-[13px] text-gray-500 mt-1">จัดการแบบประเมินที่คุณสร้างและแบบประเมินประจำระบบ</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/assessments/create")}
              className="h-11 px-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-[14px] flex items-center gap-2"
            >
              <FaPlus size={12} /> สร้างแบบประเมินใหม่
            </button>
            <button
              type="button"
              onClick={() => notAvailableYet("อัปโหลดแบบประเมิน")}
              className="h-11 px-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[14px] text-gray-600 flex items-center gap-2"
            >
              <FaUpload size={12} /> อัปโหลดแบบประเมิน
            </button>
          </div>
        </div>

        {/* ===== Stat cards ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FaClipboardList} iconCls="bg-pink-50 text-pink-600" label="แบบประเมินที่สร้าง" value={`${stats.created} แบบ`} sub={`เผยแพร่แล้ว ${stats.publishedCount} แบบ`} />
          <StatCard icon={FaUserFriends} iconCls="bg-blue-50 text-blue-600" label="นักเรียนที่ตอบแล้ว (รวม)" value={`${stats.totalResponded} คน`} sub={`จากผู้ตอบทั้งหมด ${stats.totalPossible} คน (${stats.pct}%)`} />
          <StatCard icon={FaRocket} iconCls="bg-emerald-50 text-emerald-600" label="กำลังเปิดใช้งาน" value={`${stats.published} แบบ`} sub={`กำหนดปิด ${stats.publishedWithClose} แบบ`} />
          <StatCard icon={FaRegClock} iconCls="bg-amber-50 text-amber-600" label="รอเปิดใช้งาน" value={`${stats.waiting} แบบ`} sub="ยังไม่ถึงกำหนดเปิด/เป็นร่าง" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="min-w-0">
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
                  className={`h-9 px-4 rounded-full text-[13px] font-medium transition-colors ${
                    tab === t.key ? "bg-pink-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ===== Filters ===== */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <div className="relative flex-1 min-w-45">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อแบบประเมิน"
                  className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[13.5px] outline-none focus:border-pink-400"
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400">
                <option value="">สถานะ: ทั้งหมด</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400">
                <option value="">ประเภท: ทั้งหมด</option>
                {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400">
                <option value="">กลุ่มเป้าหมาย: ทั้งหมด</option>
                {classesList.map((c) => <option key={c.id} value={String(c.id)}>{gradeLabel(c)}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400">
                <option value="recent">เรียงตาม: ล่าสุด</option>
                <option value="name">เรียงตาม: ชื่อ ก-ฮ</option>
                <option value="responded">เรียงตาม: ผู้ตอบมากสุด</option>
              </select>
              <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-white">
                <button type="button" className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center"><FaThList size={12} /></button>
                <button type="button" onClick={() => notAvailableYet("มุมมองแบบตาราง")} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-50 flex items-center justify-center bg-transparent"><FaTh size={12} /></button>
              </div>
            </div>

            {/* ===== Table ===== */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1.1fr_0.9fr_1.2fr_1fr_0.9fr] gap-2 px-4 py-2.5 text-[11.5px] text-gray-400 border-b border-gray-100">
                <div>ชื่อแบบประเมิน</div>
                <div>ประเภท</div>
                <div>กลุ่มเป้าหมาย</div>
                <div>สถานะ</div>
                <div>ผู้ตอบแล้ว/ทั้งหมด</div>
                <div>ช่วงเวลา</div>
                <div className="text-right">จัดการ</div>
              </div>

              {loading ? (
                <div className="text-center text-gray-400 py-14">กำลังโหลด...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-gray-400 py-14 text-[13px]">ไม่พบแบบประเมิน</div>
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
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.cls}`}>
                          <typeMeta.icon size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-gray-900 truncate flex items-center gap-1.5">
                            {a.title}
                            {a.isSystem && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 shrink-0">ประจำระบบ</span>}
                          </div>
                          <div className="text-[11.5px] text-gray-400 truncate">{a.description}</div>
                          {a.createdAt && <div className="text-[10.5px] text-gray-300 mt-0.5">สร้างเมื่อ {formatDate(a.createdAt)}</div>}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11.5px] font-medium px-2 py-1 rounded-lg bg-gray-50 text-gray-600">{a.type}</span>
                      </div>
                      <div className="text-[12px] text-gray-600 truncate" title={gradeLabels}>{gradeLabels}</div>
                      <div>
                        <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${STATUS_META[a.status].cls}`}>{STATUS_META[a.status].label}</span>
                      </div>
                      <div>
                        <div className="text-[12.5px] text-gray-700">{a.responded} / {a.total} คน <span className="text-gray-400">({pct}%)</span></div>
                        <div className="h-1.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-[12px] text-gray-600">
                        {a.openDate || a.closeDate ? (
                          <>
                            <div>{formatDate(a.openDate) || "?"} - {formatDate(a.closeDate) || "ไม่กำหนด"}</div>
                            <div className="text-[11px] text-gray-400">{daysLeftLabel(a.closeDate)}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">ไม่กำหนด</span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1 relative">
                        <button type="button" onClick={() => notAvailableYet("ดูผลแบบประเมิน")} title="ดูผล" className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center bg-transparent">
                          <FaEye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => (a.isSystem ? notAvailableYet("แก้ไขแบบประเมินประจำระบบ") : navigate(`/assessments/${a.id}/edit`))}
                          title="แก้ไข"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center bg-transparent"
                        >
                          <FaPen size={12} />
                        </button>
                        {!a.isSystem && (
                          <button
                            type="button"
                            onClick={() => setOpenMenuId((prev) => (prev === a.id ? null : a.id))}
                            title="เพิ่มเติม"
                            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center bg-transparent"
                          >
                            <FaEllipsisV size={12} />
                          </button>
                        )}
                        {openMenuId === a.id && (
                          <div className="absolute right-0 top-9 w-40 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden z-20 py-1">
                            <button type="button" onClick={() => handleDuplicate(a)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left bg-transparent text-[12.5px] text-gray-700">
                              <FaCopy size={11} /> ทำสำเนา
                            </button>
                            <button type="button" onClick={() => handleDelete(a)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-left bg-transparent text-[12.5px] text-red-600">
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

            <div className="mt-3 text-[12px] text-gray-400 flex items-center gap-1.5">
              <FaHistory size={10} /> แบบประเมิน "ของฉัน" บันทึกไว้ในเบราว์เซอร์นี้เท่านั้น (ระบบยังไม่มีตารางเก็บแบบประเมินหลายชุดฝั่ง backend)
            </div>
          </div>

          {/* ===== Right sidebar ===== */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[14px] font-semibold text-gray-900 mb-4">การใช้งานล่าสุดของฉัน</div>
              {activityLog.length === 0 ? (
                <div className="text-[12.5px] text-gray-400">ยังไม่มีการใช้งาน</div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {activityLog.slice(0, 6).map((entry) => {
                    const meta = ACTIVITY_META[entry.action] || ACTIVITY_META.edit;
                    return (
                      <div key={entry.id} className="flex items-start gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
                          <meta.icon size={11} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12.5px] text-gray-700">{meta.verb}</div>
                          <div className="text-[12px] text-gray-500 truncate">{entry.title}</div>
                          <div className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(entry.at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-pink-200 bg-pink-50/60 p-5">
              <div className="text-[13.5px] font-semibold text-pink-800 mb-2">แนะนำสำหรับครู</div>
              <p className="text-[12px] text-pink-700/80 mb-3">สร้างแบบประเมินใหม่ได้ง่าย ๆ แบบ Google Form — เพิ่มคำถาม เลือกกลุ่มเป้าหมาย แล้วเผยแพร่ได้ทันที</p>
              <button
                type="button"
                onClick={() => navigate("/assessments/create")}
                className="w-full h-9 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[12.5px] font-semibold"
              >
                สร้างแบบประเมินใหม่
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, iconCls, label, value, sub }) {
  const Comp = icon;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex items-start gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Comp size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] text-gray-500 truncate">{label}</div>
        <div className="text-[19px] font-bold text-gray-900">{value}</div>
        <div className="text-[11px] text-gray-400 truncate">{sub}</div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import PageLoading from "../../components/PageLoading.jsx";
import {
  FaPlus, FaSearch, FaEllipsisV, FaUserFriends, FaCommentDots,
  FaFolderOpen, FaCertificate, FaClipboardList,
  FaHandsHelping, FaStar, FaLightbulb, FaTimes, FaChevronLeft, FaChevronRight, FaPen, FaTrash, FaDownload, FaLink,
} from "react-icons/fa";
import PortfolioWorkModal from "../../components/PortfolioWorkModal.jsx";
import {
  getPortfolioWorks, getPortfolioWorkFiles, createPortfolioWork, updatePortfolioWork, deletePortfolioWork, uploadPortfolioFile,
  getClasses, getStudent, getEnrollments, getTeacher, getTeacherGeneralInfo,
} from "../../callapi/callapi_user.jsx";
import { PORTFOLIO_CATEGORIES, VISIBILITY_META, STATUS_META, VISIBILITY_ICON, VISIBILITY_BADGE, STATUS_BADGE } from "../../utils/portfolioStore.js";
import { formatThaiDateTime, API_BASE } from "../../utils/feedShared.js";
import { filterSelectStyles } from "../../utils/reactSelectStyles.js";
import { resolveFileUrl } from "../../utils/media.js";
import PortfolioCard from "../../components/PortfolioCard.jsx";
import PortfolioFilePreview from "../../components/PortfolioFilePreview.jsx";
import Avatar from "../../components/Avatar.jsx";

// ⚠️ ยังไม่มีระบบ login จริง ใช้ user_id placeholder เดียวกับหน้านักเรียนอื่น (StudentNews.jsx, yc1.jsx) รอทำ auth จริงค่อยเปลี่ยน
const CURRENT_STUDENT_ID = "1";

const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

// สี+ไอคอนต่อหมวดหมู่ (ใช้เฉพาะตอนดูรายละเอียดผลงาน — โมดัลรายละเอียดยังเหมือนเดิม) — คีย์ต้องตรงกับ PORTFOLIO_CATEGORIES ใน portfolioStore.js เป๊ะๆ
const CATEGORY_META = {
  "พอร์ตฟอลิโอ": { color: "#a855f7", icon: FaFolderOpen },
  "เกียรติบัตร": { color: "#f97316", icon: FaCertificate },
  "กิจกรรม": { color: "#3b82f6", icon: FaClipboardList },
  "จิตอาสา": { color: "#ef4444", icon: FaHandsHelping },
  "ผลงาน": { color: "#eab308", icon: FaStar },
  "โครงงาน": { color: "#6366f1", icon: FaLightbulb },
};
const DEFAULT_CATEGORY_META = { color: "#6b7280", icon: FaFolderOpen };
const categoryMetaOf = (cat) => CATEGORY_META[cat] || DEFAULT_CATEGORY_META;

const MAIN_TABS = [
  { key: "browse", label: "ทั้งหมด" },
  { key: "mine", label: "งานของฉัน" },
  { key: "advice", label: "คำแนะนำจากครู" },
];

export default function StudentPortfolioPage() {
  const [works, setWorks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [gradeOfStudent, setGradeOfStudent] = useState({});
  const [myGradeId, setMyGradeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState(null);

  const [mainTab, setMainTab] = useState("browse");
  const [sortBy, setSortBy] = useState("newest");
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [selectedAdviceId, setSelectedAdviceId] = useState(null);
  const [detailWorkId, setDetailWorkId] = useState(null);

  // ครูที่ให้คำแนะนำแต่ละคน (user_id -> ชื่อจริง+รูปโปรไฟล์จริง) — ใช้แสดงในบล็อกคำแนะนำ
  const [reviewerById, setReviewerById] = useState({});

  const loadAll = async () => {
    try {
      const [classesRes, studentsRes, enrollRes, worksRes] = await Promise.all([
        getClasses(), getStudent(), getEnrollments(), getPortfolioWorks(),
      ]);
      setClasses(classesRes);

      const sMap = {};
      studentsRes.forEach((s) => { sMap[String(s.user_id)] = s; });
      setStudentMap(sMap);

      const gMap = {};
      enrollRes.forEach((e) => { gMap[String(e.user_user_id)] = String(e.grade_idgrade); });
      setGradeOfStudent(gMap);
      setMyGradeId(gMap[CURRENT_STUDENT_ID] || null);

      const withFiles = await Promise.all(
        worksRes.map(async (w) => {
          try {
            const files = await getPortfolioWorkFiles(w.work_id);
            return { ...w, files };
          } catch {
            return { ...w, files: [] };
          }
        })
      );
      setWorks(withFiles);

      // ดึงชื่อ+รูปโปรไฟล์จริงของครูที่เคยให้คำแนะนำผลงานเหล่านี้ (ไม่ยึดชื่อ/รูปครูตายตัวเหมือนเดิม)
      try {
        const reviewerIds = [...new Set(withFiles.map((w) => w.reviewed_by).filter(Boolean).map(String))];
        if (reviewerIds.length > 0) {
          const teachers = await getTeacher().catch(() => []);
          const entries = await Promise.all(
            reviewerIds.map(async (id) => {
              const t = teachers.find((x) => String(x.user_id) === id);
              const info = await getTeacherGeneralInfo(id).catch(() => null);
              return [id, { name: t?.fullname || "ครู", avatarUrl: info?.avatar_url || null }];
            })
          );
          setReviewerById(Object.fromEntries(entries));
        }
      } catch (err) {
        console.error("โหลดข้อมูลครูผู้ให้คำแนะนำไม่สำเร็จ:", err);
      }
    } catch (err) {
      console.error("โหลดผลงานไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const classById = useMemo(() => {
    const map = {};
    classes.forEach((c) => { map[String(c.idgrade)] = c; });
    return map;
  }, [classes]);

  const gradeTextOf = (w) => {
    const gid = w.grade_idgrade || gradeOfStudent[w.student_user_id];
    const cls = gid ? classById[String(gid)] : null;
    return cls ? gradeLabel(cls) : "";
  };

  // ตัวเลือกของ react-select แต่ละตัวกรอง — มี "ทั้งหมด" (value ว่าง) นำหน้าเสมอ
  const categoryOptions = useMemo(
    () => [{ value: "", label: "หมวดหมู่: ทั้งหมด" }, ...PORTFOLIO_CATEGORIES.map((c) => ({ value: c, label: c }))],
    []
  );
  const sortOptions = [
    { value: "newest", label: "ใหม่ล่าสุด" },
    { value: "oldest", label: "เก่าสุด" },
  ];

  const myWorks = useMemo(
    () => works.filter((w) => String(w.student_user_id) === CURRENT_STUDENT_ID),
    [works]
  );

  // ===== แท็บ "ทั้งหมด" — ดูผลงานของทุกคน เห็นเฉพาะที่เป็นสาธารณะ + ผลงานของตัวเอง (ส่วนตัวของคนอื่นมองไม่เห็น) =====
  const browseBase = useMemo(
    () => works.filter((w) => w.visibility === "public" || String(w.student_user_id) === CURRENT_STUDENT_ID),
    [works]
  );

  const browseFiltered = useMemo(() => {
    let list = browseBase;
    if (categoryFilter) list = list.filter((w) => w.category === categoryFilter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((w) => {
        const name = studentMap[w.student_user_id]?.fullname || "";
        return w.title.toLowerCase().includes(needle) || name.toLowerCase().includes(needle);
      });
    }
    return [...list].sort((a, b) => sortBy === "newest"
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at));
  }, [browseBase, categoryFilter, q, sortBy, studentMap]);

  // ===== แท็บ "งานของฉัน" =====
  const mineFiltered = useMemo(() => {
    let list = myWorks.filter((w) => {
      const okCategory = categoryFilter ? w.category === categoryFilter : true;
      const okQ = q.trim() ? w.title.toLowerCase().includes(q.trim().toLowerCase()) : true;
      return okCategory && okQ;
    });
    return [...list].sort((a, b) => sortBy === "newest"
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at));
  }, [myWorks, categoryFilter, q, sortBy]);

  const stats = useMemo(() => ({
    total: myWorks.length,
    public: myWorks.filter((w) => w.visibility === "public").length,
    private: myWorks.filter((w) => w.visibility === "private").length,
    pending: myWorks.filter((w) => w.status === "รอคำแนะนำ").length,
  }), [myWorks]);

  // ===== แท็บ "คำแนะนำจากครู" =====
  const adviceList = useMemo(
    () => [...myWorks].sort((a, b) => new Date(b.reviewed_at || b.created_at) - new Date(a.reviewed_at || a.created_at)),
    [myWorks]
  );
  useEffect(() => {
    if (adviceList.length > 0 && !adviceList.find((w) => w.work_id === selectedAdviceId)) {
      setSelectedAdviceId(adviceList[0].work_id);
    } else if (adviceList.length === 0) {
      setSelectedAdviceId(null);
    }
  }, [adviceList, selectedAdviceId]);
  const selectedAdviceWork = adviceList.find((w) => w.work_id === selectedAdviceId) || null;

  const detailWork = works.find((w) => w.work_id === detailWorkId) || null;
  const detailIsMine = detailWork ? String(detailWork.student_user_id) === CURRENT_STUDENT_ID : false;

  const openAddModal = () => { setEditingWork(null); setModalOpen(true); };
  const openEditModal = (work) => { setEditingWork(work); setModalOpen(true); setDetailWorkId(null); };

  const uploadNewFiles = async (workId, newFiles) => {
    for (const f of newFiles) {
      await uploadPortfolioFile(workId, f.file, f.cover_url);
    }
  };

  const handleConfirm = async (payload) => {
    const { newFiles, ...workFields } = payload;
    if (editingWork) {
      await updatePortfolioWork(editingWork.work_id, workFields);
      await uploadNewFiles(editingWork.work_id, newFiles);
    } else {
      const created = await createPortfolioWork({ ...workFields, student_user_id: CURRENT_STUDENT_ID, grade_idgrade: myGradeId });
      await uploadNewFiles(created.work_id, newFiles);
    }
    setEditingWork(null);
    await loadAll();
  };

  const handleDelete = async (work) => {
    setDetailWorkId(null);
    const result = await Swal.fire({
      title: "ลบผลงานนี้?", text: work.title, icon: "warning",
      showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก", confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    await deletePortfolioWork(work.work_id);
    await loadAll();
  };

  const gridList = mainTab === "browse" ? browseFiltered : mainTab === "mine" ? mineFiltered : [];

  return (
    <div className="min-h-screen w-full bg-white flex text-[15.5px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <h1 className="page-title">แฟ้มสะสมผลงาน</h1>
              <p className="page-subtitle mt-0.5">รวบรวมผลงานของฉัน และดูผลงานของเพื่อน ๆ</p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14.5px] font-semibold flex items-center gap-2 shrink-0"
            >
              <FaPlus size={11} /> เพิ่มผลงาน
            </button>
          </div>

          {/* ===== แท็บหลัก ===== */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {MAIN_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setMainTab(t.key); setCategoryFilter(""); }}
                className={`h-9 px-4 rounded-full text-[14.5px] font-medium transition-colors flex items-center gap-1.5 ${
                  mainTab === t.key ? "bg-pink-500 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t.label}
                {t.key === "advice" && stats.pending > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[13px] font-semibold ${
                      mainTab === t.key ? "bg-white/25 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <PageLoading />
          ) : mainTab === "advice" ? (
            <AdviceTab list={adviceList} selectedId={selectedAdviceId} onSelect={setSelectedAdviceId} selectedWork={selectedAdviceWork} gradeText={selectedAdviceWork ? gradeTextOf(selectedAdviceWork) : ""} reviewerById={reviewerById} />
          ) : (
            <>
              <FilterToolbar
                categoryOptions={categoryOptions} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
                q={q} setQ={setQ} sortOptions={sortOptions} sortBy={sortBy} setSortBy={setSortBy}
                searchPlaceholder={mainTab === "browse" ? "ค้นหาชื่อผลงาน หรือชื่อนักเรียน" : "ค้นหาผลงาน"}
              />

              {mainTab === "mine" && (
                <div className="text-[14px] text-gray-500 mb-4">
                  ผลงานทั้งหมด <span className="font-semibold text-gray-800">{stats.total}</span> · สาธารณะ <span className="font-semibold text-purple-600">{stats.public}</span> · ส่วนตัว <span className="font-semibold text-amber-600">{stats.private}</span> · รอคำแนะนำ <span className="font-semibold text-gray-800">{stats.pending}</span>
                </div>
              )}

              {gridList.length === 0 ? (
                <div className="text-center text-gray-400 py-16 rounded-2xl border border-dashed border-gray-200">
                  {mainTab === "browse" ? "ไม่พบผลงานในตัวกรองนี้" : "ยังไม่มีผลงานในหมวดนี้"}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {gridList.map((w) => (
                    <PortfolioCard
                      key={w.work_id}
                      work={w}
                      student={studentMap[w.student_user_id]}
                      gradeText={gradeTextOf(w)}
                      onClick={() => setDetailWorkId(w.work_id)}
                      showStatus={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {modalOpen && (
        <PortfolioWorkModal
          initialData={editingWork}
          onClose={() => { setModalOpen(false); setEditingWork(null); }}
          onConfirm={handleConfirm}
          onViewWorks={() => { setModalOpen(false); setEditingWork(null); setMainTab("mine"); }}
        />
      )}

      {detailWork && (
        <WorkDetailModal
          work={detailWork}
          isMine={detailIsMine}
          authorName={studentMap[detailWork.student_user_id]?.fullname || "ไม่ทราบชื่อ"}
          gradeText={gradeTextOf(detailWork)}
          reviewerById={reviewerById}
          onClose={() => setDetailWorkId(null)}
          onEdit={() => openEditModal(detailWork)}
          onDelete={() => handleDelete(detailWork)}
        />
      )}
    </div>
  );
}

// ตัวกรอง — หมวดหมู่/ค้นหา/เรียง ใช้ react-select สำหรับช่องแบบเลือก
function FilterToolbar({
  categoryOptions, categoryFilter, setCategoryFilter,
  q, setQ, sortOptions, sortBy, setSortBy, searchPlaceholder,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-4">
      <div className="relative flex-1 min-w-45">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full h-10 rounded-xl border border-gray-200 bg-white pl-10 pr-4 outline-none focus:border-pink-400"
        />
      </div>
      <Select
        className="w-40"
        styles={filterSelectStyles}
        value={sortOptions.find((o) => o.value === sortBy)}
        onChange={(opt) => setSortBy(opt.value)}
        options={sortOptions}
        isSearchable={false}
      />
      <Select
        className="w-48"
        styles={filterSelectStyles}
        value={categoryOptions.find((o) => o.value === categoryFilter)}
        onChange={(opt) => setCategoryFilter(opt.value)}
        options={categoryOptions}
        isSearchable={false}
      />
    </div>
  );
}

// เลื่อนดูไฟล์แนบทีละไฟล์ — รูปโชว์เต็ม, PDF เลื่อนดูได้ในกรอบ, มีปุ่มดาวน์โหลดเสมอ (ใช้ PortfolioFilePreview ตัวเดียวกับฝั่งครู)
function PortfolioFileCarousel({ files, work }) {
  const [index, setIndex] = useState(0);
  const list = files || [];

  if (list.length === 0) {
    if (work?.file_type === "link" && work?.link_url) {
      return (
        <div className="aspect-square w-full bg-gray-50 flex flex-col items-center justify-center gap-3 text-center px-6">
          <FaLink className="text-purple-300" size={26} />
          <a href={work.link_url} target="_blank" rel="noreferrer" className="text-pink-600 text-[14px] underline break-all">
            {work.link_url}
          </a>
        </div>
      );
    }
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center text-gray-300 text-[14px]">
        ยังไม่มีไฟล์แนบ
      </div>
    );
  }

  const prev = (e) => { e.stopPropagation(); setIndex((i) => (i - 1 + list.length) % list.length); };
  const next = (e) => { e.stopPropagation(); setIndex((i) => (i + 1) % list.length); };

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gray-100 group">
      <PortfolioFilePreview file={list[index]} work={work} className="w-full h-full" />
      {list.length > 1 && (
        <>
          <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 backdrop-blur border border-white/80 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <FaChevronLeft className="text-[14px]" />
          </button>
          <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 backdrop-blur border border-white/80 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <FaChevronRight className="text-[14px]" />
          </button>
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {list.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// โมดัลดูรายละเอียดผลงาน — ซ้ายรูป/ไฟล์จริง ขวาข้อมูล+คำแนะนำครูจริง (แสดงเฉพาะผลงานของตัวเอง)
function WorkDetailModal({ work, isMine, authorName, gradeText, reviewerById, onClose, onEdit, onDelete }) {
  const meta = categoryMetaOf(work.category);
  const Icon = meta.icon;
  const visMeta = VISIBILITY_META[work.visibility];
  const VisIcon = VISIBILITY_ICON[work.visibility];
  const statusMeta = STATUS_META[work.status];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {isMine && (
            <div className="relative">
              <button type="button" onClick={() => setShowMenu((s) => !s)} className="h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 bg-white/85 backdrop-blur transition">
                <FaEllipsisV className="text-[15px]" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-11 w-36 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                  <button type="button" onClick={() => { setShowMenu(false); onEdit(); }} className="w-full text-left px-4 py-2.5 text-[14.5px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 bg-transparent">
                    <FaPen className="text-[13px]" /> แก้ไข
                  </button>
                  <button type="button" onClick={() => { setShowMenu(false); onDelete(); }} className="w-full text-left px-4 py-2.5 text-[14.5px] text-red-600 hover:bg-red-50 flex items-center gap-2 bg-transparent">
                    <FaTrash className="text-[13px]" /> ลบ
                  </button>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 bg-white/85 backdrop-blur transition">
            <FaTimes className="text-[16px]" />
          </button>
        </div>

        <div className={`flex-1 divide-y md:divide-y-0 divide-gray-100 overflow-y-auto md:overflow-hidden ${isMine ? "grid md:grid-cols-2 md:divide-x" : "flex flex-col"}`}>
          <div className="md:overflow-y-auto">
            <PortfolioFileCarousel files={work.files} work={work} />
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[13px] font-medium rounded-full px-2.5 py-1" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>
                  <Icon className="text-[13px]" /> {work.category}
                </span>
                {VisIcon && visMeta && (
                  <span className={`inline-flex items-center gap-1 text-[13px] font-medium rounded-full px-2.5 py-1 ${VISIBILITY_BADGE[work.visibility]}`}>
                    <VisIcon className="text-[13px]" /> {visMeta.label}
                  </span>
                )}
                {statusMeta && (
                  <span className={`text-[13px] font-medium rounded-full px-2.5 py-1 ${STATUS_BADGE[statusMeta.color]}`}>{statusMeta.label}</span>
                )}
              </div>
              <h3 className="text-[19.5px] font-semibold text-gray-900">{work.title}</h3>
              {!isMine && <div className="text-[14px] text-gray-500">{authorName}{gradeText ? ` · ${gradeText}` : ""}</div>}
              {work.description && <p className="text-[14.5px] text-gray-600 leading-6 whitespace-pre-line">{work.description}</p>}
              <div className="text-[13.5px] text-gray-400">{formatThaiDateTime(work.created_at)}</div>
              {work.files?.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-[13px] font-medium text-gray-400 uppercase tracking-wide">ไฟล์แนบ ({work.files.length})</div>
                  {work.files.map((f) => (
                    <a
                      key={f.file_id}
                      href={resolveFileUrl(API_BASE, f.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="flex items-center gap-2 rounded-lg bg-gray-50 hover:bg-gray-100 px-3 py-2 text-[14px] text-gray-700 transition"
                    >
                      <FaDownload className="text-gray-400 shrink-0" size={11} />
                      <span className="truncate flex-1">{f.file_name || "ไฟล์แนบ"}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isMine && (
            <div className="p-6 pt-14 flex flex-col">
              <p className="text-[13px] font-medium text-gray-400 uppercase tracking-wide mb-3">คำแนะนำจากครู</p>
              {work.teacher_comment ? (
                <div className="flex items-start gap-3">
                  <Avatar src={reviewerById[String(work.reviewed_by)]?.avatarUrl} name={reviewerById[String(work.reviewed_by)]?.name} size={36} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-semibold text-gray-900">{reviewerById[String(work.reviewed_by)]?.name || "ครู"}</span>
                      {work.reviewed_at && <span className="text-[13px] text-gray-400">{formatThaiDateTime(work.reviewed_at)}</span>}
                    </div>
                    <div className="mt-1 rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-[15px] text-gray-700 leading-relaxed inline-block">
                      {work.teacher_comment}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[14.5px] text-gray-400 py-6">
                  <FaCommentDots className="text-gray-300" /> รอครูตรวจผลงานนี้อยู่ ยังไม่มีคำแนะนำ
                </div>
              )}
              <div className="mt-auto pt-4 border-t border-gray-100 text-[13px] text-gray-400 flex items-center gap-2">
                <FaUserFriends className="text-gray-300 shrink-0" />
                ระบบยังให้คำแนะนำได้ครั้งเดียวต่อผลงาน จึงยังไม่มีช่องตอบกลับเป็นข้อความ
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// การ์ดขนาดเล็กในลิสต์ "คำแนะนำจากครู" ฝั่งซ้าย ใช้ปกจริงจากไฟล์แนบ
function AdviceThumb({ work }) {
  const firstFile = work.files?.[0];
  const cover = firstFile?.cover_url || (firstFile?.file_url ? resolveFileUrl(API_BASE, firstFile.file_url) : null);
  if (cover) return <img src={cover} className="w-full h-full object-cover" />;
  const meta = categoryMetaOf(work.category);
  const Icon = meta.icon;
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}1a` }}>
      <Icon style={{ color: meta.color }} size={16} />
    </div>
  );
}

// แท็บ "คำแนะนำจากครู" — ผลงานของฉันฝั่งซ้าย เลือกดูคำแนะนำ (จริง) ฝั่งขวา
// หมายเหตุ: ระบบเก็บคำแนะนำจากครูได้แค่ 1 ข้อความต่อผลงาน (ไม่ใช่กระทู้สนทนาไปกลับ) จึงยังไม่มีช่องให้พิมพ์ตอบกลับ
function AdviceTab({ list, selectedId, onSelect, selectedWork, gradeText, reviewerById }) {
  if (list.length === 0) {
    return <div className="text-center text-gray-400 py-16 rounded-2xl border border-dashed border-gray-200">ยังไม่มีผลงานที่ส่งให้ครูดู</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-[14px] font-semibold text-gray-500">การสนทนา ({list.length})</div>
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
          {list.map((w) => {
            const statusMeta = STATUS_META[w.status];
            const isSelected = w.work_id === selectedId;
            return (
              <button
                key={w.work_id}
                type="button"
                onClick={() => onSelect(w.work_id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 bg-white"}`}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                  <AdviceThumb work={w} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium text-gray-900 truncate">{w.title}</div>
                  <div className="text-[13.5px] text-gray-400 truncate mt-0.5">
                    {w.teacher_comment ? w.teacher_comment : "รอครูให้คำแนะนำ"}
                  </div>
                </div>
                {statusMeta && (
                  <span className={`text-[13px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[statusMeta.color]}`}>{statusMeta.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-gray-200 p-5">
        {!selectedWork ? (
          <div className="text-center text-gray-400 text-[14.5px] py-16">เลือกผลงานเพื่อดูคำแนะนำ</div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                <AdviceThumb work={selectedWork} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-[15px]">{selectedWork.title}</div>
                <div className="text-[14px] text-gray-400 mt-0.5">{gradeText}</div>
              </div>
            </div>

            {selectedWork.teacher_comment ? (
              <div className="flex items-start gap-3">
                <Avatar src={reviewerById[String(selectedWork.reviewed_by)]?.avatarUrl} name={reviewerById[String(selectedWork.reviewed_by)]?.name} size={36} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-gray-900">{reviewerById[String(selectedWork.reviewed_by)]?.name || "ครู"}</span>
                    {selectedWork.reviewed_at && <span className="text-[13px] text-gray-400">{formatThaiDateTime(selectedWork.reviewed_at)}</span>}
                  </div>
                  <div className="mt-1 rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-[15px] text-gray-700 leading-relaxed inline-block max-w-[520px]">
                    {selectedWork.teacher_comment}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[14.5px] text-gray-400 py-6">
                <FaCommentDots className="text-gray-300" /> รอครูตรวจผลงานนี้อยู่ ยังไม่มีคำแนะนำ
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100 text-[13.5px] text-gray-400 flex items-center gap-2">
              <FaUserFriends className="text-gray-300 shrink-0" />
              ระบบยังให้คำแนะนำได้ครั้งเดียวต่อผลงาน จึงยังไม่มีช่องตอบกลับเป็นข้อความ
            </div>
          </>
        )}
      </div>
    </div>
  );
}

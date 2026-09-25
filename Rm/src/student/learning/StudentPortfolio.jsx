import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import {
  FaPlus, FaSearch, FaGlobeAsia, FaLock, FaEllipsisV,
  FaFilePdf, FaFileAlt, FaVideo, FaLink, FaCertificate, FaFlag, FaHeart, FaStar, FaProjectDiagram, FaBriefcase,
} from "react-icons/fa";
import PortfolioWorkModal from "../../components/PortfolioWorkModal.jsx";
import {
  getPortfolioWorks, getPortfolioWorkFiles, createPortfolioWork, updatePortfolioWork, deletePortfolioWork, uploadPortfolioFile,
  getEnrollments,
} from "../../callapi/callapi_user.jsx";
import { PORTFOLIO_CATEGORIES, VISIBILITY_META, STATUS_META } from "../../utils/portfolioStore.js";
import { formatThaiDateTime, API_BASE } from "../../utils/feedShared.js";
import { resolveFileUrl } from "../../utils/media.js";

// ⚠️ ยังไม่มีระบบ login จริง ใช้ user_id placeholder เดียวกับหน้านักเรียนอื่น (StudentNews.jsx, yc1.jsx) รอทำ auth จริงค่อยเปลี่ยน
const CURRENT_STUDENT_ID = "1";

const VISIBILITY_ICON = { public: FaGlobeAsia, private: FaLock };
const VISIBILITY_BADGE = {
  public: "bg-purple-50 text-purple-700",
  private: "bg-amber-50 text-amber-700",
};
const CATEGORY_ICON = {
  "พอร์ตฟอลิโอ": FaBriefcase, "เกียรติบัตร": FaCertificate, "กิจกรรม": FaFlag, "จิตอาสา": FaHeart, "ผลงาน": FaStar, "โครงงาน": FaProjectDiagram,
};
const CATEGORY_COLOR = {
  "พอร์ตฟอลิโอ": "text-purple-500", "เกียรติบัตร": "text-amber-500", "กิจกรรม": "text-blue-500", "จิตอาสา": "text-red-500",
  "ผลงาน": "text-yellow-500", "โครงงาน": "text-indigo-500",
};
const STATUS_BADGE = {
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
};

const TABS = [
  { key: "all", label: "ผลงานทั้งหมด" },
  { key: "public", label: "เผยแพร่ (สาธารณะ)" },
  { key: "private", label: "ส่วนตัว" },
];

export default function StudentPortfolioPage() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [activeCategory, setActiveCategory] = useState("");
  const [q, setQ] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [gradeId, setGradeId] = useState(null);

  const loadWorks = async () => {
    try {
      const list = await getPortfolioWorks({ student_user_id: CURRENT_STUDENT_ID });
      const withFiles = await Promise.all(
        list.map(async (w) => {
          try {
            const files = await getPortfolioWorkFiles(w.work_id);
            return { ...w, files };
          } catch {
            return { ...w, files: [] };
          }
        })
      );
      setWorks(withFiles);
    } catch (err) {
      console.error("โหลดผลงานไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorks();
    getEnrollments()
      .then((rows) => {
        const mine = rows.find((e) => String(e.user_user_id) === CURRENT_STUDENT_ID);
        if (mine) setGradeId(mine.grade_idgrade);
      })
      .catch((err) => console.error("โหลดห้องเรียนไม่สำเร็จ:", err));
  }, []);

  const filtered = useMemo(() => {
    return works.filter((w) => {
      const okTab = activeTab === "all" ? true : w.visibility === activeTab;
      const okCategory = activeCategory ? w.category === activeCategory : true;
      const okQ = q.trim() ? w.title.toLowerCase().includes(q.trim().toLowerCase()) : true;
      return okTab && okCategory && okQ;
    });
  }, [works, activeTab, activeCategory, q]);

  const stats = useMemo(() => ({
    total: works.length,
    public: works.filter((w) => w.visibility === "public").length,
    private: works.filter((w) => w.visibility === "private").length,
    pending: works.filter((w) => w.status === "รอคำแนะนำ").length,
  }), [works]);

  const categoryCounts = useMemo(() => {
    const map = {};
    PORTFOLIO_CATEGORIES.forEach((c) => { map[c] = works.filter((w) => w.category === c).length; });
    return map;
  }, [works]);

  const openAddModal = () => { setEditingWork(null); setModalOpen(true); };
  const openEditModal = (work) => { setEditingWork(work); setModalOpen(true); setOpenMenuId(null); };

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
      const created = await createPortfolioWork({ ...workFields, student_user_id: CURRENT_STUDENT_ID, grade_idgrade: gradeId });
      await uploadNewFiles(created.work_id, newFiles);
    }
    setModalOpen(false);
    setEditingWork(null);
    await loadWorks();
  };

  const handleDelete = async (work) => {
    setOpenMenuId(null);
    const result = await Swal.fire({
      title: "ลบผลงานนี้?", text: work.title, icon: "warning",
      showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก", confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    await deletePortfolioWork(work.work_id);
    await loadWorks();
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <SidebarNav role="student" />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10">
          <h1 className="text-[20px] font-semibold text-gray-900">แฟ้มสะสมผลงาน</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">รวมผลงาน เกียรติบัตร และกิจกรรมทั้งหมดของฉัน</p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* ===== Main ===== */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`h-9 px-4 rounded-full border text-[13px] font-medium transition-colors ${
                      activeTab === t.key ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={openAddModal}
                  className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[14px] font-semibold flex items-center gap-2 shrink-0"
                >
                  <FaPlus size={12} /> เพิ่มผลงาน
                </button>

                <div className="relative flex-1 max-w-[360px]">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหาผลงาน"
                    className="w-full h-11 rounded-full border border-gray-200 bg-white pl-10 pr-4 outline-none focus:border-pink-300"
                  />
                </div>

                {activeCategory && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("")}
                    className="h-9 px-3 rounded-full border border-pink-200 bg-pink-50 text-pink-700 text-[12.5px] flex items-center gap-1.5"
                  >
                    {activeCategory} ✕
                  </button>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {loading ? (
                  <div className="text-center text-gray-500 py-10">กำลังโหลดผลงาน…</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center text-gray-400 py-14 rounded-2xl border border-dashed border-gray-200">
                    ยังไม่มีผลงานในหมวดนี้
                  </div>
                ) : (
                  filtered.map((w) => (
                    <WorkCard
                      key={w.work_id}
                      work={w}
                      menuOpen={openMenuId === w.work_id}
                      onToggleMenu={() => setOpenMenuId(openMenuId === w.work_id ? null : w.work_id)}
                      onEdit={() => openEditModal(w)}
                      onDelete={() => handleDelete(w)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ===== Sidebar ===== */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-[13.5px] font-semibold text-gray-800 mb-3">สถิติผลงานของฉัน</div>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="ผลงานทั้งหมด" value={stats.total} color="text-gray-900" />
                  <StatBox label="สาธารณะ" value={stats.public} color="text-purple-600" />
                  <StatBox label="ส่วนตัว" value={stats.private} color="text-amber-600" />
                  <StatBox label="รอคำแนะนำ" value={stats.pending} color="text-gray-600" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-[13.5px] font-semibold text-gray-800 mb-3">หมวดหมู่ผลงาน</div>
                <div className="flex flex-col gap-1">
                  {PORTFOLIO_CATEGORIES.map((c) => {
                    const Icon = CATEGORY_ICON[c] || FaStar;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveCategory(activeCategory === c ? "" : c)}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] ${
                          activeCategory === c ? "bg-pink-50 text-pink-700" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className={CATEGORY_COLOR[c] || "text-gray-400"} size={13} /> {c}
                        </span>
                        <span className="text-gray-400">{categoryCounts[c] || 0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {modalOpen && (
        <PortfolioWorkModal
          initialData={editingWork}
          onClose={() => { setModalOpen(false); setEditingWork(null); }}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <div className={`text-[20px] font-bold ${color}`}>{value}</div>
      <div className="text-[11.5px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function WorkCover({ work }) {
  const firstFile = work.files?.[0];
  const cover = firstFile?.cover_url || (firstFile?.file_url ? resolveFileUrl(API_BASE, firstFile.file_url) : null);
  if (work.file_type === "link") {
    return (
      <div className="w-full sm:w-40 h-28 sm:h-auto shrink-0 rounded-xl bg-purple-50 flex items-center justify-center">
        <FaLink className="text-purple-400" size={26} />
      </div>
    );
  }
  if (cover) {
    return <img src={cover} className="w-full sm:w-40 h-28 sm:h-auto shrink-0 rounded-xl object-cover border border-gray-100" />;
  }
  const Icon = work.file_type === "video" ? FaVideo : firstFile?.file_type === "application/pdf" ? FaFilePdf : FaFileAlt;
  return (
    <div className="w-full sm:w-40 h-28 sm:h-auto shrink-0 rounded-xl bg-gray-50 flex items-center justify-center">
      <Icon className="text-gray-300" size={26} />
    </div>
  );
}

function WorkCard({ work, menuOpen, onToggleMenu, onEdit, onDelete }) {
  const VisIcon = VISIBILITY_ICON[work.visibility];
  const visMeta = VISIBILITY_META[work.visibility];
  const statusMeta = STATUS_META[work.status];
  const fileCount = work.files?.length || 0;
  const fileLine = work.file_type === "link"
    ? "ลิงก์"
    : work.file_type === "image"
      ? `รูปภาพ${fileCount > 1 ? ` · ${fileCount} ไฟล์` : ""}`
      : work.file_type === "video"
        ? "วิดีโอ"
        : work.files?.[0]?.file_name || "ไฟล์";

  return (
    <div className="rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4">
        <WorkCover work={work} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-gray-900 truncate">{work.title}</div>

            <div className="relative shrink-0">
              <button type="button" onClick={onToggleMenu} className="text-gray-400 hover:text-gray-700 bg-transparent p-1">
                <FaEllipsisV size={13} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-10 w-36 rounded-xl border border-gray-200 bg-white shadow-lg py-1.5 flex flex-col">
                  <button type="button" onClick={onEdit} className="px-4 py-2 text-[13px] text-left text-gray-700 hover:bg-gray-50 bg-transparent">แก้ไข</button>
                  <button type="button" onClick={onDelete} className="px-4 py-2 text-[13px] text-left text-red-600 hover:bg-red-50 bg-transparent">ลบ</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {VisIcon && visMeta && (
              <span className={`h-6 px-2.5 rounded-full text-[11.5px] font-medium flex items-center gap-1 ${VISIBILITY_BADGE[work.visibility]}`}>
                <VisIcon size={10} /> {visMeta.label}
              </span>
            )}
            {statusMeta && (
              <span className={`h-6 px-2.5 rounded-full text-[11.5px] font-medium flex items-center ${STATUS_BADGE[statusMeta.color]}`}>
                {statusMeta.label}
              </span>
            )}
          </div>

          <div className="text-[12.5px] text-gray-500 mt-2">{fileLine}</div>
          <div className="text-[11.5px] text-gray-400 mt-1">อัปโหลด {formatThaiDateTime(work.created_at)}</div>

          {work.teacher_comment && (
            <div className="mt-2 rounded-lg bg-pink-50 px-3 py-2 text-[12.5px] text-pink-800">
              💬 {work.teacher_comment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

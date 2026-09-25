import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import PageLoading from "../components/PageLoading.jsx";
import {
  FaSearch, FaGlobeAsia,
  FaClipboardList, FaCommentDots, FaCheckCircle,
  FaChevronLeft, FaChevronRight, FaDownload,
  FaRegCalendarAlt, FaFolderOpen, FaFileAlt,
} from "react-icons/fa";
import { PORTFOLIO_CATEGORIES, portfolioFileIcon } from "../utils/portfolioStore.js";
import {
  getClasses, getStudent, getEnrollments,
  getPortfolioWorks, getPortfolioWorkFiles, reviewPortfolioWork,
} from "../callapi/callapi_user.jsx";
import { formatThaiDateTime, notAvailableYet, API_BASE, CURRENT_USER_ID } from "../utils/feedShared.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";
import { resolveFileUrl } from "../utils/media.js";
import PortfolioCard from "../components/PortfolioCard.jsx";
import PortfolioFilePreview from "../components/PortfolioFilePreview.jsx";

const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

export default function PortfolioTeacherPage() {
  const [classes, setClasses] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [gradeOfStudent, setGradeOfStudent] = useState({});
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [gradeFilter, setGradeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewTab, setViewTab] = useState("all");

  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [fileIndex, setFileIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      console.error("โหลดข้อมูลแฟ้มสะสมผลงานไม่สำเร็จ:", err);
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

  // ตัวเลือกของ react-select แต่ละตัวกรอง — มี "ทั้งหมด" (value ว่าง) นำหน้าเสมอเหมือน <select> เดิม
  const gradeOptions = useMemo(
    () => [{ value: "", label: "ห้องเรียน: ทั้งหมด" }, ...classes.map((c) => ({ value: String(c.idgrade), label: gradeLabel(c) }))],
    [classes]
  );
  const categoryOptions = useMemo(
    () => [{ value: "", label: "หมวดหมู่: ทั้งหมด" }, ...PORTFOLIO_CATEGORIES.map((c) => ({ value: c, label: c }))],
    []
  );
  const sortOptions = [
    { value: "newest", label: "เรียงล่าสุด" },
    { value: "oldest", label: "เรียงเก่าสุด" },
  ];

  // ตัวกรองด้านบน (ห้อง/หมวดหมู่/ค้นหา) — ใช้ทั้งกับการ์ดสถิติและแท็บสถานะด้านล่าง เพื่อให้ตัวเลขในแท็บอัปเดตตามตัวกรองเสมอ ไม่ขึ้นกับแท็บที่เลือกอยู่
  const baseFiltered = useMemo(() => {
    let list = works;
    if (gradeFilter) list = list.filter((w) => (w.grade_idgrade ? String(w.grade_idgrade) === String(gradeFilter) : gradeOfStudent[w.student_user_id] === String(gradeFilter)));
    if (categoryFilter) list = list.filter((w) => w.category === categoryFilter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((w) => {
        const name = studentMap[w.student_user_id]?.fullname || "";
        return w.title.toLowerCase().includes(needle) || name.toLowerCase().includes(needle);
      });
    }
    return list;
  }, [works, gradeFilter, categoryFilter, q, studentMap, gradeOfStudent]);

  const counts = useMemo(() => ({
    total: baseFiltered.length,
    pending: baseFiltered.filter((w) => w.status === "รอคำแนะนำ").length,
    reviewed: baseFiltered.filter((w) => w.status === "ให้คำแนะนำแล้ว").length,
    public: baseFiltered.filter((w) => w.visibility === "public").length,
  }), [baseFiltered]);

  const TABS = [
    { key: "all", label: "ทั้งหมด", count: counts.total },
    { key: "pending", label: "ขอคำปรึกษา", count: counts.pending },
    { key: "public", label: "สาธารณะ", count: counts.public },
    { key: "reviewed", label: "ให้คำแนะนำแล้ว", count: counts.reviewed },
  ];

  const scopedWorks = useMemo(() => {
    let list = baseFiltered;
    if (viewTab === "pending") list = list.filter((w) => w.status === "รอคำแนะนำ");
    if (viewTab === "public") list = list.filter((w) => w.visibility === "public");
    if (viewTab === "reviewed") list = list.filter((w) => w.status === "ให้คำแนะนำแล้ว");
    return [...list].sort((a, b) => sortBy === "newest"
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at));
  }, [baseFiltered, viewTab, sortBy]);

  useEffect(() => {
    if (scopedWorks.length > 0 && !scopedWorks.find((w) => w.work_id === selectedWorkId)) {
      setSelectedWorkId(scopedWorks[0].work_id);
    } else if (scopedWorks.length === 0) {
      setSelectedWorkId(null);
    }
  }, [scopedWorks, selectedWorkId]);

  const selectedWork = scopedWorks.find((w) => w.work_id === selectedWorkId) || null;

  useEffect(() => {
    setComment(selectedWork?.teacher_comment || "");
    setFileIndex(0);
  }, [selectedWork]);

  const saveReview = async () => {
    if (!selectedWork) return;
    setSaving(true);
    try {
      await reviewPortfolioWork(selectedWork.work_id, { status: "ให้คำแนะนำแล้ว", teacher_comment: comment.trim(), reviewed_by: CURRENT_USER_ID });
      await loadAll();
      Swal.fire({ icon: "success", title: "บันทึกคำแนะนำแล้ว", timer: 1000, showConfirmButton: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[15.5px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <h1 className="page-title">แฟ้มสะสมผลงานนักเรียน</h1>
              <p className="page-subtitle mt-0.5">ติดตามผลงานและให้คำแนะนำแก่นักเรียน</p>
            </div>
            <button
              type="button"
              onClick={() => notAvailableYet("ดาวน์โหลดรายงาน")}
              className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-[14.5px] font-medium flex items-center gap-2 hover:bg-gray-50"
            >
              <FaDownload size={13} /> ดาวน์โหลดรายงาน
            </button>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <StatCard icon={FaClipboardList} cardClass="bg-pink-50" iconClass="bg-pink-100 text-pink-600" label="ผลงานทั้งหมด" value={counts.total} sub="รายการ" />
            <StatCard icon={FaCommentDots} cardClass="bg-amber-50" iconClass="bg-amber-100 text-amber-600" label="ขอคำปรึกษา" value={counts.pending} sub="รายการ" valueClassName="text-amber-600" />
            <StatCard icon={FaCheckCircle} cardClass="bg-emerald-50" iconClass="bg-emerald-100 text-emerald-600" label="ให้คำแนะนำแล้ว" value={counts.reviewed} sub="รายการ" valueClassName="text-emerald-600" />
            <StatCard icon={FaGlobeAsia} cardClass="bg-purple-50" iconClass="bg-purple-100 text-purple-600" label="สาธารณะ" value={counts.public} sub="รายการ" valueClassName="text-purple-600" />
          </div>

          {/* ===== ตัวกรอง — ยาวเต็มความกว้าง ===== */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div className="relative flex-1 min-w-52">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาชื่อนักเรียน / ชื่อผลงาน"
                className="w-full h-11 rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-[15px] outline-none focus:border-pink-400"
              />
            </div>
            <Select
              className="w-52"
              styles={bigFilterSelectStyles}
              value={gradeOptions.find((o) => o.value === gradeFilter)}
              onChange={(opt) => setGradeFilter(opt.value)}
              options={gradeOptions}
              isSearchable={false}
            />
            <Select
              className="w-48"
              styles={bigFilterSelectStyles}
              value={categoryOptions.find((o) => o.value === categoryFilter)}
              onChange={(opt) => setCategoryFilter(opt.value)}
              options={categoryOptions}
              isSearchable={false}
            />
            <Select
              className="w-40"
              styles={bigFilterSelectStyles}
              value={sortOptions.find((o) => o.value === sortBy)}
              onChange={(opt) => setSortBy(opt.value)}
              options={sortOptions}
              isSearchable={false}
            />
          </div>

          {/* ===== แท็บสถานะ ===== */}
          <div className="flex flex-wrap gap-2 mb-5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setViewTab(t.key)}
                className={`h-9 px-4 rounded-full border text-[14.5px] font-medium transition-colors ${
                  viewTab === t.key ? "bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t.label} {t.count}
              </button>
            ))}
          </div>

          {loading ? (
            <PageLoading />
          ) : scopedWorks.length === 0 ? (
            <div className="text-center text-gray-400 py-16 rounded-2xl border border-dashed border-gray-200">ไม่พบผลงานในตัวกรองนี้</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
              {/* ===== ซ้าย: การ์ดผลงานทั้งหมด — เส้นคั่นแทนกรอบครอบ ===== */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start xl:border-r xl:border-gray-200 xl:pr-5">
                {scopedWorks.map((w) => (
                  <PortfolioCard
                    key={w.work_id}
                    work={w}
                    student={studentMap[w.student_user_id]}
                    gradeText={gradeTextOf(w)}
                    selected={w.work_id === selectedWorkId}
                    onClick={() => setSelectedWorkId(w.work_id)}
                  />
                ))}
              </div>

              {/* ===== ขวา: รายละเอียด + คำแนะนำ ===== */}
              <div className="min-w-0 xl:sticky xl:top-24 flex flex-col">
                {!selectedWork ? (
                  <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-[14.5px] py-16">เลือกผลงานเพื่อดูรายละเอียดและให้คำแนะนำ</div>
                ) : (
                  <WorkDetailPanel
                    work={selectedWork}
                    student={studentMap[selectedWork.student_user_id]}
                    gradeText={gradeTextOf(selectedWork)}
                    fileIndex={fileIndex}
                    onFileIndexChange={setFileIndex}
                    comment={comment}
                    onCommentChange={setComment}
                    saving={saving}
                    onSave={saveReview}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, cardClass, iconClass, label, value, sub, valueClassName = "text-gray-900" }) {
  const Icon = icon;
  return (
    <div className={`rounded-2xl p-4 ${cardClass}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon size={16} />
        </div>
        <div className={`text-[26px] font-bold leading-none ${valueClassName}`}>{value}</div>
      </div>
      <div className="text-[14px] text-gray-600 mt-2.5">{label}</div>
      <div className="text-[12.5px] text-gray-500">{sub}</div>
    </div>
  );
}

function WorkDetailPanel({ work, student, gradeText, fileIndex, onFileIndexChange, comment, onCommentChange, saving, onSave }) {
  const files = work.files || [];
  const activeFile = files[fileIndex] || files[0] || null;
  const isReviewed = work.status === "ให้คำแนะนำแล้ว";
  const [isEditing, setIsEditing] = useState(false);

  // สลับกลับไปโหมด "ส่งคำแนะนำแล้ว" ทุกครั้งที่เปลี่ยนไปดูผลงานชิ้นอื่น กันโหมดแก้ไขค้างข้ามผลงาน
  useEffect(() => {
    setIsEditing(false);
  }, [work.work_id]);

  const showEditor = !isReviewed || isEditing;

  const handleSave = async () => {
    await onSave();
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <div className="font-bold text-gray-900 text-[19.5px]">{work.title}</div>
        <div className="text-[14px] text-gray-500 mt-0.5">{student?.fullname || "-"}{gradeText ? ` · ${gradeText}` : ""}</div>
      </div>

      {files.length > 0 ? (
        <>
          {files.length > 1 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-gray-500">ไฟล์แนบ {fileIndex + 1} / {files.length}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={fileIndex === 0} onClick={() => onFileIndexChange(fileIndex - 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:bg-gray-50">
                  <FaChevronLeft size={11} />
                </button>
                <button type="button" disabled={fileIndex === files.length - 1} onClick={() => onFileIndexChange(fileIndex + 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:bg-gray-50">
                  <FaChevronRight size={11} />
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 mb-3">
            {files.length > 1 && (
              <div className="flex flex-col gap-1.5 w-12 shrink-0 max-h-[220px] overflow-y-auto">
                {files.map((f, i) => {
                  const isImage = (f.file_type || "").startsWith("image/");
                  const ThumbIcon = portfolioFileIcon(f, work);
                  return (
                    <button
                      key={f.file_id}
                      type="button"
                      onClick={() => onFileIndexChange(i)}
                      className={`aspect-square rounded-lg border overflow-hidden flex items-center justify-center shrink-0 ${i === fileIndex ? "border-pink-400 ring-1 ring-pink-200" : "border-gray-200"}`}
                    >
                      {isImage ? (
                        <img src={f.cover_url || resolveFileUrl(API_BASE, f.file_url)} className="w-full h-full object-cover" />
                      ) : (
                        <ThumbIcon className="text-gray-300" size={15} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <PortfolioFilePreview file={activeFile} work={work} className="flex-1 min-w-0 rounded-xl border border-gray-100 aspect-[4/3]" />
          </div>
        </>
      ) : work.file_type === "link" && work.link_url ? (
        <a href={work.link_url} target="_blank" rel="noreferrer" className="text-pink-600 text-[14px] underline break-all block mb-3">{work.link_url}</a>
      ) : (
        <div className="text-[14px] text-gray-400 mb-3 rounded-xl border border-dashed border-gray-200 py-6 text-center">ยังไม่มีไฟล์แนบ</div>
      )}

      {/* รายละเอียด — เส้นคั่นแทนกรอบ แถวข้อมูลเรียบๆ ไม่มีกล่องครอบ */}
      <div className="mt-1 pt-3 border-t border-gray-100">
        <div className="text-[15px] font-semibold text-gray-800 mb-1.5">รายละเอียด</div>
        <p className="text-[14.5px] text-gray-600 leading-relaxed">{work.description || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2.5 text-[14px]">
        <div className="flex items-center gap-2.5">
          <FaRegCalendarAlt className="text-gray-400 shrink-0" size={14} />
          <span className="text-gray-500 w-22 shrink-0">วันที่อัปโหลด</span>
          <span className="text-gray-800">{formatThaiDateTime(work.created_at)}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <FaFolderOpen className="text-gray-400 shrink-0" size={14} />
          <span className="text-gray-500 w-22 shrink-0">หมวดหมู่</span>
          <span className="text-gray-800">{work.category}</span>
        </div>
        {activeFile && (
          <div className="flex items-center gap-2.5">
            <FaFileAlt className="text-gray-400 shrink-0" size={14} />
            <span className="text-gray-500 w-22 shrink-0">ไฟล์</span>
            <a
              href={resolveFileUrl(API_BASE, activeFile.file_url)}
              target="_blank"
              rel="noreferrer"
              className="text-pink-600 hover:underline flex items-center gap-1.5 min-w-0"
            >
              <span className="truncate">{activeFile.file_name}</span>
              <FaDownload size={12} className="shrink-0" />
            </a>
          </div>
        )}
      </div>

      <label className="block text-[14.5px] font-medium text-gray-700 mt-4 mb-1.5">คำแนะนำจากครู</label>

      {showEditor ? (
        <>
          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={4}
            placeholder="เขียนคำแนะนำถึงนักเรียน..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] leading-relaxed outline-none focus:border-pink-400 resize-none mb-3"
          />
          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => { onCommentChange(work.teacher_comment || ""); setIsEditing(false); }}
                className="h-10 px-3.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[14px] font-medium"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex-1 h-10 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14px] font-semibold disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : isEditing ? "บันทึกการแก้ไข" : "บันทึกคำแนะนำ"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 mb-3">
            <div className="flex items-center gap-1.5 text-[14px] font-medium text-emerald-700 mb-1.5">
              <FaCheckCircle size={13} /> ส่งคำแนะนำแล้ว{work.reviewed_at ? ` · ${formatThaiDateTime(work.reviewed_at)}` : ""}
            </div>
            <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line">{work.teacher_comment}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="h-10 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-[14px] font-medium"
          >
            แก้ไขคำแนะนำ
          </button>
        </div>
      )}
    </div>
  );
}

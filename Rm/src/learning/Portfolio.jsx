import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  FaSearch, FaGlobeAsia, FaLock,
  FaFilePdf, FaFileAlt, FaVideo, FaLink, FaDownload,
} from "react-icons/fa";
import { PORTFOLIO_CATEGORIES, VISIBILITY_META, STATUS_META } from "../utils/portfolioStore.js";
import {
  getClasses, getStudent, getEnrollments,
  getPortfolioWorks, getPortfolioWorkFiles, reviewPortfolioWork,
} from "../callapi/callapi_user.jsx";
import { formatThaiDateTime, formatRelativeTime, notAvailableYet, API_BASE, CURRENT_USER_ID } from "../utils/feedShared.js";
import { resolveFileUrl } from "../utils/media.js";

const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;
const initialOf = (fullname = "") => (fullname || "?").replace(/^(นางสาว|เด็กหญิง|เด็กชาย|นาย|นาง)\s*/u, "").charAt(0);

const VISIBILITY_ICON = { public: FaGlobeAsia, private: FaLock };
const VISIBILITY_BADGE = {
  public: "bg-purple-50 text-purple-700",
  private: "bg-amber-50 text-amber-700",
};
const CATEGORY_BADGE = {
  "พอร์ตฟอลิโอ": "bg-purple-50 text-purple-700", "เกียรติบัตร": "bg-amber-50 text-amber-700", "กิจกรรม": "bg-blue-50 text-blue-700", "จิตอาสา": "bg-red-50 text-red-700",
  "ผลงาน": "bg-yellow-50 text-yellow-700", "โครงงาน": "bg-indigo-50 text-indigo-700",
};
// สี stroke ของโดนัทชาร์ต — ใช้ hex ของ Tailwind X-500 ตัวเดียวกับ CATEGORY_BADGE ด้านบน (SVG ใช้ className ไม่ได้)
const CATEGORY_HEX = {
  "พอร์ตฟอลิโอ": "#a855f7", "เกียรติบัตร": "#f59e0b", "กิจกรรม": "#3b82f6", "จิตอาสา": "#ef4444",
  "ผลงาน": "#eab308", "โครงงาน": "#6366f1",
};
const FALLBACK_CATEGORY_HEX = "#9ca3af";
const STATUS_BADGE = {
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
};

const TABS = [
  { key: "รอคำแนะนำ", label: "รอคำแนะนำ", type: "status" },
  { key: "ให้คำแนะนำแล้ว", label: "ให้คำแนะนำแล้ว", type: "status" },
  { key: "ต้องแก้ไข", label: "ต้องแก้ไข", type: "status" },
  { key: "public", label: "สาธารณะ", type: "visibility" },
  { key: "all", label: "ทั้งหมด", type: "all" },
];

export default function PortfolioTeacherPage() {
  const [classes, setClasses] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [gradeOfStudent, setGradeOfStudent] = useState({});
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedGrade, setSelectedGrade] = useState("all");
  const [activeTab, setActiveTab] = useState("รอคำแนะนำ");
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [reviewingWork, setReviewingWork] = useState(null);

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

  const gradeScoped = useMemo(() => {
    if (selectedGrade === "all") return works;
    return works.filter((w) => (w.grade_idgrade ? String(w.grade_idgrade) === String(selectedGrade) : gradeOfStudent[w.student_user_id] === String(selectedGrade)));
  }, [works, selectedGrade, gradeOfStudent]);

  const counts = useMemo(() => ({
    "รอคำแนะนำ": gradeScoped.filter((w) => w.status === "รอคำแนะนำ").length,
    "ให้คำแนะนำแล้ว": gradeScoped.filter((w) => w.status === "ให้คำแนะนำแล้ว").length,
    "ต้องแก้ไข": gradeScoped.filter((w) => w.status === "ต้องแก้ไข").length,
    public: gradeScoped.filter((w) => w.visibility === "public").length,
    all: gradeScoped.length,
  }), [gradeScoped]);

  const studentsInGrade = useMemo(() => {
    if (selectedGrade === "all") return Object.keys(gradeOfStudent).length;
    return Object.values(gradeOfStudent).filter((g) => g === String(selectedGrade)).length;
  }, [gradeOfStudent, selectedGrade]);

  const filtered = useMemo(() => {
    const activeTabDef = TABS.find((t) => t.key === activeTab);
    let list = gradeScoped.filter((w) => {
      if (activeTabDef.type === "status") return w.status === activeTabDef.key;
      if (activeTabDef.type === "visibility") return w.visibility === activeTabDef.key;
      return true;
    });
    if (categoryFilter) list = list.filter((w) => w.category === categoryFilter);
    if (visibilityFilter) list = list.filter((w) => w.visibility === visibilityFilter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((w) => {
        const name = studentMap[w.student_user_id]?.fullname || "";
        return w.title.toLowerCase().includes(needle) || name.toLowerCase().includes(needle);
      });
    }
    list = [...list].sort((a, b) => sortBy === "newest"
      ? new Date(b.created_at) - new Date(a.created_at)
      : new Date(a.created_at) - new Date(b.created_at));
    return list;
  }, [gradeScoped, activeTab, categoryFilter, visibilityFilter, q, studentMap, sortBy]);

  const recentActivity = useMemo(() => (
    [...gradeScoped].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  ), [gradeScoped]);

  const handleReviewSaved = async () => {
    setReviewingWork(null);
    await loadAll();
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[20px] font-semibold text-gray-900">แฟ้มสะสมผลงานนักเรียน</h1>
              <p className="text-[13px] text-gray-500 mt-0.5">ติดตามและให้คำแนะนำผลงานของนักเรียน</p>
            </div>
            <button
              type="button"
              onClick={() => notAvailableYet("ดาวน์โหลดรายงาน")}
              className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-[13px] font-medium flex items-center gap-2 hover:bg-gray-50"
            >
              <FaDownload size={12} /> ดาวน์โหลดรายงาน
            </button>
          </div>

          <div className="mt-5 w-[240px]">
            <label className="block text-[12.5px] text-gray-500 mb-1">เลือกห้องเรียน</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-pink-300"
            >
              <option value="all">ทุกห้องที่สอน</option>
              {classes.map((c) => (
                <option key={c.idgrade} value={c.idgrade}>{gradeLabel(c)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 mt-4">
            <StatCard
              label={selectedGrade === "all" ? "นักเรียนทั้งหมด" : "นักเรียนในห้องนี้"}
              value={studentsInGrade}
              sub="คน"
            />
            <StatCard
              label="รอคำแนะนำจากครู"
              value={counts["รอคำแนะนำ"]}
              sub="ต้องตรวจสอบ"
              valueClassName="text-amber-600"
            />
            <StatCard
              label="ให้คำแนะนำแล้ว"
              value={counts["ให้คำแนะนำแล้ว"]}
              sub="เสร็จสิ้น"
              valueClassName="text-emerald-600"
            />
            <StatCard
              label="ต้องแก้ไข"
              value={counts["ต้องแก้ไข"]}
              sub="ส่งกลับให้แก้"
              valueClassName="text-red-600"
            />
            <StatCard
              label="สาธารณะ"
              value={counts.public}
              sub="ผลงานเด่น"
              valueClassName="text-purple-600"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
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
                    {t.label} ({counts[t.key]})
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหาชื่อนักเรียน / ชื่อผลงาน"
                    className="w-full h-10 rounded-full border border-gray-200 bg-white pl-10 pr-4 outline-none focus:border-pink-300"
                  />
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-[13px] outline-none">
                  <option value="">หมวดหมู่: ทั้งหมด</option>
                  {PORTFOLIO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-[13px] outline-none">
                  <option value="">การมองเห็น: ทั้งหมด</option>
                  {Object.values(VISIBILITY_META).map((v) => <option key={v.value} value={v.value}>{v.fullLabel}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-[13px] outline-none">
                  <option value="newest">ล่าสุด</option>
                  <option value="oldest">เก่าสุด</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto">
                {loading ? (
                  <div className="text-center text-gray-500 py-10">กำลังโหลด…</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center text-gray-400 py-14 rounded-2xl border border-dashed border-gray-200">ไม่มีผลงานในตัวกรองนี้</div>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-gray-400 text-[12px] border-b border-gray-100">
                        <th className="py-2 font-medium">นักเรียน / ผลงาน</th>
                        <th className="py-2 font-medium">หมวดหมู่</th>
                        <th className="py-2 font-medium">การมองเห็น</th>
                        <th className="py-2 font-medium">วันที่อัปโหลด</th>
                        <th className="py-2 font-medium">สถานะ</th>
                        <th className="py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((w) => {
                        const student = studentMap[w.student_user_id];
                        const statusMeta = STATUS_META[w.status];
                        const VisIcon = VISIBILITY_ICON[w.visibility];
                        const visMeta = VISIBILITY_META[w.visibility];
                        const FileIcon = w.file_type === "link" ? FaLink : w.file_type === "video" ? FaVideo : w.files?.[0]?.file_type === "application/pdf" ? FaFilePdf : FaFileAlt;
                        return (
                          <tr key={w.work_id} className="border-b border-gray-50 align-top">
                            <td className="py-3 pr-3">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[12px] font-semibold shrink-0">
                                  {initialOf(student?.fullname)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-gray-900 font-medium truncate">{student?.fullname || "ไม่ทราบชื่อ"}</div>
                                  <div className="text-gray-500 truncate">{w.title}</div>
                                  <div className="text-[11.5px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    <FileIcon size={10} /> {w.file_type === "link" ? "ลิงก์" : (w.files?.[0]?.file_name || "-")}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <span className={`h-6 px-2.5 rounded-full text-[11.5px] font-medium ${CATEGORY_BADGE[w.category] || "bg-gray-100 text-gray-600"}`}>{w.category}</span>
                            </td>
                            <td className="py-3 pr-3">
                              {VisIcon && visMeta && (
                                <span className={`h-6 px-2.5 rounded-full text-[11.5px] font-medium inline-flex items-center gap-1 ${VISIBILITY_BADGE[w.visibility]}`}>
                                  <VisIcon size={10} /> {visMeta.label}
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{formatThaiDateTime(w.created_at)}</td>
                            <td className="py-3 pr-3">
                              {statusMeta && (
                                <span className={`h-6 px-2.5 rounded-full text-[11.5px] font-medium ${STATUS_BADGE[statusMeta.color]}`}>{statusMeta.label}</span>
                              )}
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => setReviewingWork(w)}
                                className="h-8 px-3 rounded-lg bg-pink-50 text-pink-700 text-[12px] font-medium hover:bg-pink-100 whitespace-nowrap"
                              >
                                ให้คำแนะนำ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ===== Sidebar ===== */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-[13.5px] font-semibold text-gray-800 mb-3">สถิติผลงานแยกตามหมวดหมู่</div>
                <CategoryDonutChart works={gradeScoped} />
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-[13.5px] font-semibold text-gray-800 mb-3">กิจกรรมล่าสุด</div>
                {recentActivity.length === 0 ? (
                  <div className="text-[12.5px] text-gray-400">ยังไม่มีความเคลื่อนไหว</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recentActivity.map((w) => (
                      <div key={w.work_id} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initialOf(studentMap[w.student_user_id]?.fullname)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] text-gray-700 truncate">
                            <span className="font-medium">{studentMap[w.student_user_id]?.fullname || "ไม่ทราบชื่อ"}</span> ส่งผลงานใหม่
                          </div>
                          <div className="text-[11px] text-gray-400">{formatRelativeTime(w.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {reviewingWork && (
        <ReviewModal
          work={reviewingWork}
          studentName={studentMap[reviewingWork.student_user_id]?.fullname}
          onClose={() => setReviewingWork(null)}
          onSaved={handleReviewSaved}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, valueClassName = "text-gray-900" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col justify-between">
      <div className="text-[13px] text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${valueClassName}`}>{value}</div>
      <div className="text-[12px] text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

// โดนัทชาร์ตล้วนๆ ด้วย SVG stroke-dasharray ไม่พึ่ง library ภายนอก (โปรเจกต์นี้ยังไม่มี chart library ติดตั้งไว้)
// category เป็น varchar อิสระฝั่ง backend เลยไล่จากค่าจริงที่มีในข้อมูล ไม่ยึดตาม PORTFOLIO_CATEGORIES ตายตัว
function CategoryDonutChart({ works }) {
  const total = works.length;
  const counted = {};
  works.forEach((w) => { counted[w.category || "ไม่ระบุหมวดหมู่"] = (counted[w.category || "ไม่ระบุหมวดหมู่"] || 0) + 1; });
  const segments = Object.entries(counted).map(([label, count]) => ({ label, count, color: CATEGORY_HEX[label] || FALLBACK_CATEGORY_HEX }));

  if (total === 0) {
    return <div className="text-[12.5px] text-gray-400 py-6 text-center">ยังไม่มีข้อมูลผลงาน</div>;
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offsetSoFar = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width="104" height="104" viewBox="0 0 104 104" className="shrink-0 -rotate-90">
        {segments.map((s) => {
          const fraction = s.count / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={s.label}
              cx="52" cy="52" r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offsetSoFar}
            />
          );
          offsetSoFar += dash;
          return circle;
        })}
      </svg>

      <div className="flex flex-col gap-1.5 min-w-0">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12.5px] text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="text-gray-400 shrink-0">{s.count} ({Math.round((s.count / total) * 1000) / 10}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewModal({ work, studentName, onClose, onSaved }) {
  const [comment, setComment] = useState(work.teacher_comment || "");
  const [saving, setSaving] = useState(false);
  const firstFile = work.files?.[0];
  const cover = firstFile?.cover_url || (firstFile?.file_url ? resolveFileUrl(API_BASE, firstFile.file_url) : null);

  const save = async (status) => {
    if (status === "ต้องแก้ไข" && !comment.trim()) {
      Swal.fire("ใส่คำแนะนำก่อนนะคะ", "บอกนักเรียนหน่อยว่าต้องแก้ไขตรงไหน", "warning");
      return;
    }
    setSaving(true);
    try {
      await reviewPortfolioWork(work.work_id, { status, teacher_comment: comment.trim(), reviewed_by: CURRENT_USER_ID });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[17px] font-bold text-gray-900">ให้คำแนะนำ</h2>
          <p className="text-[12.5px] text-gray-500 mt-0.5">{studentName} · {work.category}</p>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {cover && <img src={cover} className="w-full max-h-[220px] object-cover rounded-xl border border-gray-100 mb-4" />}
          {work.file_type === "link" && (
            <a href={work.link_url} target="_blank" rel="noreferrer" className="text-pink-600 text-[13px] underline break-all block mb-4">{work.link_url}</a>
          )}

          <div className="font-semibold text-gray-900 mb-1">{work.title}</div>
          {work.description && <p className="text-[13px] text-gray-600 leading-relaxed mb-4">{work.description}</p>}

          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">คำแนะนำจากครู</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="เขียนคำแนะนำถึงนักเรียน..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-pink-400 resize-none"
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-2.5">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[13.5px]">ปิด</button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("ต้องแก้ไข")}
            className="h-11 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[13.5px] font-medium disabled:opacity-50"
          >
            ต้องแก้ไข
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("ให้คำแนะนำแล้ว")}
            className="flex-1 h-11 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13.5px] font-semibold disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "ให้คำแนะนำแล้ว"}
          </button>
        </div>
      </div>
    </div>
  );
}


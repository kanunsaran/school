import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FaPlus, FaRegFileAlt, FaRegClipboard, FaQuestionCircle, FaRegClock, FaCheckCircle, FaFolder, FaChevronDown,
  FaSearch, FaHourglassHalf, FaEdit, FaTrash,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import PageLoading from "../components/PageLoading.jsx";
import {
  getAssignmentsByChapter, getChapters,
  getSubmissionsByAssignment, getNotSubmitStudents, getAssignmentClasses,
  getAssignmentById, getAssignmentFiles, deleteAssignment,
  getContents, getContentFiles, deleteContent,
} from "../callapi/callapi_user";
import { API_BASE } from "../utils/feedShared.js";
import { resolveFileUrl } from "../utils/media.js";
import { POST_TYPE_META } from "../utils/postTypeStyles.js";

const formatShortDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

const TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "work", label: "งาน" },
  { key: "content", label: "เนื้อหา" },
  { key: "pending", label: "รอตรวจ" },
  { key: "reviewed", label: "ตรวจแล้ว" },
];

export default function ClassworkPage({ embedded = false, gradeId } = {}) {
  const [assignments, setAssignments] = useState([]);
  const [contents, setContents] = useState([]);
  const [assignmentStats, setAssignmentStats] = useState({}); // { [ass_id]: { total, reviewed, pending, notSubmitted } }
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (key) => setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // ===== accordion ต่อรายการงาน/เนื้อหา (คลิกแล้วขยายดูรายละเอียด+ไฟล์แนบ แทนที่จะเด้งไปหน้าตรวจทันที) =====
  const [expandedAssId, setExpandedAssId] = useState(null);
  const [detailsByAssId, setDetailsByAssId] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const toggleExpand = async (assId) => {
    if (expandedAssId === assId) {
      setExpandedAssId(null);
      return;
    }
    setExpandedAssId(assId);
    if (detailsByAssId[assId]) return;
    setLoadingDetailId(assId);
    try {
      const [full, files] = await Promise.all([
        getAssignmentById(assId),
        getAssignmentFiles(assId).catch(() => []),
      ]);
      setDetailsByAssId((prev) => ({ ...prev, [assId]: { description: full?.description, files: files || [] } }));
    } catch (err) {
      console.error("โหลดรายละเอียดงานไม่สำเร็จ:", err);
    } finally {
      setLoadingDetailId(null);
    }
  };

  // เนื้อหาใช้ key คนละ namespace กับงาน (`c-${id}`) กัน content_id ชนกับ ass_id (คนละตาราง auto-increment คนละชุด)
  const toggleExpandContent = async (contentId, bodyFallback) => {
    const key = `c-${contentId}`;
    if (expandedAssId === key) {
      setExpandedAssId(null);
      return;
    }
    setExpandedAssId(key);
    if (detailsByAssId[key]) return;
    setLoadingDetailId(key);
    try {
      const files = await getContentFiles(contentId).catch(() => []);
      setDetailsByAssId((prev) => ({ ...prev, [key]: { description: bodyFallback, files: files || [] } }));
    } catch (err) {
      console.error("โหลดรายละเอียดเนื้อหาไม่สำเร็จ:", err);
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleDeleteAssignment = async (assId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ลบงานนี้?",
      text: "ลบแล้วจะไม่สามารถกู้คืนได้",
      showCancelButton: true,
      confirmButtonText: "ลบงาน",
      cancelButtonText: "ไม่ลบ",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    setDeletingId(assId);
    try {
      await deleteAssignment(assId);
      setAssignments((prev) => prev.filter((a) => a.ass_id !== assId));
      setExpandedAssId(null);
      Swal.fire({ icon: "success", title: "ลบงานแล้ว", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("ลบงานไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "ลบงานไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteContent = async (contentId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ลบเนื้อหานี้?",
      text: "ลบแล้วจะไม่สามารถกู้คืนได้",
      showCancelButton: true,
      confirmButtonText: "ลบเนื้อหา",
      cancelButtonText: "ไม่ลบ",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    const key = `c-${contentId}`;
    setDeletingId(key);
    try {
      await deleteContent(contentId);
      setContents((prev) => prev.filter((c) => c.content_id !== contentId));
      setExpandedAssId(null);
      Swal.fire({ icon: "success", title: "ลบเนื้อหาแล้ว", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("ลบเนื้อหาไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "ลบเนื้อหาไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setDeletingId(null);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    let flatAssignments = [];
    try {
      const chaptersRes = (await getChapters()) || [];

      const chapterTitleById = new Map(chaptersRes.map((c) => [String(c.chapter_id), c.title]));

      let contentsRaw = [];
      try {
        contentsRaw = (await getContents()) || [];
      } catch (err) {
        console.error("โหลดเนื้อหาไม่สำเร็จ:", err);
      }
      setContents(contentsRaw.map((c) => ({ ...c, chapterTitle: chapterTitleById.get(String(c.chapter_chapter_id)) })));

      const perChapterAssignments = await Promise.all(
        chaptersRes.map(async (c) => {
          try {
            const list = (await getAssignmentsByChapter(c.chapter_id)) || [];
            return list.map((a) => ({ ...a, chapterTitle: c.title }));
          } catch (err) {
            console.error("โหลดงานของบทนี้ไม่สำเร็จ:", err);
            return [];
          }
        })
      );
      flatAssignments = perChapterAssignments.flat();

      // ฝัง (embedded) เป็นแท็บในหน้าห้องเรียน — กรองเหลือเฉพาะงานที่ผูกกับห้องนี้ผ่าน /assignment_classes
      if (embedded && gradeId) {
        try {
          const links = (await getAssignmentClasses({ grade_id: gradeId })) || [];
          const assIdsInRoom = new Set(links.map((l) => String(l.ass_id)));
          flatAssignments = flatAssignments.filter((a) => assIdsInRoom.has(String(a.ass_id)));
        } catch (err) {
          console.error("โหลดข้อมูลการผูกห้องของงานไม่สำเร็จ:", err);
        }
      }

      setAssignments(flatAssignments);
    } catch (err) {
      console.error("โหลดบทเรียนไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }

    setStatsLoading(true);
    try {
      const allSubs = (await getSubmissionsByAssignment(flatAssignments[0]?.ass_id).catch((err) => { console.error("โหลดงานที่ส่งไม่สำเร็จ:", err); return []; })) || [];

      const statsEntries = await Promise.all(
        flatAssignments.map(async (a) => {
          const mySubs = allSubs.filter((s) => String(s.assignment_ass_id) === String(a.ass_id));
          let notSub = [];
          try {
            notSub = (await getNotSubmitStudents(a.ass_id)) || [];
          } catch (err) {
            console.error("โหลดรายชื่อยังไม่ส่งไม่สำเร็จ:", err);
          }
          const reviewed = mySubs.filter((s) => s.score != null).length;
          const pending = mySubs.filter((s) => s.score == null).length;
          return [a.ass_id, { total: mySubs.length + notSub.length, submitted: mySubs.length, reviewed, pending, notSubmitted: notSub.length }];
        })
      );
      setAssignmentStats(Object.fromEntries(statsEntries));
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [gradeId]);

  // ประเภทโพสต์ (งาน/คำถาม) + มีคะแนนไหม — มาจากคอลัมน์ post_type/has_score ของ assignment โดยตรงแล้ว (ไม่ใช่ localStorage อีกต่อไป)
  // คำถามที่ "ไม่มีคะแนน" ไม่มีแนวคิด รอตรวจ/ตรวจแล้ว เลยต้องกันออกจากสถิติ 2 การ์ดนี้
  const postTypeByAssId = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const postType = a.post_type || "assignment";
      map[a.ass_id] = { postType, hasScore: postType === "question" ? !!a.has_score : true };
    });
    return map;
  }, [assignments]);
  const countsTowardGrading = (a) => (postTypeByAssId[a.ass_id]?.hasScore ?? true);

  // เนื้อหากรองตามห้องนี้ด้วย class_ids จริงจาก backend (GET /content คืน class_ids ต่อแถวมาแล้ว)
  // เนื้อหาที่ไม่ผูกห้องไหนเลย (class_ids ว่าง) ถือว่ามองเห็นได้ทุกห้อง ตาม convention เดียวกับ assignment_classes
  const visibleContents = useMemo(() => {
    if (!(embedded && gradeId)) return contents;
    return contents.filter((c) => {
      const classIds = c.class_ids;
      if (!classIds || classIds.length === 0) return true;
      return classIds.map(String).includes(String(gradeId));
    });
  }, [contents, embedded, gradeId]);

  const totals = useMemo(() => {
    const gradedAssignments = assignments.filter(countsTowardGrading);
    const statsList = gradedAssignments.map((a) => assignmentStats[a.ass_id]).filter(Boolean);
    return {
      content: visibleContents.length,
      assignments: assignments.length,
      pending: statsList.reduce((sum, s) => sum + s.pending, 0),
      reviewed: statsList.reduce((sum, s) => sum + s.reviewed, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleContents, assignments, assignmentStats, postTypeByAssId]);

  const isPendingItem = (a) => countsTowardGrading(a) && (assignmentStats[a.ass_id]?.pending || 0) > 0;
  const isReviewedItem = (a) => {
    if (!countsTowardGrading(a)) return false;
    const s = assignmentStats[a.ass_id];
    return s && s.total > 0 && s.reviewed === s.total;
  };

  const counts = useMemo(() => ({
    all: assignments.length + visibleContents.length,
    work: assignments.length,
    content: visibleContents.length,
    pending: assignments.filter(isPendingItem).length,
    reviewed: assignments.filter(isReviewedItem).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [assignments, visibleContents, assignmentStats, postTypeByAssId]);

  // รวมงาน/คำถาม + เนื้อหา เป็นลิสต์เดียวกัน (ติด _kind ไว้แยกว่าเรนเดอร์การ์ดแบบไหน) ตามแท็บที่เลือก
  const filteredItems = useMemo(() => {
    const workItems = assignments.map((a) => ({ ...a, _kind: "work" }));
    const contentItems = visibleContents.map((c) => ({ ...c, _kind: "content", title: c.title }));

    let list;
    if (activeTab === "work") list = workItems;
    else if (activeTab === "content") list = contentItems;
    else if (activeTab === "pending") list = workItems.filter(isPendingItem);
    else if (activeTab === "reviewed") list = workItems.filter(isReviewedItem);
    else list = [...workItems, ...contentItems];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => (a.title || "").toLowerCase().includes(q));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, visibleContents, activeTab, search, assignmentStats, postTypeByAssId]);

  const groupedItems = useMemo(() => {
    const map = new Map();
    filteredItems.forEach((item) => {
      const key = item.chapterTitle || "ไม่มีหมวดหมู่";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries());
  }, [filteredItems]);

  const content = (
    <>
      <div className={`flex items-start gap-4 flex-wrap ${embedded ? "justify-end" : "justify-between"}`}>
        {!embedded && (
          <div>
            <h1 className="page-title">งานในชั้นเรียน</h1>
            <p className="page-subtitle mt-1">ภาพรวมเอกสารและงานทั้งหมด พร้อมความคืบหน้าการตรวจ</p>
          </div>
        )}
        <AddMenu gradeId={embedded ? gradeId : null} />
      </div>

      {!loading && (
        totals.pending > 0 ? (
          <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-pink-100/60 border border-pink-100 p-5 flex items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-white text-pink-500 flex items-center justify-center shrink-0 shadow-sm">
                <FaHourglassHalf size={19} />
              </span>
              <div>
                <div className="text-[14.5px] font-semibold text-gray-900">มีงานรอตรวจ {totals.pending} คน</div>
                <div className="text-[12.5px] text-gray-500 mt-0.5">ตรวจให้นักเรียนได้ทันเวลานะคะ</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-100 p-5 flex items-center gap-3.5 mt-6">
            <span className="w-12 h-12 rounded-2xl bg-white text-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <FaCheckCircle size={19} />
            </span>
            <div>
              <div className="text-[14.5px] font-semibold text-gray-900">ตรวจงานครบทุกชิ้นแล้ว</div>
              <div className="text-[12.5px] text-gray-500 mt-0.5">เยี่ยมมาก! ไม่มีงานค้างตรวจ</div>
            </div>
          </div>
        )
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard icon={FaRegFileAlt} cardCls="bg-blue-50" iconCls="bg-blue-100 text-blue-600" label="เนื้อหา" value={totals.content} sub="รายการ" />
        <StatCard icon={FaRegClipboard} cardCls="bg-pink-50" iconCls="bg-pink-100 text-pink-600" label="งานทั้งหมด" value={totals.assignments} sub="ชิ้น" valueClassName="text-pink-600" />
        <StatCard icon={FaRegClock} cardCls="bg-amber-50" iconCls="bg-amber-100 text-amber-600" label="รอตรวจ" value={totals.pending} sub="คน" valueClassName="text-amber-600" />
        <StatCard icon={FaCheckCircle} cardCls="bg-emerald-50" iconCls="bg-emerald-100 text-emerald-600" label="ตรวจแล้ว" value={totals.reviewed} sub="คน" valueClassName="text-emerald-600" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`h-9 px-4 rounded-full border text-[15px] font-medium transition-colors ${
                activeTab === t.key ? "bg-pink-500 border-pink-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่องาน/เนื้อหา..."
            className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[13.5px] outline-none focus:border-pink-400"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {loading ? (
          <PageLoading />
        ) : groupedItems.length === 0 ? (
          <EmptyState text="ไม่มีรายการในตัวกรองนี้" />
        ) : (
          groupedItems.map(([groupTitle, items]) => {
            const collapsed = collapsedGroups[groupTitle];
            return (
              <div key={groupTitle} className="rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupTitle)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-pink-50/70 hover:bg-pink-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FaFolder className="text-pink-400" size={14} />
                    <span className="text-[15.5px] font-semibold text-gray-800">{groupTitle}</span>
                    <span className="text-[14px] text-pink-500 font-semibold">{items.length}</span>
                  </div>
                  <FaChevronDown className={`text-gray-400 text-[13px] transition-transform ${collapsed ? "" : "rotate-180"}`} />
                </button>
                {!collapsed && (
                  <div className="p-4 flex flex-col gap-3 bg-white">
                    {items.map((item) =>
                      item._kind === "content" ? (
                        <ContentProgressCard
                          key={`c-${item.content_id}`}
                          item={item}
                          expanded={expandedAssId === `c-${item.content_id}`}
                          onToggle={() => toggleExpandContent(item.content_id, item.body)}
                          detail={detailsByAssId[`c-${item.content_id}`]}
                          detailLoading={loadingDetailId === `c-${item.content_id}`}
                          onDelete={() => handleDeleteContent(item.content_id)}
                          deleting={deletingId === `c-${item.content_id}`}
                        />
                      ) : (
                        <AssignmentProgressCard
                          key={item.ass_id}
                          assignment={item}
                          stats={assignmentStats[item.ass_id]}
                          statsLoading={statsLoading}
                          expanded={expandedAssId === item.ass_id}
                          onToggle={() => toggleExpand(item.ass_id)}
                          detail={detailsByAssId[item.ass_id]}
                          detailLoading={loadingDetailId === item.ass_id}
                          gradeId={gradeId}
                          onDelete={() => handleDeleteAssignment(item.ass_id)}
                          deleting={deletingId === item.ass_id}
                          postType={postTypeByAssId[item.ass_id]?.postType || "assignment"}
                          hasScore={postTypeByAssId[item.ass_id]?.hasScore ?? true}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <Header />
      <SidebarNav />
      <main className="flex-1 min-w-0 w-full px-8 md:px-10 pt-24 pb-10">
        {content}
      </main>
    </div>
  );
}

/* ===== Components ===== */

function AddMenu({ gradeId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-11 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-[16px] flex items-center gap-2"
      >
        <FaPlus size={12} /> เพิ่ม
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden z-20 py-1.5">
          <Link
            to={gradeId ? `/workcreate?gradeId=${gradeId}` : "/workcreate"}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
          >
            <span className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              <FaRegClipboard size={14} />
            </span>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-[15.5px]">งาน</div>
              <div className="text-[13.5px] text-gray-400">มอบหมายงานพร้อมกำหนดคะแนนเต็ม</div>
            </div>
          </Link>

          <Link
            to={gradeId ? `/QuestionCreate?gradeId=${gradeId}` : "/QuestionCreate"}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
          >
            <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FaQuestionCircle size={14} />
            </span>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-[15.5px]">คำถาม</div>
              <div className="text-[13.5px] text-gray-400">ให้นักเรียนตอบ มีคะแนนหรือไม่มีก็ได้</div>
            </div>
          </Link>

          <Link
            to={gradeId ? `/ContentCreate?gradeId=${gradeId}` : "/ContentCreate"}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FaRegFileAlt size={14} />
            </span>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-[15.5px]">เนื้อหา</div>
              <div className="text-[13.5px] text-gray-400">เอกสารหรือสื่อประกอบการสอน</div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, cardCls, iconCls, label, value, sub, valueClassName = "text-gray-900" }) {
  const Icon = icon;
  return (
    <div className={`rounded-2xl p-4 flex items-start gap-3 ${cardCls}`}>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <div className="text-[14px] text-gray-600 truncate">{label}</div>
        <div className={`text-[22px] font-bold ${valueClassName}`}>{value}</div>
        <div className="text-[13px] text-gray-500 truncate">{sub}</div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center text-gray-400 py-20 rounded-2xl border border-dashed border-gray-200">{text}</div>
  );
}

function ContentProgressCard({ item, expanded, onToggle, detail, detailLoading, onDelete, deleting }) {
  const { icon: TypeIcon, iconBoxCls } = POST_TYPE_META.content;
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBoxCls}`}>
          <TypeIcon size={13} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-gray-900 truncate">{item.title}</div>
        </div>

        <FaChevronDown className={`text-gray-400 text-[12px] shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-4">
          <div className="text-[12px] text-gray-400 mb-2">โพสต์เมื่อ {formatShortDate(item.created_at)}</div>

          {detailLoading ? (
            <PageLoading />
          ) : (
            <>
              {detail?.description ? (
                <div className="text-[15.5px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: detail.description }} />
              ) : (
                <div className="text-[15.5px] text-gray-400">ไม่มีรายละเอียดเพิ่มเติม</div>
              )}

              {detail?.files?.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="text-[12.5px] text-gray-500">ไฟล์แนบ</div>
                  {detail.files.map((f, i) => (
                    <a
                      key={f.file_id ?? i}
                      href={resolveFileUrl(API_BASE, f.file_path || f.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[13.5px] text-blue-600 hover:underline"
                    >
                      <FaRegFileAlt size={12} className="shrink-0" /> {f.file_name}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link to={`/ContentDetail/${item.content_id}`} className="text-pink-600 hover:underline text-[13.5px] font-medium">
              ดูเพิ่มเติม
            </Link>
            <Link
              to={`/ContentCreate/${item.content_id}`}
              className="text-gray-600 hover:text-gray-900 hover:underline text-[13.5px] font-medium inline-flex items-center gap-1.5"
            >
              <FaEdit size={12} /> แก้ไข
            </Link>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-red-600 hover:underline text-[13.5px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50 bg-transparent"
            >
              <FaTrash size={11} /> {deleting ? "กำลังลบ..." : "ลบ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentProgressCard({
  assignment, stats, statsLoading,
  expanded, onToggle, detail, detailLoading, gradeId, onDelete, deleting,
  postType = "assignment", hasScore = true,
}) {
  const isQuestion = postType === "question";
  const isGraded = !isQuestion || hasScore; // งาน = เกรดเสมอ, คำถามไม่มีคะแนน = ไม่มีแนวคิดตรวจ
  const isScheduled = !!(assignment.scheduled_at && new Date(assignment.scheduled_at) > new Date());
  const total = stats?.total ?? 0;
  const submitted = stats?.submitted ?? 0;
  const reviewed = stats?.reviewed ?? 0;
  const pending = stats?.pending ?? 0;
  const isFullyReviewed = total > 0 && reviewed === total;

  const detailHref = isQuestion ? `/QuestionDetail/${assignment.ass_id}` : `/work/${assignment.ass_id}`;
  const editHref = isQuestion
    ? `/QuestionCreate/${assignment.ass_id}${gradeId ? `?gradeId=${gradeId}` : ""}`
    : `/WorkCreate/${assignment.ass_id}${gradeId ? `?gradeId=${gradeId}` : ""}`;
  const { icon: TypeIcon, iconBoxCls } = POST_TYPE_META[isQuestion ? "question" : "assignment"];

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBoxCls}`}>
          <TypeIcon size={13} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-gray-900 truncate">{assignment.title}</div>
        </div>

        <div className="text-[13px] text-gray-500 shrink-0 whitespace-nowrap hidden sm:block">
          {assignment.deadline ? `กำหนดส่ง ${formatShortDate(assignment.deadline)}` : "ไม่มีกำหนดส่ง"}
        </div>

        {statsLoading ? (
          <span className="h-6 w-16 rounded-full bg-gray-100 animate-pulse shrink-0" />
        ) : (
          <span
            className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-full shrink-0 ${
              isScheduled || !isGraded
                ? "bg-gray-100 text-gray-500"
                : isFullyReviewed && total > 0
                ? "bg-emerald-50 text-emerald-700"
                : pending > 0
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {submitted}/{total} คน
          </span>
        )}

        <FaChevronDown className={`text-gray-400 text-[12px] shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-4">
          <div className="text-[12px] text-gray-400 mb-2">โพสต์เมื่อ {formatShortDate(assignment.create_at)}</div>

          {detailLoading ? (
            <PageLoading />
          ) : (
            <>
              {detail?.description ? (
                <div className="text-[15.5px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: detail.description }} />
              ) : (
                <div className="text-[15.5px] text-gray-400">ไม่มีรายละเอียดเพิ่มเติม</div>
              )}

              {detail?.files?.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="text-[12.5px] text-gray-500">ไฟล์แนบ</div>
                  {detail.files.map((f, i) => (
                    <a
                      key={f.file_id ?? i}
                      href={resolveFileUrl(API_BASE, f.file_path || f.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[13.5px] text-blue-600 hover:underline"
                    >
                      <FaRegFileAlt size={12} className="shrink-0" /> {f.file_name}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link to={detailHref} className="text-pink-600 hover:underline text-[13.5px] font-medium">
              ดูเพิ่มเติม
            </Link>
            <Link
              to={editHref}
              className="text-gray-600 hover:text-gray-900 hover:underline text-[13.5px] font-medium inline-flex items-center gap-1.5"
            >
              <FaEdit size={12} /> แก้ไข
            </Link>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-red-600 hover:underline text-[13.5px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50 bg-transparent"
            >
              <FaTrash size={11} /> {deleting ? "กำลังลบ..." : "ลบ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

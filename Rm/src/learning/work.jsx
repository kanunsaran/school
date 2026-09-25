import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { FaPlus, FaRegFileAlt, FaRegClipboard } from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  getAssignmentsByChapter, getChapters, getFilesByChapter, createChapterFile,
  getSubmissionsByAssignment, getNotSubmitStudents, getAssignmentClasses,
} from "../callapi/callapi_user";
import { notAvailableYet, API_BASE } from "../utils/feedShared.js";
import { resolveFileUrl } from "../utils/media.js";

const PINK = "#db2777";

const formatShortDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

const TABS = [
  { key: "all", label: "งานทั้งหมด" },
  { key: "docs", label: "เอกสาร" },
  { key: "pending", label: "รอตรวจ" },
  { key: "reviewed", label: "ตรวจแล้ว" },
];

export default function ClassworkPage({ embedded = false, gradeId } = {}) {
  const [chapters, setChapters] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentStats, setAssignmentStats] = useState({}); // { [ass_id]: { total, reviewed, pending, notSubmitted } }
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const loadAll = async () => {
    setLoading(true);
    let flatAssignments = [];
    try {
      const chaptersRes = (await getChapters()) || [];
      setChapters(chaptersRes);

      let filesRaw = [];
      try {
        filesRaw = (await getFilesByChapter()) || [];
      } catch (err) {
        console.error("โหลดเอกสารไม่สำเร็จ:", err);
      }
      setAllFiles(filesRaw);

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
          return [a.ass_id, { total: mySubs.length + notSub.length, reviewed, pending, notSubmitted: notSub.length }];
        })
      );
      setAssignmentStats(Object.fromEntries(statsEntries));
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [gradeId]);

  const totals = useMemo(() => {
    const statsList = Object.values(assignmentStats);
    return {
      docs: allFiles.length,
      assignments: assignments.length,
      pending: statsList.reduce((sum, s) => sum + s.pending, 0),
      reviewed: statsList.reduce((sum, s) => sum + s.reviewed, 0),
    };
  }, [allFiles, assignments, assignmentStats]);

  const counts = useMemo(() => ({
    all: assignments.length,
    docs: allFiles.length,
    pending: assignments.filter((a) => (assignmentStats[a.ass_id]?.pending || 0) > 0).length,
    reviewed: assignments.filter((a) => {
      const s = assignmentStats[a.ass_id];
      return s && s.total > 0 && s.reviewed === s.total;
    }).length,
  }), [assignments, allFiles, assignmentStats]);

  const filteredAssignments = useMemo(() => {
    if (activeTab === "pending") return assignments.filter((a) => (assignmentStats[a.ass_id]?.pending || 0) > 0);
    if (activeTab === "reviewed") return assignments.filter((a) => {
      const s = assignmentStats[a.ass_id];
      return s && s.total > 0 && s.reviewed === s.total;
    });
    return assignments;
  }, [assignments, assignmentStats, activeTab]);

  const content = (
    <>
      <div className={`flex items-start gap-4 flex-wrap ${embedded ? "justify-end" : "justify-between"}`}>
        {!embedded && (
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">งานในชั้นเรียน</h1>
            <p className="text-[13px] text-gray-500 mt-1">ภาพรวมเอกสารและงานทั้งหมด พร้อมความคืบหน้าการตรวจ</p>
          </div>
        )}
        <AddMenu chapters={chapters} onContentAdded={loadAll} gradeId={embedded ? gradeId : null} />
      </div>

      {embedded && (
        <div className="mt-2 rounded-xl bg-amber-50 text-amber-700 text-[12.5px] px-4 py-2.5">
          จำนวน "เอกสาร" ด้านล่างยังนับรวมทั้งโรงเรียน เพราะเนื้อหา/บทเรียนยังไม่ผูกกับห้องเรียน ส่วนรายการ "งาน" กรองเฉพาะห้องนี้แล้ว
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 max-w-[640px]">
        <StatCard label="เอกสาร" value={totals.docs} sub="ไฟล์" />
        <StatCard label="งานทั้งหมด" value={totals.assignments} sub="ชิ้น" valueClassName="text-pink-600" />
        <StatCard label="รอตรวจ" value={totals.pending} sub="คน" valueClassName="text-amber-600" />
        <StatCard label="ตรวจแล้ว" value={totals.reviewed} sub="คน" valueClassName="text-emerald-600" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
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

      <div className="mt-5 flex flex-col gap-3">
        {loading ? (
          <div className="text-center text-gray-500 py-16">กำลังโหลด…</div>
        ) : activeTab === "docs" ? (
          allFiles.length === 0 ? (
            <EmptyState text="ยังไม่มีเอกสาร" />
          ) : (
            allFiles.map((f) => <DocRow key={f.file_id} file={f} chapters={chapters} />)
          )
        ) : filteredAssignments.length === 0 ? (
          <EmptyState text="ไม่มีงานในตัวกรองนี้" />
        ) : (
          filteredAssignments.map((a) => (
            <AssignmentProgressCard key={a.ass_id} assignment={a} stats={assignmentStats[a.ass_id]} statsLoading={statsLoading} />
          ))
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />
      <main className="flex-1 min-w-0 w-full px-8 md:px-10 pt-24 pb-10">
        {content}
      </main>
    </div>
  );
}

/* ===== Components ===== */

function AddMenu({ chapters, onContentAdded, gradeId }) {
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

  const handleAddContent = async () => {
    if (chapters.length === 0) {
      Swal.fire({ icon: "info", title: "ยังไม่มีหัวข้อ", text: "สร้างหัวข้อ (บทเรียน) อย่างน้อย 1 หัวข้อก่อน เช่น ตอนสร้างงานให้กด \"+ เพิ่มหัวข้อใหม่\"" });
      return;
    }

    const chapterOptions = chapters.map((c) => `<option value="${c.chapter_id}">${c.title}</option>`).join("");
    const { value: formValues } = await Swal.fire({
      title: "เพิ่มเนื้อหา",
      html: `
        <select id="swal-content-chapter" class="swal2-select" style="display:block;width:100%;margin-bottom:.75rem;">${chapterOptions}</select>
        <input id="swal-content-title" class="swal2-input" placeholder="ชื่อเอกสาร">
        <input id="swal-content-url" class="swal2-input" placeholder="ลิงก์เอกสาร เช่น Google Drive">
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">* ตอนนี้ยังแนบไฟล์จากเครื่องไม่ได้ ใช้ลิงก์ไปก่อนนะคะ</div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "เพิ่มเนื้อหา",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: PINK,
      preConfirm: () => {
        const chapter_chapter_id = document.getElementById("swal-content-chapter").value;
        const filename = document.getElementById("swal-content-title").value.trim();
        const filepath = document.getElementById("swal-content-url").value.trim();
        if (!filename || !filepath) {
          Swal.showValidationMessage("กรอกชื่อเอกสารและลิงก์ให้ครบ");
          return false;
        }
        return { chapter_chapter_id, filename, filepath };
      },
    });

    if (!formValues) return;

    try {
      await createChapterFile(formValues);
      await onContentAdded();
      Swal.fire({ icon: "success", title: "เพิ่มเนื้อหาแล้ว", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("เพิ่มเนื้อหาไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "เพิ่มเนื้อหาไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-11 px-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-[14px] flex items-center gap-2"
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
              <div className="font-medium text-gray-900 text-[13.5px]">งาน</div>
              <div className="text-[11.5px] text-gray-400">มอบหมายงานพร้อมกำหนดคะแนนเต็ม</div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => { setOpen(false); notAvailableYet("สร้างคำถาม"); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left bg-transparent"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
              ?
            </span>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-[13.5px]">คำถาม</div>
              <div className="text-[11.5px] text-gray-400">แบบทดสอบสั้นๆ ให้คะแนนอัตโนมัติ</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setOpen(false); handleAddContent(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left bg-transparent"
          >
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FaRegFileAlt size={14} />
            </span>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-[13.5px]">เนื้อหา</div>
              <div className="text-[11.5px] text-gray-400">เอกสารหรือสื่อประกอบการสอน</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, valueClassName = "text-gray-900" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-[12.5px] text-gray-500">{label}</div>
      <div className={`text-[26px] font-bold mt-1 ${valueClassName}`}>{value}</div>
      <div className="text-[11.5px] text-gray-400">{sub}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center text-gray-400 py-20 rounded-2xl border border-dashed border-gray-200">{text}</div>
  );
}

function DocRow({ file, chapters }) {
  const chapterTitle = chapters.find((c) => String(c.chapter_id) === String(file.chapter_chapter_id))?.title;
  return (
    <a
      href={resolveFileUrl(API_BASE, file.filepath)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-gray-200 px-5 py-3.5 hover:bg-gray-50 transition-colors"
    >
      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <FaRegFileAlt size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-gray-900 truncate">{file.filename}</div>
        {chapterTitle && <div className="text-[11.5px] text-gray-400 truncate">{chapterTitle}</div>}
      </div>
    </a>
  );
}

function AssignmentProgressCard({ assignment, stats, statsLoading }) {
  const isScheduled = !!(assignment.scheduled_at && new Date(assignment.scheduled_at) > new Date());
  const total = stats?.total ?? 0;
  const reviewed = stats?.reviewed ?? 0;
  const pending = stats?.pending ?? 0;
  const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  const isFullyReviewed = total > 0 && reviewed === total;

  return (
    <Link
      to={`/work/${assignment.ass_id}`}
      className="flex items-start gap-3 rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
    >
      <span className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
        <FaRegClipboard size={16} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{assignment.title}</div>
            <div className="text-[12px] text-gray-400 truncate">{assignment.chapterTitle}</div>
          </div>
          <div className="text-[12px] text-gray-500 shrink-0 whitespace-nowrap">
            {assignment.deadline ? `กำหนดส่ง ${formatShortDate(assignment.deadline)}` : "ไม่มีกำหนดส่ง"}
          </div>
        </div>

        {statsLoading ? (
          <div className="mt-3 h-2.5 rounded-full bg-gray-100 animate-pulse" />
        ) : (
          <>
            <div className="mt-3 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-gray-500">{reviewed}/{total} คน</span>
              {isScheduled ? (
                <span className="text-gray-400">⚪ ยังไม่ถึงกำหนดส่ง</span>
              ) : isFullyReviewed && total > 0 ? (
                <span className="text-emerald-600 font-medium">🟢 ตรวจครบแล้ว</span>
              ) : pending > 0 ? (
                <span className="text-red-500 font-medium">🔴 รอตรวจ {pending}</span>
              ) : (
                <span className="text-gray-400">ยังไม่มีคนส่ง</span>
              )}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

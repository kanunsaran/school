import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Select from "react-select";
import {
  FaClipboardList, FaUsers, FaUser, FaRegClock, FaCheckCircle, FaSearch,
  FaRegClipboard, FaQuestionCircle, FaClipboardCheck, FaEye, FaChevronLeft, FaChevronRight,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import PageLoading from "../components/PageLoading.jsx";
import { filterSelectStyles } from "../utils/reactSelectStyles.js";
import { gradeLabel } from "../utils/gradeLabel.js";
import { getCurrentUser } from "../utils/auth.js";
import {
  getChapters, getAssignmentsByChapter, getAssignmentClasses,
  getSubmissionsByAssignment, getNotSubmitStudents,
  getClasses, getStudent, getEnrollments, getAssessmentsList,
} from "../callapi/callapi_user.jsx";

const TYPE_META = {
  assignment: { label: "งาน", icon: FaRegClipboard, iconBoxCls: "bg-pink-50 text-pink-500", badgeCls: "bg-pink-50 text-pink-700" },
  question: { label: "คำถาม", icon: FaQuestionCircle, iconBoxCls: "bg-purple-50 text-purple-500", badgeCls: "bg-purple-50 text-purple-700" },
  assessment: { label: "แบบประเมิน", icon: FaClipboardCheck, iconBoxCls: "bg-indigo-50 text-indigo-500", badgeCls: "bg-indigo-50 text-indigo-700" },
};

const STATUS_META = {
  draft: { label: "ร่าง", cls: "bg-gray-100 text-gray-500" },
  scheduled: { label: "รอโพสต์", cls: "bg-amber-50 text-amber-700" },
  ongoing: { label: "กำลังดำเนินการ", cls: "bg-blue-50 text-blue-600" },
  done: { label: "เสร็จสิ้น", cls: "bg-emerald-50 text-emerald-700" },
};

const TYPE_OPTIONS = [
  { value: "", label: "ประเภท: ทั้งหมด" },
  { value: "assignment", label: "งาน" },
  { value: "question", label: "คำถาม" },
  { value: "assessment", label: "แบบประเมิน" },
];

const STATUS_OPTIONS = [
  { value: "", label: "สถานะ: ทั้งหมด" },
  { value: "ongoing", label: "กำลังดำเนินการ" },
  { value: "done", label: "เสร็จสิ้น" },
  { value: "scheduled", label: "รอโพสต์ / รอเปิดใช้งาน" },
  { value: "draft", label: "ร่าง" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50].map((n) => ({ value: n, label: `${n} / หน้า` }));

const MODE_TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "whole", label: "มอบหมายทั้งห้อง" },
  { key: "multi", label: "มอบหมายหลายห้อง" },
  { key: "individual", label: "มอบหมายรายบุคคล" },
];

const formatShortDate = (d) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "");
const formatTime = (d) => {
  const t = new Date(d);
  const hasTime = t.getHours() !== 0 || t.getMinutes() !== 0;
  return hasTime ? t.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น." : "";
};

export default function AssignmentOverviewPage() {
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modeTab, setModeTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [namesModal, setNamesModal] = useState(null); // { title, names }

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [chapters, classesRaw, students, enrollments, assessmentsRaw] = await Promise.all([
          getChapters().catch(() => []),
          getClasses().catch(() => []),
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getAssessmentsList({ created_by_user_id: currentUser?.user_id }).catch(() => []),
        ]);

        const classesList = (classesRaw || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        const classById = new Map(classesList.map((c) => [String(c.id), c]));

        const studentMap = new Map((students || []).map((s) => [String(s.user_id), s]));

        const enrollmentsByGrade = new Map();
        (enrollments || []).forEach((e) => {
          const gid = String(e.grade_idgrade);
          if (!enrollmentsByGrade.has(gid)) enrollmentsByGrade.set(gid, new Set());
          enrollmentsByGrade.get(gid).add(String(e.user_user_id));
        });
        const enrollmentTotalFor = (gradeIds) => {
          const set = new Set();
          gradeIds.forEach((gid) => (enrollmentsByGrade.get(String(gid)) || new Set()).forEach((uid) => set.add(uid)));
          return set.size;
        };

        const perChapter = await Promise.all(
          (chapters || []).map((c) => getAssignmentsByChapter(c.chapter_id).catch(() => []))
        );
        const flatAssignments = perChapter.flat();

        const assignmentDetails = await Promise.all(
          flatAssignments.map(async (a) => {
            const [classLinks, subs, notSub] = await Promise.all([
              getAssignmentClasses({ ass_id: a.ass_id }).catch(() => []),
              getSubmissionsByAssignment(a.ass_id).catch(() => []),
              getNotSubmitStudents(a.ass_id).catch(() => []),
            ]);
            return { a, classLinks, subs, notSub };
          })
        );

        const assignmentItems = assignmentDetails.map(({ a, classLinks, subs, notSub }) => {
          const postType = a.post_type === "question" ? "question" : "assignment";
          const hasScore = postType === "question" ? !!a.has_score : true;

          const mySubs = (subs || []).filter((s) => String(s.assignment_ass_id) === String(a.ass_id));
          const gradeIds = [...new Set((classLinks || []).map((l) => String(l.grade_id)))];

          const submittedNames = mySubs.map((s) => studentMap.get(String(s.user_user_id))?.fullname || `นักเรียน #${s.user_user_id}`);
          const notSubmittedNames = (notSub || []).map((u) => u.fullname || u.name || `นักเรียน #${u.user_id ?? u.id}`);
          const names = [...submittedNames, ...notSubmittedNames];

          const submitted = mySubs.length;
          const total = submitted + (notSub || []).length;
          const pending = hasScore ? mySubs.filter((s) => s.score == null).length : null;

          const enrollTotal = enrollmentTotalFor(gradeIds);
          let mode;
          if (gradeIds.length === 0) mode = "unset";
          else if (enrollTotal > 0 && total < enrollTotal) mode = "individual";
          else mode = gradeIds.length > 1 ? "multi" : "whole";

          const isScheduled = !!(a.scheduled_at && new Date(a.scheduled_at) > new Date());
          let statusKey;
          if (isScheduled) statusKey = "scheduled";
          else if (!hasScore) statusKey = total > 0 && submitted === total ? "done" : "ongoing";
          else statusKey = total > 0 && pending === 0 && submitted === total ? "done" : "ongoing";

          return {
            id: `${postType}-${a.ass_id}`,
            kind: postType,
            title: a.title,
            gradeIds,
            gradeLabels: gradeIds.map((gid) => classById.get(gid)).filter(Boolean).map((c) => gradeLabel(c)),
            mode,
            names,
            dueDate: a.deadline || null,
            submitted,
            total,
            pending,
            statusKey,
            detailHref: postType === "question" ? `/QuestionDetail/${a.ass_id}` : `/work/${a.ass_id}`,
          };
        });

        const totalStudentCount = (students || []).length;
        const assessmentItems = (assessmentsRaw || []).map((raw) => {
          const gradeIds = (raw.target_grade_ids || []).map(String);
          const total = gradeIds.length ? enrollmentTotalFor(gradeIds) : totalStudentCount;
          const submitted = raw.response_count || 0;
          const mode = gradeIds.length === 0 ? "whole" : gradeIds.length > 1 ? "multi" : "whole";
          const statusKey = raw.status === "published" ? "ongoing" : raw.status === "closed" ? "done" : raw.status === "scheduled" ? "scheduled" : "draft";

          return {
            id: `assessment-${raw.assessment_id}`,
            kind: "assessment",
            title: raw.title,
            gradeIds,
            gradeLabels: gradeIds.length
              ? gradeIds.map((gid) => classById.get(gid)).filter(Boolean).map((c) => gradeLabel(c))
              : ["นักเรียนทั้งหมด"],
            mode,
            names: [],
            dueDate: raw.close_date || null,
            submitted,
            total,
            pending: null,
            statusKey,
            detailHref: "/assessments/results",
          };
        });

        if (!cancelled) setItems([...assignmentItems, ...assessmentItems]);
      } catch (err) {
        console.error("โหลดภาพรวมการมอบหมายงานไม่สำเร็จ:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeCounts = useMemo(
    () => ({
      all: items.length,
      whole: items.filter((i) => i.mode === "whole").length,
      multi: items.filter((i) => i.mode === "multi").length,
      individual: items.filter((i) => i.mode === "individual").length,
    }),
    [items]
  );

  const stats = useMemo(() => {
    const pending = items.reduce((sum, i) => sum + (i.pending || 0), 0);
    const submitted = items.reduce((sum, i) => sum + i.submitted, 0);
    const total = items.reduce((sum, i) => sum + i.total, 0);
    return { count: items.length, whole: modeCounts.whole, individual: modeCounts.individual, pending, submitted, total };
  }, [items, modeCounts]);

  const filtered = useMemo(() => {
    let list = items;
    if (modeTab !== "all") list = list.filter((i) => i.mode === modeTab);
    if (typeFilter) list = list.filter((i) => i.kind === typeFilter);
    if (statusFilter) list = list.filter((i) => i.statusKey === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.gradeLabels.some((g) => g.toLowerCase().includes(q)) ||
          i.names.some((n) => n.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, modeTab, typeFilter, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [modeTab, typeFilter, statusFilter, search, pageSize]);

  const openNames = (title, names) => setNamesModal({ title, names });

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div>
          <h1 className="page-title">ภาพรวมการมอบหมายงาน</h1>
          <p className="page-subtitle mt-1">ดูภาพรวมงานทั้งหมดที่คุณมอบหมายให้ห้องเรียนและนักเรียน</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 mb-6">
          <StatCard icon={FaClipboardList} cardCls="bg-pink-50" iconCls="bg-pink-100 text-pink-600" label="งานทั้งหมด" value={`${stats.count} งาน`} />
          <StatCard icon={FaUsers} cardCls="bg-blue-50" iconCls="bg-blue-100 text-blue-600" label="มอบหมายทั้งห้อง" value={`${stats.whole} งาน`} />
          <StatCard icon={FaUser} cardCls="bg-emerald-50" iconCls="bg-emerald-100 text-emerald-600" label="มอบหมายรายบุคคล" value={`${stats.individual} งาน`} />
          <StatCard icon={FaRegClock} cardCls="bg-amber-50" iconCls="bg-amber-100 text-amber-600" label="รอตรวจ" value={`${stats.pending} รายการ`} />
          <StatCard icon={FaCheckCircle} cardCls="bg-indigo-50" iconCls="bg-indigo-100 text-indigo-600" label="ส่งแล้วทั้งหมด" value={`${stats.submitted}/${stats.total}`} sub="รายการ" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {MODE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setModeTab(t.key)}
              className={`h-9 px-4 rounded-full border text-[14px] font-medium transition-colors ${
                modeTab === t.key ? "bg-pink-500 border-pink-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label} ({modeCounts[t.key]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="relative flex-1 min-w-55">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่องาน / ห้องเรียน / ชื่อนักเรียน"
              className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[15px] outline-none focus:border-pink-400"
            />
          </div>
          <Select
            styles={filterSelectStyles}
            className="w-44"
            value={TYPE_OPTIONS.find((o) => o.value === typeFilter)}
            onChange={(opt) => setTypeFilter(opt.value)}
            options={TYPE_OPTIONS}
            isSearchable={false}
          />
          <Select
            styles={filterSelectStyles}
            className="w-56"
            value={STATUS_OPTIONS.find((o) => o.value === statusFilter)}
            onChange={(opt) => setStatusFilter(opt.value)}
            options={STATUS_OPTIONS}
            isSearchable={false}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[2fr_0.9fr_1.6fr_1fr_0.9fr_0.9fr_1.1fr_0.6fr] gap-2 px-4 py-2.5 text-[13px] text-gray-400 border-b border-gray-100">
              <div>งาน</div>
              <div>ประเภท</div>
              <div>มอบหมายให้</div>
              <div>กำหนดส่ง</div>
              <div>ส่งแล้ว</div>
              <div>รอตรวจ</div>
              <div>สถานะ</div>
              <div className="text-right">ดู</div>
            </div>

            {loading ? (
              <PageLoading />
            ) : paged.length === 0 ? (
              <div className="text-center text-gray-400 py-14 text-[14.5px]">ไม่พบรายการ</div>
            ) : (
              paged.map((item) => {
                const typeMeta = TYPE_META[item.kind];
                const statusMeta = STATUS_META[item.statusKey];
                const isIndividual = item.mode === "individual";
                const TargetIcon = isIndividual ? FaUser : FaUsers;
                const targetIconCls = isIndividual ? "text-amber-500" : "text-blue-500";

                let targetMain;
                let targetSub;
                if (item.mode === "unset") {
                  targetMain = "ยังไม่กำหนด";
                  targetSub = "-";
                } else if (isIndividual) {
                  targetMain = item.names.length <= 2 ? item.names.join(", ") : `เฉพาะ ${item.names.length} คน`;
                  targetSub =
                    item.names.length <= 2 ? (
                      `รวม ${item.names.length} คน`
                    ) : (
                      <button
                        type="button"
                        onClick={() => openNames(item.title, item.names)}
                        className="text-blue-600 hover:underline bg-transparent"
                      >
                        ดูรายชื่อ
                      </button>
                    );
                } else {
                  const labels = item.gradeLabels;
                  targetMain = labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2} ห้อง` : labels.join(", ") || "-";
                  targetSub = `นักเรียน ${item.total} คน`;
                }

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[2fr_0.9fr_1.6fr_1fr_0.9fr_0.9fr_1.1fr_0.6fr] gap-2 px-4 py-3.5 border-b border-gray-50 items-center hover:bg-gray-50/60"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.iconBoxCls}`}>
                        <typeMeta.icon size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-gray-900 truncate">{item.title}</div>
                        <div className="text-[12.5px] text-gray-400">{typeMeta.label}</div>
                      </div>
                    </div>

                    <div>
                      <span className={`text-[12.5px] font-medium px-2 py-1 rounded-lg ${typeMeta.badgeCls}`}>{typeMeta.label}</span>
                    </div>

                    <div className="flex items-start gap-2 min-w-0">
                      <TargetIcon className={`mt-0.5 shrink-0 ${targetIconCls}`} size={14} />
                      <div className="min-w-0">
                        <div className="text-[14px] text-gray-800 truncate" title={typeof targetMain === "string" ? targetMain : undefined}>{targetMain}</div>
                        <div className="text-[12.5px] text-gray-400">{targetSub}</div>
                      </div>
                    </div>

                    <div className="text-[13.5px] text-gray-600">
                      {item.dueDate ? (
                        <>
                          <div>{formatShortDate(item.dueDate)}</div>
                          {formatTime(item.dueDate) && <div className="text-[12.5px] text-gray-400">{formatTime(item.dueDate)}</div>}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>

                    <div className="text-[14px] text-gray-700">
                      {item.total > 0 ? `${item.submitted}/${item.total} คน` : <span className="text-gray-400">-</span>}
                    </div>

                    <div className="text-[14px] text-gray-700">
                      {item.pending == null ? <span className="text-gray-400">-</span> : `${item.pending} คน`}
                    </div>

                    <div>
                      <span className={`text-[12.5px] font-medium px-2 py-1 rounded-full ${statusMeta.cls}`}>{statusMeta.label}</span>
                    </div>

                    <div className="flex items-center justify-end">
                      <Link
                        to={item.detailHref}
                        title="ดูรายละเอียด"
                        className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                      >
                        <FaEye size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13.5px] text-gray-500">
              แสดง {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} จาก {filtered.length} งาน
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 bg-white"
                >
                  <FaChevronLeft size={12} />
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pageCount || Math.abs(n - currentPage) <= 1)
                  .map((n, idx, arr) => (
                    <span key={n} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== n - 1 && <span className="px-1 text-gray-300">…</span>}
                      <button
                        type="button"
                        onClick={() => setPage(n)}
                        className={`w-9 h-9 rounded-lg text-[14px] font-medium ${
                          n === currentPage ? "bg-pink-500 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                        }`}
                      >
                        {n}
                      </button>
                    </span>
                  ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                  className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 bg-white"
                >
                  <FaChevronRight size={12} />
                </button>
              </div>
              <Select
                styles={filterSelectStyles}
                className="w-32"
                value={PAGE_SIZE_OPTIONS.find((o) => o.value === pageSize)}
                onChange={(opt) => setPageSize(opt.value)}
                options={PAGE_SIZE_OPTIONS}
                isSearchable={false}
              />
            </div>
          </div>
        )}
      </main>

      {namesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setNamesModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[360px] max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-[15.5px] font-semibold text-gray-900 truncate">{namesModal.title}</div>
              <div className="text-[13px] text-gray-400">มอบหมายให้ {namesModal.names.length} คน</div>
            </div>
            <div className="px-5 py-3 overflow-y-auto flex flex-col gap-2">
              {namesModal.names.map((n, i) => (
                <div key={i} className="text-[14.5px] text-gray-700">{n}</div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setNamesModal(null)}
                className="w-full h-10 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-[14.5px]"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, cardCls, iconCls, label, value, sub }) {
  const Icon = icon;
  return (
    <div className={`rounded-2xl p-4 flex items-start gap-3 ${cardCls}`}>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] text-gray-600 truncate">{label}</div>
        <div className="text-[19px] font-bold text-gray-900">{value}</div>
        {sub && <div className="text-[12.5px] text-gray-500 truncate">{sub}</div>}
      </div>
    </div>
  );
}

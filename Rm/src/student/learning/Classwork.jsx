import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import PageLoading from "../../components/PageLoading.jsx";
import {
  FaSearch, FaFileAlt, FaClipboardList, FaChevronDown, FaCheckCircle,
  FaExclamationCircle, FaHourglassHalf, FaFolder,
} from "react-icons/fa";
import {
  getAssAll, getAssignmentClasses, getChapters, getAllSubmissions, getEnrollments, getClasses,
  getAssignmentById, getAssignmentFiles, getContents,
} from "../../callapi/callapi_user.jsx";
import { gradeLabel } from "../../utils/gradeLabel.js";
import { API_BASE } from "../../utils/feedShared.js";
import { resolveFileUrl } from "../../utils/media.js";
import { getCurrentUser } from "../../utils/auth.js";
import { POST_TYPE_META } from "../../utils/postTypeStyles.js";

// ป้ายสถานะฝั่งงาน (STATUS_META) ใช้คำว่า "ส่ง" — แต่คำถามควรใช้คำว่า "ตอบ" แทน แปลงตรงนี้ทีเดียว
const QUESTION_LABEL_MAP = {
  "ยังไม่ส่ง": "ยังไม่ตอบ",
  "เลยกำหนดส่ง": "เกินกำหนดตอบ",
  "ส่งแล้ว": "ตอบแล้ว",
  "ส่งล่าช้า": "ตอบล่าช้า",
  "ตรวจแล้ว": "ตรวจแล้ว",
};

// ใช้ user จาก session จริงหลัง login (เดิม hardcode "1" ทำให้บัญชีอื่นเห็นสถานะส่งงานปนกัน — บั๊กเดียวกับที่เจอใน StudentInfoForm.jsx)
const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? "1";

const DUE_SOON_DAYS = 3;

const STATUS_META = {
  not_submitted: { label: "ยังไม่ส่ง", cls: "bg-amber-50 text-amber-700", icon: FaHourglassHalf },
  overdue: { label: "เลยกำหนดส่ง", cls: "bg-red-50 text-red-700", icon: FaExclamationCircle },
  submitted: { label: "ส่งแล้ว", cls: "bg-emerald-50 text-emerald-700", icon: FaCheckCircle },
  late: { label: "ส่งล่าช้า", cls: "bg-orange-50 text-orange-700", icon: FaExclamationCircle },
  reviewed: { label: "ตรวจแล้ว", cls: "bg-green-50 text-green-700", icon: FaCheckCircle },
};

const TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "not_submitted", label: "ยังไม่ส่ง" },
  { key: "submitted", label: "ส่งแล้ว" },
  { key: "reviewed", label: "ตรวจแล้ว" },
];

const formatDate = (d) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

export default function StudentClassworkPage({ embedded = false, gradeId: propGradeId } = {}) {
  const [assignments, setAssignments] = useState([]);
  const [assignmentClasses, setAssignmentClasses] = useState([]);
  const [contents, setContents] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [myGradeId, setMyGradeId] = useState(null);
  const [myGrade, setMyGrade] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (key) => setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // ===== accordion ต่อรายการงาน (คลิกแล้วขยายดูรายละเอียด+ไฟล์แนบ เหมือนฝั่งครู) =====
  const [expandedAssId, setExpandedAssId] = useState(null);
  const [detailsByAssId, setDetailsByAssId] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [assData, acData, chapterData, subData, enrollData, gradeData, contentData] = await Promise.all([
          getAssAll().catch(() => []),
          getAssignmentClasses().catch(() => []),
          getChapters().catch(() => []),
          getAllSubmissions().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getContents().catch(() => []),
        ]);
        setAssignments(assData || []);
        setAssignmentClasses(acData || []);
        setChapters(chapterData || []);
        setContents(contentData || []); // แต่ละแถวมี class_ids ติดมาแล้ว กรองตามห้องจริงผ่าน myContents ด้านล่าง
        setSubmissions((subData || []).filter((s) => String(s.user_user_id) === String(CURRENT_STUDENT_ID)));
        const mine = (enrollData || []).find((e) => String(e.user_user_id) === String(CURRENT_STUDENT_ID));
        const gid = propGradeId || mine?.grade_idgrade || null;
        setMyGradeId(gid);
        setMyGrade((gradeData || []).find((g) => String(g.idgrade) === String(gid)) || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [propGradeId]);

  const chapterById = useMemo(() => {
    const map = new Map();
    chapters.forEach((c) => map.set(String(c.chapter_id), c));
    return map;
  }, [chapters]);

  const myAssignments = useMemo(() => {
    const myAssIds = new Set(
      assignmentClasses.filter((ac) => String(ac.grade_id) === String(myGradeId)).map((ac) => String(ac.ass_id))
    );
    return assignments.filter((a) => myAssIds.has(String(a.ass_id)));
  }, [assignments, assignmentClasses, myGradeId]);

  // เนื้อหากรองตามห้องด้วย class_ids จริงจาก backend — ไม่ผูกห้องไหนเลยถือว่ามองเห็นได้ทุกห้อง
  const myContents = useMemo(() => {
    if (!myGradeId) return contents;
    return contents.filter((c) => {
      const classIds = c.class_ids;
      if (!classIds || classIds.length === 0) return true;
      return classIds.map(String).includes(String(myGradeId));
    });
  }, [contents, myGradeId]);

  const submissionByAssId = useMemo(() => {
    const map = new Map();
    submissions.forEach((s) => map.set(String(s.assignment_ass_id), s));
    return map;
  }, [submissions]);

  const now = new Date();

  const enriched = useMemo(() => {
    return myAssignments.map((a) => {
      const submission = submissionByAssId.get(String(a.ass_id)) || null;
      const deadline = a.deadline ? new Date(a.deadline) : null;
      const deadlinePassed = deadline ? now > deadline : false;

      let statusKey;
      if (!submission) {
        statusKey = deadlinePassed ? "overdue" : "not_submitted";
      } else {
        const submittedLate = deadline && new Date(submission.created_at) > deadline;
        const reviewed = submission.is_released && (submission.score !== null || submission.teacher_comment);
        statusKey = reviewed ? "reviewed" : submittedLate ? "late" : "submitted";
      }

      const dueSoon = !submission && deadline && !deadlinePassed && (deadline - now) / (1000 * 60 * 60 * 24) <= DUE_SOON_DAYS;

      const postType = a.post_type || "assignment";
      const hasScore = postType === "question" ? !!a.has_score : true;

      return { ...a, submission, deadline, statusKey, dueSoon, postType, hasScore, chapter: chapterById.get(String(a.chapter_chapter_id)) };
    });
  }, [myAssignments, submissionByAssId, chapterById]);

  const kpi = useMemo(() => ({
    total: enriched.length,
    submitted: enriched.filter((a) => a.submission).length,
    notSubmitted: enriched.filter((a) => !a.submission).length,
    dueSoon: enriched.filter((a) => a.dueSoon).length,
  }), [enriched]);

  const counts = useMemo(() => ({
    all: enriched.length,
    not_submitted: enriched.filter((a) => a.statusKey === "not_submitted" || a.statusKey === "overdue").length,
    submitted: enriched.filter((a) => a.statusKey === "submitted" || a.statusKey === "late").length,
    reviewed: enriched.filter((a) => a.statusKey === "reviewed").length,
  }), [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (tab === "not_submitted") list = list.filter((a) => a.statusKey === "not_submitted" || a.statusKey === "overdue");
    else if (tab === "submitted") list = list.filter((a) => a.statusKey === "submitted" || a.statusKey === "late");
    else if (tab === "reviewed") list = list.filter((a) => a.statusKey === "reviewed");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => new Date(b.create_at) - new Date(a.create_at));
  }, [enriched, tab, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((a) => {
      const key = a.chapter?.title || "ไม่มีหมวดหมู่";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const content = (
    <>
      {!embedded && (
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="page-title">งานในชั้นเรียน</h1>
            <p className="page-subtitle mt-0.5">{myGrade ? `ห้อง ${gradeLabel(myGrade)}` : "รวมงานที่มอบหมายให้ห้องของคุณ"}</p>
          </div>
        </div>
      )}

      {loading ? (
            <PageLoading />
          ) : (
            <>
              {/* ===== แบนเนอร์สรุป ===== */}
              {kpi.notSubmitted > 0 ? (
                <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-pink-100/60 border border-pink-100 p-5 flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3.5">
                    <span className="w-12 h-12 rounded-2xl bg-white text-pink-500 flex items-center justify-center shrink-0 shadow-sm">
                      <FaClipboardList size={19} />
                    </span>
                    <div>
                      <div className="text-[14.5px] font-semibold text-gray-900">คุณมีงานที่ยังไม่ส่ง {kpi.notSubmitted} งาน</div>
                      <div className="text-[12.5px] text-gray-500 mt-0.5">อย่าลืมส่งงานก่อนกำหนดนะคะ</div>
                    </div>
                  </div>
                  <FaHourglassHalf size={36} className="text-pink-200 shrink-0 hidden sm:block" />
                </div>
              ) : (
                <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-100 p-5 flex items-center gap-3.5 mb-6">
                  <span className="w-12 h-12 rounded-2xl bg-white text-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                    <FaCheckCircle size={19} />
                  </span>
                  <div>
                    <div className="text-[14.5px] font-semibold text-gray-900">ส่งงานครบทุกชิ้นแล้ว</div>
                    <div className="text-[12.5px] text-gray-500 mt-0.5">เยี่ยมมาก! ไม่มีงานค้างส่ง</div>
                  </div>
                </div>
              )}

              {/* ===== Tabs + search ===== */}
              <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                <div className="flex items-center gap-2 flex-wrap">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`h-9 px-4 rounded-full text-[15px] font-medium transition-colors ${
                        tab === t.key ? "bg-pink-500 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {t.label} {counts[t.key]}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่องาน..."
                    className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[13.5px] outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              {/* ===== เนื้อหา (แยกจากงาน/คำถาม ไม่มีสถานะส่ง/ตรวจ) ===== */}
              {myContents.length > 0 && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden mb-4">
                  <div className="w-full flex items-center gap-2.5 px-5 py-3.5 bg-blue-50/70">
                    <FaFolder className="text-blue-400" size={14} />
                    <span className="text-[15.5px] font-semibold text-gray-800">เนื้อหา</span>
                    <span className="text-[14px] text-blue-500 font-semibold">{myContents.length}</span>
                  </div>
                  <div className="p-4 flex flex-col gap-3 bg-white">
                    {myContents.map((c) => (
                      <ContentCard key={c.content_id} item={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* ===== รายการงาน แยกตามหัวข้อ ===== */}
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
                  <FaClipboardList size={24} className="mx-auto mb-3 text-gray-300" />
                  ไม่พบงานในหมวดนี้
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {grouped.map(([groupTitle, items]) => {
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
                            {items.map((a) => (
                              <StudentAssignmentCard
                                key={a.ass_id}
                                assignment={a}
                                statusKey={a.statusKey}
                                postType={a.postType}
                                expanded={expandedAssId === a.ass_id}
                                onToggle={() => toggleExpand(a.ass_id)}
                                detail={detailsByAssId[a.ass_id]}
                                detailLoading={loadingDetailId === a.ass_id}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      );

  if (embedded) return content;

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10">
          {content}
        </main>
      </div>
    </div>
  );
}

function StudentAssignmentCard({ assignment, statusKey, postType = "assignment", expanded, onToggle, detail, detailLoading }) {
  const isQuestion = postType === "question";
  const meta = STATUS_META[statusKey];
  const StatusIcon = meta.icon;
  const statusLabel = isQuestion ? (QUESTION_LABEL_MAP[meta.label] || meta.label) : meta.label;
  const detailHref = isQuestion ? `/studentquestiondetail/${assignment.ass_id}` : `/studentworkdetail/${assignment.ass_id}`;
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
          {assignment.deadline ? `กำหนดส่ง ${formatDate(assignment.deadline)}` : "ไม่มีกำหนดส่ง"}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full shrink-0 ${meta.cls}`}>
          <StatusIcon size={10} /> {statusLabel}
        </span>
        <FaChevronDown className={`text-gray-400 text-[12px] shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 p-4">
          <div className="text-[12px] text-gray-400 mb-2">โพสต์เมื่อ {formatDate(assignment.create_at)}</div>

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
                      <FaFileAlt size={11} className="shrink-0" /> {f.file_name}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-4">
            <Link to={detailHref} className="text-pink-600 hover:underline text-[13.5px] font-medium">
              ดูเพิ่มเติม
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentCard({ item }) {
  const { icon: TypeIcon, iconBoxCls } = POST_TYPE_META.content;
  return (
    <Link
      to={`/studentcontentdetail/${item.content_id}`}
      className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBoxCls}`}>
        <TypeIcon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-gray-900 truncate">{item.title}</div>
      </div>
      <div className="text-[13px] text-gray-500 shrink-0 whitespace-nowrap hidden sm:block">
        {item.created_at ? `โพสต์เมื่อ ${formatDate(item.created_at)}` : ""}
      </div>
    </Link>
  );
}

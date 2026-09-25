import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import SidebarNav from "../nav.jsx";
import PageLoading from "../components/PageLoading.jsx";
import Header from "../Header";
import {
  FaChevronLeft, FaChevronRight, FaSearch, FaFilePdf, FaFileAlt, FaDownload,
  FaTimes, FaUserFriends, FaClipboardCheck, FaRegClock, FaUserCheck, FaTimesCircle,
} from "react-icons/fa";
import {
  getAssignmentById, getSubmissionsByAssignment, getStudent,
  getNotSubmitStudents, countSubmitted, updateSendAssScore,
  getSubmissionGroups, createSubmissionGroup, updateSubmissionComment, getSubmissionFiles,
} from "../callapi/callapi_user.jsx";
import { resolveFileUrl } from "../utils/media.js";
import { API_BASE } from "../utils/feedShared.js";
import { filterSelectStyles } from "../utils/reactSelectStyles.js";

const formatShortDateTime = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const initialOf = (fullname = "") => (fullname || "?").replace(/^(นางสาว|เด็กหญิง|เด็กชาย|นาย|นาง)\s*/u, "").charAt(0);
const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "newest", label: "ส่งล่าสุดก่อน" },
  { value: "oldest", label: "ส่งเก่าสุดก่อน" },
];

const COMMENT_CHIPS = ["ดีมาก 👍", "เพิ่มรายละเอียด", "เนื้อหาครบถ้วน", "จัดรูปแบบดี"];
const RETURN_REASON_CHIPS = ["เนื้อหาไม่ครบถ้วน", "เพิ่มรายละเอียด", "จัดรูปแบบ", "แหล่งอ้างอิงไม่ครบ", "อื่นๆ"];

function classifyExt(path = "") {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}
function fileNameOf(path = "") {
  return decodeURIComponent(path.split("/").pop() || path);
}
function effectiveScore(sub) {
  return sub ? sub.score : null;
}
// ปุ่มลัดให้คะแนน — ไล่จากคะแนนเต็มลงมา 4 ค่า แล้วปิดท้ายด้วย 0 เสมอ (เช่นเต็ม 10 -> 10,9,8,7,0)
function quickScoreOptions(maxScore) {
  const max = Number(maxScore);
  if (!Number.isFinite(max) || max <= 0) return [0];
  const top = [max, max - 1, max - 2, max - 3].filter((n) => n > 0);
  return [...new Set([...top, 0])];
}

export default function WorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]); // enriched send_ass rows for this assignment
  const [notSubmitted, setNotSubmitted] = useState([]);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState([]); // จริงจาก /submission-groups

  const [selectedKey, setSelectedKey] = useState(null);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [extraFiles, setExtraFiles] = useState([]); // ไฟล์เพิ่มเติมจริงจาก send_ass_files ของแถวที่เลือก
  const [scoreInput, setScoreInput] = useState("");
  const [sameScoreForAll, setSameScoreForAll] = useState(true);
  const [memberScores, setMemberScores] = useState({});
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [comment, setComment] = useState("");
  const [releaseOnSave, setReleaseOnSave] = useState(false);
  const [returnReasons, setReturnReasons] = useState([]);
  const [extraNote, setExtraNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [groupModalRoster, setGroupModalRoster] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const a = await getAssignmentById(id);
      setAssignment(a);

      const [allSubs, studentsAll, groupData] = await Promise.all([
        getSubmissionsByAssignment(id).catch((err) => { console.error("โหลดงานที่ส่งไม่สำเร็จ:", err); return []; }),
        getStudent().catch((err) => { console.error("โหลดรายชื่อนักเรียนไม่สำเร็จ:", err); return []; }),
        getSubmissionGroups(id).catch((err) => { console.error("โหลดกลุ่มนักเรียนไม่สำเร็จ:", err); return []; }),
      ]);

      const studentMap = {};
      (studentsAll || []).forEach((s) => { studentMap[String(s.user_id)] = s; });

      const mine = (allSubs || []).filter((s) => String(s.assignment_ass_id) === String(id));
      const enriched = mine.map((s) => ({
        ...s,
        fullname: studentMap[String(s.user_user_id)]?.fullname || `นักเรียน #${s.user_user_id}`,
      }));
      setSubmissions(enriched);
      setGroups(groupData || []);
    } catch (err) {
      console.error("โหลดรายละเอียดงานไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }

    try {
      const [ns, sc] = await Promise.all([getNotSubmitStudents(id), countSubmitted(id)]);
      setNotSubmitted(ns || []);
      setTotalAssigned((sc || 0) + (ns || []).length);
    } catch (err) {
      console.error("โหลดรายชื่อผู้ที่ยังไม่ส่งไม่สำเร็จ:", err);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  // ประเภทงาน — อิงจากการมีกลุ่มจริงในระบบ (ไม่ใช้ flag เก็บเองอีกต่อไป เพราะมี /submission-groups จริงแล้ว)
  const workType = groups.length > 0 ? "group" : "individual";

  // ===== แถวในตาราง: งานเดี่ยว = 1 แถวต่อคน, งานกลุ่ม = สมาชิกในกลุ่มยุบเป็นแถวเดียว คนที่ยังไม่ได้จัดกลุ่มโชว์แยกเป็นรายคน =====
  const rows = useMemo(() => {
    const groupedUserIds = new Set(groups.flatMap((g) => g.members.map((m) => String(m.user_user_id))));
    const byUserId = new Map(submissions.map((s) => [String(s.user_user_id), s]));

    const notSubmittedRows = (notSubmitted || [])
      .filter((u) => !groupedUserIds.has(String(u.user_id ?? u.id)))
      .map((u) => {
        const uid = u.user_id ?? u.id;
        return {
          key: `ns-${uid}`, kind: "individual", title: u.fullname || u.name || `นักเรียน #${uid}`,
          members: [{ user_user_id: uid, fullname: u.fullname || u.name }], submissions: [], submittedAt: null, score: null,
        };
      });

    if (workType !== "group") {
      const individualRows = submissions.map((s) => ({
        key: `u-${s.user_user_id}`, kind: "individual", title: s.fullname,
        members: [s], submissions: [s], submittedAt: s.timestamp, score: effectiveScore(s),
      }));
      return [...individualRows, ...notSubmittedRows];
    }

    const groupRows = groups.map((g) => {
      const memberSubs = g.members.map((m) => byUserId.get(String(m.user_user_id))).filter(Boolean);
      const submittedAt = memberSubs.length ? memberSubs.map((s) => s.timestamp).filter(Boolean).sort().slice(-1)[0] : null;
      const scores = memberSubs.map((s) => effectiveScore(s)).filter((n) => n != null);
      return {
        key: `g-${g.group_id}`, kind: "group", title: g.group_name, group: g,
        members: g.members.map((m) => byUserId.get(String(m.user_user_id)) || { user_user_id: m.user_user_id, fullname: m.fullname }),
        submissions: memberSubs, submittedAt,
        score: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      };
    });

    const ungrouped = submissions.filter((s) => !groupedUserIds.has(String(s.user_user_id)));
    const individualRows = ungrouped.map((s) => ({
      key: `u-${s.user_user_id}`, kind: "individual", title: s.fullname,
      members: [s], submissions: [s], submittedAt: s.timestamp, score: effectiveScore(s),
    }));

    return [...groupRows, ...individualRows, ...notSubmittedRows];
  }, [workType, groups, submissions, notSubmitted]);

  const rowStatus = (row) => (row.submissions.length === 0 ? "ยังไม่ส่ง" : row.score != null ? "ตรวจแล้ว" : "รอตรวจ");

  const counts = useMemo(() => ({
    ทั้งหมด: rows.length,
    ส่งแล้ว: rows.filter((r) => r.submissions.length > 0).length,
    รอตรวจ: rows.filter((r) => rowStatus(r) === "รอตรวจ").length,
    ตรวจแล้ว: rows.filter((r) => rowStatus(r) === "ตรวจแล้ว").length,
    ยังไม่ส่ง: rows.filter((r) => rowStatus(r) === "ยังไม่ส่ง").length,
  }), [rows]);
  const pctOf = (n) => (rows.length > 0 ? Math.round((n / rows.length) * 100) : 0);

  const filteredRows = useMemo(() => {
    let list = rows.filter((r) => (activeTab === "ทั้งหมด" ? true : rowStatus(r) === activeTab));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q) || r.members.some((m) => (m.fullname || "").toLowerCase().includes(q)));
    }
    list = [...list].sort((a, b) => {
      const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return sortBy === "newest" ? bt - at : at - bt;
    });
    return list;
  }, [rows, activeTab, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedRow = useMemo(() => filteredRows.find((r) => r.key === selectedKey) || filteredRows[0] || null, [filteredRows, selectedKey]);
  const selectedIndex = selectedRow ? filteredRows.findIndex((r) => r.key === selectedRow.key) : -1;

  // เปลี่ยนแถวที่เลือก -> รีเซ็ตฟอร์มให้คะแนนใหม่ตามข้อมูลจริงของแถวนั้น (comment/is_released อ่านจาก field จริงบน submission แล้ว)
  useEffect(() => {
    if (!selectedRow) return;
    const firstSub = selectedRow.submissions[0];
    setScoreInput(selectedRow.score != null ? String(selectedRow.score) : "");
    setSelectedMembers(selectedRow.members.map((m) => String(m.user_user_id)));
    setMemberScores(Object.fromEntries(selectedRow.submissions.map((s) => [String(s.user_user_id), effectiveScore(s) ?? ""])));
    setComment(firstSub?.teacher_comment || "");
    setReleaseOnSave(!!firstSub?.is_released);
    setReturnReasons([]);
    setExtraNote("");
    setExtraFiles([]);

    if (firstSub?.send_id) {
      getSubmissionFiles(firstSub.send_id).then(setExtraFiles).catch(() => setExtraFiles([]));
    }
  }, [selectedRow?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const pooledFiles = useMemo(() => {
    if (!selectedRow) return [];
    // ไฟล์จาก send_ass_files (ของจริง อัปโหลดได้หลายไฟล์) ถ้ามี ไม่งั้น fallback ไปไฟล์เดียวจาก file_path เดิม
    if (extraFiles.length > 0) {
      return extraFiles.map((f) => ({ path: f.file_url, name: f.file_name, kind: classifyExt(f.file_name), fromUser: selectedRow.submissions[0]?.fullname }));
    }
    return selectedRow.submissions
      .filter((s) => s.file_path)
      .map((s) => ({ path: s.file_path, name: fileNameOf(s.file_path), kind: classifyExt(s.file_path), fromUser: s.fullname }));
  }, [selectedRow, extraFiles]);

  const insertToComment = (text) => setComment((prev) => (prev.trim() ? `${prev}\n${text}` : text));
  const toggleReturnReason = (reason) => {
    setReturnReasons((prev) => (prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]));
  };

  const buildFinalComment = () => {
    const reasonLine = returnReasons.length > 0 ? `ต้องแก้ไข: ${returnReasons.join(", ")}` : "";
    const extra = extraNote.trim();
    return [comment.trim(), releaseOnSave ? reasonLine : "", releaseOnSave ? extra : ""].filter(Boolean).join("\n");
  };

  const handleSaveScore = async (alsoRelease) => {
    if (!selectedRow || selectedRow.submissions.length === 0) {
      Swal.fire({ icon: "warning", title: "ยังไม่มีงานส่งเข้ามา", text: "ให้คะแนนไม่ได้เพราะยังไม่มีไฟล์ส่ง" });
      return;
    }

    const targets = selectedRow.submissions.filter((s) => selectedMembers.includes(String(s.user_user_id)));
    const maxScore = assignment.max_score != null ? Number(assignment.max_score) : null;

    for (const s of targets) {
      const raw = sameScoreForAll ? scoreInput : (memberScores[String(s.user_user_id)] ?? scoreInput);
      const score = Number(raw);
      if (String(raw).trim() === "" || Number.isNaN(score)) {
        Swal.fire({ icon: "warning", title: "คะแนนไม่ถูกต้อง", text: "กรุณากรอกคะแนนเป็นตัวเลข" });
        return;
      }
      if (score < 0) {
        Swal.fire({ icon: "warning", title: "คะแนนไม่ถูกต้อง", text: "คะแนนต้องไม่ติดลบ" });
        return;
      }
      if (maxScore != null && score > maxScore) {
        Swal.fire({ icon: "warning", title: "คะแนนเกินคะแนนเต็ม", text: `คะแนนต้องไม่เกิน ${maxScore} คะแนน` });
        return;
      }
    }

    setSaving(true);
    try {
      const finalComment = buildFinalComment();
      await Promise.all(targets.map(async (s) => {
        const score = sameScoreForAll ? Number(scoreInput) : Number(memberScores[String(s.user_user_id)] ?? scoreInput);
        await updateSendAssScore(s.send_id, score);
        await updateSubmissionComment(s.send_id, { teacher_comment: finalComment, is_released: alsoRelease });
      }));

      await load();
      Swal.fire({ icon: "success", title: alsoRelease ? "ส่งกลับให้นักเรียนแล้ว" : "บันทึกคะแนนแล้ว", timer: 1300, showConfirmButton: false });
    } catch (err) {
      console.error("บันทึกคะแนนไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "บันทึกคะแนนไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedRow || selectedRow.submissions.length === 0) return;
    setSaving(true);
    try {
      const finalComment = buildFinalComment();
      await Promise.all(selectedRow.submissions.map((s) => updateSubmissionComment(s.send_id, { teacher_comment: finalComment, is_released: false })));
      await load();
      Swal.fire({ icon: "success", title: "บันทึกแบบร่างแล้ว", timer: 1000, showConfirmButton: false });
    } finally {
      setSaving(false);
    }
  };

  const handleManageGroups = () => {
    const roster = [
      ...submissions.map((s) => ({ id: String(s.user_user_id), fullname: s.fullname })),
      ...notSubmitted.map((u) => ({ id: String(u.user_id ?? u.id), fullname: u.fullname || u.name })),
    ];
    if (roster.length === 0) {
      Swal.fire({ icon: "info", title: "ยังไม่มีรายชื่อนักเรียน", text: "ต้องมีคนส่งงานหรือมีรายชื่อที่ต้องส่งก่อนถึงจะจัดกลุ่มได้" });
      return;
    }
    setGroupModalRoster(roster);
  };

  const handleCreateGroup = async ({ groupName, memberIds }) => {
    try {
      await createSubmissionGroup({ assignment_ass_id: id, group_name: groupName, member_user_ids: memberIds });
      await load();
      setGroupModalRoster(null);
    } catch (err) {
      console.error("สร้างกลุ่มไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "สร้างกลุ่มไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const goPrev = () => selectedIndex > 0 && setSelectedKey(filteredRows[selectedIndex - 1]?.key);
  const goNext = () => selectedIndex < filteredRows.length - 1 && setSelectedKey(filteredRows[selectedIndex + 1]?.key);

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 px-8 pt-24 pb-10">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-[14px] text-gray-400 hover:text-gray-600 bg-transparent border-none p-0"
          >
            ‹ ย้อนกลับ <span className="mx-1">›</span> <span className="text-gray-600">{assignment?.title || "…"}</span>
          </button>

          {!loading && assignment && filteredRows.length > 0 && (
            <div className="flex items-center gap-3 text-[14px]">
              <button type="button" disabled={selectedIndex <= 0} onClick={goPrev} className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center gap-1.5">
                <FaChevronLeft size={10} /> คนก่อนหน้า
              </button>
              <span className="text-gray-400">{selectedIndex + 1} / {filteredRows.length}</span>
              <button type="button" disabled={selectedIndex >= filteredRows.length - 1} onClick={goNext} className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 flex items-center gap-1.5">
                คนถัดไป <FaChevronRight size={10} />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <PageLoading />
        ) : !assignment ? (
          <div className="mt-10 text-center text-red-500">ไม่พบงานนี้</div>
        ) : (
          <>
            <h1 className="page-title mt-2">
              {workType === "group" ? "โครงงานกลุ่ม: " : ""}{assignment.title}
            </h1>

            {workType === "group" && (
              <button
                type="button"
                onClick={handleManageGroups}
                className="mt-3 h-9 px-4 rounded-full border border-pink-200 bg-pink-50 text-pink-700 text-[14px] font-medium hover:bg-pink-100"
              >
                + จัดกลุ่มนักเรียน
              </button>
            )}
            {workType === "individual" && rows.length > 0 && (
              <button
                type="button"
                onClick={handleManageGroups}
                className="mt-3 h-9 px-4 rounded-full border border-gray-200 bg-white text-gray-600 text-[14px] font-medium hover:bg-gray-50"
              >
                + จัดกลุ่มนักเรียน (เปลี่ยนเป็นงานกลุ่ม)
              </button>
            )}

            {/* ===== Stat cards ===== */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard icon={FaUserFriends} cardCls="bg-pink-50" iconCls="bg-pink-100 text-pink-600" label="ทั้งหมด" value={`${totalAssigned} คน`} sub="นักเรียนทั้งหมด" />
              <StatCard icon={FaClipboardCheck} cardCls="bg-emerald-50" iconCls="bg-emerald-100 text-emerald-600" label="ส่งแล้ว" value={`${counts.ส่งแล้ว} คน`} sub={`${pctOf(counts.ส่งแล้ว)}% ของทั้งหมด`} />
              <StatCard icon={FaRegClock} cardCls="bg-amber-50" iconCls="bg-amber-100 text-amber-600" label="รอตรวจ" value={`${counts.รอตรวจ} คน`} sub={`${pctOf(counts.รอตรวจ)}% ของทั้งหมด`} />
              <StatCard icon={FaUserCheck} cardCls="bg-purple-50" iconCls="bg-purple-100 text-purple-600" label="ตรวจแล้ว" value={`${counts.ตรวจแล้ว} คน`} sub={`${pctOf(counts.ตรวจแล้ว)}% ของทั้งหมด`} />
              <StatCard icon={FaTimesCircle} cardCls="bg-red-50" iconCls="bg-red-100 text-red-600" label="ยังไม่ส่ง" value={`${counts.ยังไม่ส่ง} คน`} sub={`${pctOf(counts.ยังไม่ส่ง)}% ของทั้งหมด`} />
            </div>

            {/* ===== ตัวกรอง — แนวยาวเต็มความกว้าง ใต้การ์ดสถิติ ===== */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-45">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ค้นหาชื่อนักเรียน"
                  className="w-full h-10 rounded-full border border-gray-200 bg-white pl-9 pr-4 text-[14.5px] outline-none focus:border-pink-300"
                />
              </div>

              <Select
                className="w-44"
                styles={filterSelectStyles}
                value={SORT_OPTIONS.find((o) => o.value === sortBy)}
                onChange={(opt) => setSortBy(opt.value)}
                options={SORT_OPTIONS}
                isSearchable={false}
              />

              <div className="flex flex-wrap gap-1.5">
                {["ทั้งหมด", "รอตรวจ", "ตรวจแล้ว", "ยังไม่ส่ง"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setActiveTab(t); setPage(1); }}
                    className={`h-10 px-3.5 rounded-full border text-[14px] font-medium ${
                      activeTab === t ? "bg-pink-500 border-pink-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t} ({t === "ทั้งหมด" ? counts.ทั้งหมด : counts[t]})
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6 items-start">
              {/* ===== ซ้าย: รายชื่อ ===== */}
              <div className="min-w-0 xl:border-r xl:border-gray-200 xl:pr-6">
                {pagedRows.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[14.5px]">ไม่มีรายการในตัวกรองนี้</div>
                ) : (
                  <div>
                    <div className="grid grid-cols-[1fr_84px_100px] gap-3 pb-2 text-[13px] font-medium text-gray-400 border-b border-gray-200">
                      <div>ชื่อ-นามสกุล</div>
                      <div className="text-center">คะแนน</div>
                      <div className="text-center">สถานะ</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {pagedRows.map((row) => {
                        const status = rowStatus(row);
                        const isSelected = selectedRow?.key === row.key;
                        return (
                          <div key={row.key} className={`xl:-mr-6 transition-colors ${isSelected ? "bg-pink-50" : "hover:bg-gray-50"}`}>
                            <button
                              type="button"
                              onClick={() => setSelectedKey(row.key)}
                              className="w-full grid grid-cols-[1fr_84px_100px] items-center gap-3 py-3 text-left bg-transparent xl:pr-6"
                            >
                              <div className="min-w-0 flex items-center gap-2.5">
                                <div className="w-8 h-8 shrink-0 rounded-full bg-pink-400 text-white text-[12.5px] font-semibold flex items-center justify-center">
                                  {initialOf(row.members[0]?.fullname)}
                                </div>
                                <span className="truncate text-[14.5px] text-gray-900">{row.kind === "group" ? `${row.title} (${row.members.length} คน)` : row.title}</span>
                              </div>
                              <div className="text-[14.5px] text-gray-700 text-center">{row.score != null ? `${row.score} / ${assignment.max_score ?? "-"}` : "-"}</div>
                              <div className="flex justify-center">
                                <StatusBadge status={status} />
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-gray-200 disabled:opacity-40 flex items-center justify-center bg-white">
                      <FaChevronLeft size={11} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg border text-[14px] ${p === page ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-600"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-gray-200 disabled:opacity-40 flex items-center justify-center bg-white">
                      <FaChevronRight size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* ===== ขวา: ไฟล์ที่ส่งอยู่บน แล้วให้คะแนนอยู่ล่าง คั่นด้วยเส้น ไม่มีกรอบ ===== */}
              <div className="min-w-0 flex flex-col gap-5">
                {!selectedRow ? (
                  <div className="py-10 text-center text-gray-400 text-[14.5px]">
                    เลือกนักเรียนหรือกลุ่มจากรายชื่อด้านซ้ายเพื่อตรวจงาน
                  </div>
                ) : (
                <div className="flex flex-col">
                  <div>
                    <div className="text-[14.5px] font-semibold text-gray-900 mb-3">ไฟล์ที่นักเรียนส่ง</div>
                    {pooledFiles.length === 0 ? (
                      <div className="text-[14px] text-gray-400 py-6 text-center">ยังไม่มีงานส่งเข้ามา</div>
                    ) : (
                      <FilePreviewList files={pooledFiles} submittedAt={selectedRow.submittedAt} />
                    )}
                  </div>

              <div className="min-w-0">
                  <div className="pt-5 mt-5 border-t border-gray-100 flex flex-col">
                    <div className="text-[14.5px] font-semibold text-gray-900 mb-3">ให้คะแนน</div>

                    {selectedRow.kind === "group" && (
                      <label className="flex items-center gap-2 text-[14px] text-gray-700 mb-2">
                        <input type="checkbox" checked={sameScoreForAll} onChange={(e) => setSameScoreForAll(e.target.checked)} className="accent-pink-500" />
                        ให้คะแนนทุกคนเท่ากัน
                      </label>
                    )}

                    {sameScoreForAll || selectedRow.kind === "individual" ? (
                      <>
                        <div className="flex items-center gap-3">
                          <input
                            type="number" min="0" max={assignment.max_score ?? undefined}
                            value={scoreInput} onChange={(e) => setScoreInput(e.target.value)}
                            className="w-36 h-18 rounded-2xl border-2 border-pink-200 bg-pink-50 px-3 text-center text-[36px] font-bold text-gray-900 outline-none focus:border-pink-400"
                          />
                          <span className="text-[16.5px] text-gray-500">/ {assignment.max_score ?? "-"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {quickScoreOptions(assignment.max_score).map((n) => (
                            <button key={n} type="button" onClick={() => setScoreInput(String(n))} className={`h-8 px-3 rounded-full border text-[14px] ${String(n) === scoreInput ? "border-pink-400 bg-pink-50 text-pink-700 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {selectedRow.submissions.map((s) => (
                          <div key={s.send_id} className="flex items-center justify-between gap-2">
                            <span className="text-[14px] text-gray-700 truncate">{s.fullname}</span>
                            <input
                              type="number" min="0" max={assignment.max_score ?? undefined}
                              value={memberScores[String(s.user_user_id)] ?? ""}
                              onChange={(e) => setMemberScores((prev) => ({ ...prev, [String(s.user_user_id)]: e.target.value }))}
                              className="w-16 h-9 rounded-lg border border-gray-200 bg-gray-50 px-2 text-center text-[14px] outline-none focus:border-pink-400"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedRow.kind === "group" && (
                      <div className="mt-4">
                        <div className="text-[13px] text-gray-400 mb-1.5">ให้คะแนนเฉพาะนักเรียน (ตัวเลือก) — เลือกคนที่ต้องการให้คะแนน (ถ้าไม่เลือก จะไม่ได้คะแนนทั้งกลุ่ม)</div>
                        <div className="flex flex-col gap-1">
                          {selectedRow.members.map((m) => (
                            <label key={m.user_user_id} className="flex items-center gap-2 text-[14px] text-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(String(m.user_user_id))}
                                onChange={(e) => setSelectedMembers((prev) => e.target.checked ? [...prev, String(m.user_user_id)] : prev.filter((mid) => mid !== String(m.user_user_id)))}
                                className="accent-pink-500"
                              />
                              {m.fullname}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex-1 flex flex-col">
                      <div className="text-[14.5px] font-medium text-gray-700 mb-1.5">ความคิดเห็นครู</div>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="พิมพ์ความคิดเห็น..."
                        className="w-full flex-1 min-h-25 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14.5px] outline-none focus:border-pink-400 resize-none"
                      />
                      <div className="text-right text-[12px] text-gray-400 mt-0.5">{comment.length} / 1000</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {COMMENT_CHIPS.map((c) => (
                          <button key={c} type="button" onClick={() => insertToComment(c)} className="h-7 px-3 rounded-full border border-gray-200 bg-white text-gray-600 text-[13px] hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600">
                            {c}
                          </button>
                        ))}
                        <button type="button" onClick={() => insertToComment("")} className="h-7 px-3 rounded-full border border-dashed border-gray-300 bg-white text-gray-400 text-[13px] hover:bg-gray-50">
                          + เพิ่ม
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[14.5px] font-medium text-gray-700">ส่งกลับให้นักเรียนแก้ไข</span>
                        <button
                          type="button"
                          onClick={() => setReleaseOnSave((v) => !v)}
                          style={{ padding: 0, border: "none" }}
                          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${releaseOnSave ? "bg-pink-500" : "bg-gray-300"}`}
                        >
                          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: releaseOnSave ? "22px" : "2px" }} />
                        </button>
                      </div>

                      {releaseOnSave && (
                        <div className="mt-3">
                          <div className="text-[13px] text-gray-500 mb-1.5">เหตุผลที่ให้แก้ไข (เลือกได้หลายข้อ)</div>
                          <div className="flex flex-wrap gap-1.5">
                            {RETURN_REASON_CHIPS.map((r) => (
                              <label key={r} className={`h-7 px-3 rounded-full border text-[13px] flex items-center gap-1.5 cursor-pointer ${returnReasons.includes(r) ? "border-pink-400 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-600"}`}>
                                <input type="checkbox" checked={returnReasons.includes(r)} onChange={() => toggleReturnReason(r)} className="accent-pink-500" />
                                {r}
                              </label>
                            ))}
                          </div>
                          <div className="mt-2">
                            <div className="text-[13px] text-gray-500 mb-1">เพิ่มเติม (ถ้ามี)</div>
                            <textarea
                              value={extraNote}
                              onChange={(e) => setExtraNote(e.target.value)}
                              rows={2}
                              placeholder="รายละเอียดเพิ่มเติม..."
                              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[14px] outline-none focus:border-pink-400 resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={handleSaveDraft} disabled={saving} className="h-10 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[14px] font-medium disabled:opacity-50">
                        บันทึกแบบร่าง
                      </button>
                      <button type="button" onClick={() => handleSaveScore(true)} disabled={saving} className="h-10 px-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[14px] font-medium disabled:opacity-50">
                        ส่งกลับให้แก้ไข
                      </button>
                      <button type="button" onClick={() => handleSaveScore(releaseOnSave)} disabled={saving} className="h-10 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14px] font-semibold disabled:opacity-50">
                        {saving ? "กำลังบันทึก..." : "บันทึกคะแนน"}
                      </button>
                    </div>
                    <div className="text-[12.5px] text-gray-400 mt-2">ระบบจะบันทึกอัตโนมัติเมื่อมีการเปลี่ยนแปลง</div>
                  </div>
              </div>
                </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {groupModalRoster && (
        <GroupModal roster={groupModalRoster} onClose={() => setGroupModalRoster(null)} onConfirm={handleCreateGroup} />
      )}
    </div>
  );
}

function GroupModal({ roster, onClose, onConfirm }) {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const toggle = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredRoster = memberSearch.trim()
    ? roster.filter((r) => r.fullname.toLowerCase().includes(memberSearch.trim().toLowerCase()))
    : roster;

  const confirm = async () => {
    const name = groupName.trim();
    if (!name) { setError("ตั้งชื่อกลุ่มก่อนนะคะ"); return; }
    if (selectedIds.length === 0) { setError("เลือกสมาชิกอย่างน้อย 1 คน"); return; }
    setError("");
    setSaving(true);
    try {
      await onConfirm({ groupName: name, memberIds: selectedIds });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-105 max-w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-[16px] font-bold text-gray-900">สร้างกลุ่มใหม่</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-transparent">
            <FaTimes size={16} />
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto">
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ชื่อกลุ่ม</label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="เช่น กลุ่มที่ 1"
            autoFocus
            className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 mb-4 text-[14.5px] outline-none focus:border-pink-400"
          />

          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-gray-700">สมาชิก</label>
            {selectedIds.length > 0 && <span className="text-[12.5px] text-pink-600">เลือกแล้ว {selectedIds.length} คน</span>}
          </div>

          <div className="relative mb-2">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="ค้นหาชื่อนักเรียน"
              className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-[13.5px] outline-none focus:border-pink-400"
            />
          </div>

          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto rounded-xl border border-gray-100 p-2">
            {filteredRoster.length === 0 && (
              <div className="text-[13px] text-gray-400 text-center py-3">ไม่พบนักเรียนที่ตรงกัน</div>
            )}
            {filteredRoster.map((r) => (
              <label key={r.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[14px] text-gray-700 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggle(r.id)} className="w-4 h-4 accent-pink-500" />
                {r.fullname}
              </label>
            ))}
          </div>
          {error && <div className="mt-2 text-[12.5px] text-red-500">{error}</div>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14px] font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14px] font-semibold"
          >
            {saving ? "กำลังสร้าง..." : "สร้างกลุ่ม"}
          </button>
        </div>
      </div>
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
        <div className="text-[20px] font-bold text-gray-900">{value}</div>
        <div className="text-[12.5px] text-gray-500 truncate">{sub}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = status === "รอตรวจ" ? "bg-amber-50 text-amber-700" : status === "ตรวจแล้ว" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500";
  return <span className={`h-6 px-2.5 rounded-full text-[13px] font-medium inline-flex items-center ${cls}`}>{status}</span>;
}

function FilePreviewList({ files, submittedAt }) {
  const [lightbox, setLightbox] = useState(null);
  const sentLabel = submittedAt ? `ส่งเมื่อ ${formatShortDateTime(submittedAt)} น.` : null;

  return (
    <div className="divide-y divide-gray-100">
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          {f.kind === "pdf" ? <FaFilePdf className="text-red-400 shrink-0" size={16} /> : <FaFileAlt className="text-blue-400 shrink-0" size={16} />}
          <a
            href={resolveFileUrl(API_BASE, f.path)}
            target={f.kind === "image" ? undefined : "_blank"}
            rel={f.kind === "image" ? undefined : "noreferrer"}
            onClick={f.kind === "image" ? (e) => { e.preventDefault(); setLightbox(i); } : undefined}
            className="min-w-0 flex-1 truncate text-[14.5px] text-blue-600 hover:underline"
          >
            {f.name}
          </a>
          {sentLabel && <span className="text-[13.5px] text-gray-400 shrink-0">{sentLabel}</span>}
          <a href={resolveFileUrl(API_BASE, f.path)} download className="text-[14px] text-blue-600 hover:underline flex items-center gap-1.5 shrink-0">
            <FaDownload size={11} /> ดาวน์โหลด
          </a>
        </div>
      ))}

      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 text-white text-2xl bg-transparent">
            <FaTimes />
          </button>
          <img src={resolveFileUrl(API_BASE, files[lightbox].path)} className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

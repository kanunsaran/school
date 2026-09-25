import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  FaChevronLeft, FaChevronRight, FaSearch, FaFilePdf, FaFileAlt, FaDownload,
  FaEye, FaTimes, FaEdit,
} from "react-icons/fa";
import {
  getAssignmentById, getAssignmentFiles, getSubmissionsByAssignment, getStudent,
  getNotSubmitStudents, countSubmitted, updateSendAssScore,
} from "../callapi/callapi_user.jsx";
import { resolveFileUrl } from "../utils/media.js";
import { API_BASE, notAvailableYet } from "../utils/feedShared.js";
import {
  getWorkType, getGroups, addGroup,
  getSubmissionMeta, saveSubmissionMeta,
} from "../utils/submissionExtras.js";

const formatDateTime = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" });
};
const formatShortDateTime = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const initialOf = (fullname = "") => (fullname || "?").replace(/^(นางสาว|เด็กหญิง|เด็กชาย|นาย|นาง)\s*/u, "").charAt(0);
const PAGE_SIZE = 20;

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
  const [assignmentFiles, setAssignmentFiles] = useState([]);
  const [submissions, setSubmissions] = useState([]); // enriched send_ass rows for this assignment
  const [notSubmitted, setNotSubmitted] = useState([]);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  const [workType, setWorkTypeState] = useState("individual");
  const [groups, setGroupsState] = useState([]);

  const [selectedKey, setSelectedKey] = useState(null);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [reviewTab, setReviewTab] = useState("files");
  const [scoreInput, setScoreInput] = useState("");
  const [sameScoreForAll, setSameScoreForAll] = useState(true);
  const [memberScores, setMemberScores] = useState({});
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [comment, setComment] = useState("");
  const [releaseOnSave, setReleaseOnSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const a = await getAssignmentById(id);
      setAssignment(a);

      const f = await getAssignmentFiles(id).catch((err) => {
        console.error("โหลดไฟล์แนบไม่สำเร็จ:", err);
        return [];
      });
      setAssignmentFiles(f || []);

      const [allSubs, studentsAll] = await Promise.all([
        getSubmissionsByAssignment(id).catch((err) => { console.error("โหลดงานที่ส่งไม่สำเร็จ:", err); return []; }),
        getStudent().catch((err) => { console.error("โหลดรายชื่อนักเรียนไม่สำเร็จ:", err); return []; }),
      ]);

      const studentMap = {};
      (studentsAll || []).forEach((s) => { studentMap[String(s.user_id)] = s; });

      const mine = (allSubs || []).filter((s) => String(s.assignment_ass_id) === String(id));
      const enriched = mine.map((s) => ({
        ...s,
        fullname: studentMap[String(s.user_user_id)]?.fullname || `นักเรียน #${s.user_user_id}`,
      }));
      setSubmissions(enriched);
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

    setWorkTypeState(getWorkType(id));
    setGroupsState(getGroups(id));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  // ===== แถวในตาราง: งานเดี่ยว = 1 แถวต่อคน, งานกลุ่ม = สมาชิกในกลุ่มยุบเป็นแถวเดียว คนที่ยังไม่ได้จัดกลุ่มโชว์แยกเป็นรายคน =====
  const rows = useMemo(() => {
    const groupedUserIds = new Set(groups.flatMap((g) => g.member_user_ids.map(String)));
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

    if (workType !== "group" || groups.length === 0) {
      const individualRows = submissions.map((s) => ({
        key: `u-${s.user_user_id}`, kind: "individual", title: s.fullname,
        members: [s], submissions: [s], submittedAt: s.timestamp, score: effectiveScore(s),
      }));
      return [...individualRows, ...notSubmittedRows];
    }

    const groupRows = groups.map((g) => {
      const memberSubs = g.member_user_ids.map((uid) => byUserId.get(String(uid))).filter(Boolean);
      const submittedAt = memberSubs.length ? memberSubs.map((s) => s.timestamp).filter(Boolean).sort().slice(-1)[0] : null;
      const scores = memberSubs.map((s) => effectiveScore(s)).filter((n) => n != null);
      return {
        key: `g-${g.group_id}`, kind: "group", title: g.group_name, group: g,
        members: g.member_user_ids.map((uid) => byUserId.get(String(uid)) || { user_user_id: uid, fullname: studentFallback(uid, notSubmitted) }),
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
    รอตรวจ: rows.filter((r) => rowStatus(r) === "รอตรวจ").length,
    ตรวจแล้ว: rows.filter((r) => rowStatus(r) === "ตรวจแล้ว").length,
    ยังไม่ส่ง: rows.filter((r) => rowStatus(r) === "ยังไม่ส่ง").length,
  }), [rows]);

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

  // เปลี่ยนแถวที่เลือก -> รีเซ็ตฟอร์มให้คะแนนใหม่ตามข้อมูลจริงของแถวนั้น
  useEffect(() => {
    if (!selectedRow) return;
    const firstSub = selectedRow.submissions[0];
    setScoreInput(selectedRow.score != null ? String(selectedRow.score) : "");
    setSelectedMembers(selectedRow.members.map((m) => String(m.user_user_id)));
    setMemberScores(Object.fromEntries(selectedRow.submissions.map((s) => [String(s.user_user_id), effectiveScore(s) ?? ""])));
    const meta = firstSub ? getSubmissionMeta(firstSub.send_id) : { comment: "", isReleased: false, sameScoreForAll: true };
    setComment(meta.comment || "");
    setReleaseOnSave(!!meta.isReleased);
    setSameScoreForAll(meta.sameScoreForAll !== false);
    setReviewTab("files");
  }, [selectedRow?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const pooledFiles = useMemo(() => {
    if (!selectedRow) return [];
    return selectedRow.submissions
      .filter((s) => s.file_path)
      .map((s) => ({ path: s.file_path, name: fileNameOf(s.file_path), kind: classifyExt(s.file_path), fromUser: s.fullname }));
  }, [selectedRow]);

  const handleSaveScore = async (alsoRelease) => {
    if (!selectedRow || selectedRow.submissions.length === 0) {
      Swal.fire({ icon: "warning", title: "ยังไม่มีงานส่งเข้ามา", text: "ให้คะแนนไม่ได้เพราะยังไม่มีไฟล์ส่ง" });
      return;
    }
    setSaving(true);
    try {
      const targets = selectedRow.submissions.filter((s) => selectedMembers.includes(String(s.user_user_id)));
      await Promise.all(targets.map((s) => {
        const score = sameScoreForAll ? Number(scoreInput) : Number(memberScores[String(s.user_user_id)] ?? scoreInput);
        return updateSendAssScore(s.send_id, score);
      }));

      targets.forEach((s) => saveSubmissionMeta(s.send_id, { comment, isReleased: alsoRelease, sameScoreForAll }));

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
    selectedRow.submissions.forEach((s) => saveSubmissionMeta(s.send_id, { comment, isReleased: false, sameScoreForAll }));
    Swal.fire({ icon: "success", title: "บันทึกแบบร่างแล้ว", timer: 1000, showConfirmButton: false });
  };

  const handleManageGroups = async () => {
    const roster = [
      ...submissions.map((s) => ({ id: String(s.user_user_id), fullname: s.fullname })),
      ...notSubmitted.map((u) => ({ id: String(u.user_id ?? u.id), fullname: u.fullname || u.name })),
    ];
    if (roster.length === 0) {
      Swal.fire({ icon: "info", title: "ยังไม่มีรายชื่อนักเรียน", text: "ต้องมีคนส่งงานหรือมีรายชื่อที่ต้องส่งก่อนถึงจะจัดกลุ่มได้" });
      return;
    }
    const checkboxes = roster.map((r) => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;text-align:left;">
        <input type="checkbox" value="${r.id}" class="swal-group-member">${r.fullname}</label>`).join("");

    const { value: formValues } = await Swal.fire({
      title: "สร้างกลุ่มใหม่",
      html: `
        <input id="swal-group-name" class="swal2-input" placeholder="ชื่อกลุ่ม เช่น กลุ่มที่ 1">
        <div style="max-height:220px;overflow:auto;text-align:left;padding:0 6px;">${checkboxes}</div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "สร้างกลุ่ม",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#db2777",
      preConfirm: () => {
        const groupName = document.getElementById("swal-group-name").value.trim();
        const memberIds = Array.from(document.querySelectorAll(".swal-group-member:checked")).map((el) => el.value);
        if (!groupName) { Swal.showValidationMessage("ตั้งชื่อกลุ่มก่อนนะคะ"); return false; }
        if (memberIds.length === 0) { Swal.showValidationMessage("เลือกสมาชิกอย่างน้อย 1 คน"); return false; }
        return { groupName, memberIds };
      },
    });

    if (!formValues) return;
    const next = addGroup(id, formValues.groupName, formValues.memberIds);
    setGroupsState(next);
  };

  const isScheduled = assignment?.scheduled_at && new Date(assignment.scheduled_at) > new Date();

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 px-8 pt-24 pb-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-[12.5px] text-gray-400 hover:text-gray-600 bg-transparent border-none p-0"
        >
          งานในชั้นเรียน <span className="mx-1">›</span> <span className="text-gray-600">{assignment?.title || "…"}</span>
        </button>

        {loading ? (
          <div className="mt-10 text-center text-gray-500">กำลังโหลด...</div>
        ) : !assignment ? (
          <div className="mt-10 text-center text-red-500">ไม่พบงานนี้</div>
        ) : (
          <div className="mt-2 grid grid-cols-1 xl:grid-cols-2">
            {/* ===== LEFT: รายชื่อ/ตาราง ===== */}
            <div className="min-w-0 xl:pr-6 xl:border-r xl:border-gray-200">
              <h1 className="text-[22px] font-bold text-gray-900">{assignment.title}</h1>
              <div className="text-[13px] text-gray-500 mt-1">
                {assignment.deadline ? `กำหนดส่ง ${formatDateTime(assignment.deadline)}` : "ไม่มีกำหนดส่ง"}
                {isScheduled && <span className="ml-2 text-amber-600">(ยังไม่โพสต์ — ตั้งเวลาไว้)</span>}
              </div>

              {workType === "group" && (
                <button
                  type="button"
                  onClick={handleManageGroups}
                  className="mt-3 h-9 px-4 rounded-full border border-pink-200 bg-pink-50 text-pink-700 text-[12.5px] font-medium hover:bg-pink-100"
                >
                  + จัดกลุ่มนักเรียน
                </button>
              )}

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <MiniStatCard label="ทั้งหมด" value={totalAssigned} sub="คน" />
                <MiniStatCard label="ส่งแล้ว" value={submissions.length} sub="คน" valueClassName="text-emerald-600" />
                <MiniStatCard label="รอตรวจ" value={counts.รอตรวจ} sub="คน" valueClassName="text-amber-600" />
                <MiniStatCard label="ตรวจแล้ว" value={counts.ตรวจแล้ว} sub="คน" valueClassName="text-emerald-600" />
                <MiniStatCard label="ยังไม่ส่ง" value={counts.ยังไม่ส่ง} sub="คน" valueClassName="text-red-600" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="ค้นหาชื่อนักเรียน"
                    className="w-full h-10 rounded-full border border-gray-200 bg-white pl-9 pr-4 text-[13px] outline-none focus:border-pink-300"
                  />
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-[12.5px] outline-none">
                  <option value="newest">ส่งล่าสุดก่อน</option>
                  <option value="oldest">ส่งเก่าสุดก่อน</option>
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {["ทั้งหมด", "รอตรวจ", "ตรวจแล้ว", "ยังไม่ส่ง"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setActiveTab(t); setPage(1); }}
                    className={`h-8 px-3.5 rounded-full border text-[12.5px] font-medium ${
                      activeTab === t ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t} ({t === "ทั้งหมด" ? counts.ทั้งหมด : counts[t]})
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-gray-400 text-[11.5px] border-b border-gray-100 bg-gray-50">
                      <th className="py-2.5 px-3 font-medium">นักเรียน / กลุ่ม</th>
                      <th className="py-2.5 px-3 font-medium">เวลาส่ง</th>
                      <th className="py-2.5 px-3 font-medium">คะแนน</th>
                      <th className="py-2.5 px-3 font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-gray-400 py-10">ไม่มีรายการในตัวกรองนี้</td></tr>
                    ) : (
                      pagedRows.map((row) => {
                        const status = rowStatus(row);
                        const isSelected = selectedRow?.key === row.key;
                        return (
                          <tr
                            key={row.key}
                            onClick={() => setSelectedKey(row.key)}
                            className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-pink-50" : "hover:bg-gray-50"}`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={isSelected} onChange={() => setSelectedKey(row.key)} onClick={(e) => e.stopPropagation()} className="accent-pink-500" />
                                <div className="flex -space-x-2 shrink-0">
                                  {row.members.slice(0, 3).map((m) => (
                                    <div key={m.user_user_id} className="w-7 h-7 rounded-full bg-pink-400 text-white text-[10.5px] font-semibold flex items-center justify-center border-2 border-white">
                                      {initialOf(m.fullname)}
                                    </div>
                                  ))}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-gray-900 font-medium truncate">{row.kind === "group" ? `${row.title} (${row.members.length} คน)` : row.title}</div>
                                  {row.kind === "group" && <div className="text-[11px] text-gray-400 truncate">{row.members.map((m) => m.fullname).join(", ")}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{row.submittedAt ? formatShortDateTime(row.submittedAt) : "-"}</td>
                            <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">{row.score != null ? row.score : "-"} / {assignment.max_score ?? "-"}</td>
                            <td className="py-2.5 px-3">
                              <StatusBadge status={status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

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
                      className={`w-8 h-8 rounded-lg border text-[12.5px] ${p === page ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-600"}`}
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

            {/* ===== RIGHT: รายละเอียดงาน + ตรวจ/ให้คะแนน ===== */}
            <div className="xl:pl-6">
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-gray-900">รายละเอียดงาน</div>
                  <button type="button" onClick={() => notAvailableYet("แก้ไขงาน")} className="text-[12px] text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-transparent">
                    <FaEdit size={11} /> แก้ไขงาน
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-[12.5px]">
                  <div><div className="text-gray-400">หัวข้องาน</div><div className="text-gray-900 font-medium truncate">{assignment.title}</div></div>
                  <div><div className="text-gray-400">กำหนดส่ง</div><div className="text-gray-900 font-medium">{assignment.deadline ? formatShortDateTime(assignment.deadline) : "-"}</div></div>
                  <div><div className="text-gray-400">คะแนนเต็ม</div><div className="text-gray-900 font-medium">{assignment.max_score ?? "-"} คะแนน</div></div>
                </div>

                {assignment.description && (
                  <div className="mt-3 text-[13px] text-gray-700">
                    <div className={descExpanded ? "" : "line-clamp-2"} dangerouslySetInnerHTML={{ __html: assignment.description }} />
                    <button type="button" onClick={() => setDescExpanded((v) => !v)} className="text-pink-600 text-[12px] mt-1 bg-transparent">
                      {descExpanded ? "ย่อ" : "ดูเพิ่มเติม"}
                    </button>
                  </div>
                )}

                {assignmentFiles.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {assignmentFiles.map((f) => (
                      <a key={f.file_id} href={resolveFileUrl(API_BASE, f.file_path || f.file_url)} target="_blank" rel="noreferrer" className="text-[12.5px] text-blue-600 hover:underline inline-flex items-center gap-1.5">
                        📎 {f.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {!selectedRow ? (
                <div className="mt-5 rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400 text-[13px]">
                  เลือกนักเรียนหรือกลุ่มจากตารางด้านซ้ายเพื่อตรวจงาน
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-2 shrink-0">
                        {selectedRow.members.slice(0, 4).map((m) => (
                          <div key={m.user_user_id} className="w-8 h-8 rounded-full bg-pink-400 text-white text-[11px] font-semibold flex items-center justify-center border-2 border-white">
                            {initialOf(m.fullname)}
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {selectedRow.kind === "group" ? `${selectedRow.title} (${selectedRow.members.length} คน)` : selectedRow.title}
                        </div>
                        {selectedRow.kind === "group" && <div className="text-[11.5px] text-gray-400 truncate">{selectedRow.members.map((m) => m.fullname).join(", ")}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" disabled={selectedIndex <= 0} onClick={() => setSelectedKey(filteredRows[selectedIndex - 1]?.key)} className="w-8 h-8 rounded-full border border-gray-200 disabled:opacity-30 flex items-center justify-center bg-white">
                        <FaChevronLeft size={11} />
                      </button>
                      <button type="button" disabled={selectedIndex >= filteredRows.length - 1} onClick={() => setSelectedKey(filteredRows[selectedIndex + 1]?.key)} className="w-8 h-8 rounded-full border border-gray-200 disabled:opacity-30 flex items-center justify-center bg-white">
                        <FaChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                  {selectedRow.submittedAt && <div className="text-[11.5px] text-gray-400 mt-1">ส่งเมื่อ {formatShortDateTime(selectedRow.submittedAt)} น.</div>}

                  <div className="mt-4 flex gap-1 border-b border-gray-100">
                    {[
                      { key: "files", label: "ไฟล์ที่ส่ง" },
                      { key: "comments", label: "ความคิดเห็นนักเรียน" },
                      { key: "history", label: "ประวัติการส่ง" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setReviewTab(t.key)}
                        className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px ${reviewTab === t.key ? "border-pink-500 text-pink-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {reviewTab === "files" && (
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div>
                        {pooledFiles.length === 0 ? (
                          <div className="text-[12.5px] text-gray-400 py-6 text-center rounded-xl border border-dashed border-gray-200">ยังไม่มีงานส่งเข้ามา</div>
                        ) : (
                          <FilePreviewList files={pooledFiles} />
                        )}
                      </div>

                      <div>
                        <div className="text-[13px] font-semibold text-gray-900 mb-2">ให้คะแนน</div>

                        {selectedRow.kind === "group" && (
                          <label className="flex items-center gap-2 text-[12.5px] text-gray-700 mb-2">
                            <input type="checkbox" checked={sameScoreForAll} onChange={(e) => setSameScoreForAll(e.target.checked)} className="accent-pink-500" />
                            ให้คะแนนทุกคนเท่ากัน
                          </label>
                        )}

                        {sameScoreForAll || selectedRow.kind === "individual" ? (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min="0" max={assignment.max_score ?? undefined}
                                value={scoreInput} onChange={(e) => setScoreInput(e.target.value)}
                                className="w-24 h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-center outline-none focus:border-pink-400"
                              />
                              <span className="text-[13px] text-gray-500">/ {assignment.max_score ?? "-"}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {quickScoreOptions(assignment.max_score).map((n) => (
                                <button key={n} type="button" onClick={() => setScoreInput(String(n))} className={`h-8 px-3 rounded-full border text-[12.5px] ${String(n) === scoreInput ? "border-pink-400 bg-pink-50 text-pink-700 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {selectedRow.submissions.map((s) => (
                              <div key={s.send_id} className="flex items-center justify-between gap-2">
                                <span className="text-[12.5px] text-gray-700 truncate">{s.fullname}</span>
                                <input
                                  type="number" min="0" max={assignment.max_score ?? undefined}
                                  value={memberScores[String(s.user_user_id)] ?? ""}
                                  onChange={(e) => setMemberScores((prev) => ({ ...prev, [String(s.user_user_id)]: e.target.value }))}
                                  className="w-16 h-9 rounded-lg border border-gray-200 bg-gray-50 px-2 text-center text-[12.5px] outline-none focus:border-pink-400"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedRow.kind === "group" && (
                          <div className="mt-4">
                            <div className="text-[11.5px] text-gray-400 mb-1.5">ให้คะแนนเฉพาะนักเรียน (ตัวเลือก) — เลือกคนที่ต้องการให้คะแนน (ถ้าไม่เลือก จะไม่ได้คะแนนทั้งกลุ่ม)</div>
                            <div className="flex flex-col gap-1">
                              {selectedRow.members.map((m) => (
                                <label key={m.user_user_id} className="flex items-center gap-2 text-[12.5px] text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(String(m.user_user_id))}
                                    onChange={(e) => setSelectedMembers((prev) => e.target.checked ? [...prev, String(m.user_user_id)] : prev.filter((id) => id !== String(m.user_user_id)))}
                                    className="accent-pink-500"
                                  />
                                  {m.fullname}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {reviewTab === "comments" && (
                    <div className="mt-4 text-[12.5px] text-gray-400 py-8 text-center rounded-xl border border-dashed border-gray-200">
                      ยังไม่มีระบบความคิดเห็นจากนักเรียนตอนนี้ (backend ยังไม่มีตารางรองรับ)
                    </div>
                  )}

                  {reviewTab === "history" && (
                    <div className="mt-4 text-[12.5px] text-gray-400 py-8 text-center rounded-xl border border-dashed border-gray-200">
                      ยังไม่มีระบบเก็บประวัติการส่งหลายครั้งตอนนี้ (backend ยังไม่มีตารางรองรับ)
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="text-[13px] font-semibold text-gray-900 mb-1.5">ความคิดเห็นของครู</div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      placeholder="เขียนความคิดเห็นถึงนักเรียน..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] outline-none focus:border-pink-400 resize-none"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[12.5px] text-gray-600">ส่งกลับให้นักเรียน</span>
                    <button
                      type="button"
                      onClick={() => setReleaseOnSave((v) => !v)}
                      style={{ padding: 0, border: "none" }}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${releaseOnSave ? "bg-pink-500" : "bg-gray-300"}`}
                    >
                      {/* ใช้ left แบบ inline ตรงๆ แทน translate-x-* ของ Tailwind เพราะ v4 คำนวณตำแหน่งผิดในเคสนี้ (ค้างอยู่กลางๆ ไม่ขยับตามสถานะ) */}
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                        style={{ left: releaseOnSave ? "22px" : "2px" }}
                      />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={handleSaveDraft} disabled={saving} className="h-10 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12.5px] font-medium disabled:opacity-50">
                      บันทึกแบบร่าง
                    </button>
                    <button type="button" onClick={() => handleSaveScore(true)} disabled={saving} className="h-10 px-4 rounded-xl border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 text-[12.5px] font-medium disabled:opacity-50">
                      ส่งกลับพร้อมความคิดเห็น
                    </button>
                    <button type="button" onClick={() => handleSaveScore(releaseOnSave)} disabled={saving} className="h-10 px-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[12.5px] font-semibold disabled:opacity-50">
                      {saving ? "กำลังบันทึก..." : "บันทึกคะแนน"}
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[12.5px]">
                    <button type="button" disabled={selectedIndex <= 0} onClick={() => setSelectedKey(filteredRows[selectedIndex - 1]?.key)} className="text-gray-500 hover:text-gray-800 disabled:opacity-30 bg-transparent">
                      ‹ งานก่อนหน้า
                    </button>
                    <span className="text-gray-400">{selectedIndex + 1} จาก {filteredRows.length} งาน</span>
                    <button type="button" disabled={selectedIndex >= filteredRows.length - 1} onClick={() => setSelectedKey(filteredRows[selectedIndex + 1]?.key)} className="text-pink-600 hover:text-pink-800 disabled:opacity-30 bg-transparent">
                      งานถัดไป ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function studentFallback(uid, notSubmitted) {
  const found = (notSubmitted || []).find((u) => String(u.user_id ?? u.id) === String(uid));
  return found?.fullname || found?.name || `นักเรียน #${uid}`;
}

function MiniStatCard({ label, value, sub, valueClassName = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`text-[20px] font-bold mt-0.5 ${valueClassName}`}>{value}</div>
      <div className="text-[10.5px] text-gray-400">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = status === "รอตรวจ" ? "bg-amber-50 text-amber-700" : status === "ตรวจแล้ว" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500";
  return <span className={`h-6 px-2.5 rounded-full text-[11.5px] font-medium inline-flex items-center ${cls}`}>{status}</span>;
}

function FilePreviewList({ files }) {
  const [lightbox, setLightbox] = useState(null);
  const primary = files.find((f) => f.kind === "pdf") || files.find((f) => f.kind === "other");
  const images = files.filter((f) => f.kind === "image");
  const others = files.filter((f) => f !== primary && f.kind === "other");

  return (
    <div className="flex flex-col gap-4">
      {primary && (
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 min-w-0">
            {primary.kind === "pdf" ? <FaFilePdf className="text-red-500 shrink-0" size={20} /> : <FaFileAlt className="text-blue-500 shrink-0" size={20} />}
            <span className="text-[13px] text-gray-800 truncate">{primary.name}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <a href={resolveFileUrl(API_BASE, primary.path)} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-lg bg-pink-50 text-pink-700 text-[12px] font-medium flex items-center gap-1.5">
              <FaEye size={11} /> ดูตัวอย่าง
            </a>
            <a href={resolveFileUrl(API_BASE, primary.path)} download className="h-9 px-3 rounded-lg border border-gray-200 text-gray-600 text-[12px] font-medium flex items-center gap-1.5">
              <FaDownload size={11} /> ดาวน์โหลด
            </a>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div>
          <div className="text-[12px] text-gray-500 mb-2">รูปภาพประกอบ ({images.length})</div>
          <div className="flex gap-2 flex-wrap">
            {images.map((f, i) => (
              <button key={i} type="button" onClick={() => setLightbox(i)} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-transparent p-0">
                <img src={resolveFileUrl(API_BASE, f.path)} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <div className="text-[12px] text-gray-500 mb-2">ไฟล์อื่นๆ</div>
          <div className="flex flex-col gap-1.5">
            {others.map((f, i) => (
              <a key={i} href={resolveFileUrl(API_BASE, f.path)} download className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50">
                <span className="truncate">{f.name}</span>
                <FaDownload size={11} className="text-gray-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 text-white text-2xl bg-transparent">
            <FaTimes />
          </button>
          <img src={resolveFileUrl(API_BASE, images[lightbox].path)} className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

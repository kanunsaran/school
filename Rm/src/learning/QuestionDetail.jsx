import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import SidebarNav from "../nav.jsx";
import PageLoading from "../components/PageLoading.jsx";
import Header from "../Header";
import {
  FaChevronLeft, FaChevronRight, FaSearch, FaPaperclip,
  FaUserFriends, FaClipboardCheck, FaRegClock, FaUserCheck, FaTimesCircle,
} from "react-icons/fa";
import {
  getAssignmentById, getAssignmentFiles, getSubmissionsByAssignment, getStudent,
  getNotSubmitStudents, countSubmitted, updateSendAssScore, updateSubmissionComment,
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
  { value: "newest", label: "ตอบล่าสุดก่อน" },
  { value: "oldest", label: "ตอบเก่าสุดก่อน" },
];

const COMMENT_CHIPS = ["ดีมาก 👍", "เพิ่มรายละเอียด", "เนื้อหาครบถ้วน", "จัดรูปแบบดี"];

function effectiveScore(sub) {
  return sub ? sub.score : null;
}
// ปุ่มลัดให้คะแนน — ไล่จากคะแนนเต็มลงมา 4 ค่า แล้วปิดท้ายด้วย 0 เสมอ
function quickScoreOptions(maxScore) {
  const max = Number(maxScore);
  if (!Number.isFinite(max) || max <= 0) return [0];
  const top = [max, max - 1, max - 2, max - 3].filter((n) => n > 0);
  return [...new Set([...top, 0])];
}

// ⚠️ "คำถาม" คือแถวในตาราง assignment/send_ass เดิม (ไม่มีตารางแยก) — คำตอบพิมพ์ของนักเรียนเก็บอยู่ใน
// send_ass.file_path (ตรงๆ เป็นข้อความ ไม่ใช่ path ไฟล์จริง) หน้านี้เลย render เป็น text อย่างเดียว ไม่ผ่านตัวแสดงไฟล์แนบ
export default function QuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const hasScore = assignment ? !!assignment.has_score : true;
  const [questionFiles, setQuestionFiles] = useState([]); // สื่อที่ครูแนบไว้ตอนตั้งคำถาม
  const [submissions, setSubmissions] = useState([]);
  const [notSubmitted, setNotSubmitted] = useState([]);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedKey, setSelectedKey] = useState(null);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [scoreInput, setScoreInput] = useState("");
  const [comment, setComment] = useState("");
  const [releaseOnSave, setReleaseOnSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, files] = await Promise.all([
        getAssignmentById(id),
        getAssignmentFiles(id).catch(() => []),
      ]);
      setAssignment(a);
      setQuestionFiles(files || []);

      const [allSubs, studentsAll] = await Promise.all([
        getSubmissionsByAssignment(id).catch((err) => { console.error("โหลดคำตอบไม่สำเร็จ:", err); return []; }),
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
      console.error("โหลดรายละเอียดคำถามไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }

    try {
      const [ns, sc] = await Promise.all([getNotSubmitStudents(id), countSubmitted(id)]);
      setNotSubmitted(ns || []);
      setTotalAssigned((sc || 0) + (ns || []).length);
    } catch (err) {
      console.error("โหลดรายชื่อผู้ที่ยังไม่ตอบไม่สำเร็จ:", err);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const rows = useMemo(() => {
    const individualRows = submissions.map((s) => ({
      key: `u-${s.user_user_id}`, title: s.fullname,
      members: [s], submissions: [s], submittedAt: s.timestamp, score: effectiveScore(s),
    }));
    const notSubmittedRows = (notSubmitted || []).map((u) => {
      const uid = u.user_id ?? u.id;
      return {
        key: `ns-${uid}`, title: u.fullname || u.name || `นักเรียน #${uid}`,
        members: [{ user_user_id: uid, fullname: u.fullname || u.name }], submissions: [], submittedAt: null, score: null,
      };
    });
    return [...individualRows, ...notSubmittedRows];
  }, [submissions, notSubmitted]);

  const rowStatus = (row) => {
    if (row.submissions.length === 0) return "ยังไม่ตอบ";
    if (!hasScore) return "ตอบแล้ว";
    return row.score != null ? "ตรวจแล้ว" : "รอตรวจ";
  };

  const counts = useMemo(() => ({
    ทั้งหมด: rows.length,
    ตอบแล้ว: rows.filter((r) => r.submissions.length > 0).length,
    รอตรวจ: rows.filter((r) => rowStatus(r) === "รอตรวจ").length,
    ตรวจแล้ว: rows.filter((r) => rowStatus(r) === "ตรวจแล้ว").length,
    ยังไม่ตอบ: rows.filter((r) => rowStatus(r) === "ยังไม่ตอบ").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rows, hasScore]);
  const pctOf = (n) => (rows.length > 0 ? Math.round((n / rows.length) * 100) : 0);

  const TABS = hasScore ? ["ทั้งหมด", "รอตรวจ", "ตรวจแล้ว", "ยังไม่ตอบ"] : ["ทั้งหมด", "ตอบแล้ว", "ยังไม่ตอบ"];

  const filteredRows = useMemo(() => {
    let list = rows.filter((r) => (activeTab === "ทั้งหมด" ? true : rowStatus(r) === activeTab));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return sortBy === "newest" ? bt - at : at - bt;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, activeTab, search, sortBy, hasScore]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedRow = useMemo(() => filteredRows.find((r) => r.key === selectedKey) || filteredRows[0] || null, [filteredRows, selectedKey]);
  const selectedIndex = selectedRow ? filteredRows.findIndex((r) => r.key === selectedRow.key) : -1;

  useEffect(() => {
    if (!selectedRow) return;
    const firstSub = selectedRow.submissions[0];
    setScoreInput(selectedRow.score != null ? String(selectedRow.score) : "");
    setComment(firstSub?.teacher_comment || "");
    setReleaseOnSave(!!firstSub?.is_released);
  }, [selectedRow?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const insertToComment = (text) => setComment((prev) => (prev.trim() ? `${prev}\n${text}` : text));

  const handleSaveScore = async (alsoRelease) => {
    if (!selectedRow || selectedRow.submissions.length === 0) {
      Swal.fire({ icon: "warning", title: "ยังไม่มีคำตอบส่งเข้ามา", text: "ให้คะแนนไม่ได้เพราะนักเรียนยังไม่ได้ตอบ" });
      return;
    }

    const sub = selectedRow.submissions[0];
    const maxScore = assignment.max_score != null ? Number(assignment.max_score) : null;
    const score = Number(scoreInput);
    if (String(scoreInput).trim() === "" || Number.isNaN(score)) {
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

    setSaving(true);
    try {
      await updateSendAssScore(sub.send_id, score);
      await updateSubmissionComment(sub.send_id, { teacher_comment: comment.trim(), is_released: alsoRelease });
      await load();
      Swal.fire({ icon: "success", title: alsoRelease ? "ส่งกลับให้นักเรียนแล้ว" : "บันทึกคะแนนแล้ว", timer: 1300, showConfirmButton: false });
    } catch (err) {
      console.error("บันทึกคะแนนไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "บันทึกคะแนนไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
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
          <div className="mt-10 text-center text-red-500">ไม่พบคำถามนี้</div>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center h-7 px-3 rounded-full bg-purple-50 text-purple-700 text-[13.5px] font-medium shrink-0">
                ❓ คำถาม
              </span>
              <h1 className="page-title">{assignment.title}</h1>
            </div>

            {assignment.description && (
              <div className="mt-3 text-[14.5px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: assignment.description }} />
            )}

            {questionFiles.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {questionFiles.map((f, i) => (
                  <a
                    key={f.file_id ?? i}
                    href={resolveFileUrl(API_BASE, f.file_path || f.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[14px] text-blue-600 hover:underline"
                  >
                    <FaPaperclip size={12} className="shrink-0" /> {f.file_name}
                  </a>
                ))}
              </div>
            )}

            {/* ===== Stat cards ===== */}
            <div className={`mt-4 grid grid-cols-2 sm:grid-cols-3 ${hasScore ? "lg:grid-cols-5" : "lg:grid-cols-3"} gap-4`}>
              <StatCard icon={FaUserFriends} cardCls="bg-pink-50" iconCls="bg-pink-100 text-pink-600" label="นักเรียนทั้งหมด" value={`${totalAssigned} คน`} sub="นักเรียนทั้งหมด" />
              <StatCard icon={FaClipboardCheck} cardCls="bg-emerald-50" iconCls="bg-emerald-100 text-emerald-600" label="ตอบแล้ว" value={`${counts.ตอบแล้ว} คน`} sub={`${pctOf(counts.ตอบแล้ว)}% ของทั้งหมด`} />
              {hasScore && (
                <>
                  <StatCard icon={FaRegClock} cardCls="bg-amber-50" iconCls="bg-amber-100 text-amber-600" label="รอตรวจ" value={`${counts.รอตรวจ} คน`} sub={`${pctOf(counts.รอตรวจ)}% ของทั้งหมด`} />
                  <StatCard icon={FaUserCheck} cardCls="bg-purple-50" iconCls="bg-purple-100 text-purple-600" label="ตรวจแล้ว" value={`${counts.ตรวจแล้ว} คน`} sub={`${pctOf(counts.ตรวจแล้ว)}% ของทั้งหมด`} />
                </>
              )}
              <StatCard icon={FaTimesCircle} cardCls="bg-red-50" iconCls="bg-red-100 text-red-600" label="ยังไม่ตอบ" value={`${counts.ยังไม่ตอบ} คน`} sub={`${pctOf(counts.ยังไม่ตอบ)}% ของทั้งหมด`} />
            </div>

            {/* ===== ตัวกรอง ===== */}
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
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setActiveTab(t); setPage(1); }}
                    className={`h-10 px-3.5 rounded-full border text-[14px] font-medium ${
                      activeTab === t ? "bg-pink-500 border-pink-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t} ({counts[t]})
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
                    <div className={`grid ${hasScore ? "grid-cols-[1fr_84px_100px]" : "grid-cols-[1fr_100px]"} gap-3 pb-2 text-[13px] font-medium text-gray-400 border-b border-gray-200`}>
                      <div>ชื่อ-นามสกุล</div>
                      {hasScore && <div className="text-center">คะแนน</div>}
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
                              className={`w-full grid ${hasScore ? "grid-cols-[1fr_84px_100px]" : "grid-cols-[1fr_100px]"} items-center gap-3 py-3 text-left bg-transparent xl:pr-6`}
                            >
                              <div className="min-w-0 flex items-center gap-2.5">
                                <div className="w-8 h-8 shrink-0 rounded-full bg-pink-400 text-white text-[12.5px] font-semibold flex items-center justify-center">
                                  {initialOf(row.members[0]?.fullname)}
                                </div>
                                <span className="truncate text-[14.5px] text-gray-900">{row.title}</span>
                              </div>
                              {hasScore && <div className="text-[14.5px] text-gray-700 text-center">{row.score != null ? `${row.score} / ${assignment.max_score ?? "-"}` : "-"}</div>}
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

              {/* ===== ขวา: คำตอบของนักเรียน + (ถ้ามีคะแนน) ให้คะแนน ===== */}
              <div className="min-w-0 flex flex-col gap-5">
                {!selectedRow ? (
                  <div className="py-10 text-center text-gray-400 text-[14.5px]">
                    เลือกนักเรียนจากรายชื่อด้านซ้ายเพื่อดูคำตอบ
                  </div>
                ) : (
                <div className="flex flex-col">
                  <div>
                    <div className="text-[14.5px] font-semibold text-gray-900 mb-3">คำตอบของนักเรียน</div>
                    {selectedRow.submissions.length === 0 ? (
                      <div className="text-[14px] text-gray-400 py-6 text-center">ยังไม่มีคำตอบส่งเข้ามา</div>
                    ) : (
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5">
                        <div className="text-[14.5px] text-gray-800 whitespace-pre-line leading-relaxed">
                          {selectedRow.submissions[0].file_path || "(ไม่มีข้อความคำตอบ)"}
                        </div>
                        {selectedRow.submittedAt && (
                          <div className="mt-2 text-[13px] text-gray-400">ตอบเมื่อ {formatShortDateTime(selectedRow.submittedAt)} น.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {hasScore && (
                    <div className="min-w-0">
                      <div className="pt-5 mt-5 border-t border-gray-100 flex flex-col">
                        <div className="text-[14.5px] font-semibold text-gray-900 mb-3">ให้คะแนน</div>

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
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[14.5px] font-medium text-gray-700">ส่งกลับให้นักเรียนทันที</span>
                          <button
                            type="button"
                            onClick={() => setReleaseOnSave((v) => !v)}
                            style={{ padding: 0, border: "none" }}
                            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${releaseOnSave ? "bg-pink-500" : "bg-gray-300"}`}
                          >
                            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: releaseOnSave ? "22px" : "2px" }} />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleSaveScore(releaseOnSave)} disabled={saving} className="h-10 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14px] font-semibold disabled:opacity-50">
                            {saving ? "กำลังบันทึก..." : "บันทึกคะแนน"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
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
  const cls = status === "รอตรวจ" ? "bg-amber-50 text-amber-700" : (status === "ตรวจแล้ว" || status === "ตอบแล้ว") ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500";
  return <span className={`h-6 px-2.5 rounded-full text-[13px] font-medium inline-flex items-center ${cls}`}>{status}</span>;
}

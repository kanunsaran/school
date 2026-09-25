import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import PageLoading from "../../components/PageLoading.jsx";
import {
  FaChevronLeft, FaPaperclip, FaCloudUploadAlt, FaTrash, FaFilePdf, FaFileImage, FaFileAlt,
  FaCheckCircle, FaHourglassHalf, FaExclamationCircle, FaUsers, FaCommentDots,
} from "react-icons/fa";
import {
  getAssAll, getAssignmentById, getAssignmentFiles, getChapters, getAllSubmissions, getSubmissionFiles,
  getSubmissionGroups, createSubmission, uploadSubmissionFiles, deleteSubmission, getAssignmentClasses,
} from "../../callapi/callapi_user.jsx";
import { API_BASE, CURRENT_TEACHER } from "../../utils/feedShared.js";
import { resolveFileUrl } from "../../utils/media.js";

// ⚠️ ยังไม่มีระบบ login จริง ใช้ user_id placeholder เดียวกับหน้านักเรียนอื่น (StudentPortfolio.jsx, yc1.jsx) รอทำ auth จริงค่อยเปลี่ยน
const CURRENT_STUDENT_ID = "1";

const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function classifyExt(path = "") {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}
function fileNameOf(path = "") {
  return decodeURIComponent(path.split("/").pop() || path);
}
function FileIcon({ kind }) {
  if (kind === "image") return <FaFileImage className="text-purple-400" size={14} />;
  if (kind === "pdf") return <FaFilePdf className="text-red-400" size={14} />;
  return <FaFileAlt className="text-gray-400" size={14} />;
}

export default function StudentWorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [assignmentFiles, setAssignmentFiles] = useState([]);
  const [chapter, setChapter] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pendingFiles, setPendingFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [addMoreFiles, setAddMoreFiles] = useState([]);
  const [addingMore, setAddingMore] = useState(false);
  const [gradeId, setGradeId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [assData, allAssData, filesData, chapterData, subData, groupData, classLinks] = await Promise.all([
        getAssignmentById(id).catch(() => null),
        getAssAll().catch(() => []),
        getAssignmentFiles(id).catch(() => []),
        getChapters().catch(() => []),
        getAllSubmissions().catch(() => []),
        getSubmissionGroups(id).catch(() => []),
        getAssignmentClasses({ ass_id: id }).catch(() => []),
      ]);
      setGradeId((classLinks || [])[0]?.grade_id ?? null);
      // GET /assignment/:id ไม่คืน create_at กลับมา ต้องหยิบจาก list endpoint แทน
      const createAt = (allAssData || []).find((a) => String(a.ass_id) === String(id))?.create_at || null;
      setAssignment(assData ? { ...assData, create_at: createAt } : null);
      setAssignmentFiles(filesData || []);
      setChapter((chapterData || []).find((c) => String(c.chapter_id) === String(assData?.chapter_chapter_id)) || null);
      setGroups(groupData || []);

      const mine = (subData || []).find((s) => String(s.assignment_ass_id) === String(id) && String(s.user_user_id) === String(CURRENT_STUDENT_ID));
      setMySubmission(mine || null);
      if (mine) {
        const files = await getSubmissionFiles(mine.send_id).catch(() => []);
        setSubmissionFiles(files || []);
      } else {
        setSubmissionFiles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const myGroup = useMemo(
    () => groups.find((g) => (g.members || []).some((m) => String(m.user_user_id) === String(CURRENT_STUDENT_ID))) || null,
    [groups]
  );

  const deadline = assignment?.deadline ? new Date(assignment.deadline) : null;
  const now = new Date();
  const deadlinePassed = deadline ? now > deadline : false;

  let statusKey = "not_submitted";
  if (mySubmission) {
    const submittedLate = deadline && new Date(mySubmission.created_at) > deadline;
    const reviewed = mySubmission.is_released && (mySubmission.score !== null || mySubmission.teacher_comment);
    statusKey = reviewed ? "reviewed" : submittedLate ? "late" : "submitted";
  } else if (deadlinePassed) {
    statusKey = "overdue";
  }

  const STATUS_META = {
    not_submitted: { label: "ยังไม่ได้ส่ง", cls: "bg-amber-50 text-amber-700", icon: FaHourglassHalf },
    overdue: { label: "เลยกำหนดส่ง", cls: "bg-red-50 text-red-700", icon: FaExclamationCircle },
    submitted: { label: "ส่งแล้ว", cls: "bg-emerald-50 text-emerald-700", icon: FaCheckCircle },
    late: { label: "ส่งล่าช้า", cls: "bg-orange-50 text-orange-700", icon: FaExclamationCircle },
    reviewed: { label: "ตรวจแล้ว", cls: "bg-green-50 text-green-700", icon: FaCheckCircle },
  };
  const meta = STATUS_META[statusKey];
  const StatusIcon = meta.icon;

  const pooledFiles = useMemo(() => {
    if (submissionFiles.length > 0) {
      return submissionFiles.map((f) => ({ path: f.file_url, name: f.file_name, kind: classifyExt(f.file_name) }));
    }
    if (mySubmission?.file_path) {
      return [{ path: mySubmission.file_path, name: fileNameOf(mySubmission.file_path), kind: classifyExt(mySubmission.file_path) }];
    }
    return [];
  }, [submissionFiles, mySubmission]);

  const handleSubmit = async () => {
    if (deadlinePassed) {
      Swal.fire({ icon: "warning", title: "เลยกำหนดส่งแล้ว", text: "ไม่สามารถส่งงานนี้ได้" });
      return;
    }
    if (pendingFiles.length === 0) {
      Swal.fire({ icon: "warning", title: "กรุณาแนบไฟล์ก่อนส่งงาน" });
      return;
    }
    if (assignment.work_type === "group" && !myGroup) {
      Swal.fire({ icon: "warning", title: "ยังไม่ได้ถูกจัดกลุ่มสำหรับงานนี้", text: "กรุณาติดต่อครูผู้สอนให้จัดกลุ่มก่อนส่งงาน" });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createSubmission({
        assignment_ass_id: id,
        user_user_id: CURRENT_STUDENT_ID,
        file_path: pendingFiles[0].name,
        group_id: myGroup?.group_id || null,
      });
      await uploadSubmissionFiles(created.send_id, pendingFiles);
      setPendingFiles([]);
      await load();
      Swal.fire({ icon: "success", title: "ส่งงานเรียบร้อยแล้ว", timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "ส่งงานไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMore = async () => {
    if (!mySubmission || addMoreFiles.length === 0) return;
    if (deadlinePassed) {
      Swal.fire({ icon: "warning", title: "เลยกำหนดส่งแล้ว", text: "ไม่สามารถเพิ่มไฟล์ได้" });
      return;
    }
    setSubmitting(true);
    try {
      await uploadSubmissionFiles(mySubmission.send_id, addMoreFiles);
      setAddMoreFiles([]);
      setAddingMore(false);
      await load();
      Swal.fire({ icon: "success", title: "เพิ่มไฟล์เรียบร้อยแล้ว", timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "เพิ่มไฟล์ไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmission = async () => {
    if (!mySubmission) return;
    const isReviewed = mySubmission.is_released && (mySubmission.score !== null || mySubmission.teacher_comment);
    if (isReviewed) {
      Swal.fire({ icon: "warning", title: "ยกเลิกไม่ได้แล้ว", text: "ครูให้คะแนน/ความเห็นงานนี้ไปแล้ว" });
      return;
    }
    const result = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกการส่งงานนี้?",
      text: "ไฟล์ที่ส่งไว้ทั้งหมดจะถูกลบออก และต้องส่งงานใหม่อีกครั้ง",
      showCancelButton: true,
      confirmButtonText: "ยกเลิกการส่ง",
      cancelButtonText: "ไม่ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSubmission(mySubmission.send_id);
      await load();
    } catch {
      Swal.fire({ icon: "error", title: "ยกเลิกไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex text-[15.5px] text-gray-900">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Header />
          <main className="w-full px-6 md:px-8 pt-24 pb-10"><PageLoading /></main>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-white flex text-[15.5px] text-gray-900">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Header />
          <main className="w-full px-6 md:px-8 pt-24 pb-10 text-center text-gray-400">ไม่พบงานนี้</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex text-[15.5px] text-gray-900">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10 max-w-6xl mx-auto">
          <button type="button" onClick={() => navigate(gradeId ? `/studentclassroom/${gradeId}/work` : "/studentclassroom")} className="text-[14.5px] text-gray-500 hover:text-gray-800 flex items-center gap-1.5 mb-4 bg-transparent">
            <FaChevronLeft size={11} /> กลับ
          </button>

          <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
              <h1 className="page-title">{assignment.title}</h1>
              <div className="page-subtitle mt-1">
                {CURRENT_TEACHER.name}{assignment.create_at && ` · โพสต์เมื่อ ${formatDateTime(assignment.create_at)}`}
                {chapter && ` · ${chapter.title}`}
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[13.5px] font-medium px-3 py-1.5 rounded-full shrink-0 ${meta.cls}`}>
              <StatusIcon size={11} /> {meta.label}
            </span>
          </div>

          <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[15.5px] font-semibold text-gray-900 mb-2">รายละเอียดงาน</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[14px] mb-3">
                  <div><div className="text-gray-400">กำหนดส่ง</div><div className="text-gray-900 font-medium">{deadline ? formatDateTime(deadline) : "ไม่ได้กำหนด"}</div></div>
                  <div><div className="text-gray-400">คะแนนเต็ม</div><div className="text-gray-900 font-medium">{assignment.max_score ?? "-"} คะแนน</div></div>
                  <div><div className="text-gray-400">ประเภทงาน</div><div className="text-gray-900 font-medium">{assignment.work_type === "group" ? "งานกลุ่ม" : "งานเดี่ยว"}</div></div>
                </div>
                {assignment.description && (
                  <div className="text-[15px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: assignment.description }} />
                )}
                {assignmentFiles.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <div className="text-[13.5px] text-gray-400">ไฟล์ตัวอย่าง</div>
                    {assignmentFiles.map((f) => (
                      <a key={f.file_id} href={resolveFileUrl(API_BASE, f.file_path || f.file_url)} target="_blank" rel="noreferrer" className="text-[14px] text-blue-600 hover:underline inline-flex items-center gap-1.5">
                        <FaPaperclip size={11} /> {f.file_name}
                      </a>
                    ))}
                  </div>
                )}
                {assignment.work_type === "group" && (
                  <div className="mt-3 rounded-xl bg-purple-50 text-purple-700 px-3.5 py-2.5 text-[14px] flex items-start gap-2">
                    <FaUsers size={13} className="mt-0.5 shrink-0" />
                    {myGroup ? (
                      <span>งานกลุ่ม: <span className="font-medium">{myGroup.group_name}</span> ({myGroup.members.length} คน) — {myGroup.members.map((m) => m.fullname).join(", ")}</span>
                    ) : (
                      <span>งานนี้เป็นงานกลุ่ม แต่ยังไม่ได้ถูกจัดกลุ่ม กรุณาติดต่อครูผู้สอน</span>
                    )}
                  </div>
                )}
              </div>

              {/* ===== สถานะการส่ง ===== */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[15.5px] font-semibold text-gray-900 mb-3">สถานะการส่ง</div>

                {!mySubmission ? (
                  deadlinePassed ? (
                    <div className="rounded-xl bg-red-50 text-red-700 px-3.5 py-3 text-[14.5px] font-medium text-center">
                      เลยกำหนดส่งแล้ว ไม่สามารถส่งงานนี้ได้
                    </div>
                  ) : (
                  <>
                    <FileDropzone files={pendingFiles} onFiles={(fl) => setPendingFiles((prev) => [...prev, ...fl])} onRemove={(i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))} />
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || pendingFiles.length === 0}
                      className="w-full mt-4 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15.5px] font-semibold disabled:opacity-40"
                    >
                      {submitting ? "กำลังส่งงาน..." : "ส่งงาน"}
                    </button>
                  </>
                  )
                ) : (
                  <>
                    <div className="text-[13.5px] text-gray-400 mb-2">ไฟล์ที่ส่ง</div>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {pooledFiles.map((f, i) => (
                        <a key={i} href={resolveFileUrl(API_BASE, f.path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[14.5px] text-gray-800 hover:bg-gray-100">
                          <FileIcon kind={f.kind} /> <span className="truncate">{f.name}</span>
                        </a>
                      ))}
                    </div>
                    <div className="text-[13.5px] text-gray-400 mb-3">ส่งเมื่อ {formatDateTime(mySubmission.created_at)}</div>

                    {addingMore ? (
                      <>
                        <FileDropzone files={addMoreFiles} onFiles={(fl) => setAddMoreFiles((prev) => [...prev, ...fl])} onRemove={(i) => setAddMoreFiles((prev) => prev.filter((_, idx) => idx !== i))} />
                        <div className="flex items-center gap-2 mt-3">
                          <button type="button" onClick={() => { setAddingMore(false); setAddMoreFiles([]); }} className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 text-[14.5px] font-medium">ยกเลิก</button>
                          <button type="button" onClick={handleAddMore} disabled={submitting || addMoreFiles.length === 0} className="flex-1 h-10 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14.5px] font-semibold disabled:opacity-40">
                            {submitting ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์เพิ่ม"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {statusKey !== "reviewed" && (
                          <button type="button" onClick={handleCancelSubmission} className="flex-1 h-10 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 bg-white text-[14.5px] font-medium">ยกเลิกการส่ง</button>
                        )}
                        {!deadlinePassed && (
                          <button type="button" onClick={() => setAddingMore(true)} className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 bg-white text-[14.5px] font-medium">+ เพิ่มไฟล์เพิ่มเติม</button>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-[14.5px] font-semibold text-gray-800 mb-2">
                    <FaCommentDots className="text-pink-400" size={13} /> ความคิดเห็นจากครู
                  </div>
                  {mySubmission?.is_released && (mySubmission.teacher_comment || mySubmission.score !== null) ? (
                    <div className="rounded-xl bg-pink-50 p-3.5">
                      {mySubmission.score !== null && (
                        <div className="text-[14.5px] font-semibold text-pink-700 mb-1">คะแนน {mySubmission.score}/{assignment.max_score ?? "-"}</div>
                      )}
                      {mySubmission.teacher_comment && (
                        <div className="text-[14.5px] text-gray-700 whitespace-pre-line">{mySubmission.teacher_comment}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[14px] text-gray-400">ยังไม่มีความคิดเห็น</div>
                  )}
                </div>
              </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function FileDropzone({ files, onFiles, onRemove }) {
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
  };
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-2xl border-2 border-dashed border-gray-200 py-6 text-center text-[14.5px] text-gray-500 hover:bg-gray-50 transition"
      >
        <FaCloudUploadAlt className="mx-auto mb-1.5 text-gray-300" size={22} />
        ลากไฟล์มาวางที่นี่ หรือ
        <label className="text-pink-600 ml-1 cursor-pointer font-medium">
          เลือกไฟล์จากเครื่อง
          <input type="file" multiple className="hidden" onChange={(e) => e.target.files?.length && onFiles(Array.from(e.target.files))} />
        </label>
      </div>
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-3">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[14.5px]">
              <span className="truncate flex items-center gap-2"><FileIcon kind={classifyExt(f.name)} /> {f.name}</span>
              <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 shrink-0 bg-transparent"><FaTrash size={11} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import PageLoading from "../../components/PageLoading.jsx";
import {
  FaChevronLeft, FaPaperclip, FaCheckCircle, FaHourglassHalf, FaCommentDots,
} from "react-icons/fa";
import {
  getAssignmentById, getAssignmentFiles, getAllSubmissions, createSubmission,
} from "../../callapi/callapi_user.jsx";
import { CURRENT_TEACHER } from "../../utils/feedShared.js";
import { getCurrentUser } from "../../utils/auth.js";

const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? "1";

const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ⚠️ "คำถาม" ใช้ตาราง assignment/send_ass เดียวกับ "งาน" (ดูรายละเอียดใน QuestionDetail.jsx) —
// คำตอบที่พิมพ์ ส่งเป็น file_path ธรรมดา ไม่มีการอัปโหลดไฟล์จริง
export default function StudentQuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const hasScore = assignment ? !!assignment.has_score : true;
  const answerFormat = assignment?.answer_format || "long";
  const [questionFiles, setQuestionFiles] = useState([]);
  const [mySubmission, setMySubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [assData, filesData, subData] = await Promise.all([
        getAssignmentById(id).catch(() => null),
        getAssignmentFiles(id).catch(() => []),
        getAllSubmissions().catch(() => []),
      ]);
      setAssignment(assData);
      setQuestionFiles(filesData || []);

      const mine = (subData || []).find((s) => String(s.assignment_ass_id) === String(id) && String(s.user_user_id) === String(CURRENT_STUDENT_ID));
      setMySubmission(mine || null);
      setAnswerText(mine?.file_path || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  let statusKey = "not_answered";
  if (mySubmission) {
    const reviewed = hasScore && mySubmission.is_released && (mySubmission.score !== null || mySubmission.teacher_comment);
    statusKey = reviewed ? "reviewed" : "answered";
  }

  const STATUS_META = hasScore
    ? {
        not_answered: { label: "ยังไม่ได้ตอบ", cls: "bg-amber-50 text-amber-700", icon: FaHourglassHalf },
        answered: { label: "ตอบแล้ว", cls: "bg-emerald-50 text-emerald-700", icon: FaCheckCircle },
        reviewed: { label: "ตรวจแล้ว", cls: "bg-green-50 text-green-700", icon: FaCheckCircle },
      }
    : {
        not_answered: { label: "ยังไม่ได้ตอบ", cls: "bg-amber-50 text-amber-700", icon: FaHourglassHalf },
        answered: { label: "ตอบแล้ว", cls: "bg-emerald-50 text-emerald-700", icon: FaCheckCircle },
      };
  const meta = STATUS_META[statusKey] || STATUS_META.not_answered;
  const StatusIcon = meta.icon;

  const handleSubmit = async () => {
    if (!answerText.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณาพิมพ์คำตอบก่อนส่ง" });
      return;
    }
    setSubmitting(true);
    try {
      await createSubmission({
        assignment_ass_id: id,
        user_user_id: CURRENT_STUDENT_ID,
        file_path: answerText.trim(),
        group_id: null,
      });
      setEditingAnswer(false);
      await load();
      Swal.fire({ icon: "success", title: "ส่งคำตอบเรียบร้อยแล้ว", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("ส่งคำตอบไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "ส่งคำตอบไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex text-[14.5px] text-gray-900">
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
      <div className="min-h-screen bg-white flex text-[14.5px] text-gray-900">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Header />
          <main className="w-full px-6 md:px-8 pt-24 pb-10 text-center text-gray-400">ไม่พบคำถามนี้</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex text-[14.5px] text-gray-900">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10 max-w-6xl mx-auto">
          <button type="button" onClick={() => navigate(-1)} className="text-[14px] text-gray-500 hover:text-gray-800 flex items-center gap-1.5 mb-4 bg-transparent">
            <FaChevronLeft size={11} /> กลับ
          </button>

          <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-purple-50 text-purple-700 text-[13.5px] font-medium">❓ คำถาม</span>
              </div>
              <h1 className="page-title">{assignment.title}</h1>
              <div className="page-subtitle mt-1">
                {CURRENT_TEACHER.name}{assignment.create_at && ` · โพสต์เมื่อ ${formatDateTime(assignment.create_at)}`}
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full shrink-0 ${meta.cls}`}>
              <StatusIcon size={11} /> {meta.label}
            </span>
          </div>

          <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[14.5px] font-semibold text-gray-900 mb-2">คำแนะนำ</div>
                {hasScore && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px] mb-3">
                    <div><div className="text-gray-400">คะแนนเต็ม</div><div className="text-gray-900 font-medium">{assignment.max_score ?? "-"} คะแนน</div></div>
                  </div>
                )}
                {assignment.description ? (
                  <div className="text-[14.5px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: assignment.description }} />
                ) : (
                  <div className="text-[13.5px] text-gray-400">ไม่มีคำแนะนำเพิ่มเติม</div>
                )}
                {questionFiles.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <div className="text-[12.5px] text-gray-400">สื่อที่แนบมา</div>
                    {questionFiles.map((f) => (
                      <a key={f.file_id} href={f.file_path || f.file_url} target="_blank" rel="noreferrer" className="text-[14px] text-blue-600 hover:underline inline-flex items-center gap-1.5">
                        <FaPaperclip size={11} /> {f.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== คำตอบ ===== */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[14.5px] font-semibold text-gray-900 mb-3">คำตอบของฉัน</div>

                {!mySubmission || editingAnswer ? (
                  <>
                    {answerFormat === "short" ? (
                      <input
                        type="text"
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="พิมพ์คำตอบสั้นๆ ของคุณที่นี่..."
                        className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14.5px] outline-none focus:border-pink-400"
                      />
                    ) : (
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        rows={5}
                        placeholder="พิมพ์คำตอบของคุณที่นี่..."
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14.5px] outline-none focus:border-pink-400 resize-none"
                      />
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {editingAnswer && (
                        <button type="button" onClick={() => { setEditingAnswer(false); setAnswerText(mySubmission?.file_path || ""); }} className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 text-[13.5px] font-medium">
                          ยกเลิก
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !answerText.trim()}
                        className="flex-1 h-10 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[13.5px] font-semibold disabled:opacity-40"
                      >
                        {submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-gray-50 px-4 py-3.5 text-[14.5px] text-gray-800 whitespace-pre-line leading-relaxed">
                      {mySubmission.file_path}
                    </div>
                    <div className="text-[13px] text-gray-400 mt-2 mb-3">ส่งเมื่อ {formatDateTime(mySubmission.created_at)}</div>
                    <button type="button" onClick={() => setEditingAnswer(true)} className="h-10 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 bg-white text-[13.5px] font-medium">
                      แก้ไขคำตอบ
                    </button>
                  </>
                )}

                {hasScore && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-[14.5px] font-semibold text-gray-800 mb-2">
                      <FaCommentDots className="text-pink-400" size={13} /> ความคิดเห็นจากครู
                    </div>
                    {mySubmission?.is_released && (mySubmission.teacher_comment || mySubmission.score !== null) ? (
                      <div className="rounded-xl bg-blue-50 p-3.5">
                        {mySubmission.score !== null && (
                          <div className="text-[13.5px] font-semibold text-blue-700 mb-1">คะแนน {mySubmission.score}/{assignment.max_score ?? "-"}</div>
                        )}
                        {mySubmission.teacher_comment && (
                          <div className="text-[13.5px] text-gray-700 whitespace-pre-line">{mySubmission.teacher_comment}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[13px] text-gray-400">ยังไม่มีความคิดเห็น</div>
                    )}
                  </div>
                )}
              </div>
          </div>
        </main>
      </div>
    </div>
  );
}

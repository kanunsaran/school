import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Swal from "sweetalert2";
import { FaClock, FaUsers, FaThumbtack, FaQrcode, FaPhoneAlt, FaCheckCircle } from "react-icons/fa";
import FeedPostCard from "../../components/FeedPostCard.jsx";
import GradientPopup from "../../components/GradientPopup.jsx";
import PageLoading from "../../components/PageLoading.jsx";
import {
  getNews,
  getNewsComments,
  createNewComment,
  updateComment,
  deleteComment,
  getNewsLikes,
  toggleNewsLike,
  getNewsFiles,
  getAssAll,
  getAllSubmissions,
  getStudent,
  getActiveAttendanceSession,
  getAttendance,
  updateAttendance,
  getAssignmentClasses,
  getTeacherGeneralInfo,
  getStudentGeneralInfo,
} from "../../callapi/callapi_user.jsx";
import { CURRENT_TEACHER } from "../../utils/feedShared.js";
import { getCurrentUser } from "../../utils/auth.js";

// ใช้ user จาก session จริงหลัง login (เดิม hardcode "1" ทำให้บัญชีอื่นเห็น/แก้ไขคอมเมนต์ผิดคน — บั๊กเดียวกับที่เจอใน StudentInfoForm.jsx/Classwork.jsx/StudentClassroomShell.jsx)
const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? "1";

// ใช้วันที่ท้องถิ่นตรงๆ แทนการตัด session.session_date เพราะ backend ส่ง ISO string แบบเลื่อนเขตเวลา (UTC) กลับมา
// ตัด .slice(0,10) ตรงๆ จะได้วันที่ผิดเพี้ยนไป 1 วันในบางช่วงเวลา (ตามรูปแบบเดียวกับ getTodayStr ใน Attendance.jsx ฝั่งครู)
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const daysUntil = (dateStr) => {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.setHours(23, 59, 59, 999) - now.getTime()) / 86400000);
};

const looksLikeHtml = (content = "") => /^\s*<[a-z]/i.test(content);

// รูปโปรไฟล์จริงของเจ้าของโพสต์/คอมเมนต์แต่ละคน (ไม่รู้ล่วงหน้าว่าเป็นครูหรือนักเรียน ลองทั้งสองตาราง)
const fetchAvatarUrl = async (userId) => {
  const teacherInfo = await getTeacherGeneralInfo(userId).catch(() => null);
  if (teacherInfo?.avatar_url) return teacherInfo.avatar_url;
  const studentInfo = await getStudentGeneralInfo(userId).catch(() => null);
  return studentInfo?.avatar_url || null;
};

const normalizePost = (n, comments, files) => ({
  post_id: n.news_id,
  authorId: n.user_id,
  author: { name: CURRENT_TEACHER.name, role: "ครูแนะแนว", avatar_url: null },
  createdAt: n.created_at,
  pinned: false,
  category: null,
  eventDate: null,
  eventEndDate: null,
  title: n.title && n.title !== "ประกาศ" ? n.title : "",
  content: n.content,
  isHtml: looksLikeHtml(n.content),
  youtubeUrl: n.youtube_url,
  link: n.link_url ? { title: n.link_url, url: n.link_url } : null,
  files,
  comments,
});

const normalizeComments = (raw = []) =>
  raw.map((c) => ({
    comment_id: c.comment_id,
    userId: c.user_id,
    user: { name: c.author_name || "ผู้ใช้", avatar_url: null },
    text: c.content,
    time: c.created_at,
    parent_comment_id: c.parent_comment_id || null,
    edited: false,
  }));

// แท็บ "ข่าวสาร" ฝั่งนักเรียน — เหมือนของครูทุกอย่าง (ดึงจาก /news กรอง class_id ของห้องนี้) แค่ไม่มีช่องโพสต์/แก้ไข/ลบ
export default function StudentClassroomNewsTab() {
  const { gradeId, members } = useOutletContext();
  const navigate = useNavigate();

  const [myName, setMyName] = useState("ฉัน");
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [openCommentsIds, setOpenCommentsIds] = useState(new Set());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [upcomingWork, setUpcomingWork] = useState([]);

  const [session, setSession] = useState(null);
  const [myAttendanceStatus, setMyAttendanceStatus] = useState(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);

  useEffect(() => {
    getStudent()
      .then((data) => {
        const me = (data || []).find((s) => String(s.user_id) === String(CURRENT_STUDENT_ID));
        setMyName(me?.fullname || "ฉัน");
      })
      .catch(() => {});

    getStudentGeneralInfo(CURRENT_STUDENT_ID)
      .then((info) => setMyAvatarUrl(info?.avatar_url || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getNews();
        const scoped = (data || []).filter((n) => String(n.class_id) === String(gradeId));

        const formatted = await Promise.all(
          scoped.map(async (n) => {
            let comments = [];
            try {
              comments = normalizeComments(await getNewsComments(n.news_id));
            } catch (err) {
              console.error("โหลดคอมเมนต์ไม่สำเร็จ:", err);
            }

            try {
              const likeData = await getNewsLikes(n.news_id, CURRENT_STUDENT_ID);
              setLikes((prev) => ({ ...prev, [n.news_id]: likeData }));
            } catch (err) {
              console.error("โหลดไลก์ไม่สำเร็จ:", err);
            }

            let files = [];
            try {
              files = await getNewsFiles(n.news_id);
            } catch (err) {
              console.error("โหลดไฟล์แนบไม่สำเร็จ:", err);
            }

            return normalizePost(n, comments, files);
          })
        );

        // ดึงรูปโปรไฟล์จริงของทุกคนที่เกี่ยวข้อง (เจ้าของโพสต์ + คนคอมเมนต์) ทีเดียวหลังโหลดฟีดเสร็จ
        // ห่อ try/catch แยกไว้ — ถ้าดึงรูปพลาดไม่ควรทำให้โพสต์ทั้งหน้าหายไปด้วย (แค่ไม่มีรูปแสดงเฉยๆ)
        try {
          const uniqueUserIds = new Set();
          formatted.forEach((p) => {
            uniqueUserIds.add(String(p.authorId));
            p.comments.forEach((c) => uniqueUserIds.add(String(c.userId)));
          });
          const avatarEntries = await Promise.all(
            [...uniqueUserIds].map(async (id) => [id, await fetchAvatarUrl(id)])
          );
          const avatarMap = Object.fromEntries(avatarEntries);
          formatted.forEach((p) => {
            p.author.avatar_url = avatarMap[String(p.authorId)] || null;
            p.comments.forEach((c) => { c.user.avatar_url = avatarMap[String(c.userId)] || null; });
          });
        } catch (err) {
          console.error("โหลดรูปโปรไฟล์เจ้าของโพสต์ไม่สำเร็จ:", err);
        }

        setPosts(formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (err) {
        console.error("โหลดประกาศห้องเรียนไม่สำเร็จ:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [gradeId]);

  // ใกล้ครบกำหนด — ต้องกรองเฉพาะงานของ "ห้องนี้จริง" (ผ่าน assignment_classes) ไม่ใช่ดึงงานทั้งระบบมาโชว์ปนกัน และตัดงานที่ส่งไปแล้วออก
  useEffect(() => {
    if (!gradeId) return;
    Promise.all([getAssAll(), getAssignmentClasses({ grade_id: gradeId }), getAllSubmissions()])
      .then(([assignments, links, submissions]) => {
        const myAssIds = new Set((links || []).map((ac) => String(ac.ass_id)));
        const mySubmittedAssIds = new Set(
          (submissions || []).filter((s) => String(s.user_user_id) === String(CURRENT_STUDENT_ID)).map((s) => String(s.assignment_ass_id))
        );
        const now = Date.now();
        const upcoming = (assignments || [])
          .filter((a) => myAssIds.has(String(a.ass_id)) && !mySubmittedAssIds.has(String(a.ass_id)) && a.deadline && new Date(a.deadline).getTime() >= now)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
          .slice(0, 5);
        setUpcomingWork(upcoming);
      })
      .catch((err) => console.error("โหลดงานใกล้ครบกำหนดไม่สำเร็จ:", err));
  }, [gradeId]);

  // ===== เซสชันเช็กชื่อ (QR/รหัส) — แสดงทางลัด "QR เช็กชื่อ" เฉพาะตอนครูเปิดเช็กชื่ออยู่จริงเท่านั้น =====
  useEffect(() => {
    if (!gradeId) return;
    getActiveAttendanceSession(gradeId)
      .then((data) => {
        const open = data && data.status === "open" ? data : null;
        setSession(open);
        if (!open) {
          setMyAttendanceStatus(null);
          return;
        }
        getAttendance(gradeId, getTodayStr())
          .then((rows) => {
            const mine = (rows || []).find((r) => String(r.user_user_id) === String(CURRENT_STUDENT_ID));
            setMyAttendanceStatus(mine?.status || "not_checked");
          })
          .catch((err) => console.error("โหลดสถานะเช็กชื่อของฉันไม่สำเร็จ:", err));
      })
      .catch((err) => console.error("โหลดเซสชันเช็กชื่อไม่สำเร็จ:", err));
  }, [gradeId]);

  const openCheckinModal = () => {
    setCodeInput("");
    setCheckinModalOpen(true);
  };

  const handleSubmitCheckin = async () => {
    if (!session) return;
    if (codeInput.trim() !== String(session.code)) {
      Swal.fire({ icon: "error", title: "รหัสไม่ถูกต้อง", text: "ลองตรวจสอบรหัสจากครูอีกครั้ง" });
      return;
    }
    setCheckinSubmitting(true);
    try {
      const rows = await getAttendance(gradeId, getTodayStr());
      const mine = (rows || []).find((r) => String(r.user_user_id) === String(CURRENT_STUDENT_ID));
      if (!mine) throw new Error("ไม่พบแถวเช็กชื่อของฉัน");

      if (mine.status !== "not_checked") {
        setMyAttendanceStatus(mine.status);
        setCheckinModalOpen(false);
        Swal.fire({ icon: "info", title: "เช็กชื่อไปแล้ว", text: "คุณเช็กชื่อคาบนี้ไปแล้ว" });
        return;
      }

      const now = new Date();
      const checkinTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      await updateAttendance(mine.attendance_id, { status: "present", checkin_time: checkinTime });

      setMyAttendanceStatus("present");
      setCheckinModalOpen(false);
      setCodeInput("");
      Swal.fire({ icon: "success", title: "เช็กชื่อสำเร็จ", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("เช็กชื่อไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "เช็กชื่อไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleComments = (id) => {
    setOpenCommentsIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleLike = async (postId) => {
    try {
      const res = await toggleNewsLike(postId, CURRENT_STUDENT_ID);
      setLikes((prev) => ({ ...prev, [postId]: res }));
    } catch (err) {
      console.error("กดถูกใจไม่สำเร็จ:", err);
    }
  };

  const submitComment = async (postId, text, parentCommentId = null) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    try {
      const result = await createNewComment({ news_id: postId, user_id: CURRENT_STUDENT_ID, content: trimmed, parent_comment_id: parentCommentId });
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? {
                ...p,
                comments: [
                  ...p.comments,
                  { comment_id: result.comment_id, userId: CURRENT_STUDENT_ID, user: { name: myName, avatar_url: myAvatarUrl }, text: trimmed, time: new Date().toISOString(), parent_comment_id: parentCommentId, edited: false },
                ],
              }
            : p
        )
      );
      setOpenCommentsIds((prev) => new Set(prev).add(postId));
    } catch (err) {
      console.error("แสดงความคิดเห็นไม่สำเร็จ:", err);
      Swal.fire("แสดงความคิดเห็นไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const editComment = async (postId, commentId, newText) => {
    try {
      await updateComment(commentId, { user_id: CURRENT_STUDENT_ID, content: newText });
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? { ...p, comments: p.comments.map((c) => (c.comment_id === commentId ? { ...c, text: newText, edited: true } : c)) }
            : p
        )
      );
    } catch (err) {
      console.error("แก้ไขความคิดเห็นไม่สำเร็จ:", err);
      Swal.fire("แก้ไขความคิดเห็นไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const deleteCommentHandler = async (postId, commentId) => {
    try {
      await deleteComment(commentId, CURRENT_STUDENT_ID);
      setPosts((prev) =>
        prev.map((p) => (p.post_id === postId ? { ...p, comments: p.comments.filter((c) => c.comment_id !== commentId) } : p))
      );
    } catch (err) {
      console.error("ลบความคิดเห็นไม่สำเร็จ:", err);
      Swal.fire("ลบความคิดเห็นไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const handleMainComment = (postId) => {
    submitComment(postId, commentDrafts[postId]);
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
  };

  return (
    <>
      {loadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-[15px]">
          โหลดประกาศไม่สำเร็จ — ตรวจสอบว่า backend เปิด endpoint <code>/news</code> แล้วหรือยัง
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ---- Center feed ---- */}
        <div className="flex flex-col gap-5 min-w-0">
          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10">
              <PageLoading />
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
              ยังไม่มีประกาศในห้องนี้
            </div>
          )}

          {!loading &&
            posts.map((post) => (
              <FeedPostCard
                key={post.post_id}
                post={post}
                isOwner={false}
                hideMenu
                showCategory={false}
                showPin={false}
                contentIsHtml={post.isHtml}
                expanded={expandedIds.has(post.post_id)}
                onToggleExpand={() => toggleExpanded(post.post_id)}
                commentsOpen={openCommentsIds.has(post.post_id)}
                onToggleComments={() => toggleComments(post.post_id)}
                liked={!!likes[post.post_id]?.liked}
                likeCount={likes[post.post_id]?.count || 0}
                onToggleLike={() => toggleLike(post.post_id)}
                commentDraft={commentDrafts[post.post_id] || ""}
                onCommentDraftChange={(v) => setCommentDrafts((prev) => ({ ...prev, [post.post_id]: v }))}
                onSubmitComment={() => handleMainComment(post.post_id)}
                onSubmitReply={(parentId, text) => submitComment(post.post_id, text, parentId)}
                currentUserId={CURRENT_STUDENT_ID}
                onEditComment={(commentId, text) => editComment(post.post_id, commentId, text)}
                onDeleteComment={(commentId) => deleteCommentHandler(post.post_id, commentId)}
              />
            ))}
        </div>

        {/* ---- Right sidebar ---- */}
        <div className="hidden xl:flex flex-col gap-6">
          {/* 📌 ทางลัดห้องเรียน — QR เช็กชื่อโชว์เฉพาะตอนครูเปิดเช็กชื่ออยู่จริง (เช็กจาก attendance_session) */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="text-[16px] font-semibold text-amber-800 mb-4 flex items-center gap-2">
              <FaThumbtack className="text-amber-600" /> ทางลัดห้องเรียน
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={session && myAttendanceStatus === "not_checked" ? openCheckinModal : undefined}
                disabled={!session || myAttendanceStatus !== "not_checked"}
                className={`flex items-center gap-2.5 text-[15px] font-medium bg-transparent text-left ${
                  session && myAttendanceStatus === "not_checked" ? "text-emerald-700 hover:text-emerald-800" : "text-gray-400 cursor-default"
                }`}
              >
                {!session ? (
                  <>
                    <FaQrcode className="text-gray-300 shrink-0" /> เช็กชื่อ - ยังไม่เปิดคาบนี้
                  </>
                ) : myAttendanceStatus === "not_checked" ? (
                  <>
                    <FaQrcode className="text-emerald-600 shrink-0" /> ครูเปิดเช็กชื่ออยู่ - กดเพื่อเช็กชื่อ
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="text-emerald-500 shrink-0" /> เช็กชื่อคาบนี้แล้ว
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => Swal.fire({ icon: "info", title: "ครูที่ปรึกษา", text: CURRENT_TEACHER.name, confirmButtonText: "รับทราบ" })}
                className="flex items-center gap-2.5 text-[15px] text-gray-700 hover:text-pink-700 bg-transparent text-left"
              >
                <FaPhoneAlt className="text-pink-500 shrink-0" /> ครูที่ปรึกษา {CURRENT_TEACHER.name}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-pink-200 bg-pink-50/60 p-5">
            <div className="text-[16px] font-semibold text-pink-800 mb-4 flex items-center gap-2">
              <FaClock className="text-pink-600" /> ใกล้ครบกำหนด
            </div>
            {upcomingWork.length === 0 ? (
              <div className="text-[15px] text-pink-700/70">ไม่มีงานที่ใกล้ครบกำหนด</div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingWork.map((a) => {
                  const remain = daysUntil(a.deadline);
                  return (
                    <button key={a.ass_id} type="button" onClick={() => navigate(`/studentworkdetail/${a.ass_id}`)} className="text-left bg-transparent">
                      <div className="text-[15px] font-medium text-gray-800 truncate hover:underline">{a.title}</div>
                      <div className="text-[13.5px] text-gray-400 mt-0.5">
                        ครบกำหนด {new Date(a.deadline).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}
                        <span className="text-red-600 font-medium">{remain <= 0 ? "วันนี้" : `เหลืออีก ${remain} วัน`}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/studentclassroom/classmates`)}
            className="rounded-2xl border border-gray-200 bg-white p-5 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-[16px] font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaUsers className="text-gray-500" /> เพื่อนร่วมชั้น
            </div>
            {members.length === 0 ? (
              <div className="text-[15px] text-gray-400">ยังไม่มีนักเรียนในห้องนี้</div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {members.slice(0, 9).map((m, i) => (
                  <div
                    key={m.user_id}
                    title={m.fullname}
                    className="w-9 h-9 rounded-full bg-pink-400 text-white text-[15px] font-semibold flex items-center justify-center shrink-0"
                    style={{ opacity: 1 - (i % 3) * 0.15 }}
                  >
                    {(m.fullname || "?").trim().charAt(0)}
                  </div>
                ))}
                {members.length > 9 && (
                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 text-[14px] font-semibold flex items-center justify-center shrink-0">
                    +{members.length - 9}
                  </div>
                )}
              </div>
            )}
          </button>
        </div>
      </div>

      <GradientPopup
        open={checkinModalOpen}
        onClose={() => setCheckinModalOpen(false)}
        icon={<FaQrcode size={20} />}
        title="เช็กชื่อเข้าเรียน"
        subtitle={session ? `กรอกรหัสที่ครูแสดงในห้องเรียน${session.period ? `\nคาบ ${session.period}` : ""}` : ""}
        onSubmit={handleSubmitCheckin}
        submitLabel="เช็กชื่อ"
        submitDisabled={!codeInput.trim() || checkinSubmitting}
      >
        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          inputMode="numeric"
          autoFocus
          className="w-full h-14 rounded-xl border border-gray-200 text-center text-[24px] tracking-[0.3em] font-bold outline-none focus:border-pink-400"
        />
      </GradientPopup>
    </>
  );
}

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import Swal from "sweetalert2";
import { getdatayc } from "../callapi/callapi_user";
import { getComments } from "../callapi/callapi_user";
import { addComment } from "../callapi/callapi_user";
import { getPostitLikeStatus, togglePostitLike } from "../callapi/callapi_user";
import { getStudent, getTeacher } from "../callapi/callapi_user";
import { deletePostit, deleteYcComment } from "../callapi/callapi_user";
import { getPostitColor, getPostitTape, getPostitColorStyle, getPostitTapeStyle, POSTIT_COLOR_MAP, POSTIT_TAPE_MAP } from "../utils/postit";
import TeacherSidebarNav from "../nav.jsx";
import StudentSidebarNav from "../navstudent.jsx";
import Header from "../Header";
import PageLoading from "../components/PageLoading.jsx";
import { Link, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaRegCalendarAlt,
  FaChevronDown,
  FaBookOpen,
  FaNewspaper,
  FaTasks,
  FaUserFriends,
  FaChartBar,
  FaClipboardCheck,
  FaUsers,
  FaBullseye,
  FaSignOutAlt,
  FaSearch,
  FaRegHeart,
  FaRegCommentDots,
  FaRegPaperPlane,
  FaArrowLeft,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

// ⚠️ TODO: ทดไว้ก่อน รอทำหน้า login ค่อยเอา user_id จริงมาแทน
const CURRENT_USER_ID = "1";

export default function YCPostDetailPage({ studentMode = false }) {
  const navigate = useNavigate();

  const { id } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [expandedComment, setExpandedComment] = useState(null);

  useEffect(() => {

    async function fetchPost() {
      try {
        const res = await getdatayc();

        const found = res.data.find(
          (p) => String(p.post_id) === id
        );

        if (found) {
          setPost({
            id: found.post_id,
            text: found.content,
            category: found.category,
            userId: found.user_user_id,
            // ใช้สีที่บันทึกไว้จริงก่อน ถ้าโพสต์เก่าไม่มี (สร้างก่อนมีฟีเจอร์นี้) ค่อย fallback เป็นสีคำนวณจาก id
            tape: found.tape || getPostitTape(found.post_id),
            color: found.color || getPostitColor(found.post_id),
            likes: 0,
            comments: found.comments ?? 0,
            shares: found.shares ?? 0,
          });

          try {
            const [students, teachers] = await Promise.all([getStudent(), getTeacher()]);
            const author = [...students, ...teachers].find((u) => String(u.user_id) === String(found.user_user_id));
            setAuthorName(author?.fullname || "");
          } catch (err) {
            console.error("โหลดชื่อผู้โพสต์ไม่สำเร็จ:", err);
          }
        }

      } catch (err) {
        console.error("โหลดโพสต์ไม่สำเร็จ", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadLikeStatus() {
      try {
        const result = await getPostitLikeStatus(id, CURRENT_USER_ID);
        setLiked(result.liked);
        setPost((prev) => (prev ? { ...prev, likes: result.count } : prev));
      } catch (err) {
        console.error("โหลดไลก์ไม่สำเร็จ:", err);
      }
    }

    async function loadComments() {
      try {
        const data = await getComments();

        const filtered = data.filter(
          (c) => String(c.postit_post_id) === id
        );

        setComments(filtered);

      } catch (err) {
        console.error(err);
      }
    }

    fetchPost();
    loadComments();
    loadLikeStatus();

  }, [id]);







  // toggle จริง กดซ้ำเพื่อยกเลิกไลก์ได้
  async function handleLike() {
    try {
      const result = await togglePostitLike(post.id, CURRENT_USER_ID);
      setLiked(result.liked);
      setPost((prev) => ({ ...prev, likes: result.count }));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddComment() {

    if (!newComment.trim()) return;

    try {

      const data = await addComment(newComment, post.id);

      // เพิ่ม comment ลง state
      setComments(prev => [data, ...prev]);

      setNewComment("");

    } catch (err) {
      console.error(err);
    }

  }

  function handleShare() {

    const url = window.location.href;
    const text = post.text;

    if (navigator.share) {
      navigator.share({
        title: "YC Post",
        text: text,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("คัดลอกลิงก์แล้ว");
    }
  }

  // ครูลบโพสต์นี้ทิ้งได้ เผื่อเนื้อหาไม่เหมาะสม
  async function handleDeletePost() {
    const result = await Swal.fire({
      title: "ลบโพสต์นี้?",
      text: "ลบแล้วกู้คืนไม่ได้ คอมเมนต์ทั้งหมดจะหายไปด้วย",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deletePostit(post.id, CURRENT_USER_ID);
      navigate(studentMode ? "/studentyc" : "/yc");
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "ลบโพสต์ไม่สำเร็จ" });
    }
  }

  // ครูลบคอมเมนต์ของนักเรียนได้ เผื่อไม่เหมาะสม
  async function handleDeleteComment(commentId) {
    const result = await Swal.fire({
      title: "ลบคอมเมนต์นี้?",
      text: "ลบแล้วกู้คืนไม่ได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteYcComment(commentId);
      setComments((prev) => prev.filter((c) => c.comment_id !== commentId));
      setExpandedComment((prev) => (prev?.id === commentId ? null : prev));
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "ลบคอมเมนต์ไม่สำเร็จ" });
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex text-[15.5px] text-gray-800">
      <Header />
      {studentMode ? <StudentSidebarNav /> : <TeacherSidebarNav />}

      <main className="flex-1 min-w-0 w-full pt-15 bg-white">
        <div className="w-full border-b border-gray-100 bg-gradient-to-b from-[#FFF1F7] to-white py-8">
          <div className="flex justify-center">
            <img src="/image/youth-counselor-logo.png" alt="Youth Counselor" className="h-20 w-auto object-contain" />
          </div>
        </div>


        {/* Content */}
        <div className="px-8 py-8">
          {/* Back + ชื่อผู้โพสต์ + หมวด */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[14.5px] text-gray-600 hover:text-gray-900 bg-transparent"
            >
              <FaArrowLeft size={12} /> ย้อนกลับ
            </button>

            <div className="flex items-center gap-2.5">
              {/* นักเรียนไม่ควรเห็นชื่อผู้โพสต์ (โพสต์แบบไม่ระบุตัวตน) — ครูเห็นได้เพื่อดูแลเนื้อหา */}
              {!studentMode && authorName && (
                <div className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-[14px] font-medium flex items-center gap-2">
                  <FaUserFriends className="text-gray-400" size={13} /> {authorName}
                </div>
              )}
              {/* หมวดของโพสต์นี้ — แค่แสดงผล กดไม่ได้ (ไม่ใช่ตัวกรองเหมือนหน้ารายการ) */}
              {post?.category && (
                <div className="h-10 px-4 rounded-xl border border-pink-200 bg-pink-50 text-pink-700 font-semibold text-[14px] flex items-center">
                  หมวด: {post.category}
                </div>
              )}
              {/* ครูลบโพสต์นี้ได้เผื่อไม่เหมาะสม — นักเรียนไม่เห็นปุ่มนี้ */}
              {!studentMode && post && (
                <button
                  type="button"
                  onClick={handleDeletePost}
                  title="ลบโพสต์นี้"
                  className="h-10 w-10 rounded-xl border border-gray-200 bg-white text-red-500 hover:bg-red-50 flex items-center justify-center"
                >
                  <FaTrash size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Main post (✅ smaller + minimal) */}
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-[420px]">
              {loading ? (
                <PageLoading />
              ) : post ? (
                <BigPostIt post={post} />
              ) : (
                <div className="text-center text-red-500">ไม่พบโพสต์</div>
              )}
            </div>
          </div>

          {/* Action row + divider */}
          <div className="mt-5 flex items-center justify-center">
            <div className="w-full max-w-[980px]">
              <div className="flex items-center gap-3 text-gray-700">
                <ActionStat
                  icon={<FaRegHeart className={liked ? "text-pink-500" : ""} />}
                  value={post?.likes ?? 0}
                  onClick={handleLike}
                />

                <ActionStat icon={<FaRegCommentDots />} value={comments.length} />

                <ActionStat
                  icon={<FaRegPaperPlane />}
                  value={post?.shares ?? 0}
                  onClick={handleShare}
                />
              </div>
              <div className="mt-4 h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            </div>
          </div>

          {/* Comment Section */}
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-[700px]">

              {/* input comment */}
              <div className="flex gap-3 mb-4">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="เขียนความคิดเห็น..."
                  className="flex-1 h-12 border border-gray-200 bg-gray-50 rounded-xl px-4 text-[15px] outline-none focus:border-pink-400"
                />

                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="h-12 w-12 shrink-0 rounded-xl bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center disabled:opacity-40 transition"
                >
                  <FaRegPaperPlane size={16} />
                </button>
              </div>

            </div>
          </div>

          {/* Related mini posts */}
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-[980px]">
              <div className="flex flex-wrap items-end justify-start gap-6">
                {comments.map((c, index) => {
                  const miniPost = {
                    id: c.comment_id,
                    text: c.comment_text,
                    tape: ["pink", "blue", "yellow"][index % 3],
                    color: ["pink", "blue", "yellow"][index % 3],
                    size: "sm",
                  };
                  return (
                    <MiniPostIt
                      key={c.comment_id}
                      post={miniPost}
                      onClick={() => setExpandedComment(miniPost)}
                      onDelete={!studentMode ? () => handleDeleteComment(c.comment_id) : null}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* คลิกโพสอิทคอมเมนต์แล้วขึ้นมาเป็นอันใหญ่ให้อ่านง่าย */}
      {expandedComment && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          onClick={() => setExpandedComment(null)}
        >
          <div className="w-full max-w-[420px] relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpandedComment(null)}
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white shadow-md text-gray-600 hover:text-gray-900 flex items-center justify-center"
              title="ปิด"
            >
              <FaTimes size={14} />
            </button>
            {!studentMode && (
              <button
                type="button"
                onClick={() => handleDeleteComment(expandedComment.id)}
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 h-9 px-3.5 rounded-full bg-white shadow-md text-red-500 hover:bg-red-50 flex items-center gap-1.5 text-[12.5px] font-medium"
              >
                <FaTrash size={11} /> ลบคอมเมนต์นี้
              </button>
            )}
            <BigPostIt post={expandedComment} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Sidebar components ===== */
function SideLink({ to, icon, active, children }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${active ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-900"
        }`}
    >
      {icon}
      <span className="font-medium">{children}</span>
    </Link>
  );
}

function SubLink({ to, icon, active, children }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${active ? "bg-pink-50 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-900"
        }`}
    >
      <span className={active ? "text-pink-500" : "text-gray-400"}>{icon}</span>
      {children}
    </Link>
  );
}

/* ===== Small UI ===== */
function ActionStat({ icon, value, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{ backgroundColor: "white" }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition"
    >
      <span className="text-gray-700">{icon}</span>
      <span className="font-medium">{value}</span>
    </button>
  );
}

/* ===== Post-it UI (✅ Minimal version) ===== */
function BigPostIt({ post }) {
  const colorStyle = getPostitColorStyle(post.color);
  const tapeStyle = getPostitTapeStyle(post.tape);

  return (
    <div className="relative">
      {/* tape (smaller) */}
      <div className="flex justify-center">
        <div className={`h-4 w-20 rounded-md ${tapeStyle.className} opacity-75`} style={tapeStyle.style} />
      </div>

      {/* note (smaller, lighter shadow) */}
      <div
        className={`mt-2 rounded-2xl ${colorStyle.className} border border-black/5 shadow-[0_10px_28px_rgba(0,0,0,0.08)] relative overflow-hidden`}
        style={{ transform: "rotate(-1deg)", ...colorStyle.style }}
      >
        {/* subtle highlight */}
        <div className="absolute inset-0 opacity-60 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(255,255,255,0))]" />

        <div className="px-8 py-9 min-h-[180px] flex items-center justify-center text-center relative">
          <div className="whitespace-pre-line text-[19.5px] font-semibold text-gray-900 leading-snug">
            {post.text}
          </div>
        </div>

        {/* folded corner (smaller) */}
        <div className="absolute right-0 bottom-0 w-10 h-10 bg-white/25 rounded-tl-2xl" />
      </div>
    </div>
  );
}

function MiniPostIt({ post, onClick, onDelete }) {
  const palette = POSTIT_COLOR_MAP;
  const tape = POSTIT_TAPE_MAP;

  const size =
    post.size === "sm"
      ? "w-[210px] min-h-[140px] text-[15px]"
      : "w-[240px] min-h-[160px] text-[15.5px]";

  const rotations = ["rotate(-6deg)", "rotate(3deg)", "rotate(-2deg)", "rotate(6deg)"];
  const r = rotations[post.id % rotations.length];

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className="text-left w-full active:scale-[0.99] transition"
        style={{ backgroundColor: "#ffffff" }}
        title="ดูคอมเมนต์นี้"
      >
        <div className="relative">
          <div className="flex justify-center">
            <div className={`h-3.5 w-14 rounded-md ${tape[post.tape]} opacity-75`} />
          </div>

          <div
            className={`mt-2 rounded-2xl ${palette[post.color]} ${size}
                        border border-black/5
                        shadow-[0_10px_24px_rgba(0,0,0,0.08)]
                        group-hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)]
                        transition relative overflow-hidden`}
            style={{ transform: r }}
          >
            <div className="absolute inset-0 opacity-50 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(255,255,255,0))]" />
            <div className="p-4 whitespace-pre-line text-gray-900 leading-relaxed relative">
              {post.text}
            </div>
            <div className="absolute right-0 bottom-0 w-9 h-9 bg-white/22 rounded-tl-2xl" />
          </div>
        </div>
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="ลบคอมเมนต์นี้"
          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/90 shadow text-red-500 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        >
          <FaTrash size={11} />
        </button>
      )}
    </div>
  );
}

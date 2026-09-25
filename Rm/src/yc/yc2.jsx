import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { getdatayc } from "../callapi/callapi_user";
import { getComments } from "../callapi/callapi_user";
import { addComment } from "../callapi/callapi_user";
import { getPostitLikeStatus, togglePostitLike } from "../callapi/callapi_user";
import { getPostitColor, getPostitTape, getPostitColorStyle, getPostitTapeStyle, POSTIT_COLOR_MAP, POSTIT_TAPE_MAP } from "../utils/postit";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
} from "react-icons/fa";

// ⚠️ TODO: ทดไว้ก่อน รอทำหน้า login ค่อยเอา user_id จริงมาแทน
const CURRENT_USER_ID = "1";

export default function YCPostDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const teacher = {
    name: "คุณครู สุพรรณี",
    role: "ครูประจำชั้น ม.6/5",
    avatar: "https://i.pravatar.cc/120?img=47",
  };

  const [q, setQ] = useState("");

  const { id } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);

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
            // ใช้สีที่บันทึกไว้จริงก่อน ถ้าโพสต์เก่าไม่มี (สร้างก่อนมีฟีเจอร์นี้) ค่อย fallback เป็นสีคำนวณจาก id
            tape: found.tape || getPostitTape(found.post_id),
            color: found.color || getPostitColor(found.post_id),
            likes: 0,
            comments: found.comments ?? 0,
            shares: found.shares ?? 0,
          });
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



  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full pt-15 bg-white">
        <div className="w-full border-b border-gray-100 bg-gradient-to-b from-[#FFF1F7] to-white">
          <div className="flex justify-center">
            <div className="text-center">
              <div className="text-[44px] font-semibold tracking-tight">
                <span className="text-pink-400">Y</span>
                <span className="text-gray-700">outh </span>
                <span className="text-yellow-300">C</span>
                <span className="text-gray-700">ounselor</span>
                <span className="inline-block ml-3 text-blue-300">✦✦</span>
              </div>
            </div>
          </div>

        </div>


        {/* Content */}
        <div className="px-8 py-8">
          {/* Back + Search + chips */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-full border border-gray-200 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.08)] hover:bg-gray-50 active:scale-[0.98] transition"
              title="ย้อนกลับ"
              style={{ backgroundColor: "white" }}
            >
              <span className="w-full h-full flex items-center justify-center text-gray-700" >
                <FaArrowLeft />
              </span>
            </button>

            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาหัวข้อ หรือ คำถาม"
                className="w-full h-11 rounded-full border border-gray-200 bg-white pl-11 pr-4 outline-none
                           shadow-[0_10px_24px_rgba(0,0,0,0.08)]
                           focus:shadow-[0_14px_30px_rgba(0,0,0,0.12)]
                           focus:border-pink-200 transition"
              />
            </div>

            {/* หมวดของโพสต์นี้ — แค่แสดงผล กดไม่ได้ (ไม่ใช่ตัวกรองเหมือนหน้ารายการ) */}
            {post?.category && (
              <div
                className="h-11 px-5 rounded-2xl border border-pink-200 bg-pink-50 text-pink-700 font-semibold flex items-center shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
              >
                หมวด: {post.category}
              </div>
            )}
          </div>

          {/* Main post (✅ smaller + minimal) */}
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-[420px]">
              {loading ? (
                <div className="text-center text-gray-500">กำลังโหลด...</div>
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
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2"
                />

                <button style={{ backgroundColor: "rgba(252, 231, 243, 0.8)" }}
                  onClick={handleAddComment}
                  className="px-4 py-2 bg-pink-500 text-black rounded-xl "

                >
                  ส่ง
                </button>
              </div>

            </div>
          </div>

          {/* Related mini posts */}
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-[980px]">
              <div className="flex flex-wrap items-end justify-between gap-10">
                {comments.map((c, index) => (
                  <MiniPostIt
                    key={c.comment_id}
                    post={{
                      id: c.comment_id,
                      text: c.comment_text,
                      tape: ["pink", "blue", "yellow"][index % 3],
                      color: ["pink", "blue", "yellow"][index % 3],
                      size: "sm"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
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
          <div className="whitespace-pre-line text-[18px] font-semibold text-gray-900 leading-snug">
            {post.text}
          </div>
        </div>

        {/* folded corner (smaller) */}
        <div className="absolute right-0 bottom-0 w-10 h-10 bg-white/25 rounded-tl-2xl" />
      </div>
    </div>
  );
}

function MiniPostIt({ post }) {
  const palette = POSTIT_COLOR_MAP;
  const tape = POSTIT_TAPE_MAP;

  const size =
    post.size === "sm"
      ? "w-[170px] min-h-[110px] text-[12px]"
      : "w-[220px] min-h-[140px] text-[13px]";

  const rotations = ["rotate(-6deg)", "rotate(3deg)", "rotate(-2deg)", "rotate(6deg)"];
  const r = rotations[post.id % rotations.length];

  return (
    <button
      type="button"
      className="text-left group active:scale-[0.99] transition"
      style={{ backgroundColor: "#ffffff" }}
      title="ดูโพสต์"
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
  );
}

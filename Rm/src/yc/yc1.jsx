// import { useMemo, useState, useEffect } from "react";
// import { Link, useLocation } from "react-router-dom";
// import {
//   FaHome,
//   FaRegCalendarAlt,
//   FaChevronDown,
//   FaBookOpen,
//   FaNewspaper,
//   FaTasks,
//   FaUserFriends,
//   FaChartBar,
//   FaClipboardCheck,
//   FaUsers,
//   FaBullseye,
//   FaSignOutAlt,
//   FaSearch,
//   FaRegHeart,
//   FaRegCommentDots,
//   FaRegPaperPlane,
// } from "react-icons/fa";
// import { getdatayc } from "../callapi/callapi_user";

// export default function YCCommunityPage() {
//   const location = useLocation();

//   /* ===== Sidebar profile ===== */
//   const teacher = {
//     name: "คุณครู สุพรรณี",
//     role: "ครูประจำชั้น ม.6/5",
//     avatar: "https://i.pravatar.cc/120?img=47",
//   };

//   /* ===== Chips ===== */
//   const chips = useMemo(
//     () => ["การเรียน", "อาชีพ", "สุขภาพใจ", "ศึกษาต่อ/ทุนเรียน"],
//     []
//   );
//   const [activeChip, setActiveChip] = useState("การเรียน");
//   const [q, setQ] = useState("");

//   /* ===== Posts from API ===== */
//   const [posts, setPosts] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function fetchPosts() {
//       try {
//         const res = await getdatayc();

//         const mapped = res.data.map((p, index) => ({
//           id: p.post_id,
//           text: p.content,
//           color: ["pink", "yellow", "blue", "mint"][index % 4],
//           tape: ["mint", "yellow", "pink", "blue"][index % 4],
//           likes: p.likes ?? Math.floor(Math.random() * 100),
//           comments: p.comments ?? Math.floor(Math.random() * 20),
//           shares: p.shares ?? Math.floor(Math.random() * 40),
//         }));

//         setPosts(mapped);
//       } catch (err) {
//         console.error("โหลดโพสต์ YC ไม่สำเร็จ:", err);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchPosts();
//   }, []);

//   /* ===== Search ===== */
//   const filtered = posts.filter((p) => {
//     const text = (p.text || "").replaceAll("\n", " ");
//     return q.trim()
//       ? text.toLowerCase().includes(q.toLowerCase())
//       : true;
//   });

//   const isActive = (path) => location.pathname === path;

//   return (
//     <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
//       {/* ===== Sidebar ===== */}
//       <aside className="w-[290px] shrink-0 bg-white border-r border-gray-200 min-h-screen">
//         <div className="p-4">
//           <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
//             <img
//               src={teacher.avatar}
//               className="w-12 h-12 rounded-full object-cover"
//             />
//             <div>
//               <div className="font-semibold">{teacher.name}</div>
//               <div className="text-[12px] text-gray-500">{teacher.role}</div>
//             </div>
//           </div>
//         </div>

//         <nav className="px-3 pb-6">
//           <SideLink to="/" icon={<FaHome />} active={isActive("/")}>
//             หน้าหลัก
//           </SideLink>

//           <Link
//             to="/yc"
//             className={`mt-1 flex items-center gap-3 px-4 py-3 rounded-xl ${
//               isActive("/yc")
//                 ? "bg-pink-50 text-pink-700"
//                 : "hover:bg-gray-50"
//             }`}
//           >
//             <FaUsers />
//             ชุมชน (YC)
//           </Link>

//           <SideLink
//             to="/student-goals"
//             icon={<FaBullseye />}
//             active={isActive("/student-goals")}
//           >
//             เป้าหมายของนักเรียน
//           </SideLink>

//           <Link
//             to="/logout"
//             className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500"
//           >
//             <FaSignOutAlt />
//             ออกจากระบบ
//           </Link>
//         </nav>
//       </aside>

//       {/* ===== Main ===== */}
//       <main className="flex-1 bg-[#FFF6FB]">
//         <div className="px-10 py-10">
//           {/* Search */}
//           <div className="max-w-[980px] mx-auto">
//             <div className="relative">
//               <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input
//                 value={q}
//                 onChange={(e) => setQ(e.target.value)}
//                 placeholder="ค้นหาเรื่อง หรือ คำถาม"
//                 className="w-full h-11 rounded-full border pl-11"
//               />
//             </div>

//             {/* Chips */}
//             <div className="mt-3 flex flex-wrap gap-2">
//               {chips.map((c) => (
//                 <button
//                   key={c}
//                   onClick={() => setActiveChip(c)}
//                   className={`h-9 px-4 rounded-full border ${
//                     activeChip === c
//                       ? "bg-pink-50 border-pink-200 text-pink-700 font-semibold"
//                       : "bg-white border-gray-200"
//                   }`}
//                 >
//                   {c}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Cards */}
//           <div className="mt-6 max-w-[1080px] mx-auto">
//             {loading ? (
//               <div className="text-center text-gray-500">
//                 กำลังโหลดโพสต์…
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//                 {filtered.map((p) => (
//                   <PostItCard key={p.id} post={p} />
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// /* ===== Components ===== */

// function SideLink({ to, icon, active, children }) {
//   return (
//     <Link
//       to={to}
//       className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
//         active ? "bg-gray-100" : "hover:bg-gray-50"
//       }`}
//     >
//       {icon}
//       {children}
//     </Link>
//   );
// }

// function PostItCard({ post }) {
//   const palette = {
//     pink: "bg-[#FADBE6]",
//     yellow: "bg-[#FFF0A6]",
//     blue: "bg-[#DDF2F2]",
//     mint: "bg-[#CFF2E6]",
//   };

//   const tape = {
//     pink: "bg-[#F7B5C9]",
//     yellow: "bg-[#FFE073]",
//     blue: "bg-[#BFE7FF]",
//     mint: "bg-[#BCEBD8]",
//   };

//   return (
//     <div className="rounded-2xl border bg-white p-4 shadow hover:shadow-lg transition">
//       <div className="flex justify-center -mt-2">
//         <div className={`h-4 w-20 rounded-md ${tape[post.tape]} opacity-80`} />
//       </div>

//       <div className={`mt-3 rounded-xl p-5 ${palette[post.color]}`}>
//         <div className="whitespace-pre-line">{post.text}</div>
//       </div>

//       <div className="mt-3 flex gap-6 text-[12px] text-gray-600">
//         <span className="flex items-center gap-1">
//           <FaRegHeart /> {post.likes}
//         </span>
//         <span className="flex items-center gap-1">
//           <FaRegCommentDots /> {post.comments}
//         </span>
//         <span className="flex items-center gap-1">
//           <FaRegPaperPlane /> {post.shares}
//         </span>
//       </div>
//     </div>
//   );
// }


import { useMemo, useState } from "react";
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
} from "react-icons/fa";
import { useEffect } from "react";
import { getdatayc, getPostitLikeStatus, togglePostitLike, getStudent, getTeacher } from "../callapi/callapi_user";
import { getPostitColor, getPostitTape, getPostitColorStyle, getPostitTapeStyle, POSTIT_CATEGORIES } from "../utils/postit";

// ⚠️ TODO: ทดไว้ก่อน รอทำหน้า login ค่อยเอา user_id จริงมาแทน
const CURRENT_USER_ID = "1";

const AVATAR_COLORS = ["bg-pink-400", "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-purple-400", "bg-cyan-400"];
const avatarColorFor = (seed) => AVATAR_COLORS[seed % AVATAR_COLORS.length];

// ตัดคำนำหน้าชื่อไทยออกก่อน เอาตัวอักษรแรกของ "ชื่อจริง" มาทำ avatar ไม่งั้นจะได้ "น" ซ้ำกันหมด
const initialOf = (fullname = "") => {
  const stripped = fullname.replace(/^(นางสาว|เด็กหญิง|เด็กชาย|นาย|นาง)\s*/u, "");
  return (stripped || fullname || "?").trim().charAt(0);
};

export default function YCCommunityPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ===== Sidebar profile (ครู) =====
  const teacher = {
    name: "คุณครู สุพรรณี",
    role: "ครูประจำชั้น ม.6/5",
    avatar: "https://i.pravatar.cc/120?img=47",
  };

  // ===== Filter chips =====
  const chips = useMemo(() => ["ทั้งหมด", ...POSTIT_CATEGORIES], []);

const [activeChip, setActiveChip] = useState("ทั้งหมด");
  const [q, setQ] = useState("");

  // ===== Posts (mock) =====
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== ผู้โพสต์ (user_id -> ชื่อ) ดึงมาเพื่อโชว์ว่าใครเป็นคนพิมพ์ =====
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    async function fetchUsers() {
      try {
        const [students, teachers] = await Promise.all([getStudent(), getTeacher()]);
        const map = {};
        [...students, ...teachers].forEach((u) => {
          map[String(u.user_id)] = u.fullname;
        });
        setUserMap(map);
      } catch (err) {
        console.error("โหลดรายชื่อผู้ใช้ไม่สำเร็จ:", err);
      }
    }
    fetchUsers();
  }, []);

useEffect(() => {
  async function fetchPosts() {
    try {
      const res = await getdatayc(); // << เพิ่มกลับมา

      const mapped = await Promise.all(
        res.data.map(async (p) => {
          let likeStatus = { count: 0, liked: false };
          try {
            likeStatus = await getPostitLikeStatus(p.post_id, CURRENT_USER_ID);
          } catch (err) {
            console.error("โหลดไลก์ไม่สำเร็จ:", err);
          }

          return {
            id: p.post_id,
            text: p.content,
            category: p.category,
            userId: p.user_user_id,
            // ใช้สีที่บันทึกไว้จริงก่อน ถ้าโพสต์เก่าไม่มี (สร้างก่อนมีฟีเจอร์นี้) ค่อย fallback เป็นสีคำนวณจาก id
            color: p.color || getPostitColor(p.post_id),
            tape: p.tape || getPostitTape(p.post_id),
            likes: likeStatus.count,
            liked: likeStatus.liked,
            comments: p.comments ?? 0,
            shares: p.shares ?? 0,
          };
        })
      );

      setPosts(mapped);
    } catch (err) {
      console.error("โหลดโพสต์ YC ไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }
  }

  fetchPosts();
}, []);

  // ============ LIKE (กันไม่ให้ trigger การ์ดพาไปหน้ารายละเอียด) ============
  const handleToggleLike = async (postId, e) => {
    e.stopPropagation();
    try {
      const result = await togglePostitLike(postId, CURRENT_USER_ID);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes: result.count, liked: result.liked } : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };


  const filtered = posts.filter((p) => {
  const text = p.text.replaceAll("\n", " ");

  const okQ = q.trim()
    ? text.toLowerCase().includes(q.toLowerCase())
    : true;

  const okCategory =
    activeChip === "ทั้งหมด"
      ? true
      : p.category === activeChip;

  return okQ && okCategory;
});

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      {/* ===== Main (เต็มจอ + ธีม YC) ===== */}
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

        {/* Search */}
        <div className="mt-6 w-full flex justify-center">
          <div className="w-full max-w-[980px]">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาเรื่อง หรือ คำถาม"
                className="w-full h-11 rounded-full border border-gray-300 bg-white pl-11 pr-4 outline-none focus:border-pink-300"
              />
            </div>

            {/* Chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button style={{ backgroundColor: "white" }}
                  key={c}
                  type="button"
                  onClick={() => setActiveChip(c)}
                  className={`h-9 px-4 rounded-full border text-[13px] transition-colors ${activeChip === c
                      ? "border-pink-200 bg-pink-50 text-pink-700 font-semibold"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid cards */}
        <div className="mt-6 w-full flex justify-center">
          <div className="w-full max-w-[1080px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="text-center text-gray-500">กำลังโหลดโพสต์…</div>
              ) : (
                filtered.map((p) => (
                  <PostItCard
                    key={p.id}
                    post={p}
                    authorName={userMap[String(p.userId)] || "ผู้ใช้ไม่ระบุชื่อ"}
                    onClick={() => navigate(`/yc/${p.id}`)}
                    onLikeClick={(e) => handleToggleLike(p.id, e)}
                  />
                ))
              )}

            </div>

            {/* Quote */}
            <div className="mt-8 text-center text-[18px] text-gray-700">
              “ทุกเรื่องราว มีคนรับฟัง”
            </div>
          </div>
        </div>
    
      </main >
    </div >
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

/* ===== Post-it card ===== */

function PostItCard({ post, authorName, onClick, onLikeClick }) {
  const colorStyle = getPostitColorStyle(post.color);
  const tapeStyle = getPostitTapeStyle(post.tape);
  const seed = Number(post.userId) || 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick?.(); }}
      className="text-left cursor-pointer"
      style={{ backgroundColor: "white" }}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_10px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_35px_rgba(0,0,0,0.10)] transition-shadow">
        {/* ผู้โพสต์ */}
        <div className="mb-1 flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full ${avatarColorFor(seed)} text-white text-[11px] font-semibold flex items-center justify-center shrink-0`}
          >
            {initialOf(authorName)}
          </div>
          <span className="text-[12.5px] font-medium text-gray-700 truncate">{authorName}</span>
        </div>

        {/* post-it (เทปแปะทับขอบบน เอียงเหมือนแปะเทปจริง) */}
        <div className="mt-5 relative">
          <div
            className={`absolute left-1/2 -top-3 h-5 w-24 rounded-sm ${tapeStyle.className} opacity-80 shadow-sm z-10`}
            style={{ ...tapeStyle.style, transform: "translateX(-50%) rotate(-4deg)" }}
          />

          <div className={`rounded-xl ${colorStyle.className} p-5 min-h-[150px] relative`} style={colorStyle.style}>
            <div className="whitespace-pre-line text-[15px] leading-relaxed text-gray-800">
              {post.text}
            </div>

            {/* tiny folded corner */}
            <div className="absolute right-0 bottom-0 w-10 h-10 bg-white/35 rounded-tl-2xl" />
          </div>
        </div>

        {/* footer icons */}
        <div className="mt-3 flex items-center gap-6 text-gray-600 text-[12px]">
          <button
            type="button"
            style={{ backgroundColor: "white" }}
            onClick={onLikeClick}
            className={`flex items-center gap-2 hover:opacity-70 transition ${post.liked ? "text-pink-500" : "text-gray-500"}`}
          >
            <FaRegHeart className={post.liked ? "text-pink-500" : "text-gray-500"} />
            <span>{post.likes}</span>
          </button>
          <div className="flex items-center gap-2">
            <FaRegCommentDots className="text-gray-500" />
            <span>{post.comments}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaRegPaperPlane className="text-gray-500" />
            <span>{post.shares}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

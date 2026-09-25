import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import TeacherSidebarNav from "../nav.jsx";
import StudentSidebarNav from "../navstudent.jsx";
import Header from "../Header";
import FeedPostSkeleton from "../components/FeedPostSkeleton.jsx";
import { FaSearch, FaThumbtack, FaImage, FaPaperclip, FaVideo, FaLink, FaYoutube, FaExclamationTriangle, FaRegCalendarAlt } from "react-icons/fa";
import {
  createFeedPost,
  getFeedPosts,
  getFeedPostFiles,
  getFeedPostComments,
  createFeedPostComment,
  updateFeedPostComment,
  deleteFeedPostComment,
  getFeedPostLikes,
  toggleFeedPostLike,
  toggleFeedPostPin,
  updateFeedPost,
  deleteFeedPost,
  uploadFeedPostFiles,
  deleteFeedPostFile,
  getTeacherGeneralInfo,
  getStudentGeneralInfo,
} from "../callapi/callapi_user.jsx";
import { getFilterOptions, loadFeedCategories } from "../utils/feedCategories.js";
import FeedPostCard from "../components/FeedPostCard.jsx";
import FeedPostComposerModal from "../components/FeedPostComposerModal.jsx";
import ComposerIconButton from "../components/ComposerIconButton.jsx";
import Avatar from "../components/Avatar.jsx";
import useCurrentUserProfile from "../hooks/useCurrentUserProfile.js";
import { CURRENT_USER_ID, CURRENT_TEACHER, getTodayStr, toDateOnlyStr } from "../utils/feedShared.js";

const formatEventDate = (yyyy_mm_dd) => {
  const d = new Date(yyyy_mm_dd);
  return { day: d.getDate(), month: d.toLocaleDateString("th-TH", { month: "short" }) };
};

// รูปโปรไฟล์จริงของเจ้าของโพสต์/คอมเมนต์แต่ละคน (ไม่รู้ล่วงหน้าว่าเป็นครูหรือนักเรียน ลองทั้งสองตาราง)
const fetchAvatarUrl = async (userId) => {
  const teacherInfo = await getTeacherGeneralInfo(userId).catch(() => null);
  if (teacherInfo?.avatar_url) return teacherInfo.avatar_url;
  const studentInfo = await getStudentGeneralInfo(userId).catch(() => null);
  return studentInfo?.avatar_url || null;
};

// ⚠️ TODO: ทดไว้ก่อน รอทำหน้า login ค่อยเอา user_id นักเรียนจริงมาแทน (ใช้ค่าเดียวกับที่ placeholder อื่นๆ ในฝั่งนักเรียนใช้)
const CURRENT_STUDENT_ID = "1";

export default function NewsFeedPage({ studentMode = false }) {
  const { name: myName, avatarUrl: myAvatarUrl } = useCurrentUserProfile();
  const viewerId = studentMode ? CURRENT_STUDENT_ID : CURRENT_USER_ID;
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({}); // post_id -> { count, liked }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [openCommentsIds, setOpenCommentsIds] = useState(new Set());
  const [commentDrafts, setCommentDrafts] = useState({}); // post_id -> text
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState(() => getFilterOptions());

  const postRefs = useRef({});

  // ===== โหลดฟีดจริงจาก backend ตอนเข้าเพจ (โพสต์ + ไฟล์แนบ + คอมเมนต์ + ไลก์ ของแต่ละโพสต์) =====
  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        loadFeedCategories().then(() => setCategoryOptions(getFilterOptions()));
        const raw = await getFeedPosts();

        const formatted = await Promise.all(
          raw.map(async (p) => {
            let files = [];
            try {
              files = await getFeedPostFiles(p.post_id);
            } catch (err) {
              console.error("โหลดไฟล์แนบไม่สำเร็จ:", err);
            }

            let comments = [];
            try {
              const rawComments = await getFeedPostComments(p.post_id);
              comments = rawComments.map((c) => ({
                comment_id: c.comment_id,
                userId: c.user_id,
                user: { name: c.author_name || "ผู้ใช้", avatar_url: null },
                text: c.content,
                time: c.created_at,
                parent_comment_id: c.parent_comment_id || null,
                edited: false,
              }));
            } catch (err) {
              console.error("โหลดคอมเมนต์ไม่สำเร็จ:", err);
            }

            try {
              const likeData = await getFeedPostLikes(p.post_id, viewerId);
              setLikes((prev) => ({ ...prev, [p.post_id]: likeData }));
            } catch (err) {
              console.error("โหลดไลก์ไม่สำเร็จ:", err);
            }

            return {
              post_id: p.post_id,
              authorId: p.author_id,
              // avatar_url ใส่ทีหลังหลัง Promise.all นี้เสร็จ (ดึงรูปจริงของทุกคนที่เกี่ยวข้องทีเดียว ด้านล่าง)
              author: {
                name: p.author_name || CURRENT_TEACHER.name,
                role: "ครูแนะแนว",
                avatar_url: null,
              },
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              edited: !!(p.updated_at && p.updated_at !== p.created_at),
              pinned: !!p.pinned,
              category: p.category,
              eventDate: p.event_date,
              eventEndDate: p.event_end_date,
              title: p.title,
              content: p.content,
              files,
              link: p.link_url ? { title: p.link_url, url: p.link_url } : null,
              youtubeUrl: p.youtube_url || null,
              comments,
            };
          })
        );

        // ดึงรูปโปรไฟล์จริงของทุกคนที่เกี่ยวข้อง (เจ้าของโพสต์ + คนคอมเมนต์) ทีเดียวหลังโหลดฟีดเสร็จ ไม่ต้องยิงทีละคนซ้ำๆ
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

        setPosts(formatted);
      } catch (err) {
        console.error("โหลดฟีดข่าวสารไม่สำเร็จ:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  // รีเฟรชรายการหมวดหมู่ตัวกรองทุกครั้งที่โพสต์เปลี่ยน เผื่อครูเพิ่งเพิ่มหมวดหมู่ใหม่ตอนโพสต์/แก้ไข
  useEffect(() => {
    setCategoryOptions(getFilterOptions());
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [posts, category, search]);

  const pinnedPosts = posts.filter((p) => p.pinned);
  const urgentPosts = useMemo(
    () =>
      posts
        .filter((p) => p.category === "urgent")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [posts]
  );
  const recentPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    [posts]
  );
  // ปฏิทินกิจกรรม — ดึงจากโพสต์หมวด "กิจกรรม" จริงที่ยังไม่ผ่านวันจัดงาน เรียงใกล้สุดก่อน
  const upcomingEvents = useMemo(() => {
    const today = getTodayStr();
    return posts
      .filter((p) => p.category === "event" && p.eventDate && toDateOnlyStr(p.eventDate) >= today)
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .map((p) => ({ post_id: p.post_id, date: p.eventDate, label: p.title }));
  }, [posts]);

  // เลื่อนไปโพสต์ที่คลิกจาก sidebar (ปักหมุด / ปฏิทินกิจกรรม / ประกาศล่าสุด) พร้อม flash ขอบชมพูให้เห็นว่าเลื่อนมาถึงแล้ว
  const scrollToPost = (postId) => {
    if (category !== "all" || search.trim()) {
      setCategory("all");
      setSearch("");
    }
    requestAnimationFrame(() => {
      const el = postRefs.current[postId];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-pink-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-pink-400"), 1500);
    });
  };

  // มาจากลิงก์ #post-<id> (เช่นกดชื่อโพสต์จากหน้ารายละเอียดรูปภาพกิจกรรม) ให้เลื่อนไปหาโพสต์นั้นอัตโนมัติ
  useEffect(() => {
    if (posts.length === 0) return;
    const match = window.location.hash.match(/^#post-(.+)$/);
    if (!match) return;
    scrollToPost(match[1]);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [posts]);

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
      const res = await toggleFeedPostLike(postId, viewerId);
      setLikes((prev) => ({ ...prev, [postId]: res }));
    } catch (err) {
      console.error("กดถูกใจไม่สำเร็จ:", err);
    }
  };

  // ใช้ทั้งกับคอมเมนต์หลักและการตอบกลับ (ส่ง parentCommentId มาด้วยถ้าเป็นการตอบกลับ)
  const submitComment = async (postId, text, parentCommentId = null) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    try {
      await createFeedPostComment({ post_id: postId, user_id: viewerId, content: trimmed, parent_comment_id: parentCommentId });

      if (studentMode) {
        // ฝั่งนักเรียนยังไม่มีระบบล็อกอินจริง ไม่รู้ชื่อ-รูปนักเรียนที่แสดงผลล่วงหน้า จึงดึงคอมเมนต์ชุดล่าสุดจาก backend มาแทนการต่อข้อมูลจำลองเอง
        try {
          const rawComments = await getFeedPostComments(postId);
          const freshComments = rawComments.map((c) => ({
            comment_id: c.comment_id,
            userId: c.user_id,
            user: { name: c.author_name || "ผู้ใช้", avatar_url: null },
            text: c.content,
            time: c.created_at,
            parent_comment_id: c.parent_comment_id || null,
            edited: false,
          }));
          setPosts((prev) => prev.map((p) => (p.post_id === postId ? { ...p, comments: freshComments } : p)));
        } catch (err) {
          console.error("โหลดคอมเมนต์ใหม่ไม่สำเร็จ:", err);
        }
      } else {
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? {
                  ...p,
                  comments: [
                    ...p.comments,
                    { comment_id: Date.now(), userId: viewerId, user: { name: myName, avatar_url: myAvatarUrl }, text: trimmed, time: new Date().toISOString(), parent_comment_id: parentCommentId, edited: false },
                  ],
                }
              : p
          )
        );
      }
      setOpenCommentsIds((prev) => new Set(prev).add(postId));
    } catch (err) {
      console.error("แสดงความคิดเห็นไม่สำเร็จ:", err);
      Swal.fire("แสดงความคิดเห็นไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const editComment = async (postId, commentId, newText) => {
    try {
      await updateFeedPostComment(commentId, { user_id: viewerId, content: newText });
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
      await deleteFeedPostComment(commentId, viewerId);
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

  // ปักหมุด/เลิกปักหมุดจากเมนู "..." บนโพสต์ที่โพสต์ไปแล้ว
  const togglePin = async (postId) => {
    setOpenMenuId(null);
    try {
      const res = await toggleFeedPostPin(postId);
      setPosts((prev) => prev.map((p) => (p.post_id === postId ? { ...p, pinned: res.pinned } : p)));
    } catch (err) {
      console.error("ปักหมุดไม่สำเร็จ:", err);
      Swal.fire("ปักหมุดไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const openEditModal = (post) => {
    setOpenMenuId(null);
    setEditingPost(post);
    setPostModalOpen(true);
  };

  const deletePost = async (postId) => {
    setOpenMenuId(null);
    const result = await Swal.fire({
      title: "ลบโพสต์นี้?",
      text: "ลบแล้วนักเรียนจะไม่เห็นโพสต์นี้อีก",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบโพสต์",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteFeedPost(postId);
      setPosts((prev) => prev.filter((p) => p.post_id !== postId));
      Swal.fire({ icon: "success", title: "ลบโพสต์แล้ว", timer: 1000, showConfirmButton: false });
    } catch (err) {
      console.error("ลบโพสต์ไม่สำเร็จ:", err);
      Swal.fire("ลบไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  // สร้างโพสต์ + อัปโหลดไฟล์แนบในคำขอเดียว (feed-posts รองรับ multipart create+upload พร้อมกัน ต่างจาก news/announcement)
  const createPost = async ({ title, content, category: chosenCategory, eventDate, eventEndDate, attachments, youtubeUrl }) => {
    try {
      const formData = new FormData();
      formData.append("author_id", CURRENT_USER_ID);
      formData.append("title", title);
      formData.append("content", content);
      formData.append("category", chosenCategory);
      if (chosenCategory === "event" && eventDate) formData.append("event_date", eventDate);
      if (chosenCategory === "event" && eventEndDate) formData.append("event_end_date", eventEndDate);

      const linkItem = attachments.find((a) => a.kind === "link");
      if (linkItem) formData.append("link_url", linkItem.url);
      if (youtubeUrl) formData.append("youtube_url", youtubeUrl);

      attachments.filter((a) => a.kind === "image" || a.kind === "video" || a.kind === "file").forEach((a) => formData.append("files", a.file));

      const res = await createFeedPost(formData);

      const newPost = {
        post_id: res.post_id,
        authorId: CURRENT_USER_ID,
        author: { name: myName, role: CURRENT_TEACHER.role, avatar_url: myAvatarUrl },
        createdAt: new Date().toISOString(),
        pinned: false,
        category: chosenCategory,
        eventDate: chosenCategory === "event" ? eventDate : null,
        eventEndDate: chosenCategory === "event" ? res.event_end_date || null : null,
        title: res.title,
        content: res.content,
        files: res.files || [],
        link: res.link_url ? { title: res.link_url, url: res.link_url } : null,
        youtubeUrl: res.youtube_url || youtubeUrl || null,
        comments: [],
      };

      setPosts((prev) => [newPost, ...prev]);
      setLikes((prev) => ({ ...prev, [newPost.post_id]: { count: 0, liked: false } }));
      setPostModalOpen(false);
      Swal.fire({ icon: "success", title: "โพสต์แล้ว", timer: 1000, showConfirmButton: false });
    } catch (err) {
      console.error("โพสต์ไม่สำเร็จ:", err);
      Swal.fire("โพสต์ไม่สำเร็จ", err?.response?.data?.message || "ลองใหม่อีกครั้ง", "error");
    }
  };

  // แก้ไขโพสต์ตัวเอง — อัปเดตข้อความ + ลบไฟล์ที่เอาออก + อัปโหลดไฟล์ใหม่ที่เพิ่ม (เหมือน pattern ของ news.jsx)
  const editPost = async (postId, { title, content, category: chosenCategory, eventDate, eventEndDate, attachments, removedFileIds, youtubeUrl }) => {
    try {
      const linkItem = attachments.find((a) => a.kind === "link");
      await updateFeedPost(postId, {
        title,
        content,
        category: chosenCategory,
        event_date: chosenCategory === "event" ? eventDate : null,
        event_end_date: chosenCategory === "event" ? eventEndDate || null : null,
        link_url: linkItem ? linkItem.url : null,
        youtube_url: youtubeUrl || null,
      });

      for (const fileId of removedFileIds || []) {
        try {
          await deleteFeedPostFile(fileId);
        } catch (err) {
          console.error("ลบไฟล์เดิมไม่สำเร็จ:", err);
        }
      }

      const newFileAttachments = attachments.filter((a) => (a.kind === "image" || a.kind === "video" || a.kind === "file") && a.file);
      if (newFileAttachments.length) {
        try {
          await uploadFeedPostFiles(postId, newFileAttachments.map((a) => a.file));
        } catch (err) {
          console.error("อัปโหลดไฟล์ใหม่ไม่สำเร็จ:", err);
          Swal.fire("บันทึกสำเร็จ", "แต่แนบไฟล์ใหม่ไม่สำเร็จ ลองแก้ไขแล้วแนบใหม่อีกครั้ง", "warning");
        }
      }

      // ดึงไฟล์แนบชุดล่าสุดจาก backend ใหม่หลังลบ/อัปโหลด แทนที่จะปะติดปะต่อเอง กันข้อมูลเพี้ยน
      let freshFiles = [];
      try {
        freshFiles = await getFeedPostFiles(postId);
      } catch (err) {
        console.error("โหลดไฟล์แนบหลังแก้ไขไม่สำเร็จ:", err);
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? {
                ...p,
                title,
                content,
                category: chosenCategory,
                eventDate: chosenCategory === "event" ? eventDate : null,
                eventEndDate: chosenCategory === "event" ? eventEndDate || null : null,
                files: freshFiles,
                link: linkItem ? { title: linkItem.url, url: linkItem.url } : null,
                youtubeUrl: youtubeUrl || null,
                updatedAt: new Date().toISOString(),
                edited: true,
              }
            : p
        )
      );

      setPostModalOpen(false);
      setEditingPost(null);
      Swal.fire({ icon: "success", title: "บันทึกการแก้ไขแล้ว", timer: 1000, showConfirmButton: false });
    } catch (err) {
      console.error("แก้ไขโพสต์ไม่สำเร็จ:", err);
      Swal.fire("แก้ไขไม่สำเร็จ", err?.response?.data?.message || "ลองใหม่อีกครั้ง", "error");
    }
  };

  const handleModalConfirm = (payload) => (editingPost ? editPost(editingPost.post_id, payload) : createPost(payload));

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <Header />
      {studentMode ? <StudentSidebarNav /> : <TeacherSidebarNav />}

      <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
        {/* ===== Header ===== */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="page-title">กิจกรรม</h1>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาข่าว..."
                className="h-11 w-64 rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[16px] outline-none focus:border-pink-400"
              />
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-[15px]">
            โหลดข่าวสารไม่สำเร็จ — ตรวจสอบว่า backend เปิด endpoint <code>/feed-posts</code> แล้วหรือยัง
          </div>
        )}

        {/* ===== Category chips ===== */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryOptions.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`h-9 px-4 rounded-full border text-[15px] font-medium transition-colors ${
                category === c.key
                  ? "bg-pink-500 border-pink-500 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* ===== 2-column layout — กิจกรรม/ประกาศ/ปักหมุด รวมกันไว้ฝั่งขวาหมดเลย ===== */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">
          {/* ---- Center feed ---- */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* Composer — ฝั่งนักเรียนดูได้อย่างเดียว ไม่มีสิทธิ์โพสต์ */}
            {!studentMode && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <Avatar src={myAvatarUrl} name={myName} size={48} />
                  <button
                    type="button"
                    onClick={() => setPostModalOpen(true)}
                    className="flex-1 h-11 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 px-4 text-left text-[17px] text-gray-400"
                  >
                    ต้องการประกาศอะไรให้นักเรียนทราบ?
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <ComposerIconButton icon={<FaImage className="text-emerald-500" />} label="รูป" onClick={() => setPostModalOpen(true)} />
                    <ComposerIconButton icon={<FaPaperclip className="text-blue-500" />} label="ไฟล์" onClick={() => setPostModalOpen(true)} />
                    <ComposerIconButton icon={<FaVideo className="text-red-500" />} label="วิดีโอ" onClick={() => setPostModalOpen(true)} />
                    <ComposerIconButton icon={<FaLink className="text-purple-500" />} label="ลิงก์" onClick={() => setPostModalOpen(true)} />
                    <ComposerIconButton icon={<FaYoutube className="text-red-500" />} label="YouTube" onClick={() => setPostModalOpen(true)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPostModalOpen(true)}
                    className="h-10 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-semibold"
                  >
                    โพสต์
                  </button>
                </div>
              </div>
            )}

            {/* Feed */}
            {loading && (
              <FeedPostSkeleton />
            )}

            {!loading && filteredPosts.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
                ไม่พบข่าวสารที่ตรงกับตัวกรอง
              </div>
            )}

            {!loading &&
              filteredPosts.map((post) => (
                <FeedPostCard
                  key={post.post_id}
                  post={post}
                  isOwner={!studentMode && String(post.authorId) === CURRENT_USER_ID}
                  hideMenu={studentMode}
                  innerRef={(el) => { postRefs.current[post.post_id] = el; }}
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
                  menuOpen={openMenuId === post.post_id}
                  onToggleMenu={() => setOpenMenuId((prev) => (prev === post.post_id ? null : post.post_id))}
                  onTogglePin={() => togglePin(post.post_id)}
                  onEdit={() => openEditModal(post)}
                  onDelete={() => deletePost(post.post_id)}
                  currentUserId={viewerId}
                  onEditComment={(commentId, text) => editComment(post.post_id, commentId, text)}
                  onDeleteComment={(commentId) => deleteCommentHandler(post.post_id, commentId)}
                />
              ))}
          </div>

          {/* ---- Right sidebar ---- */}
          <div className="hidden xl:flex flex-col gap-6">
            {/* ปักหมุด — ย้ายมาไว้บนสุด ให้เห็นก่อนอย่างอื่น */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-5">
              <div className="text-[16px] font-semibold text-purple-800 mb-4 flex items-center gap-2">
                <FaThumbtack className="text-purple-600" /> ปักหมุด
              </div>
              {pinnedPosts.length === 0 ? (
                <div className="text-[15px] text-purple-700/70">ยังไม่มีข่าวปักหมุด</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {pinnedPosts.map((p) => (
                    <button
                      key={p.post_id}
                      type="button"
                      onClick={() => scrollToPost(p.post_id)}
                      className="text-[15px] text-purple-900 hover:underline cursor-pointer truncate text-left bg-transparent"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ประกาศด่วน — โพสต์หมวด "ด่วน" เอาไว้เหนือปฏิทินกิจกรรม เตือนให้เห็นก่อน */}
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
              <div className="text-[16px] font-semibold text-red-700 mb-4 flex items-center gap-2">
                <FaExclamationTriangle size={14} /> ประกาศด่วน
              </div>
              {urgentPosts.length === 0 ? (
                <div className="text-[15px] text-red-700/70">ยังไม่มีประกาศด่วน</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {urgentPosts.map((p) => (
                    <button
                      key={p.post_id}
                      type="button"
                      onClick={() => scrollToPost(p.post_id)}
                      className="text-[15px] text-red-700 hover:underline cursor-pointer truncate text-left bg-transparent font-medium"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ปฏิทินกิจกรรม — ดึงจากโพสต์หมวดกิจกรรมจริงที่ยังไม่ผ่านวันจัดงาน */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
              <div className="text-[16px] font-semibold text-sky-800 mb-4 flex items-center gap-2">
                <FaRegCalendarAlt size={14} /> ปฏิทินกิจกรรม
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="text-[15px] text-sky-700/70">ยังไม่มีกิจกรรมที่จะถึง</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcomingEvents.map((ev) => {
                    const { day, month } = formatEventDate(ev.date);
                    return (
                      <button
                        key={ev.post_id}
                        type="button"
                        onClick={() => scrollToPost(ev.post_id)}
                        className="flex items-center gap-3 text-left bg-transparent"
                      >
                        <div className="w-13 h-13 rounded-xl bg-white border border-sky-200 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[17px] font-bold text-sky-700 leading-none">{day}</span>
                          <span className="text-[12px] text-sky-500 leading-none mt-1">{month}</span>
                        </div>
                        <div className="text-[15px] text-gray-700 leading-snug hover:underline truncate">{ev.label}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ประกาศล่าสุด */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-[16px] font-semibold text-gray-900 mb-4">ประกาศล่าสุด</div>
              {recentPosts.length === 0 ? (
                <div className="text-[15px] text-gray-400">ยังไม่มีประกาศ</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {recentPosts.map((p) => (
                    <button
                      key={p.post_id}
                      type="button"
                      onClick={() => scrollToPost(p.post_id)}
                      className="flex items-start gap-2 text-[15px] text-gray-600 hover:text-gray-900 text-left bg-transparent"
                    >
                      <span className="text-pink-400 mt-0.5 shrink-0">•</span>
                      <span className="truncate">{p.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {postModalOpen && (
        <FeedPostComposerModal
          initialData={editingPost}
          onClose={() => {
            setPostModalOpen(false);
            setEditingPost(null);
          }}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
}

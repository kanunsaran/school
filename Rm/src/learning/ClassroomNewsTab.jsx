import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FaThumbtack,
  FaQrcode,
  FaCalendarAlt,
  FaPhoneAlt,
  FaClipboardList,
  FaClock,
  FaUsers,
  FaImage,
  FaVideo,
  FaPaperclip,
  FaLink,
  FaYoutube,
} from "react-icons/fa";
import FeedPostCard from "../components/FeedPostCard.jsx";
import PageLoading from "../components/PageLoading.jsx";
import FeedPostComposerModal from "../components/FeedPostComposerModal.jsx";
import ComposerIconButton from "../components/ComposerIconButton.jsx";
import Avatar from "../components/Avatar.jsx";
import {
  createNews,
  getNews,
  updateNews,
  deleteNews,
  getNewsComments,
  createNewComment,
  updateComment,
  deleteComment,
  getNewsLikes,
  toggleNewsLike,
  uploadNewsFiles,
  getNewsFiles,
  deleteNewsFile,
  getAssAll,
} from "../callapi/callapi_user.jsx";
import { CURRENT_USER_ID } from "../utils/feedShared.js";
import useCurrentUserProfile from "../hooks/useCurrentUserProfile.js";
import { gradeLabel } from "../utils/gradeLabel.js";

// เดาว่าเนื้อหาเป็น HTML จาก rich text editor เดิมหรือ plain text จาก composer ใหม่ (แยกไม่ได้จาก field เดียว
// แต่ CKEditor ห่อด้วย <p>/<div> เสมอ ส่วน textarea ธรรมดาแทบไม่มีทางขึ้นต้นด้วย tag แบบนั้น)
const looksLikeHtml = (content = "") => /^\s*<[a-z]/i.test(content);

// เหลืออีกกี่วันถึงกำหนดส่ง เอาไว้ทำ badge "เหลืออีก X วัน" สีแดง
const daysUntil = (dateStr) => {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.setHours(23, 59, 59, 999) - now.getTime()) / 86400000);
};

// แปลงแถว news จาก backend ให้เป็น shape เดียวกับที่ FeedPostCard (ใช้ร่วมกับ /newsfeed) ต้องการ
// ไม่มี category/pinned/eventDate เพราะตาราง news ไม่มีแนวคิดนี้ — ส่ง showCategory/showPin={false} ให้การ์ดซ่อนส่วนนั้นไปเลย
const normalizePost = (n, comments, files, authorProfile) => ({
  post_id: n.news_id,
  authorId: n.user_id,
  author: { name: authorProfile.name, role: "ครูแนะแนว", avatar_url: authorProfile.avatarUrl },
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

// แท็บ "ข่าวสาร" — ดึงจากตาราง news เดียวกับหน้า /news แต่กรองเฉพาะ class_id ของห้องนี้เท่านั้น
// (คนละตารางกับ /newsfeed ที่ใช้ feed_posts สำหรับข่าว/กิจกรรมทั้งโรงเรียน — ใช้แจ้งเรื่องเฉพาะห้อง เช่น "วันนี้งดเรียน" "ย้ายห้องเรียน")
export default function ClassroomNewsTab() {
  const navigate = useNavigate();
  const { classInfo, gradeId, members } = useOutletContext();
  const { name: myName, avatarUrl: myAvatarUrl } = useCurrentUserProfile();

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [openCommentsIds, setOpenCommentsIds] = useState(new Set());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);

  const [upcomingWork, setUpcomingWork] = useState([]);

  // ===== โหลดประกาศจาก /news แล้วกรองเฉพาะ class_id ของห้องนี้ (GET /news ไม่รองรับกรองฝั่ง backend จึงกรองเองที่นี่) =====
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
              const likeData = await getNewsLikes(n.news_id, CURRENT_USER_ID);
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

            return normalizePost(n, comments, files, { name: myName, avatarUrl: myAvatarUrl });
          })
        );

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

  // ===== ใกล้ครบกำหนด — งานจริงจาก /assignment ที่ยังไม่ถึงกำหนดส่ง
  //       (backend ยังไม่ส่ง class scoping กลับมา ดูหมายเหตุตอนสรุปให้ทีม backend) =====
  useEffect(() => {
    getAssAll()
      .then((data) => {
        const now = Date.now();
        const upcoming = (data || [])
          .filter((a) => a.deadline && new Date(a.deadline).getTime() >= now)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
          .slice(0, 5);
        setUpcomingWork(upcoming);
      })
      .catch((err) => console.error("โหลดงานใกล้ครบกำหนดไม่สำเร็จ:", err));
  }, []);

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
      const res = await toggleNewsLike(postId, CURRENT_USER_ID);
      setLikes((prev) => ({ ...prev, [postId]: res }));
    } catch (err) {
      console.error("กดถูกใจไม่สำเร็จ:", err);
    }
  };

  const submitComment = async (postId, text, parentCommentId = null) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    try {
      const result = await createNewComment({ news_id: postId, user_id: CURRENT_USER_ID, content: trimmed, parent_comment_id: parentCommentId });
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? {
                ...p,
                comments: [
                  ...p.comments,
                  { comment_id: result.comment_id, userId: CURRENT_USER_ID, user: { name: myName, avatar_url: myAvatarUrl }, text: trimmed, time: new Date().toISOString(), parent_comment_id: parentCommentId, edited: false },
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
      await updateComment(commentId, { user_id: CURRENT_USER_ID, content: newText });
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
      await deleteComment(commentId, CURRENT_USER_ID);
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
      await deleteNews(postId);
      setPosts((prev) => prev.filter((p) => p.post_id !== postId));
      Swal.fire({ icon: "success", title: "ลบโพสต์แล้ว", timer: 1000, showConfirmButton: false });
    } catch (err) {
      console.error("ลบโพสต์ไม่สำเร็จ:", err);
      Swal.fire("ลบไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  // สร้างประกาศ — บังคับ class_id เป็นห้องนี้เสมอ (popup เดียวกับ /newsfeed แค่ปิดหมวดหมู่)
  const createPost = async ({ title, content, attachments, youtubeUrl }) => {
    try {
      const linkItem = attachments.find((a) => a.kind === "link");
      const newFileAttachments = attachments.filter((a) => (a.kind === "image" || a.kind === "video" || a.kind === "file") && a.file);

      const data = {
        class_id: gradeId,
        title,
        content,
        youtube_url: youtubeUrl || null,
        link_url: linkItem?.url || null,
      };

      const res = await createNews(data);

      let files = [];
      if (newFileAttachments.length) {
        try {
          const uploadResult = await uploadNewsFiles(res.news_id, newFileAttachments.map((a) => a.file));
          files = uploadResult.files || [];
        } catch (uploadErr) {
          console.error(uploadErr);
          Swal.fire("โพสต์สำเร็จ", "แต่แนบไฟล์ไม่สำเร็จ ลองแก้ไขโพสต์แล้วแนบใหม่อีกครั้ง", "warning");
        }
      }

      const newPost = normalizePost(
        { news_id: res.news_id, user_id: CURRENT_USER_ID, created_at: new Date().toISOString(), title: res.title, content: res.content, youtube_url: res.youtube_url || data.youtube_url, link_url: data.link_url },
        [],
        files,
        { name: myName, avatarUrl: myAvatarUrl }
      );

      setPosts((prev) => [newPost, ...prev]);
      setLikes((prev) => ({ ...prev, [newPost.post_id]: { count: 0, liked: false } }));
      setPostModalOpen(false);
      Swal.fire({ icon: "success", title: "โพสต์แล้ว", timer: 1000, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire("โพสต์ไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const editPost = async (postId, { title, content, attachments, removedFileIds, youtubeUrl }) => {
    try {
      const linkItem = attachments.find((a) => a.kind === "link");
      const keptFileAttachments = attachments.filter((a) => (a.kind === "image" || a.kind === "video" || a.kind === "file") && a.existing);
      const newFileAttachments = attachments.filter((a) => (a.kind === "image" || a.kind === "video" || a.kind === "file") && a.file);

      const data = { title, content, youtube_url: youtubeUrl || null, link_url: linkItem?.url || null };
      await updateNews(postId, data);

      for (const fileId of removedFileIds || []) {
        try {
          await deleteNewsFile(fileId);
        } catch (deleteErr) {
          console.error(deleteErr);
        }
      }

      let uploadedFiles = [];
      if (newFileAttachments.length) {
        try {
          const uploadResult = await uploadNewsFiles(postId, newFileAttachments.map((a) => a.file));
          uploadedFiles = uploadResult.files || [];
        } catch (uploadErr) {
          console.error(uploadErr);
          Swal.fire("บันทึกสำเร็จ", "แต่แนบไฟล์ใหม่ไม่สำเร็จ ลองอีกครั้ง", "warning");
        }
      }

      const keptFiles = keptFileAttachments.map((a) => ({ file_id: a.file_id, file_url: a.previewUrl, file_name: a.name }));
      const files = [...keptFiles, ...uploadedFiles];

      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? { ...p, title, content, isHtml: looksLikeHtml(content), link: linkItem ? { title: linkItem.url, url: linkItem.url } : null, youtubeUrl: youtubeUrl || null, files }
            : p
        )
      );
      setEditingPost(null);
      setPostModalOpen(false);
      Swal.fire({ icon: "success", title: "บันทึกการแก้ไขแล้ว", timer: 1000, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire("แก้ไขไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const handleModalConfirm = (payload) => (editingPost ? editPost(editingPost.post_id, payload) : createPost(payload));

  return (
    <>
      {loadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-[15px]">
          โหลดประกาศไม่สำเร็จ — ตรวจสอบว่า backend เปิด endpoint <code>/news</code> แล้วหรือยัง
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ---- Center feed (75%) ---- */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Composer */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Avatar src={myAvatarUrl} name={myName} size={48} />
              <button
                type="button"
                onClick={() => setPostModalOpen(true)}
                className="flex-1 h-11 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 px-4 text-left text-[17px] text-gray-400"
              >
                ประกาศบางสิ่งให้ห้อง {classInfo ? gradeLabel(classInfo) : "นี้"}...
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <ComposerIconButton icon={<FaImage className="text-emerald-500" />} label="รูป" onClick={() => setPostModalOpen(true)} />
                <ComposerIconButton icon={<FaVideo className="text-red-500" />} label="วิดีโอ" onClick={() => setPostModalOpen(true)} />
                <ComposerIconButton icon={<FaPaperclip className="text-blue-500" />} label="ไฟล์" onClick={() => setPostModalOpen(true)} />
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

          {loading && (
            <PageLoading />
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
                isOwner={String(post.authorId) === CURRENT_USER_ID}
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
                menuOpen={openMenuId === post.post_id}
                onToggleMenu={() => setOpenMenuId((prev) => (prev === post.post_id ? null : post.post_id))}
                onEdit={() => openEditModal(post)}
                onDelete={() => deletePost(post.post_id)}
                currentUserId={CURRENT_USER_ID}
                onEditComment={(commentId, text) => editComment(post.post_id, commentId, text)}
                onDeleteComment={(commentId) => deleteCommentHandler(post.post_id, commentId)}
              />
            ))}
        </div>

        {/* ---- Right sidebar (25%) ---- */}
        <div className="hidden xl:flex flex-col gap-6">
          {/* 📌 ทางลัดห้องเรียน — ตาราง news ไม่มีระบบปักหมุดจริง เลยทำเป็นทางลัดแทน */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="text-[16px] font-semibold text-amber-800 mb-4 flex items-center gap-2">
              <FaThumbtack className="text-amber-600" /> ทางลัดห้องเรียน
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`/classroom/${gradeId}/attendance`)}
                className="flex items-center gap-2.5 text-[15px] text-gray-700 hover:text-pink-700 bg-transparent text-left"
              >
                <FaQrcode className="text-pink-500 shrink-0" /> QR เช็คชื่อ
              </button>
              <button
                type="button"
                onClick={() => Swal.fire({ icon: "info", title: "ตารางเรียน", text: "ฟีเจอร์นี้ยังไม่เปิดใช้งาน", confirmButtonText: "รับทราบ" })}
                className="flex items-center gap-2.5 text-[15px] text-gray-700 hover:text-pink-700 bg-transparent text-left"
              >
                <FaCalendarAlt className="text-pink-500 shrink-0" /> ตารางเรียน
              </button>
              {/* <button
                type="button"
                onClick={() =>
                  Swal.fire({
                    icon: "info",
                    title: "ครูที่ปรึกษา",
                    text: classInfo?.teacher_name || "ยังไม่ระบุ",
                    confirmButtonText: "รับทราบ",
                  })
                }
                className="flex items-center gap-2.5 text-[15px] text-gray-700 hover:text-pink-700 bg-transparent text-left"
              >
                <FaPhoneAlt className="text-pink-500 shrink-0" /> ครูที่ปรึกษา {classInfo?.teacher_name || "ยังไม่ระบุ"}
              </button> */}
              <button
                type="button"
                onClick={() => Swal.fire({ icon: "info", title: "กติกาห้องเรียน", text: "ฟีเจอร์นี้ยังไม่เปิดใช้งาน", confirmButtonText: "รับทราบ" })}
                className="flex items-center gap-2.5 text-[15px] text-gray-700 hover:text-pink-700 bg-transparent text-left"
              >
                <FaClipboardList className="text-pink-500 shrink-0" /> กติกาห้องเรียน
              </button>
            </div>
          </div>

          {/* ⏰ ใกล้ครบกำหนด */}
          {/* <div className="rounded-2xl border border-pink-200 bg-pink-50/60 p-5">
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
                    <button key={a.ass_id} type="button" onClick={() => navigate(`/work/${a.ass_id}`)} className="text-left bg-transparent">
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
          </div> */}

          {/* 👥 สมาชิกในห้อง — กดแล้วไปแท็บนักเรียนของห้องนี้ */}
          <button
            type="button"
            onClick={() => navigate(`/classroom/${gradeId}/students`)}
            className="rounded-2xl border border-gray-200 bg-white p-5 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-[16px] font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaUsers className="text-gray-500" /> สมาชิกในห้อง
            </div>
            {members.length === 0 ? (
              <div className="text-[15px] text-gray-400">ยังไม่มีนักเรียนในห้องนี้</div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {members.slice(0, 9).map((m) => (
                  <Avatar key={m.user_id} src={m.avatar_url} name={m.fullname} size={36} />
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

      {postModalOpen && (
        <FeedPostComposerModal
          initialData={editingPost}
          showCategory={false}
          postToLabel={`โพสต์ถึง ${classInfo ? gradeLabel(classInfo) : "ห้องเรียนนี้"}`}
          onClose={() => {
            setPostModalOpen(false);
            setEditingPost(null);
          }}
          onConfirm={handleModalConfirm}
        />
      )}
    </>
  );
}

import { useState, useEffect } from "react";
import SidebarNav from "../../nav.jsx";
import Header from "../../Header.jsx";
import CommentThread from "../../components/CommentThread.jsx";
import {
  getNews,
  getNewsComments,
  createNewComment,
  updateComment,
  deleteComment,
  getNewsLikes,
  toggleNewsLike,
} from "../../callapi/callapi_user.jsx";

import { useNavigate } from "react-router-dom";

// ⚠️ TODO: ทดไว้ก่อน รอทำหน้า login ค่อยเอา user_id จริงมาแทน
const CURRENT_USER_ID = "1";

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5 shrink-0"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function StudentNewsPage() {
  const navigate = useNavigate();

  const student = {
    name: "นักเรียน",
    avatar: "https://i.pravatar.cc/120?img=12",
  };

  const [bannerImage] = useState(
    "https://images.pexels.com/photos/4144222/pexels-photo-4144222.jpeg"
  );

  const teacher = {
    name: "คุณครู สุพรรณี",
    avatar: "https://i.pravatar.cc/120?img=47",
  };

  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({}); // { [postId]: { count, liked } }

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getNews();

        const formatted = await Promise.all(
          data.map(async (n) => {
            const date = new Date(n.created_at);

            let comments = [];
            try {
              const rawComments = await getNewsComments(n.news_id);
              comments = rawComments.map((c) => ({
                id: c.comment_id,
                user_id: c.user_id,
                author: c.author_name,
                text: c.content,
                parent_comment_id: c.parent_comment_id || null,
                time: new Date(c.created_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }));
            } catch (err) {
              console.error("โหลดคอมเมนต์ไม่สำเร็จ:", err);
            }

            try {
              const likeData = await getNewsLikes(n.news_id, CURRENT_USER_ID);
              setLikes((prev) => ({ ...prev, [n.news_id]: likeData }));
            } catch (err) {
              console.error("โหลดไลก์ไม่สำเร็จ:", err);
            }

            return {
              id: n.news_id,
              author: teacher.name,
              avatar: teacher.avatar,
              date: date.toLocaleDateString("th-TH"),
              time: date.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              content: n.content,
              youtube_url: n.youtube_url,
              link_url: n.link_url,
              comments,
            };
          })
        );

        setPosts(formatted);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNews();
  }, []);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============ LIKE ============
  const handleToggleLike = async (postId) => {
    try {
      const result = await toggleNewsLike(postId, CURRENT_USER_ID);
      setLikes((prev) => ({ ...prev, [postId]: result }));
    } catch (err) {
      console.error(err);
    }
  };

  // ============ SHARE ============
  const handleShare = async (postId) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "รายวิชาแนะแนว", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("คัดลอกลิงก์แล้ว");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ============ COMMENT: CREATE (parentId = null คือคอมเมนต์หลัก, มีค่า = ตอบกลับ) ============
  const handleAddNewComment = async (postId, text, parentId) => {
    if (!text?.trim()) return;

    try {
      const result = await createNewComment({
        news_id: postId,
        user_id: CURRENT_USER_ID,
        content: text,
        parent_comment_id: parentId,
      });

      const newComment = {
        id: result.comment_id,
        user_id: CURRENT_USER_ID,
        author: student.name,
        text,
        parent_comment_id: parentId,
        time: getCurrentTime(),
      };

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, newComment] }
            : post
        )
      );
    } catch (err) {
      console.error(err);
      alert("ส่งความคิดเห็นไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  // ============ COMMENT: EDIT ============
  const saveEditComment = async (postId, commentId, text) => {
    if (!text?.trim()) return;

    try {
      await updateComment(commentId, {
        user_id: CURRENT_USER_ID,
        content: text,
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.map((c) =>
                  c.id === commentId ? { ...c, text } : c
                ),
              }
            : post
        )
      );
    } catch (err) {
      console.error(err);
      alert("แก้ไขความคิดเห็นไม่สำเร็จ");
    }
  };

  // ============ COMMENT: DELETE (ลบทั้งคอมเมนต์ตอบกลับที่อยู่ใต้มันด้วย) ============
  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("ต้องการลบความคิดเห็นนี้ใช่ไหม?")) return;

    try {
      await deleteComment(commentId, CURRENT_USER_ID);

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.filter(
                  (c) => c.id !== commentId && c.parent_comment_id !== commentId
                ),
              }
            : post
        )
      );
    } catch (err) {
      console.error(err);
      alert("ลบความคิดเห็นไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] flex text-[15px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="w-full">
          {/* Banner */}
          <section className="relative rounded-3xl overflow-hidden shadow-md">
            <img src={bannerImage} className="w-full h-[200px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/10" />
            <div className="absolute left-10 bottom-8 text-white">
              <h1 className="text-4xl font-bold tracking-tight">รายวิชาแนะแนว</h1>
              <p className="text-sm opacity-90 mt-2">
                รายวิชาแนะแนว • 09.25 - 10.20 น. • ห้อง 332
              </p>
            </div>
          </section>

          {/* Feed */}
          <div className="mt-10 space-y-6">
            {posts.map((post) => {
              const likeInfo = likes[post.id] || { count: 0, liked: false };

              return (
                <div
                  key={post.id}
                  id={`post-${post.id}`}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition"
                >
                  <div className="px-6 pt-6 pb-4 flex gap-4">
                    <img src={post.avatar} className="w-10 h-10 rounded-full" />

                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">{post.author}</div>
                          <div className="text-[12px] text-gray-400 mt-[2px]">
                            {post.date} • {post.time}
                          </div>
                        </div>
                      </div>

                      <div
                        className="mt-4 text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />

                      {post.youtube_url && (
                        <div className="mt-4">
                          <iframe
                            className="w-full h-[360px] rounded-xl"
                            src={post.youtube_url.replace("watch?v=", "embed/")}
                            title="YouTube video"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {post.link_url && (
                        <div className="mt-3">
                          <a
                            href={post.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 text-sm hover:underline"
                          >
                            🔗 {post.link_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action bar: Like / Comment / Share — aligned with author name text (avatar width + gap offset) */}
                  <div className="px-6 flex items-center border-t border-gray-100 py-3 text-[15px] text-gray-800">
                    <div className="w-7 mr-2 shrink-0" aria-hidden="true" />

                    <div className="flex items-center gap-5">
                      <button style={{backgroundColor: "white"}}
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 leading-none transition ${
                          likeInfo.liked ? "text-red-500" : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        <HeartIcon filled={likeInfo.liked} />
                        <span>{likeInfo.count}</span>
                      </button>

                      <button style={{backgroundColor: "white"}} className="flex items-center gap-1.5 leading-none text-gray-500 hover:text-gray-800 transition">
                        <CommentIcon />
                        <span>{post.comments.length}</span>
                      </button>

                      <button style={{backgroundColor: "white"}}
                        onClick={() => handleShare(post.id)}
                        className="flex items-center gap-1.5 leading-none text-gray-500 hover:text-gray-800 transition"
                      >
                        <ShareIcon />
                      </button>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="border-t border-gray-100 px-6 pb-5">
                    <CommentThread
                      postId={post.id}
                      comments={post.comments}
                      currentUserId={CURRENT_USER_ID}
                      currentUserAvatar={student.avatar}
                      onAddComment={handleAddNewComment}
                      onEditComment={saveEditComment}
                      onDeleteComment={handleDeleteComment}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

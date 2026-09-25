import { useState } from "react";
import {
  FaThumbtack,
  FaLink,
  FaRegComment,
  FaShareAlt,
  FaHeart,
  FaRegHeart,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import AttachmentGallery from "./AttachmentGallery.jsx";
import { CATEGORY_META } from "../learning/newsFeedMockData.js";
import { getYoutubeEmbedUrl } from "../utils/media.js";
import {
  CURRENT_TEACHER,
  API_BASE,
  formatRelativeTime,
  formatFullThaiDate,
  formatThaiDateTime,
  notAvailableYet,
} from "../utils/feedShared.js";

// การ์ดโพสต์เดียว — ใช้ร่วมกันระหว่างฟีดข่าวสารทั้งโรงเรียน (NewsFeed.jsx) และฟีดรายห้องเรียน (ClassroomStream.jsx)
// showCategory/showPin ปิดได้สำหรับฟีดที่ไม่มีแนวคิดนั้น (เช่นประกาศรายห้องที่ดึงจากตาราง news ซึ่งไม่มีหมวดหมู่/ปักหมุด)
// contentIsHtml ใช้กับเนื้อหาที่มาจาก rich text editor (news.jsx) ต่างจากฟีด feed_posts ที่เป็น plain text
export default function FeedPostCard({
  post,
  isOwner,
  innerRef,
  expanded,
  onToggleExpand,
  commentsOpen,
  onToggleComments,
  liked,
  likeCount,
  onToggleLike,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  onSubmitReply,
  menuOpen,
  onToggleMenu,
  onTogglePin,
  onEdit,
  onDelete,
  showCategory = true,
  showPin = true,
  contentIsHtml = false,
}) {
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");

  const catMeta = showCategory ? CATEGORY_META[post.category] : null;
  const isLong = !contentIsHtml && post.content.length > 220;
  const shownContent = !isLong || expanded ? post.content : post.content.slice(0, 220) + "...";

  const topLevelComments = post.comments.filter((c) => !c.parent_comment_id);
  const repliesOf = (commentId) => post.comments.filter((c) => c.parent_comment_id === commentId);
  const visibleTopLevel = commentsOpen ? topLevelComments : topLevelComments.slice(0, 1);

  const submitReply = (parentId) => {
    if (!replyDraft.trim()) return;
    onSubmitReply(parentId, replyDraft);
    setReplyDraft("");
    setReplyOpenId(null);
  };

  return (
    <div
      ref={innerRef}
      className={`rounded-2xl border bg-white p-5 transition-shadow ${
        post.pinned ? "border-dashed border-amber-300 bg-amber-50/30" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src={post.author.avatar} className="w-11 h-11 rounded-full" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{post.author.name}</span>
              {post.pinned && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                  <FaThumbtack size={10} /> ปักหมุด
                </span>
              )}
            </div>
            <div className="text-[12px] text-gray-400">
              {post.author.role} · {formatRelativeTime(post.createdAt)}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            style={{ background: "transparent", border: "none", padding: "8px", display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer" }}
          >
            <span style={{ width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#4b5563" }} />
            <span style={{ width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#4b5563" }} />
            <span style={{ width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#4b5563" }} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 w-48 rounded-xl border border-gray-200 bg-white shadow-lg py-1.5 flex flex-col">
              {showPin && (
                <button
                  type="button"
                  onClick={onTogglePin}
                  className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 bg-transparent text-left"
                >
                  <FaThumbtack className={post.pinned ? "text-amber-600" : "text-gray-400"} />
                  {post.pinned ? "เลิกปักหมุด" : "ปักหมุดโพสต์นี้"}
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 bg-transparent text-left"
                  >
                    <FaEdit className="text-gray-400" /> แก้ไขโพสต์
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 bg-transparent text-left"
                  >
                    <FaTrash className="text-red-400" /> ลบโพสต์
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category badge + วันที่กิจกรรม (ถ้ามี) */}
      {(catMeta || post.eventDate) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {catMeta && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium ${catMeta.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${catMeta.dot}`} />
              {catMeta.label}
            </span>
          )}
          {post.eventDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[11.5px] font-medium">
              📅 {formatFullThaiDate(post.eventDate)}
              {post.eventEndDate && <> – {formatThaiDateTime(post.eventEndDate)}</>}
            </span>
          )}
        </div>
      )}

      {/* Title + content */}
      {post.title && <div className="mt-3 text-[16px] font-bold text-gray-900">{post.title}</div>}
      {contentIsHtml ? (
        <div
          className={`text-[14px] text-gray-700 leading-relaxed ${post.title ? "mt-1.5" : "mt-3"}`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : (
        <div className={`text-[14px] text-gray-700 leading-relaxed whitespace-pre-line ${post.title ? "mt-1.5" : "mt-3"}`}>
          {shownContent}
          {isLong && (
            <button type="button" onClick={onToggleExpand} className="ml-1 text-pink-600 hover:underline bg-transparent text-[14px]">
              {expanded ? "ย่อกลับ" : "ดูเพิ่มเติม"}
            </button>
          )}
        </div>
      )}

      {/* YouTube */}
      {post.youtubeUrl && (
        <div className="mt-3 rounded-xl overflow-hidden aspect-video">
          <iframe src={getYoutubeEmbedUrl(post.youtubeUrl)} className="w-full h-full" title="youtube" allowFullScreen />
        </div>
      )}

      {/* Link preview */}
      {post.link && (
        <a
          href={post.link.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100"
        >
          <FaLink className="text-purple-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-gray-800 truncate">{post.link.title}</div>
            <div className="text-[12px] text-gray-400 truncate">{post.link.url}</div>
          </div>
        </a>
      )}

      {/* รูป/ไฟล์แนบ — ผังแบบเฟซบุ๊ก สูงสุด 4 ช่อง มี +N กดดูเพิ่ม เลื่อนซ้าย-ขวาในไลท์บ็อกซ์ได้ วิดีโอเล่นในตัวได้ */}
      <AttachmentGallery files={post.files} apiBase={API_BASE} />

      {/* Like / comment summary */}
      <div className="mt-4 flex items-center justify-between text-[12.5px] text-gray-500">
        <div className="flex items-center gap-1.5">
          {likeCount > 0 && (
            <>
              {liked ? <FaHeart className="text-pink-600" /> : <FaRegHeart className="text-gray-400" />}
              <span>{likeCount}</span>
            </>
          )}
        </div>
        <button type="button" onClick={onToggleComments} className="hover:underline bg-transparent">
          {post.comments.length} ความคิดเห็น
        </button>
      </div>

      {/* Action bar */}
      <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-3">
        <button
          type="button"
          onClick={onToggleLike}
          className={`h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium bg-transparent ${
            liked ? "text-pink-600" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {liked ? <FaHeart /> : <FaRegHeart />} ถูกใจ
        </button>

        <button
          type="button"
          onClick={onToggleComments}
          className="h-10 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-600 bg-transparent"
        >
          <FaRegComment /> แสดงความคิดเห็น
        </button>

        <button
          type="button"
          onClick={() => notAvailableYet("แชร์")}
          className="h-10 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-600 bg-transparent"
        >
          <FaShareAlt /> แชร์
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3">
          {post.comments.length === 0 && <div className="text-[13px] text-gray-400">ยังไม่มีความคิดเห็น</div>}

          {visibleTopLevel.map((c) => (
            <div key={c.comment_id}>
              <div className="flex items-start gap-2.5">
                <img src={c.user.avatar} className="w-8 h-8 rounded-full shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl bg-gray-100 px-3 py-2 inline-block">
                    <div className="text-[12.5px] font-semibold text-gray-800">{c.user.name}</div>
                    <div className="text-[13.5px] text-gray-700">{c.text}</div>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 ml-1 flex items-center gap-3">
                    <span>{formatRelativeTime(c.time)}</span>
                    <button
                      type="button"
                      onClick={() => setReplyOpenId((prev) => (prev === c.comment_id ? null : c.comment_id))}
                      className="font-medium text-gray-500 hover:text-pink-600 bg-transparent"
                    >
                      ตอบกลับ
                    </button>
                  </div>

                  {repliesOf(c.comment_id).length > 0 && (
                    <div className="ml-6 mt-2 flex flex-col gap-2">
                      {repliesOf(c.comment_id).map((rep) => (
                        <div key={rep.comment_id} className="flex items-start gap-2">
                          <img src={rep.user.avatar} className="w-7 h-7 rounded-full shrink-0" />
                          <div className="min-w-0">
                            <div className="rounded-2xl bg-gray-100 px-3 py-2 inline-block">
                              <div className="text-[12px] font-semibold text-gray-800">{rep.user.name}</div>
                              <div className="text-[13px] text-gray-700">{rep.text}</div>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1 ml-1">{formatRelativeTime(rep.time)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyOpenId === c.comment_id && (
                    <div className="flex items-center gap-2 mt-2">
                      <img src={CURRENT_TEACHER.avatar} className="w-7 h-7 rounded-full shrink-0" />
                      <input
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitReply(c.comment_id)}
                        placeholder={`ตอบกลับ ${c.user.name}...`}
                        autoFocus
                        className="flex-1 h-8 rounded-full border border-gray-200 bg-gray-50 px-3 text-[12.5px] outline-none focus:border-pink-400"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2.5 mt-1">
            <img src={CURRENT_TEACHER.avatar} className="w-8 h-8 rounded-full shrink-0" />
            <input
              value={commentDraft}
              onChange={(e) => onCommentDraftChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmitComment()}
              placeholder="พิมพ์ความคิดเห็น..."
              className="flex-1 h-9 rounded-full border border-gray-200 bg-gray-50 px-4 text-[13px] outline-none focus:border-pink-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}

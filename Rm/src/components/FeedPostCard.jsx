import {
  FaThumbtack,
  FaLink,
  FaRegComment,
  FaShare,
  FaHeart,
  FaRegHeart,
  FaEdit,
  FaTrash,
  FaRegCalendarAlt,
} from "react-icons/fa";
import AttachmentGallery from "./AttachmentGallery.jsx";
import PostComments from "./PostComments.jsx";
import Avatar from "./Avatar.jsx";
import { getCategoryMetaMap } from "../utils/feedCategories.js";
import { getYoutubeEmbedUrl } from "../utils/media.js";
import useCurrentUserProfile from "../hooks/useCurrentUserProfile.js";
import {
  API_BASE,
  formatRelativeTime,
  formatFullThaiDate,
  formatThaiDateTime,
  shareLink,
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
  hideMenu = false,
  currentUserId,
  onEditComment,
  onDeleteComment,
}) {
  const { name: currentUserName, avatarUrl: currentUserAvatar } = useCurrentUserProfile();
  const catMeta = showCategory ? getCategoryMetaMap()[post.category] : null;
  // ลิงก์แชร์โพสต์ — หน้านี้ไม่มีเราท์แยกต่อโพสต์ ใช้แฮชกำกับ id ต่อท้าย URL ปัจจุบันแทน
  const postShareUrl = `${window.location.origin}${window.location.pathname}#post-${post.post_id}`;
  const isLong = !contentIsHtml && post.content.length > 220;
  const shownContent = !isLong || expanded ? post.content : post.content.slice(0, 220) + "...";

  const topLevelComments = post.comments.filter((c) => !c.parent_comment_id);
  const visibleTopLevel = commentsOpen ? topLevelComments : topLevelComments.slice(0, 1);

  return (
    <div
      ref={innerRef}
      className={`rounded-2xl border bg-white p-5 transition-shadow ${
        post.pinned ? "border-dashed border-purple-300 bg-purple-50/30" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={post.author.avatar_url} name={post.author.name} size={48} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-[15.5px]">{post.author.name}</span>
              {post.pinned && (
                <span className="inline-flex items-center gap-1 text-[13px] text-purple-700">
                  <FaThumbtack size={11} /> ปักหมุด
                </span>
              )}
            </div>
            <div className="text-[12.5px] text-gray-400">
              {post.author.role} · {formatRelativeTime(post.edited && post.updatedAt ? post.updatedAt : post.createdAt)}
              {post.edited && <span className="text-gray-300"> · แก้ไขแล้ว</span>}
            </div>
          </div>
        </div>

        {!hideMenu && (
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
                  className="flex items-center gap-2 px-4 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50 bg-transparent text-left"
                >
                  <FaThumbtack className={post.pinned ? "text-purple-600" : "text-gray-400"} />
                  {post.pinned ? "เลิกปักหมุด" : "ปักหมุดโพสต์นี้"}
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="flex items-center gap-2 px-4 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50 bg-transparent text-left"
                  >
                    <FaEdit className="text-gray-400" /> แก้ไขโพสต์
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex items-center gap-2 px-4 py-2.5 text-[15px] text-red-600 hover:bg-red-50 bg-transparent text-left"
                  >
                    <FaTrash className="text-red-400" /> ลบโพสต์
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Category badge + วันที่กิจกรรม (ถ้ามี) */}
      {(catMeta || post.eventDate) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {catMeta && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[13.5px] font-medium ${catMeta.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${catMeta.dot}`} />
              {catMeta.label}
            </span>
          )}
          {post.eventDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-[13.5px] font-medium">
              <FaRegCalendarAlt size={11} /> {formatFullThaiDate(post.eventDate)}
              {post.eventEndDate && <> – {formatThaiDateTime(post.eventEndDate)}</>}
            </span>
          )}
        </div>
      )}

      {/* Title + content */}
      {post.title && <div className="mt-3 text-[19px] font-bold text-gray-900">{post.title}</div>}
      {contentIsHtml ? (
        <div
          className={`text-[17px] text-gray-700 leading-relaxed ${post.title ? "mt-1.5" : "mt-3"}`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : (
        <div className={`text-[17px] text-gray-700 leading-relaxed whitespace-pre-line ${post.title ? "mt-1.5" : "mt-3"}`}>
          {shownContent}
          {isLong && !expanded && (
            <button type="button" onClick={onToggleExpand} className="ml-1 text-pink-600 hover:underline bg-transparent text-[17px]">
              ดูเพิ่มเติม
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
            <div className="text-[15.5px] font-medium text-gray-800 truncate">{post.link.title}</div>
            <div className="text-[14px] text-gray-400 truncate">{post.link.url}</div>
          </div>
        </a>
      )}

      {/* รูป/ไฟล์แนบ — ผังแบบเฟซบุ๊ก สูงสุด 4 ช่อง มี +N กดดูเพิ่ม เลื่อนซ้าย-ขวาในไลท์บ็อกซ์ได้ วิดีโอเล่นในตัวได้ */}
      <AttachmentGallery
        files={post.files}
        apiBase={API_BASE}
        shareUrl={postShareUrl}
        caption={{
          authorName: post.author.name,
          authorAvatar: post.author.avatar_url,
          timeLabel: formatRelativeTime(post.createdAt),
          title: post.title,
          text: post.content,
          comments: post.comments,
          commentDraft,
          onCommentDraftChange,
          onSubmitComment,
          onSubmitReply,
          currentUserAvatar,
          currentUserName,
          currentUserId,
          onEditComment,
          onDeleteComment,
          liked,
          likeCount,
          onToggleLike,
        }}
      />

      {/* Like / comment summary */}
      <div className="mt-4 flex items-center justify-between text-[14.5px] text-gray-500">
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
          className={`h-10 rounded-lg flex items-center justify-center gap-2 text-[15px] font-medium bg-transparent ${
            liked ? "text-pink-600" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {liked ? <FaHeart /> : <FaRegHeart />} ถูกใจ
        </button>

        <button
          type="button"
          onClick={onToggleComments}
          className="h-10 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-[15px] font-medium text-gray-600 bg-transparent"
        >
          <FaRegComment /> แสดงความคิดเห็น
        </button>

        <button
          type="button"
          onClick={() => shareLink(postShareUrl, post.title)}
          className="h-10 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-[15px] font-medium text-gray-600 bg-transparent"
        >
          <FaShare /> แชร์
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <PostComments
            comments={post.comments}
            visibleTopLevel={visibleTopLevel}
            commentDraft={commentDraft}
            onCommentDraftChange={onCommentDraftChange}
            onSubmitComment={onSubmitComment}
            onSubmitReply={onSubmitReply}
            currentUserAvatar={currentUserAvatar}
            currentUserName={currentUserName}
            currentUserId={currentUserId}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
          />
        </div>
      )}
    </div>
  );
}

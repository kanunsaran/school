import { useState } from "react";
import Swal from "sweetalert2";
import { FaPaperPlane, FaEllipsisH } from "react-icons/fa";
import { formatRelativeTime } from "../utils/feedShared.js";
import Avatar from "./Avatar.jsx";

// รายการคอมเมนต์ (ไม่รวมช่องพิมพ์) — แยกออกมาจาก input เพื่อให้ที่ที่ต้องการปักช่องพิมพ์ไว้ล่างสุดแบบตายตัว
// (เช่นไลท์บ็อกซ์ดูรูปเต็ม) เอาไปวางแยกจากส่วนลิสต์ที่เลื่อนได้ ส่วนใต้การ์ดโพสต์ปกติ (FeedPostCard) ยังใช้ PostComments รวมทั้งคู่เหมือนเดิม
// currentUserId/onEditComment/onDeleteComment ไม่บังคับ — ใส่มาแล้วจะโชว์ "แก้ไข/ลบ" เฉพาะคอมเมนต์ของเจ้าของเอง (เทียบ userId ตรงๆ)
export function CommentList({ comments, visibleTopLevel, onSubmitReply, currentUserAvatar, currentUserName, currentUserId, onEditComment, onDeleteComment }) {
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);

  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const repliesOf = (commentId) => comments.filter((c) => c.parent_comment_id === commentId);
  const shown = visibleTopLevel || topLevelComments;

  const submitReply = (parentId) => {
    if (!replyDraft.trim()) return;
    onSubmitReply(parentId, replyDraft);
    setReplyDraft("");
    setReplyOpenId(null);
  };

  const startEdit = (c) => {
    setEditingId(c.comment_id);
    setEditDraft(c.text);
  };

  const saveEdit = (commentId) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    onEditComment(commentId, trimmed);
    setEditingId(null);
  };

  const confirmDelete = async (commentId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ลบความคิดเห็นนี้?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed) onDeleteComment(commentId);
  };

  if (comments.length === 0) {
    return <div className="text-[15px] text-gray-400">ยังไม่มีความคิดเห็น</div>;
  }

  // แสดงบับเบิลข้อความ + แถวเมนู (เวลา/แก้ไขแล้ว/ตอบกลับ/แก้ไข/ลบ) — ใช้ร่วมกันทั้งคอมเมนต์หลักและการตอบกลับ ต่างกันแค่ขนาด
  const renderCommentBody = (c, { small, canReply }) => {
    const isOwner = onEditComment && onDeleteComment && currentUserId != null && String(c.userId) === String(currentUserId);
    const isEditing = editingId === c.comment_id;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit(c.comment_id);
              if (e.key === "Escape") setEditingId(null);
            }}
            autoFocus
            className={`flex-1 rounded-full border border-pink-300 bg-white px-3.5 outline-none ${small ? "h-8 text-[14px]" : "h-9 text-[14.5px]"}`}
          />
          <button
            type="button"
            onClick={() => saveEdit(c.comment_id)}
            className="w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center shrink-0"
          >
            <FaPaperPlane size={12} />
          </button>
          <button type="button" onClick={() => setEditingId(null)} className="text-[12.5px] text-gray-500 hover:text-gray-700 bg-transparent shrink-0">
            ยกเลิก
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-start gap-0.5 group/comment">
          <div className="rounded-2xl bg-gray-100 px-3 py-2 inline-block">
            <div className={`font-semibold text-gray-800 ${small ? "text-[13px]" : "text-[13.5px]"}`}>{c.user.name}</div>
            <div className={`text-gray-700 ${small ? "text-[14px]" : "text-[14.5px]"}`}>{c.text}</div>
          </div>

          {isOwner && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpenId((prev) => (prev === c.comment_id ? null : c.comment_id))}
                className={`w-6 h-6 mt-1 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 bg-transparent transition-opacity ${
                  menuOpenId === c.comment_id ? "opacity-100" : "opacity-0 group-hover/comment:opacity-100"
                }`}
              >
                <FaEllipsisH size={11} />
              </button>

              {menuOpenId === c.comment_id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                  <div className="absolute left-0 top-7 z-20 w-28 rounded-xl border border-gray-200 bg-white shadow-lg py-1 flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        startEdit(c);
                        setMenuOpenId(null);
                      }}
                      className="px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 bg-transparent text-left"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpenId(null);
                        confirmDelete(c.comment_id);
                      }}
                      className="px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 bg-transparent text-left"
                    >
                      ลบ
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="text-[13px] text-gray-400 mt-1 ml-1 flex items-center gap-3">
          <span>{formatRelativeTime(c.time)}</span>
          {canReply && (
            <button
              type="button"
              onClick={() => setReplyOpenId((prev) => (prev === c.comment_id ? null : c.comment_id))}
              className="font-medium text-gray-500 hover:text-pink-600 bg-transparent"
            >
              ตอบกลับ
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {shown.map((c) => (
        <div key={c.comment_id}>
          <div className="flex items-start gap-2.5">
            <Avatar src={c.user.avatar_url} name={c.user.name} size={36} />
            <div className="min-w-0 flex-1">
              {renderCommentBody(c, { small: false, canReply: !!onSubmitReply })}

              {repliesOf(c.comment_id).length > 0 && (
                <div className="ml-6 mt-2 flex flex-col gap-2">
                  {repliesOf(c.comment_id).map((rep) => (
                    <div key={rep.comment_id} className="flex items-start gap-2">
                      <Avatar src={rep.user.avatar_url} name={rep.user.name} size={32} />
                      <div className="min-w-0 flex-1">{renderCommentBody(rep, { small: true, canReply: false })}</div>
                    </div>
                  ))}
                </div>
              )}

              {replyOpenId === c.comment_id && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar src={currentUserAvatar} name={currentUserName} size={32} />
                  <input
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitReply(c.comment_id)}
                    placeholder={`ตอบกลับ ${c.user.name}...`}
                    autoFocus
                    className="flex-1 h-8 rounded-full border border-gray-200 bg-gray-50 px-3 text-[14.5px] outline-none focus:border-pink-400"
                  />
                  <button
                    type="button"
                    onClick={() => submitReply(c.comment_id)}
                    className="w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center shrink-0"
                  >
                    <FaPaperPlane size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ช่องพิมพ์คอมเมนต์ใหม่ — แยกออกมาต่างหากเพื่อปักไว้ล่างสุดแบบตายตัวได้ (ไม่เลื่อนตามลิสต์คอมเมนต์)
export function CommentInputBar({ commentDraft, onCommentDraftChange, onSubmitComment, currentUserAvatar, currentUserName }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar src={currentUserAvatar} name={currentUserName} size={36} />
      <div className="flex-1 relative">
        <input
          value={commentDraft}
          onChange={(e) => onCommentDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmitComment()}
          placeholder="พิมพ์ความคิดเห็น..."
          className="w-full h-9 rounded-full border border-gray-200 bg-gray-50 pl-4 pr-10 text-[15px] outline-none focus:border-pink-400"
        />
        <button
          type="button"
          onClick={onSubmitComment}
          disabled={!commentDraft?.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white flex items-center justify-center"
        >
          <FaPaperPlane size={11} />
        </button>
      </div>
    </div>
  );
}

// รายการคอมเมนต์ + ช่องพิมพ์คอมเมนต์ใหม่ รวมกัน — ใช้ใต้การ์ดโพสต์ปกติ (FeedPostCard) ที่ไม่ต้องปักช่องพิมพ์แยกจากลิสต์
export default function PostComments({
  comments,
  visibleTopLevel, // ไม่ส่งมาก็ได้ — ค่าเริ่มต้นโชว์ top-level ทั้งหมด
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  onSubmitReply,
  currentUserAvatar,
  currentUserName,
  currentUserId,
  onEditComment,
  onDeleteComment,
}) {
  return (
    <div className="flex flex-col gap-3">
      <CommentList
        comments={comments}
        visibleTopLevel={visibleTopLevel}
        onSubmitReply={onSubmitReply}
        currentUserAvatar={currentUserAvatar}
        currentUserName={currentUserName}
        currentUserId={currentUserId}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
      />
      <CommentInputBar commentDraft={commentDraft} onCommentDraftChange={onCommentDraftChange} onSubmitComment={onSubmitComment} currentUserAvatar={currentUserAvatar} currentUserName={currentUserName} />
    </div>
  );
}

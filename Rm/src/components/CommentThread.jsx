import { useState, useEffect, useRef } from "react";

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// เมนูจุดสามจุด สำหรับแก้ไข/ลบคอมเมนต์ของตัวเอง
function CommentMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        style={{ backgroundColor: "white" }}
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
      >
        <MoreIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-10 w-28 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm">
          <button
            style={{ backgroundColor: "white" }}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50"
          >
            <EditIcon /> แก้ไข
          </button>
          <button
            style={{ backgroundColor: "white" }}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50"
          >
            <TrashIcon /> ลบ
          </button>
        </div>
      )}
    </div>
  );
}

// คอมเมนต์ + ตอบกลับ (ชั้นเดียว) ใช้ร่วมกันทุกหน้าที่มีคอมเมนต์ (news / กิจกรรม / studentNews)
// comments เป็น flat array ที่มี parent_comment_id (null = คอมเมนต์หลัก, มีค่า = ตอบกลับของคอมเมนต์นั้น)
export default function CommentThread({
  postId,
  comments,
  currentUserId,
  currentUserAvatar,
  onAddComment,    // (postId, text, parentId) => Promise
  onEditComment,   // (postId, commentId, text) => Promise
  onDeleteComment, // (postId, commentId) => Promise
}) {
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesOf = (id) => comments.filter((c) => c.parent_comment_id === id);

  const submitTop = async () => {
    if (!commentText.trim()) return;
    await onAddComment(postId, commentText, null);
    setCommentText("");
  };

  const submitReply = async (parentId) => {
    const text = replyText[parentId];
    if (!text?.trim()) return;
    await onAddComment(postId, text, parentId);
    setReplyText((prev) => ({ ...prev, [parentId]: "" }));
    setReplyingTo(null);
  };

  const startEdit = (c) => {
    setEditingCommentId(c.id);
    setEditingText(c.text);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const saveEdit = async (commentId) => {
    if (!editingText.trim()) return;
    await onEditComment(postId, commentId, editingText);
    setEditingCommentId(null);
    setEditingText("");
  };

  const renderComment = (c, isReply) => {
    const isOwner = String(c.user_id) === String(currentUserId);
    const isEditing = editingCommentId === c.id;

    return (
      <div key={c.id} className={isReply ? "flex gap-3 ml-11 mt-3" : "flex gap-3"}>
        <img
          src={isOwner ? currentUserAvatar : `https://i.pravatar.cc/120?u=${c.user_id}`}
          className="w-8 h-8 rounded-full shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {isEditing ? (
              <div className="flex gap-2 items-center flex-1">
                <input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c.id); }}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                  autoFocus
                />
                <button
                  style={{ backgroundColor: "white" }}
                  onClick={() => saveEdit(c.id)}
                  className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap"
                >
                  บันทึก
                </button>
                <button
                  style={{ backgroundColor: "white" }}
                  onClick={cancelEdit}
                  className="text-sm font-medium text-gray-400 hover:underline whitespace-nowrap"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="bg-gray-100 px-4 py-2 rounded-2xl text-sm inline-block max-w-full">
                <div className="flex gap-2 items-center mb-[2px]">
                  <span className="font-semibold">{c.author}</span>
                  <span className="text-gray-400 text-[11px]">{c.time}</span>
                </div>
                {c.text}
              </div>
            )}

            {isOwner && !isEditing && (
              <CommentMenu onEdit={() => startEdit(c)} onDelete={() => onDeleteComment(postId, c.id)} />
            )}
          </div>

          {!isReply && !isEditing && (
            <button
              style={{ backgroundColor: "transparent" }}
              onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
              className="text-xs font-normal text-gray-400 hover:text-gray-700 mt-1 ml-1"
            >
              ตอบกลับ
            </button>
          )}

          {replyingTo === c.id && (
            <div className="flex gap-2 items-center mt-2">
              <input
                value={replyText[c.id] || ""}
                onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") submitReply(c.id); }}
                placeholder={`ตอบกลับ ${c.author}...`}
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                autoFocus
              />
              <button
                style={{ backgroundColor: "white" }}
                onClick={() => submitReply(c.id)}
                className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap"
              >
                ส่ง
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="space-y-3 mt-5">
        {topLevel.map((c) => (
          <div key={c.id}>
            {renderComment(c, false)}
            {repliesOf(c.id).map((r) => renderComment(r, true))}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4 items-center">
        <img src={currentUserAvatar} className="w-8 h-8 rounded-full" />

        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitTop(); }}
          placeholder="เขียนความคิดเห็น..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200 transition"
        />

        <button
          style={{ backgroundColor: "white" }}
          onClick={submitTop}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition"
        >
          ส่ง
        </button>
      </div>
    </div>
  );
}

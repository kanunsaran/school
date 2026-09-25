import { useRef, useState } from "react";
import Swal from "sweetalert2";
import { FaTimes, FaImage, FaVideo, FaPaperclip, FaLink } from "react-icons/fa";
import ComposerIconButton from "./ComposerIconButton.jsx";
import { CATEGORY_META } from "../learning/newsFeedMockData.js";
import { isImageFile, resolveFileUrl } from "../utils/media.js";
import { CURRENT_TEACHER, API_BASE, getTodayStr, toDateOnlyStr } from "../utils/feedShared.js";

const MAX_FILES = 10;
const MAX_SIZE_MB = 50; // เผื่อไฟล์วิดีโอซึ่งมักใหญ่กว่ารูป/เอกสารทั่วไป

/* ===== ประกอบ attachments เริ่มต้นตอนเปิด modal ในโหมดแก้ไข จากรูป/ไฟล์/ลิงก์ที่โพสต์มีอยู่แล้ว (existing:true เอาไว้แยกจากไฟล์ใหม่ตอน submit) ===== */
const buildInitialAttachments = (post) => {
  if (!post) return [];
  const items = (post.files || []).map((f) => ({
    id: `file-${f.file_id}`,
    kind: isImageFile(f) ? "image" : "file",
    previewUrl: resolveFileUrl(API_BASE, f.file_url),
    existing: true,
    file_id: f.file_id,
    name: f.file_name,
  }));
  if (post.link) {
    items.push({ id: "existing-link", kind: "link", url: post.link.url, existing: true });
  }
  return items;
};

/* ===== Modal สร้าง/แก้ไขโพสต์ — เด้งขึ้นทันทีที่คลิกช่องพิมพ์ (แบบ Facebook) บังคับกรอกหัวข้อ/คำอธิบาย/หมวดหมู่ ถ้าเป็นกิจกรรมต้องใส่วันที่ด้วย เพื่อให้ขึ้นปฏิทินกิจกรรมได้ถูกต้อง =====
   ใช้ร่วมกันระหว่าง NewsFeed.jsx (ทั้งโรงเรียน) และ ClassroomStream.jsx (รายห้องเรียน) — subtitle ปรับได้ผ่าน prop postToLabel */
export default function FeedPostComposerModal({ initialData, onClose, onConfirm, postToLabel = "โพสต์ถึงนักเรียนทุกคน", showCategory = true }) {
  const isEditMode = !!initialData;
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [eventDate, setEventDate] = useState(initialData?.eventDate ? toDateOnlyStr(initialData.eventDate) : "");
  const [eventEndDate, setEventEndDate] = useState(initialData?.eventEndDate || "");
  const [attachments, setAttachments] = useState(() => buildInitialAttachments(initialData));
  const [removedFileIds, setRemovedFileIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const isEvent = category === "event";
  // แก้ไขโพสต์ที่วันจัดงานผ่านไปแล้ว (และไม่ได้เปลี่ยนวัน) ไม่ควรโดนกันด้วยเงื่อนไข "ห้ามเลือกวันย้อนหลัง"
  const initialEventDateStr = initialData?.eventDate ? toDateOnlyStr(initialData.eventDate) : null;
  const eventDateUnchanged = isEditMode && eventDate === initialEventDateStr;
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const otherAttachments = attachments.filter((a) => a.kind !== "image");

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const currentFileCount = attachments.filter((a) => a.kind === "image" || a.kind === "file").length;
    if (currentFileCount + selected.length > MAX_FILES) {
      Swal.fire("แนบไฟล์เกินจำนวน", `แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์ต่อโพสต์`, "warning");
      e.target.value = "";
      return;
    }
    const oversize = selected.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversize) {
      Swal.fire("ไฟล์ใหญ่เกินไป", `แต่ละไฟล์ต้องไม่เกิน ${MAX_SIZE_MB}MB (${oversize.name})`, "warning");
      e.target.value = "";
      return;
    }

    const newAttachments = selected.map((file, i) => {
      const isImage = file.type.startsWith("image/");
      return {
        id: Date.now() + i,
        kind: isImage ? "image" : "file",
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      };
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const attachLink = async () => {
    const result = await Swal.fire({
      title: "แนบลิงก์",
      input: "text",
      inputPlaceholder: "วาง URL ที่นี่...",
      showCancelButton: true,
      confirmButtonText: "แนบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed || !result.value) return;
    setAttachments((prev) => [
      ...prev.filter((a) => a.kind !== "link"), // แนบลิงก์ได้ทีละ 1 อัน แนบใหม่แทนที่อันเดิม
      { id: Date.now(), kind: "link", url: result.value },
    ]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.existing && item.file_id) {
        setRemovedFileIds((r) => [...r, item.file_id]);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleConfirm = async () => {
    if (!title.trim()) {
      Swal.fire("ยังไม่ได้ใส่หัวข้อ", "กรอกหัวข้อประกาศก่อนนะคะ", "warning");
      return;
    }
    if (!content.trim()) {
      Swal.fire("ยังไม่ได้ใส่คำอธิบาย", "กรอกรายละเอียดประกาศก่อนนะคะ", "warning");
      return;
    }
    if (showCategory && !category) {
      Swal.fire("ยังไม่ได้เลือกหมวดหมู่", "เลือกหมวดหมู่เพื่อให้จัดหมวดถูกต้อง", "warning");
      return;
    }
    if (isEvent && !eventDate) {
      Swal.fire("ยังไม่ได้ใส่วันที่กิจกรรม", "กิจกรรมต้องระบุวันที่ เพื่อให้ขึ้นในปฏิทินกิจกรรม", "warning");
      return;
    }
    if (isEvent && !eventDateUnchanged && eventDate < getTodayStr()) {
      Swal.fire("เลือกวันย้อนหลังไม่ได้", "วันที่จัดกิจกรรมต้องเป็นวันนี้หรือหลังจากนี้", "warning");
      return;
    }
    if (isEvent && eventEndDate && eventEndDate < `${eventDate}T00:00`) {
      Swal.fire("วันสิ้นสุดไม่ถูกต้อง", "วันและเวลาสิ้นสุดต้องอยู่หลังวันที่เริ่มกิจกรรม", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        title: title.trim(),
        content: content.trim(),
        category,
        eventDate: isEvent ? eventDate : null,
        eventEndDate: isEvent ? eventEndDate : null,
        attachments,
        removedFileIds,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[760px] max-w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header — เหมือน post card ทั่วไป มีเส้นคั่นชัดเจน */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[18px] font-bold text-gray-900 mx-auto">{isEditMode ? "แก้ไขโพสต์" : "สร้างโพสต์ใหม่"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-4 text-gray-400 hover:text-gray-700 bg-transparent"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {/* Author row — ให้ความรู้สึกเดียวกับ header ของ PostCard */}
          <div className="flex items-center gap-3 mb-5">
            <img src={CURRENT_TEACHER.avatar} className="w-11 h-11 rounded-full" />
            <div>
              <div className="font-semibold text-gray-900">{CURRENT_TEACHER.name}</div>
              <div className="text-[12px] text-gray-400">{CURRENT_TEACHER.role} · {postToLabel}</div>
            </div>
          </div>

          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">หัวข้อ</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น เปิดรับสมัครทุนการศึกษา"
            className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 mb-5 text-[15px] outline-none focus:border-pink-400"
          />

          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">คำอธิบาย</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            autoFocus
            placeholder="รายละเอียดที่ต้องการแจ้งให้นักเรียนทราบ..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-3 text-[15px] leading-relaxed outline-none focus:border-pink-400 resize-none"
          />

          {/* พรีวิวไฟล์แนบ — รูปเรียงแถวเลื่อนได้ ไฟล์/ลิงก์เรียงเป็นแถว (ทั้งของเดิมตอนแก้ไข และของใหม่ที่เพิ่งเลือก) */}
          {(imageAttachments.length > 0 || otherAttachments.length > 0) && (
            <div className="mb-5 flex flex-col gap-2.5">
              {imageAttachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageAttachments.map((item) => (
                    <div key={item.id} className="relative shrink-0" style={{ width: 96, height: 96 }}>
                      <img src={item.previewUrl} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(item.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-500 flex items-center justify-center shadow"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {otherAttachments.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.kind === "link" ? (
                      <FaLink className="text-purple-500 shrink-0" />
                    ) : (
                      <FaPaperclip className="text-blue-500 shrink-0" />
                    )}
                    {item.kind === "link" ? (
                      <span className="text-[13.5px] text-gray-700 truncate">{item.url}</span>
                    ) : (
                      <span className="text-[13.5px] text-gray-700 truncate">{item.name}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(item.id)}
                    className="text-gray-400 hover:text-red-500 shrink-0 bg-transparent"
                  >
                    <FaTimes size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
            multiple
            className="hidden"
          />

          <div className="flex items-center gap-1 mb-5 pb-5 border-b border-gray-100">
            <ComposerIconButton icon={<FaImage className="text-emerald-500" />} label="แนบรูป" onClick={openFilePicker} />
            <ComposerIconButton icon={<FaVideo className="text-red-500" />} label="แนบวิดีโอ" onClick={openFilePicker} />
            <ComposerIconButton icon={<FaPaperclip className="text-blue-500" />} label="แนบไฟล์" onClick={openFilePicker} />
            <ComposerIconButton icon={<FaLink className="text-purple-500" />} label="แนบลิงก์" onClick={attachLink} />
          </div>

          {showCategory && (
            <>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">หมวดหมู่</label>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`h-11 px-3 rounded-xl border text-[13px] font-medium flex items-center gap-2 ${
                      category === key
                        ? "border-pink-500 bg-pink-50 text-pink-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                    <span className="truncate">{meta.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {isEvent && (
            <div className="mb-1 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <label className="block text-[13px] font-medium text-amber-800 mb-1.5">
                📅 วันที่เริ่มกิจกรรม <span className="text-amber-600">(บังคับ — ใช้ขึ้นปฏิทินกิจกรรม)</span>
              </label>
              <input
                type="date"
                value={eventDate}
                min={eventDateUnchanged ? undefined : getTodayStr()}
                onChange={(e) => {
                  setEventDate(e.target.value);
                  // ถ้าวันสิ้นสุดที่เคยเลือกไว้ ดันมาอยู่ก่อนวันเริ่มใหม่ ให้เคลียร์ทิ้งกันข้อมูลขัดกัน
                  if (eventEndDate && eventEndDate < `${e.target.value}T00:00`) setEventEndDate("");
                }}
                className="w-full h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-400"
              />

              <label className="block text-[13px] font-medium text-amber-800 mb-1.5 mt-3">
                วันและเวลาสิ้นสุด <span className="text-amber-600 font-normal">(ไม่บังคับ — ไม่ใส่ก็ได้ถ้าเป็นกิจกรรมวันเดียว)</span>
              </label>
              <input
                type="datetime-local"
                value={eventEndDate}
                min={eventDate ? `${eventDate}T00:00` : undefined}
                disabled={!eventDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-amber-200 bg-white px-3 outline-none focus:border-amber-400 disabled:opacity-50"
              />
            </div>
          )}
        </div>

        {/* Footer — ปุ่มโพสต์ใหญ่เต็มความกว้าง */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-[15px] font-semibold"
          >
            {submitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "โพสต์"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import Swal from "sweetalert2";
import { FaTimes, FaImage, FaVideo, FaPaperclip, FaLink, FaPlus, FaYoutube, FaRegCalendarAlt } from "react-icons/fa";
import ComposerIconButton from "./ComposerIconButton.jsx";
import PromptModal from "./PromptModal.jsx";
import ThaiCalendarField from "./ThaiCalendarField.jsx";
import ThaiTimeField from "./ThaiTimeField.jsx";
import Avatar from "./Avatar.jsx";
import useCurrentUserProfile from "../hooks/useCurrentUserProfile.js";
import { getAllCategories, addCustomCategory } from "../utils/feedCategories.js";
import { isImageFile, isVideoFile, resolveFileUrl, getYoutubeThumbnailUrl } from "../utils/media.js";
import { CURRENT_TEACHER, API_BASE, getTodayStr, toDateOnlyStr } from "../utils/feedShared.js";

const MAX_FILES = 10;
const MAX_SIZE_MB = 50; // เผื่อไฟล์วิดีโอซึ่งมักใหญ่กว่ารูป/เอกสารทั่วไป
const FILE_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip";

/* ===== ประกอบ attachments เริ่มต้นตอนเปิด modal ในโหมดแก้ไข จากรูป/วิดีโอ/ไฟล์/ลิงก์/YouTube ที่โพสต์มีอยู่แล้ว (existing:true เอาไว้แยกจากไฟล์ใหม่ตอน submit) ===== */
const buildInitialAttachments = (post) => {
  if (!post) return [];
  const items = (post.files || []).map((f) => ({
    id: `file-${f.file_id}`,
    kind: isImageFile(f) ? "image" : isVideoFile(f) ? "video" : "file",
    previewUrl: resolveFileUrl(API_BASE, f.file_url),
    existing: true,
    file_id: f.file_id,
    name: f.file_name,
  }));
  if (post.link) {
    items.push({ id: "existing-link", kind: "link", url: post.link.url, existing: true });
  }
  if (post.youtubeUrl) {
    items.push({ id: "existing-youtube", kind: "youtube", url: post.youtubeUrl, existing: true });
  }
  return items;
};

/* ===== Modal สร้าง/แก้ไขโพสต์ — เด้งขึ้นทันทีที่คลิกช่องพิมพ์ (แบบ Facebook) บังคับกรอกหัวข้อ/คำอธิบาย/หมวดหมู่ ถ้าเป็นกิจกรรมต้องใส่วันที่ด้วย เพื่อให้ขึ้นปฏิทินกิจกรรมได้ถูกต้อง =====
   ใช้ร่วมกันระหว่าง NewsFeed.jsx (ทั้งโรงเรียน) และ ClassroomStream.jsx (รายห้องเรียน) — subtitle ปรับได้ผ่าน prop postToLabel */
export default function FeedPostComposerModal({ initialData, onClose, onConfirm, postToLabel = "โพสต์ถึงนักเรียนทุกคน", showCategory = true }) {
  const { name: myName, avatarUrl: myAvatarUrl } = useCurrentUserProfile();
  const isEditMode = !!initialData;
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [eventDate, setEventDate] = useState(initialData?.eventDate ? toDateOnlyStr(initialData.eventDate) : "");
  const [eventEndDate, setEventEndDate] = useState(initialData?.eventEndDate || "");
  const [attachments, setAttachments] = useState(() => buildInitialAttachments(initialData));
  const [removedFileIds, setRemovedFileIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState(() => getAllCategories());
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // เปิดให้ครูเพิ่มหมวดหมู่ใหม่ได้เองตอนโพสต์ — บันทึกเข้า backend จริงแล้วเลือกหมวดหมู่ที่เพิ่งเพิ่มให้ทันที
  const confirmAddCategory = async (name) => {
    let newKey = null;
    try {
      newKey = await addCustomCategory(name);
    } catch (err) {
      console.error("เพิ่มหมวดหมู่ไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "เพิ่มหมวดหมู่ไม่สำเร็จ", text: err?.response?.data?.message || "เกิดข้อผิดพลาด" });
    }
    setCategoryDialogOpen(false);
    if (!newKey) return;
    setCategories(getAllCategories());
    setCategory(newKey);
  };

  const isEvent = category === "event";
  // แก้ไขโพสต์ที่วันจัดงานผ่านไปแล้ว (และไม่ได้เปลี่ยนวัน) ไม่ควรโดนกันด้วยเงื่อนไข "ห้ามเลือกวันย้อนหลัง"
  const initialEventDateStr = initialData?.eventDate ? toDateOnlyStr(initialData.eventDate) : null;
  const eventDateUnchanged = isEditMode && eventDate === initialEventDateStr;
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const otherAttachments = attachments.filter((a) => a.kind !== "image");

  // เลือกไฟล์แยกช่องตามปุ่มที่กด (accept ต่างกันจริง) กันครูกดปุ่ม "แนบรูป" แล้วดันไปเลือกวิดีโอ/เอกสารมาแทน
  const handleFileSelected = (e, kind) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const currentFileCount = attachments.filter((a) => a.kind === "image" || a.kind === "video" || a.kind === "file").length;
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

    const newAttachments = selected.map((file, i) => ({
      id: Date.now() + i,
      kind,
      file,
      name: file.name,
      previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const confirmAttachLink = (url) => {
    setAttachments((prev) => [
      ...prev.filter((a) => a.kind !== "link"), // แนบลิงก์ได้ทีละ 1 อัน แนบใหม่แทนที่อันเดิม
      { id: Date.now(), kind: "link", url },
    ]);
    setLinkDialogOpen(false);
  };

  const confirmAttachYoutube = (url) => {
    setAttachments((prev) => [
      ...prev.filter((a) => a.kind !== "youtube"), // แนบ YouTube ได้ทีละ 1 อัน แนบใหม่แทนที่อันเดิม
      { id: Date.now(), kind: "youtube", url },
    ]);
    setYoutubeDialogOpen(false);
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

    const categoryLabel = categories.find((c) => c.key === category)?.label;
    const confirmResult = await Swal.fire({
      title: isEditMode ? "ยืนยันบันทึกการแก้ไข?" : "ยืนยันโพสต์นี้?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: isEditMode ? "บันทึกการแก้ไข" : "โพสต์เลย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ec4899",
    });
    if (!confirmResult.isConfirmed) return;

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
        youtubeUrl: attachments.find((a) => a.kind === "youtube")?.url || null,
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
            <Avatar src={myAvatarUrl} name={myName} size={48} />
            <div>
              <div className="font-semibold text-gray-900">{myName}</div>
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
              {/* YouTube — โชว์เป็นรูปปกวิดีโอจริงเหมือนรูปที่แนบ ให้เห็นว่ากำลังจะโพสต์คลิปไหนก่อนกดโพสต์จริง */}
              {otherAttachments.filter((item) => item.kind === "youtube").map((item) => {
                const thumb = getYoutubeThumbnailUrl(item.url);
                return (
                  <div key={item.id} className="relative rounded-xl overflow-hidden border border-gray-200 bg-black" style={{ maxWidth: 280 }}>
                    {thumb ? (
                      <img src={thumb} className="w-full aspect-video object-cover opacity-90" />
                    ) : (
                      <div className="w-full aspect-video flex items-center justify-center bg-gray-100">
                        <FaYoutube className="text-red-400" size={28} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                        <FaYoutube className="text-white" size={22} />
                      </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 px-3 py-1.5">
                      <span className="text-[12px] text-white truncate block">{item.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(item.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-500 flex items-center justify-center shadow"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                );
              })}

              {otherAttachments.filter((item) => item.kind !== "youtube").map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.kind === "link" && <FaLink className="text-purple-500 shrink-0" />}
                    {item.kind === "video" && <FaVideo className="text-red-500 shrink-0" />}
                    {item.kind === "file" && <FaPaperclip className="text-blue-500 shrink-0" />}
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

          {/* ช่องเลือกไฟล์แยกตามปุ่ม accept ต่างกันจริง — กดปุ่ม "แนบรูป" จะเลือกได้แค่ไฟล์รูป กดวิดีโอจะเลือกได้แค่วิดีโอ ไม่ปนกัน */}
          <input type="file" ref={imageInputRef} onChange={(e) => handleFileSelected(e, "image")} accept="image/*" multiple className="hidden" />
          <input type="file" ref={videoInputRef} onChange={(e) => handleFileSelected(e, "video")} accept="video/*" multiple className="hidden" />
          <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelected(e, "file")} accept={FILE_ACCEPT} multiple className="hidden" />

          <div className="flex items-center gap-1 mb-5 pb-5 border-b border-gray-100">
            <ComposerIconButton icon={<FaImage className="text-emerald-500" />} label="แนบรูป" onClick={() => imageInputRef.current?.click()} />
            <ComposerIconButton icon={<FaVideo className="text-red-500" />} label="แนบวิดีโอ" onClick={() => videoInputRef.current?.click()} />
            <ComposerIconButton icon={<FaPaperclip className="text-blue-500" />} label="แนบไฟล์" onClick={() => fileInputRef.current?.click()} />
            <ComposerIconButton icon={<FaLink className="text-purple-500" />} label="แนบลิงก์" onClick={() => setLinkDialogOpen(true)} />
            <ComposerIconButton icon={<FaYoutube className="text-red-500" />} label="แนบ YouTube" onClick={() => setYoutubeDialogOpen(true)} />
          </div>

          {showCategory && (
            <>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">หมวดหมู่</label>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {categories.map((meta) => (
                  <button
                    key={meta.key}
                    type="button"
                    onClick={() => setCategory(meta.key)}
                    className={`h-8 px-2.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 ${
                      category === meta.key
                        ? "border-pink-500 bg-pink-50 text-pink-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                    {meta.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCategoryDialogOpen(true)}
                  className="h-8 px-2.5 rounded-lg border border-dashed border-gray-300 text-[12px] font-medium text-gray-500 hover:border-pink-300 hover:text-pink-600 flex items-center gap-1"
                >
                  <FaPlus size={9} /> เพิ่มหมวดหมู่
                </button>
              </div>
            </>
          )}

          {isEvent && (
            <div className="mb-1 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-amber-800 mb-1.5">
                <FaRegCalendarAlt size={12} /> วันที่เริ่มกิจกรรม <span className="text-amber-600 font-normal">(บังคับ — ใช้ขึ้นปฏิทินกิจกรรม)</span>
              </label>
              <ThaiCalendarField
                value={eventDate}
                onChange={(v) => {
                  setEventDate(v);
                  // ถ้าวันสิ้นสุดที่เคยเลือกไว้ ดันมาอยู่ก่อนวันเริ่มใหม่ ให้เคลียร์ทิ้งกันข้อมูลขัดกัน
                  if (eventEndDate && eventEndDate < `${v}T00:00`) setEventEndDate("");
                }}
                min={eventDateUnchanged ? undefined : getTodayStr()}
                heightClass="h-11 px-3"
                bgClass="bg-white"
                borderClass="border-amber-200"
              />

              <label className="block text-[13px] font-medium text-amber-800 mb-1.5 mt-3">
                วันและเวลาสิ้นสุด <span className="text-amber-600 font-normal">(ไม่บังคับ — ไม่ใส่ก็ได้ถ้าเป็นกิจกรรมวันเดียว)</span>
              </label>
              <div className="flex gap-2">
                <ThaiCalendarField
                  className="flex-1"
                  value={eventEndDate ? eventEndDate.split("T")[0] : ""}
                  onChange={(d) => setEventEndDate(`${d}T${eventEndDate ? eventEndDate.split("T")[1] : "00:00"}`)}
                  min={eventDate || undefined}
                  disabled={!eventDate}
                  heightClass="h-11 px-3"
                  bgClass="bg-white"
                  borderClass="border-amber-200"
                />
                <ThaiTimeField
                  className="w-32 shrink-0"
                  value={eventEndDate ? eventEndDate.split("T")[1] : ""}
                  onChange={(t) => setEventEndDate(`${eventEndDate ? eventEndDate.split("T")[0] : eventDate}T${t}`)}
                  disabled={!eventDate}
                  heightClass="h-11"
                  bgClass="bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer — ปุ่มโพสต์ใหญ่เต็มความกว้าง */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[15px] font-semibold"
          >
            {submitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "โพสต์"}
          </button>
        </div>
      </div>

      {linkDialogOpen && (
        <PromptModal
          title="แนบลิงก์"
          icon={FaLink}
          label="URL"
          placeholder="วาง URL ที่นี่..."
          confirmLabel="แนบลิงก์"
          onConfirm={confirmAttachLink}
          onClose={() => setLinkDialogOpen(false)}
        />
      )}

      {youtubeDialogOpen && (
        <PromptModal
          title="แนบ YouTube"
          icon={FaYoutube}
          iconColorClass="text-red-500"
          label="ลิงก์ YouTube"
          placeholder="วางลิงก์ YouTube ที่นี่..."
          confirmLabel="แนบ"
          onConfirm={confirmAttachYoutube}
          onClose={() => setYoutubeDialogOpen(false)}
        />
      )}

      {categoryDialogOpen && (
        <PromptModal
          title="เพิ่มหมวดหมู่ใหม่"
          icon={FaPlus}
          iconColorClass="text-pink-500"
          label="ชื่อหมวดหมู่"
          placeholder="เช่น กิจกรรมชมรม"
          confirmLabel="เพิ่ม"
          onConfirm={confirmAddCategory}
          onClose={() => setCategoryDialogOpen(false)}
        />
      )}
    </div>
  );
}

import { useRef, useState } from "react";
import Swal from "sweetalert2";
import { FaTimes, FaImage, FaVideo, FaPaperclip, FaLink, FaFilePdf, FaFileAlt } from "react-icons/fa";
import ComposerIconButton from "./ComposerIconButton.jsx";
import { PORTFOLIO_CATEGORIES, VISIBILITY_META } from "../utils/portfolioStore.js";
import { generateCoverForFile } from "../utils/portfolioThumbnail.js";

const MAX_IMAGES = 6;
const MAX_SIZE_MB = 50;

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/* ===== ป๊อปอัพ "เพิ่มผลงาน" — เด้งขึ้นทันทีที่กดปุ่ม (สไตล์เดียวกับ FeedPostComposerModal)
   ผลงานหนึ่งชิ้นมีไฟล์แนบได้แบบเดียว (รูปหลายรูป / วิดีโอ 1 ไฟล์ / เอกสาร 1 ไฟล์ / ลิงก์ 1 อัน) ให้ตรงกับ file_type ของ portfolioStore ===== */
export default function PortfolioWorkModal({ initialData, onClose, onConfirm }) {
  const isEditMode = !!initialData;
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [visibility, setVisibility] = useState(initialData?.visibility || "private");
  const [kind, setKind] = useState(initialData?.file_type || null); // "image" | "video" | "file" | "link"
  const [attachments, setAttachments] = useState(
    () => (initialData?.files || []).map((f) => ({ id: `existing-${f.file_id}`, existing: true, name: f.file_name, previewUrl: f.cover_url || f.file_url, coverDataUrl: f.cover_url, mime: f.file_type, sizeLabel: f.size_label }))
  );
  const [linkUrl, setLinkUrl] = useState(initialData?.link_url || "");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const openFilePicker = (nextKind) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.dataset.kind = nextKind;
    input.accept = nextKind === "image" ? "image/*" : nextKind === "video" ? "video/*" : "*";
    input.multiple = nextKind === "image";
    input.click();
  };

  const handleFileSelected = async (e) => {
    const selected = Array.from(e.target.files || []);
    const nextKind = e.target.dataset.kind;
    if (!selected.length) return;

    const oversize = selected.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversize) {
      Swal.fire("ไฟล์ใหญ่เกินไป", `แต่ละไฟล์ต้องไม่เกิน ${MAX_SIZE_MB}MB (${oversize.name})`, "warning");
      e.target.value = "";
      return;
    }
    if (nextKind === "image" && attachments.length + selected.length > MAX_IMAGES) {
      Swal.fire("แนบรูปเกินจำนวน", `แนบรูปได้สูงสุด ${MAX_IMAGES} รูปต่อผลงาน`, "warning");
      e.target.value = "";
      return;
    }
    if (nextKind !== "image" && selected.length > 1) {
      selected.splice(1); // วิดีโอ/ไฟล์เอกสาร แนบได้ชิ้นเดียวต่อผลงาน
    }

    // เปลี่ยนประเภทไฟล์แนบ (เช่นจากรูปเป็นวิดีโอ) ต้องล้างของเดิมทิ้งก่อน เพราะ portfolioStore เก็บ file_type เดียวต่อผลงาน
    if (kind !== nextKind) setAttachments([]);
    setKind(nextKind);
    setGeneratingCover(true);

    const withCovers = await Promise.all(
      selected.map(async (file, i) => ({
        id: `new-${Date.now()}-${i}`,
        existing: false,
        file,
        name: file.name,
        mime: file.type,
        sizeLabel: formatBytes(file.size),
        previewUrl: URL.createObjectURL(file),
        coverDataUrl: await generateCoverForFile(file),
      }))
    );

    setAttachments((prev) => (nextKind === "image" ? [...prev, ...withCovers] : withCovers));
    setGeneratingCover(false);
    e.target.value = "";
  };

  const attachLink = async () => {
    const result = await Swal.fire({
      title: "แนบลิงก์ผลงาน",
      input: "text",
      inputValue: linkUrl,
      inputPlaceholder: "เช่น https://your-portfolio.com",
      showCancelButton: true,
      confirmButtonText: "แนบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed || !result.value) return;
    setKind("link");
    setAttachments([]);
    setLinkUrl(result.value);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const clearKind = () => {
    setKind(null);
    setAttachments([]);
    setLinkUrl("");
  };

  const handleConfirm = async () => {
    if (!title.trim()) {
      Swal.fire("ยังไม่ได้ใส่ชื่อผลงาน", "กรอกชื่อผลงานก่อนนะคะ", "warning");
      return;
    }
    if (!category) {
      Swal.fire("ยังไม่ได้เลือกหมวดหมู่", "เลือกหมวดหมู่ของผลงานก่อน", "warning");
      return;
    }
    if (kind === "link" && !linkUrl.trim()) {
      Swal.fire("ยังไม่ได้ใส่ลิงก์", "กรอกลิงก์ผลงานก่อนนะคะ", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        file_type: kind || "file",
        link_url: kind === "link" ? linkUrl.trim() : null,
        // เฉพาะไฟล์ที่เพิ่งแนบใหม่ (existing: false) เท่านั้นที่ต้องอัปโหลดจริง — ไฟล์เดิมอัปโหลดไปแล้วตอนสร้าง/แก้ไขครั้งก่อน
        newFiles: kind && kind !== "link" ? attachments.filter((a) => !a.existing).map((a) => ({
          file: a.file,
          cover_url: a.coverDataUrl || null,
        })) : [],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[640px] max-w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[18px] font-bold text-gray-900 mx-auto">{isEditMode ? "แก้ไขผลงาน" : "เพิ่มผลงาน"}</h2>
          <button type="button" onClick={onClose} className="absolute right-5 top-4 text-gray-400 hover:text-gray-700 bg-transparent">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ชื่อผลงาน</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น เกียรติบัตรเข้าร่วมค่าย TCAS"
            className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 mb-5 text-[15px] outline-none focus:border-pink-400"
          />

          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">รายละเอียด</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="อธิบายเกี่ยวกับผลงานของคุณ..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-5 text-[15px] leading-relaxed outline-none focus:border-pink-400 resize-none"
          />

          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">อัปโหลดไฟล์</label>

          {generatingCover && (
            <div className="mb-2 text-[12.5px] text-pink-500">กำลังสร้างปกผลงาน...</div>
          )}

          {kind === "link" ? (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FaLink className="text-purple-500 shrink-0" />
                <span className="text-[13.5px] text-gray-700 truncate">{linkUrl}</span>
              </div>
              <button type="button" onClick={clearKind} className="text-gray-400 hover:text-red-500 shrink-0 bg-transparent">
                <FaTimes size={13} />
              </button>
            </div>
          ) : attachments.length > 0 ? (
            <div className="mb-3 flex flex-col gap-2.5">
              {kind === "image" ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {attachments.map((a) => (
                    <div key={a.id} className="relative shrink-0" style={{ width: 88, height: 88 }}>
                      <img src={a.previewUrl} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                      {!a.existing && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(a.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-500 flex items-center justify-center shadow"
                        >
                          <FaTimes size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                attachments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {a.coverDataUrl ? (
                        <img src={a.coverDataUrl} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                      ) : a.mime === "application/pdf" ? (
                        <FaFilePdf className="text-red-500 shrink-0" size={18} />
                      ) : kind === "video" ? (
                        <FaVideo className="text-red-500 shrink-0" size={18} />
                      ) : (
                        <FaFileAlt className="text-blue-500 shrink-0" size={18} />
                      )}
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-gray-700 truncate">{a.name}</div>
                        {a.sizeLabel && <div className="text-[11px] text-gray-400">{a.sizeLabel}</div>}
                      </div>
                    </div>
                    {!a.existing && (
                      <button type="button" onClick={() => removeAttachment(a.id)} className="text-gray-400 hover:text-red-500 shrink-0 bg-transparent">
                        <FaTimes size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            className="hidden"
          />

          <div className="flex items-center gap-1 mb-5 pb-5 border-b border-gray-100">
            <ComposerIconButton icon={<FaPaperclip className="text-blue-500" />} label="อัปโหลดไฟล์" onClick={() => openFilePicker("file")} />
            <ComposerIconButton icon={<FaImage className="text-emerald-500" />} label="รูปภาพ" onClick={() => openFilePicker("image")} />
            <ComposerIconButton icon={<FaVideo className="text-red-500" />} label="วิดีโอ" onClick={() => openFilePicker("video")} />
            <ComposerIconButton icon={<FaLink className="text-purple-500" />} label="ลิงก์" onClick={attachLink} />
          </div>
          <p className="text-[11.5px] text-gray-400 -mt-3 mb-5">รองรับไฟล์ PDF, JPG, PNG, MP4 และลิงก์เว็บไซต์</p>

          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">หมวดหมู่</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 mb-5 text-[15px] outline-none focus:border-pink-400"
          >
            <option value="">เลือกหมวดหมู่</option>
            {PORTFOLIO_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="block text-[13px] font-medium text-gray-700 mb-2">การมองเห็น</label>
          <div className="flex flex-col gap-2 mb-1">
            {Object.values(VISIBILITY_META).map((v) => (
              <label
                key={v.value}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${
                  visibility === v.value ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === v.value}
                  onChange={() => setVisibility(v.value)}
                  className="accent-pink-500"
                />
                <span className="text-[14px] text-gray-800">
                  {v.fullLabel} <span className="text-gray-400 font-normal">({v.hint})</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[15px] font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || generatingCover}
            className="flex-1 h-12 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-[15px] font-semibold"
          >
            {submitting ? "กำลังบันทึก..." : "เผยแพร่"}
          </button>
        </div>
      </div>
    </div>
  );
}

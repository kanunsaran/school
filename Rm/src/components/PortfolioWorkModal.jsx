import { useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  FaTimes, FaCloudUploadAlt, FaLink, FaFilePdf, FaFileAlt, FaVideo, FaImage,
  FaCheck, FaCheckCircle, FaGlobeAsia, FaLock, FaCommentDots, FaUserFriends, FaUser,
} from "react-icons/fa";
import { PORTFOLIO_CATEGORIES } from "../utils/portfolioStore.js";
import { generateCoverForFile, fileKindOf } from "../utils/portfolioThumbnail.js";
import PromptModal from "./PromptModal.jsx";

const MAX_IMAGES = 6;
const MAX_SIZE_MB = 50;

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const STEPS = [
  { key: 1, label: "เลือกไฟล์ผลงาน" },
  { key: 2, label: "ตั้งรายละเอียดผลงาน" },
  { key: 3, label: "ตั้งค่าการมองเห็น" },
  { key: 4, label: "ขอคำปรึกษาจากครู" },
];

// UI มี 4 ตัวเลือก แต่ backend เก็บ visibility ได้แค่ 2 ค่าจริง (public/private) — 3 ตัวเลือกที่ไม่ใช่สาธารณะ
// ("เฉพาะเพื่อนร่วมห้อง"/"เฉพาะครู"/"เฉพาะฉัน") จึงถูกบันทึกเป็น private เหมือนกันไปก่อน จนกว่า backend จะเพิ่มระดับการมองเห็น
const VISIBILITY_OPTIONS = [
  { key: "public", real: "public", label: "สาธารณะ (ทั้งโรงเรียน)", hint: "ทุกคนในโรงเรียนสามารถดูได้", icon: FaGlobeAsia, badgeClass: "bg-blue-100 text-blue-500" },
  { key: "classmates", real: "private", label: "เฉพาะเพื่อนร่วมห้อง", hint: "เฉพาะเพื่อนในห้องเรียนของฉัน", icon: FaUserFriends, badgeClass: "bg-purple-100 text-purple-500" },
  { key: "teacher", real: "private", label: "เฉพาะครู", hint: "เฉพาะครูที่ปรึกษาและครูในโรงเรียน", icon: FaUser, badgeClass: "bg-amber-100 text-amber-500" },
  { key: "private", real: "private", label: "เฉพาะฉัน", hint: "มีเพียงฉันเท่านั้นที่เห็นผลงานนี้", icon: FaLock, badgeClass: "bg-pink-100 text-pink-500" },
];

/* ===== ป๊อปอัพ "เพิ่มผลงาน" — ตัวช่วยสร้าง 4 ขั้นตอน (ไฟล์ → รายละเอียด → การมองเห็น → ขอคำปรึกษา) + หน้าสำเร็จ
   ผลงานหนึ่งชิ้นมีไฟล์แนบได้แบบเดียว (รูปหลายรูป / วิดีโอ 1 ไฟล์ / เอกสาร 1 ไฟล์ / ลิงก์ 1 อัน) ให้ตรงกับ file_type ของ portfolioStore ===== */
export default function PortfolioWorkModal({ initialData, onClose, onConfirm, onViewWorks }) {
  const isEditMode = !!initialData;
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [visibility, setVisibility] = useState(initialData?.visibility === "public" ? "public" : "private");
  const [wantsAdvice, setWantsAdvice] = useState(true);
  const [kind, setKind] = useState(initialData?.file_type || null); // "image" | "video" | "file" | "link"
  const [attachments, setAttachments] = useState(
    () => (initialData?.files || []).map((f) => ({ id: `existing-${f.file_id}`, existing: true, name: f.file_name, previewUrl: f.cover_url || f.file_url, coverDataUrl: f.cover_url, mime: f.file_type, sizeLabel: f.size_label }))
  );
  const [linkUrl, setLinkUrl] = useState(initialData?.link_url || "");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;

    const oversize = selected.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversize) {
      Swal.fire("ไฟล์ใหญ่เกินไป", `แต่ละไฟล์ต้องไม่เกิน ${MAX_SIZE_MB}MB (${oversize.name})`, "warning");
      return;
    }

    // ตรวจชนิดไฟล์อัตโนมัติ — เลือกรูปหลายไฟล์พร้อมกันได้ ส่วนวิดีโอ/เอกสารอื่นแนบได้ทีละชิ้น
    const allImages = selected.every((f) => f.type.startsWith("image/"));
    const nextKind = allImages ? "image" : fileKindOf(selected[0].type) === "video" ? "video" : "file";
    const toAdd = nextKind === "image" ? selected : selected.slice(0, 1);

    if (nextKind === "image" && attachments.length + toAdd.length > MAX_IMAGES) {
      Swal.fire("แนบรูปเกินจำนวน", `แนบรูปได้สูงสุด ${MAX_IMAGES} รูปต่อผลงาน`, "warning");
      return;
    }

    if (kind !== nextKind) setAttachments([]);
    setKind(nextKind);
    setGeneratingCover(true);

    const withCovers = await Promise.all(
      toAdd.map(async (file, i) => ({
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
  };

  const handleFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const confirmAttachLink = (url) => {
    setKind("link");
    setAttachments([]);
    setLinkUrl(url);
    setLinkDialogOpen(false);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (next.length === 0) setKind(null);
      return next;
    });
  };

  const clearKind = () => {
    setKind(null);
    setAttachments([]);
    setLinkUrl("");
  };

  const goNext = () => {
    if (step === 1 && !kind) {
      Swal.fire("ยังไม่ได้แนบไฟล์", "เลือกไฟล์ผลงาน หรือแนบลิงก์ก่อนนะคะ", "warning");
      return;
    }
    if (step === 2) {
      if (!title.trim()) {
        Swal.fire("ยังไม่ได้ใส่ชื่อผลงาน", "กรอกชื่อผลงานก่อนนะคะ", "warning");
        return;
      }
      if (!category) {
        Swal.fire("ยังไม่ได้เลือกหมวดหมู่", "เลือกหมวดหมู่ของผลงานก่อน", "warning");
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        title: title.trim(),
        description: description.trim(),
        category,
        visibility: VISIBILITY_OPTIONS.find((v) => v.key === visibility)?.real || "private",
        file_type: kind || "file",
        link_url: kind === "link" ? linkUrl.trim() : null,
        // เฉพาะไฟล์ที่เพิ่งแนบใหม่ (existing: false) เท่านั้นที่ต้องอัปโหลดจริง — ไฟล์เดิมอัปโหลดไปแล้วตอนสร้าง/แก้ไขครั้งก่อน
        newFiles: kind && kind !== "link" ? attachments.filter((a) => !a.existing).map((a) => ({
          file: a.file,
          cover_url: a.coverDataUrl || null,
        })) : [],
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const coverFile = attachments[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={done ? onClose : undefined} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[680px] max-w-full max-h-[90vh] flex flex-col overflow-hidden">
        {!done && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-[18px] font-bold text-gray-900 mx-auto">{isEditMode ? "แก้ไขผลงาน" : "อัปโหลดผลงานใหม่"}</h2>
              <button type="button" onClick={onClose} className="absolute right-5 top-4 text-gray-400 hover:text-gray-700 bg-transparent">
                <FaTimes size={20} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 px-4 py-4 border-b border-gray-100 shrink-0 overflow-x-auto">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                        step === s.key ? "bg-pink-500 text-white" : step > s.key ? "bg-pink-100 text-pink-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {step > s.key ? <FaCheck size={9} /> : s.key}
                    </span>
                    <span className={`text-[12px] font-medium whitespace-nowrap ${step === s.key ? "text-pink-700" : "text-gray-400"}`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <span className="w-6 h-px bg-gray-200 mx-1" />}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {done ? (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5">
                <FaCheckCircle size={40} />
              </div>
              <div className="text-[19px] font-bold text-gray-900">อัปโหลดสำเร็จ!</div>
              <div className="text-[13.5px] text-gray-500 mt-1.5">ผลงานของคุณถูกอัปโหลดเรียบร้อยแล้ว</div>
            </div>
          ) : step === 1 ? (
            <>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">เลือกไฟล์ผลงาน</label>

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
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${dragOver ? "border-pink-400 bg-pink-50/50" : "border-gray-200 bg-gray-50/50"}`}
                >
                  <FaCloudUploadAlt className="mx-auto text-gray-300" size={34} />
                  <div className="text-[13.5px] text-gray-500 mt-2">ลากไฟล์มาวางที่นี่ หรือ</div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 h-10 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[13px] font-semibold"
                  >
                    เลือกไฟล์
                  </button>
                  <div className="text-[11.5px] text-gray-400 mt-3">รองรับไฟล์ PDF, JPG, PNG, MP4 (ไม่เกิน {MAX_SIZE_MB} MB)</div>
                  <button type="button" onClick={() => setLinkDialogOpen(true)} className="mt-2 text-[12px] text-pink-600 hover:underline bg-transparent">
                    หรือแนบลิงก์ผลงานแทน
                  </button>
                </div>
              )}

              {generatingCover && <div className="mt-3 text-[12.5px] text-pink-500">กำลังสร้างปกผลงาน...</div>}

              {kind && kind !== "link" && attachments.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {attachments.map((a) => {
                    const AttIcon = a.mime === "application/pdf" ? FaFilePdf : kind === "video" ? FaVideo : kind === "image" ? FaImage : FaFileAlt;
                    return (
                      <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {a.coverDataUrl ? (
                            <img src={a.coverDataUrl} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200" />
                          ) : (
                            <AttIcon className="text-pink-400 shrink-0" size={18} />
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
                    );
                  })}
                </div>
              )}

              <input type="file" ref={fileInputRef} onChange={handleFileInput} multiple className="hidden" />
            </>
          ) : step === 2 ? (
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5">
              <div>
                <div className="w-full aspect-3/4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                  {coverFile?.coverDataUrl || coverFile?.previewUrl ? (
                    <img src={coverFile.coverDataUrl || coverFile.previewUrl} className="w-full h-full object-cover" />
                  ) : kind === "link" ? (
                    <FaLink className="text-purple-300" size={26} />
                  ) : (
                    <FaFileAlt className="text-gray-300" size={26} />
                  )}
                </div>
                {kind === "image" && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 w-full h-8 rounded-lg bg-pink-50 text-pink-600 text-[11.5px] font-medium hover:bg-pink-100">
                    เปลี่ยนรูปปก
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileInput} className="hidden" accept="image/*" />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ชื่อผลงาน</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น เกียรติบัตรเข้าร่วมค่าย TCAS"
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 mb-4 text-[14.5px] outline-none focus:border-pink-400"
                />

                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">หมวดหมู่</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 mb-4 text-[14.5px] outline-none focus:border-pink-400"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {PORTFOLIO_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">คำอธิบายผลงาน (ไม่บังคับ)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="อธิบายเกี่ยวกับผลงานของคุณ..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14.5px] leading-relaxed outline-none focus:border-pink-400 resize-none"
                />
              </div>
            </div>
          ) : step === 3 ? (
            <>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">การมองเห็น</label>
              <p className="text-[12px] text-gray-400 mb-3">เลือกใครสามารถดูผลงานของคุณได้</p>
              <div className="flex flex-col gap-2.5">
                {VISIBILITY_OPTIONS.map((v) => {
                  const VisIcon = v.icon;
                  const selected = visibility === v.key;
                  return (
                    <label
                      key={v.key}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer ${
                        selected ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        checked={selected}
                        onChange={() => setVisibility(v.key)}
                        className="accent-pink-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-gray-800">{v.label}</div>
                        <div className="text-[12px] text-gray-400 mt-0.5">{v.hint}</div>
                      </div>
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${v.badgeClass}`}>
                        <VisIcon size={15} />
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11.5px] text-gray-400 mt-3">
                ตอนนี้ฐานข้อมูลเก็บการมองเห็นได้จริงแค่ 2 ระดับ (สาธารณะ / ไม่สาธารณะ) ตัวเลือก "เฉพาะเพื่อนร่วมห้อง/เฉพาะครู/เฉพาะฉัน" จึงยังถูกบันทึกเป็นแบบไม่สาธารณะเหมือนกันไปก่อน จนกว่า backend จะเพิ่มระดับการมองเห็น
              </p>
            </>
          ) : (
            <>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">ขอคำปรึกษาจากครู (ไม่บังคับ)</label>
              <p className="text-[12px] text-gray-400 mb-3">ต้องการให้ครูช่วยแนะนำผลงานของคุณหรือไม่</p>

              <div className="flex flex-col gap-2.5">
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer ${wantsAdvice ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={wantsAdvice} onChange={() => setWantsAdvice(true)} className="accent-pink-500 w-4 h-4" />
                  <FaCommentDots className={wantsAdvice ? "text-pink-500" : "text-gray-300"} />
                  <div>
                    <div className="text-[13.5px] font-medium text-gray-800">ต้องการขอคำปรึกษา</div>
                    <div className="text-[11.5px] text-gray-400">ครูจะได้รับแจ้งเตือนและสามารถให้คำแนะนำได้</div>
                  </div>
                </label>
                <label className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer ${!wantsAdvice ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={!wantsAdvice} onChange={() => setWantsAdvice(false)} className="accent-pink-500 w-4 h-4" />
                  <span className="text-[13.5px] font-medium text-gray-800">ไม่ต้องการขอคำปรึกษา</span>
                </label>
              </div>

              <p className="text-[11.5px] text-gray-400 mt-4">
                ตอนนี้ระบบยังไม่มีช่องเก็บตัวเลือกนี้ในฐานข้อมูล ทุกผลงานที่อัปโหลดจะเข้าคิวให้ครูตรวจเหมือนกันไปก่อน (รอฝั่ง backend เพิ่มฟิลด์นี้)
              </p>

              <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5">
                <div className="text-[13px] font-semibold text-gray-700 mb-1">สรุปผลงาน</div>
                <div className="text-[13px] text-gray-600">
                  <span className="font-medium text-gray-800">{title || "-"}</span>
                  <span className="text-gray-400"> · {category || "ยังไม่ระบุหมวดหมู่"}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          {done ? (
            <>
              <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[15px] font-medium">
                กลับหน้าหลัก
              </button>
              <button type="button" onClick={onViewWorks || onClose} className="flex-1 h-12 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-semibold">
                ดูผลงานของฉัน
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={step === 1 ? onClose : goBack}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[15px] font-medium"
              >
                {step === 1 ? "ยกเลิก" : "ย้อนกลับ"}
              </button>
              {step < 4 ? (
                <button type="button" onClick={goNext} className="flex-1 h-12 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-semibold">
                  ถัดไป
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting || generatingCover}
                  className="flex-1 h-12 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[15px] font-semibold"
                >
                  {submitting ? "กำลังอัปโหลด..." : isEditMode ? "บันทึกการแก้ไข" : "อัปโหลดผลงาน"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {linkDialogOpen && (
        <PromptModal
          title="แนบลิงก์ผลงาน"
          icon={FaLink}
          label="URL"
          placeholder="เช่น https://your-portfolio.com"
          initialValue={linkUrl}
          confirmLabel="แนบ"
          onConfirm={confirmAttachLink}
          onClose={() => setLinkDialogOpen(false)}
        />
      )}
    </div>
  );
}

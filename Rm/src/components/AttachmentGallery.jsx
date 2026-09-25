import { useEffect, useState } from "react";
import { FaTimes, FaChevronLeft, FaChevronRight, FaShare, FaLink, FaThumbsUp, FaRegThumbsUp, FaRegComment, FaPaperclip } from "react-icons/fa";
import { isImageFile, isVideoFile, resolveFileUrl } from "../utils/media";
import { shareLink, copyLink } from "../utils/feedShared.js";
import { CommentList, CommentInputBar } from "./PostComments.jsx";
import Avatar from "./Avatar.jsx";

// แสดงไฟล์แนบของโพสต์ (news / กิจกรรม) — รูปภาพหลายรูปเลื่อนดูเป็นแถว กดเปิดดูเต็มจอเลื่อนซ้าย-ขวาได้ วิดีโอเล่นในตัวได้เลย ส่วนไฟล์เอกสารแสดงเป็นลิงก์ดาวน์โหลด
// caption/shareUrl (ไม่บังคับ) — ใส่แล้วไลท์บ็อกซ์จะโชว์แบบเฟซบุ๊ก (รูปใหญ่ซ้าย + ข้อความโพสต์ขวา + แชร์/คัดลอกลิงก์ได้จริง)
export default function AttachmentGallery({ files, apiBase, caption, shareUrl }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const images = (files || []).filter(isImageFile);

  // ปุ่มลูกศรซ้าย/ขวา + Esc จากคีย์บอร์ดตอนเปิดไลท์บ็อกซ์
  useEffect(() => {
    if (lightboxIndex === null || images.length === 0) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowLeft" && images.length > 1) setLightboxIndex((i) => (i - 1 + images.length) % images.length);
      else if (e.key === "ArrowRight" && images.length > 1) setLightboxIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, images.length]);

  if (!files || files.length === 0) return null;

  const videos = files.filter(isVideoFile);
  const others = files.filter((f) => !isImageFile(f) && !isVideoFile(f));

  return (
    <div className="mt-3 space-y-3">

      {images.length > 0 && (
        <ImageGrid images={images} apiBase={apiBase} onOpen={setLightboxIndex} />
      )}

      {videos.map((f) => (
        <video
          key={f.file_id || f.file_url}
          src={resolveFileUrl(apiBase, f.file_url)}
          controls
          className="w-full max-h-[420px] rounded-2xl bg-black"
        />
      ))}

      {others.map((f) => (
        <a
          key={f.file_id || f.file_url}
          href={resolveFileUrl(apiBase, f.file_url)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 text-sm hover:underline"
        >
          <FaPaperclip size={12} /> {f.file_name || "ดาวน์โหลดไฟล์แนบ"}
        </a>
      ))}

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/85 z-60 flex items-center justify-center p-3 md:p-6"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className={`relative w-full ${
              caption
                ? "max-w-[1100px] h-full md:h-[85vh] flex flex-col md:flex-row bg-black rounded-xl overflow-hidden"
                : "flex items-center justify-center"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <FaTimes size={15} />
            </button>

            {/* ตัวโชว์รูป — เลื่อนซ้าย-ขวาได้ด้วยปุ่มลูกศรหรือคีย์บอร์ด */}
            <div className={`relative flex-1 min-w-0 flex items-center justify-center bg-black ${caption ? "min-h-[45vh]" : ""}`}>
              {images.length > 1 && (
                <button
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)}
                  className="absolute left-2 md:left-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                >
                  <FaChevronLeft />
                </button>
              )}

              <img
                src={resolveFileUrl(apiBase, images[lightboxIndex].file_url)}
                alt=""
                className={caption ? "max-h-full max-w-full object-contain" : "max-h-[85vh] max-w-[85vw] object-contain rounded-lg"}
              />

              {images.length > 1 && (
                <button
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % images.length)}
                  className="absolute right-2 md:right-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                >
                  <FaChevronRight />
                </button>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-[12px] font-medium bg-black/55 px-3 py-1 rounded-full">
                  {lightboxIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* แผงข้อความโพสต์ — โชว์เฉพาะตอนมีการส่ง caption มาให้ (แบบเฟซบุ๊ก: รูปซ้าย ข้อความ+คอมเมนต์ขวา) */}
            {caption && (
              <div className="w-full md:w-[400px] shrink-0 bg-white flex flex-col max-h-[55vh] md:max-h-full">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
                  {caption.authorName && <Avatar src={caption.authorAvatar} name={caption.authorName} size={40} />}
                  <div className="min-w-0">
                    {caption.authorName && <div className="font-semibold text-gray-900 text-[15.5px] truncate">{caption.authorName}</div>}
                    {caption.timeLabel && <div className="text-[12.5px] text-gray-400">{caption.timeLabel}</div>}
                  </div>
                </div>

                <div className={`px-4 pt-4 shrink-0 ${caption.comments ? "" : "pb-4 overflow-y-auto flex-1"}`}>
                  {caption.title && <div className="font-bold text-gray-900 text-[14.5px] mb-1.5">{caption.title}</div>}
                  {caption.html ? (
                    <div className="text-[13.5px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: caption.html }} />
                  ) : (
                    caption.text && <div className="text-[13.5px] text-gray-700 leading-relaxed whitespace-pre-line">{caption.text}</div>
                  )}

                  {/* ไลก์ / จำนวนคอมเมนต์ / แชร์ — วางไว้เหนือคอมเมนต์เลย ไม่มีเส้นคั่น ชิดกันเป็นกลุ่มเดียว ให้ฟีลเหมือนโพสต์เฟซบุ๊กทั่วไป */}
                  {caption.comments && (
                    <div className="mt-3 pb-3 flex items-center gap-4 text-gray-500">
                      {caption.onToggleLike && (
                        <button
                          type="button"
                          onClick={caption.onToggleLike}
                          className={`flex items-center gap-1.5 text-[13.5px] font-medium bg-transparent ${caption.liked ? "text-pink-600" : "hover:text-gray-700"}`}
                        >
                          {caption.liked ? <FaThumbsUp /> : <FaRegThumbsUp />} {caption.likeCount > 0 && caption.likeCount}
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 text-[13.5px] font-medium">
                        <FaRegComment /> {caption.comments.length}
                      </div>
                      {shareUrl && (
                        <button
                          type="button"
                          onClick={() => shareLink(shareUrl, caption.title)}
                          className="flex items-center gap-1.5 text-[13.5px] font-medium bg-transparent hover:text-gray-700"
                        >
                          <FaShare />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* คอมเมนต์ — เลื่อนดูได้ในพื้นที่ตรงกลาง ส่วนช่องพิมพ์ปักไว้ล่างสุดแบบตายตัว ไม่ลอยตามลิสต์ */}
                {caption.comments && (
                  <div className="px-4 pt-1 pb-3 overflow-y-auto flex-1">
                    <CommentList
                      comments={caption.comments}
                      onSubmitReply={caption.onSubmitReply}
                      currentUserAvatar={caption.currentUserAvatar}
                      currentUserName={caption.currentUserName}
                      currentUserId={caption.currentUserId}
                      onEditComment={caption.onEditComment}
                      onDeleteComment={caption.onDeleteComment}
                    />
                  </div>
                )}

                {caption.comments ? (
                  <div className="p-3 border-t border-gray-100 shrink-0">
                    <CommentInputBar
                      commentDraft={caption.commentDraft}
                      onCommentDraftChange={caption.onCommentDraftChange}
                      onSubmitComment={caption.onSubmitComment}
                      currentUserAvatar={caption.currentUserAvatar}
                      currentUserName={caption.currentUserName}
                    />
                  </div>
                ) : (
                  shareUrl && (
                    <div className="p-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => shareLink(shareUrl, caption.title)}
                        className="flex-1 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-[12.5px] font-medium text-gray-700 flex items-center justify-center gap-1.5 bg-white"
                      >
                        <FaShare size={11} /> แชร์
                      </button>
                      <button
                        type="button"
                        onClick={() => copyLink(shareUrl)}
                        className="flex-1 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 text-[12.5px] font-medium text-gray-700 flex items-center justify-center gap-1.5 bg-white"
                      >
                        <FaLink size={11} /> คัดลอกลิงก์
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// จัดผังรูปแบบเฟซบุ๊ก: โชว์สูงสุด 4 ช่องเสมอ ถ้ามีมากกว่านั้นช่องสุดท้ายจะทับ "+N" ให้กดดูรูปที่เหลือ
function ImageGrid({ images, apiBase, onOpen }) {
  const count = images.length;

  // รูปเดียว: คงสัดส่วนจริงของรูป (แนวตั้งก็ตั้ง แนวนอนก็นอน) ไม่บังคับครอปเป็น 16:9 แค่จำกัดความสูงไว้กันโพสต์ยาวเกินไป
  if (count === 1) {
    const f = images[0];
    return (
      <button
        onClick={() => onOpen(0)}
        className="block w-full max-h-[520px] rounded-2xl overflow-hidden text-center"
        style={{ backgroundColor: "#f9fafb" }}
      >
        <img
          src={resolveFileUrl(apiBase, f.file_url)}
          alt={f.file_name || "รูปแนบ"}
          className="max-w-full max-h-[520px] object-contain inline-block"
        />
      </button>
    );
  }

  const visible = images.slice(0, 4);
  const extraCount = count - visible.length;

  // 2+ รูป: เต็มความกว้างเท่ากรอบโพสต์เหมือนกัน แต่ละช่องเตี้ยลง (16:9) ไม่สูงเป็นแนวตั้ง
  const layoutClass = count === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2";

  return (
    <div className={`grid gap-1 rounded-2xl overflow-hidden w-full ${layoutClass}`}>
      {visible.map((f, idx) => {
        const isTallLeftTile = count === 3 && idx === 0;
        return (
          <button
            key={f.file_id || f.file_url}
            onClick={() => onOpen(idx)}
            className={`relative overflow-hidden w-full h-full max-h-72 ${isTallLeftTile ? "row-span-2" : "aspect-video"}`}
            style={{ backgroundColor: "white" }}
          >
            <img
              src={resolveFileUrl(apiBase, f.file_url)}
              alt={f.file_name || "รูปแนบ"}
              className="w-full h-full object-cover"
            />

            {idx === visible.length - 1 && extraCount > 0 && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-2xl font-semibold">
                +{extraCount}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

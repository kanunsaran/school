import { useState } from "react";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { isImageFile, isVideoFile, resolveFileUrl } from "../utils/media";

// แสดงไฟล์แนบของโพสต์ (news / กิจกรรม) — รูปภาพหลายรูปเลื่อนดูเป็นแถว กดเปิดดูเต็มจอเลื่อนซ้าย-ขวาได้ วิดีโอเล่นในตัวได้เลย ส่วนไฟล์เอกสารแสดงเป็นลิงก์ดาวน์โหลด
export default function AttachmentGallery({ files, apiBase }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!files || files.length === 0) return null;

  const images = files.filter(isImageFile);
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
          📎 {f.file_name || "ดาวน์โหลดไฟล์แนบ"}
        </a>
      ))}

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute top-6 right-6 text-white text-2xl"
            style={{ backgroundColor: "transparent" }}
          >
            <FaTimes />
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
              }}
              className="absolute left-4 text-white text-2xl px-3 py-2"
              style={{ backgroundColor: "transparent" }}
            >
              <FaChevronLeft />
            </button>
          )}

          <img
            src={resolveFileUrl(apiBase, images[lightboxIndex].file_url)}
            alt=""
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex + 1) % images.length);
              }}
              className="absolute right-4 text-white text-2xl px-3 py-2"
              style={{ backgroundColor: "transparent" }}
            >
              <FaChevronRight />
            </button>
          )}
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
            className={`relative overflow-hidden max-h-72 ${isTallLeftTile ? "row-span-2" : "aspect-video"}`}
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

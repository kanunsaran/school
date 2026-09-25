import { FaDownload } from "react-icons/fa";
import { resolveFileUrl } from "../utils/media.js";
import { API_BASE } from "../utils/feedShared.js";
import { portfolioFileIcon } from "../utils/portfolioStore.js";

// พรีวิวไฟล์เดียว — รูปโชว์เต็ม, PDF เลื่อนดูได้ในกรอบ (iframe), วิดีโอเล่นได้, ไฟล์อื่นกดเปิดได้ — มีปุ่มดาวน์โหลดมุมขวาบนเสมอไม่ว่าไฟล์ประเภทไหน
// ใช้ร่วมกันทั้งฝั่งครู (Portfolio.jsx) และฝั่งนักเรียน (StudentPortfolio.jsx) กันหน้าตาเพี้ยนกันระหว่างสองฝั่ง
export default function PortfolioFilePreview({ file, work, className = "" }) {
  if (!file) return null;
  const Icon = portfolioFileIcon(file, work);
  const url = resolveFileUrl(API_BASE, file.file_url);
  const isImage = (file.file_type || "").startsWith("image/");
  const isPdf = file.file_type === "application/pdf";
  const isVideo = (file.file_type || "").startsWith("video/");

  return (
    <div className={`relative bg-gray-50 overflow-hidden flex items-center justify-center ${className}`}>
      {isImage ? (
        <img src={file.cover_url || url} className="w-full h-full object-contain" />
      ) : isPdf ? (
        <iframe src={url} className="w-full h-full" title={file.file_name} />
      ) : isVideo ? (
        <video src={url} controls className="w-full h-full" />
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 text-gray-400 text-[12px] px-4 text-center">
          <Icon size={26} />
          {file.file_name || "เปิดไฟล์"}
        </a>
      )}

      <a
        href={url}
        download={file.file_name || true}
        onClick={(e) => e.stopPropagation()}
        title="ดาวน์โหลดไฟล์"
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-gray-600"
      >
        <FaDownload size={12} />
      </a>
    </div>
  );
}

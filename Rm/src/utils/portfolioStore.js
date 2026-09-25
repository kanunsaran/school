// ค่าคงที่ที่ใช้ร่วมกันระหว่างหน้าแฟ้มสะสมผลงานฝั่งนักเรียน (StudentPortfolio.jsx) และฝั่งครู (Portfolio.jsx)
// การเรียก API จริงอยู่ใน callapi_user.jsx (getPortfolioWorks, createPortfolioWork, ...) ตามแพทเทิร์นเดียวกับฟีเจอร์อื่นในแอป
// ⚠️ ต้องตรงกับ ENUM ในตาราง portfolio_works ของ backend เป๊ะๆ: visibility('public','private'), status('รอคำแนะนำ','ให้คำแนะนำแล้ว','ต้องแก้ไข')
import { FaGlobeAsia, FaLock, FaFilePdf, FaFileAlt, FaVideo, FaLink } from "react-icons/fa";

// แค่รายการหมวดหมู่ตั้งต้นให้เลือกตอนสร้างผลงาน — คอลัมน์ category เป็น varchar ไม่ได้บังคับ ENUM ฝั่ง backend
export const PORTFOLIO_CATEGORIES = ["พอร์ตฟอลิโอ", "เกียรติบัตร", "กิจกรรม", "จิตอาสา", "ผลงาน", "โครงงาน"];

export const VISIBILITY_META = {
  public: { value: "public", label: "สาธารณะ", fullLabel: "สาธารณะ", hint: "เพื่อนและครูเห็นได้" },
  private: { value: "private", label: "ส่วนตัว", fullLabel: "ส่วนตัว", hint: "ครูผู้สอนกับตัวฉันเท่านั้น" },
};

export const STATUS_META = {
  "รอคำแนะนำ": { value: "รอคำแนะนำ", label: "รอคำแนะนำ", color: "amber" },
  "ให้คำแนะนำแล้ว": { value: "ให้คำแนะนำแล้ว", label: "ให้คำแนะนำแล้ว", color: "emerald" },
  "ต้องแก้ไข": { value: "ต้องแก้ไข", label: "ต้องแก้ไข", color: "red" },
};

// สีป้าย/ไอคอนของหมวดหมู่-การมองเห็น-สถานะ — จุดเดียวที่ใช้ร่วมกันระหว่างการ์ดฝั่งครูและฝั่งนักเรียน (PortfolioCard.jsx)
export const CATEGORY_BADGE = {
  "พอร์ตฟอลิโอ": "bg-purple-50 text-purple-700",
  "เกียรติบัตร": "bg-amber-50 text-amber-700",
  "กิจกรรม": "bg-blue-50 text-blue-700",
  "จิตอาสา": "bg-red-50 text-red-700",
  "ผลงาน": "bg-yellow-50 text-yellow-700",
  "โครงงาน": "bg-indigo-50 text-indigo-700",
};

export const VISIBILITY_BADGE = {
  public: "bg-purple-50 text-purple-700",
  private: "bg-amber-50 text-amber-700",
};

export const VISIBILITY_ICON = { public: FaGlobeAsia, private: FaLock };

export const STATUS_BADGE = {
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
};

// ไอคอนไฟล์แนบตามประเภท — ใช้ทั้ง cover fallback บนการ์ดและ thumbnail strip ในหน้ารายละเอียด
export function portfolioFileIcon(file, work) {
  if (work?.file_type === "link") return FaLink;
  if (work?.file_type === "video" || (file?.file_type || "").startsWith("video/")) return FaVideo;
  if (file?.file_type === "application/pdf") return FaFilePdf;
  return FaFileAlt;
}

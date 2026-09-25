import { resolveFileUrl } from "../utils/media.js";
import { initialOf } from "../utils/avatar.js";
import { API_BASE_URL } from "../config/api.js";

const API_BASE = API_BASE_URL;

// วงกลมโปรไฟล์กลางที่ใช้ร่วมกันทั้งแอป — มีรูปจริงก็โชว์รูป (ต่อ API_BASE ให้ถ้าเป็น path สัมพัทธ์)
// ไม่มีรูปก็โชว์วงกลมสีชมพู + ตัวอักษรแรกของชื่อ (ตัดคำนำหน้าออกก่อน) แทน placeholder ปลอมๆ
export default function Avatar({ src, name, size = 40, className = "", onClick, title, rounded = "rounded-full" }) {
  const resolvedSrc = src ? resolveFileUrl(API_BASE, src) : null;
  const clickable = !!onClick;

  if (resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={name || "avatar"}
        title={title ?? name}
        onClick={onClick}
        style={{ width: size, height: size }}
        className={`${rounded} object-cover shrink-0 ${clickable ? "cursor-pointer" : ""} ${className}`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      title={title ?? name}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.42)) }}
      className={`${rounded} bg-pink-400 text-white font-semibold flex items-center justify-center shrink-0 ${clickable ? "cursor-pointer" : ""} ${className}`}
    >
      {initialOf(name)}
    </div>
  );
}

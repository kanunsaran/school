// ค่าคงที่/ตัวช่วยฟอร์แมตที่ใช้ร่วมกันระหว่างฟีดข่าวสารทั้งโรงเรียน (NewsFeed.jsx) และฟีดรายห้องเรียน (ClassroomStream.jsx)
import { API_URL } from "../config.js";
import Swal from "sweetalert2";

// ⚠️ ยังไม่มีหน้า login จริงที่ decode user id จาก token ได้ (ทั้งแอปยังไม่มี pattern นี้เลย)
// ใช้ค่า placeholder เดียวกับที่ news.jsx / post.jsx ใช้อยู่ รอทำระบบ auth จริงค่อยเปลี่ยน
export const CURRENT_USER_ID = "2";
export const API_BASE = API_URL;
export const CURRENT_TEACHER = { name: "คุณครู สุพรรณี", role: "ครูแนะแนว", avatar: `https://i.pravatar.cc/80?u=teacher-${CURRENT_USER_ID}` };

export const formatRelativeTime = (iso) => {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "เมื่อวาน";
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
};

export const formatFullThaiDate = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return "";
  return new Date(yyyy_mm_dd).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
};

export const formatThaiDateTime = (isoLike) => {
  if (!isoLike) return "";
  return new Date(isoLike).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// คืนวันที่แบบ YYYY-MM-DD ตามเขตเวลาเครื่อง (ห้ามใช้ .slice บน ISO string ตรงๆ เพราะ backend เก็บเป็น UTC จะเพี้ยนวันได้)
export const toDateOnlyStr = (isoLike) => {
  const d = new Date(isoLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const getTodayStr = () => toDateOnlyStr(new Date());

export const notAvailableYet = (label) =>
  Swal.fire({ icon: "info", title: label, text: "ฟีเจอร์นี้ยังไม่เปิดใช้งาน", confirmButtonText: "รับทราบ" });

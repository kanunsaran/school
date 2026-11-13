export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Google OAuth Client ID (ค่า public ไม่ใช่ความลับ) — เปลี่ยนได้ด้วย VITE_GOOGLE_CLIENT_ID ตอน build
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "227111588323-0a9ruof7fu0at9rbep25orkm31hh8m13.apps.googleusercontent.com";

// ตัวช่วยกลาง ใช้ร่วมกันระหว่างหน้า news และหน้ากิจกรรม (post) สำหรับแสดงไฟล์แนบ/youtube

export const isImageFile = (f) => {
  const type = f?.file_type || f?.mime_type || "";
  if (type) return type.startsWith("image/");
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(f?.file_name || f?.file_url || "");
};

export const isVideoFile = (f) => {
  const type = f?.file_type || f?.mime_type || "";
  if (type) return type.startsWith("video/");
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(f?.file_name || f?.file_url || "");
};

// ไฟล์จาก Google Drive จะเป็น URL เต็มอยู่แล้ว ส่วนไฟล์ที่เก็บในเครื่อง server ยังเป็น path สัมพัทธ์ (เช่น /uploads/xxx) ต้องต่อ apiBase เอง
export const resolveFileUrl = (apiBase, url) =>
  /^https?:\/\//i.test(url || "") ? url : `${apiBase}${url}`;

// รองรับ URL ยูทูปได้หลายแบบ (watch?v=, youtu.be, shorts, embed) กันฝังวิดีโอไม่ขึ้นตอนวางลิงก์แบบย่อ
export function getYoutubeVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1];
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1];
    return null;
  } catch {
    return null;
  }
}

export function getYoutubeEmbedUrl(url) {
  const videoId = getYoutubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

// รูปปกวิดีโอจาก thumbnail ของยูทูปเอง ใช้โชว์พรีวิวตอนแนบในคอมโพสเซอร์ก่อนโพสต์จริง
export function getYoutubeThumbnailUrl(url) {
  const videoId = getYoutubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

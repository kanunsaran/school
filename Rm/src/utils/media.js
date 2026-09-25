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
export function getYoutubeEmbedUrl(url) {
  if (!url) return null;

  try {
    const u = new URL(url);
    let videoId = null;

    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    } else if (u.searchParams.get("v")) {
      videoId = u.searchParams.get("v");
    } else if (u.pathname.startsWith("/embed/")) {
      videoId = u.pathname.split("/embed/")[1];
    } else if (u.pathname.startsWith("/shorts/")) {
      videoId = u.pathname.split("/shorts/")[1];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  } catch {
    return url;
  }
}

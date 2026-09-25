import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import AttachmentGallery from "../components/AttachmentGallery.jsx";
import { getFeedPosts, getFeedPostFiles } from "../callapi/callapi_user.jsx";
import { CATEGORY_META } from "../learning/newsFeedMockData.js";
import { isImageFile } from "../utils/media.js";
import { API_BASE, CURRENT_TEACHER, formatThaiDateTime } from "../utils/feedShared.js";

export default function ImagePostDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [post, setPost] = useState(location.state?.post || null);
  const [loading, setLoading] = useState(!location.state?.post);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (location.state?.post) return; // มาจากการคลิกการ์ดในหน้ารายการ มีข้อมูลพร้อมอยู่แล้ว ไม่ต้องยิงซ้ำ

    const fetchPost = async () => {
      try {
        const raw = await getFeedPosts();
        const found = raw.find((p) => String(p.post_id) === id);
        if (!found) {
          setNotFound(true);
          return;
        }
        const files = await getFeedPostFiles(found.post_id);
        setPost({
          post_id: found.post_id,
          title: found.title,
          content: found.content,
          category: found.category,
          createdAt: found.created_at,
          authorName: found.author_name || CURRENT_TEACHER.name,
          images: files.filter(isImageFile),
        });
      } catch (err) {
        console.error("โหลดโพสต์ไม่สำเร็จ:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white flex">
        <Header />
        <SidebarNav />
        <main className="flex-1 pt-24 p-10 text-center text-gray-500">กำลังโหลด…</main>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen w-full bg-white flex">
        <Header />
        <SidebarNav />
        <main className="flex-1 pt-24 p-10">
          <div className="text-gray-900 font-semibold">ไม่พบโพสต์นี้</div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 rounded-xl border border-gray-300"
          >
            กลับ
          </button>
        </main>
      </div>
    );
  }

  const catMeta = CATEGORY_META[post.category];

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-8 pt-24 pb-16 max-w-[900px]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-900 bg-transparent border-none p-0"
        >
          <FaArrowLeft size={12} /> กลับไปหน้ารูปภาพกิจกรรม
        </button>

        <div className="mt-4 flex items-center gap-2">
          {catMeta && (
            <span className={`h-6 px-2.5 rounded-full text-[11.5px] font-semibold border ${catMeta.badge}`}>
              {catMeta.label}
            </span>
          )}
        </div>

        <div className="mt-2 text-[24px] leading-snug font-bold text-gray-900">{post.title}</div>

        <div className="mt-2 flex items-center gap-2 text-[13px] text-gray-500">
          <span>{post.authorName}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{formatThaiDateTime(post.createdAt)}</span>
        </div>

        {post.content && (
          <div className="mt-5 rounded-2xl bg-white border border-gray-200 p-5 text-[14px] leading-relaxed text-gray-700 whitespace-pre-wrap">
            {post.content}
          </div>
        )}

        <div className="mt-6">
          <div className="text-[15px] font-semibold text-gray-900 mb-3">รูปทั้งหมด ({post.images.length})</div>
          <AttachmentGallery files={post.images} apiBase={API_BASE} />
        </div>
      </main>
    </div>
  );
}

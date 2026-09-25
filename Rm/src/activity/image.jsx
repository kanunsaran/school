import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaImages } from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getFeedPosts, getFeedPostFiles } from "../callapi/callapi_user.jsx";
import { CATEGORY_META, FEED_CATEGORIES } from "../learning/newsFeedMockData.js";
import { isImageFile, resolveFileUrl } from "../utils/media.js";
import { API_BASE, CURRENT_TEACHER, formatRelativeTime } from "../utils/feedShared.js";

// ดึงเฉพาะโพสต์ที่มีรูปภาพแนบจากฟีดข่าวสารทั้งโรงเรียน (feed_posts) มาแสดงเป็นแกลเลอรีภาพกิจกรรม
export default function ImagePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const fetchImagePosts = async () => {
      try {
        const raw = await getFeedPosts();
        const withFiles = await Promise.all(
          raw.map(async (p) => {
            let files = [];
            try {
              files = await getFeedPostFiles(p.post_id);
            } catch (err) {
              console.error("โหลดไฟล์แนบไม่สำเร็จ:", err);
            }
            return {
              post_id: p.post_id,
              title: p.title,
              content: p.content,
              category: p.category,
              createdAt: p.created_at,
              authorName: p.author_name || CURRENT_TEACHER.name,
              images: files.filter(isImageFile),
            };
          })
        );
        const onlyWithImages = withFiles
          .filter((p) => p.images.length > 0)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPosts(onlyWithImages);
      } catch (err) {
        console.error("โหลดรูปภาพกิจกรรมไม่สำเร็จ:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchImagePosts();
  }, []);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const okCategory = category === "all" ? true : p.category === category;
      const okQ = q.trim()
        ? p.title.toLowerCase().includes(q.trim().toLowerCase()) || p.content.toLowerCase().includes(q.trim().toLowerCase())
        : true;
      return okCategory && okQ;
    });
  }, [posts, category, q]);

  const openDetail = (post) => {
    navigate(`/image/${post.post_id}`, { state: { post } });
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-8 pt-24 pb-16">
        <div className="text-[24px] font-bold text-gray-900">รูปภาพกิจกรรม</div>
        <div className="mt-1 text-[13px] text-gray-500">
          รวมภาพกิจกรรมจากประกาศข่าวสารทั้งหมด — กดรูปเพื่อดูโพสต์เต็มและรูปทั้งหมด
        </div>

        {/* Search + category chips */}
        <div className="mt-5 flex flex-col gap-3">
          <div className="relative max-w-[360px]">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหารูปภาพกิจกรรม"
              className="w-full h-11 rounded-full border border-gray-200 bg-white pl-10 pr-4 outline-none focus:border-pink-300"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FEED_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`h-9 px-4 rounded-full border text-[13px] font-medium transition-colors ${
                  category === c.key ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="text-center text-gray-500 py-16">กำลังโหลดรูปภาพกิจกรรม…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-20 rounded-2xl border border-dashed border-gray-200">
              ยังไม่มีโพสต์ที่มีรูปภาพในหมวดนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <PostCard key={p.post_id} post={p} onOpen={() => openDetail(p)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PostCard({ post, onOpen }) {
  const cover = post.images[0];
  const catMeta = CATEGORY_META[post.category];
  const extraCount = post.images.length - 1;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full text-left bg-transparent border-none p-0"
      title="เปิดดูโพสต์"
    >
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md overflow-hidden transition-shadow">
        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
          <img
            src={resolveFileUrl(API_BASE, cover.file_url)}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          {catMeta && (
            <span className={`absolute top-3 left-3 h-6 px-2.5 rounded-full text-[11px] font-semibold border ${catMeta.badge}`}>
              {catMeta.label}
            </span>
          )}

          {extraCount > 0 && (
            <span className="absolute bottom-3 right-3 h-6 px-2.5 rounded-full bg-black/60 text-white text-[11px] font-medium flex items-center gap-1">
              <FaImages size={10} /> +{extraCount}
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="text-[15px] font-semibold text-gray-900 line-clamp-2 leading-snug">{post.title}</div>
          <div className="mt-1.5 text-[13px] text-gray-500 line-clamp-2">{post.content}</div>

          <div className="mt-3 flex items-center gap-2 text-[12px] text-gray-400">
            <span>{post.authorName}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

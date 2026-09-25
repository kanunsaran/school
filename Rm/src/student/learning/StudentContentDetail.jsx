import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import { FaChevronLeft, FaPaperclip } from "react-icons/fa";
import { getContentById, getContentFiles } from "../../callapi/callapi_user.jsx";
import { resolveFileUrl } from "../../utils/media.js";
import { API_BASE, CURRENT_TEACHER } from "../../utils/feedShared.js";
import PageLoading from "../../components/PageLoading.jsx";

const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// อ่านอย่างเดียว ไม่มีปุ่มจัดการใดๆ (แก้ไข/ลบเป็นสิทธิ์ครูเท่านั้น — ดู ContentDetail.jsx ฝั่งครู)
export default function StudentContentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, f] = await Promise.all([
          getContentById(id),
          getContentFiles(id).catch(() => []),
        ]);
        setContent(c);
        setFiles(f || []);
      } catch (err) {
        console.error("โหลดเนื้อหาไม่สำเร็จ:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex text-[14.5px] text-gray-900">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Header />
          <main className="w-full px-6 md:px-8 pt-24 pb-10"><PageLoading /></main>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-white flex text-[14.5px] text-gray-900">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Header />
          <main className="w-full px-6 md:px-8 pt-24 pb-10 text-center text-gray-400">ไม่พบเนื้อหานี้</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex text-[14.5px] text-gray-900">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10 max-w-6xl mx-auto">
          <button type="button" onClick={() => navigate(-1)} className="text-[14px] text-gray-500 hover:text-gray-800 flex items-center gap-1.5 mb-4 bg-transparent">
            <FaChevronLeft size={11} /> กลับ
          </button>

          <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-blue-50 text-blue-700 text-[13.5px] font-medium">📚 เนื้อหา</span>
              </div>
              <h1 className="page-title">{content.title}</h1>
              <div className="page-subtitle mt-1">
                {CURRENT_TEACHER.name}{content.created_at && ` · โพสต์เมื่อ ${formatDateTime(content.created_at)}`}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="text-[14.5px] font-semibold text-gray-900 mb-2">เนื้อหา</div>
              {content.body ? (
                <div className="text-[14.5px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content.body }} />
              ) : (
                <div className="text-[13.5px] text-gray-400">ไม่มีรายละเอียดเพิ่มเติม</div>
              )}
            </div>

            {files.length > 0 && (
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[14.5px] font-semibold text-gray-900 mb-2">ไฟล์แนบ</div>
                <div className="flex flex-col gap-1.5">
                  {files.map((f, i) => (
                    <a key={f.file_id ?? i} href={resolveFileUrl(API_BASE, f.file_path || f.file_url)} target="_blank" rel="noreferrer" className="text-[14px] text-blue-600 hover:underline inline-flex items-center gap-1.5">
                      <FaPaperclip size={11} /> {f.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

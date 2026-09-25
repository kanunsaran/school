import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import PageLoading from "../components/PageLoading.jsx";
import { FaPaperclip } from "react-icons/fa";
import { getContentById, getContentFiles, getClasses } from "../callapi/callapi_user.jsx";
import { resolveFileUrl } from "../utils/media.js";
import { API_BASE } from "../utils/feedShared.js";
import { gradeLabel } from "../utils/gradeLabel.js";

const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// เนื้อหาไม่มีแนวคิดการส่ง/ตรวจ เลยไม่มีการ์ดสรุป/รายชื่อนักเรียน/ตารางส่งงานเหมือน WorkDetail/QuestionDetail
export default function ContentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState(null);
  const [files, setFiles] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, f, classes] = await Promise.all([
          getContentById(id),
          getContentFiles(id).catch(() => []),
          getClasses().catch(() => []),
        ]);
        setContent(c);
        setFiles(f || []);
        setClassesList((classes || []).map((cl) => ({ ...cl, id: cl.id ?? cl.grade_id ?? cl.idgrade })));
      } catch (err) {
        console.error("โหลดเนื้อหาไม่สำเร็จ:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const visibleToLabel = (() => {
    if (!content?.class_ids || content.class_ids.length === 0) return "ทุกห้อง";
    const names = content.class_ids
      .map((cid) => classesList.find((c) => String(c.id) === String(cid)))
      .filter(Boolean)
      .map(gradeLabel);
    return names.length > 0 ? names.join(", ") : "ทุกห้อง";
  })();

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 px-8 pt-24 pb-10 max-w-4xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-[14px] text-gray-400 hover:text-gray-600 bg-transparent border-none p-0"
        >
          ‹ ย้อนกลับ
        </button>

        {loading ? (
          <PageLoading />
        ) : !content ? (
          <div className="mt-10 text-center text-red-500">ไม่พบเนื้อหานี้</div>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center h-7 px-3 rounded-full bg-blue-50 text-blue-700 text-[13.5px] font-medium shrink-0">
                📚 เนื้อหา
              </span>
            </div>
            <h1 className="page-title mt-2">{content.title}</h1>
            <div className="page-subtitle mt-1">
              {content.created_at && `โพสต์เมื่อ ${formatDateTime(content.created_at)}`}
            </div>
            <div className="mt-2 text-[13px] text-gray-400">มองเห็นได้: {visibleToLabel}</div>

            {content.body && (
              <div className="mt-6 rounded-2xl border border-gray-200 p-6 text-[15px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content.body }} />
            )}

            {files.length > 0 && (
              <div className="mt-6 rounded-2xl border border-gray-200 p-6">
                <div className="text-[14.5px] font-semibold text-gray-900 mb-3">ไฟล์แนบ</div>
                <div className="flex flex-col gap-2">
                  {files.map((f, i) => (
                    <a
                      key={f.file_id ?? i}
                      href={resolveFileUrl(API_BASE, f.file_path || f.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-blue-600 hover:underline"
                    >
                      <FaPaperclip className="text-blue-500 shrink-0" />
                      <span className="truncate">{f.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

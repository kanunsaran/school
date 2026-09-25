import { CATEGORY_BADGE, VISIBILITY_META, VISIBILITY_ICON, STATUS_META, STATUS_BADGE, portfolioFileIcon } from "../utils/portfolioStore.js";
import { API_BASE, formatRelativeTime } from "../utils/feedShared.js";
import { resolveFileUrl } from "../utils/media.js";

// การ์ดผลงานแบบเดียวกันทั้งฝั่งครูและฝั่งนักเรียน — ป้ายหมวดหมู่ 1 อัน + ไอคอนการมองเห็นเล็กๆ (แทนป้ายเต็ม) กันดูรกเกินไป
// showStatus ปิดได้ (ฝั่งนักเรียนไม่ต้องเห็นป้ายสถานะ "รอคำแนะนำ/ให้คำแนะนำแล้ว" บนการ์ด — ฝั่งครูยังเห็นตามปกติ)
export default function PortfolioCard({ work, student, gradeText, selected, onClick, showStatus = true }) {
  const firstFile = work.files?.[0];
  const cover = firstFile?.cover_url || (firstFile?.file_url ? resolveFileUrl(API_BASE, firstFile.file_url) : null);
  const statusMeta = showStatus ? STATUS_META[work.status] : null;
  const visMeta = VISIBILITY_META[work.visibility];
  const VisIcon = VISIBILITY_ICON[work.visibility];
  const Icon = portfolioFileIcon(firstFile, work);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border bg-white overflow-hidden transition ${
        selected ? "border-pink-400 ring-2 ring-pink-100" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="relative aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
        {cover ? <img src={cover} className="w-full h-full object-cover" /> : <Icon className="text-gray-300" size={24} />}
        {statusMeta && (
          <span className={`absolute top-2.5 left-2.5 inline-flex items-center justify-center h-6 px-2.5 rounded-full text-[10.5px] font-semibold ${STATUS_BADGE[statusMeta.color]}`}>
            {statusMeta.label}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold text-gray-900 truncate">{work.title}</div>
        <div className="text-[11.5px] text-gray-500 truncate mt-0.5">
          {student?.fullname || "ไม่ทราบชื่อ"}{gradeText ? ` · ${gradeText}` : ""}
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-medium ${CATEGORY_BADGE[work.category] || "bg-gray-100 text-gray-600"}`}>
            {work.category}
          </span>
          {VisIcon && visMeta && <VisIcon className="text-gray-400 shrink-0" size={11} title={visMeta.label} />}
        </div>
        <div className="text-[10.5px] text-gray-400 mt-2">
          {formatRelativeTime(work.created_at)}{work.files?.length > 1 ? ` · ${work.files.length} ไฟล์` : ""}
        </div>
      </div>
    </button>
  );
}

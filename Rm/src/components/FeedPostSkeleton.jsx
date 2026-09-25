// การ์ดโครงร่างเทา (shimmer) แสดงระหว่างโหลดฟีดข่าวสาร ทำให้หน้าดูเหมือนกำลังโหลดจริงแบบ Facebook
// แทนสปินเนอร์กลางจอเดิม — การ์ดแต่ละใบไล่เข้ามาจากขอบบนทีละใบ (delay ตาม index) ให้ดูเป็นธรรมชาติ
function SkeletonCard({ index = 0 }) {
  return (
    <div
      className="skeleton-card rounded-2xl border border-gray-100 bg-white p-5"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="skeleton-shimmer w-11 h-11 rounded-full shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="skeleton-shimmer h-3.5 w-32 rounded-full" />
          <div className="skeleton-shimmer h-3 w-20 rounded-full" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="skeleton-shimmer h-3.5 w-3/4 rounded-full" />
        <div className="skeleton-shimmer h-3.5 w-full rounded-full" />
        <div className="skeleton-shimmer h-3.5 w-2/3 rounded-full" />
      </div>
      <div className="skeleton-shimmer mt-4 h-40 w-full rounded-xl" />
    </div>
  );
}

export default function FeedPostSkeleton({ count = 3 }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
  );
}

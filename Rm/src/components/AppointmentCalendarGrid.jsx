import { formatThaiTimeLabel } from "../utils/feedShared.js";

// ตารางปฏิทินนัดหมาย (ใช้ทั้งหน้าปฏิทินครูและนักเรียน): 6 สัปดาห์เสมอ ช่องสูงคงที่,
// ใต้ตัวเลขวันแสดงหัวข้อนัดแรกเป็นแถบชมพู (ผ่านไปแล้ว = ชมพูจาง) + จำนวนที่เหลือ
// titleOf(appointment) => ข้อความที่แสดงในแถบ

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function AppointmentCalendarGrid({ viewDate, today, selectedDate, appointmentsByDate, titleOf, onSelectDate }) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(today);
  const selectedKey = toDateKey(selectedDate);

  // แสดง 6 สัปดาห์เสมอ (42 ช่อง) ให้ปฏิทินสูงเท่ากันทุกเดือน ไม่กระตุกตอนเปลี่ยนเดือน
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  return (
    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
      {cells.map((day, i) => {
        // ช่องว่างสูงเท่าช่องวันที่ เพื่อให้ความสูงคงที่
        if (day === null) return <div key={`blank-${i}`} className="h-14 sm:h-16" />;

        const cellDate = new Date(year, month, day);
        const key = toDateKey(cellDate);
        const isToday = key === todayKey;
        const isSelected = key === selectedKey;
        const list = appointmentsByDate[key] || [];
        const count = list.length;
        const isPast = key < todayKey;
        // หัวข้อนัดแรกของวัน (ไม่มีหัวข้อใช้ชื่อนักเรียน)
        const firstTitle = count ? titleOf(list[0]) : "";

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(cellDate)}
            title={count ? list.map((a) => `${formatThaiTimeLabel(a.time)} ${titleOf(a)}`).join("\n") : undefined}
            className={`h-14 sm:h-16 min-w-0 !p-0 rounded-lg flex flex-col items-center justify-center gap-1 text-[15px] transition
              ${
                isSelected
                  ? "bg-pink-500 text-white"
                  : isToday
                  ? "border border-pink-300 text-pink-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            <span className="leading-none">{day}</span>
            {count > 0 && (
              <span
                className={`w-full max-w-full truncate text-center px-0.5 sm:px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold leading-none ${
                  isSelected
                    ? "bg-white/25 text-white"
                    : isPast
                    ? "bg-pink-50 text-pink-400"
                    : "bg-pink-100 text-pink-700"
                }`}
              >
                {firstTitle}
                {count > 1 && ` +${count - 1}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

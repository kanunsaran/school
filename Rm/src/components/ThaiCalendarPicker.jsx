import { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// ปฏิทินไทยแบบ custom (กริดวัน + เดือนไทย + ปี พ.ศ.) แทนปฏิทินของเบราว์เซอร์ (native date picker) ที่โชว์ปี ค.ศ. เสมอ
export default function ThaiCalendarPicker({ value, onChange, min }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-11

  const minDate = min ? new Date(`${min}T00:00:00`) : null;

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const dateStr = (d) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isDisabled = (d) => minDate && new Date(viewYear, viewMonth, d) < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const isSelected = (d) => value === dateStr(d);
  const isToday = (d) => {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === d;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={goPrevMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 bg-transparent">
          <FaChevronLeft size={12} />
        </button>
        <div className="text-[14.5px] font-semibold text-gray-900">
          {THAI_MONTHS_FULL[viewMonth]} {viewYear + 543}
        </div>
        <button type="button" onClick={goNextMonth} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 bg-transparent">
          <FaChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11.5px] text-gray-400 mb-1">
        {THAI_WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={d}
              type="button"
              disabled={isDisabled(d)}
              onClick={() => onChange(dateStr(d))}
              className={`h-8 rounded-lg text-[13px] flex items-center justify-center ${
                isSelected(d)
                  ? "bg-pink-500 text-white font-semibold"
                  : isDisabled(d)
                    ? "bg-transparent text-gray-300 cursor-not-allowed"
                    : isToday(d)
                      ? "bg-transparent border border-pink-300 text-pink-600 font-medium hover:bg-pink-50"
                      : "bg-transparent text-gray-700 hover:bg-gray-100"
              }`}
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
}

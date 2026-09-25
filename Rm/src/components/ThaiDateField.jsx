import { useRef } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import { formatFullThaiDate, formatThaiDateTime } from "../utils/feedShared.js";

// ช่องเลือกวันที่ (หรือวันที่+เวลา) ที่โชว์ผลลัพธ์เป็นรูปแบบไทยจริง (ชื่อเดือนไทย + ปี พ.ศ.)
// แทนที่ <input type="date">/<input type="datetime-local"> เปล่าๆ ที่โชว์ปี ค.ศ. ตามเบราว์เซอร์
// ใช้ input เดิมซ่อนไว้เป็นตัวเปิด native picker จริง (คลิก/คีย์บอร์ดยังทำงานปกติ) ส่วนที่เห็นเป็นปุ่มโชว์ข้อความไทย
export default function ThaiDateField({
  value,
  onChange,
  type = "date", // "date" | "datetime-local"
  min,
  max,
  placeholder = "เลือกวันที่",
  disabled = false,
  dense = false, // true = h-10 text-[13.5px] ให้เข้าชุดกับฟอร์มที่ input อื่นเป็น h-10
  heightClass, // เผื่อ override ความสูงตรงๆ เมื่อ dense/ไม่ dense ยังไม่ตรงกับ input ข้างเคียง (เช่น h-11)
  bgClass = "bg-gray-50",
  widthClass = "w-full", // ใส่ "" เอาไว้ใช้แบบ inline ในแถบตัวกรอง (ไม่ยืดเต็มความกว้าง)
  radiusClass = "rounded-xl",
  borderClass = "border-gray-200",
  focusBorderClass = "focus:border-pink-400",
  className = "",
}) {
  const ref = useRef(null);

  const openPicker = () => {
    if (disabled) return;
    if (ref.current?.showPicker) ref.current.showPicker();
    else ref.current?.click();
  };

  const display = value ? (type === "datetime-local" ? formatThaiDateTime(value) : formatFullThaiDate(value)) : placeholder;
  const height = heightClass || (dense ? "h-10 px-3" : "h-12 px-4");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={openPicker}
      className={`relative ${widthClass} ${height} ${radiusClass} border ${borderClass} ${bgClass} flex items-center justify-between gap-2 text-left outline-none ${focusBorderClass} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span className={`whitespace-nowrap ${dense ? "text-[13.5px]" : "text-[16px]"} ${value ? "text-gray-900" : "text-gray-400"}`}>{display}</span>
      <FaRegCalendarAlt className="text-gray-400 shrink-0" size={dense ? 12 : 14} />
      <input
        ref={ref}
        type={type}
        value={value || ""}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </button>
  );
}

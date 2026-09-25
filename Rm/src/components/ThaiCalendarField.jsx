import { useEffect, useRef, useState } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import ThaiCalendarPicker from "./ThaiCalendarPicker.jsx";
import { formatFullThaiDate } from "../utils/feedShared.js";

// ปุ่มเลือกวันที่ที่คลิกแล้วเปิดปฏิทินไทยแบบ custom (ThaiCalendarPicker) ล้วนๆ ไม่พึ่ง <input type="date"> ของเบราว์เซอร์เลย
export default function ThaiCalendarField({
  value,
  onChange,
  min,
  placeholder = "เลือกวันที่",
  disabled = false,
  heightClass = "h-12",
  bgClass = "bg-gray-50",
  radiusClass = "rounded-xl",
  borderClass = "border-gray-200",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full ${heightClass} ${radiusClass} border ${borderClass} ${disabled ? "bg-gray-100" : bgClass} px-4 flex items-center justify-between text-left disabled:cursor-not-allowed`}
      >
        <span className={`text-[14.5px] ${value ? "text-gray-900" : "text-gray-400"}`}>{value ? formatFullThaiDate(value) : placeholder}</span>
        <FaRegCalendarAlt className="text-gray-400 shrink-0" size={14} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 mt-2 p-3 rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] z-50">
          <ThaiCalendarPicker
            value={value}
            min={min}
            onChange={(v) => {
              onChange(v);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

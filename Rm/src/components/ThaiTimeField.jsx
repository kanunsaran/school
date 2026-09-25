import { useEffect, useRef, useState } from "react";
import { FaRegClock } from "react-icons/fa";
import ThaiTimePicker from "./ThaiTimePicker.jsx";

// ช่องกรอกเวลาที่ทั้งพิมพ์เอง (เช่น "14:30") และคลิกเปิดนาฬิกาไทยแบบ custom เลือกได้ — โชว์ "น." ต่อท้ายเสมอ ไม่ใช่ AM/PM
export default function ThaiTimeField({
  value,
  onChange,
  min,
  placeholder = "เลือกเวลา",
  disabled = false,
  heightClass = "h-12",
  bgClass = "bg-gray-50",
  radiusClass = "rounded-xl",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value || "");
  const wrapRef = useRef(null);

  useEffect(() => {
    setText(value || "");
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const commit = (raw) => {
    const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const hh = Math.min(23, parseInt(m[1], 10));
      const mm = Math.min(59, parseInt(m[2], 10));
      const v = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      onChange(v);
      setText(v);
    } else {
      setText(value || "");
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <div className={`flex items-center ${heightClass} ${radiusClass} border border-gray-200 ${disabled ? "bg-gray-100" : bgClass}`}>
        <input
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(e.target.value);
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-full bg-transparent pl-4 outline-none text-[14.5px] text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        {text && <span className="text-[13px] text-gray-400 select-none pr-1">น.</span>}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className="pr-3 pl-1 text-gray-400 bg-transparent disabled:cursor-not-allowed"
        >
          <FaRegClock size={14} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 mt-2 p-3 rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] z-50">
          <ThaiTimePicker
            value={value}
            min={min}
            onChange={(v) => {
              onChange(v);
              setText(v);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

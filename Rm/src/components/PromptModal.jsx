import { useState } from "react";
import { FaTimes } from "react-icons/fa";

// ป๊อปอัพกรอกข้อความบรรทัดเดียวเล็กๆ ที่หน้าตาเข้าชุดกับโมดัลอื่นในแอป
// ใช้แทน Swal.fire({ input: "text" }) ที่ดูเป็นกล่องสี่เหลี่ยมทื่อๆ ไม่เข้าธีม — ใช้ร่วมกันได้ทุกจุดที่แค่ต้องการกรอกข้อความสั้นๆ 1 บรรทัด
// (แนบลิงก์, เพิ่มหมวดหมู่, เพิ่มหมายเหตุ ฯลฯ) ปรับ title/icon/label/placeholder/confirmLabel ตามบริบทที่ใช้
export default function PromptModal({
  title,
  icon: Icon,
  iconColorClass = "text-purple-500",
  label = "URL",
  placeholder = "วาง URL ที่นี่...",
  initialValue = "",
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  multiline = false,
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();

  const confirm = () => {
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] max-w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
            {Icon && <Icon className={iconColorClass} size={14} />} {title}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-transparent">
            <FaTimes size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">{label}</label>
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={4}
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14.5px] leading-relaxed outline-none focus:border-pink-400 resize-none"
            />
          ) : (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              placeholder={placeholder}
              autoFocus
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14.5px] outline-none focus:border-pink-400"
            />
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14px] font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!trimmed}
            className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14px] font-semibold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

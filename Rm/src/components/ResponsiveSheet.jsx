import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { isBelowXl } from "../utils/breakpoints.js";

// จอเล็กกว่า xl (1280px): แผงรายละเอียดเด้งขึ้นจากด้านล่างเป็นป๊อปอัพ (bottom sheet) อ่านง่ายบนมือถือ/ไอแพด
// จอ xl ขึ้นไป: แสดงในหน้าตามปกติ (คอลัมน์ขวา) — ใช้คู่กับ isBelowXl() ตอนกดเลือกรายการ

export default function ResponsiveSheet({ open, onClose, className = "", children }) {
  useEffect(() => {
    if (!open || !isBelowXl()) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {open && <div className="fixed inset-0 z-[55] bg-black/40 xl:hidden" onClick={onClose} />}
      <div
        className={`min-w-0 fixed inset-x-0 bottom-0 z-[60] max-h-[88vh] overflow-y-auto overscroll-contain bg-white rounded-t-3xl shadow-2xl px-4 sm:px-6 pb-8 transition-transform duration-300 xl:static xl:z-auto xl:max-h-none xl:overflow-visible xl:overscroll-auto xl:bg-transparent xl:rounded-none xl:shadow-none xl:p-0 xl:translate-none xl:transition-none ${
          open ? "translate-none" : "translate-y-full"
        } ${className}`}
      >
        {/* แถบจับ + ปุ่มปิด (เฉพาะแบบป๊อปอัพ) */}
        <div className="xl:hidden sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-1 mb-2 bg-white flex items-center justify-center">
          <span className="w-10 h-1.5 rounded-full bg-gray-300" />
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-3 top-1.5 w-9 h-9 rounded-full !p-0 bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center"
          >
            <FaTimes size={14} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

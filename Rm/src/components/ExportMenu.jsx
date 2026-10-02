import { useState } from "react";
import Swal from "sweetalert2";
import { FaDownload, FaFilePdf, FaFileExcel, FaChevronDown } from "react-icons/fa";

// ปุ่มส่งออกกลาง: เลือก PDF (อ่าน/พิมพ์) หรือ Excel (ทำงานต่อ) — onPdf/onExcel เป็น async
export default function ExportMenu({ label = "ดาวน์โหลดรายงาน", onPdf, onExcel, disabled, className = "", variant = "primary" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");

  const run = async (kind, fn) => {
    setOpen(false);
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      console.error(`ส่งออก ${kind} ไม่สำเร็จ:`, err);
      Swal.fire({ icon: "error", title: "สร้างไฟล์ไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setBusy("");
    }
  };

  const base =
    variant === "primary"
      ? "bg-pink-500 hover:bg-pink-600 text-white"
      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50";

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled || !!busy}
        onClick={() => setOpen((v) => !v)}
        className={`h-10 px-4 rounded-xl text-[14.5px] font-semibold flex items-center gap-2 disabled:opacity-60 ${base}`}
      >
        <FaDownload size={12} />
        {busy ? `กำลังสร้าง ${busy}...` : label}
        {!busy && <FaChevronDown size={10} className="opacity-70" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg p-1.5">
            {onPdf && (
              <button type="button" onClick={() => run("PDF", onPdf)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-pink-50 flex items-start gap-3 bg-white">
                <FaFilePdf className="text-red-500 mt-1 shrink-0" />
                <span>
                  <span className="block text-[14.5px] font-medium text-gray-900">PDF</span>
                  <span className="block text-[12.5px] text-gray-500">อ่านง่าย พร้อมพิมพ์</span>
                </span>
              </button>
            )}
            {onExcel && (
              <button type="button" onClick={() => run("Excel", onExcel)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-pink-50 flex items-start gap-3 bg-white">
                <FaFileExcel className="text-emerald-600 mt-1 shrink-0" />
                <span>
                  <span className="block text-[14.5px] font-medium text-gray-900">Excel (.xlsx)</span>
                  <span className="block text-[12.5px] text-gray-500">นำไปกรอง/คำนวณต่อ</span>
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

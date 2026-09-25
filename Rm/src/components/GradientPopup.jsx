import { FaTimes } from "react-icons/fa";

export default function GradientPopup({
  open,
  onClose,
  icon,
  title,
  subtitle,
  children,
  note,
  onSubmit,
  submitLabel = "บันทึก",
  submitIcon,
  submitDisabled = false,
  cancelLabel = "ยกเลิก",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-b from-pink-100 via-pink-50 to-white px-6 pt-8 pb-6 text-center rounded-t-3xl overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/70 hover:bg-white text-gray-500 hover:text-gray-700 flex items-center justify-center"
          >
            <FaTimes size={13} />
          </button>

          <span className="absolute left-9 top-9 text-pink-300 text-base select-none">✦</span>
          <span className="absolute right-16 top-7 text-pink-300 text-sm select-none">✦</span>
          <span className="absolute left-16 bottom-5 text-pink-200 text-sm select-none">✦</span>
          <span className="absolute right-10 bottom-8 text-pink-200 text-base select-none">✦</span>

          <div className="mx-auto w-16 h-16 rounded-full bg-white border-4 border-pink-50 shadow flex items-center justify-center relative z-10 text-pink-500 text-xl">
            {icon}
          </div>
          <div className="mt-4 text-[18px] font-bold text-gray-900">{title}</div>
          {subtitle && <div className="mt-1.5 text-[12.5px] text-gray-500 whitespace-pre-line leading-relaxed">{subtitle}</div>}
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {children}

          {note && (
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 text-blue-700 px-3.5 py-2.5 text-[11.5px] leading-relaxed">
              {note}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium hover:bg-gray-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 hover:brightness-105"
            >
              {submitLabel} {submitIcon}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComposerIconButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-3 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-[15px] text-gray-600 bg-transparent"
    >
      {icon} {label}
    </button>
  );
}

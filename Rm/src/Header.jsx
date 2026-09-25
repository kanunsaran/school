import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <div
      className="
      fixed top-0 left-0 right-0
      h-16
      bg-white/70 backdrop-blur-xl
      border-b border-gray-200/60
      flex items-center justify-between
      px-6 z-50
    "
    >
      {/* LOGO */}
      <div className="flex items-center cursor-pointer gap-3 h-full -ml-2">

        <img
          src="/image/logo2.jpeg"
          alt="School Logo"
          className="h-16 w-auto object-contain"
        />

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

        <FaBell className="text-gray-500 cursor-pointer hover:text-black transition" />

        <img
          onClick={() => navigate("/profile")}
          src="https://i.pravatar.cc/120?img=12"
          className="w-10 h-10 rounded-full cursor-pointer hover:scale-105 transition"
        />

      </div>
    </div>
  );
}
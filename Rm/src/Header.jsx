import { FaBars, FaChevronDown } from "react-icons/fa";
import NotificationBell from "./components/NotificationBell.jsx";
import { toggleSidebar, useHasSidebar } from "./utils/sidebarStore.js";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "./utils/auth.js";
import Avatar from "./components/Avatar.jsx";
import useCurrentUserProfile from "./hooks/useCurrentUserProfile.js";

export default function Header() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { avatarUrl } = useCurrentUserProfile();

  const hasSidebar = useHasSidebar();

  const goToProfile = () => navigate(user?.role === "teacher" ? "/TeacherProfile" : "/profile");

  return (
    <div
      className="
      fixed top-0 left-0 right-0
      h-16
      bg-white/70 backdrop-blur-xl
      border-b border-gray-200/60
      flex items-center justify-between
      px-3 sm:px-6 z-50
    "
    >
      {/* LOGO (+ ปุ่ม ☰ เปิดเมนูบนจอเล็ก) */}
      <div className="flex items-center cursor-pointer gap-1 sm:gap-3 h-full -ml-1 sm:-ml-2 min-w-0">
        {hasSidebar && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="เปิดเมนู"
            className="lg:hidden shrink-0 !p-2 !bg-transparent !border-0 text-gray-600 hover:text-black"
          >
            <FaBars size={22} />
          </button>
        )}

        <img
          src="/image/guidance-kkw-logo.png"
          alt="School Logo"
          className="h-24 sm:h-30 w-auto max-w-[55vw] sm:max-w-none object-contain"
        />

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">

        {user && <NotificationBell user={user} />}

        <button
          type="button"
          onClick={goToProfile}
          className="flex items-center gap-2.5 !p-0 bg-transparent rounded-full sm:pr-1 hover:opacity-90"
          title="โปรไฟล์ของฉัน"
        >
          <Avatar src={avatarUrl} name={user?.name} size={44} className="hover:scale-105 transition" />
          {user && (
            <span className="hidden md:flex flex-col items-start leading-tight text-left max-w-[160px]">
              <span className="text-[15px] font-bold text-gray-900 truncate max-w-full">{user.role === "teacher" ? `ครู${(user.name || "").replace(/^(คุณครู|ครู)\s*/, "").split(" ")[0]}` : (user.name || "").split(" ")[0]}</span>
              <span className="text-[12.5px] text-gray-500">{user.role === "teacher" ? "ครูแนะแนว" : "นักเรียน"}</span>
            </span>
          )}
          {user && <FaChevronDown size={11} className="hidden md:block text-gray-400" />}
        </button>

      </div>
    </div>
  );
}

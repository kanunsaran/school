import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "./utils/auth.js";
import Avatar from "./components/Avatar.jsx";
import useCurrentUserProfile from "./hooks/useCurrentUserProfile.js";

export default function Header() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { avatarUrl } = useCurrentUserProfile();

  const goToProfile = () => navigate(user?.role === "teacher" ? "/TeacherProfile" : "/profile");

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
          src="/image/guidance-kkw-logo.png"
          alt="School Logo"
          className="h-30 w-auto object-contain"
        />

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

        <FaBell size={20} className="text-gray-500 cursor-pointer hover:text-black transition" />

        <Avatar
          onClick={goToProfile}
          src={avatarUrl}
          name={user?.name}
          size={44}
          className="hover:scale-105 transition"
        />

      </div>
    </div>
  );
}

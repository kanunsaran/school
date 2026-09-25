import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaRegCalendarAlt,
  FaChevronDown,
  FaBookOpen,
  FaNewspaper,
  FaTasks,
  FaUserFriends,
  FaChartBar,
  FaClipboardCheck,
  FaUsers,
  FaBullseye,
  FaSignOutAlt,
  FaFolderOpen,
} from "react-icons/fa";

export default function SidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const groups = useMemo(
    () => ({
      activity: ["/post", "/image", "/about"],
      learning: ["/news", "/work", "/student", "/score", "/StudentPortfolio"],
      evaluation: ["/assessment"],
    }),
    []
  );

  const isInGroup = (key) => groups[key]?.includes(location.pathname);

  const [openMenu, setOpenMenu] = useState({
    activity: false,
    learning: false,
    evaluation: false,
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setOpenMenu((prev) => ({
      ...prev,
      activity: prev.activity || isInGroup("activity"),
      learning: prev.learning || isInGroup("learning"),
      evaluation: prev.evaluation || isInGroup("evaluation"),
    }));
  }, [location.pathname]);

  // 🎨 clean smooth
  const menuNormal =
    "flex items-center px-4 py-2.5 rounded-xl transition-colors duration-200";

  const menuWithArrow =
    "flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors duration-200";

  const mainInactive =
    "text-gray-400 hover:text-pink-600 hover:bg-pink-50";

  const mainActive =
    "bg-pink-50 text-pink-700 font-semibold";

  const subBase =
    "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-colors duration-200";

  const subInactive =
    "text-gray-400 hover:text-pink-600 hover:bg-pink-50";

  const subActive =
    "bg-pink-50 text-pink-700 font-semibold";

  const iconInactive = "text-gray-400";
  const iconActive = "text-pink-500";

  return (
    <>
      <aside className="w-[270px] bg-white border-r border-gray-200 min-h-screen pt-23">
        <nav className="px-3 pb-6 text-[14px] space-y-2">

          {/* Home */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaHome className={location.pathname === "/" ? iconActive : iconInactive} />
            <span className="ml-3">หน้าหลัก</span>
          </NavLink>

          {/* ===== กิจกรรม ===== */}
          <div>
            <div
              onClick={() => toggleMenu("activity")}
              className={`${menuWithArrow} ${
                isInGroup("activity") ? mainActive : mainInactive
              }`}
            >
              <div className="flex items-center gap-3">
                <FaRegCalendarAlt className={isInGroup("activity") ? iconActive : iconInactive} />
                <span className="font-medium">กิจกรรม</span>
              </div>

              <FaChevronDown
                className={`text-[11px] transition-transform duration-200 ${
                  openMenu.activity ? "rotate-180" : ""
                } ${isInGroup("activity") ? "text-pink-500" : "text-gray-400"}`}
              />
            </div>

            {openMenu.activity && (
              <div className="ml-4 pl-4 border-l border-gray-100 mt-1 space-y-1">
                <NavLink to="/post" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaNewspaper className={location.pathname === "/post" ? iconActive : iconInactive} />
                  โพสต์
                </NavLink>

                <NavLink to="/image" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaTasks className={location.pathname === "/image" ? iconActive : iconInactive} />
                  รูปภาพ
                </NavLink>

                <NavLink to="/about" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaUserFriends className={location.pathname === "/about" ? iconActive : iconInactive} />
                  เกี่ยวกับ
                </NavLink>
              </div>
            )}
          </div>

          {/* ===== สื่อการเรียนรู้ ===== */}
          <div>
            <div
              onClick={() => toggleMenu("learning")}
              className={`${menuWithArrow} ${
                isInGroup("learning") ? mainActive : mainInactive
              }`}
            >
              <div className="flex items-center gap-3">
                <FaBookOpen className={isInGroup("learning") ? iconActive : iconInactive} />
                <span className="font-medium">สื่อการเรียนรู้</span>
              </div>

              <FaChevronDown
                className={`text-[11px] transition-transform duration-200 ${
                  openMenu.learning ? "rotate-180" : ""
                } ${isInGroup("learning") ? "text-pink-500" : "text-gray-400"}`}
              />
            </div>

            {openMenu.learning && (
              <div className="ml-4 pl-4 border-l border-gray-100 mt-1 space-y-1">
                <NavLink to="/studentNews" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaNewspaper className={location.pathname === "/studentNews" ? iconActive : iconInactive} />
                  ข่าวสาร
                </NavLink>

                <NavLink to="/classwork" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaTasks className={location.pathname === "/classwork" ? iconActive : iconInactive} />
                  งานในชั้นเรียน
                </NavLink>

                <NavLink to="/studentclassmates" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaUserFriends className={location.pathname === "/studentclassmates" ? iconActive : iconInactive} />
                  รายชื่อ
                </NavLink>

                {/* <NavLink to="/score" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaChartBar className={location.pathname === "/score" ? iconActive : iconInactive} />
                  คะแนน
                </NavLink> */}

                <NavLink to="/StudentPortfolio" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaFolderOpen className={location.pathname === "/StudentPortfolio" ? iconActive : iconInactive} />
                  แฟ้มสะสมผลงาน
                </NavLink>
              </div>
            )}
          </div>

          {/* ===== แบบประเมิน ===== */}
          <div>
            <div
              onClick={() => toggleMenu("evaluation")}
              className={`${menuWithArrow} ${
                isInGroup("evaluation") ? mainActive : mainInactive
              }`}
            >
              <div className="flex items-center gap-3">
                <FaClipboardCheck className={isInGroup("evaluation") ? iconActive : iconInactive} />
                <span className="font-medium">แบบประเมิน</span>
              </div>

              <FaChevronDown
                className={`text-[11px] transition-transform duration-200 ${
                  openMenu.evaluation ? "rotate-180" : ""
                } ${isInGroup("evaluation") ? "text-pink-500" : "text-gray-400"}`}
              />
            </div>

            {openMenu.evaluation && (
              <div className="ml-4 pl-4 border-l border-gray-100 mt-1 space-y-1">
                <NavLink to="/aptitudeIntro" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaClipboardCheck className={location.pathname === "/aptitudeIntro" ? iconActive : iconInactive} />
                  แบบประเมินทั้งหมด
                </NavLink>
              </div>
            )}
          </div>

          {/* ชุมนุม */}
          <NavLink
            to="/studentsommunity"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaUsers className={location.pathname === "/studentsommunity" ? iconActive : iconInactive} />
            <span className="ml-3">ชุมนุม (YC)</span>
          </NavLink>

          {/* เป้าหมาย */}
          <NavLink
            to="/studentgoal"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaBullseye className={location.pathname === "/studentgoal" ? iconActive : iconInactive} />
            <span className="ml-3">เป้าหมายของนักเรียน</span>
          </NavLink>

          {/* Logout */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full text-left flex items-center px-4 py-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
          >
            <FaSignOutAlt />
            <span className="ml-3">ออกจากระบบ</span>
          </button>

        </nav>
      </aside>

      {/* ===== Modal ===== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          
          {/* background blur */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLogoutModal(false)}
          />

          {/* modal box */}
          <div className="relative bg-white rounded-2xl shadow-xl w-[320px] p-5 animate-fadeIn">
            <h2 className="text-[16px] font-semibold text-gray-800">
              ออกจากระบบ
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              คุณต้องการออกจากระบบจริงหรือไม่?
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                ยกเลิก
              </button>

              <button style={{backgroundColor: "white"}}
                onClick={() => navigate("/login")}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
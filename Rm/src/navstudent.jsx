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
  FaCommentDots,
} from "react-icons/fa";
import { getEnrollments, getClasses } from "./callapi/callapi_user.jsx";
import { getCurrentUser } from "./utils/auth.js";
import { gradeLabel } from "./utils/gradeLabel.js";

const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? "1";

export default function SidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const groups = useMemo(
    () => ({
      activity: ["/post", "/studentimage", "/about"],
      evaluation: ["/aptitudeIntro", "/aptitudetest", "/result"],
    }),
    []
  );

  const isInGroup = (key) =>
    groups[key]?.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  // /studentworkdetail ไม่มี gradeId ใน URL (เข้าจากแท็บ "งานของฉัน" ในห้องเรียน) แต่ยังอยากให้เมนู "ห้องเรียนของฉัน" ค้างไฮไลต์อยู่ ไม่หลุด
  const isInClassrooms = location.pathname.startsWith("/studentclassroom") || location.pathname.startsWith("/studentworkdetail");

  const [openMenu, setOpenMenu] = useState({
    activity: false,
    evaluation: false,
    classrooms: false,
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setOpenMenu((prev) => ({
      ...prev,
      activity: prev.activity || isInGroup("activity"),
      evaluation: prev.evaluation || isInGroup("evaluation"),
      classrooms: prev.classrooms || isInClassrooms,
    }));
  }, [location.pathname]);

  // ห้องเรียนที่นักเรียนคนนี้เข้าร่วมอยู่จริง (กรอกรหัสเข้าห้องได้หลายห้อง ไม่ใช่ห้องเดียวตายตัว) ใช้ทำเมนูย่อยใต้ "ห้องเรียนของฉัน"
  const [myClassrooms, setMyClassrooms] = useState([]);
  useEffect(() => {
    Promise.all([getEnrollments().catch(() => []), getClasses().catch(() => [])])
      .then(([enrollData, gradeData]) => {
        const gradesById = new Map((gradeData || []).map((g) => [String(g.idgrade), g]));
        const myGradeIds = (enrollData || [])
          .filter((e) => String(e.user_user_id) === String(CURRENT_STUDENT_ID))
          .map((e) => String(e.grade_idgrade));
        setMyClassrooms(
          myGradeIds
            .map((gid) => {
              const g = gradesById.get(gid);
              return g ? { id: gid, label: gradeLabel(g) } : null;
            })
            .filter(Boolean)
        );
      })
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนของฉันไม่สำเร็จ:", err));
  }, []);

  // 🎨 clean smooth
  const menuNormal =
    "flex items-center px-4 py-2.5 rounded-xl transition-colors duration-200";

  const menuWithArrow =
    "flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors duration-200";

  const mainInactive =
    "text-gray-900 hover:text-pink-600 hover:bg-pink-50";

  const mainActive =
    "bg-pink-50 text-pink-700 font-semibold";

  const subBase =
    "flex items-center gap-3 px-3 py-2 rounded-xl text-[15px] transition-colors duration-200";

  const subInactive =
    "text-gray-900 hover:text-pink-600 hover:bg-pink-50";

  const subActive =
    "bg-pink-50 text-pink-700 font-semibold";

  const iconInactive = "text-gray-500";
  const iconActive = "text-pink-500";

  return (
    <>
      <aside className="w-[270px] shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto pt-23">
        <nav className="px-3 pb-6 text-[17px] space-y-2">

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
                className={`text-[13px] transition-transform duration-200 ${
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

                <NavLink to="/studentimage" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaTasks className={location.pathname.startsWith("/studentimage") ? iconActive : iconInactive} />
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

          {/* ===== ห้องเรียนของฉัน — เข้าได้หลายห้องผ่านรหัสของครูแต่ละห้อง เมนูย่อยเลยเป็นรายชื่อห้องที่เข้าอยู่จริง ===== */}
          <div>
            <div
              onClick={() => toggleMenu("classrooms")}
              className={`${menuWithArrow} ${isInClassrooms ? mainActive : mainInactive}`}
            >
              <div className="flex items-center gap-3">
                <FaBookOpen className={isInClassrooms ? iconActive : iconInactive} />
                <span className="font-medium">ห้องเรียนของฉัน</span>
              </div>

              <FaChevronDown
                className={`text-[13px] transition-transform duration-200 ${
                  openMenu.classrooms ? "rotate-180" : ""
                } ${isInClassrooms ? "text-pink-500" : "text-gray-400"}`}
              />
            </div>

            {openMenu.classrooms && (
              <div className="ml-4 pl-4 border-l border-gray-100 mt-1 space-y-1">
                {myClassrooms.length === 0 && (
                  <div className="px-3 py-2 text-[14px] text-gray-400">ยังไม่ได้เข้าร่วมห้องเรียน</div>
                )}
                {myClassrooms.map((c) => (
                  <NavLink
                    key={c.id}
                    to={`/studentclassroom/${c.id}`}
                    className={({ isActive }) => `${subBase} ${isActive ? subActive : subInactive}`}
                  >
                    <FaBookOpen className={location.pathname.startsWith(`/studentclassroom/${c.id}`) ? iconActive : iconInactive} />
                    {c.label}
                  </NavLink>
                ))}
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
                className={`text-[13px] transition-transform duration-200 ${
                  openMenu.evaluation ? "rotate-180" : ""
                } ${isInGroup("evaluation") ? "text-pink-500" : "text-gray-400"}`}
              />
            </div>

            {openMenu.evaluation && (
              <div className="ml-4 pl-4 border-l border-gray-100 mt-1 space-y-1">
                <NavLink to="/aptitudeIntro" className={`${subBase} ${isInGroup("evaluation") ? subActive : subInactive}`}>
                  <FaClipboardCheck className={isInGroup("evaluation") ? iconActive : iconInactive} />
                  แบบประเมินทั้งหมด
                </NavLink>
              </div>
            )}
          </div>

          {/* แฟ้มสะสมผลงาน */}
          <NavLink
            to="/StudentPortfolio"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaFolderOpen className={location.pathname === "/StudentPortfolio" ? iconActive : iconInactive} />
            <span className="ml-3">แฟ้มสะสมผลงาน</span>
          </NavLink>

          {/* ชุมนุม — active ทั้งหน้ารายการและหน้ารายละเอียดโพสต์ (/studentyc/:id) */}
          <NavLink
            to="/studentsommunity"
            className={
              `${menuNormal} ${location.pathname === "/studentsommunity" || location.pathname.startsWith("/studentyc") ? mainActive : mainInactive}`
            }
          >
            <FaUsers className={location.pathname === "/studentsommunity" || location.pathname.startsWith("/studentyc") ? iconActive : iconInactive} />
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

          {/* คำขอปรึกษา */}
          <NavLink
            to="/studentconsultations"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaCommentDots className={location.pathname === "/studentconsultations" ? iconActive : iconInactive} />
            <span className="ml-3">คำขอปรึกษา</span>
          </NavLink>

          {/* Logout */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full text-left flex items-center px-4 py-2.5 rounded-xl text-gray-900 hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
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
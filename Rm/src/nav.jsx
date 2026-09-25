
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaRegCalendarAlt,
  FaChevronDown,
  FaNewspaper,
  FaTasks,
  FaUserFriends,
  FaUsers,
  FaSignOutAlt,
  FaChalkboardTeacher,
  FaFolderOpen,
  FaClipboardCheck,
  FaChartBar,
  FaListUl,
  FaCommentDots,
} from "react-icons/fa";
import { getClasses, getAssignmentClasses } from "./callapi/callapi_user.jsx";

const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

// เช็คว่า pathname อยู่ในห้องเรียนนี้ไหม (รวมทุกแท็บ เช่น /classroom/1/work) โดยไม่ชนกับห้องอื่นที่ id ขึ้นต้นเหมือนกัน เช่น 1 กับ 12
const isCurrentClassroom = (pathname, id) =>
  pathname === `/classroom/${id}` || pathname.startsWith(`/classroom/${id}/`);

export default function SidebarNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState([]);

  useEffect(() => {
    getClasses()
      .then((data) => {
        const list = (data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        setClassrooms(list);
      })
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนไม่สำเร็จ:", err));
  }, []);

  // เข้าดูรายละเอียดงาน (/work/:id) แบบแยกหน้า (ไม่ได้อยู่ใต้ /classroom/:id) — หาว่างานนี้ผูกกับห้องไหน
  // เพื่อไฮไลต์เมนู "ห้องเรียนของฉัน" กับห้องนั้นให้ถูกต้อง ไม่งั้นเมนูจะไม่บอกว่าตอนนี้อยู่ห้องไหน
  const workDetailAssId = location.pathname.match(/^\/work\/(\d+)$/)?.[1] || null;
  const [linkedGradeId, setLinkedGradeId] = useState(null);

  useEffect(() => {
    if (!workDetailAssId) {
      setLinkedGradeId(null);
      return;
    }
    getAssignmentClasses({ ass_id: workDetailAssId })
      .then((rows) => setLinkedGradeId(rows?.[0]?.grade_id ?? null))
      .catch(() => setLinkedGradeId(null));
  }, [workDetailAssId]);

  const groups = useMemo(
    () => ({
      activity: ["/newsfeed", "/image", "/about"],
    }),
    []
  );

  const isInGroup = (key) => {
    if (key === "classrooms") return location.pathname.startsWith("/classroom") || !!workDetailAssId;
    if (key === "assessment") return location.pathname.startsWith("/assessments");
    return groups[key]?.includes(location.pathname);
  };

  const [openMenu, setOpenMenu] = useState({
    activity: false,
    classrooms: false,
    assessment: false,
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setOpenMenu((prev) => ({
      ...prev,
      activity: prev.activity || isInGroup("activity"),
      classrooms: prev.classrooms || isInGroup("classrooms"),
      assessment: prev.assessment || isInGroup("assessment"),
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

<NavLink
  to="/TeacherDashboard"
  className={({ isActive }) =>
    `${menuNormal} ${isActive ? mainActive : mainInactive}`
  }
>
  <FaHome
    className={
      location.pathname === "/TeacherDashboard"
        ? iconActive
        : iconInactive
    }
  />
  <span className="ml-3">หน้าหลัก</span>
</NavLink>

<NavLink
  to="/TeacherCalendar"
  className={({ isActive }) =>
    `${menuNormal} ${isActive ? mainActive : mainInactive}`
  }
>
  <FaRegCalendarAlt
    className={
      location.pathname === "/TeacherCalendar"
        ? iconActive
        : iconInactive
    }
  />
  <span className="ml-3">ปฏิทิน</span>
</NavLink>

          {/* ห้องเรียน
          <NavLink
            to="/classroom"
            className={({ isActive }) =>
              `${menuNormal} ${isActive || location.pathname.startsWith("/classroom") ? mainActive : mainInactive}`
            }
          >
            <FaChalkboardTeacher className={location.pathname.startsWith("/classroom") ? iconActive : iconInactive} />
            <span className="ml-3">ห้องเรียน</span>
          </NavLink> */}

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
                <NavLink to="/newsfeed" className={({ isActive }) =>
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

          {/* ===== ห้องเรียนของฉัน ===== */}
          <div>
            <div
              onClick={() => toggleMenu("classrooms")}
              className={`${menuWithArrow} ${
                isInGroup("classrooms") ? mainActive : mainInactive
              }`}
            >
              <div className="flex items-center gap-3">
                <FaChalkboardTeacher className={isInGroup("classrooms") ? iconActive : iconInactive} />
                <span className="font-medium">ห้องเรียนของฉัน</span>
              </div>

              <FaChevronDown
                className={`text-[11px] transition-transform duration-200 ${
                  openMenu.classrooms ? "rotate-180" : ""
                } ${isInGroup("classrooms") ? "text-pink-500" : "text-gray-400"}`}
              />
            </div>

            {openMenu.classrooms && (
              <div className="ml-4 pl-4 border-l border-gray-100 mt-1 space-y-1">
                {classrooms.length === 0 && (
                  <div className="px-3 py-2 text-[12.5px] text-gray-400">ไม่พบห้องเรียน</div>
                )}
                {classrooms.map((c) => {
                  const roomIsActive =
                    isCurrentClassroom(location.pathname, c.id) ||
                    (linkedGradeId != null && String(linkedGradeId) === String(c.id));
                  return (
                    <Link
                      key={c.id}
                      to={`/classroom/${c.id}`}
                      className={`${subBase} ${roomIsActive ? subActive : subInactive}`}
                    >
                      <FaNewspaper className={roomIsActive ? iconActive : iconInactive} />
                      {gradeLabel(c)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== แบบประเมิน ===== */}
          <div>
            <div
              onClick={() => toggleMenu("assessment")}
              className={`${menuWithArrow} ${
                isInGroup("assessment") ? mainActive : mainInactive
              }`}
            >
              <div className="flex items-center gap-3">
                <FaClipboardCheck className={isInGroup("assessment") ? iconActive : iconInactive} />
                <span className="font-medium">แบบประเมิน</span>
              </div>

              <FaChevronDown
                className={`text-[11px] transition-transform duration-200 ${
                  openMenu.assessment ? "rotate-180" : ""
                } ${isInGroup("assessment") ? "text-pink-500" : "text-gray-400"}`}
              />
            </div>

            {openMenu.assessment && (
              <div className="ml-4 pl-4 border-l border-gray-100 mt-1 space-y-1">
                <NavLink to="/assessments" end className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaListUl className={location.pathname === "/assessments" ? iconActive : iconInactive} />
                  แบบประเมินทั้งหมด
                </NavLink>

                <NavLink to="/assessments/results" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaChartBar className={location.pathname === "/assessments/results" ? iconActive : iconInactive} />
                  ผลการประเมิน
                </NavLink>

                <NavLink to="/assessments/stats" className={({ isActive }) =>
                  `${subBase} ${isActive ? subActive : subInactive}`}>
                  <FaChartBar className={location.pathname === "/assessments/stats" ? iconActive : iconInactive} />
                  สถิติ
                </NavLink>
              </div>
            )}
          </div>

          {/* คำขอปรึกษา */}
          <NavLink
            to="/consultations"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaCommentDots className={location.pathname === "/consultations" ? iconActive : iconInactive} />
            <span className="ml-3">คำขอปรึกษา</span>
          </NavLink>

          {/* แฟ้มสะสมผลงาน */}
          <NavLink
            to="/portfolio"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaFolderOpen className={location.pathname === "/portfolio" ? iconActive : iconInactive} />
            <span className="ml-3">แฟ้มสะสมผลงาน</span>
          </NavLink>

          {/* ชุมนุม */}
          <NavLink
            to="/YC/"
            className={({ isActive }) =>
              `${menuNormal} ${isActive ? mainActive : mainInactive}`
            }
          >
            <FaUsers className={location.pathname === "/YC/" ? iconActive : iconInactive} />
            <span className="ml-3">ชุมนุม (YC)</span>
          </NavLink>

          {/* Logout */}
          <button style={{backgroundColor: "white"}}
            onClick={() => setShowLogoutModal(true)}
            className="w-full text-left flex items-center px-4 py-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 "
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

              <button
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

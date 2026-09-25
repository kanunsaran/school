import { useEffect, useState } from "react";
import { useParams, NavLink, Outlet } from "react-router-dom";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { FaCog, FaUsers, FaPhoneAlt, FaNewspaper, FaTasks, FaUserFriends, FaCalendarCheck } from "react-icons/fa";
import { getClasses, getStudent, getEnrollments } from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";

const DEFAULT_BANNER_COLOR = "#db2777"; // pink-600 เหมือนโทนของ /newsfeed

const TABS = [
  { to: "", label: "ข่าวสาร", end: true, icon: FaNewspaper },
  { to: "work", label: "งานในชั้นเรียน", icon: FaTasks },
  { to: "attendance", label: "เช็คชื่อ", icon: FaCalendarCheck },
  { to: "students", label: "นักเรียน", icon: FaUserFriends },
];

// เชลล์กลางของหน้าห้องเรียน — แบนเนอร์ + แถบแท็บ ใช้ nested route จริง (ไม่ใช่ state)
// เพื่อให้แต่ละแท็บมี URL ของตัวเอง กด back/forward ได้ รีเฟรชแล้วอยู่แท็บเดิม และเมนูข้างไฮไลต์ถูกห้องเสมอ
export default function ClassroomShell() {
  const { gradeId } = useParams();

  const [classInfo, setClassInfo] = useState(null);
  const [members, setMembers] = useState([]);

  // ตั้งค่าแบนเนอร์ได้เอง — ใส่รูป/เปลี่ยนรูป/ใช้สีพื้นแทนก็ได้ (เก็บแค่ใน state ของเครื่อง ยังไม่ persist ไป backend)
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerColor, setBannerColor] = useState(DEFAULT_BANNER_COLOR);
  const [openBannerSetting, setOpenBannerSetting] = useState(false);

  useEffect(() => {
    getClasses()
      .then((data) => {
        const list = (data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        setClassInfo(list.find((c) => String(c.id) === String(gradeId)) || null);
      })
      .catch((err) => console.error("โหลดข้อมูลห้องเรียนไม่สำเร็จ:", err));
  }, [gradeId]);

  // ===== สมาชิกในห้อง — รายชื่อนักเรียนจริงที่ enroll ห้องนี้ (ใช้ทั้งแบนเนอร์ + แท็บข่าวสาร) =====
  useEffect(() => {
    Promise.all([getStudent(), getEnrollments()])
      .then(([studentData, enrollData]) => {
        const enrolledIds = new Set(
          (enrollData || []).filter((e) => String(e.grade_idgrade) === String(gradeId)).map((e) => String(e.user_user_id))
        );
        setMembers((studentData || []).filter((s) => enrolledIds.has(String(s.user_id))));
      })
      .catch((err) => console.error("โหลดสมาชิกในห้องไม่สำเร็จ:", err));
  }, [gradeId]);

  const handleBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (file) setBannerImage(URL.createObjectURL(file));
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
        {/* Banner — โทนชมพูเดียวกับ /newsfeed เป็นค่าเริ่มต้น เปลี่ยนรูป/สีเองได้ */}
        <section className="relative rounded-3xl overflow-hidden shadow-md mb-6" style={{ backgroundColor: bannerColor }}>
          {bannerImage && <img src={bannerImage} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/0" />

          <div className="relative h-[140px] flex items-end p-8">
            <button
              type="button"
              onClick={() => setOpenBannerSetting(true)}
              className="absolute right-6 top-6 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
              title="ตั้งค่าแบนเนอร์"
            >
              <FaCog size={14} />
            </button>

            <div className="text-white">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {classInfo ? `ห้อง ${gradeLabel(classInfo)}` : "ห้องเรียน"}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-[13px] text-white/85 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <FaUsers size={12} /> นักเรียน {members.length} คน
                </span>
                {classInfo?.teacher_name && (
                  <span className="flex items-center gap-1.5">
                    <FaPhoneAlt size={11} /> {classInfo.teacher_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Tab bar — nested route จริง กด NavLink แล้ว URL เปลี่ยนตาม ===== */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map((t) => (
              <NavLink
                key={t.label}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap border-b-2 -mb-px bg-transparent transition ${
                    isActive ? "border-pink-600 text-pink-700" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`
                }
              >
                <t.icon size={13} />
                {t.label}
              </NavLink>
            ))}
          </div>
        </div>

        <Outlet context={{ classInfo, gradeId, members }} />
      </main>

      {/* Modal ตั้งค่าแบนเนอร์ */}
      {openBannerSetting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[380px] p-6 shadow-xl">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-4">ตั้งค่าแบนเนอร์</h2>

            <div className="mb-4">
              <div className="text-[13px] mb-2 text-gray-600">เปลี่ยนรูปพื้นหลัง</div>
              <input type="file" accept="image/*" onChange={handleBannerFile} className="text-[13px]" />
              {bannerImage && (
                <button
                  type="button"
                  onClick={() => setBannerImage(null)}
                  className="mt-2 text-[12.5px] text-red-500 hover:underline bg-transparent"
                >
                  ลบรูป ใช้สีพื้นแทน
                </button>
              )}
            </div>

            <div className="mb-6">
              <div className="text-[13px] mb-2 text-gray-600">เปลี่ยนสีพื้นหลัง</div>
              <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenBannerSetting(false)}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 bg-white"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

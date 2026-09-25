import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useParams } from "react-router-dom";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import PageLoading from "../../components/PageLoading.jsx";
import { FaUsers, FaNewspaper, FaTasks, FaUserFriends } from "react-icons/fa";
import { getClasses, getStudent, getEnrollments } from "../../callapi/callapi_user.jsx";
import { gradeLabel } from "../../utils/gradeLabel.js";
import { getCurrentUser } from "../../utils/auth.js";

// ใช้ user จาก session จริงหลัง login (เดิม hardcode "1" ทำให้บัญชีอื่นเห็นห้องเรียนผิดคน — บั๊กเดียวกับที่เจอใน StudentInfoForm.jsx/Classwork.jsx)
const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? "1";

const BANNER_COLOR = "#ec4899";

const TABS = [
  { to: "", label: "ข่าวสาร", end: true, icon: FaNewspaper },
  { to: "work", label: "งานของฉัน", icon: FaTasks },
  { to: "classmates", label: "เพื่อนร่วมชั้น", icon: FaUserFriends },
];

// เข้า /studentclassroom เฉยๆ (ไม่ระบุห้อง) — พาไปห้องแรกที่นักเรียนคนนี้เข้าร่วมอยู่จริง (ตอนนี้เข้าได้หลายห้องผ่านรหัสของครู)
export function StudentClassroomRedirect() {
  const [target, setTarget] = useState(undefined); // undefined = กำลังโหลด, null = ไม่มีห้องเลย

  useEffect(() => {
    getEnrollments()
      .then((enrollData) => {
        const mine = (enrollData || []).filter((e) => String(e.user_user_id) === String(CURRENT_STUDENT_ID));
        setTarget(mine[0]?.grade_idgrade ?? null);
      })
      .catch(() => setTarget(null));
  }, []);

  if (target === undefined) return <PageLoading />;
  if (target === null) return <div className="p-10 text-center text-gray-400">ยังไม่ได้เข้าร่วมห้องเรียนใด — กรอกรหัสเข้าชั้นเรียนที่หน้าแรกก่อน</div>;
  return <Navigate to={`/studentclassroom/${target}`} replace />;
}

// เชลล์ห้องเรียนของนักเรียน — แบนเนอร์ + แถบแท็บบน เหมือนหน้า /classroom/:id ของครู
// รับ gradeId จาก URL เพราะนักเรียนคนหนึ่งเข้าได้หลายห้อง (กรอกรหัสครูของแต่ละห้อง) ไม่ใช่ห้องเดียวตายตัวเหมือนเดิม
export default function StudentClassroomShell() {
  const { gradeId } = useParams();
  const [classInfo, setClassInfo] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!gradeId) return;
    Promise.all([getEnrollments(), getClasses(), getStudent()])
      .then(([enrollData, gradeData, studentData]) => {
        const list = (gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        setClassInfo(list.find((c) => String(c.id) === String(gradeId)) || null);

        const enrolledIds = new Set(
          (enrollData || []).filter((e) => String(e.grade_idgrade) === String(gradeId)).map((e) => String(e.user_user_id))
        );
        setMembers((studentData || []).filter((s) => enrolledIds.has(String(s.user_id))));
      })
      .catch((err) => console.error("โหลดข้อมูลห้องเรียนไม่สำเร็จ:", err));
  }, [gradeId]);

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
        {/* Banner */}
        <section className="relative rounded-3xl overflow-hidden shadow-md mb-6" style={{ backgroundColor: BANNER_COLOR }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/0" />
          <div className="relative h-[140px] flex items-end p-8">
            <div className="text-white">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {classInfo ? `ห้อง ${gradeLabel(classInfo)}` : "ห้องเรียนของฉัน"}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-[15px] text-white/85 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <FaUsers size={12} /> นักเรียน {members.length} คน
                </span>
                {classInfo?.teacher_name && (
                  <span className="flex items-center gap-1.5">
                    ครูที่ปรึกษา {classInfo.teacher_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Tab bar */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map((t) => (
              <NavLink
                key={t.label}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-[16px] font-medium whitespace-nowrap border-b-2 -mb-px bg-transparent transition ${
                    isActive ? "border-pink-500 text-pink-700" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`
                }
              >
                <t.icon size={15} />
                {t.label}
              </NavLink>
            ))}
          </div>
        </div>

        <Outlet context={{ classInfo, gradeId, members }} />
      </main>
    </div>
  );
}

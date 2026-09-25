import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { FaChalkboardTeacher, FaChevronRight } from "react-icons/fa";
import { getClasses } from "../callapi/callapi_user.jsx";

const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

export default function ClassroomListPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClasses()
      .then((data) => {
        const list = (data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        setClasses(list);
      })
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนไม่สำเร็จ:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50 flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">🏫 ห้องเรียน</h1>
        <p className="text-gray-500 mb-6">เลือกห้องเรียนเพื่อดูฟีดประกาศ งาน และไฟล์ของห้องนั้น</p>

        {loading && <div className="text-gray-400">กำลังโหลด...</div>}

        {!loading && classes.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
            ยังไม่มีห้องเรียนในระบบ
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/classroom/${c.id}`)}
              className="text-left rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md hover:border-pink-200 transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                <FaChalkboardTeacher size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">{gradeLabel(c)}</div>
                <div className="text-[12.5px] text-gray-400 truncate">
                  {c.teacher_name ? `ครูที่ปรึกษา ${c.teacher_name}` : "ยังไม่ระบุครูที่ปรึกษา"}
                </div>
              </div>
              <FaChevronRight className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

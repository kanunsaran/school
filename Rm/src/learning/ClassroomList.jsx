import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { FaChalkboardTeacher, FaChevronRight, FaCopy, FaTrash } from "react-icons/fa";
import { getClasses, deleteClass } from "../callapi/callapi_user.jsx";
import PageLoading from "../components/PageLoading.jsx";

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

  const copyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    Swal.fire({ icon: "success", title: "คัดลอกรหัสแล้ว", timer: 1000, showConfirmButton: false });
  };

  const handleDelete = async (e, c) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: `ลบห้อง ${gradeLabel(c)}?`,
      text: "ลบแล้วกู้คืนไม่ได้ นักเรียนในห้องนี้จะหลุดออกจากห้องด้วย",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบห้องเรียน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteClass(c.id);
      setClasses((prev) => prev.filter((x) => x.id !== c.id));
      Swal.fire({ icon: "success", title: "ลบห้องเรียนแล้ว", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("ลบห้องเรียนไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "ลบห้องเรียนไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
        <h1 className="page-title mb-1">🏫 ห้องเรียน</h1>
        <p className="page-subtitle mb-6">เลือกห้องเรียนเพื่อดูฟีดประกาศ งาน และไฟล์ของห้องนั้น</p>

        {loading && <PageLoading />}

        {!loading && classes.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
            ยังไม่มีห้องเรียนในระบบ
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/classroom/${c.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/classroom/${c.id}`); }}
              className="group text-left rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md hover:border-pink-200 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                  <FaChalkboardTeacher size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate">{gradeLabel(c)}</div>
                  <div className="text-[12.5px] text-gray-400 truncate">
                    {c.teacher_name ? `ครูที่ปรึกษา ${c.teacher_name}` : "ยังไม่ระบุครูที่ปรึกษา"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, c)}
                  title="ลบห้องเรียน"
                  className="h-8 w-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition"
                >
                  <FaTrash size={13} />
                </button>
                <FaChevronRight className="text-gray-300 shrink-0" />
              </div>

              {c.class_code && (
                <button
                  type="button"
                  onClick={(e) => copyCode(e, c.class_code)}
                  title="คัดลอกรหัสเข้าชั้นเรียน"
                  className="mt-3.5 w-full flex items-center justify-between rounded-xl bg-gray-50 hover:bg-pink-50 px-3 py-2 transition"
                >
                  <span className="text-[12px] text-gray-500">รหัสเข้าชั้นเรียน</span>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-pink-600 tracking-wider">
                    {c.class_code} <FaCopy size={11} />
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

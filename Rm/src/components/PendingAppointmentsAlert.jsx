import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegCalendarCheck, FaChevronRight } from "react-icons/fa";
import { getAppointments } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { awaitsMyReply, apptDateKey, thaiDateLong, thaiTime } from "../utils/appointmentStatus.js";

// แจ้งเตือนหน้าโฮม: นัดหมายที่อีกฝ่ายนัดมาและยังรอเรายืนยัน/ปฏิเสธ — กดแล้วไปหน้าปฏิทินที่วันนั้น
// role = "student" | "teacher"
export default function PendingAppointmentsAlert({ role, className = "" }) {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!me?.user_id) return;
    getAppointments(role === "teacher" ? { teacher_user_id: me.user_id } : { student_user_id: me.user_id })
      .then((rows) =>
        setItems(
          (rows || [])
            .filter((a) => awaitsMyReply(a, me.user_id))
            .sort((x, y) => (apptDateKey(x.appointment_date) + x.appointment_time).localeCompare(apptDateKey(y.appointment_date) + y.appointment_time))
        )
      )
      .catch(() => setItems([]));
  }, [me?.user_id, role]);

  if (!items.length) return null;
  const calendar = role === "teacher" ? "/TeacherCalendar" : "/studentcalendar";
  const who = (a) => (role === "teacher" ? a.student_name : a.teacher_name ? `ครู${a.teacher_name}` : "ครู");

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50/70 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 shrink-0 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
          <FaRegCalendarCheck size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold text-amber-900">มีนัดหมายรอคุณตอบ {items.length} รายการ</div>
          <div className="text-[13.5px] text-amber-800/80">
            {role === "teacher" ? "นักเรียนขอนัดพบ" : "ครูนัดพบ"} — กดเพื่อไปยืนยันหรือแจ้งว่าไม่สะดวก
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {items.slice(0, 3).map((a) => (
          <button
            key={a.appointment_id}
            type="button"
            onClick={() => navigate(`${calendar}?date=${apptDateKey(a.appointment_date)}`)}
            className="w-full flex items-center gap-3 rounded-xl border border-amber-100 bg-white px-3.5 py-2.5 text-left hover:border-amber-300 transition"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-gray-900">
                {thaiDateLong(a.appointment_date)} • {thaiTime(a.appointment_time)}
              </div>
              <div className="text-[13.5px] text-gray-500 truncate">
                {who(a)}
                {a.note ? ` • ${a.note}` : ""}
              </div>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-[13.5px] font-medium text-pink-600">
              ตอบนัด <FaChevronRight size={10} />
            </span>
          </button>
        ))}
        {items.length > 3 && (
          <button type="button" onClick={() => navigate(calendar)} className="text-[13.5px] text-pink-600 hover:underline bg-transparent !p-0">
            ดูทั้งหมด {items.length} รายการ →
          </button>
        )}
      </div>
    </div>
  );
}

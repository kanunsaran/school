import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import SidebarNav from "../../../layout/StudentSidebar";
import Header from "../../../layout/Header";
import { FaChevronLeft, FaChevronRight, FaPlus, FaClock, FaTrash } from "react-icons/fa";
import {
  getAppointments,
  createAppointment,
  cancelAppointment,
  replyAppointment,
  getTeacher,
  getEnrollments,
  getClasses,
} from "../../../callapi/callapi_user.jsx";
import { getCurrentUser } from "../../../utils/auth.js";
import { formatThaiTimeLabel } from "../../../utils/feedShared.js";
import { bigFilterSelectStyles } from "../../../utils/reactSelectStyles.js";
import ThaiTimeField from "../../../components/ThaiTimeField.jsx";
import Avatar from "../../../components/Avatar.jsx";
import AppointmentCalendarGrid from "../../../components/AppointmentCalendarGrid.jsx";
import AdvisorSchedule from "../../../components/AdvisorSchedule.jsx";
import ReplyThread from "../../../components/AppointmentReplyThread.jsx";
import { groupByDay, notOverBy, rangeLabel, durationSuffix, keyToDate } from "../../../utils/appointmentRange.js";
import AppointmentResponse from "../../../components/AppointmentResponse.jsx";
import { statusCardClass, STATUS_STYLE, thaiDateLong, thaiTime } from "../../../utils/appointmentStatus.js";
import { useLocation } from "react-router-dom";

// ปฏิทินนัดหมายฝั่งนักเรียน — หน้าตาเหมือนปฏิทินครู: เห็นนัดที่ครูนัดมา + นัดที่ตัวเองขอนัดครู และขอนัดครูใหม่ได้

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const replyTime = (d) => new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

export default function StudentCalendarPage() {
  const me = getCurrentUser();
  const myId = me?.user_id;
  const today = useMemo(() => new Date(), []);

  // เปิดจากลิงก์หน้าโฮม (?date=YYYY-MM-DD) → เลือกวันนั้นให้เลย
  const startDate = useMemo(() => {
    const q = new URLSearchParams(window.location.search).get("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(q || "")) return today;
    const [y, m, d] = q.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [today]);
  const [viewDate, setViewDate] = useState(() => new Date(startDate.getFullYear(), startDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [appointments, setAppointments] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [newTeacherId, setNewTeacherId] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  // นัดหมายของนักเรียนคนนี้ (ยกเลิกแล้วไม่แสดง)
  const loadAppointments = async () => {
    try {
      const list = await getAppointments({ student_user_id: myId });
      setAppointments(
        (list || [])
          .filter((a) => a.status !== "cancelled")
          .map((a) => ({
            id: a.appointment_id,
            date: toDateKey(new Date(a.appointment_date)),
            endDate: a.appointment_end_date || null,
            time: a.appointment_time,
            teacherId: a.teacher_user_id,
            teacher: a.teacher_name || "ครู",
            note: a.note,
            status: a.status,
            responseNote: a.response_note,
            proposedDate: a.proposed_date,
            proposedTime: a.proposed_time,
            byMe: a.created_by_user_id != null && String(a.created_by_user_id) === String(myId),
            replies: (a.replies || []).map((r) => ({ author: r.author_name || "-", text: r.content, time: replyTime(r.created_at) })),
          }))
      );
    } catch (err) {
      console.error("โหลดนัดหมายไม่สำเร็จ:", err);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // รายชื่อครู + ตั้งค่าเริ่มต้นเป็นครูที่ปรึกษาห้องของเรา
  useEffect(() => {
    Promise.all([getTeacher().catch(() => []), getEnrollments().catch(() => []), getClasses().catch(() => [])]).then(
      ([teacherList, enrollList, gradeList]) => {
        setTeachers((teacherList || []).map((t) => ({ id: t.user_id, name: t.fullname })));
        const myEnroll = (enrollList || []).find((e) => String(e.user_user_id) === String(myId));
        const myGrade = myEnroll && (gradeList || []).find((g) => String(g.idgrade ?? g.id) === String(myEnroll.grade_idgrade));
        const advisorId = myGrade?.teacher_user_id ?? teacherList?.[0]?.user_id;
        if (advisorId) setNewTeacherId((cur) => cur || String(advisorId));
      }
    );
  }, [myId]);

  // นัดที่รอเราตอบ (อีกฝ่ายเป็นคนนัด ยังไม่ยืนยัน/ปฏิเสธ และยังไม่ถึงวันที่ผ่านไปแล้ว)
  const needsReply = (a) => a.status === "pending" && !a.byMe && a.date >= toDateKey(today);
  const awaiting = appointments.filter(needsReply).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  const jumpTo = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    setSelectedDate(new Date(y, m - 1, d));
    setViewDate(new Date(y, m - 1, 1));
    setRangeEnd(null);
  };
  // นัดหลายวัน: วันสุดท้ายของช่วงที่ลากบนปฏิทิน (null = วันเดียว)
  const [rangeEnd, setRangeEnd] = useState(null);
  const handleRangeChange = (start, end) => {
    setSelectedDate(keyToDate(start));
    setRangeEnd(end > start ? end : null);
  };

  // กดแจ้งเตือนที่ลิงก์ ?date= ขณะอยู่หน้านี้อยู่แล้ว → ไปที่วันนั้น
  const location = useLocation();
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("date");
    if (/^\d{4}-\d{2}-\d{2}$/.test(q || "")) jumpTo(q);
  }, [location.search]);

  // นัดหลายวันแสดงในทุกวันที่นัดครอบคลุม
  const appointmentsByDate = useMemo(() => groupByDay(appointments), [appointments]);

  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(today);
  const isPastSelectedDate = selectedKey < todayKey;
  const appointmentsForSelectedDate = appointmentsByDate[selectedKey] || [];

  const upcomingAppointments = appointments
    .filter((a) => notOverBy(a, todayKey))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const teacherOptions = teachers.map((t) => ({ value: String(t.id), label: t.name }));

  const requestAppointment = async () => {
    const missing = [];
    if (!newTeacherId) missing.push("ครู");
    if (!newNote.trim()) missing.push("หัวข้อนัดหมาย");
    if (missing.length) {
      Swal.fire({ icon: "warning", title: "กรอกข้อมูลไม่ครบ", text: `กรุณาเลือก/กรอก: ${missing.join(", ")}` });
      return;
    }
    if (appointments.some((a) => String(a.teacherId) === newTeacherId && a.date === selectedKey && a.time === newTime)) {
      Swal.fire({ icon: "warning", title: "มีนัดหมายนี้อยู่แล้ว", text: "มีนัดกับครูท่านนี้ในวันและเวลานี้แล้ว" });
      return;
    }
    setSaving(true);
    try {
      await createAppointment({
        teacher_user_id: newTeacherId,
        student_user_id: myId,
        appointment_date: selectedKey,
        appointment_end_date: rangeEnd,
        appointment_time: newTime,
        note: newNote.trim(),
      });
      setNewNote("");
      await loadAppointments();
      const teacherName = teachers.find((t) => String(t.id) === newTeacherId)?.name || "ครู";
      Swal.fire({
        icon: "success",
        title: "ส่งนัดหมายให้ครูแล้ว",
        text: `${teacherName} • ${rangeLabel(selectedKey, rangeEnd)}${durationSuffix(selectedKey, rangeEnd)} • ${formatThaiTimeLabel(newTime)}`,
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("ขอนัดหมายไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "ขอนัดหมายไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setSaving(false);
    }
  };

  const removeAppointment = async (id) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกนัดหมายนี้?",
      showCancelButton: true,
      confirmButtonText: "ยกเลิกนัดหมาย",
      cancelButtonText: "ไม่ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await cancelAppointment(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("ยกเลิกนัดหมายไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "ยกเลิกนัดหมายไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const addReply = async (appointmentId, text) => {
    if (!text.trim()) return;
    try {
      const reply = await replyAppointment(appointmentId, { user_user_id: myId, content: text.trim() });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? { ...a, replies: [...(a.replies || []), { author: reply.author_name || me?.name || "ฉัน", text: reply.content, time: replyTime(reply.created_at) }] }
            : a
        )
      );
    } catch (err) {
      console.error("ส่งข้อความตอบกลับนัดหมายไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "ส่งข้อความไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 min-w-0">
        <Header />

        <main className="flex-1 min-w-0 px-4 sm:px-8 pt-24 pb-16">
          <div>
            <h1 className="page-title">ปฏิทินนัดหมาย</h1>
            <p className="page-subtitle mt-1">ดูนัดหมายที่ครูนัดคุณ และขอนัดพบครูได้ที่นี่</p>
          </div>

          {/* นัดที่รอเราตอบ — กดแล้วไปที่วันนั้นเพื่อยืนยัน/ปฏิเสธ */}
          {awaiting.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <div className="text-[15.5px] font-semibold text-amber-900">มีนัดหมายรอคุณตอบ {awaiting.length} รายการ</div>
              <div className="text-[13.5px] text-amber-800/80">กดที่นัดเพื่อไปยังวันนั้น แล้วเลือก “ยืนยัน” หรือ “ปฏิเสธ”</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {awaiting.slice(0, 6).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => jumpTo(a.date)}
                    className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[13.5px] text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                  >
                    <b className="font-semibold">{a.endDate ? rangeLabel(a.date, a.endDate) : thaiDateLong(a.date)}</b> {thaiTime(a.time)}
                    {a.teacher ? ` • ${a.teacher}` : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-x-10 gap-y-10 items-start">
            {/* Calendar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[16px] font-medium text-gray-900">
                  {THAI_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    aria-label="เดือนก่อน"
                    className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center transition"
                  >
                    <FaChevronLeft className="text-[16px]" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    aria-label="เดือนถัดไป"
                    className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center transition"
                  >
                    <FaChevronRight className="text-[16px]" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[13px] text-gray-400 mb-2">
                {WEEKDAYS.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              <AppointmentCalendarGrid
                viewDate={viewDate}
                today={today}
                selectedDate={selectedDate}
                appointmentsByDate={appointmentsByDate}
                titleOf={(a) => a.note?.trim() || a.teacher || "นัดหมาย"}
                onSelectDate={setSelectedDate}
                rangeEnd={rangeEnd}
                onRangeChange={handleRangeChange}
                needsReply={needsReply}
              />
              <p className="mt-2 text-[13px] text-gray-400">การนัดหมายหลายวัน: กดค้างที่วันเริ่มต้นแล้วลากไปยังวันสิ้นสุด • ปรับช่วงวันได้โดยลากวันเริ่มต้นหรือวันสิ้นสุด</p>

              {/* คำอธิบายป้ายในปฏิทิน */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-pink-100 border border-pink-300" />
                  นัดหมายวันนี้หรือวันถัดไป
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-pink-50 border border-pink-200" />
                  นัดหมายที่ผ่านไปแล้ว
                </span>
              </div>
            </div>

            {/* Appointments panel */}
            <div className="space-y-8">
              <div>
                <h2 className="text-[16.5px] font-medium text-gray-400">
                  นัดหมายวันที่{" "}
                  {/* วันที่สี/ขนาดเดียวกับวันที่ในรายการ "นัดหมายที่จะถึงนี้" */}
                  <span className="font-semibold text-gray-500">
                    {rangeEnd ? `${rangeLabel(selectedKey, rangeEnd)}${durationSuffix(selectedKey, rangeEnd)}` : `${selectedDate.getDate()} ${THAI_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`}
                  </span>
                </h2>

                <div className="mt-3 space-y-2">
                  {appointmentsForSelectedDate.length === 0 && (
                    <div className="text-[16.5px] text-gray-400 py-3">ยังไม่มีนัดหมายในวันนี้</div>
                  )}

                  {appointmentsForSelectedDate.map((a) => (
                    <div key={a.id} className={`rounded-xl border px-3 py-2.5 ${statusCardClass(a.status)}`}>
                      <div className="flex items-center gap-3">
                        <Avatar name={a.teacher} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[16px] text-gray-900 truncate">{a.teacher}</span>
                            <span
                              className={`shrink-0 text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                                a.byMe ? "bg-pink-50 text-pink-600" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {a.byMe ? "คุณขอนัด" : "ครูนัด"}
                            </span>
                          </div>
                          <div className="text-[15px] text-gray-400 truncate">{a.note}</div>
                          {a.endDate && <div className="text-[13.5px] text-pink-600">ระยะเวลานัดหมาย: {rangeLabel(a.date, a.endDate)}{durationSuffix(a.date, a.endDate)}</div>}
                        </div>
                        <div className="text-[15px] text-gray-500 flex items-center gap-1 shrink-0">
                          <FaClock className="text-[15px]" />
                          {formatThaiTimeLabel(a.time)}
                        </div>
                        {a.byMe && !isPastSelectedDate && (
                          <button
                            type="button"
                            onClick={() => removeAppointment(a.id)}
                            aria-label="ยกเลิกนัดหมาย"
                            className="h-8 w-8 shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition"
                          >
                            <FaTrash className="text-[17px]" />
                          </button>
                        )}
                      </div>

                      <AppointmentResponse appt={a} otherLabel="ครู" otherName={a.teacher} isPast={isPastSelectedDate} onChanged={loadAppointments} />
                      <ReplyThread replies={a.replies || []} onAdd={(text) => addReply(a.id, text)} placeholder="พิมพ์ตอบกลับนัดหมายนี้..." />
                    </div>
                  ))}
                </div>

                {/* ขอนัดครู — วันย้อนหลังขอนัดไม่ได้ */}
                {isPastSelectedDate ? (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3 text-center text-[15px] text-gray-400">
                    ไม่สามารถขอนัดหมายย้อนหลังได้
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3 space-y-2">
                    <div className="text-[14.5px] font-medium text-gray-600">ขอนัดพบครู</div>
                    <Select
                      styles={bigFilterSelectStyles}
                      placeholder="เลือกครู"
                      value={teacherOptions.find((o) => o.value === newTeacherId) || null}
                      onChange={(opt) => setNewTeacherId(opt?.value || "")}
                      options={teacherOptions}
                      isSearchable={false}
                      noOptionsMessage={() => "ไม่พบรายชื่อครู"}
                    />
                    <ThaiTimeField value={newTime} onChange={setNewTime} heightClass="h-10" bgClass="bg-white" radiusClass="rounded-lg" />
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="หัวข้อนัดหมาย เช่น ปรึกษาเรื่องเรียนต่อ"
                      className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-[16px] outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={requestAppointment}
                      disabled={saving}
                      className="w-full h-10 rounded-lg bg-pink-500 text-white text-[16px] font-medium hover:bg-pink-600 disabled:opacity-60 transition flex items-center justify-center gap-1.5"
                    >
                      <FaPlus className="text-[15px]" />
                      {saving ? "กำลังส่ง..." : "ขอนัดหมาย"}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-[16.5px] font-medium text-gray-400">นัดหมายที่จะถึงนี้</h2>
                <div className="mt-3 border-t border-gray-200">
                  {upcomingAppointments.length === 0 && (
                    <div className="text-[16.5px] text-gray-400 py-4">ยังไม่มีนัดหมายที่จะถึง</div>
                  )}
                  {upcomingAppointments.map((a) => {
                    const [y, m, d] = a.date.split("-").map(Number);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => jumpTo(a.date)}
                        className="w-full flex items-center justify-between gap-4 px-1 py-3 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 text-left bg-transparent"
                      >
                        {/* วันที่เด่นเป็นบรรทัดแรก ชื่อครู+หัวข้อเป็นบรรทัดรอง */}
                        <div className="min-w-0">
                          <div className="text-[16.5px] font-semibold text-gray-500">
                            {a.endDate ? `${rangeLabel(a.date, a.endDate)}${durationSuffix(a.date, a.endDate)}` : `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`}
                          </div>
                          <div className="text-[15px] text-gray-400 mt-0.5 truncate">
                            {a.teacher}
                            {a.note ? ` • ${a.note}` : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[15px] text-gray-500">{formatThaiTimeLabel(a.time)}</div>
                          {STATUS_STYLE[a.status] && (
                            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLE[a.status].badge}`}>
                              {a.status === "pending" && !a.byMe ? "รอคุณตอบ" : STATUS_STYLE[a.status].label}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ตารางสอนครูที่ปรึกษา — ดูคาบว่างก่อนขอนัด */}
          <div className="mt-10">
            <AdvisorSchedule />
          </div>
        </main>
      </div>
    </div>
  );
}

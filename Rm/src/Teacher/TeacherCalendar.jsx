import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Select from "react-select";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaClock,
  FaTrash,
  FaSearch,
  FaEdit,
  FaTimes,
  FaCheck,
} from "react-icons/fa";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  replyAppointment,
  getStudent,
  getEnrollments,
  getClasses,
  getStudentGeneralInfo,
} from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { formatThaiTimeLabel } from "../utils/feedShared.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";
import { gradeLabel } from "../utils/gradeLabel.js";
import ThaiCalendarPicker from "../components/ThaiCalendarPicker.jsx";
import ThaiTimeField from "../components/ThaiTimeField.jsx";
import Avatar from "../components/Avatar.jsx";

const CURRENT_TEACHER_ID = getCurrentUser()?.user_id ?? "2";

// จำนวนวันล่วงหน้าที่จะนำนัดหมายมาแสดงในส่วน "นัดหมายที่จะถึงนี้"
const UPCOMING_DAYS_AHEAD = 7;

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

export default function TeacherCalendar() {
  const today = useMemo(() => new Date(), []);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const [students, setStudents] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // ดึงรายชื่อนักเรียนจริง (พร้อมห้องเรียนที่ join จาก enrollment) ไว้ให้ StudentPicker ค้นหา
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const [studentData, enrollData, gradeData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
        ]);
        const gradeByUserId = new Map();
        enrollData.forEach((e) => {
          if (!gradeByUserId.has(String(e.user_user_id))) gradeByUserId.set(String(e.user_user_id), e.grade_idgrade);
        });
        const gradesById = new Map(gradeData.map((g) => [String(g.idgrade), g]));
        setStudents(
          studentData.map((s) => {
            const grade = gradesById.get(String(gradeByUserId.get(String(s.user_id))));
            return { id: s.user_id, name: s.fullname, code: s.student_code || "", classroom: grade ? `ม.${gradeLabel(grade)}` : "-", email: s.email };
          })
        );
      } catch (err) {
        console.error("โหลดรายชื่อนักเรียนไม่สำเร็จ:", err);
      }
    };
    loadStudents();
  }, []);

  // ดึงนัดหมายจริงของครูคนนี้ (ยกเลิกแล้วไม่แสดง)
  const loadAppointments = async () => {
    try {
      const list = await getAppointments({ teacher_user_id: CURRENT_TEACHER_ID });
      setAppointments(
        (list || [])
          .filter((a) => a.status !== "cancelled")
          .map((a) => ({
            id: a.appointment_id,
            date: toDateKey(new Date(a.appointment_date)),
            time: a.appointment_time,
            studentId: a.student_user_id,
            note: a.note,
            replies: (a.replies || []).map((r) => ({
              author: r.author_name || "-",
              text: r.content,
              time: new Date(r.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
            })),
          }))
      );
    } catch (err) {
      console.error("โหลดนัดหมายไม่สำเร็จ:", err);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // รูปโปรไฟล์จริงของนักเรียนที่มีนัดหมาย (เฉพาะคนที่เกี่ยวข้อง ไม่ดึงทั้งโรงเรียน) — มีก็ใช้จริง ไม่มีก็ให้ Avatar fallback เป็นวงกลมสีชมพู+ตัวอักษรแรก
  const [avatarByUser, setAvatarByUser] = useState({});
  useEffect(() => {
    const uniqueIds = [...new Set(appointments.map((a) => String(a.studentId)))].filter((id) => !(id in avatarByUser));
    if (uniqueIds.length === 0) return;
    Promise.all(
      uniqueIds.map((id) =>
        getStudentGeneralInfo(id)
          .then((res) => [id, res?.avatar_url || null])
          .catch(() => [id, null])
      )
    ).then((entries) => {
      setAvatarByUser((prev) => {
        const next = { ...prev };
        entries.forEach(([id, url]) => { next[id] = url; });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  const [newTime, setNewTime] = useState("09:00");
  const [newStudentIds, setNewStudentIds] = useState([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [newNote, setNewNote] = useState("");

  const toggleNewStudent = (s) => {
    setNewStudentIds((prev) => (prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]));
  };

  const appointmentCountByDate = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      map[a.date] = (map[a.date] || 0) + 1;
    }
    return map;
  }, [appointments]);

  const selectedKey = toDateKey(selectedDate);
  const isPastSelectedDate = selectedKey < toDateKey(today);

  const appointmentsForSelectedDate = appointments
    .filter((a) => a.date === selectedKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  // นัดหมายที่จะถึงนี้ = อยู่ระหว่างวันนี้ ถึง วันนี้ + UPCOMING_DAYS_AHEAD วัน
  const upcomingAppointments = useMemo(() => {
    const todayKey = toDateKey(today);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() + UPCOMING_DAYS_AHEAD);
    const cutoffKey = toDateKey(cutoffDate);

    return appointments
      .filter((a) => a.date >= todayKey && a.date <= cutoffKey)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [appointments, today]);

  const studentById = (id) => students.find((s) => String(s.id) === String(id));

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const addAppointment = async () => {
    const missing = [];
    if (newStudentIds.length === 0) missing.push("นักเรียน");
    if (!newNote.trim()) missing.push("หัวข้อนัดหมาย");
    if (missing.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: `กรุณาเลือก/กรอก: ${missing.join(", ")}`,
      });
      return;
    }

    const selectedStudents = newStudentIds.map((id) => studentById(id)).filter(Boolean);

    // ห้ามนัดคนเดิมซ้ำวันเวลาเดิม แต่นัดคนละคนในเวลาเดียวกันได้ — เช็คทุกคนที่เลือกไว้ก่อนยืนยัน
    const duplicateNames = selectedStudents
      .filter((student) => appointments.some((a) => String(a.studentId) === String(student.id) && a.date === selectedKey && a.time === newTime))
      .map((student) => student.name);
    if (duplicateNames.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "มีนัดหมายนี้อยู่แล้ว",
        html: `${duplicateNames.join(", ")} มีนัดหมายในวันและเวลานี้อยู่แล้ว`,
      });
      return;
    }

    const namesList = selectedStudents.map((s) => s.name).join(", ");
    const confirmResult = await Swal.fire({
      icon: "question",
      title: newStudentIds.length > 1 ? `ยืนยันเพิ่มนัดหมายให้ ${newStudentIds.length} คนนี้?` : "ยืนยันเพิ่มนัดหมายนี้?",
      html: `${namesList || "-"}<br/>${selectedDate.getDate()} ${THAI_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543} • ${formatThaiTimeLabel(newTime)}<br/>${newNote.trim()}`,
      showCancelButton: true,
      confirmButtonText: "เพิ่มนัดหมาย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ec4899",
    });
    if (!confirmResult.isConfirmed) return;

    try {
      await Promise.all(
        newStudentIds.map((studentId) =>
          createAppointment({
            teacher_user_id: CURRENT_TEACHER_ID,
            student_user_id: studentId,
            appointment_date: selectedKey,
            appointment_time: newTime,
            note: newNote.trim(),
          })
        )
      );
      await loadAppointments();
      setNewStudentIds([]);
      setStudentQuery("");
      setNewNote("");
    } catch (err) {
      console.error("สร้างนัดหมายไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "สร้างนัดหมายไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
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

  const [editingAppointment, setEditingAppointment] = useState(null);

  const isDuplicateSlot = (studentId, date, time, excludeId) =>
    appointments.some(
      (a) => a.id !== excludeId && String(a.studentId) === String(studentId) && a.date === date && a.time === time
    );

  const handleSaveEdit = async ({ date, time }) => {
    try {
      await updateAppointment(editingAppointment.id, { appointment_date: date, appointment_time: time });
      await loadAppointments();
      setEditingAppointment(null);
    } catch (err) {
      console.error("แก้ไขนัดหมายไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "แก้ไขนัดหมายไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const addReply = async (appointmentId, text) => {
    if (!text.trim()) return;
    try {
      const reply = await replyAppointment(appointmentId, { user_user_id: CURRENT_TEACHER_ID, content: text.trim() });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? {
                ...a,
                replies: [
                  ...(a.replies || []),
                  {
                    author: reply.author_name || "ครู",
                    text: reply.content,
                    time: new Date(reply.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
                  },
                ],
              }
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

        <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
          <div>
            <h1 className="page-title">ปฏิทินนัดหมาย</h1>
            <p className="page-subtitle mt-1">
              จัดตารางนัดหมายกับนักเรียนของคุณ
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-[1.3fr_1fr] gap-x-10 gap-y-10">
            {/* Calendar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[16px] font-medium text-gray-900">
                  {THAI_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center transition"
                  >
                    <FaChevronLeft className="text-[16px]" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center transition"
                  >
                    <FaChevronRight className="text-[16px]" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[13px] text-gray-400 mb-2">
                {WEEKDAYS.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              <CalendarGrid
                viewDate={viewDate}
                today={today}
                selectedDate={selectedDate}
                appointmentCountByDate={appointmentCountByDate}
                onSelectDate={setSelectedDate}
              />
            </div>

            {/* Appointments panel */}
            <div className="space-y-8">
              <div>
                <h2 className="text-[16.5px] font-medium text-gray-400">
                  นัดหมายวันที่ {selectedDate.getDate()} {THAI_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
                </h2>

                <div className="mt-3 space-y-2">
                  {appointmentsForSelectedDate.length === 0 && (
                    <div className="text-[16.5px] text-gray-400 py-3">ยังไม่มีนัดหมายในวันนี้</div>
                  )}

                  {appointmentsForSelectedDate.map((a) => {
                    const student = studentById(a.studentId);
                    return (
                      <div key={a.id} className="rounded-xl border border-gray-200 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar src={avatarByUser[String(a.studentId)]} name={student?.name} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[16px] text-gray-900 truncate">{student?.name || "ไม่ทราบชื่อ"}</div>
                            <div className="text-[15px] text-gray-400 truncate">
                              {student?.classroom} • {a.note}
                            </div>
                          </div>
                          <div className="text-[15px] text-gray-500 flex items-center gap-1 shrink-0">
                            <FaClock className="text-[15px]" />
                            {formatThaiTimeLabel(a.time)}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingAppointment(a)}
                            className="h-8 w-8 shrink-0 rounded-lg text-gray-300 hover:text-pink-500 hover:bg-pink-50 flex items-center justify-center transition"
                          >
                            <FaEdit className="text-[16.5px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAppointment(a.id)}
                            className="h-8 w-8 shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition"
                          >
                            <FaTrash className="text-[17px]" />
                          </button>
                        </div>

                        <ReplyThread
                          replies={a.replies || []}
                          onAdd={(text) => addReply(a.id, text)}
                          placeholder="พิมพ์ตอบกลับนัดหมายนี้..."
                        />
                      </div>
                    );
                  })}
                </div>

                {/* New appointment form — เลือกวันย้อนหลังไม่ให้เพิ่มนัดหมายใหม่ได้ */}
                {isPastSelectedDate ? (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3 text-center text-[15px] text-gray-400">
                    ไม่สามารถเพิ่มนัดหมายย้อนหลังได้
                  </div>
                ) : (
                <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3 space-y-2">
                  <StudentPicker
                    students={students}
                    query={studentQuery}
                    onQueryChange={setStudentQuery}
                    selectedIds={newStudentIds}
                    onToggle={toggleNewStudent}
                  />
                  <ThaiTimeField
                    value={newTime}
                    onChange={setNewTime}
                    heightClass="h-10"
                    bgClass="bg-white"
                    radiusClass="rounded-lg"
                  />
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="หัวข้อนัดหมาย"
                    className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-[16px] outline-none focus:border-gray-400 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={addAppointment}
                    className="w-full h-10 rounded-lg bg-pink-500 text-white text-[16px] font-medium hover:bg-pink-600 transition flex items-center justify-center gap-1.5"
                  >
                    <FaPlus className="text-[15px]" />
                    เพิ่มนัดหมาย
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
                    const student = studentById(a.studentId);
                    const [y, m, d] = a.date.split("-").map(Number);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(new Date(y, m - 1, d));
                          setViewDate(new Date(y, m - 1, 1));
                        }}
                        className="w-full flex items-center justify-between gap-4 px-1 py-3 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 text-left"
                      >
                        <div className="min-w-0">
                          <div className="text-[16px] text-gray-900 truncate">{student?.name}</div>
                          <div className="text-[15px] text-gray-400 mt-0.5">
                            {d} {THAI_MONTHS[m - 1]} • {a.note}
                          </div>
                        </div>
                        <div className="text-[15px] text-gray-500 shrink-0">{formatThaiTimeLabel(a.time)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          studentName={studentById(editingAppointment.studentId)?.name}
          isDuplicate={(date, time) => isDuplicateSlot(editingAppointment.studentId, date, time, editingAppointment.id)}
          onClose={() => setEditingAppointment(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

function EditAppointmentModal({ appointment, studentName, isDuplicate, onClose, onSave }) {
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.time);
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!date || !time) {
      Swal.fire({ icon: "warning", title: "กรอกข้อมูลไม่ครบ", text: "กรุณาเลือกวันที่และเวลานัดหมาย" });
      return;
    }

    if (isDuplicate(date, time)) {
      Swal.fire({
        icon: "warning",
        title: "มีนัดหมายนี้อยู่แล้ว",
        text: `${studentName || "นักเรียนคนนี้"} มีนัดหมายในวันและเวลานี้อยู่แล้ว ไม่สามารถซ้ำกันได้`,
      });
      return;
    }

    const [y, m, d] = date.split("-").map(Number);
    const confirmResult = await Swal.fire({
      icon: "question",
      title: "ยืนยันการแก้ไขนัดหมาย?",
      html: `${studentName || "-"}<br/>${d} ${THAI_MONTHS[m - 1]} ${y + 543} • ${formatThaiTimeLabel(time)}`,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ec4899",
    });
    if (!confirmResult.isConfirmed) return;

    setSaving(true);
    try {
      await onSave({ date, time });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-105 max-w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900">แก้ไขวัน/เวลานัดหมาย</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-transparent">
            <FaTimes size={16} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">วันที่นัดหมาย</label>
            <ThaiCalendarPicker value={date} min={toDateKey(new Date())} onChange={setDate} />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">เวลานัดหมาย</label>
            <ThaiTimeField value={time} onChange={setTime} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14px] font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!date || !time || saving}
            className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14px] font-semibold"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReplyThread({ replies, onAdd, placeholder }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  };
  return (
    <div className="mt-2.5 pl-13">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="text-pink-600 text-[13.5px] bg-transparent">
        {expanded ? "ซ่อนการตอบกลับ" : replies.length > 0 ? `ดูการตอบกลับ (${replies.length})` : "ตอบกลับ"}
      </button>

      {expanded && (
        <div className="mt-1.5">
          {replies.length > 0 && (
            <div className="space-y-2 mb-2">
              {replies.map((r, i) => (
                <div key={i} className="text-[14.5px] bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">{r.author}</span>
                  <span className="text-[12.5px] text-gray-400"> • {r.time}</span>
                  <div className="mt-1 text-gray-600">{r.text}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder={placeholder}
              className="flex-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-[14.5px] outline-none focus:border-gray-400 placeholder:text-gray-400"
            />
            <button type="button" onClick={submit} className="h-10 px-3.5 rounded-lg bg-pink-500 text-white text-[14.5px] hover:bg-pink-600 transition shrink-0">
              ส่ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentPicker({ students, query, onQueryChange, selectedIds, onToggle }) {
  const [open, setOpen] = useState(false);
  const [classroomFilter, setClassroomFilter] = useState("");

  const classroomOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.classroom).filter(Boolean));
    return [{ value: "", label: "ทุกห้อง" }, ...Array.from(set).sort().map((c) => ({ value: c, label: c }))];
  }, [students]);

  const q = query.trim().toLowerCase();
  const matches = students.filter((s) => {
    if (classroomFilter && s.classroom !== classroomFilter) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q);
  });

  const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="flex flex-col gap-2">
      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedStudents.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-pink-50 text-pink-700 text-[14px]">
              {s.name}
              <button
                type="button"
                onClick={() => onToggle(s)}
                className="w-5 h-5 rounded-full hover:bg-pink-100 flex items-center justify-center bg-transparent text-pink-500"
              >
                <FaTimes size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative flex gap-2">
        <div className="w-36 shrink-0">
          <Select
            styles={bigFilterSelectStyles}
            value={classroomOptions.find((o) => o.value === classroomFilter)}
            onChange={(opt) => setClassroomFilter(opt.value)}
            options={classroomOptions}
            isSearchable={false}
          />
        </div>

        <div className="relative flex-1 min-w-0">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[15px]" />
          <input
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="พิมพ์ชื่อหรือรหัสนักเรียน (เลือกได้หลายคน)"
            className={`w-full h-11 rounded-lg border bg-white pl-8 pr-3 text-[16px] outline-none transition
              ${selectedIds.length > 0 ? "border-pink-300" : "border-gray-200 focus:border-gray-400"}`}
          />

          {open && matches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {matches.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => onToggle(s)}
                    className={`w-full text-left px-3 py-2.5 text-[16px] hover:bg-gray-50 transition flex items-center justify-between gap-2
                      ${isSelected ? "bg-pink-50" : ""}`}
                  >
                    <div>
                      <div className="text-gray-900">{s.name}</div>
                      <div className="text-[14.5px] text-gray-400">{s.code ? `รหัส ${s.code} • ` : ""}{s.classroom}</div>
                    </div>
                    {isSelected && <FaCheck className="text-pink-500 shrink-0" size={14} />}
                  </button>
                );
              })}
            </div>
          )}

          {open && matches.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2 text-[15px] text-gray-400">
              ไม่พบนักเรียนที่ตรงกัน
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarGrid({ viewDate, today, selectedDate, appointmentCountByDate, onSelectDate }) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((day, i) => {
        if (day === null) return <div key={`blank-${i}`} />;

        const cellDate = new Date(year, month, day);
        const key = toDateKey(cellDate);
        const isToday = key === toDateKey(today);
        const isSelected = key === toDateKey(selectedDate);
        const count = appointmentCountByDate[key] || 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(cellDate)}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[15px] transition
              ${
                isSelected
                  ? "bg-pink-500 text-white"
                  : isToday
                  ? "border border-pink-300 text-pink-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            <span>{day}</span>
            {count > 0 && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-pink-500"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
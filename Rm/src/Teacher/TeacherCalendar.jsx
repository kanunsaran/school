import { useMemo, useState } from "react";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaClock,
  FaTrash,
  FaSearch,
} from "react-icons/fa";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const students = [
  { id: 1, name: "กนกพัฒน์ ธรรมรักษ์", classroom: "ม.6/1", email: "kanokpat.t@kkwit.ac.th" },
  { id: 2, name: "มณีนุช อัคคหาด", classroom: "ม.6/2", email: "maneenuch.a@kkwit.ac.th" },
  { id: 3, name: "ภคณ อนันตคามนึง", classroom: "ม.5/3", email: "pakkon.a@kkwit.ac.th" },
  { id: 4, name: "บุรศกร อนันตกุล", classroom: "ม.5/1", email: "buraskorn.a@kkwit.ac.th" },
  { id: 5, name: "รินทร์ลดา พรหมศรี", classroom: "ม.4/2", email: "rinlada.p@kkwit.ac.th" },
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

  const [appointments, setAppointments] = useState(() => {
    const t = toDateKey(today);
    const in3days = new Date(today);
    in3days.setDate(in3days.getDate() + 3);
    return [
      { id: 1, date: t, time: "10:00", studentId: 1, note: "พูดคุยเรื่องแผนการเรียนต่อ" },
      { id: 2, date: t, time: "13:30", studentId: 3, note: "ติดตามผลการเรียน" },
      { id: 3, date: toDateKey(in3days), time: "09:00", studentId: 5, note: "แนะแนวสมัครมหาวิทยาลัย" },
    ];
  });

  const [newTime, setNewTime] = useState("09:00");
  const [newStudentId, setNewStudentId] = useState(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [newNote, setNewNote] = useState("");

  const appointmentCountByDate = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      map[a.date] = (map[a.date] || 0) + 1;
    }
    return map;
  }, [appointments]);

  const selectedKey = toDateKey(selectedDate);

  const appointmentsForSelectedDate = appointments
    .filter((a) => a.date === selectedKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  const upcomingAppointments = appointments
    .filter((a) => a.date >= toDateKey(today))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

  const studentById = (id) => students.find((s) => s.id === Number(id));

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const addAppointment = () => {
    if (!newNote.trim() || !newStudentId) return;
    setAppointments((prev) => [
      ...prev,
      {
        id: Date.now(),
        date: selectedKey,
        time: newTime,
        studentId: Number(newStudentId),
        note: newNote.trim(),
      },
    ]);
    setNewStudentId(null);
    setStudentQuery("");
    setNewNote("");
  };

  const removeAppointment = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 min-w-0">
        <Header />

        <main className="max-w-6xl mx-auto px-6 md:px-8 pt-24 pb-10">
          <div>
            <h1 className="text-[18px] font-medium text-gray-900">ปฏิทินนัดหมาย</h1>
            <p className="text-[13px] text-gray-400 mt-1">
              จัดตารางนัดหมายกับนักเรียนของคุณ
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-[1.3fr_1fr] gap-x-10 gap-y-10">
            {/* Calendar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[14px] font-medium text-gray-900">
                  {THAI_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center transition"
                  >
                    <FaChevronLeft className="text-[11px]" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center transition"
                  >
                    <FaChevronRight className="text-[11px]" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400 mb-2">
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
                <h2 className="text-[13px] font-medium text-gray-400">
                  นัดหมายวันที่ {selectedDate.getDate()} {THAI_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
                </h2>

                <div className="mt-3 space-y-2">
                  {appointmentsForSelectedDate.length === 0 && (
                    <div className="text-[13px] text-gray-400 py-3">ยังไม่มีนัดหมายในวันนี้</div>
                  )}

                  {appointmentsForSelectedDate.map((a) => {
                    const student = studentById(a.studentId);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5"
                      >
                        <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[13px] font-medium">
                          {student?.name?.[0] || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 truncate">{student?.name || "ไม่ทราบชื่อ"}</div>
                          <div className="text-[12px] text-gray-400 truncate">
                            {student?.classroom} • {a.note}
                          </div>
                        </div>
                        <div className="text-[12px] text-gray-500 flex items-center gap-1 shrink-0">
                          <FaClock className="text-[10px]" />
                          {a.time}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAppointment(a.id)}
                          className="h-7 w-7 shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition"
                        >
                          <FaTrash className="text-[11px]" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* New appointment form */}
                <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-3 space-y-2">
                  <StudentPicker
                    students={students}
                    query={studentQuery}
                    onQueryChange={setStudentQuery}
                    selectedId={newStudentId}
                    onSelect={(s) => {
                      setNewStudentId(s.id);
                      setStudentQuery(s.name);
                    }}
                  />
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-[13px] outline-none focus:border-gray-400"
                  />
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="หัวข้อนัดหมาย"
                    className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-gray-400 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={addAppointment}
                    className="w-full h-9 rounded-lg bg-pink-500 text-white text-[13px] font-medium hover:bg-pink-600 transition flex items-center justify-center gap-1.5"
                  >
                    <FaPlus className="text-[10px]" />
                    เพิ่มนัดหมาย
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-[13px] font-medium text-gray-400">นัดหมายที่จะถึงนี้</h2>
                <div className="mt-3 border-t border-gray-200">
                  {upcomingAppointments.length === 0 && (
                    <div className="text-[13px] text-gray-400 py-4">ยังไม่มีนัดหมายที่จะถึง</div>
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
                          <div className="text-gray-900 truncate">{student?.name}</div>
                          <div className="text-[12px] text-gray-400 mt-0.5">
                            {d} {THAI_MONTHS[m - 1]} • {a.note}
                          </div>
                        </div>
                        <div className="text-[12px] text-gray-500 shrink-0">{a.time}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StudentPicker({ students, query, onQueryChange, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);

  const matches =
    query.trim() === ""
      ? students
      : students.filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.email.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <div className="relative">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[11px]" />
        <input
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="พิมพ์ชื่อหรืออีเมลนักเรียน"
          className={`w-full h-9 rounded-lg border bg-white pl-8 pr-3 text-[13px] outline-none transition
            ${selectedId ? "border-pink-300" : "border-gray-200 focus:border-gray-400"}`}
        />
      </div>

      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {matches.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => onSelect(s)}
              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 transition
                ${s.id === selectedId ? "bg-pink-50" : ""}`}
            >
              <div className="text-gray-900">{s.name}</div>
              <div className="text-[11px] text-gray-400">{s.email} • {s.classroom}</div>
            </button>
          ))}
        </div>
      )}

      {open && matches.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2 text-[13px] text-gray-400">
          ไม่พบนักเรียนที่ตรงกัน
        </div>
      )}
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
            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[13px] transition
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
                className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-pink-500"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
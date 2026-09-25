import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  FaChevronLeft,
  FaChevronRight,
  FaUsers,
  FaRegClipboard,
  FaBook,
  FaBullhorn,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaQuestionCircle,
  FaCommentDots,
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

const classroomBreakdown = [
  { label: "ม.6", value: 2 },
  { label: "ม.5", value: 2 },
  { label: "ม.4", value: 1 },
];

const DAY_SHORT = ["จ", "อ", "พ", "พฤ", "ศ"];
const PERIODS = [
  { period: 1, time: "08:30-09:20" },
  { period: 2, time: "09:20-10:10" },
  { period: 3, time: "10:10-11:00" },
  { period: 4, time: "11:00-11:50" },
  { period: 5, time: "12:40-13:30" },
  { period: 6, time: "13:30-14:20" },
  { period: 7, time: "14:20-15:10" },
  { period: 8, time: "15:10-16:00" },
];

const schedule = [
  { day: 0, period: 1, subject: "แนะแนว", classroom: "ม.6/1" },
  { day: 0, period: 5, subject: "แนะแนว", classroom: "ม.5/1" },
  { day: 1, period: 2, subject: "แนะแนว", classroom: "ม.6/2" },
  { day: 2, period: 4, subject: "แนะแนว", classroom: "ม.4/2" },
  { day: 3, period: 1, subject: "แนะแนว", classroom: "ม.5/3" },
  { day: 3, period: 6, subject: "ประชุมกลุ่มสาระ", classroom: "" },
  { day: 4, period: 3, subject: "แนะแนว", classroom: "ม.6/1" },
];

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const aptitudeResults = [
  { studentId: 1, completed: true, riasec: "Social", faculty: "คณะครุศาสตร์" },
  { studentId: 2, completed: true, riasec: "Investigative", faculty: "คณะวิศวกรรมศาสตร์" },
  { studentId: 3, completed: false },
  { studentId: 4, completed: true, riasec: "Enterprising", faculty: "คณะนิเทศศาสตร์" },
  { studentId: 5, completed: true, riasec: "Investigative", faculty: "คณะวิทยาศาสตร์" },
];

const weeklyActivity = [
  { label: "จ", value: 18 },
  { label: "อ", value: 22 },
  { label: "พ", value: 15 },
  { label: "พฤ", value: 25 },
  { label: "ศ", value: 20 },
  { label: "ส", value: 8 },
  { label: "อา", value: 5 },
];

const RIASEC_CODES = ["R", "I", "A", "S", "E", "C"];
const RIASEC_LABEL = {
  R: "Realistic", I: "Investigative", A: "Artistic",
  S: "Social", E: "Enterprising", C: "Conventional",
};

const lessons = [
  { title: "แนะแนวคณะวิศวกรรมศาสตร์", date: "10 กรกฎาคม 2569" },
  { title: "การเตรียมตัวสอบ TGAT", date: "5 กรกฎาคม 2569" },
  { title: "การเลือกสายอาชีพ", date: "28 มิถุนายน 2569" },
];
const totalLessonsPublished = 12;

const quizzes = [
  { name: "แบบทดสอบความถนัดเบื้องต้น", participants: 42, avgScore: 78 },
  { name: "แบบทดสอบบุคลิกภาพ RIASEC", participants: 35, avgScore: 82 },
];
const totalQuizzesCreated = 6;

const totalAnnouncementsPublished = 8;

const notifications = [
  { icon: "question", text: "กนกพัฒน์ ธรรมรักษ์ ส่งคำถามในบทเรียน การเลือกสายอาชีพ", time: "10 นาทีที่แล้ว" },
  { icon: "quiz", text: "มณีนุช อัคคหาด ทำแบบทดสอบ RIASEC เสร็จแล้ว", time: "1 ชั่วโมงที่แล้ว" },
  { icon: "comment", text: "มีความคิดเห็นใหม่ในบทเรียน การเตรียมตัวสอบ TGAT", time: "เมื่อวาน" },
];

const NOTIF_ICON = { question: FaQuestionCircle, quiz: FaCheckCircle, comment: FaCommentDots };

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const [appointments] = useState(() => {
    const t = toDateKey(today);
    const in3days = new Date(today);
    in3days.setDate(in3days.getDate() + 3);
    return [
      { id: 1, date: t, time: "10:00", studentId: 1, note: "พูดคุยเรื่องแผนการเรียนต่อ" },
      { id: 2, date: t, time: "13:30", studentId: 3, note: "ติดตามผลการเรียน" },
      { id: 3, date: toDateKey(in3days), time: "09:00", studentId: 5, note: "แนะแนวสมัครมหาวิทยาลัย" },
    ];
  });

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

  const studentById = (id) => students.find((s) => s.id === Number(id));
  const aptitudeById = (id) => aptitudeResults.find((r) => r.studentId === Number(id));

  const riasecCounts = useMemo(() => {
    return RIASEC_CODES.map((code) => ({
      label: code,
      value: aptitudeResults.filter((r) => r.completed && r.riasec === RIASEC_LABEL[code]).length,
    }));
  }, []);

  const facultyCounts = useMemo(() => {
    const map = {};
    for (const r of aptitudeResults) {
      if (r.completed && r.faculty) map[r.faculty] = (map[r.faculty] || 0) + 1;
    }
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, []);

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const isSelectedToday = selectedKey === toDateKey(today);

  return (
    <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 min-w-0">
        <Header />

        <main className="max-w-7xl mx-auto px-6 md:px-8 pt-24 pb-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ===== Main content ===== */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-medium text-gray-900">สวัสดีคุณครู</h1>
              <p className="text-[13px] text-gray-400 mt-1">ภาพรวมงานแนะแนวและเนื้อหาที่คุณดูแล</p>

              {/* การ์ดสรุป */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <ColorStat
                  tone="slate"
                  icon={FaUsers}
                  value={`${students.length} คน`}
                  label="นักเรียนที่ดูแล"
                  onClick={() => navigate("/student")}
                >
                  <div className="text-[11px] text-gray-500 mt-3">
                    {classroomBreakdown.map((c) => `${c.label} ${c.value} คน`).join(" • ")}
                  </div>
                </ColorStat>

                <ColorStat
                  tone="amber"
                  icon={FaRegClipboard}
                  value={`${totalQuizzesCreated} ชุด`}
                  label="แบบทดสอบที่สร้าง"
                  onClick={() => navigate("/QuestionCreate")}
                />

                <ColorStat
                  tone="pink"
                  icon={FaBook}
                  value={`${totalLessonsPublished} บทเรียน`}
                  label="บทเรียนที่เผยแพร่"
                  onClick={() => navigate("/WorkCreate")}
                />

                <ColorStat
                  tone="rose"
                  icon={FaBullhorn}
                  value={`${totalAnnouncementsPublished} ประกาศ`}
                  label="ประกาศที่เผยแพร่"
                  onClick={() => navigate("/news")}
                />
              </div>

              {/* Weekly schedule */}
              <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="text-[13px] font-medium text-gray-400 mb-3">ตารางสอนประจำสัปดาห์</h2>

                <div className="overflow-x-auto">
                  <table className="min-w-[640px] w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="border border-gray-200 bg-gray-50 text-gray-500 font-medium px-2 py-1 w-12">
                          วัน
                        </th>
                        {PERIODS.map((p) => (
                          <th key={p.period} className="border border-gray-200 bg-gray-50 text-gray-500 font-medium px-2 py-1">
                            {p.period}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {PERIODS.map((p) => (
                          <th key={p.period} className="border border-gray-200 bg-gray-50 text-gray-400 font-normal px-2 py-1">
                            {p.time}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAY_SHORT.map((day, dayIndex) => (
                        <tr key={day}>
                          <td className="border border-gray-200 text-center text-gray-500">{day}</td>
                          {PERIODS.map((p) => {
                            const entry = schedule.find((s) => s.day === dayIndex && s.period === p.period);
                            return (
                              <td key={p.period} className="border border-gray-200 text-center px-1 py-1 align-middle">
                                {entry && (
                                  <div className="leading-tight">
                                    <div className="text-pink-600 font-medium">{entry.subject}</div>
                                    {entry.classroom && <div className="text-gray-400">{entry.classroom}</div>}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* กราฟ */}
              <div className="mt-8 grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-[13px] font-medium text-gray-400 mb-4">
                    นักเรียนเข้าใช้งานรายสัปดาห์
                  </h2>
                  <BarChart data={weeklyActivity} />
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-[13px] font-medium text-gray-400 mb-4">ผล RIASEC ของนักเรียน</h2>
                  <BarChart data={riasecCounts} />
                </div>

                <div className="rounded-2xl border border-gray-200 p-5 md:col-span-2">
                  <h2 className="text-[13px] font-medium text-gray-400 mb-4">
                    คณะที่นักเรียนสนใจมากที่สุด
                  </h2>
                  {facultyCounts.length > 0 ? (
                    <HorizontalBarChart data={facultyCounts} />
                  ) : (
                    <div className="text-[13px] text-gray-400">ยังไม่มีข้อมูล</div>
                  )}
                </div>
              </div>

              {/* นักเรียนล่าสุด */}
              <div className="mt-8">
                <SectionHeader title="นักเรียนล่าสุด" actionLabel="ดูรายละเอียด" onAction={() => navigate("/student")} />
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse">
                    <thead>
                      <tr className="text-left text-gray-400 text-[12px]">
                        <th className="font-normal pb-2 pr-3">ชื่อ</th>
                        <th className="font-normal pb-2 pr-3">ห้อง</th>
                        <th className="font-normal pb-2 pr-3">ผล RIASEC</th>
                        <th className="font-normal pb-2">ทำแบบทดสอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const r = aptitudeById(s.id);
                        return (
                          <tr key={s.id} className="border-t border-gray-100">
                            <td className="py-2.5 pr-3 text-gray-900">{s.name}</td>
                            <td className="py-2.5 pr-3 text-gray-500">{s.classroom}</td>
                            <td className="py-2.5 pr-3 text-gray-500">{r?.completed ? r.riasec : "-"}</td>
                            <td className="py-2.5">
                              {r?.completed ? (
                                <FaCheckCircle className="text-emerald-500 text-[14px]" />
                              ) : (
                                <FaTimesCircle className="text-gray-300 text-[14px]" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* บทเรียนล่าสุด + แบบทดสอบล่าสุด */}
              <div className="mt-8 grid md:grid-cols-2 gap-6">
                <div>
                  <SectionHeader title="บทเรียนล่าสุด" />
                  <div className="mt-3 border-t border-gray-200">
                    {lessons.map((l, i) => (
                      <div key={i} className="flex items-center gap-3 px-1 py-3 border-b last:border-b-0 border-gray-100">
                        <FaBook className="text-gray-400 text-[13px] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-gray-900 truncate">{l.title}</div>
                          <div className="text-[12px] text-gray-400">{l.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/WorkCreate")}
                    className="mt-4 w-full h-9 rounded-lg border border-dashed border-gray-300 text-gray-500 text-[13px] hover:bg-gray-50 hover:text-gray-700 transition flex items-center justify-center gap-1.5"
                  >
                    <FaPlus className="text-[10px]" />
                    เพิ่มบทเรียน
                  </button>
                </div>

                <div>
                  <SectionHeader title="แบบทดสอบล่าสุด" />
                  <div className="mt-3 border-t border-gray-200">
                    {quizzes.map((q, i) => (
                      <div key={i} className="px-1 py-3 border-b last:border-b-0 border-gray-100">
                        <div className="text-gray-900">{q.name}</div>
                        <div className="text-[12px] text-gray-400 mt-0.5">
                          ผู้ทำ {q.participants} คน • คะแนนเฉลี่ย {q.avgScore}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/QuestionCreate")}
                    className="mt-4 w-full h-9 rounded-lg border border-dashed border-gray-300 text-gray-500 text-[13px] hover:bg-gray-50 hover:text-gray-700 transition flex items-center justify-center gap-1.5"
                  >
                    <FaPlus className="text-[10px]" />
                    สร้างแบบทดสอบ
                  </button>
                </div>
              </div>

              {/* แจ้งเตือน */}
              <div className="mt-8">
                <SectionHeader title="แจ้งเตือน" />
                <div className="mt-3 border-t border-gray-200">
                  {notifications.map((n, i) => {
                    const Icon = NOTIF_ICON[n.icon];
                    return (
                      <div key={i} className="flex items-center gap-3 px-1 py-3 border-b last:border-b-0 border-gray-100">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                          <Icon className="text-gray-500 text-[13px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-800 truncate">{n.text}</div>
                        </div>
                        <div className="text-[11px] text-gray-400 shrink-0">{n.time}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ปุ่มลัด */}
              <div className="mt-8">
                <h2 className="text-[13px] font-medium text-gray-400 mb-3">ปุ่มลัด</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <QuickAction icon={FaBook} label="เพิ่มบทเรียน" onClick={() => navigate("/WorkCreate")} />
                  <QuickAction icon={FaRegClipboard} label="สร้างแบบทดสอบ" onClick={() => navigate("/QuestionCreate")} />
                  <QuickAction icon={FaBullhorn} label="เพิ่มประกาศ" onClick={() => navigate("/news")} />
                  <QuickAction icon={FaUsers} label="ดูรายชื่อนักเรียน" onClick={() => navigate("/student")} />
                </div>
              </div>
            </div>

            {/* ===== Right sidebar: calendar + agenda ===== */}
            <div className="w-full lg:w-[280px] shrink-0 space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="h-6 w-6 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center transition"
                  >
                    <FaChevronLeft className="text-[10px]" />
                  </button>
                  <div className="text-[12px] font-medium bg-pink-50 text-pink-600 px-3 py-1 rounded-full">
                    {THAI_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
                  </div>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="h-6 w-6 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center transition"
                  >
                    <FaChevronRight className="text-[10px]" />
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center text-[10px] text-gray-400 mb-1">
                  {WEEKDAYS.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>

                <MiniCalendarGrid
                  viewDate={viewDate}
                  today={today}
                  selectedDate={selectedDate}
                  appointmentCountByDate={appointmentCountByDate}
                  onSelectDate={setSelectedDate}
                />
              </div>

              <button
                type="button"
                onClick={() => navigate("/TeacherCalendar")}
                className="w-full h-10 rounded-full bg-pink-500 text-white text-[13px] font-medium hover:bg-pink-600 transition flex items-center justify-center gap-1.5"
              >
                <FaPlus className="text-[10px]" />
                เพิ่มนัดหมาย
              </button>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[13px] font-medium text-gray-900">
                      {selectedDate.getDate()} {THAI_MONTHS[selectedDate.getMonth()]}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {isSelectedToday ? "วันนี้" : `${selectedDate.getFullYear() + 543}`}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {appointmentsForSelectedDate.length === 0 && (
                    <div className="text-[12px] text-gray-400">ไม่มีนัดหมายในวันนี้</div>
                  )}

                  {appointmentsForSelectedDate.map((a) => {
                    const student = studentById(a.studentId);
                    const aptitude = aptitudeById(a.studentId);
                    return (
                      <div key={a.id} className="flex gap-3">
                        <div className="text-[11px] text-gray-400 w-10 shrink-0 pt-2">{a.time}</div>
                        <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 min-w-0">
                          <div className="text-[12px] font-medium text-gray-900 truncate">{student?.name}</div>
                          <div className="text-[11px] text-gray-500 truncate">{a.note}</div>
                          {aptitude?.completed && (
                            <div className="text-[10px] text-pink-600 truncate mt-1">
                              ถนัด: {aptitude.riasec}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/TeacherCalendar")}
                  className="mt-3 w-full text-center text-[12px] text-gray-400 hover:text-pink-600 transition"
                >
                  ดูปฏิทินทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const STAT_TONES = {
  pink: { bg: "bg-pink-50", icon: "border-pink-100 text-pink-600" },
  amber: { bg: "bg-amber-50", icon: "border-amber-100 text-amber-600" },
  rose: { bg: "bg-rose-50", icon: "border-rose-100 text-rose-600" },
  slate: { bg: "bg-gray-100", icon: "border-gray-200 text-gray-600" },
};

function ColorStat({ tone, icon: Icon, value, label, children, onClick }) {
  const Tag = onClick ? "button" : "div";
  const t = STAT_TONES[tone];
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-left rounded-2xl p-4 ${t.bg} transition ${onClick ? "hover:brightness-[0.97]" : ""}`}
    >
      <div className={`h-7 w-7 rounded-full bg-white border flex items-center justify-center ${t.icon}`}>
        <Icon className="text-[12px]" />
      </div>
      <div className="text-[19px] font-semibold text-gray-900 mt-2.5">{value}</div>
      <div className="text-[12px] text-gray-600">{label}</div>
      {children}
    </Tag>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-gray-200 p-4 text-left hover:bg-gray-50 hover:border-gray-300 transition"
    >
      <div className="h-8 w-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
        <Icon className="text-[13px]" />
      </div>
      <div className="text-[13px] text-gray-800 mt-3">{label}</div>
    </button>
  );
}

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[13px] font-medium text-gray-400">{title}</h2>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-[12px] text-gray-400 hover:text-pink-600 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3 h-28">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-gray-500">{d.value}</span>
          <div
            className="w-full rounded-t-md bg-pink-400 min-h-[2px]"
            style={{ height: `${(d.value / max) * 80}px` }}
          />
          <span className="text-[10px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-[12px] text-gray-600 mb-1">
            <span className="truncate">{d.label}</span>
            <span className="shrink-0 text-gray-400">{d.value} คน</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-pink-400 rounded-full"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniCalendarGrid({ viewDate, today, selectedDate, appointmentCountByDate, onSelectDate }) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-y-1">
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
            className="flex flex-col items-center justify-center gap-0.5"
          >
            <span
              className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] transition
                ${
                  isSelected
                    ? "bg-pink-500 text-white"
                    : isToday
                    ? "text-pink-600 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              {day}
            </span>
            <span
              className={`h-1 w-1 rounded-full ${
                count > 0 ? (isSelected ? "bg-pink-500" : "bg-pink-400") : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import SidebarNav from "../nav.jsx";
import Header from "../Header.jsx";
import {
  FaChevronLeft,
  FaChevronRight,
  FaUsers,
  FaUserFriends,
  FaRegClipboard,
  FaBullhorn,
  FaPlus,
  FaCheckCircle,
  FaCalendarCheck,
  FaCommentDots,
  FaChalkboardTeacher,
  FaTimes,
} from "react-icons/fa";
import Select from "react-select";
import {
  getStudent, getEnrollments, getClasses, getTeacher, getFeedPosts, getTypeResults, getAppointments, createClass, getAcademicYears, createAcademicYear, getConsultationRequests,
  getAssessmentsList, getTeachingSchedule, addTeachingPeriod, removeTeachingPeriod,
} from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { WEEKDAY_OPTIONS, PERIOD_OPTIONS } from "../utils/teachingScheduleStore.js";

// แปลงแถวดิบจาก GET /teaching-schedule (schedule_id, teacher_user_id, weekday, ...) ให้เป็น shape เดิม {id, day, ...} ที่หน้านี้ใช้อยู่แล้ว
const normalizeSchedule = (raw) => ({
  id: raw.schedule_id,
  teacherId: raw.teacher_user_id,
  day: raw.weekday,
  period: raw.period,
  classroom: raw.classroom,
  subject: raw.subject,
});
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";
import { gradeLabel } from "../utils/gradeLabel.js";

const CURRENT_TEACHER_ID = getCurrentUser()?.user_id ?? "2";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const PERIODS = PERIOD_OPTIONS;

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatNotifTime = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

// ยังไม่มี backend endpoint แจ้งเตือนรวมศูนย์ (ไม่มีตาราง/route ชื่อ notification เลย) — ประกอบขึ้นเองจากข้อมูลจริงที่มีอยู่แล้ว 2 แหล่ง:
// ผลทำ RIASEC ล่าสุด (user_type_result) + นัดหมายที่สร้างล่าสุด (appointment) เรียงตามเวลาจริงแล้วเอา 3 อันดับแรก
const NOTIF_ICON = { quiz: FaCheckCircle, appointment: FaCalendarCheck };

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const [appointments, setAppointments] = useState([]);
  const [appointmentNotifications, setAppointmentNotifications] = useState([]);

  // ดึงนัดหมายจริงของครูคนนี้ (ยกเลิกแล้วไม่แสดง) — student_name join มาให้จาก backend แล้ว
  useEffect(() => {
    getAppointments({ teacher_user_id: CURRENT_TEACHER_ID })
      .then((list) => {
        const active = (list || []).filter((a) => a.status !== "cancelled");
        setAppointments(
          active.map((a) => ({
            id: a.appointment_id,
            date: toDateKey(new Date(a.appointment_date)),
            time: a.appointment_time,
            studentName: a.student_name || "-",
            note: a.note,
          }))
        );
        setAppointmentNotifications(
          active.map((a) => ({
            type: "appointment",
            text: `นัดหมายใหม่กับ ${a.student_name || "-"}${a.note ? `: ${a.note}` : ""}`,
            time: a.created_at,
          }))
        );
      })
      .catch((err) => console.error("โหลดนัดหมายไม่สำเร็จ:", err));
  }, []);

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

  const [students, setStudents] = useState([]);
  const [classroomBreakdown, setClassroomBreakdown] = useState([]);
  const [teacherName, setTeacherName] = useState("");
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [consultationCount, setConsultationCount] = useState(0);
  const [academicYears, setAcademicYears] = useState([]);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [quizNotifications, setQuizNotifications] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [teachingSchedule, setTeachingSchedule] = useState([]);

  const loadTeachingSchedule = () =>
    getTeachingSchedule({ teacher_user_id: CURRENT_TEACHER_ID })
      .then((data) => setTeachingSchedule((data || []).map(normalizeSchedule)))
      .catch(() => setTeachingSchedule([]));

  useEffect(() => {
    getConsultationRequests({ teacher_user_id: CURRENT_TEACHER_ID })
      .then((data) => setConsultationCount((data || []).length))
      .catch(() => setConsultationCount(0));
    // "แบบทดสอบที่สร้าง" — เฉพาะที่ครูคนนี้สร้างเอง (ไม่นับ Holland/RIASEC เพราะเป็นแบบทดสอบของระบบ ไม่ใช่ที่ครูคนนี้สร้างเอง ดู AssessmentList.jsx)
    getAssessmentsList({ created_by_user_id: CURRENT_TEACHER_ID })
      .then((data) => setAssessmentCount((data || []).length))
      .catch(() => setAssessmentCount(0));
    loadTeachingSchedule();
  }, []);

  // ดึงจำนวนนักเรียนจริง + สัดส่วนต่อระดับชั้นจริง + ชื่อครูที่ login อยู่ + รายชื่อปีการศึกษาจริง (ใช้ทำ dropdown ตอนสร้างห้องเรียน)
  // + ประกาศจริงที่ครูคนนี้โพสต์ (จาก /feed-posts กรอง author_id) + ผลทำ RIASEC ล่าสุด (ใช้ประกอบ "แจ้งเตือนล่าสุด")
  // (ตอนนี้ backend ยังไม่มีการผูกนักเรียน "ที่ดูแล" เป็นรายครู จึงนับนักเรียน/ผล RIASEC ทั้งหมดในระบบไปก่อน)
  useEffect(() => {
    const load = async () => {
      try {
        const [studentData, enrollData, gradeData, teacherData, feedPostData, yearData, typeResultData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTeacher().catch(() => []),
          getFeedPosts().catch(() => []),
          getAcademicYears().catch(() => []),
          getTypeResults().catch(() => []),
        ]);

        setAcademicYears(yearData || []);
        if ((yearData || []).length > 0) {
          setClassForm((prev) => (prev.yearId ? prev : { ...prev, yearId: String(yearData[0].year_id) }));
        }

        const gradeByUserId = new Map();
        enrollData.forEach((e) => {
          if (!gradeByUserId.has(String(e.user_user_id))) gradeByUserId.set(String(e.user_user_id), e.grade_idgrade);
        });
        const gradesById = new Map(gradeData.map((g) => [String(g.idgrade), g]));
        const studentNameById = new Map(studentData.map((s) => [String(s.user_id), s.fullname]));

        setStudents(
          studentData.map((s) => {
            const grade = gradesById.get(String(gradeByUserId.get(String(s.user_id))));
            return { id: s.user_id, name: s.fullname, classroom: grade ? `ม.${gradeLabel(grade)}` : "-", email: s.email };
          })
        );

        const breakdownMap = new Map();
        gradeByUserId.forEach((gradeId) => {
          const grade = gradesById.get(String(gradeId));
          const label = grade ? `ม.${grade.grade_name}` : "ไม่ทราบชั้น";
          breakdownMap.set(label, (breakdownMap.get(label) || 0) + 1);
        });
        setClassroomBreakdown(Array.from(breakdownMap, ([label, value]) => ({ label, value })));

        const me = teacherData.find((t) => String(t.user_id) === String(CURRENT_TEACHER_ID));
        setTeacherName(me?.fullname || "");

        // ห้องที่ครูคนนี้สอนจริง (grades.teacher_user_id) — ใช้กรอง dropdown "ห้องเรียน" ตอนเพิ่มคาบสอน กันเห็นห้องของครูคนอื่น
        setMyClasses((gradeData || []).filter((g) => String(g.teacher_user_id) === String(CURRENT_TEACHER_ID)));

        setAnnouncementCount((feedPostData || []).filter((p) => String(p.author_id) === String(CURRENT_TEACHER_ID)).length);

        setQuizNotifications(
          (typeResultData || []).map((r) => ({
            type: "quiz",
            text: `${studentNameById.get(String(r.user_user_id)) || "นักเรียน"} ทำแบบทดสอบ RIASEC เสร็จแล้ว`,
            time: r.test_date,
          }))
        );
      } catch (err) {
        console.error("โหลดข้อมูลหน้าหลักครูไม่สำเร็จ:", err);
      }
    };
    load();
  }, []);

  const notifications = useMemo(() => {
    return [...quizNotifications, ...appointmentNotifications]
      .filter((n) => n.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 3);
  }, [quizNotifications, appointmentNotifications]);

  const todaysClasses = useMemo(() => {
    const todayIndex = (today.getDay() + 6) % 7; // 0=จันทร์...6=อาทิตย์
    return teachingSchedule
      .filter((s) => s.day === todayIndex)
      .sort((a, b) => a.period - b.period)
      .map((s) => ({ ...s, time: PERIODS.find((p) => p.period === s.period)?.time }));
  }, [today, teachingSchedule]);

  const [showAddPeriodModal, setShowAddPeriodModal] = useState(false);
  const [showAllPeriodsModal, setShowAllPeriodsModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({ day: null, period: null, classroom: "" });
  const [savingPeriod, setSavingPeriod] = useState(false);

  const openAddPeriodModal = () => {
    const todayIndex = (today.getDay() + 6) % 7;
    setPeriodForm({ day: todayIndex <= 4 ? todayIndex : 0, period: 1, classroom: myClasses[0] ? gradeLabel(myClasses[0]) : "" });
    setShowAddPeriodModal(true);
  };

  const findScheduleConflict = (day, period) =>
    teachingSchedule.find((s) => s.day === day && s.period === period) || null;

  const handleAddPeriod = async () => {
    if (periodForm.day == null || !periodForm.period || !periodForm.classroom) return;

    const dayLabel = WEEKDAY_OPTIONS.find((w) => w.value === periodForm.day)?.label || "";
    const periodInfo = PERIODS.find((p) => p.period === periodForm.period);
    const periodLabel = `คาบ ${periodForm.period}${periodInfo ? ` (${periodInfo.time})` : ""}`;

    const conflict = findScheduleConflict(periodForm.day, periodForm.period);
    if (conflict) {
      Swal.fire({
        icon: "warning",
        title: "คาบนี้มีอยู่แล้ว",
        html: `${dayLabel} ${periodLabel} มีคาบสอนของห้อง <b>${conflict.classroom}</b> อยู่แล้ว<br/>ไม่สามารถเพิ่มคาบสอนซ้ำในวันและคาบเดียวกันได้`,
        confirmButtonText: "รับทราบ",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      icon: "question",
      title: "ยืนยันเพิ่มคาบสอนนี้?",
      html: `${dayLabel} ${periodLabel}<br/>ห้อง <b>${periodForm.classroom}</b>`,
      showCancelButton: true,
      confirmButtonText: "เพิ่มคาบสอน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ec4899",
    });
    if (!confirmResult.isConfirmed) return;

    setSavingPeriod(true);
    try {
      await addTeachingPeriod({
        teacher_user_id: CURRENT_TEACHER_ID,
        weekday: periodForm.day,
        period: periodForm.period,
        classroom: periodForm.classroom,
      });
      await loadTeachingSchedule();
      setShowAddPeriodModal(false);
    } catch (err) {
      Swal.fire({ icon: "error", title: "เพิ่มคาบสอนไม่สำเร็จ", text: err.response?.data?.message || err.message || "ลองใหม่อีกครั้ง" });
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleRemovePeriod = async (id) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ลบคาบสอนนี้?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await removeTeachingPeriod(id);
      await loadTeachingSchedule();
    } catch (err) {
      Swal.fire({ icon: "error", title: "ลบคาบสอนไม่สำเร็จ", text: err.response?.data?.message || "ลองใหม่อีกครั้ง" });
    }
  };

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const isSelectedToday = selectedKey === toDateKey(today);

  const [showCreateClassroomModal, setShowCreateClassroomModal] = useState(false);
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const [classForm, setClassForm] = useState({
    gradeLevel: "ม.1",
    section: "",
    track: "",
    yearText: "",
    semester: "1",
  });

  const openCreateClassroomModal = () => {
    setClassForm((prev) => ({ ...prev, section: "", track: "" }));
    setShowCreateClassroomModal(true);
  };

  // หาปี พ.ศ. ที่พิมพ์มาว่ามีอยู่แล้วในระบบไหม (เทียบ year_name) ถ้าไม่มีค่อยสร้างแถวใหม่จริงใน DB ตอนกดยืนยันสร้างห้อง
  const resolveYearId = async (yearText) => {
    const existing = academicYears.find((y) => String(y.year_name).trim() === yearText);
    if (existing) return existing.year_id;

    const created = await createAcademicYear(yearText);
    setAcademicYears((prev) => [created, ...prev]);
    return created.year_id;
  };

  const handleSubmitCreateClassroom = async () => {
    const yearText = classForm.yearText.trim();
    if (!/^\d{1,4}$/.test(yearText)) {
      Swal.fire({ icon: "warning", title: "กรอกปีการศึกษาเป็นตัวเลข", text: "เช่น 2569" });
      return;
    }

    const confirmResult = await Swal.fire({
      icon: "question",
      title: "ยืนยันสร้างห้องเรียนนี้?",
      html: `${classForm.gradeLevel}/${classForm.section || "-"}${classForm.track ? ` (${classForm.track})` : ""}<br/>ปีการศึกษา ${yearText} • ภาคเรียนที่ ${classForm.semester}`,
      showCancelButton: true,
      confirmButtonText: "สร้างห้องเรียน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ec4899",
    });
    if (!confirmResult.isConfirmed) return;

    setCreatingClassroom(true);
    try {
      const yearId = await resolveYearId(yearText);
      const created = await createClass({
        grade_name: classForm.gradeLevel.replace("ม.", ""),
        section: classForm.section.trim(),
        track: classForm.track.trim() || null,
        year_year_id: yearId,
        semester: classForm.semester,
        teacher_user_id: CURRENT_TEACHER_ID,
      });
      setShowCreateClassroomModal(false);
      await Swal.fire({
        icon: "success",
        title: "สร้างห้องเรียนสำเร็จ",
        html: created?.class_code
          ? `รหัสเข้าชั้นเรียน: <b style="letter-spacing:2px">${created.class_code}</b><br/><span style="font-size:13px;color:#6b7280">ให้นักเรียนกรอกรหัสนี้ที่หน้าแรกเพื่อเข้าร่วมห้องเรียนนี้</span>`
          : undefined,
        confirmButtonText: "ตกลง",
      });
      navigate(created?.idgrade ? `/classroom/${created.idgrade}` : "/classroom");
    } catch (err) {
      console.error("สร้างห้องเรียนไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "สร้างห้องเรียนไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    } finally {
      setCreatingClassroom(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 min-w-0">
        <Header />

        <main className="max-w-7xl mx-auto px-6 md:px-8 pt-24 pb-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ===== Main content ===== */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="page-title">สวัสดีคุณครู{teacherName ? ` ${teacherName}` : ""}</h1>
                  <p className="page-subtitle mt-0.5">ภาพรวมงานแนะแนวและเนื้อหาที่คุณดูแล</p>
                </div>
                <button
                  type="button"
                  onClick={openCreateClassroomModal}
                  className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[13px] font-semibold flex items-center gap-2 shrink-0"
                >
                  <FaChalkboardTeacher size={14} /> สร้างห้องเรียน
                </button>
              </div>

              {/* การ์ดสรุป */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <ColorStat
                  tone="slate"
                  icon={FaUsers}
                  value={`${students.length} คน`}
                  label="นักเรียนที่ดูแล"
                >
                  <div className="text-[13px] text-gray-500 mt-2 truncate">
                    {classroomBreakdown.map((c) => `${c.label} ${c.value} คน`).join(" • ")}
                  </div>
                </ColorStat>

                <ColorStat
                  tone="amber"
                  icon={FaRegClipboard}
                  value={`${assessmentCount} ชุด`}
                  label="แบบทดสอบที่สร้าง"
                  onClick={() => navigate("/assessments")}
                />

                <ColorStat
                  tone="pink"
                  icon={FaCommentDots}
                  value={`${consultationCount} รายการ`}
                  label="คำขอปรึกษา"
                  onClick={() => navigate("/consultations")}
                />

                <ColorStat
                  tone="rose"
                  icon={FaBullhorn}
                  value={`${announcementCount} ประกาศ`}
                  label="ประกาศที่เผยแพร่"
                  onClick={() => navigate("/newsfeed")}
                />
              </div>

              {/* ปุ่มลัด */}
              <div className="mt-6">
                <h2 className="text-[15px] font-semibold text-black mb-2">ปุ่มลัด</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <QuickAction icon={FaBullhorn} label="สร้างประกาศ" onClick={() => navigate("/newsfeed")} />
                  <QuickAction icon={FaRegClipboard} label="สร้างแบบประเมิน" onClick={() => navigate("/assessments/create")} />
                  <QuickAction icon={FaCommentDots} label="คำขอปรึกษา" onClick={() => navigate("/consultations")} />
                  <QuickAction icon={FaUserFriends} label="ดูชุมนุม YC" onClick={() => navigate("/yc")} />
                </div>
              </div>

              {/* วันนี้: คาบสอน + แจ้งเตือน */}
              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div>
                  <SectionHeader title="คาบสอนวันนี้" />
                  <div className="mt-2 border-t border-gray-200">
                    {todaysClasses.length === 0 && (
                      <div className="py-3">
                        <div className="text-[15px] text-gray-400 mb-2">ไม่มีคาบสอนวันนี้</div>
                        <button
                          type="button"
                          onClick={openAddPeriodModal}
                          className="h-9 px-3.5 rounded-full border border-pink-200 bg-pink-50 text-pink-700 text-[14px] font-medium hover:bg-pink-100 flex items-center gap-1.5"
                        >
                          <FaPlus size={11} /> เพิ่มคาบสอน
                        </button>
                      </div>
                    )}
                    {todaysClasses.map((c) => (
                      <div key={c.id} className="group flex items-center justify-between gap-3 px-1 py-2.5 border-b last:border-b-0 border-gray-100">
                        <div className="min-w-0">
                          <div className="text-gray-900 truncate">
                            {c.subject}
                            {c.classroom && ` • ${c.classroom}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-[14px] text-gray-400">{c.time}</div>
                          <button
                            type="button"
                            onClick={() => handleRemovePeriod(c.id)}
                            className="w-6 h-6 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 items-center justify-center hidden group-hover:flex bg-transparent"
                            title="ลบคาบสอนนี้"
                          >
                            <FaTimes size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {todaysClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={openAddPeriodModal}
                        className="mt-2 text-[14px] text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1.5"
                      >
                        <FaPlus size={10} /> เพิ่มคาบสอน
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAllPeriodsModal(true)}
                      className="mt-3 w-full text-center text-[14px] text-pink-600 hover:text-pink-700 font-medium transition"
                    >
                      ดูคาบสอนทั้งหมด
                    </button>
                  </div>
                </div>

                <div>
                  <SectionHeader title="แจ้งเตือนล่าสุด" />
                  <div className="mt-2 border-t border-gray-200">
                    {notifications.length === 0 && (
                      <div className="text-[15px] text-gray-400 py-3">ยังไม่มีความเคลื่อนไหวล่าสุด</div>
                    )}
                    {notifications.map((n, i) => {
                      const Icon = NOTIF_ICON[n.type];
                      return (
                        <div key={i} className="flex items-center gap-2.5 px-1 py-2.5 border-b last:border-b-0 border-gray-100">
                          <Icon className="text-gray-400 text-[14px] shrink-0" />
                          <div className="min-w-0 flex-1 text-gray-700 truncate">{n.text}</div>
                          <div className="text-[13px] text-gray-400 shrink-0">{formatNotifTime(n.time)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Right sidebar: calendar + agenda ===== */}
            <div className="w-full lg:w-[340px] shrink-0 space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center transition"
                  >
                    <FaChevronLeft className="text-[16px]" />
                  </button>
                  <div className="text-[15px] font-medium bg-pink-50 text-pink-600 px-3.5 py-1.5 rounded-full">
                    {THAI_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
                  </div>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 flex items-center justify-center transition"
                  >
                    <FaChevronRight className="text-[16px]" />
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center text-[13px] text-gray-400 mb-1.5">
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
                className="w-full h-10 rounded-full bg-pink-500 text-white text-[15px] font-medium hover:bg-pink-600 transition flex items-center justify-center gap-1.5"
              >
                <FaPlus className="text-[14px]" />
                เพิ่มนัดหมาย
              </button>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[15px] font-medium text-gray-900">
                      {selectedDate.getDate()} {THAI_MONTHS[selectedDate.getMonth()]}
                    </div>
                    <div className="text-[13px] text-gray-400">
                      {isSelectedToday ? "วันนี้" : `${selectedDate.getFullYear() + 543}`}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {appointmentsForSelectedDate.length === 0 && (
                    <div className="text-[14px] text-gray-400">ไม่มีนัดหมายในวันนี้</div>
                  )}

                  {appointmentsForSelectedDate.map((a) => {
                    return (
                      <div key={a.id} className="flex gap-3">
                        <div className="text-[13px] text-gray-400 w-10 shrink-0 pt-2">{a.time}</div>
                        <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 min-w-0">
                          <div className="text-[14px] font-medium text-gray-900 truncate">{a.studentName}</div>
                          <div className="text-[13px] text-gray-500 truncate">{a.note}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/TeacherCalendar")}
                  className="mt-3 w-full text-center text-[14px] text-pink-600 hover:text-pink-700 font-medium transition"
                >
                  ดูปฏิทินทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showCreateClassroomModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateClassroomModal(false)} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-110 max-w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                <FaChalkboardTeacher className="text-gray-500" size={15} /> สร้างห้องเรียน
              </h3>
              <button type="button" onClick={() => setShowCreateClassroomModal(false)} className="text-gray-400 hover:text-gray-700 bg-transparent">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="px-5 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ระดับชั้น</label>
                  <Select
                    value={{ value: classForm.gradeLevel, label: classForm.gradeLevel }}
                    onChange={(opt) => setClassForm((prev) => ({ ...prev, gradeLevel: opt.value }))}
                    options={["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"].map((g) => ({ value: g, label: g }))}
                    isSearchable={false}
                    styles={bigFilterSelectStyles}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ห้อง</label>
                  <input
                    value={classForm.section}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, section: e.target.value }))}
                    placeholder="เช่น 1"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-[13.5px] outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">สายการเรียน (ถ้ามี)</label>
                <input
                  value={classForm.track}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, track: e.target.value }))}
                  placeholder="เช่น วิทย์-คณิต, ศิลป์"
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-[13.5px] outline-none focus:border-pink-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ปีการศึกษา (พ.ศ.)</label>
                  <input
                    value={classForm.yearText}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                      setClassForm((prev) => ({ ...prev, yearText: digitsOnly }));
                    }}
                    inputMode="numeric"
                    placeholder="เช่น 2569"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-[13.5px] outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ภาคเรียน</label>
                  <Select
                    value={{ value: classForm.semester, label: `ภาคเรียนที่ ${classForm.semester}` }}
                    onChange={(opt) => setClassForm((prev) => ({ ...prev, semester: opt.value }))}
                    options={[
                      { value: "1", label: "ภาคเรียนที่ 1" },
                      { value: "2", label: "ภาคเรียนที่ 2" },
                    ]}
                    isSearchable={false}
                    styles={bigFilterSelectStyles}
                  />
                </div>
              </div>

              <div className="text-[12.5px] text-gray-500">
                ครูผู้ดูแล: <span className="text-gray-800 font-medium">{teacherName || "-"}</span>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateClassroomModal(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14px] font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitCreateClassroom}
                disabled={!classForm.section.trim() || !classForm.yearText.trim() || creatingClassroom}
                className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14px] font-semibold"
              >
                {creatingClassroom ? "กำลังสร้าง..." : "สร้างห้องเรียน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPeriodModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddPeriodModal(false)} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-120 max-w-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-[18px] font-bold text-gray-900">เพิ่มคาบสอน</h3>
              <button type="button" onClick={() => setShowAddPeriodModal(false)} className="text-gray-400 hover:text-gray-700 bg-transparent">
                <FaTimes size={18} />
              </button>
            </div>

            <div className="px-6 py-6 flex flex-col gap-5">
              <div>
                <label className="block text-[15px] font-medium text-gray-700 mb-2">วัน</label>
                <Select
                  styles={bigFilterSelectStyles}
                  value={WEEKDAY_OPTIONS.find((o) => o.value === periodForm.day) || null}
                  onChange={(opt) => setPeriodForm((prev) => ({ ...prev, day: opt.value }))}
                  options={WEEKDAY_OPTIONS}
                  isSearchable={false}
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-700 mb-2">คาบ</label>
                <Select
                  styles={bigFilterSelectStyles}
                  value={
                    periodForm.period
                      ? { value: periodForm.period, label: `คาบ ${periodForm.period} (${PERIODS.find((p) => p.period === periodForm.period)?.time})` }
                      : null
                  }
                  onChange={(opt) => setPeriodForm((prev) => ({ ...prev, period: opt.value }))}
                  options={PERIODS.map((p) => {
                    const taken = periodForm.day != null ? findScheduleConflict(periodForm.day, p.period) : null;
                    return {
                      value: p.period,
                      label: `คาบ ${p.period} (${p.time})${taken ? ` — มีคาบสอนแล้ว (${taken.classroom})` : ""}`,
                      isDisabled: !!taken,
                    };
                  })}
                  isOptionDisabled={(opt) => opt.isDisabled}
                  isSearchable={false}
                />
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-700 mb-2">ห้องเรียน</label>
                {myClasses.length === 0 ? (
                  <div className="text-[15px] text-gray-400 py-2">ยังไม่มีห้องเรียนที่คุณสอน</div>
                ) : (
                  <Select
                    styles={bigFilterSelectStyles}
                    value={periodForm.classroom ? { value: periodForm.classroom, label: periodForm.classroom } : null}
                    onChange={(opt) => setPeriodForm((prev) => ({ ...prev, classroom: opt.value }))}
                    options={myClasses.map((c) => ({ value: gradeLabel(c), label: gradeLabel(c) }))}
                    isSearchable={false}
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddPeriodModal(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[15px] font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddPeriod}
                disabled={periodForm.day == null || !periodForm.period || !periodForm.classroom || savingPeriod}
                className="flex-1 h-12 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[15px] font-semibold"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllPeriodsModal && (
        <AllPeriodsModal
          schedule={teachingSchedule}
          onClose={() => setShowAllPeriodsModal(false)}
          onRemove={handleRemovePeriod}
        />
      )}
    </div>
  );
}

function AllPeriodsModal({ schedule, onClose, onRemove }) {
  const grouped = WEEKDAY_OPTIONS.map((w) => ({
    ...w,
    items: schedule.filter((s) => s.day === w.value).sort((a, b) => a.period - b.period),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-120 max-w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <h3 className="text-[18px] font-bold text-gray-900">คาบสอนทั้งหมด</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-transparent">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          {grouped.length === 0 ? (
            <div className="text-[15px] text-gray-400 text-center py-6">ยังไม่มีคาบสอนที่เพิ่มไว้</div>
          ) : (
            <div className="flex flex-col gap-5">
              {grouped.map((g) => (
                <div key={g.value}>
                  <div className="text-[14.5px] font-semibold text-pink-600 mb-2">{g.label}</div>
                  <div className="flex flex-col gap-2">
                    {g.items.map((item) => {
                      const periodInfo = PERIODS.find((p) => p.period === item.period);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-[15.5px] text-gray-900 truncate">
                              {item.subject}
                              {item.classroom && ` • ${item.classroom}`}
                            </div>
                            <div className="text-[13.5px] text-gray-400">คาบ {item.period} ({periodInfo?.time})</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0 bg-transparent"
                            title="ลบคาบสอนนี้"
                          >
                            <FaTimes size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[15px] font-medium"
          >
            ปิด
          </button>
        </div>
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

function ColorStat({ tone, icon, value, label, children, onClick }) {
  const Icon = icon;
  const Tag = onClick ? "button" : "div";
  const t = STAT_TONES[tone];
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`h-36 flex flex-col text-left rounded-2xl p-3.5 ${t.bg} transition ${onClick ? "hover:brightness-[0.97]" : ""}`}
    >
      <div className={`h-7 w-7 rounded-full bg-white border flex items-center justify-center shrink-0 ${t.icon}`}>
        <Icon className="text-[14px]" />
      </div>
      <div className="text-[21px] font-semibold text-gray-900 mt-2 shrink-0">{value}</div>
      <div className="text-[14px] text-gray-600 shrink-0">{label}</div>
      {children}
    </Tag>
  );
}

function QuickAction({ icon, label, onClick }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-gray-200 p-3.5 text-left hover:bg-gray-50 hover:border-gray-300 transition"
    >
      <div className="h-8 w-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
        <Icon className="text-[15px]" />
      </div>
      <div className="text-[15px] text-gray-800 mt-2.5">{label}</div>
    </button>
  );
}

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-semibold text-black">{title}</h2>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-[14px] text-gray-400 hover:text-pink-600 transition"
        >
          {actionLabel}
        </button>
      )}
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
    <div className="grid grid-cols-7 gap-y-1.5">
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
            className="flex flex-col items-center justify-center gap-1"
          >
            <span
              className={`h-9 w-9 rounded-full flex items-center justify-center text-[15px] transition
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
              className={`h-1.5 w-1.5 rounded-full ${
                count > 0 ? (isSelected ? "bg-pink-500" : "bg-pink-400") : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

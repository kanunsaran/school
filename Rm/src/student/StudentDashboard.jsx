import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../navstudent";
import Header from "../Header";
import Swal from "sweetalert2";
import {
  FaRegClipboard,
  FaRegNewspaper,
  FaUsers,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaKey,
  FaTimes,
  FaBookOpen,
} from "react-icons/fa";
import {
  getStudentGeneralInfo,
  getStudent,
  getEnrollments,
  getClasses,
  getGoals,
  getTypeResults,
  getTypes,
  getFaculties,
  getFeedPosts,
  getAssAll,
  getAssignmentClasses,
  getAllSubmissions,
  getAppointments,
  replyAppointment,
  joinClassByCode,
} from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { formatThaiTimeLabel } from "../utils/feedShared.js";

// ใช้ user จาก session จริงหลัง login ถ้ามี — ถ้ายังไม่ได้ login (เช่น เข้าตรงๆ ตอนทดสอบ) fallback เป็น placeholder เดิม
const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? "1";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const THAI_PREFIXES = ["เด็กชาย", "เด็กหญิง", "นางสาว", "นาย", "นาง", "ด.ช.", "ด.ญ."];
// ตัดแค่คำนำหน้าออก เหลือชื่อ+นามสกุลเต็ม ไว้ใช้ทักทายแบบเป็นทางการกว่าการโชว์แค่ชื่อจริง
const nameWithoutPrefix = (fullname) => {
  if (!fullname) return "";
  let name = fullname.trim();
  const prefix = THAI_PREFIXES.find((p) => name.startsWith(p));
  if (prefix) name = name.slice(prefix.length).trim();
  return name;
};
const firstNameFromFullname = (fullname) => nameWithoutPrefix(fullname).split(" ")[0] || nameWithoutPrefix(fullname);

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);

  // ⚠️ เข้าครั้งแรก (ยังไม่เคยกรอกข้อมูลส่วนตัว) ให้ไปกรอกก่อนถึงจะเข้าหน้าหลักได้ — เช็คจาก backend จริงแล้ว (เดิมเช็คจาก localStorage)
  useEffect(() => {
    getStudentGeneralInfo(CURRENT_STUDENT_ID)
      .then((data) => {
        if (!data) navigate("/studentinfo", { replace: true });
      })
      .catch((err) => console.error("เช็คสถานะข้อมูลนักเรียนไม่สำเร็จ:", err));
  }, [navigate]);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const [teacherAppointments, setTeacherAppointments] = useState([]);

  // ดึงนัดหมายจริงของนักเรียนคนนี้ (ยกเลิกแล้วไม่แสดง)
  useEffect(() => {
    getAppointments({ student_user_id: CURRENT_STUDENT_ID })
      .then((list) => {
        setTeacherAppointments(
          (list || [])
            .filter((a) => a.status !== "cancelled")
            .map((a) => ({
              id: a.appointment_id,
              date: toDateKey(new Date(a.appointment_date)),
              time: a.appointment_time,
              teacher: a.teacher_name || "ครู",
              note: a.note,
              replies: (a.replies || []).map((r) => ({
                author: r.author_name || "-",
                text: r.content,
                time: new Date(r.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
              })),
            }))
        );
      })
      .catch((err) => console.error("โหลดนัดหมายไม่สำเร็จ:", err));
  }, []);

  const appointmentCountByDate = useMemo(() => {
    const map = {};
    for (const a of teacherAppointments) {
      map[a.date] = (map[a.date] || 0) + 1;
    }
    return map;
  }, [teacherAppointments]);

  const selectedKey = toDateKey(selectedDate);
  const appointmentsForSelectedDate = teacherAppointments
    .filter((a) => a.date === selectedKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  // นัดหมายที่จะถึง — เรียงตามวันเวลาจริงจากวันนี้เป็นต้นไป (ไม่ขึ้นกับวันที่เลือกในปฏิทิน) เอามาแค่ 8 รายการแรกเหมือนฝั่งครู
  const upcomingAppointments = teacherAppointments
    .filter((a) => a.date >= toDateKey(today))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8);

  const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState("");
  const [joiningClass, setJoiningClass] = useState(false);

  const openJoinClassModal = () => {
    setClassCodeInput("");
    setShowJoinClassModal(true);
  };

  // กรอกรหัสจากครู (grades.class_code) → สร้างแถว enroll จริงผูกนักเรียนคนนี้เข้าห้องนั้น (ดู POST /enroll/join)
  const handleSubmitJoinClass = async () => {
    if (!classCodeInput.trim()) return;
    setJoiningClass(true);
    try {
      const result = await joinClassByCode(classCodeInput.trim(), CURRENT_STUDENT_ID);
      setShowJoinClassModal(false);
      await Swal.fire({
        icon: "success",
        title: "เข้าร่วมชั้นเรียนสำเร็จ",
        text: result?.grade ? `เข้าร่วมห้อง ม.${result.grade.grade_name}/${result.grade.section} แล้ว` : undefined,
        confirmButtonText: "ตกลง",
      });
      window.location.reload();
    } catch (err) {
      console.error("เข้าร่วมชั้นเรียนไม่สำเร็จ:", err);
      const message = err.response?.data?.message || "รหัสไม่ถูกต้อง หรือเกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
      Swal.fire({ icon: "error", title: "เข้าร่วมไม่สำเร็จ", text: message });
    } finally {
      setJoiningClass(false);
    }
  };

  const [student, setStudent] = useState({ firstName: "", fullName: "", classroom: "", room: "", number: "" });
  const [news, setNews] = useState([]);
  const [goal, setGoal] = useState(null);
  const [topSkill, setTopSkill] = useState(null);
  const [pendingWorks, setPendingWorks] = useState([]);
  const [subject, setSubject] = useState({ name: "ห้องเรียนของฉัน", faculty: "", completed: 0, total: 0 });

  // ดึงข้อมูลจริงของนักเรียนที่ login อยู่: ตัวตน/ห้องเรียน/เป้าหมายล่าสุด/ผล Holland ล่าสุด/ข่าวล่าสุด/งานที่ยังไม่ได้ส่ง
  useEffect(() => {
    const load = async () => {
      try {
        const [students, enrollments, classes, goals, typeResults, types, faculties, feedPosts, assignments, assignmentClasses, submissions] =
          await Promise.all([
            getStudent().catch(() => []),
            getEnrollments().catch(() => []),
            getClasses().catch(() => []),
            getGoals().catch(() => []),
            getTypeResults().catch(() => []),
            getTypes().catch(() => []),
            getFaculties().catch(() => []),
            getFeedPosts().catch(() => []),
            getAssAll().catch(() => []),
            getAssignmentClasses().catch(() => []),
            getAllSubmissions().catch(() => []),
          ]);

        const me = students.find((s) => String(s.user_id) === String(CURRENT_STUDENT_ID));
        const enroll = enrollments.find((e) => String(e.user_user_id) === String(CURRENT_STUDENT_ID));
        const grade = enroll ? classes.find((c) => String(c.idgrade) === String(enroll.grade_idgrade)) : null;
        setStudent({
          firstName: firstNameFromFullname(me?.fullname) || "นักเรียน",
          fullName: nameWithoutPrefix(me?.fullname) || "นักเรียน",
          classroom: grade ? `ม.${grade.grade_name}` : "-",
          room: grade?.section ?? "-",
          number: enroll?.seat_no ?? "-",
        });

        const myGoal = goals
          .filter((g) => String(g.user_user_id) === String(CURRENT_STUDENT_ID))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        setGoal(myGoal ? { goal: myGoal.career_field || myGoal.goal_text, university: myGoal.faculty_name } : null);

        const myTypeResult = typeResults
          .filter((r) => String(r.user_user_id) === String(CURRENT_STUDENT_ID))
          .sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0];
        const myType = myTypeResult ? types.find((t) => String(t.type_id) === String(myTypeResult.type_type_id)) : null;
        const recommendedFaculty = myTypeResult
          ? faculties.find((f) => String(f.faculty_id) === String(myTypeResult.recommended_faculty_id))
          : null;
        setTopSkill(myType ? { skill: myType.type_name, faculty: recommendedFaculty?.faculty_name } : null);

        // ข่าวสารล่าสุด — ดึงจาก feed-posts เดียวกับที่หน้า /post (กิจกรรม) ใช้แสดงจริง (author_name ติดมากับ record อยู่แล้ว ไม่ต้อง join เอง)
        const latestPost = [...feedPosts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        if (latestPost) {
          setNews([
            {
              author: latestPost.author_name || "ไม่ทราบผู้เขียน",
              date: new Date(latestPost.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
              content: latestPost.title || latestPost.content,
            },
          ]);
        }

        // งานที่ยังไม่ได้ส่ง = ใบงานของ "ห้องเรียนจริงที่นักเรียนคนนี้อยู่" (ผ่านตาราง assignment_classes เดียวกับที่หน้า /classwork ใช้กรอง) ที่ยังไม่มีแถวใน submissions
        const myGradeId = grade?.idgrade ?? enroll?.grade_idgrade ?? null;
        const myAssIds = new Set(
          assignmentClasses.filter((ac) => String(ac.grade_id) === String(myGradeId)).map((ac) => String(ac.ass_id))
        );
        const mySubmittedAssIds = new Set(
          submissions.filter((s) => String(s.user_user_id) === String(CURRENT_STUDENT_ID)).map((s) => String(s.assignment_ass_id))
        );
        const myPendingWorks = assignments
          .filter((a) => myAssIds.has(String(a.ass_id)) && !mySubmittedAssIds.has(String(a.ass_id)))
          .sort((a, b) => new Date(b.create_at) - new Date(a.create_at))
          .slice(0, 5)
          .map((a) => ({
            title: a.title,
            due: a.deadline
              ? `ครบกำหนด ${new Date(a.deadline).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`
              : "ไม่ระบุกำหนดส่ง",
            status: a.deadline && new Date(a.deadline) < new Date() ? "เลยกำหนดส่ง" : "ยังไม่ได้ส่ง",
          }));
        setPendingWorks(myPendingWorks);

        // การ์ด "วิชาของฉัน" = ห้องเรียนจริงที่นักเรียนอยู่ (ผูก 1:1 กับห้องเดียวกับหน้า /studentclassroom ไม่ใช่วิชาแยกหลายรายวิชา)
        // ความคืบหน้า = จำนวนงานทั้งหมดของห้องนี้ที่ส่งแล้ว / ทั้งหมด (ข้อมูลเดียวกับที่ใช้คำนวณ pendingWorks ด้านบน)
        const myTotalAssIds = assignments.filter((a) => myAssIds.has(String(a.ass_id))).map((a) => String(a.ass_id));
        const myCompletedCount = myTotalAssIds.filter((id) => mySubmittedAssIds.has(id)).length;
        setSubject({
          name: grade ? `ห้อง ม.${grade.grade_name}/${grade.section ?? "-"}` : "ห้องเรียนของฉัน",
          faculty: grade?.teacher_name ? `ครูที่ปรึกษา ${grade.teacher_name}` : "ห้องเรียนของฉัน",
          completed: myCompletedCount,
          total: myTotalAssIds.length,
        });
      } catch (err) {
        console.error("โหลดข้อมูลหน้าหลักนักเรียนไม่สำเร็จ:", err);
      }
    };
    load();
  }, []);

  const addReply = async (appointmentId, text) => {
    if (!text.trim()) return;
    try {
      const reply = await replyAppointment(appointmentId, { user_user_id: CURRENT_STUDENT_ID, content: text.trim() });
      setTeacherAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? {
                ...a,
                replies: [
                  ...(a.replies || []),
                  {
                    author: reply.author_name || student.firstName,
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
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 min-w-0">
        <Header />

        <main className="max-w-7xl mx-auto px-6 md:px-8 pt-24 pb-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* LEFT: หัวข้อ + เนื้อหาหลัก เรียงต่อกันไม่มีช่องว่าง */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Title */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="page-title">
                    สวัสดี {student.fullName}
                  </h1>
                  <p className="page-subtitle mt-0.5">
                    {student.classroom} / {student.room} • เลขที่ {student.number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openJoinClassModal}
                  className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[13px] font-semibold flex items-center gap-2 shrink-0"
                >
                  <FaKey size={14} /> กรอกรหัสเข้าชั้นเรียน
                </button>
              </div>

              {/* Subject */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <SectionHeader title="วิชาของฉัน" />
                <div className="mt-3">
                  <SubjectCard {...subject} onClick={() => navigate("/studentclassroom")} />
                </div>
              </div>

              {/* Goal / Aptitude / Community */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <SectionHeader
                    title="เป้าหมายของฉัน"
                    actionLabel="แก้ไข"
                    onAction={() => navigate("/studentgoal")}
                  />
                  <div className="mt-2 text-gray-900 text-[15px] truncate">{goal?.goal || "ยังไม่ได้ตั้งเป้าหมาย"}</div>
                  <div className="text-[14px] text-gray-400 mt-1 truncate">{goal?.university || ""}</div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <SectionHeader
                    title="ความถนัด"
                    actionLabel="ดูผลเต็ม"
                    onAction={() => navigate("/result")}
                  />
                  <div className="mt-2 text-gray-900 text-[15px] truncate">{topSkill?.skill || "ยังไม่ได้ทำแบบทดสอบ"}</div>
                  <div className="text-[14px] text-gray-400 mt-1 truncate">{topSkill?.faculty || ""}</div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <SectionHeader
                    title="ชุมนุมของฉัน"
                    actionLabel="ไปที่ชุมนุม"
                    onAction={() => navigate("/studentsommunity")}
                  />
                  <div className="mt-3 flex items-center gap-2 text-gray-600 text-[15px]">
                    <FaUsers className="text-gray-400 text-[14px] shrink-0" />
                    <span className="truncate">ชุมนุม YC</span>
                  </div>
                </div>
              </div>

              {/* Work + News */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <SectionHeader
                    title="งานที่ต้องส่ง"
                    actionLabel="ดูทั้งหมด"
                    onAction={() => navigate("/classwork")}
                  />
                  <div className="mt-1 divide-y divide-gray-100">
                    {pendingWorks.length === 0 && (
                      <div className="text-[15px] text-gray-400 py-2.5">ส่งงานครบแล้ว</div>
                    )}
                    {pendingWorks.map((w, i) => (
                      <WorkRow key={i} {...w} onClick={() => navigate("/classwork")} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <SectionHeader
                    title="ข่าวสารล่าสุด"
                    actionLabel="ดูทั้งหมด"
                    onAction={() => navigate("/studentNews")}
                  />
                  <div className="mt-1 divide-y divide-gray-100">
                    {news.length === 0 && (
                      <div className="text-[15px] text-gray-400 py-2.5">ยังไม่มีข่าวสาร</div>
                    )}
                    {news.map((n, i) => (
                      <div key={i} className="py-2.5 flex gap-2.5">
                        <FaRegNewspaper className="text-gray-400 mt-0.5 shrink-0 text-[14px]" />
                        <div className="min-w-0">
                          <div className="text-gray-900 text-[15px] truncate">{n.author}</div>
                          <div className="text-[14px] text-gray-400 mt-0.5">{n.date}</div>
                          <div className="text-gray-600 text-[15px] mt-1 line-clamp-2">{n.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: ปฏิทิน + นัดหมาย เริ่มระดับเดียวกับหัวข้อ (เหมือนแดชบอร์ดครูเป๊ะ) */}
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

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[15px] font-medium text-gray-900">
                      {selectedDate.getDate()} {THAI_MONTHS[selectedDate.getMonth()]}
                    </div>
                    <div className="text-[13px] text-gray-400">
                      {selectedKey === toDateKey(today) ? "วันนี้" : `${selectedDate.getFullYear() + 543}`}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {appointmentsForSelectedDate.length === 0 && (
                    <div className="text-[14px] text-gray-400">ไม่มีนัดหมายในวันนี้</div>
                  )}
                  {appointmentsForSelectedDate.map((a) => (
                    <div key={a.id} className="rounded-xl border border-gray-200 px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[14px] font-medium">
                          {a.teacher[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 text-[14px] truncate">{a.teacher}</div>
                          <div className="text-[13px] text-gray-400 truncate">{a.note}</div>
                        </div>
                        <div className="text-[13px] text-gray-500 flex items-center gap-1 shrink-0">
                          <FaClock className="text-[13px]" />
                          {a.time}
                        </div>
                      </div>

                      <ReplyThread
                        replies={a.replies || []}
                        onAdd={(text) => addReply(a.id, text)}
                        placeholder="พิมพ์ตอบกลับนัดหมายนี้..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-[15px] font-medium text-gray-400">นัดหมายที่จะถึงนี้</h2>
                <div className="mt-3 border-t border-gray-200">
                  {upcomingAppointments.length === 0 && (
                    <div className="text-[14px] text-gray-400 py-4">ยังไม่มีนัดหมายที่จะถึง</div>
                  )}
                  {upcomingAppointments.map((a) => {
                    const [y, m, d] = a.date.split("-").map(Number);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(new Date(y, m - 1, d));
                          setViewDate(new Date(y, m - 1, 1));
                        }}
                        className="w-full flex items-center justify-between gap-3 px-1 py-2.5 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 text-left bg-transparent"
                      >
                        <div className="min-w-0">
                          <div className="text-[14px] text-gray-900 truncate">{a.teacher}</div>
                          <div className="text-[13px] text-gray-400 mt-0.5 truncate">
                            {d} {THAI_MONTHS[m - 1]} • {a.note}
                          </div>
                        </div>
                        <div className="text-[13px] text-gray-500 shrink-0">{formatThaiTimeLabel(a.time)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showJoinClassModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowJoinClassModal(false)} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-100 max-w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                <FaKey className="text-gray-500" size={15} /> กรอกรหัสเข้าชั้นเรียน
              </h3>
              <button type="button" onClick={() => setShowJoinClassModal(false)} className="text-gray-400 hover:text-gray-700 bg-transparent">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="px-5 py-5">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">รหัสชั้นเรียน</label>
              <input
                value={classCodeInput}
                onChange={(e) => setClassCodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmitJoinClass(); }}
                placeholder="เช่น ABC123"
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-[13.5px] outline-none focus:border-pink-400"
                autoFocus
              />
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowJoinClassModal(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14px] font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitJoinClass}
                disabled={!classCodeInput.trim() || joiningClass}
                className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14px] font-semibold"
              >
                {joiningClass ? "กำลังเข้าร่วม..." : "เข้าร่วมชั้นเรียน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectCard({ name, faculty, completed, total, onClick }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-3 hover:shadow-md transition cursor-pointer"
    >
      <div className="w-20 h-20 rounded-lg bg-pink-50 text-pink-400 flex items-center justify-center shrink-0">
        <FaBookOpen size={28} />
      </div>

      <div className="min-w-0 flex-1">
        {faculty && (
          <span className="inline-block text-[13px] font-medium text-pink-600 bg-pink-50 rounded-full px-2 py-0.5">
            {faculty}
          </span>
        )}

        <h3 className="text-[16px] font-semibold text-gray-900 mt-1.5 leading-snug truncate">
          {name}
        </h3>

        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-pink-500" style={{ width: `${percent}%` }} />
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <div className="text-[14px] text-gray-400">
            ทำไปแล้ว {completed}/{total} • {percent}%
          </div>
          <span className="text-[14px] font-semibold text-pink-600">เข้าเรียน</span>
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
    <div className="mt-2 pl-9">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="text-pink-600 text-[14px] bg-transparent">
        {expanded ? "ซ่อนการตอบกลับ" : replies.length > 0 ? `ดูการตอบกลับ (${replies.length})` : "ตอบกลับ"}
      </button>

      {expanded && (
        <div className="mt-1.5">
          {replies.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {replies.map((r, i) => (
                <div key={i} className="text-[14px] bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <span className="font-medium text-gray-700">{r.author}</span>
                  <span className="text-gray-400"> • {r.time}</span>
                  <div className="text-gray-600">{r.text}</div>
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
              className="flex-1 h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-[14px] outline-none focus:border-gray-400 placeholder:text-gray-400"
            />
            <button type="button" onClick={submit} className="h-8 px-3 rounded-lg bg-pink-500 text-white text-[14px] hover:bg-pink-600 transition shrink-0">
              ส่ง
            </button>
          </div>
        </div>
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

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-semibold text-black">{title}</h2>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-[14px] font-semibold text-pink-600 hover:text-pink-700 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function WorkRow({ title, due, status, onClick }) {
  const statusColor =
    status === "ส่งแล้ว"
      ? "text-emerald-500"
      : status === "ยังไม่ได้ส่ง"
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <div
      onClick={onClick}
      className="group flex items-center justify-between gap-3 py-2.5 hover:bg-gray-50 cursor-pointer rounded-lg px-1.5 transition"
    >
      <div className="min-w-0 flex items-center gap-2.5">
        <FaRegClipboard className="text-gray-400 text-[14px] shrink-0" />
        <div className="min-w-0">
          <div className="text-gray-900 text-[15px] truncate">{title}</div>
          <div className="text-[14px] text-gray-400 mt-0.5">{due}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[14px] font-medium ${statusColor}`}>{status}</span>
        <FaChevronRight className="text-[13px] text-gray-300 group-hover:text-pink-500 transition" />
      </div>
    </div>
  );
}
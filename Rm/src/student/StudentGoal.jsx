import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../navstudent";
import Header from "../Header";
import {
  FaGraduationCap,
  FaLightbulb,
  FaCompass,
  FaBookOpen,
  FaComments,
  FaCamera,
} from "react-icons/fa";
import Swal from "sweetalert2";
import {
  getStudent,
  getEnrollments,
  getClasses,
  getGoals,
  getStudentGeneralInfo,
  createGoal,
  updateGoal,
  uploadStudentAvatar,
} from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { gradeLabel } from "../utils/gradeLabel.js";
import { resolveFileUrl } from "../utils/media.js";
import Avatar from "../components/Avatar.jsx";
import { API_BASE_URL } from "../config/api.js";
import useMyRiasec from "../hooks/useMyRiasec.js";
import { facultiesForCode, goalTargets, analyzeTarget } from "../utils/riasecScoring.js";

const API_BASE = API_BASE_URL;

const GOAL_LEVEL = { high: { label: "สูง", cls: "text-emerald-600" }, medium: { label: "ปานกลาง", cls: "text-amber-600" }, low: { label: "ต่ำ", cls: "text-red-600" } };

function CardHeader({ icon, title, subtitle, action }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
          <Icon className="text-[16px]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15.5px] font-medium text-gray-400 truncate">{title}</h2>
          {subtitle && <p className="text-[13.5px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function StudentGoalPage() {
  const navigate = useNavigate();
  // อ่านผู้ใช้ตอนเปิดหน้า (ไม่ใช่ตอนโหลดแอป) — ไม่มีค่าสำรองเป็นนักเรียนคนอื่น
  const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? null;
  const [isEditing, setIsEditing] = useState(false);

  const [student, setStudent] = useState({
    name: "",
    number: "",
    class: "",
    goal: "",
    university: "",
    inspiration: "",
    gpa: "3.80",
    avatar: null,
  });

  const [tempStudent, setTempStudent] = useState(student);
  const [goalId, setGoalId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ดึงตัวตนนักเรียนจริง + เป้าหมายล่าสุดที่บันทึกไว้จริง (GPA ยังไม่มี backend เก็บ ใช้ค่า mock ไปก่อน)
  useEffect(() => {
    const load = async () => {
      try {
        const [students, enrollments, classes, goals, generalInfo] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getGoals().catch(() => []),
          getStudentGeneralInfo(CURRENT_STUDENT_ID).catch(() => null),
        ]);

        const me = students.find((s) => String(s.user_id) === String(CURRENT_STUDENT_ID));
        const enroll = enrollments.find((e) => String(e.user_user_id) === String(CURRENT_STUDENT_ID));
        const grade = enroll ? classes.find((c) => String(c.idgrade) === String(enroll.grade_idgrade)) : null;
        const myGoal = goals
          .filter((g) => String(g.user_user_id) === String(CURRENT_STUDENT_ID))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        const next = {
          name: me?.fullname || "",
          number: enroll?.seat_no ?? "-",
          class: grade ? gradeLabel(grade) : "-",
          goal: myGoal?.career_field || "",
          university: myGoal?.faculty_name || "",
          inspiration: myGoal?.goal_text || "",
          gpa: "3.80",
          avatar: generalInfo?.avatar_url ? resolveFileUrl(API_BASE, generalInfo.avatar_url) : null,
        };
        setStudent(next);
        setTempStudent(next);
        setGoalId(myGoal?.goal_id ?? null);
      } catch (err) {
        console.error("โหลดข้อมูลเป้าหมายนักเรียนไม่สำเร็จ:", err);
      }
    };
    load();
  }, []);

  const saveGoal = async () => {
    const payload = {
      goal_text: tempStudent.inspiration.trim(),
      faculty_name: tempStudent.university.trim(),
      career_field: tempStudent.goal.trim(),
    };
    if (!payload.faculty_name && !payload.career_field) {
      Swal.fire("ยังไม่ได้ระบุเป้าหมาย", "กรอกคณะที่สนใจ หรืออาชีพเป้าหมาย อย่างน้อย 1 ช่อง", "warning");
      return;
    }
    setSaving(true);
    try {
      const saved = goalId
        ? await updateGoal(goalId, payload)
        : await createGoal({ user_user_id: CURRENT_STUDENT_ID, ...payload });
      setGoalId(saved?.goal_id ?? goalId);
      setStudent({ ...tempStudent, university: payload.faculty_name, goal: payload.career_field, inspiration: payload.goal_text });
      setIsEditing(false);
      Swal.fire({ icon: "success", title: "บันทึกเป้าหมายแล้ว", text: "ระบบจะใช้เป้าหมายนี้ในหน้าผลแบบทดสอบและคำแนะนำ", timer: 1800, showConfirmButton: false });
    } catch (err) {
      console.error("บันทึกเป้าหมายไม่สำเร็จ:", err);
      Swal.fire("บันทึกไม่สำเร็จ", err?.response?.data?.message || "ลองใหม่อีกครั้ง", "error");
    } finally {
      setSaving(false);
    }
  };

  const [comments, setComments] = useState([
    {
      id: 1,
      author: "ครูสุพรรณี",
      role: "teacher",
      time: "28/03/2569 10:30",
      text: "ควรเริ่มทำ Portfolio ได้แล้วนะ ลองดูตัวอย่างจากรุ่นพี่ที่ติดคณะศิลปกรรมศาสตร์ปีที่แล้วด้วยค่ะ",
    },
  ]);
  const [commentDraft, setCommentDraft] = useState("");

  // ผลแบบทดสอบ RIASEC จริงของนักเรียน (ชุดเดียวกับหน้าผลแบบเต็ม)
  const riasec = useMyRiasec();
  const latestRiasec = riasec.latest && !riasec.latest.legacy ? riasec.latest : null;
  const recommendedFaculties = useMemo(
    () => (latestRiasec ? facultiesForCode(riasec.data, latestRiasec.code).flatMap((f) => f.rows) : []),
    [riasec.data, latestRiasec]
  );
  // เป้าหมายที่บันทึกไว้ (ตัดข้อความแทนค่าว่างออก) → คณะในฐานข้อมูล + ความสอดคล้องกับผลทดสอบ
  const goalForAdvice = useMemo(
    () => ({
      faculty_name: student.university,
      career_field: student.goal,
      goal_text: student.inspiration,
    }),
    [student.university, student.goal, student.inspiration]
  );
  const goalAdvice = useMemo(() => {
    if (!riasec.data) return [];
    const seen = new Set();
    return goalTargets(riasec.data, goalForAdvice)
      .map((t) => (latestRiasec ? analyzeTarget(riasec.data, latestRiasec, t) : { faculty: t.match.rows[0], level: null }))
      .filter((a) => (seen.has(a.faculty.name) ? false : seen.add(a.faculty.name)));
  }, [riasec.data, goalForAdvice, latestRiasec]);
  const otherRecommended = recommendedFaculties.filter((f) => !goalAdvice.some((a) => a.faculty.name === f.name));

  const handleChange = (field, value) => setTempStudent({ ...tempStudent, [field]: value });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await uploadStudentAvatar(CURRENT_STUDENT_ID, file);
      const url = resolveFileUrl(API_BASE, result.avatar_url);
      setStudent((prev) => ({ ...prev, avatar: url }));
      setTempStudent((prev) => ({ ...prev, avatar: url }));
    } catch (err) {
      console.error("อัปโหลดรูปโปรไฟล์ไม่สำเร็จ:", err);
      alert("อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addComment = () => {
    const text = commentDraft.trim();
    if (!text) return;
    const time = new Date().toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    setComments((prev) => [...prev, { id: Date.now(), author: student.name || "นักเรียน", role: "student", time, text }]);
    setCommentDraft("");
  };

  return (
    <div className="min-h-screen w-full bg-white flex text-[15.5px] text-gray-800">
      <SidebarNav />

      <div className="flex-1 min-w-0">
        <Header />

        <main className="w-full px-6 md:px-8 pt-24 pb-10 space-y-6">

          {/* Title */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="page-title">เป้าหมายของฉัน</h1>
              <p className="page-subtitle mt-0.5">เป้าหมายการศึกษาต่อ ผลการทดสอบความถนัด และคำแนะนำจากครู</p>
            </div>

            {isEditing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setTempStudent(student); }}
                  className="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-[15.5px] hover:bg-gray-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={saveGoal}
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-pink-500 text-white text-[15.5px] font-medium hover:bg-pink-600 transition disabled:opacity-60"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setTempStudent(student); setIsEditing(true); }}
                className="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-[15.5px] hover:bg-gray-50 transition"
              >
                แก้ไขข้อมูล
              </button>
            )}
          </div>

          {/* PROFILE (student-entered info, all in one card) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="relative group shrink-0">
                <label className="cursor-pointer block">
                  <Avatar
                    src={isEditing ? tempStudent.avatar : student.avatar}
                    name={student.name}
                    size={96}
                    rounded="rounded-2xl"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition">
                      <FaCamera className="text-[15px]" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[21.5px] font-semibold text-gray-900 truncate">{student.name}</h2>
                <p className="text-[15.5px] text-gray-400 mt-0.5">เลขที่ {student.number} • ห้อง {student.class}</p>

                <div className="flex items-center gap-8 mt-3">
                  <div>
                    <p className="text-[13.5px] text-gray-400">เป้าหมาย</p>
                    {isEditing ? (
                      <input
                        value={tempStudent.goal}
                        list="goal-career-options"
                        placeholder="เช่น นักออกแบบกราฟิก"
                        onChange={(e) => handleChange("goal", e.target.value)}
                        className="mt-1 h-9 rounded-lg border border-gray-200 px-3 text-[15.5px] outline-none focus:border-pink-300"
                      />
                    ) : (
                      <p className={`text-[15.5px] font-medium mt-0.5 ${student.goal ? "text-gray-900" : "text-gray-400"}`}>{student.goal || "ยังไม่ได้ตั้งเป้าหมาย"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[13.5px] text-gray-400">GPA</p>
                    <p className="text-[15.5px] font-medium text-gray-900 mt-0.5">{student.gpa}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[13.5px] text-gray-400 mb-1 flex items-center gap-1.5">
                  <FaGraduationCap className="text-pink-400" /> คณะที่สนใจ
                </p>
                {isEditing ? (
                  <>
                    <input
                      value={tempStudent.university}
                      list="goal-faculty-options"
                      placeholder="เลือกหรือพิมพ์ชื่อคณะ/สาขา"
                      onChange={(e) => handleChange("university", e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 px-3 text-[15.5px] outline-none focus:border-pink-300"
                    />
                    <p className="text-[12.5px] text-gray-400 mt-1">เลือกจากรายการเพื่อให้ระบบเทียบกับผลแบบทดสอบได้แม่นยำ</p>
                    {/* รายการคณะ/อาชีพจากฐานข้อมูลแนะแนว — ยังพิมพ์ชื่ออื่นเองได้ */}
                    <datalist id="goal-faculty-options">
                      {(riasec.data?.faculties || []).map((f) => (
                        <option key={f.name} value={f.name} />
                      ))}
                    </datalist>
                    <datalist id="goal-career-options">
                      {[...new Set((riasec.data?.faculties || []).flatMap((f) => f.careers))].map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </>
                ) : (
                  <p className={`text-[15.5px] ${student.university ? "text-gray-600" : "text-gray-400"}`}>{student.university || "ยังไม่ระบุคณะที่สนใจ"}</p>
                )}
              </div>

              <div>
                <p className="text-[13.5px] text-gray-400 mb-1 flex items-center gap-1.5">
                  <FaLightbulb className="text-pink-400" /> เหตุผล / แรงบันดาลใจ
                </p>
                {isEditing ? (
                  <textarea
                    value={tempStudent.inspiration}
                    onChange={(e) => handleChange("inspiration", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 p-3 text-[15.5px] outline-none focus:border-pink-300 resize-none"
                  />
                ) : (
                  <p className="text-[15.5px] text-gray-600 leading-6">{student.inspiration}</p>
                )}
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">

            {/* LEFT */}
            <div className="space-y-6">

              {/* Advice — เป้าหมายที่ตั้ง + ผลทดสอบ (ข้อมูลจากไฟล์ข้อมูลคณะ–อาชีพ) */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <CardHeader
                  icon={FaBookOpen}
                  title="คำแนะนำการศึกษาต่อ"
                  subtitle={`อ้างอิงจากเป้าหมายที่ตั้งไว้${latestRiasec ? ` และผลทดสอบ (${latestRiasec.code})` : ""}`}
                />

                {riasec.loading ? (
                  <p className="text-[15px] text-gray-400">กำลังโหลด...</p>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[13.5px] font-semibold text-gray-500 mb-2">ตามเป้าหมายของคุณ</p>
                      {goalAdvice.length === 0 ? (
                        <p className="text-[14.5px] text-gray-500">
                          {goalForAdvice.faculty_name || goalForAdvice.career_field
                            ? "ยังไม่พบคณะ/อาชีพในเป้าหมายของคุณในฐานข้อมูล — กด “แก้ไขข้อมูล” แล้วเลือกชื่อคณะจากรายการ"
                            : "ยังไม่ได้ตั้งเป้าหมาย — กด “แก้ไขข้อมูล” เพื่อเลือกคณะและอาชีพที่สนใจ"}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {goalAdvice.map(({ faculty: f, level }) => (
                            <div key={f.name} className="rounded-xl bg-pink-50/50 border border-pink-100 px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[15.5px] font-semibold text-gray-800">{f.name}</p>
                                {level && (
                                  <span className={`shrink-0 text-[12.5px] font-semibold rounded-full px-2.5 py-0.5 bg-white ${GOAL_LEVEL[level].cls}`}>
                                    สอดคล้อง{GOAL_LEVEL[level].label}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 grid gap-0.5 text-[13.5px] text-gray-700 leading-6">
                                <div><span className="text-gray-500">วิชาที่ควรเน้น:</span> {f.subjects.join(", ")}</div>
                                <div><span className="text-gray-500">สายการเรียน:</span> {f.track}</div>
                                <div><span className="text-gray-500">ทักษะที่ควรพัฒนา:</span> {f.skills}</div>
                                <div><span className="text-gray-500">คำแนะนำ:</span> {f.advice}</div>
                                <div><span className="text-gray-500">เตรียมสอบ:</span> {f.exam}</div>
                                {f.universities.length > 0 && <div><span className="text-gray-500">มหาวิทยาลัยตัวอย่าง:</span> {f.universities.join(", ")}</div>}
                              </div>
                              {f.links[0] && (
                                <a href={f.links[0]} target="_blank" rel="noreferrer" className="inline-block mt-1 text-[13px] text-sky-600 hover:underline">
                                  ดูหลักสูตรใน myTCAS ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {latestRiasec ? (
                      otherRecommended.length > 0 && (
                        <div className="pt-4 border-t border-gray-100">
                          <p className="text-[13.5px] font-semibold text-gray-500 mb-2">สาขาอื่นที่ตรงกับผลทดสอบ ({latestRiasec.code})</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {otherRecommended.map((f) => (
                              <div key={f.name} className="rounded-xl bg-gray-50 px-3.5 py-2.5 min-w-0">
                                <p className="text-[15px] font-medium text-gray-800">✔ {f.name}</p>
                                <p className="text-[13px] text-gray-500 mt-0.5">สายการเรียน: {f.track}</p>
                                {f.universities.length > 0 && <p className="text-[13px] text-gray-500">เช่น {f.universities.join(", ")}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-[14.5px] text-gray-500">ทำแบบทดสอบความถนัด เพื่อดูว่าเป้าหมายนี้สอดคล้องกับความสนใจของคุณแค่ไหน</p>
                        <button type="button" onClick={() => navigate("/aptitudeIntro")} className="shrink-0 px-4 py-2 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[14px] font-medium">
                          ทำแบบทดสอบ
                        </button>
                      </div>
                    )}

                    <p className="text-[12px] text-gray-400">ที่มา: ไฟล์ข้อมูลคณะ–อาชีพ–คำแนะนำ RIASEC ของงานแนะแนว และ myTCAS • เกณฑ์รับเข้าเปลี่ยนทุกปี ควรตรวจประกาศล่าสุด</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: sidebar — evidence + feedback */}
            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">

              {/* Aptitude result + history */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <CardHeader
                  icon={FaCompass}
                  title="ผลการทดสอบความถนัดล่าสุด"
                  action={
                    <button
                      type="button"
                      onClick={() => navigate("/result")}
                      className="text-[14.5px] font-medium text-pink-600 hover:text-pink-700 transition shrink-0"
                    >
                      ดูผลแบบเต็ม →
                    </button>
                  }
                />

                {riasec.loading ? (
                  <p className="text-[15px] text-gray-400">กำลังโหลด...</p>
                ) : !latestRiasec ? (
                  <p className="text-[15px] text-gray-500">ยังไม่มีผลแบบทดสอบที่มีคะแนนรายด้าน</p>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[23.5px] font-bold text-pink-600">{latestRiasec.code}</span>
                    <span className="text-[14.5px] text-gray-500">
                      {latestRiasec.code.split("").map((c) => riasec.data.dimensions[c].nameTh).join(" • ")}
                    </span>
                  </div>
                )}

                {riasec.history.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[13.5px] text-gray-400 mb-1">ประวัติการทำแบบทดสอบ</p>
                    <div className="divide-y divide-gray-100">
                      {riasec.history.slice(0, 5).map((h, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[15.5px] text-gray-700 truncate">
                              {new Date(h.date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                            {i === 0 && <span className="text-[13.5px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">ล่าสุด</span>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[15.5px] font-medium text-gray-500">{h.legacy ? `${h.code} (ระบบเดิม)` : h.code}</span>
                            {!h.legacy && (
                              <button
                                type="button"
                                onClick={() => navigate("/result", { state: { scores: h.scores, date: h.date } })}
                                className="text-[14.5px] text-pink-500 hover:text-pink-700 transition"
                              >
                                ดูผล
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Comments from teacher */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <CardHeader icon={FaComments} title="คำแนะนำจากครู" />

                <div className="space-y-3 mb-4 max-h-[280px] overflow-y-auto pr-1">
                  {comments.length === 0 && <p className="text-[15.5px] text-gray-400">ยังไม่มีคำแนะนำ</p>}
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <span
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-[13.5px] font-medium shrink-0 ${
                          c.role === "teacher" ? "bg-pink-100 text-pink-600" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {c.author[0]}
                      </span>
                      <div className="min-w-0 flex-1 bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 text-[13.5px]">
                          <span className="font-medium text-gray-800">{c.author}</span>
                          <span className="text-gray-400">{c.time}</span>
                        </div>
                        <p className="text-[15.5px] text-gray-700 mt-0.5">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
                    placeholder="พิมพ์ข้อความถึงครู..."
                    className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-[15.5px] outline-none focus:border-pink-300 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={addComment}
                    className="h-9 px-4 rounded-lg bg-pink-500 text-white text-[15.5px] font-medium hover:bg-pink-600 transition shrink-0"
                  >
                    ส่ง
                  </button>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

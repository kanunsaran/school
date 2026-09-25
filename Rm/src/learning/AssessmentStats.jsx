import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import {
  FaUserFriends, FaClipboardCheck, FaBullseye, FaClipboardList, FaEdit, FaPen, FaRocket, FaCopy, FaTrash,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getStudent, getEnrollments, getClasses, getTypeResults, getTypes, getGoals, getFaculties, getAssessmentsList } from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { getActivityLog } from "../utils/assessmentStore.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";
import PageLoading from "../components/PageLoading.jsx";

const DONUT_COLORS = ["#ec4899", "#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444"];

const ACTIVITY_META = {
  create: { icon: FaEdit, cls: "bg-blue-50 text-blue-600", verb: "สร้างแบบประเมินใหม่" },
  edit: { icon: FaPen, cls: "bg-amber-50 text-amber-600", verb: "แก้ไขแบบประเมิน" },
  publish: { icon: FaRocket, cls: "bg-emerald-50 text-emerald-600", verb: "เผยแพร่แบบประเมิน" },
  duplicate: { icon: FaCopy, cls: "bg-purple-50 text-purple-600", verb: "ทำสำเนาแบบประเมิน" },
  delete: { icon: FaTrash, cls: "bg-red-50 text-red-600", verb: "ลบแบบประเมิน" },
};

const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AssessmentStatsPage() {
  const navigate = useNavigate();

  const [allStudents, setAllStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [allTypeResults, setAllTypeResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState("");
  const [customAssessments, setCustomAssessments] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData, typeResultData, typeData, goalData, facultyData, assessmentData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTypeResults().catch(() => []),
          getTypes().catch(() => []),
          getGoals().catch(() => []),
          getFaculties().catch(() => []),
          getAssessmentsList().catch(() => []),
        ]);
        // กรองเฉพาะแถวของ "นักเรียน" จริง — ตาราง user_type_result/goal ผูกกับ user_user_id รวมทุก role
        // (พบว่ามีข้อมูลทดสอบของบัญชีครูปนอยู่) ไม่กรองแล้วตัวเลขจะไม่ตรงกับการ์ดสรุปด้านบนที่นับเฉพาะนักเรียน
        const studentIds = new Set((studentData || []).map((s) => String(s.user_id)));
        setAllStudents(studentData || []);
        setEnrollments(enrollData || []);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setAllTypeResults((typeResultData || []).filter((r) => studentIds.has(String(r.user_user_id))));
        setTypes(typeData || []);
        setAllGoals((goalData || []).filter((g) => studentIds.has(String(g.user_user_id))));
        setFaculties(facultyData || []);
        setCustomAssessments(assessmentData || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activityLog = getActivityLog();

  const gradeByUserId = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (!map.has(String(e.user_user_id))) map.set(String(e.user_user_id), e.grade_idgrade);
    });
    return map;
  }, [enrollments]);

  // กรองทุกอย่างในหน้านี้ตามห้องที่เลือก (ถ้าเลือก) — ใช้ enroll จริงเป็นตัวกรอง — "ทั้งหมด" อยู่ตัวแรกเสมอ (value ว่าง = ภาพรวมทั้งโรงเรียน)
  const roomSelectOptions = useMemo(
    () => [{ value: "", label: "ทั้งหมด" }, ...classesList.map((c) => ({ value: String(c.id), label: gradeLabel(c) }))],
    [classesList]
  );

  const students = useMemo(
    () => (roomFilter ? allStudents.filter((s) => String(gradeByUserId.get(String(s.user_id))) === String(roomFilter)) : allStudents),
    [allStudents, gradeByUserId, roomFilter]
  );
  const scopedUserIds = useMemo(() => new Set(students.map((s) => String(s.user_id))), [students]);
  const typeResults = useMemo(() => allTypeResults.filter((r) => scopedUserIds.has(String(r.user_user_id))), [allTypeResults, scopedUserIds]);
  const goals = useMemo(() => allGoals.filter((g) => scopedUserIds.has(String(g.user_user_id))), [allGoals, scopedUserIds]);

  const completedUserIds = useMemo(() => new Set(typeResults.map((r) => String(r.user_user_id))), [typeResults]);
  const goalUserIds = useMemo(() => new Set(goals.map((g) => String(g.user_user_id))), [goals]);

  const totalStudents = students.length;
  const completedCount = students.filter((s) => completedUserIds.has(String(s.user_id))).length;
  const goalCount = students.filter((s) => goalUserIds.has(String(s.user_id))).length;
  const activeAssessmentCount = 1 + customAssessments.filter((a) => a.status === "published").length; // 1 = Holland ประจำระบบ

  // สัดส่วนนักเรียนตามระดับชั้น (ม.4/ม.5/ม.6 ฯลฯ) — เอาจาก grade_name จริง
  const levelBreakdown = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      const gid = gradeByUserId.get(String(s.user_id));
      const grade = classesList.find((c) => String(c.id) === String(gid));
      const level = grade ? `ม.${grade.grade_name}` : "ไม่ระบุชั้น";
      map.set(level, (map.get(level) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [students, gradeByUserId, classesList]);

  // สัดส่วนกลุ่มบุคลิกภาพ (dynamic ตาม type จริงที่มีอยู่ ไม่ใช่ RIASEC ตายตัว เพราะระบบยังมีแค่ type ไม่ครบ 6 มิติ)
  const typeBreakdown = useMemo(() => {
    const map = new Map();
    typeResults.forEach((r) => {
      const t = types.find((tt) => String(tt.type_id) === String(r.type_type_id));
      const label = t?.type_name || "ไม่ระบุ";
      map.set(label, (map.get(label) || 0) + 1);
    });
    const total = typeResults.length || 1;
    return Array.from(map.entries()).map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
  }, [typeResults, types]);

  // คณะที่นักเรียนสนใจมากที่สุด (จาก goal.faculty_name จริง)
  const facultyInterest = useMemo(() => {
    const map = new Map();
    goals.forEach((g) => {
      if (!g.faculty_name) return;
      map.set(g.faculty_name, (map.get(g.faculty_name) || 0) + 1);
    });
    const total = goals.filter((g) => g.faculty_name).length || 1;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }, [goals]);

  // ความสอดคล้องระหว่างผลประเมิน (RIASEC) กับเป้าหมายคณะที่ตั้งไว้ — เทียบ type_type_id ของนักเรียนกับ faculty.Type_type_id จริง
  // goal.faculty_name เป็นข้อความที่นักเรียนพิมพ์เอง ไม่ตรงกับชื่อคณะในตาราง faculty เป๊ะเสมอไป จึงจับคู่แบบ "ชื่อคล้ายกัน" (substring)
  // คนที่จับคู่ชื่อคณะไม่ได้เลยจะไม่นับในสถิตินี้ (ไม่ใช่ "ไม่สอดคล้อง" เพราะไม่รู้ข้อมูลจริง)
  const alignment = useMemo(() => {
    const findFacultyType = (goalFacultyName) => {
      const needle = (goalFacultyName || "").trim();
      if (!needle) return null;
      const exact = faculties.find((f) => f.faculty_name === needle);
      if (exact) return exact.Type_type_id;
      const fuzzy = faculties.find((f) => f.faculty_name.includes(needle) || needle.includes(f.faculty_name));
      return fuzzy ? fuzzy.Type_type_id : null;
    };

    let aligned = 0, notAligned = 0, unmatched = 0;
    goals.forEach((g) => {
      const typeRow = typeResults.find((r) => String(r.user_user_id) === String(g.user_user_id));
      if (!typeRow || !typeRow.type_type_id) return; // ยังไม่ได้ทำแบบประเมิน ไม่นับ
      const facultyType = findFacultyType(g.faculty_name);
      if (facultyType == null) { unmatched += 1; return; }
      if (String(facultyType) === String(typeRow.type_type_id)) aligned += 1;
      else notAligned += 1;
    });
    const total = aligned + notAligned;
    return { aligned, notAligned, unmatched, pct: total > 0 ? Math.round((aligned / total) * 100) : 0, total };
  }, [goals, typeResults, faculties]);

  const notDoneList = useMemo(
    () => students.filter((s) => !completedUserIds.has(String(s.user_id))).slice(0, 5),
    [students, completedUserIds]
  );

  const donutStops = useMemo(() => {
    let cumulative = 0;
    const total = typeBreakdown.reduce((s, t) => s + t.count, 0) || 1;
    return typeBreakdown
      .map((t) => {
        const start = (cumulative / total) * 100;
        cumulative += t.count;
        const end = (cumulative / total) * 100;
        return `${t.color} ${start}% ${end}%`;
      })
      .join(", ");
  }, [typeBreakdown]);

  const maxFacultyCount = Math.max(...facultyInterest.map((f) => f.count), 1);

  const completedPct = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
  const latestActivity = activityLog[0];
  const olderActivityCount = Math.max(0, activityLog.length - 1);

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="page-title">สถิติการทำแบบประเมิน</h1>
            <p className="page-subtitle mt-1">ภาพรวมข้อมูลการทำแบบประเมินทั้งหมด</p>
            <span className="block w-10 h-1 rounded-full bg-pink-500 mt-2.5" />
          </div>
          <Select
            styles={bigFilterSelectStyles}
            className="w-52"
            value={roomSelectOptions.find((o) => o.value === String(roomFilter))}
            onChange={(opt) => setRoomFilter(opt.value)}
            options={roomSelectOptions}
            isSearchable={false}
          />
        </div>

        {loading ? (
          <PageLoading />
        ) : (
          <>
            {/* ===== Stat cards ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={FaUserFriends} cardCls="bg-pink-50" iconCls="bg-pink-100 text-pink-600" label="นักเรียนทั้งหมด" value={`${totalStudents} คน`}
                sub={levelBreakdown.map(([l, c]) => `${l} ${c}`).join(" · ")}
              />
              <StatCard
                icon={FaClipboardCheck} cardCls="bg-emerald-50" iconCls="bg-emerald-100 text-emerald-600" label="ทำแบบประเมินแล้ว" value={`${completedCount} คน`}
                sub={`${completedPct}% จากทั้งหมด`}
              />
              <StatCard
                icon={FaBullseye} cardCls="bg-purple-50" iconCls="bg-purple-100 text-purple-600" label="ตั้งเป้าหมายศึกษาต่อแล้ว" value={`${goalCount} คน`}
                sub={`${totalStudents > 0 ? Math.round((goalCount / totalStudents) * 100) : 0}% จากทั้งหมด`}
              />
              <StatCard
                icon={FaClipboardList} cardCls="bg-amber-50" iconCls="bg-amber-100 text-amber-600" label="แบบประเมินที่เปิดใช้งาน" value={`${activeAssessmentCount} แบบ`}
                sub="รวมแบบประเมินในระบบ"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
              {/* โดนัท กลุ่มบุคลิกภาพ */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[15.5px] font-semibold text-gray-900 mb-1">สัดส่วนกลุ่มบุคลิกภาพของนักเรียนที่ทำแบบประเมินแล้ว</div>
                <div className="text-[13.5px] text-gray-400 mb-5">จากผลแบบประเมิน Holland Code จริง {typeResults.length} คน</div>
                {typeBreakdown.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[14.5px]">ยังไม่มีนักเรียนทำแบบประเมิน</div>
                ) : (
                  <div className="flex items-center gap-8 flex-wrap">
                    <div className="w-40 h-40 rounded-full shrink-0 ring-4 ring-white shadow-sm relative flex items-center justify-center" style={{ background: `conic-gradient(${donutStops})` }}>
                      <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center">
                        <div className="text-[19.5px] font-bold text-gray-900">{typeResults.length}</div>
                        <div className="text-[12px] text-gray-400">คน</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {typeBreakdown.map((t) => (
                        <div key={t.label} className="flex items-center gap-2.5 text-[14px] text-gray-700">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="min-w-0">{t.label}</span>
                          <span className="font-semibold shrink-0">{t.count} คน</span>
                          <span className="text-gray-400 shrink-0">({t.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* บาร์ คณะที่สนใจ */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[15.5px] font-semibold text-gray-900 mb-1">คณะที่นักเรียนสนใจมากที่สุด (Top 10)</div>
                <div className="text-[13.5px] text-gray-400 mb-5">จากเป้าหมายการศึกษาต่อที่นักเรียนตั้งไว้จริง</div>
                {facultyInterest.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[14.5px]">ยังไม่มีนักเรียนตั้งเป้าหมาย</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {facultyInterest.map((f) => (
                      <div key={f.name} className="flex items-center gap-3">
                        <div className="w-32 text-[13.5px] text-gray-600 truncate shrink-0" title={f.name}>{f.name}</div>
                        <div className="flex-1 h-3.5 rounded-full bg-pink-50 overflow-hidden">
                          <div className="h-full rounded-full bg-pink-500" style={{ width: `${Math.max(4, (f.count / maxFacultyCount) * 100)}%` }} />
                        </div>
                        <div className="text-[13px] text-gray-500 w-24 shrink-0 text-right">{f.count} คน ({f.pct}%)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr_1.1fr] gap-5">
              {/* ความสอดคล้องระหว่างผลประเมิน (RIASEC) กับเป้าหมายคณะ */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[15px] font-semibold text-gray-900 mb-1">ความสอดคล้องระหว่างผลประเมินกับเป้าหมาย</div>
                <div className="text-[13.5px] text-gray-400 mb-4">เทียบกลุ่มบุคลิกภาพกับคณะที่ตั้งเป้าหมายไว้ (จับคู่จากชื่อคณะ)</div>

                {alignment.total === 0 ? (
                  <div className="text-center text-gray-400 py-6 text-[14.5px]">ยังไม่มีข้อมูลที่จับคู่ได้พอจะสรุป</div>
                ) : (
                  <>
                    <div className="text-[30px] font-bold text-gray-900">{alignment.pct}%</div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden mt-2 mb-4">
                      <div className="h-full rounded-full bg-pink-500" style={{ width: `${alignment.pct}%` }} />
                    </div>
                    <div className="flex flex-col gap-2 text-[14px]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" /> สอดคล้อง</span>
                        <span className="font-semibold text-gray-800">{alignment.aligned} คน</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 shrink-0" /> ไม่สอดคล้อง</span>
                        <span className="font-semibold text-gray-800">{alignment.notAligned} คน</span>
                      </div>
                    </div>
                  </>
                )}
                {alignment.unmatched > 0 && (
                  <div className="text-[12.5px] text-gray-400 mt-3">
                    ไม่รวมนักเรียน {alignment.unmatched} คนที่ตั้งเป้าหมายไว้ แต่จับคู่ชื่อคณะกับข้อมูลกลุ่มบุคลิกภาพไม่ได้
                  </div>
                )}
              </div>

              {/* โดนัท สถานะการทำแบบประเมิน */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[15px] font-semibold text-gray-900 mb-4">สถานะการทำแบบประเมิน</div>
                <div className="flex items-center gap-6 justify-center">
                  <div
                    className="w-28 h-28 rounded-full shrink-0 relative flex items-center justify-center"
                    style={{ background: `conic-gradient(#ec4899 0% ${completedPct}%, #e5e7eb ${completedPct}% 100%)` }}
                  >
                    <div className="rounded-full bg-white flex flex-col items-center justify-center" style={{ width: 84, height: 84 }}>
                      <div className="text-[15.5px] font-bold text-gray-900">{totalStudents}</div>
                      <div className="text-[10.5px] text-gray-400">คน</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 text-[13.5px]">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" /> ทำแล้ว {completedCount} คน <span className="text-gray-400">({completedPct}%)</span></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 shrink-0" /> ยังไม่ได้ทำ {totalStudents - completedCount} คน <span className="text-gray-400">({100 - completedPct}%)</span></div>
                  </div>
                </div>
              </div>

              {/* รายชื่อยังไม่ได้ทำ */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[15px] font-semibold text-gray-900 mb-3">นักเรียนที่ยังไม่ได้ทำแบบประเมิน</div>
                {notDoneList.length === 0 ? (
                  <div className="text-[14px] text-gray-400">ทำครบทุกคนแล้ว</div>
                ) : (
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center shrink-0">
                      <FaUserFriends size={16} />
                    </span>
                    <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                      {notDoneList.map((s) => {
                        const gid = gradeByUserId.get(String(s.user_id));
                        const grade = classesList.find((c) => String(c.id) === String(gid));
                        return (
                          <div key={s.user_id} className="flex items-center justify-between gap-2 text-[14px]">
                            <span className="text-gray-700 truncate">{s.fullname}</span>
                            <span className="text-gray-400 shrink-0">{grade ? `ม.${gradeLabel(grade)}` : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/assessments/results")}
                  className="h-9 px-4 rounded-xl bg-pink-50 text-pink-600 text-[14px] font-semibold hover:bg-pink-100"
                >
                  ดูรายชื่อทั้งหมด →
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-5 mt-5 flex items-center justify-between gap-4 flex-wrap">
              {latestActivity ? (
                (() => {
                  const meta = ACTIVITY_META[latestActivity.action] || ACTIVITY_META.edit;
                  return (
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}><meta.icon size={17} /></span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-gray-900">กิจกรรมล่าสุดในระบบแบบประเมิน</div>
                        <div className="text-[14px] text-gray-600 truncate">
                          {meta.verb} <span className="text-gray-500">{latestActivity.title}</span>
                          <span className="text-gray-400"> · {formatDateTime(latestActivity.at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-[14.5px] text-gray-400">ยังไม่มีการใช้งาน</div>
              )}
              <button
                type="button"
                onClick={() => navigate("/assessments")}
                className="h-9 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14px] font-semibold shrink-0"
              >
                ดูประวัติกิจกรรมทั้งหมด{olderActivityCount > 0 ? ` (${olderActivityCount})` : ""} →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, cardCls, iconCls, label, value, sub }) {
  const Comp = icon;
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 flex items-start gap-3 ${cardCls}`}>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Comp size={17} />
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] text-gray-600 truncate">{label}</div>
        <div className="text-[21.5px] font-bold text-gray-900">{value}</div>
        <div className="text-[12.5px] text-gray-500 truncate">{sub}</div>
      </div>
    </div>
  );
}

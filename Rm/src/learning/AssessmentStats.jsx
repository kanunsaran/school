import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserFriends, FaClipboardCheck, FaBullseye, FaClipboardList, FaEdit, FaPen, FaRocket, FaCopy, FaTrash,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getStudent, getEnrollments, getClasses, getTypeResults, getTypes, getGoals } from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { getAssessments, getActivityLog } from "../utils/assessmentStore.js";

const DONUT_COLORS = ["#db2777", "#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444"];

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
  const [loading, setLoading] = useState(true);
  const [roomFilter, setRoomFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData, typeResultData, typeData, goalData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTypeResults().catch(() => []),
          getTypes().catch(() => []),
          getGoals().catch(() => []),
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
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const customAssessments = getAssessments();
  const activityLog = getActivityLog();

  const gradeByUserId = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (!map.has(String(e.user_user_id))) map.set(String(e.user_user_id), e.grade_idgrade);
    });
    return map;
  }, [enrollments]);

  // กรองทุกอย่างในหน้านี้ตามห้องที่เลือก (ถ้าเลือก) — ใช้ enroll จริงเป็นตัวกรอง
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

  // อัตราทำแบบประเมินแยกตามระดับชั้น
  const completionByLevel = useMemo(() => {
    const map = new Map(); // level -> {total, completed}
    students.forEach((s) => {
      const gid = gradeByUserId.get(String(s.user_id));
      const grade = classesList.find((c) => String(c.id) === String(gid));
      const level = grade ? `ม.${grade.grade_name}` : "ไม่ระบุชั้น";
      const entry = map.get(level) || { total: 0, completed: 0 };
      entry.total += 1;
      if (completedUserIds.has(String(s.user_id))) entry.completed += 1;
      map.set(level, entry);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "th"))
      .map(([level, v]) => ({ level, ...v, pct: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0 }));
  }, [students, gradeByUserId, classesList, completedUserIds]);

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

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">สถิติภาพรวม</h1>
            <p className="text-[13px] text-gray-500 mt-1">ภาพรวมข้อมูลการทำแบบประเมินทั้งหมด</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-gray-500">ห้องเรียน</span>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400"
            >
              <option value="">ทุกห้อง</option>
              {classesList.map((c) => <option key={c.id} value={c.id}>{gradeLabel(c)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-16">กำลังโหลด...</div>
        ) : (
          <>
            {/* ===== Stat cards ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={FaUserFriends} iconCls="bg-blue-50 text-blue-600" label="นักเรียนทั้งหมด" value={`${totalStudents} คน`}
                sub={levelBreakdown.map(([l, c]) => `${l} ${c}`).join(" · ")}
              />
              <StatCard
                icon={FaClipboardCheck} iconCls="bg-emerald-50 text-emerald-600" label="ทำแบบประเมินแล้ว" value={`${completedCount} คน`}
                sub={`${totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0}% จากทั้งหมด`}
              />
              <StatCard
                icon={FaBullseye} iconCls="bg-purple-50 text-purple-600" label="ตั้งเป้าหมายศึกษาต่อแล้ว" value={`${goalCount} คน`}
                sub={`${totalStudents > 0 ? Math.round((goalCount / totalStudents) * 100) : 0}% จากทั้งหมด`}
              />
              <StatCard
                icon={FaClipboardList} iconCls="bg-pink-50 text-pink-600" label="แบบประเมินที่เปิดใช้งาน" value={`${activeAssessmentCount} แบบ`}
                sub="รวมแบบประเมินประจำระบบ"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
              {/* โดนัท กลุ่มบุคลิกภาพ */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[14px] font-semibold text-gray-900 mb-1">สัดส่วนกลุ่มบุคลิกภาพของนักเรียนที่ทำแบบประเมินแล้ว</div>
                <div className="text-[12px] text-gray-400 mb-5">จากผลแบบประเมิน Holland Code จริง {typeResults.length} คน</div>
                {typeBreakdown.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[13px]">ยังไม่มีนักเรียนทำแบบประเมิน</div>
                ) : (
                  <div className="flex items-center gap-8 flex-wrap">
                    <div className="w-40 h-40 rounded-full shrink-0 ring-4 ring-white shadow-sm relative flex items-center justify-center" style={{ background: `conic-gradient(${donutStops})` }}>
                      <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center">
                        <div className="text-[18px] font-bold text-gray-900">{typeResults.length}</div>
                        <div className="text-[10.5px] text-gray-400">คน</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {typeBreakdown.map((t) => (
                        <div key={t.label} className="flex items-center gap-2 text-[12.5px] text-gray-700">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          {t.label} · <span className="font-semibold">{t.count} คน</span> ({t.pct}%)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* บาร์ คณะที่สนใจ */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[14px] font-semibold text-gray-900 mb-1">คณะที่นักเรียนสนใจมากที่สุด (Top 10)</div>
                <div className="text-[12px] text-gray-400 mb-5">จากเป้าหมายการศึกษาต่อที่นักเรียนตั้งไว้จริง</div>
                {facultyInterest.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[13px]">ยังไม่มีนักเรียนตั้งเป้าหมาย</div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {facultyInterest.map((f) => (
                      <div key={f.name} className="flex items-center gap-3">
                        <div className="w-32 text-[12px] text-gray-600 truncate shrink-0" title={f.name}>{f.name}</div>
                        <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-pink-400" style={{ width: `${(f.count / maxFacultyCount) * 100}%` }} />
                        </div>
                        <div className="text-[11.5px] text-gray-500 w-20 shrink-0 text-right">{f.count} คน ({f.pct}%)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.1fr] gap-5">
              {/* บาร์ อัตราทำแบบประเมินแยกตามชั้น */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[13.5px] font-semibold text-gray-900 mb-4">อัตราการทำแบบประเมินแยกตามระดับชั้น</div>
                {completionByLevel.length === 0 ? (
                  <div className="text-center text-gray-400 py-6 text-[13px]">ไม่มีข้อมูล</div>
                ) : (
                  <div className="flex items-end gap-3" style={{ height: 150 }}>
                    {completionByLevel.map((lv) => (
                      <div key={lv.level} className="flex flex-col items-center gap-2 flex-1">
                        <div className="text-[11px] text-gray-500 font-medium">{lv.pct}%</div>
                        <div className="w-full rounded-t-lg bg-gray-100 flex flex-col-reverse overflow-hidden" style={{ height: 90 }}>
                          <div className="bg-pink-400" style={{ height: `${lv.pct}%` }} />
                        </div>
                        <div className="text-[11px] text-gray-500">{lv.level}</div>
                        <div className="text-[10px] text-gray-400">{lv.completed}/{lv.total}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* โดนัท สถานะการทำแบบประเมิน */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="text-[13.5px] font-semibold text-gray-900 mb-4">สถานะการทำแบบประเมิน</div>
                <div className="flex items-center gap-6 justify-center">
                  <div
                    className="w-28 h-28 rounded-full shrink-0 relative flex items-center justify-center"
                    style={{ background: `conic-gradient(#10b981 0% ${totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0}%, #fca5a5 ${totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0}% 100%)` }}
                  >
                    <div className="w-16 h-16 rounded-full bg-white flex flex-col items-center justify-center">
                      <div className="text-[14px] font-bold text-gray-900">{totalStudents}</div>
                      <div className="text-[9.5px] text-gray-400">คน</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-[12px]">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ทำแล้ว {completedCount} คน</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-300" /> ยังไม่ได้ทำ {totalStudents - completedCount} คน</div>
                  </div>
                </div>
              </div>

              {/* รายชื่อยังไม่ได้ทำ + กิจกรรมล่าสุด */}
              <div className="flex flex-col gap-5">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="text-[13.5px] font-semibold text-gray-900 mb-3">นักเรียนที่ยังไม่ได้ทำแบบประเมิน</div>
                  {notDoneList.length === 0 ? (
                    <div className="text-[12.5px] text-gray-400">ทำครบทุกคนแล้ว</div>
                  ) : (
                    <div className="flex flex-col gap-2 mb-3">
                      {notDoneList.map((s) => (
                        <div key={s.user_id} className="text-[12.5px] text-gray-700 truncate">{s.fullname}</div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => navigate("/assessments/results")} className="text-[12px] text-pink-600 hover:underline bg-transparent">ดูรายชื่อทั้งหมด →</button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5 mt-5">
              <div className="text-[13.5px] font-semibold text-gray-900 mb-3">กิจกรรมล่าสุดในระบบแบบประเมิน</div>
              {activityLog.length === 0 ? (
                <div className="text-[12.5px] text-gray-400">ยังไม่มีการใช้งาน</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                  {activityLog.slice(0, 6).map((entry) => {
                    const meta = ACTIVITY_META[entry.action] || ACTIVITY_META.edit;
                    return (
                      <div key={entry.id} className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}><meta.icon size={11} /></span>
                        <div className="min-w-0 text-[12.5px]">
                          <span className="text-gray-700">{meta.verb}</span> <span className="text-gray-500">{entry.title}</span>
                          <span className="text-gray-300"> · {formatDateTime(entry.at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, iconCls, label, value, sub }) {
  const Comp = icon;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex items-start gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Comp size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] text-gray-500 truncate">{label}</div>
        <div className="text-[19px] font-bold text-gray-900">{value}</div>
        <div className="text-[11px] text-gray-400 truncate">{sub}</div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { FaChalkboardTeacher, FaTimes } from "react-icons/fa";
import { getEnrollments, getClasses, getTeachingSchedule } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { WEEKDAY_OPTIONS, PERIOD_OPTIONS } from "../utils/teachingScheduleStore.js";
import { gradeLabel } from "../utils/gradeLabel.js";

// ปุ่มเล็ก "ดูตารางสอนครูที่ปรึกษา" → ป๊อปอัปตารางสอน (แถว = วัน, คอลัมน์ = คาบ) ฝั่งนักเรียนดูอย่างเดียว
// ครูที่ปรึกษา = ครูประจำห้องที่นักเรียนเข้าร่วม (grade.teacher_user_id) • ตารางจาก teaching_schedule ที่ครูบันทึกในหน้าหลักครู
// ช่องว่าง = ครูไม่มีคาบ ใช้ประกอบการขอนัดพบ

// โหลดครูที่ปรึกษาของนักเรียนที่ล็อกอินอยู่ + ตารางสอนของแต่ละคน
const loadAdvisors = async () => {
  const me = getCurrentUser()?.user_id;
  if (!me) return [];
  const [enrolls, classes] = await Promise.all([getEnrollments(), getClasses()]);
  const myGradeIds = (enrolls || []).filter((e) => String(e.user_user_id) === String(me)).map((e) => String(e.grade_idgrade));
  const byTeacher = new Map();
  (classes || [])
    .filter((c) => myGradeIds.includes(String(c.idgrade)) && c.teacher_user_id)
    .forEach((c) => {
      const cur = byTeacher.get(String(c.teacher_user_id)) || { teacherId: c.teacher_user_id, teacherName: c.teacher_name || "ครูที่ปรึกษา", rooms: [] };
      cur.rooms.push(gradeLabel(c));
      byTeacher.set(String(c.teacher_user_id), cur);
    });
  return Promise.all(
    [...byTeacher.values()].map(async (t) => ({ ...t, periods: await getTeachingSchedule({ teacher_user_id: t.teacherId }).catch(() => null) }))
  );
};

export default function AdvisorScheduleButton({ className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1 text-[13.5px] font-medium text-pink-600 hover:!bg-pink-50 transition ${className}`}
      >
        <FaChalkboardTeacher className="text-[13px]" />
        ดูตารางสอนครูที่ปรึกษา
      </button>
      {open && <AdvisorScheduleModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AdvisorScheduleModal({ onClose }) {
  // undefined = กำลังโหลด, null = โหลดไม่สำเร็จ, [] = ยังไม่มีครูที่ปรึกษา
  const [advisors, setAdvisors] = useState(undefined);
  const [active, setActive] = useState(0);

  useEffect(() => {
    loadAdvisors().then(setAdvisors).catch(() => setAdvisors(null));
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const a = advisors?.length ? advisors[Math.min(active, advisors.length - 1)] : null;
  const periods = a?.periods || [];
  const slot = (day, period) => periods.find((p) => Number(p.weekday) === day && Number(p.period) === period);
  // คาบ 9 (16:00–17:00) แสดงเฉพาะเมื่อครูมีคาบนั้น
  const shownPeriods = PERIOD_OPTIONS.filter((p) => p.period <= 8 || periods.some((x) => Number(x.period) === p.period));
  const todayIdx = (new Date().getDay() + 6) % 7; // 0 = จันทร์

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold text-gray-900">ตารางสอนครูที่ปรึกษา</h3>
            {a && (
              <div className="text-[14px] text-gray-500">
                {a.teacherName} · ครูที่ปรึกษาห้อง {a.rooms.join(", ")}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="text-gray-400 hover:text-gray-700 bg-transparent shrink-0">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 overflow-auto flex-1">
          {advisors === undefined ? (
            <div className="py-10 text-center text-[15px] text-gray-400">กำลังโหลด…</div>
          ) : advisors === null ? (
            <div className="py-10 text-center text-[15px] text-gray-500">โหลดตารางสอนไม่สำเร็จ ลองใหม่อีกครั้ง</div>
          ) : !a ? (
            <div className="py-10 text-center text-[15px] text-gray-500">ยังไม่ได้เข้าร่วมห้องเรียนที่มีครูที่ปรึกษา</div>
          ) : (
            <>
              {advisors.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {advisors.map((t, i) => (
                    <button
                      key={t.teacherId}
                      type="button"
                      onClick={() => setActive(i)}
                      className={`rounded-full border px-3.5 py-1.5 text-[14px] ${i === active ? "!bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:!bg-pink-50 hover:border-pink-300"}`}
                    >
                      {t.teacherName}
                    </button>
                  ))}
                </div>
              )}
              {a.periods === null ? (
                <div className="py-10 text-center text-[15px] text-gray-500">โหลดตารางสอนไม่สำเร็จ</div>
              ) : !periods.length ? (
                <div className="py-10 text-center text-[15px] text-gray-500">ครูยังไม่ได้บันทึกตารางสอน — ขอนัดได้ตามปกติ แล้วรอครูยืนยันเวลา</div>
              ) : (
                <>
                  {/* แถว = วัน, คอลัมน์ = คาบ (เหมือนตารางสอนของโรงเรียน) — จอแคบเลื่อนซ้าย-ขวาในกรอบนี้ */}
                  <table className="w-full min-w-[820px] table-fixed border-collapse text-center">
                    <thead>
                      <tr>
                        <th className="w-24 border border-gray-300 bg-gray-50 py-2 text-[15px] font-bold text-gray-800">วัน</th>
                        {shownPeriods.map((p) => (
                          <th key={p.period} className="border border-gray-300 bg-gray-50 px-1 py-2">
                            <div className="text-[14.5px] font-bold text-gray-800">คาบ {p.period}</div>
                            <div className="text-[12px] font-normal text-gray-500">{p.time.replace("-", "–")}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {WEEKDAY_OPTIONS.map((w) => {
                        const today = w.value === todayIdx;
                        return (
                          <tr key={w.value} className={today ? "bg-pink-50/60" : ""}>
                            <th className={`border border-gray-300 py-3 text-[15px] font-bold ${today ? "text-pink-600" : "text-gray-800"}`}>
                              {w.label.replace("วัน", "")}
                              {today && <div className="text-[11.5px] font-medium text-pink-500">วันนี้</div>}
                            </th>
                            {shownPeriods.map((p) => {
                              const s = slot(w.value, p.period);
                              return (
                                <td key={p.period} className="h-20 border border-gray-300 px-1.5 align-middle leading-tight">
                                  {s && (
                                    <>
                                      {s.classroom && <div className="text-[14px] font-bold text-gray-900">{s.classroom}</div>}
                                      <div className={`text-[12.5px] ${s.classroom ? "text-gray-600" : "font-semibold text-gray-800"}`}>{s.subject || "สอน"}</div>
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-3 text-[13px] text-gray-500">ช่องว่าง = ครูไม่มีคาบสอน เหมาะสำหรับขอนัดพบ (ครูเป็นผู้ยืนยันเวลานัดอีกครั้ง)</p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

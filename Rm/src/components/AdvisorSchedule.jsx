import { useEffect, useState } from "react";
import { FaChalkboardTeacher } from "react-icons/fa";
import { getEnrollments, getClasses, getTeachingSchedule } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { WEEKDAY_OPTIONS, PERIOD_OPTIONS } from "../utils/teachingScheduleStore.js";
import { gradeLabel } from "../utils/gradeLabel.js";

// ตารางสอนของครูที่ปรึกษา (ครูประจำห้องที่นักเรียนเข้าร่วม = grade.teacher_user_id) — ฝั่งนักเรียนดูอย่างเดียว
// ช่องที่ครูไม่มีคาบสอน = ว่าง ใช้ประกอบการขอนัดพบครู • ข้อมูลจากตาราง teaching_schedule ที่ครูบันทึกในหน้าหลักครู
const SHORT_DAY = ["จ.", "อ.", "พ.", "พฤ.", "ศ."];

export default function AdvisorSchedule() {
  // undefined = กำลังโหลด, [] = ยังไม่มีครูที่ปรึกษา, [{ teacherId, teacherName, rooms, periods }]
  const [advisors, setAdvisors] = useState(undefined);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const me = getCurrentUser()?.user_id;
    if (!me) return setAdvisors([]);
    Promise.all([getEnrollments(), getClasses()])
      .then(async ([enrolls, classes]) => {
        const myGradeIds = (enrolls || []).filter((e) => String(e.user_user_id) === String(me)).map((e) => String(e.grade_idgrade));
        const myClasses = (classes || []).filter((c) => myGradeIds.includes(String(c.idgrade)) && c.teacher_user_id);
        // ครูหนึ่งคนอาจเป็นที่ปรึกษาหลายห้องที่นักเรียนอยู่ — รวมเป็นคนเดียว
        const byTeacher = new Map();
        myClasses.forEach((c) => {
          const cur = byTeacher.get(String(c.teacher_user_id)) || { teacherId: c.teacher_user_id, teacherName: c.teacher_name || "ครูที่ปรึกษา", rooms: [] };
          cur.rooms.push(gradeLabel(c));
          byTeacher.set(String(c.teacher_user_id), cur);
        });
        const list = await Promise.all(
          [...byTeacher.values()].map(async (t) => ({ ...t, periods: await getTeachingSchedule({ teacher_user_id: t.teacherId }).catch(() => null) }))
        );
        setAdvisors(list);
      })
      .catch(() => setAdvisors(null));
  }, []);

  if (advisors === undefined) return <div className="rounded-2xl border border-gray-200 bg-white p-5 text-[15px] text-gray-400">กำลังโหลดตารางสอนครูที่ปรึกษา…</div>;
  if (advisors === null) return <div className="rounded-2xl border border-gray-200 bg-white p-5 text-[15px] text-gray-500">โหลดตารางสอนครูที่ปรึกษาไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</div>;
  if (!advisors.length) return null;

  const a = advisors[Math.min(active, advisors.length - 1)];
  const periods = a.periods || [];
  const slot = (day, period) => periods.find((p) => Number(p.weekday) === day && Number(p.period) === period);
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // 0 = จันทร์
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const nowPeriod = todayIdx <= 4 ? PERIOD_OPTIONS.find((p) => { const [s, e] = p.time.split("-"); return hhmm >= s && hhmm < e; })?.period : null;
  const freeToday = todayIdx <= 4 ? PERIOD_OPTIONS.filter((p) => !slot(todayIdx, p.period)).length : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-[0_12px_32px_-22px_rgba(15,23,42,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-pink-50 text-pink-500 grid place-items-center">
            <FaChalkboardTeacher className="text-[18px]" />
          </span>
          <div>
            <div className="text-[17px] font-semibold text-gray-900">ตารางสอนครูที่ปรึกษา</div>
            <div className="text-[14px] text-gray-500">
              {a.teacherName} · ครูที่ปรึกษาห้อง {a.rooms.join(", ")}
            </div>
          </div>
        </div>
        {advisors.length > 1 && (
          <div className="flex flex-wrap gap-2">
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
      </div>

      {a.periods === null ? (
        <p className="mt-4 text-[14.5px] text-gray-500">โหลดตารางสอนไม่สำเร็จ</p>
      ) : !periods.length ? (
        <p className="mt-4 text-[14.5px] text-gray-500">ครูยังไม่ได้บันทึกตารางสอน — ขอนัดได้ตามปกติ แล้วรอครูยืนยันเวลา</p>
      ) : (
        <>
          {freeToday != null && (
            <p className="mt-3 text-[14px] text-gray-600">
              วันนี้ครูว่าง <b className="text-emerald-600">{freeToday} คาบ</b> จาก {PERIOD_OPTIONS.length} คาบ
            </p>
          )}
          {/* ตารางกว้างกว่าจอมือถือ → เลื่อนซ้าย-ขวาได้ในกรอบนี้ */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1 text-center">
              <thead>
                <tr>
                  <th className="w-20 text-[12.5px] font-medium text-gray-400">คาบ</th>
                  {WEEKDAY_OPTIONS.map((w) => (
                    <th key={w.value} className={`rounded-lg py-1.5 text-[14px] font-semibold ${w.value === todayIdx ? "bg-pink-500 text-white" : "text-gray-600"}`}>
                      <span className="sm:hidden">{SHORT_DAY[w.value]}</span>
                      <span className="hidden sm:inline">{w.label.replace("วัน", "")}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIOD_OPTIONS.map((p) => (
                  <tr key={p.period}>
                    <td className="align-middle">
                      <div className="text-[13.5px] font-semibold text-gray-700">{p.period}</div>
                      <div className="text-[11px] text-gray-400 leading-tight">{p.time}</div>
                    </td>
                    {WEEKDAY_OPTIONS.map((w) => {
                      const s = slot(w.value, p.period);
                      const isNow = w.value === todayIdx && p.period === nowPeriod;
                      return (
                        <td
                          key={w.value}
                          className={`h-12 rounded-lg px-1 align-middle text-[12.5px] leading-tight ${
                            s ? "bg-pink-100 text-pink-800" : "bg-emerald-50 text-emerald-700"
                          } ${isNow ? "ring-2 ring-pink-400" : ""}`}
                          title={s ? `${s.subject || "สอน"}${s.classroom ? ` ห้อง ${s.classroom}` : ""}` : "ว่าง"}
                        >
                          {s ? (
                            <>
                              <div className="font-semibold">{s.subject || "สอน"}</div>
                              {s.classroom && <div className="text-[11.5px] opacity-80">ห้อง {s.classroom}</div>}
                            </>
                          ) : (
                            <span className="font-medium">ว่าง</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-pink-100 border border-pink-200" />ครูมีคาบสอน</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-200" />ว่าง — เหมาะสำหรับขอนัดพบ</span>
            {nowPeriod && <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-pink-400" />คาบปัจจุบัน</span>}
          </div>
        </>
      )}
    </div>
  );
}

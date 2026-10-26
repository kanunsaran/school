import { useEffect, useRef, useState } from "react";
import { formatThaiTimeLabel } from "../utils/feedShared.js";
import { toDateKey, keyToDate, untilLabel, weekBars } from "../utils/appointmentRange.js";

// ตารางปฏิทินนัดหมาย (ใช้ทั้งหน้าปฏิทินครูและนักเรียน): 6 สัปดาห์เสมอ ช่องสูงคงที่,
// ใต้ตัวเลขวันแสดงหัวข้อนัดเป็นแถบชมพู ครบทุกเรื่อง ข้อความเต็ม • นัดหลายวัน = แถบยาวแถบเดียวพาดตั้งแต่วันแรกถึงวันสุดท้าย
// (แถบทับกันวางคนละแถว สัปดาห์สูงขึ้นตามจำนวนแถว) — คำนวณตำแหน่งด้วย weekBars ใน utils/appointmentRange.js
// หัวข้อเดียวกันหลายคนรวมเป็นแถบเดียว (×จำนวน) • นัดหลายวันขึ้นต้นด้วย "ถึง 29 ต.ค." (ไว้หน้าหัวข้อ ช่องแคบจะได้ไม่ถูกตัด) • ผ่านไปแล้ว = ชมพูจาง
// titleOf(appointment) => ข้อความที่แสดงในแถบ

// needsReply(appointment) => true = นัดที่รอเราตอบ (ไม่บังคับ) — วันนั้นมีจุดสีเหลืองและป้ายสีเหลือง
// เลือกหลายวัน (ส่ง onRangeChange มา): กดค้างแล้วลากไปวันอื่น = เลือกช่วงวัน • ลากวันแรก/วันสุดท้ายของช่วง = หด/ขยายช่วง
//   (เหมือนเลือกวันเดินทางตอนจองตั๋ว) • แตะวันเดียว = นัดวันเดียว • rangeEnd = วันสุดท้าย (null = วันเดียว)
export default function AppointmentCalendarGrid({ viewDate, today, selectedDate, appointmentsByDate, titleOf, onSelectDate, needsReply, rangeEnd = null, onRangeChange }) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(today);
  const selectedKey = toDateKey(selectedDate);
  const canRange = Boolean(onRangeChange);
  const endKey = rangeEnd && rangeEnd > selectedKey ? rangeEnd : selectedKey;
  const isRange = endKey > selectedKey;

  // การลาก: mode = new (เริ่มช่วงใหม่) | start/end (ลากขอบช่วงเดิม) • anchor = วันที่ไม่ขยับ
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;
  const setRange = (a, b) => onRangeChange(a < b ? a : b, a < b ? b : a);

  const startDrag = (e, key) => {
    if (!canRange || e.button > 0) return;
    e.preventDefault();
    if (isRange && key === selectedKey) setDrag({ mode: "start", anchor: endKey, from: key, moved: false });
    else if (isRange && key === endKey) setDrag({ mode: "end", anchor: selectedKey, from: key, moved: false });
    else {
      onSelectDate(keyToDate(key));
      onRangeChange(key, key);
      setDrag({ mode: "new", anchor: key, from: key, moved: false });
    }
  };

  useEffect(() => {
    if (!drag) return;
    const keyAt = (ev) => document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-day]")?.dataset.day;
    const onMove = (ev) => {
      const d = dragRef.current;
      const k = keyAt(ev);
      if (!d || !k || (k === d.from && !d.moved)) return;
      if (!d.moved) setDrag({ ...d, moved: true });
      setRange(d.anchor, k);
    };
    const onUp = () => {
      const d = dragRef.current;
      // แตะขอบช่วงโดยไม่ลาก = เลือกวันนั้นวันเดียว
      if (d && !d.moved && d.mode !== "new") {
        onSelectDate(keyToDate(d.from));
        onRangeChange(d.from, d.from);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag?.mode, drag?.anchor]); // eslint-disable-line react-hooks/exhaustive-deps

  // แสดง 6 สัปดาห์เสมอ (42 ช่อง) ให้ปฏิทินสูงเท่ากันทุกเดือน ไม่กระตุกตอนเปลี่ยนเดือน
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  // นัดทั้งหมดในเดือนนี้ (นัดหลายวันอยู่หลายช่อง — ตัดตัวซ้ำ)
  const allAppointments = [...new Map(Object.values(appointmentsByDate).flat().map((a) => [a.id ?? `${a.date}-${a.time}-${titleOf(a)}`, a])).values()];
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <div className={`flex flex-col gap-0.5 sm:gap-1 ${canRange ? "touch-none select-none" : ""}`}>
      {weeks.map((week, w) => {
        const weekKeys = week.map((day) => (day ? toDateKey(new Date(year, month, day)) : null));
        const { bars, lanes } = weekBars(weekKeys, allAppointments, { labelOf: titleOf, needsReply, todayKey });
        return (
          // แถวที่ 1 = ตัวเลขวัน • แถวถัดไป = แถบนัด (นัดหลายวันพาดข้ามช่อง) • แถวสุดท้ายยืดให้สูงขั้นต่ำเท่ากันทุกสัปดาห์
          <div
            key={w}
            className="relative grid grid-cols-7 gap-x-0.5 sm:gap-x-1 min-h-16 sm:min-h-[5.25rem]"
            style={{ gridTemplateRows: `2.25rem repeat(${lanes}, auto) minmax(0.25rem, 1fr)` }}
          >
            {week.map((day, i) => {
              if (day === null) return <div key={`blank-${i}`} style={{ gridColumn: i + 1, gridRow: "1 / -1" }} />;
              const cellDate = new Date(year, month, day);
              const key = weekKeys[i];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey || key === endKey;
              const inRange = isRange && key > selectedKey && key < endKey;
              const list = appointmentsByDate[key] || [];
              const waiting = key >= todayKey && Boolean(needsReply) && list.some(needsReply);
              return (
                <button
                  key={key}
                  type="button"
                  data-day={key}
                  style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
                  onPointerDown={(e) => startDrag(e, key)}
                  onClick={(e) => {
                    // เมาส์/นิ้วจัดการใน onPointerDown แล้ว — onClick เหลือไว้ให้กดด้วยคีย์บอร์ด
                    if (canRange && e.detail !== 0) return;
                    onSelectDate(cellDate);
                    if (canRange) onRangeChange(key, key);
                  }}
                  title={list.length ? list.map((a) => `${formatThaiTimeLabel(a.time)} ${titleOf(a)}${untilLabel(a) ? ` (${untilLabel(a)})` : ""}`).join("\n") : undefined}
                  className={`relative min-w-0 !p-0 rounded-lg border flex flex-col items-center justify-start pt-1 transition
                    ${
                      isSelected
                        ? `border-pink-300 bg-pink-50 ${isRange ? "cursor-ew-resize" : ""}`
                        : inRange
                        ? "border-pink-200 bg-pink-50/70"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                >
                  {waiting && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" aria-label="มีนัดรอตอบ" />}
                  {/* ตัวเลขวันอยู่ในวงกลมกลางด้านบน: วันที่เลือก = วงกลมชมพูเข้ม • วันนี้ = วงกลมขอบชมพู */}
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[14.5px] leading-none ${
                      isSelected
                        ? "bg-pink-500 text-white font-semibold"
                        : isToday
                        ? "ring-1 ring-pink-400 text-pink-600 font-semibold"
                        : inRange
                        ? "text-pink-700"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </span>
                </button>
              );
            })}
            {/* แถบนัด: อยู่เหนือช่องวันที่ แต่ไม่รับการกด (กด/ลากทะลุไปที่ช่องวันที่ด้านล่าง) */}
            {bars.map((b) => (
              <span
                key={`${b.label}-${b.s}-${b.e}`}
                style={{ gridColumn: `${b.s + 1} / ${b.e + 2}`, gridRow: b.lane + 2 }}
                className={`pointer-events-none z-10 mx-1 mb-0.5 self-start whitespace-normal break-words text-center px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold leading-tight shadow-[0_0_0_1px_rgba(255,255,255,0.7)] ${
                  b.waiting
                    ? "bg-amber-100 text-amber-800"
                    : b.past
                    ? "bg-pink-50 text-pink-400"
                    : "bg-pink-100 text-pink-700"
                }`}
              >
                {b.label}
                {b.count > 1 && ` ×${b.count}`}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

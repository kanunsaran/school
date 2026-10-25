import { useEffect, useRef, useState } from "react";
import { formatThaiTimeLabel } from "../utils/feedShared.js";
import { toDateKey, keyToDate } from "../utils/appointmentRange.js";

// ตารางปฏิทินนัดหมาย (ใช้ทั้งหน้าปฏิทินครูและนักเรียน): 6 สัปดาห์เสมอ ช่องสูงคงที่,
// ใต้ตัวเลขวันแสดงหัวข้อนัดแรกเป็นแถบชมพู (ผ่านไปแล้ว = ชมพูจาง) + จำนวนที่เหลือ
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

  return (
    <div className={`grid grid-cols-7 gap-0.5 sm:gap-1 ${canRange ? "touch-none select-none" : ""}`}>
      {cells.map((day, i) => {
        // ช่องว่างสูงเท่าช่องวันที่ เพื่อให้ความสูงคงที่
        if (day === null) return <div key={`blank-${i}`} className="h-14 sm:h-16" />;

        const cellDate = new Date(year, month, day);
        const key = toDateKey(cellDate);
        const isToday = key === todayKey;
        const isEdge = key === selectedKey || key === endKey;
        const isSelected = isEdge;
        const inRange = isRange && key > selectedKey && key < endKey;
        const list = appointmentsByDate[key] || [];
        const count = list.length;
        const isPast = key < todayKey;
        // หัวข้อนัดแรกของวัน (ไม่มีหัวข้อใช้ชื่อนักเรียน)
        const firstTitle = count ? titleOf(list[0]) : "";
        const waiting = !isPast && Boolean(needsReply) && list.some(needsReply);

        return (
          <button
            key={key}
            type="button"
            data-day={key}
            onPointerDown={(e) => startDrag(e, key)}
            onClick={(e) => {
              // เมาส์/นิ้วจัดการใน onPointerDown แล้ว — onClick เหลือไว้ให้กดด้วยคีย์บอร์ด
              if (canRange && e.detail !== 0) return;
              onSelectDate(cellDate);
              if (canRange) onRangeChange(key, key);
            }}
            title={count ? list.map((a) => `${formatThaiTimeLabel(a.time)} ${titleOf(a)}`).join("\n") : undefined}
            className={`relative h-14 sm:h-16 min-w-0 !p-0 rounded-lg flex flex-col items-center justify-center gap-1 text-[15px] transition
              ${
                isSelected
                  ? `bg-pink-500 text-white ${isRange ? "cursor-ew-resize" : ""}`
                  : inRange
                  ? "bg-pink-100 text-pink-800"
                  : isToday
                  ? "border border-pink-300 text-pink-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            {waiting && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" aria-label="มีนัดรอตอบ" />}
            <span className="leading-none">{day}</span>
            {count > 0 && (
              <span
                className={`w-full max-w-full truncate text-center px-0.5 sm:px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold leading-none ${
                  isSelected
                    ? "bg-white/25 text-white"
                    : waiting
                    ? "bg-amber-100 text-amber-800"
                    : isPast
                    ? "bg-pink-50 text-pink-400"
                    : "bg-pink-100 text-pink-700"
                }`}
              >
                {firstTitle}
                {count > 1 && ` +${count - 1}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

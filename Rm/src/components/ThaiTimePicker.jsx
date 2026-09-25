import { useEffect, useRef } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// นาฬิกาแบบ custom (เลือกชั่วโมง/นาทีล้วน ไม่มีวินาที ไม่มี AM/PM) แทน <input type="time"> ของเบราว์เซอร์
export default function ThaiTimePicker({ value, onChange, min }) {
  const [h, m] = value ? value.split(":").map(Number) : [null, null];
  const [minH, minM] = min ? min.split(":").map(Number) : [null, null];
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  useEffect(() => {
    hourListRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "center" });
    minuteListRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "center" });
  }, []);

  const setHour = (nh) => onChange(`${String(nh).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`);
  const setMinute = (nm) => onChange(`${String(h ?? 0).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);

  const isHourDisabled = (nh) => minH != null && nh < minH;
  const isMinuteDisabled = (nm) => minH != null && h === minH && minM != null && nm < minM;

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <div className="text-[12px] text-gray-400 mb-1 text-center">ชั่วโมง</div>
        <div
          ref={hourListRef}
          className="h-56 overflow-y-auto rounded-xl border border-gray-100 p-1 space-y-1"
          style={{ scrollSnapType: "y mandatory" }}
        >
          {HOURS.map((hh) => (
            <button
              key={hh}
              type="button"
              data-selected={h === hh}
              disabled={isHourDisabled(hh)}
              onClick={() => setHour(hh)}
              style={{ scrollSnapAlign: "center" }}
              className={`w-full h-11 rounded-lg text-[15px] bg-transparent ${
                h === hh ? "bg-pink-500 text-white font-semibold" : isHourDisabled(hh) ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-pink-50"
              }`}
            >
              {String(hh).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-[12px] text-gray-400 mb-1 text-center">นาที</div>
        <div
          ref={minuteListRef}
          className="h-56 overflow-y-auto rounded-xl border border-gray-100 p-1 space-y-1"
          style={{ scrollSnapType: "y mandatory" }}
        >
          {MINUTES.map((mm) => (
            <button
              key={mm}
              type="button"
              data-selected={m === mm}
              disabled={isMinuteDisabled(mm)}
              onClick={() => setMinute(mm)}
              style={{ scrollSnapAlign: "center" }}
              className={`w-full h-11 rounded-lg text-[15px] bg-transparent ${
                m === mm ? "bg-pink-500 text-white font-semibold" : isMinuteDisabled(mm) ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-pink-50"
              }`}
            >
              {String(mm).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import Swal from "sweetalert2";
import { FaCheck, FaTimes } from "react-icons/fa";
import { respondAppointment } from "../callapi/callapi_user.jsx";
import { STATUS_STYLE, thaiDateLong, thaiTime } from "../utils/appointmentStatus.js";
import ThaiCalendarField from "./ThaiCalendarField.jsx";
import ThaiTimeField from "./ThaiTimeField.jsx";

const todayKey = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const apiError = (e) => e?.response?.data?.message || "ลองใหม่อีกครั้ง";
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// สถานะการตอบรับนัด + ปุ่ม: ผู้ถูกนัด → ยืนยัน (ตรวจรายละเอียด + ติ๊กรับทราบก่อนส่ง) / ปฏิเสธ (เหตุผล + วันเวลาที่สะดวก)
// ผู้นัด → เห็นคำตอบ และกด "เลื่อนนัดตามที่ขอ" ได้เมื่ออีกฝ่ายเสนอวันเวลาใหม่
// appt: { id, date, time, note, status, byMe, responseNote, proposedDate, proposedTime } • otherLabel = "ครู" / "นักเรียน" • otherName = ชื่ออีกฝ่าย
export default function AppointmentResponse({ appt, otherLabel, otherName, isPast, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const status = appt.status || "confirmed";
  const badge = STATUS_STYLE[status];
  const proposal = appt.proposedDate ? `${thaiDateLong(appt.proposedDate)}${appt.proposedTime ? ` เวลา ${thaiTime(appt.proposedTime)}` : ""}` : "";

  const run = async (body, okTitle) => {
    setBusy(true);
    try {
      await respondAppointment(appt.id, body);
      Swal.fire({ icon: "success", title: okTitle, timer: 2000, showConfirmButton: false });
      await onChanged?.();
      return true;
    } catch (e) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: apiError(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  // ยืนยัน: ให้ตรวจรายละเอียดและติ๊กรับทราบก่อน แล้วค่อยส่งให้อีกฝ่าย
  const confirm = async () => {
    const r = await Swal.fire({
      title: "ยืนยันนัดหมายนี้?",
      html: `<div style="text-align:left;font-size:15.5px;line-height:1.8;background:#fdf2f8;border-radius:12px;padding:10px 14px">
        ${otherName ? `<div><span style="color:#6b7280">${esc(otherLabel)}:</span> <b>${esc(otherName)}</b></div>` : ""}
        <div><span style="color:#6b7280">วันที่:</span> <b>${esc(thaiDateLong(appt.date))}</b></div>
        <div><span style="color:#6b7280">เวลา:</span> <b>${esc(thaiTime(appt.time))}</b></div>
        ${appt.note ? `<div><span style="color:#6b7280">เรื่อง:</span> ${esc(appt.note)}</div>` : ""}
      </div>`,
      input: "checkbox",
      inputValue: 0,
      inputPlaceholder: "ฉันตรวจสอบแล้ว และจะมาตามวันและเวลานี้",
      inputValidator: (v) => (!v ? "ติ๊กช่องด้านบนก่อนส่งการยืนยัน" : undefined),
      showCancelButton: true,
      confirmButtonText: `ส่งการยืนยันถึง${otherLabel}`,
      cancelButtonText: "กลับ",
      confirmButtonColor: "#ec4899",
      cancelButtonColor: "#9ca3af",
    });
    if (r.isConfirmed) await run({ action: "confirm" }, `ส่งการยืนยันถึง${otherLabel}แล้ว`);
  };

  const btn = "h-8 px-3.5 rounded-full text-[13.5px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50 transition";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
      {badge && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${badge.badge}`}>{badge.label}</span>}

      {status === "pending" && appt.byMe && <span className="text-amber-700">รอ{otherLabel}ยืนยัน</span>}
      {status === "pending" && !appt.byMe && !isPast && <span className="font-medium text-amber-800">กรุณาตอบรับนัดนี้</span>}

      {status === "pending" && !appt.byMe && !isPast && (
        <span className="flex gap-2 basis-full sm:basis-auto sm:ml-auto">
          <button type="button" disabled={busy} onClick={confirm} className={`${btn} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
            <FaCheck className="text-[11px]" /> ยืนยัน
          </button>
          <button type="button" disabled={busy} onClick={() => setDeclining(true)} className={`${btn} border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-600`}>
            <FaTimes className="text-[11px]" /> ปฏิเสธ
          </button>
        </span>
      )}

      {status === "confirmed" && !appt.byMe && !isPast && (
        <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="text-[13px] text-gray-400 hover:text-red-600 bg-transparent !p-0">
          ไม่สะดวกแล้ว
        </button>
      )}

      {status === "declined" && (
        <div className="w-full rounded-lg bg-white/80 px-3 py-2 text-[14px] text-gray-800">
          {appt.byMe ? `${otherLabel}ไม่สะดวกตามนัดนี้` : "คุณแจ้งว่าไม่สะดวก"}
          {appt.responseNote && <div className="text-gray-600">เหตุผล: {appt.responseNote}</div>}
          {proposal ? (
            <div>
              ขอเปลี่ยนเป็น: <b>{proposal}</b>
            </div>
          ) : (
            <div className="text-gray-400">ไม่ได้เสนอวันเวลาใหม่</div>
          )}
          {appt.byMe && appt.proposedDate && appt.proposedTime && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run({ action: "accept_proposal" }, "เลื่อนนัดแล้ว")}
              className={`${btn} mt-1.5 !bg-pink-500 hover:!bg-pink-600 text-white`}
            >
              เลื่อนนัดตามที่ขอ
            </button>
          )}
          {!appt.byMe && !isPast && (
            <button type="button" disabled={busy} onClick={confirm} className="mt-1 block text-[13px] text-emerald-700 hover:underline bg-transparent !p-0">
              เปลี่ยนใจ — ยืนยันตามนัดเดิม
            </button>
          )}
        </div>
      )}

      {declining && (
        <DeclineModal
          otherLabel={otherLabel}
          busy={busy}
          onClose={() => setDeclining(false)}
          onSubmit={async (v) => {
            if (await run({ action: "decline", ...v }, "ส่งคำตอบแล้ว")) setDeclining(false);
          }}
        />
      )}
    </div>
  );
}

// ปฏิเสธนัด: เหตุผล + วันเวลาที่สะดวก (ปฏิทินและนาฬิกาแบบไทยเหมือนหน้าอื่น)
function DeclineModal({ otherLabel, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const min = todayKey();

  const submit = () => {
    if (time && !date) return setError("เลือกวันที่สะดวกด้วย");
    if (date && date < min) return setError("เลือกวันนี้หรือหลังจากนี้");
    onSubmit({ reason: reason.trim(), proposed_date: date || null, proposed_time: time || null });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="text-[18px] font-semibold text-gray-900">ไม่สะดวกตามนัดนี้</div>
        <p className="mt-0.5 text-[13.5px] text-gray-500">{otherLabel}จะเห็นเหตุผลและวันเวลาที่คุณสะดวก แล้วกดเลื่อนนัดตามที่ขอได้</p>

        <label className="mt-4 block text-[14px] text-gray-600" htmlFor="decline-reason">
          เหตุผล <span className="text-gray-400">(ไม่บังคับ)</span>
        </label>
        <textarea
          id="decline-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="เช่น ติดสอบ / มีเรียนพิเศษ"
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-pink-400"
        />

        <div className="mt-3 text-[14px] text-gray-600">
          ขอเปลี่ยนเป็น <span className="text-gray-400">(ไม่บังคับ)</span>
        </div>
        <div className="mt-1 grid grid-cols-[1fr_140px] gap-2">
          <ThaiCalendarField value={date} onChange={setDate} min={min} placeholder="เลือกวันที่" heightClass="h-11" bgClass="bg-white" dropUp />
          <ThaiTimeField value={time} onChange={setTime} placeholder="เวลา" heightClass="h-11" bgClass="bg-white" dropUp />
        </div>
        {error && <div className="mt-2 text-[13.5px] text-red-600">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[14.5px] text-gray-600 hover:bg-gray-50">
            กลับ
          </button>
          <button type="button" onClick={submit} disabled={busy} className="h-10 px-4 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[14.5px] font-medium disabled:opacity-50">
            {busy ? "กำลังส่ง..." : `ส่งคำตอบถึง${otherLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

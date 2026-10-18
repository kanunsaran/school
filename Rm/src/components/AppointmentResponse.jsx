import { useState } from "react";
import Swal from "sweetalert2";
import { FaCheck, FaTimes, FaRegCalendarCheck, FaRegCalendarTimes } from "react-icons/fa";
import { respondAppointment } from "../callapi/callapi_user.jsx";
import { STATUS_STYLE, thaiDateLong, thaiTime } from "../utils/appointmentStatus.js";
import ThaiCalendarField from "./ThaiCalendarField.jsx";
import ThaiTimeField from "./ThaiTimeField.jsx";

const todayKey = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const apiError = (e) => e?.response?.data?.message || "ลองใหม่อีกครั้ง";

// สถานะการตอบรับนัด + ปุ่ม: ผู้ถูกนัด → ยืนยัน (ตรวจรายละเอียด + ติ๊กรับทราบก่อนส่ง) / ปฏิเสธ (เหตุผล + วันเวลาที่สะดวก)
// ผู้นัด → เห็นคำตอบ และกด "เลื่อนนัดตามที่ขอ" ได้เมื่ออีกฝ่ายเสนอวันเวลาใหม่
// appt: { id, date, time, note, status, byMe, responseNote, proposedDate, proposedTime } • otherLabel = "ครู" / "นักเรียน" • otherName = ชื่ออีกฝ่าย
export default function AppointmentResponse({ appt, otherLabel, otherName, isPast, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [confirming, setConfirming] = useState(false);
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

  // ยืนยัน: เปิดกล่องให้ตรวจรายละเอียดและติ๊กรับทราบก่อน แล้วค่อยส่งให้อีกฝ่าย
  const confirm = () => setConfirming(true);

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

      {confirming && (
        <ConfirmModal
          appt={appt}
          otherLabel={otherLabel}
          otherName={otherName}
          busy={busy}
          onClose={() => setConfirming(false)}
          onSubmit={async () => {
            if (await run({ action: "confirm" }, `ส่งการยืนยันถึง${otherLabel}แล้ว`)) setConfirming(false);
          }}
        />
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

// กรอบป๊อปอัพแบบเดียวกับหน้าอื่นของเว็บ (PromptModal): หัวข้อ + ปุ่มปิด / เนื้อหา / ปุ่มยกเลิก-ยืนยันเต็มความกว้าง มุมโค้ง
function ModalShell({ title, icon: Icon, iconColorClass, busy, onClose, children, cancelLabel = "ยกเลิก", confirmLabel, confirmDisabled, onConfirm }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[440px] max-w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
            {Icon && <Icon className={iconColorClass} size={15} />} {title}
          </h3>
          <button type="button" onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-700 bg-transparent">
            <FaTimes size={16} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14px] font-medium">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14px] font-semibold"
          >
            {busy ? "กำลังส่ง..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ยืนยันนัด: แสดงรายละเอียด + ต้องติ๊กรับทราบก่อนส่ง
function ConfirmModal({ appt, otherLabel, otherName, busy, onClose, onSubmit }) {
  const [ok, setOk] = useState(false);
  const row = (k, v) =>
    v ? (
      <div className="flex gap-3">
        <span className="w-16 shrink-0 text-gray-500">{k}</span>
        <span className="font-medium text-gray-900">{v}</span>
      </div>
    ) : null;
  return (
    <ModalShell
      title="ยืนยันนัดหมายนี้?"
      icon={FaRegCalendarCheck}
      iconColorClass="text-emerald-500"
      busy={busy}
      onClose={onClose}
      cancelLabel="กลับ"
      confirmLabel={`ส่งการยืนยันถึง${otherLabel}`}
      confirmDisabled={!ok}
      onConfirm={onSubmit}
    >
      <div className="rounded-xl bg-pink-50/60 px-4 py-3 space-y-1 text-[14.5px]">
        {row(otherLabel, otherName)}
        {row("วันที่", thaiDateLong(appt.date))}
        {row("เวลา", thaiTime(appt.time))}
        {row("เรื่อง", appt.note)}
      </div>
      <label className="mt-4 flex items-start gap-2.5 cursor-pointer text-[14.5px] text-gray-700">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-4 w-4 accent-pink-500" />
        ฉันตรวจสอบแล้ว และจะมาตามวันและเวลานี้
      </label>
    </ModalShell>
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
    <ModalShell
      title="ไม่สะดวกตามนัดนี้"
      icon={FaRegCalendarTimes}
      iconColorClass="text-red-400"
      busy={busy}
      onClose={onClose}
      cancelLabel="กลับ"
      confirmLabel={`ส่งคำตอบถึง${otherLabel}`}
      onConfirm={submit}
    >
      <p className="-mt-1 text-[13.5px] text-gray-500">{otherLabel}จะเห็นเหตุผลและวันเวลาที่คุณสะดวก แล้วกดเลื่อนนัดตามที่ขอได้</p>
      <label className="mt-4 block text-[13px] font-medium text-gray-700 mb-1.5" htmlFor="decline-reason">
        เหตุผล <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
      </label>
      <textarea
        id="decline-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 500))}
        rows={2}
        placeholder="เช่น ติดสอบ / มีเรียนพิเศษ"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14.5px] outline-none focus:border-pink-400 resize-none"
      />
      <div className="mt-4 text-[13px] font-medium text-gray-700 mb-1.5">
        ขอเปลี่ยนเป็น <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
      </div>
      <div className="grid grid-cols-[1fr_140px] gap-2">
        <ThaiCalendarField value={date} onChange={setDate} min={min} placeholder="เลือกวันที่" heightClass="h-11" dropUp />
        <ThaiTimeField value={time} onChange={setTime} placeholder="เวลา" heightClass="h-11" dropUp />
      </div>
      {error && <div className="mt-2 text-[13.5px] text-red-600">{error}</div>}
    </ModalShell>
  );
}

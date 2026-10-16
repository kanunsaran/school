import { useState } from "react";
import Swal from "sweetalert2";
import { FaCheck, FaTimes } from "react-icons/fa";
import { respondAppointment } from "../callapi/callapi_user.jsx";
import { STATUS_STYLE } from "../utils/appointmentStatus.js";

const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const thaiDate = (ymd) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
};
const todayKey = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const apiError = (e) => e?.response?.data?.message || "ลองใหม่อีกครั้ง";


// สถานะการตอบรับนัด + ปุ่ม: ผู้ถูกนัด → ยืนยัน / ปฏิเสธ (บอกเหตุผล + วันเวลาที่สะดวก)
// ผู้นัด → เห็นคำตอบ และกด "เลื่อนนัดตามที่ขอ" ได้เมื่ออีกฝ่ายเสนอวันเวลาใหม่
// appt: { id, status, byMe, responseNote, proposedDate, proposedTime } • otherLabel = "ครู" / "นักเรียน"
// otherName = ชื่ออีกฝ่าย (แสดงในกล่องยืนยัน)
export default function AppointmentResponse({ appt, otherLabel, otherName, isPast, onChanged }) {
  const [busy, setBusy] = useState(false);
  const status = appt.status || "confirmed";
  const badge = STATUS_STYLE[status];
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const proposal = appt.proposedDate ? `${thaiDate(appt.proposedDate)}${appt.proposedTime ? ` เวลา ${String(appt.proposedTime).slice(0, 5)} น.` : ""}` : "";

  const run = async (body, okTitle) => {
    setBusy(true);
    try {
      await respondAppointment(appt.id, body);
      Swal.fire({ icon: "success", title: okTitle, timer: 2000, showConfirmButton: false });
      await onChanged?.();
    } catch (e) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: apiError(e) });
    } finally {
      setBusy(false);
    }
  };

  // ยืนยัน: ให้ตรวจรายละเอียดและติ๊กรับทราบก่อน แล้วค่อยส่งให้อีกฝ่าย
  const confirm = async () => {
    const r = await Swal.fire({
      title: "ยืนยันนัดหมายนี้?",
      html: `<div style="text-align:left;font-size:15.5px;line-height:1.8;background:#f9fafb;border-radius:12px;padding:10px 14px">
        ${otherName ? `<div><span style="color:#6b7280">${esc(otherLabel)}:</span> <b>${esc(otherName)}</b></div>` : ""}
        <div><span style="color:#6b7280">วันเวลา:</span> <b>${esc(thaiDate(appt.date))} เวลา ${esc(String(appt.time).slice(0, 5))} น.</b></div>
        ${appt.note ? `<div><span style="color:#6b7280">เรื่อง:</span> ${esc(appt.note)}</div>` : ""}
      </div>`,
      input: "checkbox",
      inputValue: 0,
      inputPlaceholder: "ฉันตรวจสอบแล้ว และจะมาตามวันและเวลานี้",
      inputValidator: (v) => (!v ? "ติ๊กช่องด้านบนก่อนส่งการยืนยัน" : undefined),
      showCancelButton: true,
      confirmButtonText: `ส่งการยืนยันถึง${otherLabel}`,
      cancelButtonText: "กลับ",
      confirmButtonColor: "#059669",
    });
    if (r.isConfirmed) await run({ action: "confirm" }, `ส่งการยืนยันถึง${otherLabel}แล้ว`);
  };

  const decline = async () => {
    const min = todayKey();
    const r = await Swal.fire({
      title: "ไม่สะดวกตามนัดนี้",
      html: `<div style="text-align:left;font-size:15px">
        <label style="display:block;color:#4b5563;margin-bottom:4px">เหตุผล (ไม่บังคับ)</label>
        <textarea id="dr" rows="2" maxlength="500" placeholder="เช่น ติดสอบ / มีเรียนพิเศษ" style="width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:15px"></textarea>
        <label style="display:block;color:#4b5563;margin:12px 0 4px">ขอเปลี่ยนเป็นวันที่ (ไม่บังคับ)</label>
        <div style="display:flex;gap:8px">
          <input id="dd" type="date" min="${min}" style="flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:15px" />
          <input id="dt" type="time" step="900" style="width:130px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:15px" />
        </div>
        <div style="margin-top:6px;font-size:13px;color:#9ca3af">${otherLabel}จะเห็นวันเวลาที่คุณสะดวก และกดเลื่อนนัดตามที่ขอได้</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "ส่งคำตอบ",
      cancelButtonText: "กลับ",
      confirmButtonColor: "#dc2626",
      focusConfirm: false,
      preConfirm: () => {
        const reason = document.getElementById("dr").value.trim();
        const proposed_date = document.getElementById("dd").value;
        const proposed_time = document.getElementById("dt").value;
        if (proposed_time && !proposed_date) return Swal.showValidationMessage("เลือกวันที่สะดวกด้วย");
        if (proposed_date && proposed_date < min) return Swal.showValidationMessage("เลือกวันนี้หรือหลังจากนี้");
        return { reason, proposed_date: proposed_date || null, proposed_time: proposed_time || null };
      },
    });
    if (r.isConfirmed) await run({ action: "decline", ...r.value }, "ส่งคำตอบแล้ว");
  };

  const btn = "h-8 px-3 rounded-lg text-[13.5px] font-medium disabled:opacity-50 transition";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
      {badge && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${badge.badge}`}>{badge.label}</span>}

      {status === "pending" && appt.byMe && <span className="text-amber-700">รอ{otherLabel}ยืนยัน</span>}
      {status === "pending" && !appt.byMe && !isPast && <span className="font-medium text-amber-800">กรุณาตอบรับนัดนี้</span>}

      {status === "pending" && !appt.byMe && !isPast && (
        <>
          <button type="button" disabled={busy} onClick={confirm} className={`${btn} inline-flex items-center gap-1.5 !bg-emerald-600 hover:!bg-emerald-700 text-white`}>
            <FaCheck className="text-[11px]" /> ยืนยัน
          </button>
          <button type="button" disabled={busy} onClick={decline} className={`${btn} inline-flex items-center gap-1.5 border border-red-300 bg-white text-red-600 hover:bg-red-50`}>
            <FaTimes className="text-[11px]" /> ปฏิเสธ
          </button>
        </>
      )}

      {status === "confirmed" && !appt.byMe && !isPast && (
        <button type="button" disabled={busy} onClick={decline} className="text-[13px] text-gray-400 hover:text-red-600 bg-transparent !p-0">
          ไม่สะดวกแล้ว
        </button>
      )}

      {status === "declined" && (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[14px] text-gray-800">
          {appt.byMe ? `${otherLabel}ไม่สะดวกตามนัดนี้` : "คุณแจ้งว่าไม่สะดวก"}
          {appt.responseNote && <div className="text-gray-600">เหตุผล: {appt.responseNote}</div>}
          {proposal ? <div>ขอเปลี่ยนเป็น: <b>{proposal}</b></div> : <div className="text-gray-400">ไม่ได้เสนอวันเวลาใหม่</div>}
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
    </div>
  );
}

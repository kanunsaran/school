import { useState } from "react";
import Swal from "sweetalert2";
import { FaTimes, FaImage, FaTrash, FaPlus, FaMagic } from "react-icons/fa";
import { WEEKDAY_OPTIONS, PERIOD_OPTIONS } from "../utils/teachingScheduleStore.js";
import { readScheduleFromImage } from "../utils/scheduleOcr.js";
import { addTeachingPeriod, removeTeachingPeriod } from "../callapi/callapi_user.jsx";

// นำเข้าตารางสอนจากรูป: เลือกรูป → OCR อ่านเป็นรายการคาบ → ครูตรวจ/แก้ → บันทึก
// existing: ตารางสอนเดิม [{id, day, period, classroom}]
export default function ScheduleImportModal({ teacherId, existing, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | reading | review | saving
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState([]);
  const [info, setInfo] = useState(null);
  const [replaceAll, setReplaceAll] = useState(false);

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      Swal.fire({ icon: "warning", title: "ใช้ได้เฉพาะไฟล์รูปภาพ", text: "รองรับ .jpg .png .webp" });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStatus("idle");
    setRows([]);
    setInfo(null);
  };

  const runOcr = async () => {
    if (!file) return;
    setStatus("reading");
    setProgress(0);
    try {
      const res = await readScheduleFromImage(file, setProgress);
      setRows(res.entries.map((e, i) => ({ key: i, day: e.day, period: e.period, classroom: e.classroom, subject: e.subject || "แนะแนว", raw: e.raw })));
      setInfo(res.info);
      setStatus("review");
    } catch (err) {
      console.error("อ่านตารางจากรูปไม่สำเร็จ:", err);
      setStatus("idle");
      Swal.fire({ icon: "error", title: "อ่านรูปไม่สำเร็จ", text: "ลองใช้รูปที่ชัดขึ้น หรือตรวจการเชื่อมต่ออินเทอร์เน็ต (ครั้งแรกต้องดาวน์โหลดตัวอ่านภาษาไทย)" });
    }
  };

  const update = (key, patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key) => setRows((prev) => prev.filter((r) => r.key !== key));
  const addRow = () => setRows((prev) => [...prev, { key: Date.now(), day: 0, period: 1, classroom: "", subject: "แนะแนว", raw: "" }]);

  const conflictOf = (r) => (replaceAll ? null : existing.find((s) => s.day === r.day && s.period === r.period) || null);
  const dupInList = (r) => rows.some((o) => o.key !== r.key && o.day === r.day && o.period === r.period);

  const toSave = rows.filter((r) => !conflictOf(r));
  const hasDup = rows.some(dupInList);

  const save = async () => {
    if (hasDup) {
      Swal.fire({ icon: "warning", title: "มีคาบซ้ำกันในรายการ", text: "แก้วัน/คาบที่ซ้ำ (ไฮไลต์สีแดง) ก่อนบันทึก" });
      return;
    }
    if (toSave.length === 0) {
      Swal.fire({ icon: "info", title: "ไม่มีคาบที่จะบันทึก" });
      return;
    }
    const confirm = await Swal.fire({
      icon: "question",
      title: `บันทึก ${toSave.length} คาบสอน?`,
      html: replaceAll ? `<b>ตารางสอนเดิม ${existing.length} คาบจะถูกลบทั้งหมด</b>` : rows.length > toSave.length ? `ข้าม ${rows.length - toSave.length} คาบที่ซ้ำกับตารางเดิม` : "",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ec4899",
    });
    if (!confirm.isConfirmed) return;

    setStatus("saving");
    let ok = 0;
    const failed = [];
    try {
      if (replaceAll) for (const s of existing) await removeTeachingPeriod(s.id);
      for (const r of toSave) {
        try {
          await addTeachingPeriod({ teacher_user_id: teacherId, weekday: r.day, period: r.period, classroom: r.classroom.trim() || null, subject: r.subject.trim() || "แนะแนว" });
          ok++;
        } catch (err) {
          failed.push(`${WEEKDAY_OPTIONS[r.day]?.label} คาบ ${r.period}: ${err.response?.data?.message || "บันทึกไม่สำเร็จ"}`);
        }
      }
    } finally {
      setStatus("review");
    }
    await onSaved();
    if (failed.length) {
      Swal.fire({ icon: "warning", title: `บันทึกได้ ${ok} คาบ`, html: `ไม่สำเร็จ ${failed.length} คาบ:<br/>${failed.join("<br/>")}` });
    } else {
      Swal.fire({ icon: "success", title: `นำเข้าตารางสอน ${ok} คาบแล้ว`, timer: 1800, showConfirmButton: false });
      onClose();
    }
  };

  const dayGroups = WEEKDAY_OPTIONS.map((w) => ({ ...w, count: rows.filter((r) => r.day === w.value).length }));

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={status === "reading" || status === "saving" ? undefined : onClose} />
      <div className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[19px] font-bold text-gray-900">นำเข้าตารางสอนจากรูป</div>
            <div className="text-[14px] text-gray-500 mt-0.5">อัปโหลดรูปตารางสอน ระบบจะอ่านวัน คาบ และห้องให้อัตโนมัติ</div>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" disabled={status === "reading" || status === "saving"} className="w-9 h-9 !p-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
            <FaTimes size={14} />
          </button>
        </div>

        {/* 1) เลือกรูป */}
        <label
          className="block rounded-2xl border-2 border-dashed border-gray-200 hover:border-pink-300 bg-gray-50/60 p-4 cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0]);
          }}
        >
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          {previewUrl ? (
            <img src={previewUrl} alt="ตารางสอน" className="mx-auto max-h-56 rounded-lg object-contain" />
          ) : (
            <div className="py-6 text-center text-gray-500">
              <FaImage size={28} className="mx-auto mb-2 text-gray-300" />
              <div className="text-[15px] font-medium">เลือกรูปตารางสอน หรือลากรูปมาวางที่นี่</div>
              <div className="text-[13px] text-gray-400 mt-1">ถ่ายให้ตรง ไม่เอียง เห็นชื่อวันด้านซ้าย และเลขคาบหรือเวลาด้านบน</div>
            </div>
          )}
        </label>

        {file && status !== "review" && (
          <div className="mt-4">
            {status === "reading" ? (
              <div>
                <div className="flex justify-between text-[13.5px] text-gray-500 mb-1.5">
                  <span>{progress === 0 ? "กำลังเตรียมตัวอ่านภาษาไทย (ครั้งแรกอาจใช้เวลาสักครู่)..." : "กำลังอ่านตาราง..."}</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all" style={{ width: `${Math.max(3, progress * 100)}%` }} />
                </div>
              </div>
            ) : (
              <button type="button" onClick={runOcr} className="w-full h-11 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15.5px] font-semibold flex items-center justify-center gap-2">
                <FaMagic size={14} /> อ่านตารางจากรูป
              </button>
            )}
          </div>
        )}

        {/* 2) ตรวจและแก้ไข */}
        {(status === "review" || status === "saving") && (
          <div className="mt-5">
            <div className={`rounded-xl px-4 py-3 text-[14px] ${rows.length ? "bg-pink-50 text-pink-800" : "bg-amber-50 text-amber-800"}`}>
              {rows.length
                ? `อ่านเจอ ${rows.length} คาบ — ตรวจวัน คาบ และห้องให้ถูกต้องก่อนบันทึก (OCR อาจอ่านตัวหนังสือผิดได้)`
                : `อ่านคาบสอนจากรูปไม่ได้${info?.daysFound === 0 ? " (ไม่เจอชื่อวันในรูป)" : ""} — ลองรูปที่ชัดขึ้น หรือเพิ่มคาบเองด้านล่าง`}
            </div>

            {rows.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dayGroups.map((d) => (
                  <span key={d.value} className="text-[12.5px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {d.label.replace("วัน", "")} {d.count}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 space-y-2">
              {rows.map((r) => {
                const conflict = conflictOf(r);
                const dup = dupInList(r);
                return (
                  <div key={r.key} className={`rounded-xl border p-2.5 ${dup ? "border-red-300 bg-red-50/40" : conflict ? "border-amber-200 bg-amber-50/40" : "border-gray-200"}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-[8rem_9rem_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
                      <select value={r.day} onChange={(e) => update(r.key, { day: +e.target.value })} className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-[14.5px]">
                        {WEEKDAY_OPTIONS.map((w) => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                      <select value={r.period} onChange={(e) => update(r.key, { period: +e.target.value })} className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-[14.5px]">
                        {PERIOD_OPTIONS.map((p) => (
                          <option key={p.period} value={p.period}>คาบ {p.period} ({p.time})</option>
                        ))}
                      </select>
                      <input value={r.classroom} onChange={(e) => update(r.key, { classroom: e.target.value })} placeholder="ห้อง เช่น 6/2" className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[14.5px] outline-none focus:border-pink-400" />
                      <input value={r.subject} onChange={(e) => update(r.key, { subject: e.target.value })} placeholder="วิชา" className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[14.5px] outline-none focus:border-pink-400" />
                      <button type="button" onClick={() => remove(r.key)} aria-label="ลบแถว" className="col-span-2 sm:col-span-1 h-10 sm:w-10 !p-0 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center gap-1.5 text-[13.5px] bg-transparent">
                        <FaTrash size={13} /> <span className="sm:hidden">ลบแถวนี้</span>
                      </button>
                    </div>
                    {(r.raw || conflict || dup) && (
                      <div className="mt-1.5 text-[12.5px] text-gray-400">
                        {r.raw && <>อ่านจากรูป: “{r.raw}”</>}
                        {dup && <span className="text-red-600"> • วัน/คาบซ้ำกับแถวอื่น</span>}
                        {conflict && !dup && <span className="text-amber-700"> • ซ้ำกับคาบเดิม (ห้อง {conflict.classroom || "-"}) — จะข้าม</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={addRow} className="mt-2 text-[14px] text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1.5 bg-transparent">
              <FaPlus size={10} /> เพิ่มคาบเอง
            </button>

            {existing.length > 0 && (
              <label className="mt-4 flex items-start gap-2 text-[14px] text-gray-700 cursor-pointer">
                <input type="checkbox" checked={replaceAll} onChange={(e) => setReplaceAll(e.target.checked)} className="mt-1 w-4 h-4 accent-pink-500" />
                <span>
                  ลบตารางสอนเดิมทั้งหมด ({existing.length} คาบ) แล้วใช้ตารางนี้แทน
                  <span className="block text-[12.5px] text-gray-400">ถ้าไม่เลือก คาบที่ซ้ำกับของเดิมจะถูกข้าม</span>
                </span>
              </label>
            )}

            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={runOcr} disabled={status === "saving"} className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[15px] font-medium">
                อ่านรูปใหม่
              </button>
              <button type="button" onClick={save} disabled={status === "saving" || rows.length === 0} className="h-11 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[15px] font-semibold">
                {status === "saving" ? "กำลังบันทึก..." : `บันทึก ${toSave.length} คาบ`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

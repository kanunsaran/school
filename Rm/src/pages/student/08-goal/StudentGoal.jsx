import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../../../layout/StudentSidebar";
import Header from "../../../layout/Header";
import {
  FaGraduationCap, FaCompass, FaCamera, FaPlus, FaPen, FaTrashAlt, FaStar, FaChevronDown,
  FaQuoteLeft, FaComments, FaCheckCircle, FaExclamationCircle, FaTimes, FaArrowRight, FaUniversity, FaClipboardList,
} from "react-icons/fa";
import Swal from "sweetalert2";
import {
  getStudent, getEnrollments, getClasses, getGoals, getStudentGeneralInfo, createGoal, updateGoal, deleteGoal, uploadStudentAvatar,
  getStudentGrades, saveStudentGrades,
} from "../../../callapi/callapi_user.jsx";
import { getCurrentUser } from "../../../utils/auth.js";
import { gradeLabel } from "../../../utils/gradeLabel.js";
import { resolveFileUrl } from "../../../utils/media.js";
import Avatar from "../../../components/Avatar.jsx";
import { API_BASE_URL } from "../../../config/api.js";
import useMyRiasec from "../../../hooks/useMyRiasec.js";
import { facultiesForCode, goalTargets, analyzeTarget, matchGoalFaculties } from "../../../utils/riasecScoring.js";
import {
  goalsOf, MAX_GOALS, GOAL_RANK_LABEL, fullUniName, sameUni, programLinkFor, MYTCAS_HOME, GRADE_TERMS, GRADE_SUBJECTS, gradeForSubject,
} from "../../../utils/goals.js";
import uniData from "../../../data/universities.json";
import AdmissionInfo from "../../../components/AdmissionInfo.jsx";
import { GRADE_OPTIONS, readGradeReport, termGpa, groupOf } from "../../../utils/gradeOcr.js";

// หน้าเป้าหมายของฉัน — ตั้งเป้าหมายได้หลายข้อ (คณะ/สาขา + มหาวิทยาลัย + อาชีพ) แต่ละข้อเทียบกับผล RIASEC และข้อมูลคณะ–อาชีพ (Excel)

// ข้อค้นพบความเชื่อมโยงกับผล RIASEC (findingKind) — ชุดเดียวกับหน้าผลแบบทดสอบ
const FINDING = {
  recommended: { label: "แนะนำสำหรับรหัสของคุณ", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  main: { label: "เชื่อมโยงกับความสนใจเด่น", cls: "bg-pink-50 text-pink-700 border-pink-200" },
  partial: { label: "เชื่อมโยงบางด้าน", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  none: { label: "ยังไม่พบความเชื่อมโยงชัดเจน", cls: "bg-gray-50 text-gray-600 border-gray-200" },
};
const EMPTY_FORM = { faculty_name: "", university_name: "", goal_text: "" };
const CARD = "rounded-2xl border border-gray-200 bg-white";

function SectionTitle({ icon, title, subtitle, action }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
          <Icon className="text-[15px]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[16.5px] font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-[13px] text-gray-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// การ์ดเป้าหมาย 1 ข้อ
function GoalCard({ goal, rank, total, analysis, grades, onEdit, onDelete, onMakePrimary, busy }) {
  const [open, setOpen] = useState(rank === 0);
  const f = analysis?.faculty || analysis?.match?.rows?.[0] || null;
  const primary = rank === 0;
  const uniProgram = programLinkFor(f, goal.university_name);
  const uniListed = f && goal.university_name && f.universities.some((u) => sameUni(u, goal.university_name));
  return (
    <div className={`${CARD} overflow-hidden ${primary ? "border-pink-200 shadow-[0_6px_24px_-12px_rgba(236,72,153,0.35)]" : ""}`}>
      <div className={`px-5 pt-4 pb-3 ${primary ? "bg-gradient-to-r from-pink-50 via-white to-white" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${
                primary ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {primary && <FaStar className="text-[10px]" />}
              {GOAL_RANK_LABEL[rank]}
            </span>
            {analysis?.kind && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold ${FINDING[analysis.kind].cls}`}>{FINDING[analysis.kind].label}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!primary && (
              <button
                type="button"
                onClick={onMakePrimary}
                disabled={busy}
                title="ตั้งเป็นเป้าหมายหลัก"
                className="h-8 px-2.5 rounded-lg text-[12.5px] text-pink-600 hover:bg-pink-50 bg-transparent !p-0 sm:!px-2.5"
              >
                <span className="hidden sm:inline">ตั้งเป็นหลัก</span>
                <FaStar className="sm:hidden text-[13px] mx-2" />
              </button>
            )}
            <button type="button" onClick={onEdit} disabled={busy} title="แก้ไข" aria-label="แก้ไขเป้าหมาย" className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 bg-transparent !p-0 flex items-center justify-center">
              <FaPen className="text-[12px]" />
            </button>
            <button type="button" onClick={onDelete} disabled={busy} title="ลบ" aria-label="ลบเป้าหมาย" className="h-8 w-8 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 bg-transparent !p-0 flex items-center justify-center">
              <FaTrashAlt className="text-[12px]" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-start gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${primary ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-500"}`}>
            <FaGraduationCap className="text-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="text-[18px] font-semibold text-gray-900 leading-snug">{goal.faculty_name || goal.career_field}</div>
            {goal.university_name && (
              <div className="text-[14px] text-gray-700 flex items-center gap-1.5 mt-0.5">
                <FaUniversity className="text-[11px] text-pink-400" /> {goal.university_name}
              </div>
            )}
          </div>
        </div>
        {goal.goal_text && (
          <p className="mt-2.5 text-[14px] text-gray-600 leading-6 flex gap-2">
            <FaQuoteLeft className="text-[11px] text-pink-300 mt-1.5 shrink-0" />
            {goal.goal_text}
          </p>
        )}
      </div>

      {f ? (
        <div className="px-5 pb-4">
          <div className="rounded-xl bg-gray-50 px-3.5 py-2.5">
            <div className="text-[12.5px] text-gray-500">ข้อมูลสาขาในระบบ: <span className="font-medium text-gray-700">{f.name}</span></div>
            {goal.university_name && (
              <div className={`text-[12.5px] mt-0.5 ${uniListed || uniProgram ? "text-emerald-700" : "text-gray-500"}`}>
                {uniProgram
                  ? `✓ พบหลักสูตรของ ${fullUniName(goal.university_name)} ใน myTCAS`
                  : uniListed
                  ? `✓ ${fullUniName(goal.university_name)} อยู่ในรายชื่อมหาวิทยาลัยตัวอย่างของสาขานี้`
                  : "ยังไม่มีข้อมูลหลักสูตรของมหาวิทยาลัยนี้ในระบบ — ตรวจรายละเอียดในเว็บไซต์มหาวิทยาลัยหรือ myTCAS"}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {f.subjects.map((s) => {
                const g = gradeForSubject(grades, s);
                return (
                  <span key={s} className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[12.5px] text-gray-700" title={g != null ? "เกรดเฉลี่ยของคุณ" : undefined}>
                    {s}
                    {g != null && <b className="ml-1 text-pink-600">{g.toFixed(2)}</b>}
                  </span>
                );
              })}
              <span className="rounded-full bg-pink-50 border border-pink-100 px-2.5 py-0.5 text-[12.5px] text-pink-700">{f.track}</span>
            </div>
          </div>
          <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 flex items-center gap-1.5 text-[13.5px] font-medium text-pink-600 hover:text-pink-700 bg-transparent !p-0">
            {open ? "ซ่อนแนวทางเตรียมตัว" : "ดูแนวทางเตรียมตัว"}
            <FaChevronDown className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <>
            <dl className="mt-2 grid gap-2 text-[13.5px] leading-6">
              {[
                ["ทักษะที่ควรพัฒนา", f.skills],
                ["กิจกรรมที่ควรลอง", f.advice],
                ["เตรียมสอบ", f.exam],
                ["มหาวิทยาลัยตัวอย่าง", f.universities.join(", ")],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid sm:grid-cols-[130px_1fr] gap-x-3">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-gray-800">{v}</dd>
                  </div>
                ))}
              {uniProgram ? (
                <a href={uniProgram.link} target="_blank" rel="noreferrer" className="text-[13px] text-sky-600 hover:underline">
                  {uniProgram.program} — ตรวจเกณฑ์รับเข้าล่าสุดใน myTCAS ↗
                </a>
              ) : f.links?.[0] ? (
                <a href={f.links[0]} target="_blank" rel="noreferrer" className="text-[13px] text-sky-600 hover:underline">
                  ตรวจหลักสูตรและเกณฑ์รับเข้าล่าสุดใน myTCAS ↗
                </a>
              ) : (
                <a href={MYTCAS_HOME} target="_blank" rel="noreferrer" className="text-[13px] text-sky-600 hover:underline">
                  ค้นหาหลักสูตร “{f.name}” ใน myTCAS ↗ <span className="text-gray-400">(ยังไม่พบหลักสูตรของมหาวิทยาลัยตัวอย่างในประกาศปีนี้)</span>
                </a>
              )}
            </dl>
            <div className="mt-3">
              <AdmissionInfo facultyName={f.name} university={goal.university_name ? fullUniName(goal.university_name) : null} gpax={grades?.gpax ?? null} />
            </div>
            </>
          )}
        </div>
      ) : (
        <div className="px-5 pb-4">
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-2.5 text-[13px] text-amber-800 flex gap-2">
            <FaExclamationCircle className="mt-0.5 shrink-0" />
            ยังไม่พบคณะนี้ในฐานข้อมูล — กดแก้ไขแล้วเลือกชื่อจากรายการ เพื่อให้ระบบให้คำแนะนำได้
          </div>
        </div>
      )}
      {total > 1 && primary && <div className="h-1 bg-gradient-to-r from-pink-400 to-rose-300" />}
    </div>
  );
}

// หน้าต่างเพิ่ม/แก้ไขเป้าหมาย
function GoalModal({ initial, title, data, saving, otherGoals, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const match = useMemo(() => (data ? goalTargets(data, { faculty_name: form.faculty_name, goal_text: form.goal_text }) : []), [data, form.faculty_name, form.goal_text]);
  // มหาวิทยาลัยที่เปิดสอนสาขาที่เลือก (จากไฟล์ข้อมูลคณะ) — กดเพื่อเลือกได้เลย
  const facultyRows = useMemo(() => (data ? matchGoalFaculties(data, form.faculty_name)?.rows || [] : []), [data, form.faculty_name]);
  const uniChips = useMemo(() => [...new Set(facultyRows.flatMap((r) => r.universities.map(fullUniName)))], [facultyRows]);
  const duplicate = otherGoals.some(
    (g) => form.faculty_name.trim() && g.faculty_name === form.faculty_name.trim() && (g.university_name || "") === form.university_name.trim()
  );
  const filled = form.faculty_name.trim();
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-[18px] font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onCancel} aria-label="ปิด" className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 bg-transparent !p-0 flex items-center justify-center">
            <FaTimes className="text-[13px]" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <label className="block">
            <span className="text-[14px] font-medium text-gray-700">คณะ / สาขาที่อยากเรียน</span>
            <input
              value={form.faculty_name}
              onChange={set("faculty_name")}
              list="goal-faculty-options"
              placeholder="เลือกหรือพิมพ์ เช่น การออกแบบกราฟิก"
              className="mt-1 w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[15px] outline-none focus:border-pink-400"
            />
          </label>
          <label className="block">
            <span className="text-[14px] font-medium text-gray-700">
              มหาวิทยาลัย <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
            </span>
            <input
              value={form.university_name}
              onChange={set("university_name")}
              list="goal-university-options"
              placeholder="เลือกหรือพิมพ์ เช่น มหาวิทยาลัยขอนแก่น"
              className="mt-1 w-full h-11 rounded-xl border border-gray-200 px-3.5 text-[15px] outline-none focus:border-pink-400"
            />
          </label>
          {uniChips.length > 0 && (
            <div className="-mt-2">
              <div className="text-[12.5px] text-gray-500 mb-1">มหาวิทยาลัยที่เปิดสอนสาขานี้ (จากข้อมูลในระบบ)</div>
              <div className="flex flex-wrap gap-1.5">
                {uniChips.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, university_name: u }))}
                    className={`rounded-full border px-2.5 py-1 text-[12.5px] ${
                      sameUni(form.university_name, u) ? "!bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-pink-300"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="block">
            <span className="text-[14px] font-medium text-gray-700">
              เหตุผล / แรงบันดาลใจ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
            </span>
            <textarea
              value={form.goal_text}
              onChange={set("goal_text")}
              rows={3}
              placeholder="ทำไมถึงอยากเรียนสาขานี้"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[15px] outline-none focus:border-pink-400 resize-none"
            />
          </label>

          {duplicate && (
            <div className="rounded-xl bg-amber-50 text-amber-800 px-3.5 py-2.5 text-[13.5px]">มีเป้าหมายคณะและมหาวิทยาลัยนี้อยู่แล้ว</div>
          )}
          {filled && (
            <div className={`rounded-xl px-3.5 py-2.5 text-[13.5px] flex gap-2 ${match.length ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {match.length ? <FaCheckCircle className="mt-0.5 shrink-0" /> : <FaExclamationCircle className="mt-0.5 shrink-0" />}
              <span>
                {match.length
                  ? `ระบบพบข้อมูลสาขา: ${[...new Set(match.flatMap((m) => m.match.rows.map((r) => r.name)))].join(", ")} — จะใช้วิเคราะห์กับผล RIASEC และให้คำแนะนำ`
                  : "ยังไม่พบในฐานข้อมูล บันทึกได้ แต่ระบบจะให้คำแนะนำไม่ได้ — ลองเลือกชื่อจากรายการ"}
              </span>
            </div>
          )}
          <datalist id="goal-faculty-options">
            {(data?.faculties || []).map((f) => (
              <option key={f.name} value={f.name} />
            ))}
          </datalist>
          <datalist id="goal-university-options">
            {uniData.universities.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-[15px] hover:bg-gray-50">
            ยกเลิก
          </button>
          <button type="submit" disabled={saving || !filled || duplicate} className="h-10 px-5 rounded-xl !bg-pink-500 hover:!bg-pink-600 disabled:!bg-pink-200 text-white text-[15px] font-semibold">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}

// หน้าต่างเกรด — อัปโหลดรูปใบผลการเรียนทีละภาคเรียน (อ่านอัตโนมัติ แล้วตรวจ/เลือกเกรดแก้ได้) → คำนวณ GPAX + เกรดรายวิชาหลักให้
// ไม่มีใบเกรด → กรอก GPAX/เกรดรายวิชาเองได้เหมือนเดิม
const termsGpax = (terms) => termGpa(Object.values(terms || {}).flatMap((t) => t.courses || []));
const termsSubjects = (terms) => {
  const all = Object.values(terms || {}).flatMap((t) => t.courses || []);
  return Object.fromEntries(GRADE_SUBJECTS.map((k) => [k, termGpa(all.filter((c) => groupOf(c.code) === k))]).filter(([, v]) => v != null));
};
const fmtGpa = (v) => (v == null ? "-" : Number(v).toFixed(2));

function CourseTable({ courses, onChange }) {
  const set = (i, patch) => onChange(courses.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const cell = "h-9 w-full min-w-0 rounded-lg border border-gray-200 px-1.5 sm:px-2 text-[13.5px] sm:text-[14px] outline-none focus:border-pink-400 bg-white";
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full table-fixed text-[14px]">
        <thead>
          <tr className="text-left text-[12.5px] text-gray-500">
            <th className="py-1.5 pr-1.5 sm:pr-2 font-medium w-[78px] sm:w-[96px]">รหัสวิชา</th>
            <th className="py-1.5 pr-2 font-medium">ชื่อวิชา</th>
            <th className="py-1.5 pr-1.5 sm:pr-2 font-medium w-[54px] sm:w-[72px]">หน่วยกิต</th>
            <th className="py-1.5 pr-1.5 sm:pr-2 font-medium w-[64px] sm:w-[84px]">เกรด</th>
            <th className="w-7 sm:w-8" />
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => {
            const missing = !c.code || !(Number(c.credit) > 0);
            return (
              <tr key={i} className={missing ? "bg-rose-50/60" : ""}>
                <td className="py-1 pr-1.5 sm:pr-2">
                  <input value={c.code} onChange={(e) => set(i, { code: e.target.value.trim() })} className={`${cell} font-mono`} placeholder="ท31101" />
                </td>
                <td className="py-1 pr-1.5 sm:pr-2">
                  <input value={c.name} onChange={(e) => set(i, { name: e.target.value })} className={cell} placeholder={groupOf(c.code) || "ชื่อวิชา"} />
                </td>
                <td className="py-1 pr-1.5 sm:pr-2">
                  <input type="number" inputMode="decimal" step="0.5" min="0" value={c.credit ?? ""} onChange={(e) => set(i, { credit: e.target.value === "" ? null : Number(e.target.value) })} className={cell} />
                </td>
                <td className="py-1 pr-1.5 sm:pr-2">
                  <select value={c.grade} onChange={(e) => set(i, { grade: e.target.value })} className={`${cell} ${c.grade ? "" : "text-gray-400"}`}>
                    <option value="">-</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1">
                  <button type="button" onClick={() => onChange(courses.filter((_, j) => j !== i))} aria-label="ลบวิชา" className="h-8 w-8 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 bg-transparent !p-0 flex items-center justify-center">
                    <FaTimes className="text-[12px]" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" onClick={() => onChange([...courses, { code: "", name: "", credit: null, grade: "" }])} className="mt-2 h-9 px-3 rounded-lg border border-dashed border-pink-300 text-pink-600 text-[14px] bg-white hover:bg-pink-50">
        + เพิ่มวิชา
      </button>
    </div>
  );
}

function GradeModal({ initial, saving, onCancel, onSave }) {
  const [terms, setTerms] = useState(() => initial?.terms || {});
  const [active, setActive] = useState(() => GRADE_TERMS.filter((t) => initial?.terms?.[t]).pop() || null);
  const [ocr, setOcr] = useState(null); // { progress } ระหว่างอ่านรูป
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [manualOpen, setManualOpen] = useState(() => !Object.keys(initial?.terms || {}).length);
  const [gpax, setGpax] = useState(initial?.gpax != null ? String(initial.gpax) : "");
  const [term, setTerm] = useState(initial?.as_of_term || "");
  const [subjects, setSubjects] = useState(() =>
    Object.fromEntries(GRADE_SUBJECTS.map((k) => [k, initial?.subject_gpa?.[k] != null ? String(initial.subject_gpa[k]) : ""]))
  );
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const hasTerms = Object.keys(terms).length > 0;
  const autoGpax = termsGpax(terms);
  const autoSubjects = termsSubjects(terms);
  const bad = (v) => v !== "" && !(Number(v) >= 0 && Number(v) <= 4);
  const badCourse = Object.values(terms).some((t) => t.courses.some((c) => !c.code || !(Number(c.credit) > 0)));
  const invalid = hasTerms ? badCourse || autoGpax == null : gpax === "" || bad(gpax) || Object.values(subjects).some(bad);
  const input = "h-11 w-full rounded-xl border px-3.5 text-[15px] outline-none focus:border-pink-400";

  const upload = async (file) => {
    if (!file) return;
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setOcr({ progress: 0 });
    try {
      const res = await readGradeReport(file, (p) => setOcr({ progress: p }));
      if (!res.courses.length) throw new Error("ไม่พบรายวิชาในรูป");
      const key = res.term || GRADE_TERMS.find((t) => !terms[t]) || GRADE_TERMS[0];
      const courses = res.courses.map(({ code, name, credit, grade }) => ({ code, name: name || "", credit, grade: grade || "" }));
      setTerms((p) => ({ ...p, [key]: { courses } }));
      setActive(key);
      setShowPreview(false);
      Swal.fire({
        icon: "success",
        title: `อ่านได้ ${courses.length} วิชา`,
        text: `จัดไว้ที่ ม.${key} — ตรวจรหัสวิชา หน่วยกิต และเกรดให้ตรงกับรูปก่อนบันทึก`,
        timer: 2600,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("อ่านรูปไม่สำเร็จ", `${err?.message || ""} — ลองใช้รูปที่ชัดขึ้น เห็นตารางครบ หรือเพิ่มวิชาเอง`, "warning");
    } finally {
      setOcr(null);
    }
  };

  // เปลี่ยนภาคเรียนของชุดวิชาที่เปิดอยู่ (เช่น ระบบเดาภาคเรียนผิด)
  const moveTerm = (to) => {
    if (!active || to === active) return;
    setTerms((p) => {
      const { [active]: cur, ...rest } = p;
      return { ...rest, [to]: cur };
    });
    setActive(to);
  };
  const removeTerm = (t) => {
    setTerms((p) => {
      const { [t]: _drop, ...rest } = p;
      return rest;
    });
    if (active === t) setActive(null);
  };

  const submit = (e) => {
    e.preventDefault();
    if (invalid) return;
    if (hasTerms) {
      onSave({ gpax: autoGpax, as_of_term: GRADE_TERMS.filter((t) => terms[t]).pop(), subject_gpa: autoSubjects, terms });
    } else {
      onSave({
        gpax: Number(gpax),
        as_of_term: term || null,
        subject_gpa: Object.fromEntries(Object.entries(subjects).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])),
        terms: {},
      });
    }
  };

  const activeCourses = active ? terms[active]?.courses || [] : [];
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={(e) => e.target === e.currentTarget && !ocr && onCancel()}>
      <form onSubmit={submit} className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-[18px] font-semibold text-gray-900">เกรดของฉัน</h3>
          <button type="button" onClick={onCancel} disabled={!!ocr} aria-label="ปิด" className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 bg-transparent !p-0 flex items-center justify-center">
            <FaTimes className="text-[13px]" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* สรุป */}
          {hasTerms && (
            <div className="rounded-2xl bg-pink-50/70 border border-pink-100 p-4">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <div className="text-[12.5px] text-gray-500">GPAX สะสม (คำนวณจากใบเกรด)</div>
                  <div className="text-[28px] leading-tight font-bold text-pink-600">{fmtGpa(autoGpax)}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {GRADE_SUBJECTS.filter((k) => autoSubjects[k] != null).map((k) => (
                    <span key={k} className="px-2 py-0.5 rounded-full bg-white border border-pink-100 text-[12.5px] text-gray-700">
                      {k} <b className="text-gray-900">{fmtGpa(autoSubjects[k])}</b>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {GRADE_TERMS.filter((t) => terms[t]).map((t) => (
                  <span key={t} className={`inline-flex items-center rounded-xl border text-[13.5px] ${active === t ? "border-pink-400 bg-white" : "border-gray-200 bg-white/70"}`}>
                    <button type="button" onClick={() => setActive(active === t ? null : t)} className="bg-transparent !px-3 !py-1.5 text-gray-700">
                      ม.{t} · <b>{fmtGpa(termGpa(terms[t].courses))}</b> <span className="text-gray-400">({terms[t].courses.length} วิชา)</span>
                    </button>
                    <button type="button" onClick={() => removeTerm(t)} aria-label={`ลบภาคเรียน ${t}`} className="h-7 w-7 mr-1 rounded-lg text-gray-400 hover:text-rose-500 bg-transparent !p-0 flex items-center justify-center">
                      <FaTimes className="text-[11px]" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* อัปโหลด */}
          <label className={`block rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition ${ocr ? "border-pink-300 bg-pink-50/50" : "border-gray-200 hover:border-pink-300 hover:bg-pink-50/40"}`}>
            <input type="file" accept="image/*" className="hidden" disabled={!!ocr} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
            {ocr ? (
              <div>
                <div className="text-[14.5px] font-medium text-pink-700">กำลังอ่านใบผลการเรียน… {Math.round(ocr.progress * 100)}%</div>
                <div className="mt-2 h-2 rounded-full bg-pink-100 overflow-hidden">
                  <div className="h-full bg-pink-500 transition-all" style={{ width: `${Math.max(4, ocr.progress * 100)}%` }} />
                </div>
                <div className="mt-1.5 text-[12.5px] text-gray-500">ใช้เวลาประมาณ 1 นาที อย่าปิดหน้าต่างนี้</div>
              </div>
            ) : (
              <div>
                <FaClipboardList className="mx-auto text-pink-400 text-[22px]" />
                <div className="mt-1.5 text-[15px] font-medium text-gray-800">อัปโหลดรูปใบผลการเรียน (ทีละภาคเรียน)</div>
                <div className="text-[12.5px] text-gray-500">แคปหน้าจอตาราง “ผลการเรียน” จากระบบของโรงเรียน ให้เห็นรหัสวิชา หน่วยกิต และเกรดครบ</div>
              </div>
            )}
          </label>

          {/* ตารางรายวิชาของภาคเรียนที่เลือก */}
          {active && terms[active] && (
            <div className="rounded-2xl border border-gray-100 p-3.5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[14.5px] font-semibold text-gray-800">ภาคเรียน</span>
                <select value={active} onChange={(e) => moveTerm(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-[14px] bg-white outline-none focus:border-pink-400">
                  {GRADE_TERMS.filter((t) => t === active || !terms[t]).map((t) => (
                    <option key={t} value={t}>
                      ม.{t}
                    </option>
                  ))}
                </select>
                <span className="ml-auto text-[14px] text-gray-600">
                  GPA ภาคนี้ <b className="text-pink-600">{fmtGpa(termGpa(activeCourses))}</b>
                </span>
                {preview && (
                  <button type="button" onClick={() => setShowPreview((v) => !v)} className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-600 hover:bg-gray-50">
                    {showPreview ? "ซ่อนรูป" : "ดูรูปที่อัปโหลด"}
                  </button>
                )}
              </div>
              {showPreview && preview && <img src={preview} alt="ใบผลการเรียนที่อัปโหลด" className="mb-3 rounded-xl border border-gray-100 max-h-[50vh] w-full object-contain bg-gray-50" />}
              <p className="text-[12.5px] text-gray-500 mb-2">ตรวจให้ตรงกับใบเกรด — เลือกเกรดใหม่ได้จากช่อง “เกรด” · วิชากิจกรรม (ก) และเกรด ร/มส/ผ/มผ ไม่นำมาคิด GPA</p>
              <CourseTable courses={activeCourses} onChange={(courses) => setTerms((p) => ({ ...p, [active]: { courses } }))} />
              {badCourse && <p className="mt-2 text-[13px] text-rose-600">แถวสีแดง: ใส่รหัสวิชาและหน่วยกิตให้ครบ</p>}
            </div>
          )}

          {!hasTerms && (
            <button type="button" onClick={() => {
                setTerms({ [GRADE_TERMS[0]]: { courses: [{ code: "", name: "", credit: null, grade: "" }] } });
                setActive(GRADE_TERMS[0]);
              }} className="text-[13.5px] text-pink-600 underline underline-offset-2 bg-transparent !p-0">
              หรือพิมพ์รายวิชาเอง
            </button>
          )}

          {/* กรอก GPAX เอง (ไม่มีใบเกรด) */}
          {!hasTerms && (
            <div className="rounded-2xl border border-gray-100">
              <button type="button" onClick={() => setManualOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-transparent text-[14.5px] font-medium text-gray-700">
                กรอกเกรดเฉลี่ยเอง
                <FaChevronDown className={`text-[12px] text-gray-400 transition ${manualOpen ? "rotate-180" : ""}`} />
              </button>
              {manualOpen && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[14px] font-medium text-gray-700">GPAX สะสม</span>
                      <input type="number" inputMode="decimal" step="0.01" min="0" max="4" value={gpax} onChange={(e) => setGpax(e.target.value)} placeholder="เช่น 3.45" className={`mt-1 ${input} ${bad(gpax) ? "border-rose-300" : "border-gray-200"}`} />
                    </label>
                    <label className="block">
                      <span className="text-[14px] font-medium text-gray-700">นับถึงภาคเรียน</span>
                      <select value={term} onChange={(e) => setTerm(e.target.value)} className={`mt-1 ${input} border-gray-200 bg-white`}>
                        <option value="">ไม่ระบุ</option>
                        {GRADE_TERMS.map((t) => (
                          <option key={t} value={t}>
                            ม.{t}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-gray-700">
                      เกรดเฉลี่ยรายวิชา <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                    </div>
                    <div className="text-[12.5px] text-gray-500 mb-2">ใช้เทียบกับ “วิชาที่ควรเน้น” ของแต่ละเป้าหมาย</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {GRADE_SUBJECTS.map((k) => (
                        <label key={k} className="block">
                          <span className="text-[13px] text-gray-600">{k}</span>
                          <input type="number" inputMode="decimal" step="0.01" min="0" max="4" value={subjects[k]} onChange={(e) => setSubjects((p) => ({ ...p, [k]: e.target.value }))} placeholder="-" className={`mt-0.5 h-10 w-full rounded-xl border px-3 text-[15px] outline-none focus:border-pink-400 ${bad(subjects[k]) ? "border-rose-300" : "border-gray-200"}`} />
                        </label>
                      ))}
                    </div>
                  </div>
                  {invalid && gpax !== "" && <p className="text-[13px] text-rose-600">เกรดต้องอยู่ระหว่าง 0.00 – 4.00</p>}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onCancel} disabled={!!ocr} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-[15px] hover:bg-gray-50">
            ยกเลิก
          </button>
          <button type="submit" disabled={saving || invalid || !!ocr} className="h-10 px-5 rounded-xl !bg-pink-500 hover:!bg-pink-600 disabled:!bg-pink-200 text-white text-[15px] font-semibold">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function StudentGoalPage() {
  const navigate = useNavigate();
  // อ่านผู้ใช้ตอนเปิดหน้า (ไม่ใช่ตอนโหลดแอป) — ไม่มีค่าสำรองเป็นนักเรียนคนอื่น
  const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? null;
  const [profile, setProfile] = useState({ name: "", number: "-", class: "-", avatar: null });
  const [goals, setGoals] = useState(null); // null = กำลังโหลด
  const [modal, setModal] = useState(null); // { mode: "add" } | { mode: "edit", goal }
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [grades, setGrades] = useState(null); // null = ยังไม่เคยกรอก
  const [gradeModal, setGradeModal] = useState(false);
  const riasec = useMyRiasec();
  const latestRiasec = riasec.latest && !riasec.latest.legacy ? riasec.latest : null;

  const loadGoals = useCallback(async () => {
    const rows = await getGoals().catch(() => []);
    setGoals(goalsOf(rows, CURRENT_STUDENT_ID));
  }, [CURRENT_STUDENT_ID]);

  useEffect(() => {
    (async () => {
      const [students, enrollments, classes, generalInfo] = await Promise.all([
        getStudent().catch(() => []),
        getEnrollments().catch(() => []),
        getClasses().catch(() => []),
        getStudentGeneralInfo(CURRENT_STUDENT_ID).catch(() => null),
      ]);
      const me = students.find((s) => String(s.user_id) === String(CURRENT_STUDENT_ID));
      const enroll = enrollments.find((e) => String(e.user_user_id) === String(CURRENT_STUDENT_ID));
      const grade = enroll ? classes.find((c) => String(c.idgrade) === String(enroll.grade_idgrade)) : null;
      setProfile({
        name: me?.fullname || "",
        number: enroll?.seat_no ?? "-",
        class: grade ? gradeLabel(grade) : "-",
        avatar: generalInfo?.avatar_url ? resolveFileUrl(API_BASE_URL, generalInfo.avatar_url) : null,
      });
    })();
    loadGoals();
    getStudentGrades(CURRENT_STUDENT_ID).then(setGrades).catch(() => setGrades(null));
  }, [CURRENT_STUDENT_ID, loadGoals]);

  const saveGrades = async (payload) => {
    setBusy(true);
    try {
      setGrades(await saveStudentGrades(CURRENT_STUDENT_ID, payload));
      setGradeModal(false);
      Swal.fire({ icon: "success", title: "บันทึกเกรดแล้ว", timer: 1300, showConfirmButton: false });
    } catch (err) {
      Swal.fire("บันทึกไม่สำเร็จ", err?.response?.data?.message || "ลองใหม่อีกครั้ง", "error");
    } finally {
      setBusy(false);
    }
  };

  // ความสอดคล้องของแต่ละเป้าหมาย (ใช้รายการแรกที่หาเจอ: คณะ → ข้อความ → อาชีพ)
  const analyses = useMemo(() => {
    if (!riasec.data || !goals) return {};
    const out = {};
    goals.forEach((g) => {
      const t = goalTargets(riasec.data, { faculty_name: g.faculty_name, goal_text: g.goal_text })[0];
      if (!t) return;
      out[g.goal_id] = latestRiasec ? analyzeTarget(riasec.data, latestRiasec, t) : { faculty: t.match.rows[0], level: null };
    });
    return out;
  }, [riasec.data, goals, latestRiasec]);

  const otherRecommended = useMemo(() => {
    if (!latestRiasec || !riasec.data) return [];
    const goalNames = Object.values(analyses).map((a) => a.faculty?.name);
    return facultiesForCode(riasec.data, latestRiasec.code)
      .flatMap((f) => f.rows)
      .filter((f) => !goalNames.includes(f.name));
  }, [riasec.data, latestRiasec, analyses]);

  const saveGoal = async (form) => {
    const payload = {
      goal_text: form.goal_text.trim(),
      faculty_name: form.faculty_name.trim(),
      university_name: form.university_name.trim(),
    };
    if (!payload.faculty_name) return;
    setBusy(true);
    try {
      if (modal.mode === "edit") await updateGoal(modal.goal.goal_id, payload);
      else await createGoal({ user_user_id: CURRENT_STUDENT_ID, ...payload });
      setModal(null);
      await loadGoals();
      Swal.fire({ icon: "success", title: "บันทึกเป้าหมายแล้ว", timer: 1400, showConfirmButton: false });
    } catch (err) {
      Swal.fire("บันทึกไม่สำเร็จ", err?.response?.data?.message || "ลองใหม่อีกครั้ง", "error");
    } finally {
      setBusy(false);
    }
  };

  const removeGoal = async (g) => {
    const ok = await Swal.fire({
      icon: "warning",
      title: "ลบเป้าหมายนี้?",
      text: g.faculty_name || g.career_field,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#e11d48",
    });
    if (!ok.isConfirmed) return;
    setBusy(true);
    try {
      await deleteGoal(g.goal_id);
      await loadGoals();
    } catch (err) {
      Swal.fire("ลบไม่สำเร็จ", err?.response?.data?.message || "ลองใหม่อีกครั้ง", "error");
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async (g) => {
    setBusy(true);
    try {
      await updateGoal(g.goal_id, { priority: 1 });
      await loadGoals();
    } catch (err) {
      Swal.fire("เปลี่ยนลำดับไม่สำเร็จ", err?.response?.data?.message || "ลองใหม่อีกครั้ง", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadStudentAvatar(CURRENT_STUDENT_ID, file);
      setProfile((p) => ({ ...p, avatar: resolveFileUrl(API_BASE_URL, result.avatar_url) }));
    } catch {
      Swal.fire("อัปโหลดรูปไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const canAdd = goals && goals.length < MAX_GOALS;
  const openAdd = () => setModal({ mode: "add" });

  return (
    <div className="min-h-screen w-full bg-white flex text-[15.5px] text-gray-800">
      <SidebarNav />
      <div className="flex-1 min-w-0">
        <Header />
        <main className="w-full px-4 sm:px-6 md:px-8 pt-24 pb-10 space-y-6">
          {/* หัวข้อ */}
          <h1 className="page-title">เป้าหมายของฉัน</h1>

          {/* โปรไฟล์ */}
          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-rose-50 p-5 sm:p-6">
            <div className="flex items-center gap-4 sm:gap-5 flex-wrap">
              <label className="relative cursor-pointer shrink-0 group" title="เปลี่ยนรูปโปรไฟล์">
                <Avatar src={profile.avatar} name={profile.name} size={84} rounded="rounded-2xl" />
                <span className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-full bg-white border border-pink-100 shadow flex items-center justify-center text-pink-500 group-hover:bg-pink-50">
                  <FaCamera className="text-[12px]" />
                </span>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingAvatar} className="hidden" />
              </label>
              <div className="min-w-0 flex-1">
                <h2 className="text-[21px] font-semibold text-gray-900 truncate">{profile.name || "…"}</h2>
                <p className="text-[14.5px] text-gray-500 mt-0.5">
                  ห้อง {profile.class} • เลขที่ {profile.number}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-pink-100 px-3 py-1 text-[13.5px]">
                    <FaGraduationCap className="text-pink-500 text-[12px]" /> ตั้งเป้าหมายแล้ว {goals ? goals.length : "-"}/{MAX_GOALS}
                  </span>
                  {latestRiasec && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-pink-100 px-3 py-1 text-[13.5px]">
                      <FaCompass className="text-pink-500 text-[12px]" /> RIASEC <b className="text-pink-600">{latestRiasec.code}</b>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setGradeModal(true)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13.5px] border ${
                      grades?.gpax != null ? "bg-white border-pink-100 hover:border-pink-300" : "!bg-pink-500 border-pink-500 text-white hover:!bg-pink-600"
                    }`}
                  >
                    <FaClipboardList className={`text-[12px] ${grades?.gpax != null ? "text-pink-500" : ""}`} />
                    {grades?.gpax != null ? (
                      <>
                        GPAX <b className="text-pink-600">{Number(grades.gpax).toFixed(2)}</b>
                        {grades.as_of_term && <span className="text-gray-500">(ถึง ม.{grades.as_of_term})</span>}
                        <FaPen className="text-[10px] text-gray-400" />
                      </>
                    ) : (
                      "+ กรอกเกรดเฉลี่ย"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-8 items-start">
            {/* ซ้าย: เป้าหมาย */}
            <div className="space-y-4">
              {goals === null ? (
                <div className={`${CARD} p-8 text-center text-gray-400`}>กำลังโหลด...</div>
              ) : goals.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/40 p-8 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-white text-pink-500 flex items-center justify-center shadow-sm">
                    <FaGraduationCap className="text-[24px]" />
                  </div>
                  <h3 className="mt-3 text-[18px] font-semibold text-gray-900">ยังไม่ได้ตั้งเป้าหมาย</h3>
                  <p className="mt-1 text-[14.5px] text-gray-600">เลือกคณะและมหาวิทยาลัยที่อยากเข้า ระบบจะเทียบกับผลแบบทดสอบและแนะนำวิธีเตรียมตัวให้</p>
                  <button type="button" onClick={openAdd} className="mt-4 h-10 px-5 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[15px] font-semibold inline-flex items-center gap-2">
                    <FaPlus className="text-[12px]" /> ตั้งเป้าหมายแรก
                  </button>
                </div>
              ) : (
                <>
                  {goals.map((g, i) => (
                    <GoalCard
                      key={g.goal_id}
                      goal={g}
                      rank={i}
                      total={goals.length}
                      analysis={analyses[g.goal_id]}
                      grades={grades}
                      busy={busy}
                      onEdit={() => setModal({ mode: "edit", goal: g })}
                      onDelete={() => removeGoal(g)}
                      onMakePrimary={() => makePrimary(g)}
                    />
                  ))}
                  {canAdd && (
                    <button
                      type="button"
                      onClick={openAdd}
                      className="w-full rounded-2xl border-2 border-dashed border-gray-200 hover:border-pink-300 hover:bg-pink-50/40 bg-white py-5 text-[15px] font-medium text-gray-500 hover:text-pink-600 flex items-center justify-center gap-2 transition"
                    >
                      <FaPlus className="text-[12px]" /> เพิ่ม{GOAL_RANK_LABEL[goals.length]}
                    </button>
                  )}
                  {latestRiasec && (
                    <button
                      type="button"
                      onClick={() => navigate("/result")}
                      className="w-full rounded-2xl border border-pink-200 !bg-pink-50 hover:!bg-pink-100 text-pink-800 px-5 py-3.5 text-left flex items-center justify-between gap-3"
                    >
                      <span>
                        <span className="block text-[15px] font-semibold">ดูการวิเคราะห์เป้าหมายแบบเต็ม</span>
                        <span className="block text-[13px] text-pink-600/80">เหตุผลของความสอดคล้อง แนวทางเตรียมตัว และอาชีพที่เกี่ยวข้อง</span>
                      </span>
                      <FaArrowRight className="shrink-0" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ขวา: ผล RIASEC + สาขาอื่น + ปรึกษาครู */}
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className={`${CARD} p-5`}>
                <SectionTitle
                  icon={FaCompass}
                  title="ผลแบบทดสอบความถนัด"
                  action={
                    latestRiasec && (
                      <button type="button" onClick={() => navigate("/result")} className="text-[13.5px] font-medium text-pink-600 hover:text-pink-700 bg-transparent !p-0 shrink-0">
                        ดูผลเต็ม →
                      </button>
                    )
                  }
                />
                {riasec.loading ? (
                  <p className="text-[14.5px] text-gray-400">กำลังโหลด...</p>
                ) : !latestRiasec ? (
                  <div>
                    <p className="text-[14.5px] text-gray-500">ทำแบบทดสอบความถนัด เพื่อดูว่าเป้าหมายสอดคล้องกับความสนใจของคุณแค่ไหน</p>
                    <button type="button" onClick={() => navigate("/aptitudeIntro")} className="mt-3 h-9 px-4 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[14px] font-medium">
                      ทำแบบทดสอบ
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-3">
                      <span className="text-[34px] leading-none font-bold tracking-wider text-pink-600">{latestRiasec.code}</span>
                      <span className="text-[13px] text-gray-500 pb-1">
                        {new Date(latestRiasec.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {latestRiasec.code.split("").map((c) => (
                        <span key={c} className="rounded-full bg-pink-50 text-pink-700 px-2.5 py-0.5 text-[12.5px]">
                          {c} {riasec.data.dimensions[c].nameTh} {latestRiasec.scores[c]}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {riasec.history.length > 1 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-[12.5px] text-gray-400 mb-1">ประวัติการทำแบบทดสอบ</p>
                    <div className="divide-y divide-gray-100">
                      {riasec.history.slice(0, 5).map((h, i) => (
                        <div key={i} className="flex items-center justify-between py-2 text-[14px]">
                          <span className="text-gray-600">{new Date(h.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span className="flex items-center gap-3">
                            <span className="font-medium text-gray-700">{h.legacy ? `${h.code} (ระบบเดิม)` : h.code}</span>
                            {!h.legacy && (
                              <button type="button" onClick={() => navigate("/result", { state: { scores: h.scores, date: h.date } })} className="text-[13px] text-pink-500 hover:text-pink-700 bg-transparent !p-0">
                                ดูผล
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {otherRecommended.length > 0 && (
                <div className={`${CARD} p-5`}>
                  <SectionTitle icon={FaGraduationCap} title="สาขาอื่นที่ตรงกับผลทดสอบ" subtitle={`จากรหัส ${latestRiasec.code} — ลองพิจารณาเป็นเป้าหมายสำรอง`} />
                  <div className="space-y-2">
                    {otherRecommended.map((f) => (
                      <div key={f.name} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[14.5px] font-medium text-gray-800">{f.name}</div>
                          <div className="text-[12.5px] text-gray-500 truncate">{f.universities.join(", ") || f.track}</div>
                        </div>
                        {canAdd && (
                          <button
                            type="button"
                            onClick={() => setModal({ mode: "add", preset: { ...EMPTY_FORM, faculty_name: f.name } })}
                            className="shrink-0 h-8 px-3 rounded-lg bg-white border border-pink-200 text-pink-600 text-[13px] hover:bg-pink-50"
                          >
                            + ตั้งเป็นเป้าหมาย
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`${CARD} p-5`}>
                <SectionTitle icon={FaComments} title="อยากปรึกษาครูแนะแนว?" subtitle="ส่งคำขอปรึกษาเรื่องเป้าหมายและการเตรียมตัว" />
                <button type="button" onClick={() => navigate("/studentconsultations")} className="w-full h-10 rounded-xl border border-pink-200 text-pink-600 text-[14.5px] font-medium hover:bg-pink-50 bg-white">
                  ไปหน้าคำขอปรึกษา
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {gradeModal && <GradeModal initial={grades} saving={busy} onCancel={() => setGradeModal(false)} onSave={saveGrades} />}
      {modal && (
        <GoalModal
          title={modal.mode === "edit" ? "แก้ไขเป้าหมาย" : `เพิ่ม${GOAL_RANK_LABEL[goals?.length || 0]}`}
          initial={
            modal.mode === "edit"
              ? {
                  faculty_name: modal.goal.faculty_name || "",
                  university_name: modal.goal.university_name || "",
                  goal_text: modal.goal.goal_text || "",
                }
              : modal.preset || EMPTY_FORM
          }
          data={riasec.data}
          otherGoals={(goals || []).filter((g) => modal.mode !== "edit" || g.goal_id !== modal.goal.goal_id)}
          saving={busy}
          onCancel={() => setModal(null)}
          onSave={saveGoal}
        />
      )}
    </div>
  );
}

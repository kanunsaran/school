import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaArrowRight, FaCheck, FaMinus, FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaInfoCircle, FaRegCalendarAlt,
  FaPrint, FaRedoAlt, FaHome, FaCompass, FaChalkboardTeacher, FaRegCommentDots, FaBookOpen, FaClipboardList, FaUniversity, FaBriefcase,
} from "react-icons/fa";
import SidebarNav from "../../../layout/StudentSidebar.jsx";
import Header from "../../../layout/Header";
import { getGoals, getStudentGrades, getAssessmentAdvice, getConsultationRequests, createConsultationRequest } from "../../../callapi/callapi_user.jsx";
import { STATUS_META as CONSULT_STATUS } from "../../../utils/consultationStore.js";
import dataSources from "../../../data/data-sources.json";
import onet from "../../../data/onet-faculties.json";
import { careerEmoji } from "../../../utils/careerEmoji.js";
import { DIM_ACTIVITY, KNOWLEDGE_TH, LEVEL_WHY, SKILL_DESC } from "../../../data/guidanceTexts.js";
import { getCurrentUser } from "../../../utils/auth.js";
import useMyRiasec from "../../../hooks/useMyRiasec.js";
import { interestSummaryText } from "../../../utils/riasecSummary.js";
import { goalsOf, GOAL_RANK_LABEL, MYTCAS_HOME, fullUniName } from "../../../utils/goals.js";
import AdmissionInfo from "../../../components/AdmissionInfo.jsx";
import {
  RIASEC_ORDER, MAX_SCORE, MIN_SCORE, scorePercent, goalTargets, analyzeTarget, personalAdvice, hasGoal,
  denseRank, tiedWith, rankLabel, matchGoalFaculties, exploreFaculties, exploreActivities, adviceSteps, careersForGoal,
} from "../../../utils/riasecScoring.js";

// หน้าผลแบบสำรวจความสนใจ RIASEC
// ที่มาของข้อมูล: คะแนน/รหัส = คำนวณจากคำตอบ (utils/riasecScoring.js) • ความหมาย คณะ อาชีพ มหาวิทยาลัย = data/riasec.json
// (แปลงจากไฟล์ RIASEC-ข้อมูลคำแนะนำ ของโรงเรียน + myTCAS) • ประโยคเชื่อมความ = แม่แบบในไฟล์นี้

const colorMap = {
  R: ["from-red-300", "to-red-500"],
  I: ["from-blue-300", "to-blue-500"],
  A: ["from-yellow-300", "to-yellow-400"],
  S: ["from-green-300", "to-green-400"],
  E: ["from-purple-300", "to-purple-500"],
  C: ["from-gray-300", "to-gray-400"],
};
// สีอ่อนประจำด้าน (โทนเดียวกับแถบคะแนน) ใช้กับการ์ดกิจกรรมและสาขา
const DIM_THEME = {
  R: { card: "bg-rose-50/70 border-rose-100", text: "text-rose-600", icon: "bg-rose-100/80", pill: "border-rose-200 text-rose-600 hover:bg-rose-50" },
  I: { card: "bg-sky-50/70 border-sky-100", text: "text-sky-700", icon: "bg-sky-100/80", pill: "border-sky-200 text-sky-700 hover:bg-sky-50" },
  A: { card: "bg-amber-50/70 border-amber-100", text: "text-amber-700", icon: "bg-amber-100/80", pill: "border-amber-200 text-amber-700 hover:bg-amber-50" },
  S: { card: "bg-emerald-50/70 border-emerald-100", text: "text-emerald-700", icon: "bg-emerald-100/80", pill: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  E: { card: "bg-violet-50/70 border-violet-100", text: "text-violet-700", icon: "bg-violet-100/80", pill: "border-violet-200 text-violet-700 hover:bg-violet-50" },
  C: { card: "bg-slate-50 border-slate-200/70", text: "text-slate-600", icon: "bg-slate-200/70", pill: "border-slate-300 text-slate-600 hover:bg-slate-50" },
};
// สีการ์ดเป้าหมายตามระดับความสอดคล้อง (ใช้สีเดียวต่อการ์ด)
const LEVEL_TONE = {
  high: { ring: "border-emerald-200", head: "bg-emerald-50/80 border-emerald-100", label: "text-emerald-700", pill: "bg-emerald-500", title: "text-emerald-700", bar: "bg-emerald-400", marker: "marker:text-emerald-400" },
  medium: { ring: "border-amber-200", head: "bg-amber-50/80 border-amber-100", label: "text-amber-700", pill: "bg-amber-500", title: "text-amber-700", bar: "bg-amber-400", marker: "marker:text-amber-400" },
  low: { ring: "border-slate-200", head: "bg-slate-50 border-slate-200", label: "text-slate-600", pill: "bg-slate-500", title: "text-slate-700", bar: "bg-slate-400", marker: "marker:text-slate-400" },
};
// คำนามของแต่ละด้าน ใช้แต่งประโยคอธิบาย (ข้อความแม่แบบของระบบ)
const TRAIT_NOUN = { R: "การลงมือปฏิบัติ", I: "การคิดวิเคราะห์", A: "การสร้างสรรค์", S: "การช่วยเหลือผู้อื่น", E: "ภาวะผู้นำ", C: "ความเป็นระบบ" };
const DIM_EN = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };
const joinTh = (arr) => (arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(" ")} และ${arr[arr.length - 1]}`);

// แนวทางทั่วไป ม.4–ม.6 (ไม่ใช่ข้อกำหนดตายตัว และระบบไม่ได้ติดตามว่าทำแล้วหรือยัง)
const roadmapFor = (goalName) => [
  { grade: "ม.4", items: ["สำรวจความสนใจของตัวเองจากผลแบบประเมินและการลองทำกิจกรรม", "ลองกิจกรรม/ชุมนุมหลายแบบ แล้วจดว่าชอบหรือไม่ชอบอะไร"] },
  {
    grade: "ม.5",
    items: [goalName ? `ศึกษาหลักสูตร${goalName}และวิชาที่เกี่ยวข้อง` : "ศึกษาสาขาที่สนใจและวิชาที่เกี่ยวข้อง", "เริ่มเก็บผลงานหรือประสบการณ์ที่เกี่ยวข้อง หากหลักสูตรที่สนใจใช้ Portfolio"],
  },
  { grade: "ม.6", items: ["ตรวจสอบเกณฑ์รับเข้าและวิชาสอบของหลักสูตรที่สนใจในประกาศล่าสุด", "เตรียมสมัครตามรอบ TCAS ที่สนใจ และปรึกษาครูแนะแนวเรื่องแผนสำรอง"] },
];

// ข้อค้นพบความเชื่อมโยงระหว่างความสนใจกับสาขาเป้าหมาย (findingKind ใน riasecScoring.js) — เงื่อนไขตรวจสอบได้จากข้อมูล ไม่ใช่การให้คะแนน
const LEVEL_TH = { high: "สูง", medium: "ปานกลาง", low: "ต่ำ" };
const CONSISTENCY_META = {
  high: { label: "สูง", text: "ความสนใจ 2 อันดับแรกอยู่ติดกันบนหกเหลี่ยม RIASEC จึงไปในทิศทางเดียวกันชัดเจน" },
  medium: { label: "ปานกลาง", text: "ความสนใจ 2 อันดับแรกอยู่ห่างกัน 1 ช่องบนหกเหลี่ยม RIASEC มีความเกี่ยวข้องกันพอสมควร" },
  low: { label: "ต่ำ", text: "ความสนใจ 2 อันดับแรกอยู่ตรงข้ามกันบนหกเหลี่ยม RIASEC แปลว่าคุณสนใจหลายทางที่ต่างกันมาก ลองสำรวจตัวเองเพิ่มเติม" },
};

const RADAR_SIZE = 280;

function RadarChart({ scores }) {
  const cx = RADAR_SIZE / 2;
  const cy = RADAR_SIZE / 2;
  const r = 92;
  const angleFor = (i) => (Math.PI * 2 * i) / RIASEC_ORDER.length - Math.PI / 2;
  const point = (i, frac) => {
    const a = angleFor(i);
    return [cx + r * frac * Math.cos(a), cy + r * frac * Math.sin(a)];
  };
  const rings = [0.2, 0.4, 0.6, 0.8, 1]; // 10, 20, 30, 40, 50 คะแนน
  const dataPoints = RIASEC_ORDER.map((c, i) => point(i, scores[c] / MAX_SCORE));

  return (
    <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="w-full max-w-[280px] mx-auto" role="img" aria-label="กราฟเรดาร์คะแนน RIASEC">
      {rings.map((frac) => (
        <polygon key={frac} points={RIASEC_ORDER.map((_, i) => point(i, frac).join(",")).join(" ")} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      ))}
      {RIASEC_ORDER.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
      })}
      <polygon points={dataPoints.map((p) => p.join(",")).join(" ")} fill="#ec4899" fillOpacity="0.25" stroke="#ec4899" strokeWidth="2" />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#ec4899" />
      ))}
      {RIASEC_ORDER.map((c, i) => {
        const [x, y] = point(i, 1.22);
        return (
          <text key={c} x={x} y={y} fontSize="12" fontWeight="700" fill="#374151" textAnchor="middle" dominantBaseline="middle">
            {c} {scores[c]}
          </text>
        );
      })}
    </svg>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-9 w-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0"><Icon className="text-[16px]" /></div>
      <div>
        <h2 className="text-[18px] font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-[13.5px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const CARD = "bg-white/60 border border-white/60 backdrop-blur-xl p-5 rounded-2xl shadow-sm";
const thaiDate = (d) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "");


function Shell({ children }) {
  return (
    <div className="min-h-screen flex bg-white relative overflow-x-hidden">
      <Header />
      <SidebarNav />
      <div className="flex-1 min-w-0 overflow-x-hidden">
        <main className="w-full max-w-[1320px] mx-auto overflow-x-hidden px-4 sm:px-6 md:px-8 pt-24 pb-10 flex flex-col gap-6 relative z-10">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-pink-300/40 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute top-1/3 -right-24 w-96 h-96 bg-rose-300/30 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-fuchsia-200/30 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute top-20 left-1/4 w-24 h-24 bg-yellow-300/50 rounded-full blur-2xl animate-float-slow" />
            <div className="absolute bottom-20 right-16 w-28 h-28 bg-sky-200/50 rounded-full blur-3xl animate-float-slow" />
          </div>
          <div className="relative z-10 flex flex-col gap-6">{children}</div>
        </main>
      </div>
      <style>{`
        @keyframes float-slow { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(2px, -4px) scale(1.05); } }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// เป้าหมายที่นักเรียนตั้งไว้ (จากตาราง goal ของนักเรียนคนปัจจุบัน)
function GoalHeader({ goal, onEdit, textMismatch }) {
  return (
    <div className="rounded-xl bg-white/80 border border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13.5px] font-medium text-gray-500">
          เป้าหมายที่คุณตั้งไว้{goal.updated_at || goal.created_at ? ` • ${thaiDate(goal.updated_at || goal.created_at)}` : ""}
        </div>
        <button type="button" onClick={onEdit} className="text-[13.5px] font-medium text-pink-600 hover:text-pink-700 bg-transparent !p-0">
          แก้ไขเป้าหมาย<FaArrowRight className="inline ml-1 text-[11px]" />
        </button>
      </div>
      <div className="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[15px]">
        <div>
          <span className="text-[13.5px] text-gray-500">คณะที่สนใจ: </span>
          <b>{goal.faculty_name || "-"}</b>
        </div>
        <div>
          <span className="text-[13.5px] text-gray-500">มหาวิทยาลัย: </span>
          <b>{goal.university_name || "-"}</b>
        </div>
      </div>
      {goal.goal_text && <p className="text-[14.5px] text-gray-500 mt-1.5">“{goal.goal_text}”</p>}
      {textMismatch && (
        <p className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[13.5px] text-amber-900">
          ข้อความเป้าหมายพูดถึง “{textMismatch}” ซึ่งไม่ตรงกับคณะที่เลือก ({goal.faculty_name}) — ระบบเทียบผลกับคณะที่เลือกเท่านั้น
          ถ้าเป้าหมายเปลี่ยนไปแล้ว กด “แก้ไขเป้าหมาย” เพื่อแก้ข้อความหรือคณะให้ตรงกัน
        </p>
      )}
    </div>
  );
}

function Block({ title, tone, children }) {
  return (
    <div className="mt-4">
      <div className={`flex items-center gap-2 text-[16px] font-semibold ${tone.title}`}>
        <span className={`h-4 w-1 rounded-full ${tone.bar}`} />
        {title}
      </div>
      <div className="text-[15px] text-gray-700 leading-7 mt-1 space-y-2">{children}</div>
    </div>
  );
}

// การ์ดเป้าหมาย 1 สาขา — ตอบว่า "ความสนใจจากผล RIASEC เชื่อมกับสาขาเป้าหมายอย่างไร"
// แยกจากความพร้อมด้านวิชาการ/การสมัคร (อยู่ใน "แนวทางเตรียมตัวไปสู่เป้าหมาย")
// สิ่งที่พบ = 3 เงื่อนไขที่ตรวจสอบได้จากข้อมูล • วลีเกี่ยวกับสาขามาจากไฟล์ข้อมูลคณะ–อาชีพ • ไม่รายงานคะแนนซ้ำ
const NOUN = (c) => `ด้าน${TRAIT_NOUN[c]}`;
// ชื่อที่ลงท้ายด้วยวงเล็บ ต้องเว้นวรรคก่อนข้อความต่อ
const nm = (name) => (/\)$/.test(name) ? `${name} ` : name);

function Finding({ ok, children }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className={`mt-0.5 shrink-0 font-bold ${ok ? "text-emerald-600" : "text-gray-400"}`}>{ok ? <FaCheck className="inline text-[11px]" /> : <FaMinus className="inline text-[11px]" />}</span>
      <span className="sr-only">{ok ? "พบ:" : "ไม่พบ:"}</span>
      <span>{children}</span>
    </li>
  );
}

function AlignmentCard({ a, latest, scores, alternatives, university }) {
  const f = a.faculty;
  const dim = f.dim;
  const codes = [latest.code, ...latest.alternativeCodes];
  const dimMine = denseRank(scores, dim) <= 3;
  // ความเชื่อมโยงหลัก: ด้านหลักของสาขาก่อน (ถ้าเชื่อมได้) — ไม่ไล่จับคู่ทุกคุณลักษณะกับทุกด้าน
  const link = a.links.find((x) => x.code === dim) || a.links[0];
  const steps = adviceSteps(f.advice).slice(0, 2);
  // เหตุผลของระดับ จากผลจริงของนักเรียน: รหัสที่แนะนำสาขา และอันดับของด้านที่สาขาใช้เป็นหลัก
  const fill = (t) =>
    t
      .replace("{ด้านของรหัส}", joinTh([...(a.viaCode || latest.code)].map((c) => TRAIT_NOUN[c])))
      .replace("{ด้าน}", TRAIT_NOUN[dim])
      .replace("{อันดับ}", rankLabel(scores, dim))
      .replace("{รหัส}", latest.code)
      // วลีที่ซ้ำกับชื่อด้าน (เช่น "ความเป็นระบบ") ไม่ต้องยกตัวอย่าง
      .replace("{วลี}", (() => {
        const ex = link ? link.phrases.filter((x) => !TRAIT_NOUN[link.code].includes(x) && !x.includes(TRAIT_NOUN[link.code])).slice(0, 2) : [];
        return ex.length ? ` เช่น ${joinTh(ex)} ` : "";
      })())
      .replace("{ด้านที่เชื่อม}", link ? TRAIT_NOUN[link.code] : "");
  const levelWhy =
    a.kind === "recommended"
      ? fill(LEVEL_WHY.recommended) + (dimMine ? fill(LEVEL_WHY.recommendedDim) : "")
      : fill(LEVEL_WHY[a.kind === "partial" && !link ? "none" : a.kind]);
  const tone = LEVEL_TONE[a.displayLevel];

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${tone.ring}`}>
      <div className={`border-b px-4 py-4 sm:px-5 ${tone.head}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={`text-[13px] ${tone.label}`}>เป้าหมายของคุณ{a.source === "text" ? " (จากข้อความเป้าหมาย)" : ""}</div>
            <div className="text-[19px] font-bold text-gray-900">{f.name}</div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[14px] font-semibold text-white ${tone.pill}`}>สอดคล้อง{LEVEL_TH[a.displayLevel]}</span>
        </div>
        <p className="mt-1.5 text-[14px] text-gray-600 leading-6">{levelWhy}</p>
      </div>
      <div className="px-4 pb-4 sm:px-5">

      <Block title="ทำไมสาขานี้จึงน่าสำรวจ" tone={tone}>
        <p>
          {link
            ? `สาขานี้เน้น${joinTh(link.phrases.slice(0, 2))} ซึ่งเชื่อมโยงกับความสนใจด้าน${TRAIT_NOUN[link.code]}ของคุณ`
            : `สาขานี้เน้น${f.traits} ซึ่งยังไม่ตรงกับความสนใจเด่นจากแบบประเมินครั้งนี้`}
          {" "}ลองทำกิจกรรมจริงตามข้อด้านล่าง แล้วสังเกตว่าคุณสนุกกับงานลักษณะนี้มากน้อยเพียงใด
        </p>
        {a.displayLevel === "low" && (
          <p>
            ความสนใจที่โดดเด่นของคุณอาจแตกต่างจากลักษณะการเรียนหรือการทำงานบางส่วนของสาขานี้ แต่ไม่ได้หมายความว่าคุณเรียนสาขานี้ไม่ได้ หากสาขานี้ยังเป็นเป้าหมาย
            ลองศึกษารายวิชาและลักษณะการเรียนจริง และทดลองกิจกรรมด้าน{TRAIT_NOUN[dim]} เพื่อสำรวจว่าคุณชอบและอยากพัฒนาทักษะด้านใดเพิ่ม
          </p>
        )}
      </Block>

      <Block title="สิ่งที่ลองทำได้" tone={tone}>
        <ul className={`list-disc pl-5 space-y-0.5 ${tone.marker}`}>
          {steps.map((x) => (
            <li key={x}>{x}</li>
          ))}
          <li>ตรวจสอบเกณฑ์รับเข้าของ{university ? ` ${university}` : "หลักสูตรเป้าหมาย"} จากประกาศ myTCAS ในส่วน “แนวทางเตรียมตัวไปสู่เป้าหมาย” ด้านล่าง</li>
        </ul>
      </Block>

      {alternatives.length > 0 && (
        <details className="mt-4">
          <summary className={`cursor-pointer select-none text-[15px] font-semibold ${tone.title}`}>สาขาทางเลือกที่ใกล้เคียง ({Math.min(2, alternatives.length)})</summary>
          <div className="mt-2 space-y-2">
            {alternatives.slice(0, 2).map((x) => (
              <div key={x.row.name} className="rounded-xl bg-pink-50/50 border border-pink-100 px-3.5 py-2.5">
                <div className="text-[15.5px] font-semibold text-gray-800">{x.row.name}</div>
                <p className="text-[14.5px] text-gray-700 leading-7">
                  เหมาะสำหรับการสำรวจเพิ่มเติม หากสนใจงานด้าน{joinTh(x.shared)}
                  {x.differs.length > 0 ? ` โดยมีส่วนที่แตกต่างจาก${nm(f.name)}คือการเรียนด้าน${joinTh(x.differs)}` : ""}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="mt-3 text-[12.5px] text-gray-500">
        <summary className="cursor-pointer select-none">ระบบพิจารณาจากอะไร</summary>
        <ul className="mt-1.5 space-y-1">
          <Finding ok={a.reason === "recommended"}>
            {a.reason === "recommended" ? `เป็นสาขาที่แนะนำสำหรับรหัส ${a.viaCode}` : `ไม่อยู่ในสาขาที่แนะนำสำหรับรหัส ${codes.join(" / ")}`}
          </Finding>
          <Finding ok={dimMine}>
            ด้านหลักของสาขา ({dim}) {dimMine ? `อยู่ในความสนใจเด่นของคุณ (${rankLabel(scores, dim)})` : "ไม่อยู่ในความสนใจเด่น (อันดับ 1–3)"}
          </Finding>
          <Finding ok={a.links.length > 0}>
            {a.links.length ? `คุณลักษณะของสาขาที่เชื่อมได้: ${a.links.map((l) => `${l.phrases.slice(0, 2).join(", ")} (${l.code})`).join(" · ")}` : "ไม่พบคุณลักษณะของสาขาที่เชื่อมกับความสนใจเด่น"}
          </Finding>
        </ul>
        <p className="mt-1.5">
          ระดับ (เกณฑ์เบื้องต้นของระบบ ไม่ใช่เกณฑ์มาตรฐานทางจิตวิทยา): สูง = ข้อแรกเป็นจริง • ปานกลาง = ข้อแรกไม่จริงแต่ข้อสองจริง • ต่ำ = ข้อสองไม่จริง • ความสนใจเด่น = อันดับ 1–3 (คะแนนเท่ากันนับเป็นอันดับร่วม) •
          ไม่ให้คะแนนหรือเปอร์เซ็นต์ความเหมาะสม และไม่ได้ทำนายความสำเร็จในการเรียน • ความพร้อมด้านวิชาการและเกณฑ์รับเข้าดูใน “แนวทางเตรียมตัวไปสู่เป้าหมาย”
        </p>
      </details>
      </div>
    </div>
  );
}

// สิ่งที่ควรศึกษาเพิ่มเติมก่อนตัดสินใจ — เฉพาะของแต่ละสาขา จาก 2 แหล่ง:
// (1) ทักษะที่ควรพัฒนาของสาขา (ข้อมูลแนะแนวของโรงเรียน) (2) ความรู้หลักของอาชีพตัวแทนสาขาจาก O*NET OnLine พร้อมลิงก์และรหัสความสนใจของ O*NET
function StudyBeforeDeciding({ faculty, skip = [] }) {
  const skills = faculty.skills.split(/,\s*/).filter((x) => !skip.includes(x));
  const o = onet.faculties[faculty.name];
  return (
    <ul className="mt-0.5 space-y-0.5 text-[14.5px] text-gray-700">
      {skills.length > 0 && (
        <li>
          <span className="text-gray-500">ทักษะ: </span>
          {skills.join(", ")}
        </li>
      )}
      {o?.knowledge?.length > 0 && (
        <li>
          <span className="text-gray-500">ความรู้ที่ใช้: </span>
          {o.knowledge.slice(0, 3).map((k) => KNOWLEDGE_TH[k] || k).join(", ")}
        </li>
      )}
    </ul>
  );
}

// หลักสูตรตัวอย่าง 1 รายการ + ลิงก์ค้นหาเพิ่มเติมบน myTCAS (แสดงทุกครั้ง)
// เลือก: (1) มหาวิทยาลัยในเป้าหมายของนักเรียน ถ้ามีหลักสูตรของสาขานี้ในข้อมูล (2) ไม่มี → หลักสูตรแรกในข้อมูลแนะแนว
// (ระบบยังไม่มีข้อมูลความโดดเด่นของมหาวิทยาลัย จึงไม่จัดอันดับและไม่อ้างว่าดีที่สุด) • หลักสูตรทุกรายการตรวจชื่อกับ myTCAS แล้ว
function ProgramPick({ faculty, goalUni, compact = false }) {
  const items = (faculty.programs || [])
    .map((pg, k) => {
      const [uni, ...rest] = pg.split(":");
      return { uni: fullUniName(uni.trim()), name: rest.join(":").trim(), link: faculty.links?.[k] };
    })
    .filter((x) => x.link);
  const fromGoal = goalUni ? items.find((x) => x.uni === fullUniName(goalUni)) : null;
  const pick = fromGoal || items[0] || null;
  if (compact) {
    return (
      <div className="text-[13.5px]">
        {pick ? (
          <>
            <a href={pick.link} target="_blank" rel="noreferrer" className="text-sky-600 underline underline-offset-2 hover:text-sky-700">
              ดูหลักสูตร{faculty.name}ของ{pick.uni}บน myTCAS<FaExternalLinkAlt className="inline ml-1 text-[10px] align-baseline" />
            </a>
            <div className="text-[11.5px] text-gray-400">{fromGoal ? "มหาวิทยาลัยเดียวกับในเป้าหมายของคุณ" : "ตัวอย่างจากข้อมูลแนะแนว ไม่ได้หมายความว่าดีที่สุด"}</div>
          </>
        ) : (
          <div className="text-gray-500">ยังไม่มีหลักสูตรตัวอย่างที่ตรวจสอบแล้ว</div>
        )}
      </div>
    );
  }
  return (
    <div className="mt-1.5 space-y-1.5">
      {pick ? (
        <div className="rounded-lg bg-sky-50/60 border border-sky-100 px-3 py-2">
          <div className="text-[12px] text-gray-500">หลักสูตรตัวอย่าง</div>
          <div className="font-medium text-gray-800">{pick.uni}</div>
          <div className="text-[13px] text-gray-600">{pick.name}</div>
          <a href={pick.link} target="_blank" rel="noreferrer" className="text-[13px] text-sky-600 underline underline-offset-2 hover:text-sky-700">
            ดูรายละเอียดหลักสูตรบน myTCAS<FaExternalLinkAlt className="inline ml-1 text-[10px] align-baseline" />
          </a>
          <div className="text-[11.5px] text-gray-400 mt-0.5">
            {fromGoal ? "มหาวิทยาลัยเดียวกับในเป้าหมายของคุณ" : "ตัวอย่างจากข้อมูลแนะแนว — ไม่ได้หมายความว่าเป็นมหาวิทยาลัยที่ดีที่สุด"}
          </div>
        </div>
      ) : (
        <div className="text-[13px] text-gray-500">ยังไม่มีหลักสูตรตัวอย่างที่ตรวจสอบแล้วในข้อมูล</div>
      )}
      <div className="text-[13px] text-gray-600">
        อยากเปรียบเทียบมหาวิทยาลัยอื่น?{" "}
        <a href={MYTCAS_HOME} target="_blank" rel="noreferrer" className="text-sky-600 underline underline-offset-2 hover:text-sky-700">
          ค้นหาหลักสูตรเพิ่มเติมบน myTCAS<FaExternalLinkAlt className="inline ml-1 text-[10px] align-baseline" />
        </a>
      </div>
    </div>
  );
}

// อาชีพตัวอย่าง (≤ 3) พร้อมเหตุผลสั้น ๆ — เหตุผลมาจากข้อมูลสาขาของอาชีพนั้น
function CareerList({ items }) {
  if (!items.length) return <p className="text-[14px] text-gray-500">ยังไม่มีข้อมูลอาชีพที่เกี่ยวข้อง</p>;
  return (
    <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {items.map((c, i) => {
        const e = careerEmoji(c.title, c.faculty?.dim, i);
        return (
          <div key={c.title} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border ${c.source === "goal" ? "bg-pink-50 border-pink-200" : "bg-white/80 border-gray-100"}`}>
            <div className="relative h-12 w-12 shrink-0">
              <img src={e.src} alt="" width={44} height={44} className="h-11 w-11" />
              {e.badge && (
                <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow ring-1 ring-gray-100">
                  <img src={e.badge} alt="" width={16} height={16} className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[15.5px] font-semibold text-gray-800">{c.title}</div>
              {c.reason && <div className="text-[13px] text-gray-500 leading-5">{c.reason}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, data, latest } = useMyRiasec(location.state);
  const [animated, setAnimated] = useState(false);
  // undefined = กำลังโหลด, [] = ยังไม่ได้ตั้งเป้าหมาย — นักเรียนตั้งได้หลายข้อ (เรียงตามลำดับ เป้าหมายหลักก่อน)
  const [myGoals, setMyGoals] = useState(undefined);
  const [goalIdx, setGoalIdx] = useState(0);
  const myGoal = myGoals === undefined ? undefined : myGoals[goalIdx] || myGoals[0] || null;

  // GPAX ที่นักเรียนบันทึกไว้ (ใช้แนะนำขั้นตอนถัดไปเท่านั้น ไม่เกี่ยวกับผล RIASEC)
  const [grades, setGrades] = useState(undefined);
  useEffect(() => {
    const studentId = getCurrentUser()?.user_id;
    if (!studentId) return setGrades(null);
    getStudentGrades(studentId).then(setGrades).catch(() => setGrades(null));
  }, []);

  // คำแนะนำที่ครูเขียนถึงนักเรียนจากหน้าผลการประเมินฝั่งครู (ตาราง assessment_advice)
  const [teacherAdvice, setTeacherAdvice] = useState([]);
  useEffect(() => {
    const studentId = getCurrentUser()?.user_id;
    if (!studentId) return;
    getAssessmentAdvice(studentId)
      .then((rows) => setTeacherAdvice(rows || []))
      .catch(() => setTeacherAdvice([]));
  }, []);

  useEffect(() => {
    const studentId = getCurrentUser()?.user_id;
    if (!studentId) return setMyGoals([]);
    getGoals()
      .then((rows) => setMyGoals(goalsOf(rows, studentId)))
      .catch(() => setMyGoals([]));
  }, []);

  useEffect(() => {
    if (!latest || latest.legacy) return;
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, [latest]);

  // เป้าหมาย (คณะ/อาชีพ/ข้อความ) ที่หาเจอในฐานข้อมูล → วิเคราะห์ความสอดคล้องทีละรายการ
  const ready = data && latest && !latest.legacy && myGoal !== undefined;
  // ใช้สาขาเดียวต่อเป้าหมาย ให้ตรงกับหน้าเป้าหมาย: คณะที่เลือกก่อน ถ้าหาไม่เจอจึงใช้ข้อความเป้าหมาย (ข้อความคือเหตุผล ไม่ใช่สาขาที่สอง)
  const analyses = useMemo(
    () => (ready && myGoal ? goalTargets(data, { faculty_name: myGoal.faculty_name, goal_text: myGoal.goal_text }).slice(0, 1).map((t) => analyzeTarget(data, latest, t)) : []),
    [ready, data, latest, myGoal]
  );
  const advice = useMemo(() => (ready ? personalAdvice(data, latest, analyses) : null), [ready, data, latest, analyses]);
  // สาขาทางเลือกของแต่ละการ์ด: ไม่รวมสาขาที่เป็นเป้าหมายอยู่แล้ว และไม่ซ้ำกับการ์ดก่อนหน้า
  const altsByCard = useMemo(() => {
    const seen = new Set(analyses.flatMap((a) => [a.faculty.name, ...a.candidates.map((r) => r.name)]));
    return analyses.map((a) =>
      a.alternatives.filter((x) => {
        if (seen.has(x.row.name)) return false;
        seen.add(x.row.name);
        return true;
      })
    );
  }, [analyses]);
  // ส่วน B: คำแนะนำจากผล RIASEC (ไม่รวมสาขาที่อยู่ในเป้าหมาย เพื่อไม่ให้ซ้ำกับส่วน A)
  // ตัดสาขาของ "ทุกเป้าหมาย" ออก (ไม่ใช่เฉพาะเป้าหมายที่กำลังเลือกดู) ให้ตรงกับข้อความในส่วน B
  const goalNames = useMemo(
    () =>
      ready
        ? (myGoals || []).flatMap((g) => goalTargets(data, { faculty_name: g.faculty_name, goal_text: g.goal_text }).slice(0, 1).flatMap((t) => t.match.rows.map((r) => r.name)))
        : [],
    [ready, data, myGoals]
  );
  // สาขาที่ควรสำรวจ (≤ 3) — ใช้รหัสหลัก + รหัสทางเลือกจากคะแนนเท่ากัน ตามเกณฑ์ใน exploreFaculties
  const explore = useMemo(() => (ready ? exploreFaculties(data, latest, goalNames) : []), [ready, data, latest, goalNames]);
  // กิจกรรมเพื่อสำรวจตัวเอง: ความสนใจเด่น + ด้านหลักของเป้าหมายที่ยังไม่ใช่ความสนใจเด่น (ไม่ใช้สาขาเป้าหมาย — อยู่ในการ์ดเป้าหมายแล้ว)
  const activities = useMemo(() => {
    if (!ready) return [];
    const goalDims = analyses.filter((a) => a.displayLevel === "low").map((a) => a.faculty.dim);
    return exploreActivities(data, latest, goalNames, goalDims);
  }, [ready, data, latest, goalNames, analyses]);
  // อาชีพตัวอย่าง (≤ 3) — มาจาก "สาขาที่ควรสำรวจ" ที่แสดงจริง สาขาละ 1 อาชีพ (คอลัมน์อาชีพที่เกี่ยวข้องของสาขา)
  // เลือกอาชีพที่อยู่ในรายการอาชีพตัวอย่างของรหัสด้วยก่อน (ถ้ามี) • ไม่มีสาขาที่ควรสำรวจ = ไม่แสดงอาชีพ
  const resultCareers = useMemo(() => {
    if (!ready) return [];
    const codeCareers = [latest.code, ...latest.alternativeCodes].flatMap((c) => data.codes[c].careers);
    const inCode = (t) => codeCareers.some((c) => c === t || c.startsWith(t) || t.startsWith(c));
    const out = [];
    explore.forEach(({ row }) => {
      const title = row.careers.find(inCode) || row.careers[0];
      if (title && !out.some((x) => x.title === title)) out.push({ title, faculty: row });
    });
    return out.slice(0, 3);
  }, [ready, data, latest, explore]);
  const goalCareers = useMemo(
    () => (ready && advice?.usesGoal ? careersForGoal(data, latest, advice.focus, "") : []),
    [ready, data, latest, advice]
  );

  // ส่วนที่ย่อไว้ (กดดูเพิ่ม) — หน้าแรกแสดงเฉพาะสาระสำคัญ ไม่ให้ข้อมูลหนักเกินไป
  const [showScores, setShowScores] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [more, setMore] = useState({}); // { activities, majors, careers, steps, sources }
  const toggleMore = (k) => setMore((m) => ({ ...m, [k]: !m[k] }));
  const [showAlign, setShowAlign] = useState(false);
  const [prepTab, setPrepTab] = useState(null);
  const [showConsult, setShowConsult] = useState(false);

  if (loading) {
    return (
      <Shell>
        <div className={`${CARD} text-center text-[15px] text-gray-500 py-16`}>กำลังโหลดผลแบบทดสอบ...</div>
      </Shell>
    );
  }

  if (!latest || latest.legacy) {
    return (
      <Shell>
        <div className={`${CARD} text-center py-14 px-6`}>
          <FaCompass className="mx-auto text-[38px] text-pink-400" />
          <h1 className="text-[20px] font-bold text-gray-900 mt-2">{latest ? "ผลแบบทดสอบเดิมยังไม่มีคะแนนรายด้าน" : "ยังไม่ได้ทำแบบทดสอบความถนัด"}</h1>
          <p className="text-[15px] text-gray-600 mt-2 max-w-lg mx-auto">
            {latest
              ? `ผลที่บันทึกไว้เมื่อ ${thaiDate(latest.date)} มีเพียงกลุ่ม ${latest.code} จากระบบเดิม ทำแบบทดสอบอีกครั้งเพื่อดูคะแนนทั้ง 6 ด้าน รหัสฮอลแลนด์ และคณะที่แนะนำ`
              : "ทำแบบสำรวจความสนใจ 60 ข้อ (ประมาณ 10 นาที) เพื่อดูรหัสฮอลแลนด์ จุดเด่น และคณะที่เหมาะกับความสนใจของคุณ"}
          </p>
          <button type="button" onClick={() => navigate("/aptitudeIntro")} className="mt-5 px-5 py-2.5 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[15px] font-semibold">
            เริ่มทำแบบทดสอบ
          </button>
        </div>
      </Shell>
    );
  }

  const { scores, ranked } = latest;
  // ความสนใจเด่น = อันดับ 1–3 แบบนับคะแนนเท่ากัน (I = A ที่อันดับ 3 → แสดงทั้งคู่) เรียงคะแนนมากไปน้อย
  const topDims = ranked.filter((c) => denseRank(scores, c) <= 3);
  const allCodes = [latest.code, ...latest.alternativeCodes];
  // ด้านที่ทำให้รหัสเป็นได้หลายแบบ (อยู่ในบางรหัสแต่ไม่ครบทุกรหัส)
  const swingDims = RIASEC_ORDER.filter((c) => allCodes.some((x) => x.includes(c)) && !allCodes.every((x) => x.includes(c)));
  // กลุ่มด้านในอันดับ 1–3 ที่คะแนนเท่ากัน — ใช้อธิบายว่าทำไมรหัสเรียงแบบนี้ (เช่น A = S อันดับร่วม 1 → ASC หรือ SAC)
  const codeTies = [...new Set(topDims.map((c) => denseRank(scores, c)))]
    .map((rank) => ({ rank, dims: RIASEC_ORDER.filter((c) => topDims.includes(c) && denseRank(scores, c) === rank) }))
    .filter((g) => g.dims.length > 1);
  const dims = data.dimensions;
  // อันดับรูปแบบเดียวทั้งหน้า: "อันดับ 1" / "อันดับร่วม 3 (กับ A)" — คะแนนเท่ากันได้อันดับเดียวกัน
  const rankText = (c) => {
    const t = tiedWith(scores, c);
    return `${rankLabel(scores, c)}${t.length ? ` (กับ ${t.join(", ")})` : ""}`;
  };
  const maxScore = Math.max(...RIASEC_ORDER.map((c) => scores[c]));
  const minScore = Math.min(...RIASEC_ORDER.map((c) => scores[c]));
  const atScore = (v) => RIASEC_ORDER.filter((c) => scores[c] === v).join("/");
  // ขั้นตอนถัดไปตามสถานะจริงของนักเรียน (ไม่ใช้รายการเดียวกันกับทุกคน)
  const goalA = analyses[0] || null;
  // ข้อความเป้าหมายพูดถึงสาขาอื่นที่ไม่ใช่คณะที่เลือก (เช่น เลือกวิศวกรรมโยธา แต่เขียนว่าอยากเรียนกราฟิก)
  const goalTextMismatch = (() => {
    if (!myGoal?.faculty_name || !myGoal?.goal_text) return null;
    const fac = matchGoalFaculties(data, myGoal.faculty_name);
    const txt = matchGoalFaculties(data, myGoal.goal_text);
    if (!fac || !txt) return null;
    return txt.rows.some((r) => fac.rows.some((x) => x.name === r.name)) ? null : txt.label;
  })();
  // ด้านที่คะแนนเท่ากัน: ด้านที่ทำให้รหัสเป็นได้หลายแบบก่อน ไม่มี = ด้านในความสนใจเด่นที่คะแนนเท่ากับด้านอื่น (คะแนนเท่ากันนอกอันดับ 1–3 ไม่ต้องแนะนำ)
  const tieDims = swingDims.length >= 2 ? swingDims : topDims.filter((c) => tiedWith(scores, c).some((d) => topDims.includes(d)));
  const nextSteps = [
    !hasGoal(myGoal) && "ตั้งเป้าหมายคณะ/สาขาที่สนใจในหน้าเป้าหมาย เพื่อให้ระบบเทียบกับผลนี้และแสดงเกณฑ์รับเข้าจริง",
    hasGoal(myGoal) && !goalA && `ยังไม่พบ “${myGoal.faculty_name || myGoal.goal_text}” ในข้อมูลของระบบ — ลองเลือกชื่อคณะจากรายการในหน้าเป้าหมาย หรือปรึกษาครูแนะแนว`,
    goalA && !myGoal.university_name && "เลือกมหาวิทยาลัยในเป้าหมาย (หรือในกล่องเกณฑ์รับเข้าด้านล่าง) เพื่อดูจำนวนที่รับ วิชาสอบ และเกณฑ์ Portfolio จริง",
    goalA && `อ่านรายวิชาและลักษณะการเรียนของหลักสูตร${nm(goalA.faculty.name)}จากลิงก์ myTCAS แล้วดูว่าตรงกับสิ่งที่คาดไว้หรือไม่`,
    goalA?.displayLevel === "low" && `ทดลองกิจกรรมด้าน${TRAIT_NOUN[goalA.faculty.dim]}ที่สาขาเป้าหมายใช้ (ดูในกิจกรรมเพื่อสำรวจตัวเอง) แล้วทบทวนว่าอยากพัฒนาด้านนี้ต่อหรือไม่`,
    grades === null || grades?.gpax == null
      ? "บันทึกเกรดในหน้าเป้าหมาย เพื่อเทียบกับ GPAX ขั้นต่ำในเกณฑ์รับเข้า"
      : grades && `เทียบ GPAX ของคุณ (${Number(grades.gpax).toFixed(2)}) กับ GPAX ขั้นต่ำของแต่ละรอบในส่วนเกณฑ์รับเข้า`,
    tieDims.length >= 2 && `ความสนใจด้าน${joinTh(tieDims.map((c) => TRAIT_NOUN[c]))}ได้คะแนนเท่ากัน ลองกิจกรรมของ${tieDims.length === 2 ? "ทั้งสองด้าน" : "ทุกด้าน"}เพื่อดูว่าชอบแบบไหนมากกว่า`,
    latest.lowDifferentiation && "คะแนนแต่ละด้านใกล้กัน ลองกิจกรรมหลายแบบก่อนตัดสินใจเลือกสาขา",
    "ปรึกษาครูแนะแนวเมื่อยังไม่แน่ใจ หรืออยากได้มุมมองเพิ่มเติม",
  ].filter(Boolean);
  // สรุปเป็นภาษาธรรมชาติจากคะแนนจริง — ใช้ข้อความเดียวกับหน้าผลฝั่งครู (utils/riasecSummary.js)
  const summary = interestSummaryText(scores, "คุณ");

  const studentName = (getCurrentUser()?.name || "").replace(/^(นางสาว|เด็กหญิง|เด็กชาย|นาย|นาง)\s*/u, "").split(/\s+/)[0];
  const top3 = topDims.slice(0, Math.max(3, topDims.filter((c) => denseRank(scores, c) <= 3).length));
  const goalUni = myGoal?.university_name ? fullUniName(myGoal.university_name) : null;
  const pf = advice?.usesGoal ? advice.perFaculty[0] : null;
  const PREP_TABS = [
    { key: "subjects", title: "วิชาที่ควรเน้น", desc: "วิชาและทักษะที่ควรให้ความสำคัญ", icon: FaBookOpen, preview: pf?.subjects?.slice(0, 3).join(" · ") },
    { key: "exam", title: "การเตรียมสอบ / Portfolio", desc: "แนวทางเตรียมสอบและแฟ้มสะสมผลงาน", icon: FaClipboardList, preview: pf?.exam },
    { key: "programs", title: "หลักสูตรและมหาวิทยาลัย", desc: "ข้อมูลหลักสูตร รอบการรับสมัคร", icon: FaUniversity, preview: goalUni ? `${goalUni} · ดูเกณฑ์รับเข้าแต่ละรอบ` : "เลือกมหาวิทยาลัยเพื่อดูเกณฑ์รับเข้า" },
    { key: "careers", title: "อาชีพที่เกี่ยวข้องเพิ่มเติม", desc: "อาชีพอื่น ๆ ที่เกี่ยวข้องกับเป้าหมาย", icon: FaBriefcase, preview: goalCareers.map((c) => c.title).slice(0, 3).join(" · ") || "ดูอาชีพที่เกี่ยวข้อง" },
  ];

  return (
    <Shell>
      {/* ===== หัวหน้า ===== */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[13.5px] text-gray-500">
            ผลการวิเคราะห์ความสนใจ RIASEC <span className="text-gray-300 mx-1">•</span> {thaiDate(latest.date)}
          </p>
          <h1 className="mt-1 text-[26px] font-bold text-gray-900">สวัสดี{studentName ? ` ${studentName}` : ""}</h1>
          <p className="text-[14.5px] text-gray-500">นี่คือผลลัพธ์ที่สะท้อนความสนใจของคุณ</p>
        </div>
        <button type="button" onClick={() => setShowAbout((v) => !v)} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] text-gray-600 hover:border-pink-300 hover:text-pink-600">
          <FaInfoCircle className="inline mr-1.5 -mt-0.5 text-[13px]" />เข้าใจผลลัพธ์ RIASEC คืออะไร?
        </button>
      </div>

      {showAbout && (
        <div className={CARD}>
          <p className="rounded-xl bg-pink-50/70 border border-pink-100 px-4 py-3 text-[14.5px] text-gray-700 leading-7">
            RIASEC คือแนวคิดของ John Holland ที่แบ่งความสนใจเป็น 6 ด้าน ระบบรวมคะแนนจากแบบสำรวจด้านละ 10 ข้อ ({MIN_SCORE}–{MAX_SCORE} คะแนน)
            แล้วนำ 3 ด้านที่คะแนนสูงสุดมาเป็นรหัสของคุณ ผลนี้บอก “ความสนใจ” ไม่ได้วัดความสามารถ และไม่ได้ตัดสินว่าคุณเหมาะกับสาขาหรืออาชีพใด
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {RIASEC_ORDER.map((c) => {
              const t = DIM_THEME[c];
              const mine = topDims.includes(c);
              return (
                <div key={c} className={`rounded-xl border px-3.5 py-3 ${t.card} ${mine ? "ring-2 ring-pink-200" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-9 w-9 shrink-0 rounded-lg grid place-items-center text-[16px] font-bold ${t.icon} ${t.text}`}>{c}</span>
                    <div className="min-w-0">
                      <div className={`text-[15px] font-semibold ${t.text}`}>{dims[c].nameEn}</div>
                      <div className="text-[13px] text-gray-500">
                        {dims[c].nameTh}
                        {mine && <span className="ml-1.5 rounded-full bg-pink-500 px-2 py-0.5 text-[11px] font-medium text-white">ด้านเด่นของคุณ</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-[13.5px] text-gray-700 leading-6 mt-2">{dims[c].traits}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== รหัส + จุดเด่น 3 อันดับ ===== */}
      <div className={`${CARD} !p-0 overflow-hidden`}>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center text-center gap-2 px-5 py-6 border-b lg:border-b-0 lg:border-r border-pink-100/70">
            <div className="text-[15px] font-semibold text-gray-700">รหัส RIASEC ของคุณ</div>
            <div className="text-[54px] leading-none font-extrabold tracking-wide text-pink-500">{latest.code}</div>
            {latest.hasTie && latest.alternativeCodes.length > 0 && (
              <div className="text-[13px] text-gray-400">
                {latest.alternativeCodes.length <= 2 ? `หรือ ${latest.alternativeCodes.join(", ")}` : `เขียนได้ ${latest.alternativeCodes.length + 1} แบบ`}
              </div>
            )}
            <span className="rounded-full bg-pink-50 border border-pink-100 px-3 py-1 text-[13px] font-medium text-pink-600">ความสนใจอันดับ 1–3</span>
            <button type="button" onClick={() => setShowScores((v) => !v)} className="mt-1 rounded-xl border border-pink-300 bg-white px-4 py-2 text-[14px] font-medium text-pink-600 hover:bg-pink-50">
              {showScores ? "ซ่อนคะแนน" : "ดูคะแนนทั้งหมด"}
            </button>
          </div>
          <div className="px-5 py-5">
            <div className="text-[16px] font-semibold text-gray-800">จุดเด่น 3 อันดับของคุณ</div>
            <div className={`mt-3 grid grid-cols-1 sm:grid-cols-3 ${top3.length > 3 ? "lg:grid-cols-4" : ""} gap-2.5`}>
              {top3.map((c) => {
                const t = DIM_THEME[c];
                return (
                  <div key={c} className={`rounded-xl border px-3.5 py-3 ${t.card}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center text-[15px] font-bold ${t.icon} ${t.text}`}>{c}</span>
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-semibold text-gray-800 truncate">{dims[c].nameEn}</div>
                        <div className="text-[12.5px] text-gray-500">{dims[c].nameTh} · {rankText(c)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 rounded-xl bg-pink-50/60 border border-pink-100 px-4 py-3 text-[15px] text-gray-700 leading-7">
              <span className="text-pink-400 font-bold mr-1">“</span>
              {summary}
            </div>
            {codeTies.length > 0 && (
              <p className="mt-2 text-[12.5px] text-gray-400">
                {codeTies.map((g) => `${g.dims.join(" และ ")} อันดับร่วม ${g.rank}`).join(" • ")} — ด้านที่คะแนนเท่ากันเรียงตามลำดับ R-I-A-S-E-C
              </p>
            )}
            {latest.lowDifferentiation && <p className="mt-2 text-[13px] text-sky-800">คะแนนทุกด้านของคุณใกล้เคียงกัน ลองทำกิจกรรมหลายแบบก่อนตัดสินใจ</p>}
            {location.state?.saveFailed && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[14px] text-red-800">
                บันทึกผลลงระบบไม่สำเร็จ (ครูจะยังไม่เห็นผลนี้) — ตรวจสอบอินเทอร์เน็ตแล้วทำแบบทดสอบอีกครั้ง หรือแจ้งครูแนะแนว
              </div>
            )}
          </div>
        </div>

        {showScores && (
          <div className="border-t border-pink-100/70 px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {RIASEC_ORDER.map((c) => {
                const [from, to] = colorMap[c];
                const pct = scorePercent(scores[c]);
                return (
                  <div key={c}>
                    <div className="flex flex-wrap justify-between gap-x-2 text-[13.5px] mb-1">
                      <span>
                        <b>{c}</b> {dims[c].nameEn} · {dims[c].nameTh}
                      </span>
                      <span>
                        <span className="text-gray-400">{rankText(c)}</span> · <b>{scores[c]}/{MAX_SCORE}</b>
                      </span>
                    </div>
                    <div className="w-full h-3.5 rounded-full bg-gray-200/50 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${from} ${to}`} style={{ width: animated ? `${pct}%` : 0 }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-[12.5px] text-gray-500">
                ความแตกต่างของคะแนน {latest.differentiation} (สูงสุด {atScore(maxScore)} {maxScore} − ต่ำสุด {atScore(minScore)} {minScore}) •
                ความสอดคล้องของ 2 อันดับแรก: {CONSISTENCY_META[latest.consistency].label} — {CONSISTENCY_META[latest.consistency].text}
              </p>
            </div>
            <RadarChart scores={scores} />
          </div>
        )}
      </div>

      {/* ===== ① สิ่งที่น่าสนใจสำหรับคุณ ===== */}
      <NumHeader n="1" title="สิ่งที่น่าสนใจสำหรับคุณ" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopicCard tone="emerald" title="กิจกรรมที่แนะนำ" subtitle="ลองเริ่มจาก 1–2 กิจกรรมนี้" open={more.activities} onToggle={() => toggleMore("activities")} canExpand={activities.length > 0}>
          {activities.length === 0 ? (
            <p className="text-[14px] text-gray-500">ยังไม่มีกิจกรรมแนะนำ</p>
          ) : (
            <ul className="space-y-3">
              {(more.activities ? activities : activities.slice(0, 2)).map((x) => {
                const g = DIM_ACTIVITY[x.dim];
                return (
                  <li key={x.dim} className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-500 text-white grid place-items-center"><FaCheck className="text-[9px]" /></span>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-gray-800 leading-6">{g.act}</div>
                      <div className="text-[13.5px] text-gray-500 leading-6">{x.text || g.how}</div>
                      {more.activities && <div className="text-[13px] text-gray-500 leading-5 mt-0.5">ลองสังเกต: {g.question}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TopicCard>

        <TopicCard tone="sky" title={`สาขาที่ควรสำรวจ${explore.length ? ` (${explore.length} อันดับ)` : ""}`} subtitle="เลือกสาขาที่ตรงกับความสนใจ" open={more.majors} onToggle={() => toggleMore("majors")} canExpand={explore.length > 0}>
          {explore.length === 0 ? (
            <p className="text-[14px] text-gray-500">ยังไม่มีสาขาที่เชื่อมกับความสนใจเด่นได้ชัดเจน ลองปรึกษาครูแนะแนวเพื่อสำรวจเพิ่มเติม</p>
          ) : (
            <ol className="space-y-3">
              {explore.map(({ row, links }, i) => {
                const link = links.find((l) => l.code === row.dim) || links[0];
                return (
                  <li key={row.name} className="flex items-start gap-2.5">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-sky-500 text-white text-[12.5px] font-bold grid place-items-center">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-gray-800 leading-6">{row.name}</div>
                      {more.majors && (
                        <div className="mt-1 space-y-1.5">
                          <p className="text-[13.5px] text-gray-600 leading-6">
                            เกี่ยวข้องกับ{joinTh(link.phrases.slice(0, 2))} ซึ่งเชื่อมโยงกับความสนใจด้าน{TRAIT_NOUN[link.code]}ของคุณ
                          </p>
                          <StudyBeforeDeciding faculty={row} skip={link.phrases.slice(0, 2)} />
                          <ProgramPick faculty={row} goalUni={myGoal?.university_name} compact />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {more.majors && (
            <a href={MYTCAS_HOME} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13.5px] text-sky-600 underline underline-offset-2">
              ค้นหาหลักสูตรอื่นบน myTCAS<FaExternalLinkAlt className="inline ml-1 text-[10px] align-baseline" />
            </a>
          )}
        </TopicCard>

        <TopicCard tone="orange" title={`อาชีพตัวอย่าง${resultCareers.length ? ` (${resultCareers.length} อาชีพ)` : ""}`} subtitle="อาชีพที่สอดคล้องกับคุณ" open={more.careers} onToggle={() => toggleMore("careers")} canExpand={resultCareers.length > 0}>
          {resultCareers.length === 0 ? (
            <p className="text-[14px] text-gray-500">ยังไม่มีข้อมูลอาชีพที่เกี่ยวข้อง</p>
          ) : (
            <ul className="space-y-3">
              {resultCareers.map((c, i) => {
                const e = careerEmoji(c.title, c.faculty?.dim, i);
                return (
                  <li key={c.title} className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0">
                      <img src={e.src} alt="" width={40} height={40} className="h-10 w-10" />
                      {e.badge && (
                        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow ring-1 ring-gray-100">
                          <img src={e.badge} alt="" width={14} height={14} className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-gray-800">{c.title}</div>
                      {more.careers && <div className="text-[13px] text-gray-500">ในสาขา{c.faculty.name}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TopicCard>
      </div>

      {/* ===== ② เป้าหมายการศึกษาต่อ ===== */}
      <NumHeader n="2" title="เป้าหมายการศึกษาต่อของฉัน" />
      {myGoals?.length > 1 && (
        <div className="-mt-2 flex flex-wrap gap-2">
          {myGoals.map((g, i) => (
            <button
              key={g.goal_id}
              type="button"
              onClick={() => setGoalIdx(i)}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] ${myGoal?.goal_id === g.goal_id ? "!bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-pink-300"}`}
            >
              {GOAL_RANK_LABEL[i]}: {g.faculty_name || g.career_field}
            </button>
          ))}
        </div>
      )}
      {!ready ? (
        <div className={`${CARD} text-[14.5px] text-gray-400`}>กำลังโหลด...</div>
      ) : !hasGoal(myGoal) ? (
        <div className={`${CARD} flex items-center justify-between gap-3 flex-wrap`}>
          <p className="text-[15px] text-gray-600">ยังไม่ได้ตั้งเป้าหมาย — ตั้งคณะและมหาวิทยาลัยที่สนใจ แล้วระบบจะเทียบกับผลนี้และแนะนำวิธีเตรียมตัวให้</p>
          <button type="button" onClick={() => navigate("/studentgoal")} className="shrink-0 px-4 py-2 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[14px] font-medium">
            ไปตั้งเป้าหมาย
          </button>
        </div>
      ) : !goalA ? (
        <div className={`${CARD} text-[15px] text-gray-600`}>
          เป้าหมายของคุณคือ <b>{myGoal.faculty_name || myGoal.goal_text || "-"}</b> — ยังไม่มีข้อมูลคณะนี้ในระบบ จึงยังเปรียบเทียบไม่ได้ ลองเลือกชื่อคณะจากรายการในหน้าเป้าหมาย หรือปรึกษาครูแนะแนว
        </div>
      ) : (
        <>
          <GoalSummary a={goalA} latest={latest} scores={scores} goal={myGoal} university={goalUni} />
          <div className="-mt-2 text-center">
            <button type="button" onClick={() => setShowAlign((v) => !v)} className="text-[14.5px] font-medium text-pink-600 hover:text-pink-700 bg-transparent !p-0">
              {showAlign ? "ซ่อนรายละเอียด" : <>ดูรายละเอียดความสอดคล้อง<FaArrowRight className="inline ml-1 text-[11px]" /></>}
            </button>
          </div>
          {showAlign && (
            <div className="grid gap-4">
              <GoalHeader goal={myGoal} onEdit={() => navigate("/studentgoal")} textMismatch={goalTextMismatch} />
              <AlignmentCard a={goalA} latest={latest} scores={scores} alternatives={altsByCard[0] || []} university={goalUni} />
            </div>
          )}
        </>
      )}

      {/* ===== ③ แนวทางเตรียมตัว ===== */}
      <NumHeader n="3" title="แนวทางเตรียมตัว" />
      {!advice?.usesGoal ? (
        <div className={`${CARD} text-[14.5px] text-gray-500`}>ตั้งเป้าหมายคณะที่มีในระบบ เพื่อดูวิชาที่ควรเน้น การเตรียมสอบ และเกณฑ์รับเข้าจริง</div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PREP_TABS.map((t) => {
              const active = prepTab === t.key;
              const TabIcon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPrepTab(active ? null : t.key)}
                  className={`text-left rounded-2xl border bg-white px-4 py-4 transition-all flex flex-col ${active ? "border-pink-300 ring-2 ring-pink-100 shadow-sm" : "border-gray-100 hover:border-pink-200 hover:shadow-sm"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center transition-colors ${active ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-500"}`}>
                      <TabIcon className="text-[16px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-gray-800 leading-5">{t.title}</div>
                      <div className="text-[12.5px] text-gray-500 mt-0.5">{t.desc}</div>
                    </div>
                    <span className={`mt-1 text-[12px] ${active ? "text-pink-500" : "text-gray-300"}`}>{active ? <FaChevronUp /> : <FaChevronDown />}</span>
                  </div>
                  {t.preview && (
                    <div className="mt-auto pt-3">
                      <div className="rounded-lg bg-pink-50/50 px-3 py-2 text-[13px] text-gray-600 leading-5 line-clamp-2">{t.preview}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {prepTab && (
            <div className={`${CARD} mt-3 border-l-4 !border-l-pink-400`}>
              <div className="text-[16px] font-semibold text-gray-900 mb-2">{PREP_TABS.find((t) => t.key === prepTab)?.title}</div>
              {advice.perFaculty.map((f) => (
                <div key={f.name} className="text-[15px] text-gray-700 leading-7">
                  {advice.perFaculty.length > 1 && <div className="text-[13px] font-semibold text-pink-600">{f.name}</div>}
                  {prepTab === "subjects" && (
                    <>
                      <div>
                        <b>{f.subjects.join(", ")}</b>
                      </div>
                      <div className="text-gray-600">สายการเรียนที่แนะนำ: {f.track}</div>
                      <div className="mt-2 font-semibold text-gray-800">ทักษะที่ควรพัฒนา</div>
                      <ul className="space-y-1">
                        {f.skills.split(/,\s*/).map((sk) => (
                          <li key={sk}>
                            <b className="font-semibold text-gray-800">{sk}</b>
                            {SKILL_DESC[sk] && <span className="text-gray-600"> — {SKILL_DESC[sk]}</span>}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-1 text-[12.5px] text-gray-500">คำแนะนำทั่วไป ไม่ใช่ข้อกำหนดการรับเข้า — วิชาสอบจริงดูที่ “หลักสูตรและมหาวิทยาลัย”</div>
                    </>
                  )}
                  {prepTab === "exam" && (
                    <>
                      <div>{f.exam}</div>
                      <div className="mt-1 text-[12.5px] text-gray-500">คำแนะนำทั่วไปจากข้อมูลแนะแนวของโรงเรียน ไม่ใช่เกณฑ์รับเข้า</div>
                    </>
                  )}
                  {prepTab === "programs" && (
                    <>
                      <ProgramPick faculty={f} goalUni={myGoal?.university_name} />
                      <details className="mt-2" open={Boolean(myGoal?.university_name)}>
                        <summary className="cursor-pointer select-none text-[14px] font-medium text-sky-700">ดูเกณฑ์รับเข้าแต่ละรอบ (myTCAS)</summary>
                        <div className="mt-2">
                          <AdmissionInfo facultyName={f.name} university={goalUni} hideTitle />
                        </div>
                      </details>
                    </>
                  )}
                  {prepTab === "careers" && <CareerList items={goalCareers} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* คำแนะนำจากครูแนะแนว */}
      {teacherAdvice.length > 0 && (
        <div className={CARD}>
          <SectionHeader icon={FaChalkboardTeacher} title="คำแนะนำจากครูแนะแนว" subtitle="ครูเขียนถึงคุณจากผลแบบประเมินและเป้าหมายของคุณ" />
          <div className="grid gap-2.5">
            {teacherAdvice.map((a) => (
              <div key={a.advice_id} className="rounded-xl bg-white/80 border border-pink-100 px-4 py-3">
                {a.topic && <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-[13px] font-medium text-pink-700">{a.topic}</span>}
                <p className={`${a.topic ? "mt-2" : ""} text-[15px] text-gray-700 leading-7 whitespace-pre-line`}>{a.advice_text}</p>
                <p className="mt-1 text-[12.5px] text-gray-400">
                  {a.teacher_name ? `${a.teacher_name} · ` : ""}
                  {thaiDate(a.updated_at || a.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ④ ขั้นตอนถัดไป ===== */}
      <NumHeader n="4" title="ขั้นตอนถัดไป" subtitle="สิ่งที่คุณทำต่อได้ทันที" />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className={CARD}>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextSteps.slice(0, 3).map((t, i, arr) => (
              <li key={t} className="relative flex md:flex-col gap-3">
                {/* เส้นเชื่อมไปขั้นถัดไป */}
                {i < arr.length - 1 && <span aria-hidden className="hidden md:block absolute top-[18px] left-12 -right-4 h-0.5 bg-gradient-to-r from-pink-300 to-pink-100" />}
                <span className="relative z-10 h-9 w-9 shrink-0 rounded-full bg-pink-500 text-white text-[15px] font-bold grid place-items-center ring-4 ring-pink-100">{i + 1}</span>
                <div className="min-w-0 rounded-xl bg-pink-50/40 border border-pink-100/70 px-3.5 py-3 flex-1">
                  <div className="text-[12px] font-semibold text-pink-500">ขั้นที่ {i + 1}</div>
                  <div className="text-[14.5px] text-gray-700 leading-6 mt-0.5">{t}</div>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => toggleMore("steps")} className="mt-3 text-[13.5px] font-medium text-pink-600 hover:text-pink-700 bg-transparent !p-0">
              {more.steps ? "ซ่อน" : <>ดูขั้นตอนทั้งหมดและแนวทาง ม.4–ม.6<FaArrowRight className="inline ml-1 text-[11px]" /></>}
          </button>
          {more.steps && (
            <div className="mt-3 space-y-3">
              {nextSteps.length > 3 && (
                <ol start={4} className="space-y-1.5 text-[14.5px] text-gray-700 list-decimal pl-5 marker:font-semibold marker:text-pink-500">
                  {nextSteps.slice(3).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {roadmapFor(advice?.usesGoal ? advice.focus[0]?.name : null).map((step) => (
                  <div key={step.grade} className="bg-white/70 rounded-xl p-3.5">
                    <div className="text-[15px] font-semibold text-pink-600">{step.grade}</div>
                    <ul className="mt-1.5 space-y-1 text-[14px] text-gray-700">
                      {step.items.map((it, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 shrink-0 rounded-xl bg-white text-pink-500 grid place-items-center border border-pink-100">
              <FaChalkboardTeacher className="text-[16px]" />
            </span>
            <div className="text-[17px] font-semibold text-pink-700">ปรึกษาครูแนะแนว</div>
          </div>
          <p className="text-[14px] text-gray-600">นัดหมายพูดคุยกับครูแนะแนว หรือส่งเรื่องที่อยากปรึกษา เพื่อรับคำแนะนำเฉพาะตัว</p>
          <button type="button" onClick={() => navigate("/studentcalendar")} className="mt-1 rounded-xl border border-pink-300 bg-white px-4 py-2 text-[14.5px] font-medium text-pink-600 hover:bg-pink-50">
            <FaRegCalendarAlt className="inline mr-1.5 -mt-0.5" />นัดหมายเลย
          </button>
          <button type="button" onClick={() => setShowConsult((v) => !v)} className="text-[13.5px] text-pink-600 hover:underline bg-transparent !p-0">
            {showConsult ? "ซ่อน" : <>หรือส่งคำขอปรึกษา<FaArrowRight className="inline ml-1 text-[11px]" /></>}
          </button>
        </div>
      </div>
      {showConsult && <ConsultNeed onOpen={() => navigate("/studentconsultations")} />}

      {/* ===== ปุ่มท้ายหน้า ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.6fr] gap-3 print:hidden">
        <button className="h-12 rounded-xl border border-gray-200 bg-white text-gray-700 text-[15px] font-semibold hover:bg-gray-50" onClick={() => window.print()}>
          <FaPrint className="inline mr-2 -mt-0.5" />พิมพ์ผล
        </button>
        <button className="h-12 rounded-xl border border-gray-200 bg-white text-gray-700 text-[15px] font-semibold hover:bg-gray-50" onClick={() => navigate("/aptitudeIntro")}>
          <FaRedoAlt className="inline mr-2 -mt-0.5 text-[13px]" />ทำแบบทดสอบอีกครั้ง
        </button>
        <button className="h-12 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[15px] font-semibold shadow-sm" onClick={() => navigate("/")}>
          <FaHome className="inline mr-2 -mt-0.5" />กลับหน้าหลัก
        </button>
      </div>

      <div className="px-1 text-[12.5px] text-gray-400 flex items-center justify-between gap-2 flex-wrap">
        <span>ข้อมูลอ้างอิง: ข้อมูลแนะแนวของโรงเรียน และ myTCAS • ผลแบบสำรวจวันที่ {thaiDate(latest.date)}</span>
        <button type="button" onClick={() => toggleMore("sources")} className="text-gray-500 hover:text-gray-700 bg-transparent !p-0">
          <FaInfoCircle className="inline mr-1 -mt-0.5" />แหล่งข้อมูลและวันที่ตรวจสอบ
        </button>
      </div>
      {more.sources && (
        <ul className="px-1 -mt-3 space-y-1 pl-5 list-disc text-[12px] text-gray-500">
          {dataSources.sources.map((s) => (
            <li key={s.id}>
              <b>{s.name}</b> — {s.use}
              {s.url && (
                <>
                  {" "}
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline break-all">
                    {s.url}
                  </a>
                </>
              )}
              {s.checkedAt && ` • ตรวจเมื่อ ${thaiDate(s.checkedAt)}`}
              {s.checked && ` (${s.checked})`}
            </li>
          ))}
          <li>แหล่งอ้างอิงที่ระบุในไฟล์ข้อมูลของโรงเรียน: {data.sources.map((s) => s.name).join(", ")}</li>
          <li>ความรู้ที่ใช้ของแต่ละสาขา: อาชีพตัวแทนจาก O*NET OnLine (กระทรวงแรงงานสหรัฐฯ) ตรวจเมื่อ {thaiDate(onet.checkedAt)}</li>
          <li>วิธีคิดคะแนน: รวมคะแนนรายด้าน ด้านละ 10 ข้อ (10–50) ตามแนวคิด RIASEC ของ John Holland</li>
          <li>รูปอิโมจิอาชีพ: Twemoji โดย Twitter, Inc. และผู้ร่วมพัฒนา (github.com/jdecked/twemoji) สัญญาอนุญาต CC BY 4.0</li>
        </ul>
      )}
    </Shell>
  );
}

// หัวข้อหลักมีเลขลำดับ (ตามแบบหน้าผล: ① ② ③ ④)
function NumHeader({ n, title, subtitle, tone = "pink" }) {
  const bg = tone === "violet" ? "bg-violet-500" : "bg-pink-500";
  return (
    <div className="flex items-center gap-2.5 -mb-1">
      <span className={`h-7 w-7 rounded-full ${bg} text-white text-[14px] font-bold grid place-items-center shrink-0`}>{n}</span>
      <div>
        <h2 className="text-[19px] font-bold text-gray-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

// การ์ดหัวข้อในส่วน "สิ่งที่น่าสนใจ" — แสดงสาระก่อน กด "ดูเพิ่มเติม" เพื่อดูรายละเอียด
const TOPIC_TONE = {
  emerald: { card: "bg-emerald-50/50 border-emerald-100", title: "text-emerald-700", link: "text-emerald-700" },
  sky: { card: "bg-sky-50/50 border-sky-100", title: "text-sky-700", link: "text-sky-700" },
  orange: { card: "bg-orange-50/50 border-orange-100", title: "text-orange-600", link: "text-orange-600" },
};
function TopicCard({ tone, title, subtitle, open, onToggle, canExpand, children }) {
  const t = TOPIC_TONE[tone];
  return (
    <div className={`rounded-2xl border p-5 flex flex-col min-w-0 ${t.card}`}>
      <div className={`text-[17px] font-semibold ${t.title}`}>{title}</div>
      {subtitle && <div className="text-[13px] text-gray-500 mb-3">{subtitle}</div>}
      <div className="flex-1">{children}</div>
      {canExpand && (
        <button type="button" onClick={onToggle} className={`mt-4 self-center text-[14px] font-medium ${t.link} hover:underline bg-transparent !p-0`}>
          {open ? <>ย่อ<FaChevronUp className="inline ml-1 text-[11px]" /></> : <>ดูเพิ่มเติม<FaArrowRight className="inline ml-1 text-[11px]" /></>}
        </button>
      )}
    </div>
  );
}

// สรุปความสอดคล้องกับเป้าหมายแบบย่อ 3 ช่อง (รายละเอียดเต็มอยู่ใน AlignmentCard เมื่อกดดูรายละเอียด)
// ระบบไม่ให้เปอร์เซ็นต์ความเหมาะสม จึงแสดงระดับ สูง/ปานกลาง/ต่ำ ตามเกณฑ์เดิมแทน
const RING = { high: { stroke: "#10b981", fill: 1, text: "text-emerald-600" }, medium: { stroke: "#f59e0b", fill: 0.66, text: "text-amber-600" }, low: { stroke: "#94a3b8", fill: 0.33, text: "text-slate-500" } };
function GoalSummary({ a, latest, scores, goal, university }) {
  const f = a.faculty;
  const dimMine = denseRank(scores, f.dim) <= 3;
  const ring = RING[a.displayLevel];
  // สีทั้งการ์ดตามระดับความสอดคล้อง: สูง = เขียว, ปานกลาง = เหลือง, ต่ำ = เทา
  const tone = {
    high: { box: "border-emerald-200 bg-emerald-50/50", label: "text-emerald-700", ok: "bg-emerald-500" },
    medium: { box: "border-amber-200 bg-amber-50/50", label: "text-amber-700", ok: "bg-amber-500" },
    low: { box: "border-slate-200 bg-slate-50/70", label: "text-slate-600", ok: "bg-slate-500" },
  }[a.displayLevel];
  const C = 2 * Math.PI * 30;
  const LEVEL_DESC = {
    high: "ความสนใจของคุณสอดคล้องกับเป้าหมายนี้ในระดับสูง",
    medium: "ความสนใจของคุณเชื่อมกับเป้าหมายนี้ได้บางด้าน",
    low: "ความสนใจเด่นของคุณยังต่างจากเป้าหมายนี้ ลองสำรวจเพิ่ม",
  };
  const why = [
    { ok: a.reason === "recommended", text: a.reason === "recommended" ? `สาขาแนะนำของรหัส ${a.viaCode}` : `ไม่อยู่ในสาขาแนะนำของรหัส ${latest.code}` },
    { ok: dimMine, text: `${dimMine ? "เด่น" : "ยังไม่เด่น"}ด้าน ${DIM_EN[f.dim]}` },
    { ok: a.links.length > 0, text: a.links.length ? `เชื่อมด้าน ${a.links.map((l) => DIM_EN[l.code]).slice(0, 2).join(", ")}` : "ยังไม่พบคุณลักษณะที่เชื่อมกัน" },
  ];
  return (
    <div className={`rounded-2xl border p-5 grid grid-cols-1 md:grid-cols-3 gap-5 ${tone.box}`}>
      <div>
        <div className={`text-[13.5px] font-medium ${tone.label}`}>เป้าหมายของคุณ</div>
        <div className="mt-1 text-[22px] font-bold text-gray-900 leading-tight">{f.name}</div>
        <div className="text-[14px] text-gray-500 mt-1">{university || goal?.university_name || "ยังไม่ได้เลือกมหาวิทยาลัย"}</div>
      </div>
      <div>
        <div className={`text-[13.5px] font-medium ${tone.label}`}>ความสอดคล้องกับเป้าหมาย</div>
        <div className="mt-2 flex items-center gap-3">
          <svg viewBox="0 0 72 72" className="h-[72px] w-[72px] shrink-0" role="img" aria-label={`ความสอดคล้อง${LEVEL_TH[a.displayLevel]}`}>
            <circle cx="36" cy="36" r="30" fill="none" stroke="#e5e7eb" strokeWidth="7" />
            <circle cx="36" cy="36" r="30" fill="none" stroke={ring.stroke} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${C * ring.fill} ${C}`} transform="rotate(-90 36 36)" />
            <text x="36" y="40" textAnchor="middle" fontSize={a.displayLevel === "medium" ? 11.5 : 15} fontWeight="700" fill="#111827">{LEVEL_TH[a.displayLevel]}</text>
          </svg>
          <div>
            <div className={`text-[16px] font-semibold ${ring.text}`}>สอดคล้อง{LEVEL_TH[a.displayLevel]}</div>
            <div className="text-[13.5px] text-gray-500 leading-5">{LEVEL_DESC[a.displayLevel]}</div>
          </div>
        </div>
      </div>
      <div>
        <div className={`text-[13.5px] font-medium ${tone.label}`}>ทำไมถึงสอดคล้อง?</div>
        <ul className="mt-2 space-y-1.5">
          {why.map((w) => (
            <li key={w.text} className="flex items-center gap-2 text-[14px] text-gray-700">
              <span className={`h-5 w-5 shrink-0 rounded-full grid place-items-center text-[11px] text-white ${w.ok ? tone.ok : "bg-gray-300"}`}>{w.ok ? <FaCheck className="text-[9px]" /> : <FaMinus className="text-[9px]" />}</span>
              {w.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// หัวข้อความต้องการปรึกษา → หมวดของระบบคำขอปรึกษาเดิม (CONSULTATION_CATEGORIES)
const CONSULT_NEEDS = [
  { label: "ยังไม่แน่ใจว่าจะเลือกคณะหรือสาขาไหนดี", category: "การเลือกคณะ" },
  { label: "ต้องการแนวทางเตรียมตัวเข้าศึกษาต่อ", category: "TCAS" },
  { label: "ต้องการข้อมูลเกี่ยวกับอาชีพที่สนใจ", category: "อาชีพในอนาคต" },
  { label: "ต้องการปรึกษาเรื่องอื่น ๆ", category: "อื่นๆ" },
];

function ConsultNeed({ onOpen }) {
  const studentId = getCurrentUser()?.user_id;
  const [open, setOpen] = useState(null); // คำขอที่ยังไม่เสร็จ
  const [pick, setPick] = useState(null);
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const load = () =>
    getConsultationRequests({ student_user_id: studentId })
      .then((rows) => setOpen((rows || []).filter((r) => r.status !== "done").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))))
      .catch(() => setOpen([]));
  useEffect(() => {
    if (studentId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);
  if (!studentId) return null;

  const needDetail = pick?.category === "อื่นๆ";
  const canSend = pick && (!needDetail || detail.trim()) && !sending;
  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setMsg(null);
    try {
      await createConsultationRequest({ student_user_id: studentId, category: pick.category, subject: pick.label, message: detail.trim() || pick.label });
      setMsg({ ok: true, text: "ส่งถึงครูแนะแนวแล้ว ติดตามคำตอบได้ที่หน้าคำขอปรึกษา" });
      setPick(null);
      setDetail("");
      load();
    } catch {
      setMsg({ ok: false, text: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={CARD}>
      <SectionHeader icon={FaRegCommentDots} title="อยากปรึกษาครูแนะแนวเรื่องไหน" subtitle="เลือกเรื่องที่อยากได้ความช่วยเหลือ ครูจะเห็นพร้อมผลแบบประเมินของคุณ" />
      {open?.length > 0 && (
        <div className="mb-3 rounded-xl bg-pink-50/60 border border-pink-100 px-4 py-2.5 text-[14px] text-gray-700">
          คำขอที่รอคำตอบ:{" "}
          {open.slice(0, 2).map((r, i) => (
            <span key={r.request_id}>
              {i > 0 && " • "}
              {r.subject || r.category} <span className="text-gray-500">({CONSULT_STATUS[r.status]?.label || r.status})</span>
            </span>
          ))}{" "}
          <button type="button" onClick={onOpen} className="text-pink-600 hover:underline bg-transparent !p-0">
            ดูทั้งหมด<FaArrowRight className="inline ml-1 text-[11px]" />
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {CONSULT_NEEDS.map((n) => (
          <button
            key={n.label}
            type="button"
            onClick={() => setPick(pick?.label === n.label ? null : n)}
            className={`rounded-full border px-3.5 py-1.5 text-[14px] ${pick?.label === n.label ? "!bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-pink-300"}`}
          >
            {n.label}
          </button>
        ))}
      </div>
      {pick && (
        <div className="mt-3">
          <label className="block text-[13.5px] text-gray-600" htmlFor="consult-detail">
            รายละเอียดเพิ่มเติม{needDetail ? "" : " (ไม่บังคับ)"}
          </label>
          <textarea
            id="consult-detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="เช่น สนใจทั้งแพทย์และวิศวะ แต่ยังไม่รู้ว่าเหมาะกับแบบไหน"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[14.5px] outline-none focus:border-pink-400"
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="mt-2 px-4 py-2 rounded-xl !bg-pink-500 hover:!bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium"
          >
            {sending ? "กำลังส่ง..." : "ส่งถึงครูแนะแนว"}
          </button>
        </div>
      )}
      {msg && <p className={`mt-2 text-[13.5px] ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}

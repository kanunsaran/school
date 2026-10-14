import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";
import { getGoals, getStudentGrades, getAssessmentAdvice, getConsultationRequests, createConsultationRequest } from "../../callapi/callapi_user.jsx";
import { STATUS_META as CONSULT_STATUS } from "../../utils/consultationStore.js";
import dataSources from "../../data/data-sources.json";
import onet from "../../data/onet-faculties.json";
import { careerEmoji, emojiSrc, DIM_ICON } from "../../utils/careerEmoji.js";
import { DIM_ACTIVITY, KNOWLEDGE_TH, ONET_WORK, LEVEL_WHY, SKILL_DESC } from "../../data/guidanceTexts.js";
import { getCurrentUser } from "../../utils/auth.js";
import useMyRiasec from "../../hooks/useMyRiasec.js";
import { interestSummaryText } from "../../utils/riasecSummary.js";
import { goalsOf, GOAL_RANK_LABEL, MYTCAS_HOME, fullUniName } from "../../utils/goals.js";
import AdmissionInfo from "../../components/AdmissionInfo.jsx";
import {
  RIASEC_ORDER, MAX_SCORE, MIN_SCORE, scorePercent, goalTargets, analyzeTarget, personalAdvice, hasGoal,
  denseRank, tiedWith, rankLabel, matchGoalFaculties, exploreFaculties, exploreActivities, adviceSteps, careersForGoal,
} from "../../utils/riasecScoring.js";

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
const EMOJI = { R: "🔧", I: "🔬", A: "🎨", S: "🤝", E: "🎯", C: "🗂️" };
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
const Icon = ({ code, className = "h-5 w-5" }) => <img src={emojiSrc(code)} alt="" className={className} />;
const RANK_TH = ["มากที่สุด", "รองลงมา", "อันดับสาม"];
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

function SectionHeader({ emoji, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-9 w-9 rounded-xl bg-pink-500/10 text-[19px] flex items-center justify-center shrink-0">{emoji}</div>
      <div>
        <h2 className="text-[18px] font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-[13.5px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function GroupLabel({ children }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="text-[12.5px] font-semibold tracking-widest text-pink-500 uppercase whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-gray-200/70" />
    </div>
  );
}


function AdviceBox({ n, title, subtitle, icon, source, wide, children }) {
  return (
    <div className={`bg-white/80 border border-gray-100 rounded-2xl p-4 min-w-0 flex flex-col ${wide ? "lg:col-span-2" : ""}`}>
      <div className={`flex items-center gap-2.5 ${icon ? "mb-3" : "mb-2"}`}>
        <span className="h-7 w-7 rounded-full bg-pink-500 text-white text-[13px] font-bold flex items-center justify-center shrink-0">{n}</span>
        {icon && (
          <span className="h-9 w-9 rounded-full bg-pink-50 grid place-items-center shrink-0">
            <Icon code={icon} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[16.5px] font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-[13.5px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <ul className="space-y-2 text-[15px] text-gray-700 flex-1">{children}</ul>
      {source && <div className="mt-2 pt-2 border-t border-gray-100 text-[11.5px] text-gray-400">ที่มา: ไฟล์ข้อมูลคณะ–อาชีพ • {source}</div>}
    </div>
  );
}

// ข้อมูลของคณะ 1 แถว (แสดงชื่อคณะกำกับเมื่อมีหลายคณะ)
function FacultyItem({ name, multi, children }) {
  return (
    <li className="list-none">
      {multi && <div className="text-[12.5px] font-semibold text-pink-600">{name}</div>}
      <div className="space-y-0.5 leading-6">{children}</div>
    </li>
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
          แก้ไขเป้าหมาย →
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
      <span aria-hidden className={`mt-0.5 shrink-0 font-bold ${ok ? "text-emerald-600" : "text-gray-400"}`}>{ok ? "✓" : "–"}</span>
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
              ดูหลักสูตร{faculty.name}ของ{pick.uni}บน myTCAS ↗
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
            ดูรายละเอียดหลักสูตรบน myTCAS ↗
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
          ค้นหาหลักสูตรเพิ่มเติมบน myTCAS ↗
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
          <div className="text-[40px]">🧭</div>
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

  return (
    <Shell>
      {/* ① รหัสฮอลแลนด์ + สรุปความสนใจ */}
      <div className={`w-full ${CARD} py-6 px-5 md:px-8`}>
        <p className="text-[12.5px] uppercase tracking-widest text-gray-400 font-medium">ผลแบบสำรวจความสนใจ RIASEC • {thaiDate(latest.date)}</p>
        <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="text-[36px] leading-tight font-bold text-black tracking-wider">{latest.code}</p>
          {latest.hasTie && latest.alternativeCodes.length > 0 && (
            <p className="pb-1.5 text-[14px] text-gray-400">
              {latest.alternativeCodes.length <= 2 ? `หรือ ${latest.alternativeCodes.join(", ")}` : `เขียนได้ ${latest.alternativeCodes.length + 1} แบบ`}
            </p>
          )}
        </div>
        {codeTies.length > 0 && (
          <p className="mt-0.5 text-[13px] text-gray-500">
            {codeTies.map((g) => `${g.dims.join(" และ ")} อันดับร่วม ${g.rank}`).join(" • ")} — ด้านที่คะแนนเท่ากันเรียงตามลำดับ R-I-A-S-E-C
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {topDims.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 bg-white/80 rounded-full px-3.5 py-1.5 text-[13.5px] font-medium shadow-sm">
              <span>{EMOJI[c]}</span>
              {dims[c].nameTh}
            </span>
          ))}
        </div>

        <p className="text-[16px] mt-5 pt-4 border-t border-gray-200/70 text-gray-700 leading-7">“{summary}”</p>
        <p className="mt-1.5 text-[13px] text-gray-400">ผลนี้บอก “ความสนใจ” ไม่ได้วัดความสามารถ และไม่ได้ตัดสินว่าคุณเหมาะกับสาขาหรืออาชีพใด</p>

        {location.state?.saveFailed && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[14px] text-red-800">
            บันทึกผลลงระบบไม่สำเร็จ (ครูจะยังไม่เห็นผลนี้) — ตรวจสอบอินเทอร์เน็ตแล้วทำแบบทดสอบอีกครั้ง หรือแจ้งครูแนะแนว
          </div>
        )}
        {latest.lowDifferentiation && <p className="mt-2 text-[13px] text-sky-800">คะแนนทุกด้านของคุณใกล้เคียงกัน ลองทำกิจกรรมหลายแบบก่อนตัดสินใจ</p>}
      </div>

      {/* ===== ผลการวิเคราะห์ ===== */}
      <GroupLabel>ผลการวิเคราะห์</GroupLabel>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ③ คะแนนแต่ละด้าน */}
        <div className={`md:w-1/2 min-w-0 ${CARD}`}>
          <SectionHeader emoji="📊" title="คะแนนแต่ละด้าน" subtitle={`ด้านละ 10 ข้อ คะแนน ${MIN_SCORE}–${MAX_SCORE}`} />
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
                      <span className="text-gray-400">{rankText(c)}</span>
                      {" · "}
                      <span className="font-semibold">
                        {scores[c]}/{MAX_SCORE} คะแนน · {pct}%
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-gray-200/50 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${from} ${to}`} style={{ width: animated ? `${pct}%` : 0 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <details className="mt-4 text-[13px] text-gray-600">
            <summary className="cursor-pointer select-none">รายละเอียดการคิดคะแนน</summary>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
              <div className="rounded-xl bg-white/70 px-3 py-2">
                <div className="text-gray-500">ความแตกต่างของคะแนน</div>
                <div className="font-semibold text-gray-800">{latest.differentiation} คะแนน</div>
                <div className="text-[12px] text-gray-500">
                  สูงสุด {atScore(maxScore)} {maxScore} − ต่ำสุด {atScore(minScore)} {minScore}
                </div>
              </div>
              <div className="rounded-xl bg-white/70 px-3 py-2" title={CONSISTENCY_META[latest.consistency].text}>
                <div className="text-gray-500">ความสอดคล้องของ 2 อันดับแรก</div>
                <div className="font-semibold text-gray-800">{CONSISTENCY_META[latest.consistency].label}</div>
              </div>
            </div>
            <p className="text-[12.5px] text-gray-500 mt-2">{CONSISTENCY_META[latest.consistency].text}</p>
            <p className="text-[12px] text-gray-400 mt-1">
              ร้อยละ = คะแนน ÷ {MAX_SCORE} × 100 • ด้านที่คะแนนเท่ากันได้อันดับร่วมกัน และอันดับถัดไปจะข้ามตามจำนวนด้านที่เท่ากัน (เช่น อันดับร่วม 3 สองด้าน → ด้านถัดไปเป็นอันดับ 5)
            </p>
          </details>
        </div>

        {/* ④ ภาพรวม RIASEC */}
        <div className={`md:w-1/2 min-w-0 ${CARD}`}>
          <SectionHeader emoji="🕸️" title="ภาพรวม RIASEC" subtitle="เรียงตามหกเหลี่ยม R-I-A-S-E-C ด้านที่อยู่ติดกันมีความสนใจคล้ายกัน" />
          <RadarChart scores={scores} />
        </div>
      </div>

      {/* ⑤ จุดเด่นของคุณ — ความหมายของด้านที่เด่น (อันดับ 1–3 รวมคะแนนเท่ากัน) + ด้านอื่นแบบย่อ */}
      <div className={CARD}>
        <SectionHeader emoji="⭐" title="จุดเด่นของคุณ" subtitle={latest.hasTie ? "ความสนใจอันดับ 1–3 (รวมด้านที่คะแนนเท่ากัน) และความหมายของแต่ละด้าน" : "ความสนใจ 3 อันดับแรก และความหมายของแต่ละด้าน"} />
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${topDims.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
          {topDims.map((c) => {
            const r = denseRank(scores, c);
            return (
              <div key={c} className={`rounded-xl p-4 ${["bg-pink-200/60", "bg-sky-200/60", "bg-yellow-200/60"][r - 1] || "bg-white/70"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[22px]">{["🥇", "🥈", "🥉"][r - 1] || "🏅"}</span>
                  <span className="text-[13px] text-gray-600">{rankText(c)}</span>
                </div>
                <div className="text-[15.5px] font-semibold mt-1">
                  {EMOJI[c]} {c} – {dims[c].nameEn} ({dims[c].nameTh})
                </div>
                <div className="text-[13.5px] text-gray-700 mt-1 leading-6">
                  <span className="text-gray-500">งานที่เกี่ยวข้อง: </span>
                  {ONET_WORK[c]}
                </div>
              </div>
            );
          })}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-[13.5px] text-gray-600">ความหมายของด้านอื่น ๆ</summary>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ranked
              .filter((c) => !topDims.includes(c))
              .map((c) => (
                <div key={c} className="p-3 rounded-xl bg-gray-50/70">
                  <p className="font-medium text-[14px]">
                    {EMOJI[c]} {c} – {dims[c].nameEn} ({dims[c].nameTh}) <span className="text-gray-500 font-normal">· {rankText(c)}</span>
                  </p>
                  <p className="text-[13px] mt-0.5 text-gray-600">{dims[c].traits}</p>
                </div>
              ))}
          </div>
        </details>
      </div>

      {/* ===== ส่วน B: นำผลความสนใจไปสำรวจต่อ (ไม่ขึ้นกับเป้าหมาย) ===== */}
      <GroupLabel>คำแนะนำจากผล RIASEC</GroupLabel>
      <div className={CARD}>
        <SectionHeader emoji="💡" title="เข้าใจความสนใจของตัวเอง" subtitle="ลองทำกิจกรรม ดูสาขา และอาชีพที่เกี่ยวข้องกับความสนใจของคุณ" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdviceBox n="1" title="กิจกรรมเพื่อสำรวจตัวเอง" subtitle="เลือกกิจกรรมที่สนใจ แล้วลองสำรวจตัวเองจากประสบการณ์จริง" wide>
            <li className="list-none">
              {/* กล่องแนวนอน 1 ด้านต่อแถว: ชื่อกิจกรรม | ลองทำ | ลองสังเกต (จอเล็กเรียงลงมา) */}
              <div className="grid gap-2.5">
                {activities.map((x) => {
                  const g = DIM_ACTIVITY[x.dim];
                  const t = DIM_THEME[x.dim];
                  return (
                    <div key={x.dim} className={`grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 gap-y-2.5 rounded-2xl border px-4 py-3.5 ${t.card}`}>
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`h-11 w-11 shrink-0 rounded-full grid place-items-center ${t.icon}`}>
                          <Icon code={DIM_ICON[x.dim]} className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                          <div className={`text-[13.5px] font-semibold ${t.text}`}>ด้าน{TRAIT_NOUN[x.dim]}</div>
                          <p className="mt-0.5 text-[16px] font-semibold text-gray-900 leading-6">{g.act}</p>
                          {!x.text && <p className="mt-1 text-[12px] text-gray-400 leading-5">คำแนะนำเบื้องต้นจากระบบ ยังไม่ได้ผ่านการตรวจสอบจากครูแนะแนว</p>}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-[13.5px] font-semibold ${t.text}`}>ลองทำกิจกรรมนี้</div>
                        <p className="mt-0.5 text-[15px] text-gray-700 leading-6">{x.text || g.how}</p>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-[13.5px] font-semibold ${t.text}`}>ลองสังเกตตัวเอง</div>
                        <p className="mt-0.5 text-[15px] text-gray-700 leading-6">{g.question}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          </AdviceBox>

          <AdviceBox n="2" title="สาขาที่ควรสำรวจ" wide>
            <li className="list-none">
              {latest.lowDifferentiation && (
                <p className="mb-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-sky-900">คะแนนทุกด้านของคุณใกล้กัน สาขาด้านล่างเป็นเพียงตัวอย่างให้เริ่มสำรวจ</p>
              )}
              {explore.length === 0 ? (
                <p className="text-gray-600">ยังไม่มีสาขาที่เชื่อมกับความสนใจเด่นได้ชัดเจน (นอกเหนือจากเป้าหมายที่ตั้งไว้) — ลองปรึกษาครูแนะแนวเพื่อสำรวจเพิ่มเติม</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {explore.map(({ row, code, links }, i) => {
                    // เหตุผล = วลีของสาขานี้เอง (คุณลักษณะในข้อมูลแนะแนว) ที่เชื่อมกับความสนใจเด่น — ใช้ด้านหลักของสาขาก่อน
                    const link = links.find((l) => l.code === row.dim) || links[0];
                    return (
                      <div key={row.name} className="flex flex-col rounded-xl bg-white border border-gray-100 px-3.5 py-3 min-w-0 leading-7 text-[15px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-[16.5px] font-semibold text-gray-900">
                            <span className="h-7 w-7 shrink-0 rounded-full bg-pink-100 text-pink-600 text-[13.5px] font-bold grid place-items-center">{i + 1}</span>
                            {row.name}
                          </div>
                          <span className="shrink-0 rounded-full bg-pink-50 border border-pink-100 px-2 py-0.5 text-[12px] font-medium text-pink-700">รหัส {code}</span>
                        </div>
                        <p className="mt-1 text-gray-700">
                          เกี่ยวข้องกับ{joinTh(link.phrases.slice(0, 2))} ซึ่งเชื่อมโยงกับความสนใจด้าน{TRAIT_NOUN[link.code]}ของคุณ
                        </p>
                        <div className="mt-2 flex-1 rounded-lg bg-gray-50 px-3 py-2">
                          <div className="text-[13.5px] font-semibold text-gray-600">สิ่งที่ควรศึกษาก่อนตัดสินใจ</div>
                          <StudyBeforeDeciding faculty={row} skip={link.phrases.slice(0, 2)} />
                        </div>
                        <div className="mt-2">
                          <ProgramPick faculty={row} goalUni={myGoal?.university_name} compact />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <a
                href={MYTCAS_HOME}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-4 py-2 text-[14.5px] font-medium text-sky-700 hover:bg-sky-50"
              >
                🔎 ค้นหาหลักสูตรและมหาวิทยาลัยอื่นบน myTCAS ↗
              </a>
            </li>
          </AdviceBox>

          <AdviceBox n="3" title="อาชีพตัวอย่าง" subtitle="อาชีพจากสาขาด้านบน" wide>
            <li className="list-none">
              <CareerList items={resultCareers.map((c) => ({ ...c, reason: `ในสาขา${c.faculty.name}` }))} />
            </li>
          </AdviceBox>
        </div>
      </div>

      {/* ===== ส่วน A: เป้าหมายการศึกษาต่อ ===== */}
      <GroupLabel>เป้าหมายการศึกษาต่อ</GroupLabel>
      <div className={CARD}>
        <SectionHeader emoji="🎯" title="ความสอดคล้องกับเป้าหมาย" subtitle="เทียบเป้าหมายที่ตั้งไว้กับผล RIASEC ทั้ง 6 ด้าน" />
        {myGoals?.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {myGoals.map((g, i) => (
              <button
                key={g.goal_id}
                type="button"
                onClick={() => setGoalIdx(i)}
                className={`rounded-xl border px-3 py-1.5 text-left text-[13.5px] ${
                  (myGoal?.goal_id === g.goal_id) ? "!bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-pink-300"
                }`}
              >
                <span className="block text-[11.5px] opacity-80">{GOAL_RANK_LABEL[i]}</span>
                <span className="font-semibold">{g.faculty_name || g.career_field}</span>
                {g.university_name && <span className="block text-[12px] opacity-80">{g.university_name}</span>}
              </button>
            ))}
          </div>
        )}
        {!ready ? (
          <p className="text-[14.5px] text-gray-400">กำลังโหลด...</p>
        ) : !hasGoal(myGoal) ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[14.5px] text-gray-600">
              ยังไม่ได้ตั้งเป้าหมาย — ตั้งเป้าหมายคณะ/สาขาและมหาวิทยาลัยที่สนใจก่อน แล้วระบบจะเปรียบเทียบกับผลแบบทดสอบนี้และแนะนำวิธีเตรียมตัวให้
              ระหว่างนี้ใช้ “คำแนะนำจากผล RIASEC” ด้านบนเป็นแนวทางสำรวจตัวเองได้
            </p>
            <button type="button" onClick={() => navigate("/studentgoal")} className="shrink-0 px-4 py-2 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[13.5px] font-medium">
              ไปตั้งเป้าหมาย
            </button>
          </div>
        ) : analyses.length === 0 ? (
          <p className="text-[14.5px] text-gray-600">
            เป้าหมายของคุณคือ <b>{myGoal.faculty_name || myGoal.goal_text || "-"}</b> — ยังไม่มีข้อมูลคณะนี้ในฐานข้อมูลของระบบ
            จึงยังเปรียบเทียบไม่ได้ ลองเลือกชื่อคณะจากรายการในหน้าเป้าหมาย หรือปรึกษาครูแนะแนว
          </p>
        ) : (
          <div className="grid gap-4">
            <GoalHeader goal={myGoal} onEdit={() => navigate("/studentgoal")} textMismatch={goalTextMismatch} />
            {analyses.map((a, i) => (
              <AlignmentCard key={a.faculty.name} a={a} latest={latest} scores={scores} alternatives={altsByCard[i]} university={myGoal?.university_name ? fullUniName(myGoal.university_name) : null} />
            ))}
          </div>
        )}
      </div>

      {/* แนวทางเตรียมตัวไปสู่เป้าหมาย — เฉพาะเมื่อมีเป้าหมายที่หาเจอในฐานข้อมูล */}
      {advice?.usesGoal && (
        <div className={CARD}>
          <SectionHeader emoji="🧭" title="แนวทางเตรียมตัวไปสู่เป้าหมาย" subtitle={`สำหรับ ${advice.focus.map((f) => f.name).join(", ")}`} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AdviceBox n="1" title="วิชาที่ควรเน้น">
              {advice.perFaculty.map((f) => (
                <FacultyItem key={f.name} name={f.name} multi={advice.perFaculty.length > 1}>
                  <div>
                    <b>{f.subjects.join(", ")}</b>
                  </div>
                  <div className="text-gray-600">สายการเรียนที่แนะนำ: {f.track}</div>
                  <div className="mt-1 text-[13px] text-gray-500">คำแนะนำทั่วไป ไม่ใช่ข้อกำหนดการรับเข้า — วิชาสอบจริงให้ตรวจจากประกาศของมหาวิทยาลัย (ดูข้อ 3)</div>
                </FacultyItem>
              ))}
            </AdviceBox>

            <AdviceBox n="2" title="แนวทางเตรียมความพร้อม">
              {advice.perFaculty.map((f) => (
                <FacultyItem key={f.name} name={f.name} multi={advice.perFaculty.length > 1}>
                  <ul className="space-y-1">
                    {f.skills.split(/,\s*/).map((sk) => (
                      <li key={sk}>
                        <b className="font-semibold text-gray-800">{sk}</b>
                        {SKILL_DESC[sk] && <span className="text-gray-600"> — {SKILL_DESC[sk]}</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 text-[13px] text-gray-500">ทักษะที่ช่วยให้พร้อมสำหรับสาขานี้ ไม่ใช่เงื่อนไขบังคับในการสมัคร • คำอธิบายทักษะเขียนโดยระบบ ยังไม่ผ่านการตรวจจากครูแนะแนว</div>
                </FacultyItem>
              ))}
            </AdviceBox>


            <AdviceBox n="3" title="การเตรียมสอบ / Portfolio และการสมัคร" wide>
              {advice.perFaculty.map((f) => (
                <FacultyItem key={f.name} name={f.name} multi={advice.perFaculty.length > 1}>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <div className="text-[13.5px] font-semibold text-gray-600">คำแนะนำทั่วไปจากข้อมูลแนะแนว (ไม่ใช่เกณฑ์รับเข้า)</div>
                    <div className="mt-0.5">{f.exam}</div>
                  </div>
                  <div className="mt-3 text-[13.5px] font-semibold text-sky-800">เกณฑ์รับเข้าจริง — จากประกาศ myTCAS</div>
                  <div className="text-[13px] text-gray-500">GPAX ขั้นต่ำ วิชาสอบ และเงื่อนไข Portfolio แสดงเฉพาะที่มหาวิทยาลัยประกาศใน myTCAS แล้วเท่านั้น</div>
                  <ProgramPick faculty={f} goalUni={myGoal?.university_name} />
                  <details className="mt-2" open={Boolean(myGoal?.university_name)}>
                    <summary className="cursor-pointer select-none text-[13.5px] font-medium text-sky-700">ดูเกณฑ์รับเข้าแต่ละรอบ</summary>
                    <div className="mt-2">
                      <AdmissionInfo facultyName={f.name} university={myGoal?.university_name ? fullUniName(myGoal.university_name) : null} hideTitle />
                    </div>
                  </details>
                </FacultyItem>
              ))}
            </AdviceBox>

            <AdviceBox n="4" title="อาชีพที่เกี่ยวข้องกับเป้าหมาย" wide>
              <li className="list-none">
                <p className="text-[12.5px] text-gray-500">อาชีพที่เกี่ยวข้องของสาขาเป้าหมายในข้อมูลแนะแนว (ไม่เกิน 3 อาชีพ)</p>
                <CareerList items={goalCareers} />
              </li>
            </AdviceBox>
          </div>
          <div className="mt-3 space-y-0.5 text-[12.5px] text-gray-500">
            <p>
              <b className="font-semibold">ข้อมูลแนะแนวทั่วไป:</b> ไฟล์ข้อมูลคณะ–อาชีพของงานแนะแนวโรงเรียน (RIASEC-ข้อมูลคำแนะนำ-ครบ120รหัส) — วิชาที่ควรเน้น สายการเรียน ทักษะ
              คำแนะนำการเตรียมสอบ และอาชีพที่เกี่ยวข้อง • คำอธิบายทักษะเขียนโดยระบบ
            </p>
            <p>
              <b className="font-semibold">ข้อมูลทางการ:</b> หลักสูตรและเกณฑ์รับเข้าจาก myTCAS (ทปอ.) — ปีการศึกษาและรอบรับสมัครแสดงในข้อ 3 เกณฑ์อาจเปลี่ยนระหว่างปี
              ตรวจประกาศฉบับเต็มของมหาวิทยาลัยก่อนสมัครทุกครั้ง
            </p>
          </div>
        </div>
      )}

      {/* ===== แนวทางดำเนินการต่อ — ปรับตามสถานะของนักเรียน ===== */}
      <GroupLabel>แนวทางดำเนินการต่อ</GroupLabel>
      {teacherAdvice.length > 0 && (
        <div className={CARD}>
          <SectionHeader emoji="💬" title="คำแนะนำจากครูแนะแนว" subtitle="ครูเขียนถึงคุณจากผลแบบประเมินและเป้าหมายของคุณ" />
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
      <div className={CARD}>
        <SectionHeader emoji="👣" title="ขั้นตอนถัดไปที่แนะนำ" subtitle="เลือกทำตามที่เหมาะกับคุณ — ระบบไม่ได้ตัดสินใจแทน" />
        <ol className="space-y-2 text-[15px] text-gray-700 list-decimal pl-5 marker:font-semibold marker:text-pink-500">
          {nextSteps.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <details className="mt-4">
          <summary className="cursor-pointer select-none text-[14.5px] font-medium text-gray-600">🗺️ แนวทางทั่วไป ม.4–ม.6 (ปรับตามเป้าหมายและจังหวะของแต่ละคน)</summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {roadmapFor(advice?.usesGoal ? advice.focus[0]?.name : null).map((step) => (
              <div key={step.grade} className="bg-white/70 rounded-xl p-4">
                <div className="text-[16px] font-semibold text-pink-600">{step.grade}</div>
                <ul className="mt-2 space-y-1.5 text-[14.5px] text-gray-700">
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
        </details>
      </div>

      {/* ความต้องการปรึกษา → ส่งเป็นคำขอปรึกษาในระบบเดิม (ครูเห็นในหน้าคำขอปรึกษาและหน้าผลการประเมิน) */}
      <ConsultNeed onOpen={() => navigate("/studentconsultations")} />

      <details className="px-1 text-[12px] text-gray-500">
        <summary className="cursor-pointer select-none">แหล่งข้อมูลและวันที่ตรวจสอบ (สำหรับครู/ผู้ตรวจ)</summary>
        <ul className="mt-1.5 space-y-1 pl-4 list-disc">
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
      </details>

      <div className="flex justify-end gap-2 flex-wrap print:hidden pb-2">
        <button className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-[14.5px] font-medium hover:bg-gray-50" onClick={() => window.print()}>
          พิมพ์ผล
        </button>
        <button className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-[14.5px] font-medium hover:bg-gray-50" onClick={() => navigate("/aptitudeIntro")}>
          ทำแบบทดสอบอีกครั้ง
        </button>
        <button className="px-5 py-2 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[14.5px] font-medium shadow-sm" onClick={() => navigate("/studentgoal")}>
          ไปหน้าเป้าหมาย
        </button>
      </div>
    </Shell>
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
      <SectionHeader emoji="🙋" title="อยากปรึกษาครูแนะแนวเรื่องไหน" subtitle="เลือกเรื่องที่อยากได้ความช่วยเหลือ ครูจะเห็นพร้อมผลแบบประเมินของคุณ" />
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
            ดูทั้งหมด →
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

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";
import { getGoals } from "../../callapi/callapi_user.jsx";
import { getCurrentUser } from "../../utils/auth.js";
import useMyRiasec from "../../hooks/useMyRiasec.js";
import { goalsOf, GOAL_RANK_LABEL, MYTCAS_HOME, fullUniName } from "../../utils/goals.js";
import AdmissionInfo from "../../components/AdmissionInfo.jsx";
import {
  RIASEC_ORDER, MAX_SCORE, MIN_SCORE, scorePercent, goalTargets, analyzeTarget, personalAdvice, hasGoal,
  denseRank, tiedWith, riasecAdvice, careersForResult, careersForGoal, interestLinks,
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
const RANK_TH = ["มากที่สุด", "รองลงมา", "อันดับสาม"];
// คำนามของแต่ละด้าน ใช้แต่งประโยคอธิบาย (ข้อความแม่แบบของระบบ)
const TRAIT_NOUN = { R: "การลงมือปฏิบัติ", I: "การคิดวิเคราะห์", A: "การสร้างสรรค์", S: "การช่วยเหลือผู้อื่น", E: "ภาวะผู้นำ", C: "ความเป็นระบบ" };
const nounListTh = (list, dims) => list.map((c) => `ด้าน ${c} (${dims[c].nameTh})`).join(" และ ");
const joinTh = (arr) => (arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(" ")} และ${arr[arr.length - 1]}`);

const ROADMAP = [
  { grade: "ม.4", items: ["ค้นหาความสนใจของตัวเอง", "ลองทำกิจกรรม/ชุมนุมหลากหลายด้าน", "เริ่มทำแบบทดสอบความถนัด"] },
  { grade: "ม.5", items: ["เลือกวิชาเรียนเสริมตามคณะที่สนใจ", "เริ่มทำ Portfolio", "ศึกษาคุณสมบัติของคณะ/มหาวิทยาลัย"] },
  { grade: "ม.6", items: ["เตรียมสอบ TGAT/TPAT/A-Level", "สมัคร TCAS ตามรอบ", "ปรึกษาครูแนะแนวเรื่องแผนสำรอง"] },
];

const ALIGNMENT_META = {
  high: { label: "สูง", icon: "●●●", cls: "text-emerald-600", box: "bg-emerald-50 border-emerald-100" },
  medium: { label: "ปานกลาง", icon: "●●○", cls: "text-amber-600", box: "bg-amber-50 border-amber-100" },
  low: { label: "ต่ำ", icon: "●○○", cls: "text-red-600", box: "bg-red-50 border-red-100" },
};
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
        <h2 className="text-[16.5px] font-semibold text-gray-800">{title}</h2>
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

function Check({ children, tone = "pink" }) {
  const toneClass = tone === "emerald" ? "text-emerald-500" : "text-pink-500";
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 shrink-0 ${toneClass}`}>✓</span>
      <span>{children}</span>
    </li>
  );
}

const SOURCE_TH = { faculty: "คณะที่ตั้งเป้าหมาย", career: "อาชีพที่ตั้งเป้าหมาย", text: "สาขาจากข้อความเป้าหมาย" };

function AdviceBox({ n, title, source, wide, children }) {
  return (
    <div className={`bg-white/70 rounded-xl p-4 min-w-0 flex flex-col ${wide ? "lg:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-6 w-6 rounded-full bg-pink-500 text-white text-[12.5px] font-bold flex items-center justify-center shrink-0">{n}</span>
        <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
      </div>
      <ul className="space-y-2 text-[13.5px] text-gray-700 flex-1">{children}</ul>
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

// ชื่อมิติแบบสั้น เช่น "S – นักช่วยเหลือ"
const dimLabel = (data, c) => `${c} – ${data.dimensions[c].nameTh}`;

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
function GoalHeader({ goal, onEdit }) {
  return (
    <div className="rounded-xl bg-white/80 border border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13px] font-semibold text-gray-500">
          เป้าหมายที่คุณตั้งไว้{goal.updated_at || goal.created_at ? ` • ${thaiDate(goal.updated_at || goal.created_at)}` : ""}
        </div>
        <button type="button" onClick={onEdit} className="text-[13px] text-pink-600 hover:text-pink-700 bg-transparent !p-0">
          แก้ไขเป้าหมาย →
        </button>
      </div>
      <div className="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[14px]">
        <div>
          <span className="text-gray-500">คณะที่สนใจ: </span>
          <b>{goal.faculty_name || "-"}</b>
        </div>
        <div>
          <span className="text-gray-500">มหาวิทยาลัย: </span>
          <b>{goal.university_name || "-"}</b>
        </div>
      </div>
      {goal.goal_text && <p className="text-[13.5px] text-gray-600 mt-1">“{goal.goal_text}”</p>}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div className="mt-4">
      <div className="text-[14.5px] font-semibold text-gray-800">{title}</div>
      <div className="text-[14px] text-gray-700 leading-7 mt-1 space-y-2">{children}</div>
    </div>
  );
}

// การ์ดความสอดคล้องของเป้าหมาย 1 สาขา — แต่ละส่วนตอบคำถามเดียว:
//  ระดับ + ที่มาของระดับ (เกณฑ์จริงใน alignResult) → ผลการวิเคราะห์ (สาขาเป็นอย่างไร / ความสนใจไหนเชื่อมได้ / ควรสำรวจอะไร)
//  → ขอบเขตของผล → แนวทางลงมือทำ (คำแนะนำของสาขา) → สาขาทางเลือก (เฉพาะที่มีข้อมูลรองรับ)
// วลีเกี่ยวกับสาขามาจากไฟล์ข้อมูลคณะ–อาชีพทั้งหมด • ไม่ไล่คะแนน/อันดับซ้ำ (มีในส่วนคะแนนด้านบนแล้ว)
const NOUN = (c) => `ด้าน${TRAIT_NOUN[c]}`;
const nounList = (list) => joinTh(list.map(NOUN));
const SCOPE_NOTE = "ผลนี้เป็นข้อมูลประกอบการสำรวจความสนใจ ไม่ได้ตัดสินว่าคุณจะเรียนสาขานี้ได้หรือไม่ได้ ควรพิจารณาร่วมกับความชอบ ประสบการณ์ ผลการเรียน และเกณฑ์การรับเข้าของแต่ละหลักสูตร";
// ชื่อที่ลงท้ายด้วยวงเล็บ ต้องเว้นวรรคก่อนข้อความต่อ
const nm = (name) => (/\)$/.test(name) ? `${name} ` : name);

function AlignmentCard({ a, data, latest, scores, alternatives }) {
  const f = a.faculty;
  const dim = f.dim;
  const meta = ALIGNMENT_META[a.level];
  const links = interestLinks(data, latest, f);
  const main = links.find((x) => x.code === dim);
  const mainIsMine = denseRank(scores, dim) <= 3;
  const helpers = links.filter((x) => x.code !== dim && x.mine);
  const tiedNote = a.tied.length ? ` (คะแนนเท่ากับ${nounList(a.tied)})` : "";

  // ที่มาของระดับ — อธิบายเกณฑ์ที่ระบบใช้จริง ด้วยภาษาที่นักเรียนเข้าใจ
  const levelWhy = {
    recommended:
      a.viaCode === latest.code
        ? "ข้อมูลแนะแนวของโรงเรียนจับคู่สาขานี้ไว้กับรูปแบบความสนใจของคุณโดยตรง"
        : "ข้อมูลแนะแนวของโรงเรียนจับคู่สาขานี้ไว้กับรูปแบบความสนใจของคุณ (เมื่อนับด้านที่คะแนนเท่ากัน)",
    top: `ลักษณะหลักของสาขานี้คือ${NOUN(dim)} ซึ่งเป็นความสนใจที่เด่นที่สุดของคุณ${tiedNote}`,
    secondary: `ลักษณะหลักของสาขานี้คือ${NOUN(dim)} ซึ่งเป็นหนึ่งในความสนใจเด่นของคุณ${tiedNote} แต่ยังไม่ใช่ด้านที่คุณสนใจมากที่สุด`,
    outside: `ลักษณะหลักของสาขานี้คือ${NOUN(dim)} ซึ่งยังไม่อยู่ในกลุ่มความสนใจเด่นของคุณจากแบบประเมินครั้งนี้`,
  }[a.reason];

  // ผลการวิเคราะห์ 2–4 ประโยค
  const sentences = [`${nm(f.name)}เน้น${f.traits}`];
  sentences.push(
    mainIsMine
      ? `ความสนใจ${NOUN(dim)}ของคุณจึงเป็นจุดที่สามารถนำมาต่อยอดกับสาขานี้ได้`
      : `ซึ่งเป็นความสนใจ${NOUN(dim)}ที่ยังไม่โดดเด่นในผลแบบประเมินครั้งนี้`
  );
  if (helpers.length) {
    sentences.push(`${mainIsMine ? "ส่วน" : "แต่"}${helpers.map((x) => `ความสนใจ${NOUN(x.code)}อาจช่วยในเรื่อง${joinTh(x.phrases.slice(0, 2))}`).join(" และ")}`);
  }
  // สิ่งที่ควรสำรวจ — ใช้ลักษณะงานจริงของสาขา (วลีแรกที่เป็นงาน ไม่ใช่ "ความสนใจ…")
  const work = [...(main?.phrases || []), ...f.traits.split(/\s+และ|\s+/)].find((x) => x && !/^(ความสนใจ|พื้นฐาน|และ)/.test(x) && x.length > 3);
  if (work) {
    sentences.push(
      {
        high: `ลองหาโอกาสทำงานที่ต้องใช้${work}จริง เพื่อดูว่าความสนใจนี้ชัดเจนขึ้นเมื่อได้ลงมือทำหรือไม่`,
        medium: `ลองทำงานที่ต้องใช้${work}หลาย ๆ แบบ เพื่อสำรวจว่าคุณชอบงานลักษณะนี้มากน้อยเพียงใด`,
        low: `หากสนใจสาขานี้จริง ลองหาโอกาสทำงานที่ต้องใช้${work} เพื่อสำรวจว่าคุณชอบงานลักษณะนี้มากน้อยเพียงใด`,
      }[a.level]
    );
  }
  // ประโยคที่ 2 แบบ "ซึ่ง…" ต่อท้ายประโยคแรก
  const analysis = (mainIsMine ? sentences : [`${sentences[0]} ${sentences[1]}`, ...sentences.slice(2)]).join(" ");

  return (
    <div className={`rounded-xl border px-4 py-4 ${meta.box}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {a.source === "text" && <div className="text-[12.5px] text-gray-500">จากข้อความเป้าหมายของคุณ</div>}
          <div className="text-[16px] font-semibold text-gray-900">{f.name}</div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[14px] font-bold ${meta.cls}`}>
          <span aria-hidden>{meta.icon}</span>สอดคล้อง{meta.label}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-gray-600">
        <span className="text-gray-500">ที่มาของระดับ: </span>
        {levelWhy}
      </p>

      <Block title="ผลการวิเคราะห์ของคุณ">
        <p>{analysis}</p>
        <p className="text-[12.5px] text-gray-500 leading-6">{SCOPE_NOTE}</p>
      </Block>

      <Block title="แนวทางไปสู่เป้าหมาย">
        <ul className="list-disc pl-5">
          <li>{f.advice}</li>
        </ul>
        <p className="text-[13px] text-gray-500">ดูวิชาที่ควรเน้น การเตรียมสอบ/Portfolio และมหาวิทยาลัยที่เปิดสอนเพิ่มเติมได้ใน “แนวทางเตรียมตัวไปสู่เป้าหมาย” ด้านล่าง</p>
      </Block>

      <Block title="สาขาทางเลือกเพิ่มเติม">
        {alternatives.length > 0 ? (
          <ul className="space-y-2">
            {alternatives.map((x) => (
              <li key={x.row.name} className="rounded-lg bg-white/80 px-3 py-2">
                <div className="font-semibold text-gray-800">{x.row.name}</div>
                <div className="text-[13.5px] text-gray-600 leading-6">
                  เกี่ยวข้องกับงานด้าน{joinTh(x.shared)}เช่นเดียวกับเป้าหมาย เช่น {x.work.slice(0, 2).join(", ")}
                  {x.differs.length > 0 && <> · ต่างจากเป้าหมายตรงที่ต้องฝึก{joinTh(x.differs)}</>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-gray-500">ยังไม่มีข้อมูลสาขาทางเลือกที่เชื่อมโยงได้ชัดเจน ลองปรึกษาครูแนะแนวเพื่อสำรวจทางเลือกเพิ่มเติม</p>
        )}
      </Block>
    </div>
  );
}

// อาชีพที่เกี่ยวข้อง (ไม่เกิน 3) พร้อมที่มา — Excel ยังไม่มีคอลัมน์อธิบายงานของแต่ละอาชีพ จึงแสดงสาขาและด้านความสนใจที่เชื่อมโยง
const CAREER_SOURCE = {
  code: "จากผลความสนใจ RIASEC",
  faculty: "จากสาขาที่ตรงกับรหัส",
  goal: "อาชีพเป้าหมายของคุณ",
  goalFaculty: "จากสาขาเป้าหมาย",
  extend: "อาชีพต่อยอด",
};
function CareerList({ items, data, context = "result" }) {
  if (!items.length) return <p className="text-[13px] text-gray-500">ยังไม่มีข้อมูลอาชีพที่เกี่ยวข้อง</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {items.map((c) => {
        const key = context === "goal" && c.source === "faculty" ? "goalFaculty" : c.source;
        const f = c.faculty;
        return (
          <div key={c.title} className={`rounded-lg px-3 py-2 border ${c.source === "goal" ? "bg-pink-50 border-pink-200" : "bg-white/80 border-gray-100"}`}>
            <div className="text-[14px] font-semibold text-gray-800">
              {c.source === "goal" && "✓ "}
              {c.title}
            </div>
            <div className="text-[12px] text-pink-600">{CAREER_SOURCE[key]}</div>
            {f && (
              <div className="text-[12px] text-gray-500">
                {f.dim ? `อยู่ในสาขา ${f.name} • กลุ่ม ${dimLabel(data, f.dim)}` : `จาก${f.name}`}
              </div>
            )}
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
  // รหัสที่กำลังดูข้อมูลคณะ/อาชีพ (เปลี่ยนได้เมื่อคะแนนเท่ากันจนมีหลายรหัส)
  const [viewCode, setViewCode] = useState(null);

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

  const code = viewCode || latest?.code;
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
  // คำแนะนำส่วน B ใช้ "รหัสที่เลือกดู" เท่านั้น (คะแนนเท่ากัน → นักเรียนเลือกดูทีละรหัส ไม่ปนกัน)
  const viewResult = useMemo(() => (latest && !latest.legacy ? { ...latest, code, alternativeCodes: [] } : null), [latest, code]);
  const bAdvice = useMemo(() => (ready ? riasecAdvice(data, viewResult, goalNames) : null), [ready, data, viewResult, goalNames]);
  const resultCareers = useMemo(() => (ready ? careersForResult(data, viewResult) : []), [ready, data, viewResult]);
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
  const dims = data.dimensions;
  // ลำดับแบบคะแนนเท่ากันได้อันดับเดียวกัน — ไม่บอกว่าด้านใดเด่นกว่าถ้าคะแนนเท่ากันจริง
  const rankText = (c) => {
    const t = tiedWith(scores, c);
    return `อันดับ ${denseRank(scores, c)}${t.length ? ` เท่ากับ ${t.join(", ")}` : ""}`;
  };
  const groups = [];
  topDims.forEach((c) => {
    const g = groups.find((x) => scores[x[0]] === scores[c]);
    g ? g.push(c) : groups.push([c]);
  });
  const nameOf = (c) => `${dims[c].nameEn} (${dims[c].nameTh})`;
  const interest = groups
    .map((g, i) => `${i === 0 ? "คุณสนใจด้าน " : i === 1 ? " รองลงมาคือ " : " ตามด้วย "}${g.map(nameOf).join(" และ ")}${g.length > 1 ? " ซึ่งคะแนนเท่ากัน" : ""}${i === 0 ? " มากที่สุด" : ""}`)
    .join("");
  const summary = `${interest}${latest.hasTie ? "" : ` — รหัส ${latest.code} หมายถึง "${data.codes[latest.code].meaning}"`}`;

  return (
    <Shell>
      {/* ① รหัสฮอลแลนด์ */}
      <div className={`w-full ${CARD} py-6 px-5 md:px-8`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[12.5px] uppercase tracking-widest text-gray-400 font-medium">ผลแบบสำรวจความสนใจ RIASEC • {thaiDate(latest.date)}</p>
            <p className="text-[34px] font-bold text-black mt-1 tracking-wider">
              {allCodes.join(" / ")}
            </p>
            <ul className="mt-1 space-y-0.5 text-[14.5px] text-gray-700">
              {topDims.map((c) => (
                <li key={c}>
                  <b>{c}</b> {dims[c].nameEn} ({dims[c].nameTh}) <span className="text-gray-400">• {rankText(c)} • {scores[c]}/{MAX_SCORE}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 flex-wrap md:flex-col md:items-end">
            {topDims.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1.5 text-[13.5px] font-medium shadow-sm">
                <span>{EMOJI[c]}</span>
                {dims[c].nameTh}
              </span>
            ))}
          </div>
        </div>

        {/* ② สรุปบุคลิกภาพ */}
        <p className="text-[15px] mt-5 pt-4 border-t border-gray-200/70 text-gray-700 leading-7">{summary}</p>

        {location.state?.saveFailed && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[14px] text-red-800">
            บันทึกผลลงระบบไม่สำเร็จ (ครูจะยังไม่เห็นผลนี้) — ตรวจสอบอินเทอร์เน็ตแล้วทำแบบทดสอบอีกครั้ง หรือแจ้งครูแนะแนว
          </div>
        )}
        {latest.hasTie && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-[14px] text-amber-900">
            {swingDims.map((c) => `ด้าน ${c}`).join(" และ ")} ได้คะแนนเท่ากัน ({scores[swingDims[0]]}) จึงเป็นอันดับ {denseRank(scores, swingDims[0])} ร่วมกัน รหัสของคุณจึงเป็นได้ทั้ง{" "}
            <b>{allCodes.join(" และ ")}</b> — ลำดับที่แสดงมาจากการเรียงตามหกเหลี่ยม R-I-A-S-E-C เท่านั้น ไม่ได้แปลว่าคุณสนใจด้านหนึ่งมากกว่าอีกด้าน
          </div>
        )}
        {latest.lowDifferentiation && (
          <div className="mt-3 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-[14px] text-sky-900">
            คะแนนทั้ง 6 ด้านของคุณใกล้เคียงกันมาก (ต่างกันสูงสุด {latest.differentiation} คะแนน) แปลว่าคุณยังสนใจหลายด้านพอ ๆ กัน ควรสำรวจตัวเองเพิ่ม เช่น ลองทำกิจกรรมหลายแบบหรือปรึกษาครูแนะแนว
          </div>
        )}
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
                  <div className="flex justify-between gap-2 text-[13.5px] mb-1">
                    <span className="truncate">
                      <b>{c}</b> {dims[c].nameEn} · {dims[c].nameTh}
                    </span>
                    <span className="shrink-0">
                      <span className="text-gray-400 mr-1.5">{rankText(c)}</span>
                      <span className="font-semibold">
                        {scores[c]}/{MAX_SCORE} • {pct}%
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
          <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-xl bg-white/70 px-3 py-2">
              <div className="text-gray-500">ความแตกต่างของคะแนน</div>
              <div className="font-semibold text-gray-800">
                {latest.differentiation} คะแนน <span className="font-normal text-gray-500">(สูงสุด − ต่ำสุด)</span>
              </div>
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-2" title={CONSISTENCY_META[latest.consistency].text}>
              <div className="text-gray-500">ความสอดคล้องของ 2 อันดับแรก</div>
              <div className="font-semibold text-gray-800">{CONSISTENCY_META[latest.consistency].label}</div>
            </div>
          </div>
          <p className="text-[12.5px] text-gray-500 mt-2">{CONSISTENCY_META[latest.consistency].text}</p>
        </div>

        {/* ④ ภาพรวม RIASEC */}
        <div className={`md:w-1/2 min-w-0 ${CARD}`}>
          <SectionHeader emoji="🕸️" title="ภาพรวม RIASEC" subtitle="เรียงตามหกเหลี่ยม R-I-A-S-E-C ด้านที่อยู่ติดกันมีความสนใจคล้ายกัน" />
          <RadarChart scores={scores} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1.5 mt-3 text-[12.5px] text-gray-600">
            {RIASEC_ORDER.map((c) => (
              <div key={c} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${colorMap[c][0]} ${colorMap[c][1]}`} />
                {dimLabel(data, c)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ⑤ จุดเด่นของคุณ — ความหมายของด้านที่เด่น (นับคะแนนเท่ากัน) + ด้านอื่นแบบย่อ */}
      <div className={CARD}>
        <SectionHeader
          emoji="⭐"
          title="จุดเด่นของคุณ"
          subtitle={latest.hasTie ? "ความสนใจอันดับ 1–3 (รวมด้านที่คะแนนเท่ากัน) และความหมายของแต่ละด้าน" : "ความสนใจ 3 อันดับแรก และความหมายของแต่ละด้าน"}
        />
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${topDims.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-3`}>
          {topDims.map((c) => {
            const r = denseRank(scores, c);
            return (
              <div key={c} className={`rounded-xl p-4 ${["bg-pink-200/60", "bg-sky-200/60", "bg-yellow-200/60"][r - 1] || "bg-white/70"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[22px]">{["🥇", "🥈", "🥉"][r - 1] || "🏅"}</span>
                  <span className="text-[13px] text-gray-600">
                    {rankText(c)} • {scores[c]}/{MAX_SCORE}
                  </span>
                </div>
                <div className="text-[15px] font-semibold mt-1">
                  {EMOJI[c]} {c} – {dims[c].nameEn} ({dims[c].nameTh})
                </div>
                <div className="text-[13.5px] text-gray-700 mt-1 leading-6">{dims[c].traits}</div>
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
                    {EMOJI[c]} {c} – {dims[c].nameEn} ({dims[c].nameTh}) <span className="text-gray-500 font-normal">{scores[c]}/{MAX_SCORE}</span>
                  </p>
                  <p className="text-[13px] mt-0.5 text-gray-600">{dims[c].traits}</p>
                </div>
              ))}
          </div>
        </details>
      </div>

      {/* ===== ส่วน B: คำแนะนำจากผลแบบประเมิน RIASEC (ไม่ขึ้นกับเป้าหมาย) ===== */}
      <GroupLabel>คำแนะนำจากผล RIASEC</GroupLabel>

      {latest.hasTie && (
        <div className={CARD}>
          <p className="text-[14px] text-gray-700">
            รหัสของคุณเป็นได้ {allCodes.length} แบบ เพราะ{swingDims.map((c) => `ด้าน ${c}`).join(" และ ")} ได้คะแนนเท่ากัน — เลือกรหัสเพื่อดูคำแนะนำของแบบนั้น
          </p>
          <div role="radiogroup" aria-label="เลือกรหัสที่ต้องการดูคำแนะนำ" className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allCodes.map((c) => {
              const uses = swingDims.filter((d) => c.includes(d));
              const on = c === code;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setViewCode(c)}
                  className={`rounded-xl border px-3.5 py-2.5 text-left ${on ? "!bg-pink-500 border-pink-500 text-white" : "bg-white border-gray-200 text-gray-800 hover:border-pink-300"}`}
                >
                  <span className="text-[16px] font-bold tracking-wider">{c}</span>
                  <span className={`ml-2 text-[12.5px] ${on ? "text-white/90" : "text-gray-500"}`}>ใช้{nounListTh(uses, dims)}</span>
                  <span className={`block text-[13px] mt-0.5 ${on ? "text-white/90" : "text-gray-600"}`}>{data.codes[c].meaning}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {bAdvice && (
        <div className={CARD}>
          <SectionHeader emoji="💡" title={`คำแนะนำสำหรับรหัส ${code}`} subtitle="ช่วยสำรวจความสนใจ ไม่ได้วัดความสามารถ — ไม่รวมสาขาที่คุณตั้งเป็นเป้าหมายไว้แล้ว (ดูในส่วนเป้าหมายด้านล่าง)" />
          <div className="grid grid-cols-1 gap-3">
            {!latest.hasTie && (
              <AdviceBox n="1" title="ลักษณะงานหรือกิจกรรมที่คุณอาจสนใจ" source="ความหมายของรหัส (ตาราง 120 รหัส)">
                <li className="list-none leading-6">
                  <b>{code}</b>: {data.codes[code].meaning}
                </li>
                {latest.lowDifferentiation && <li className="list-none text-sky-800">คะแนนทุกด้านใกล้กัน — ยังสนใจได้หลายทาง ควรลองทำกิจกรรมหลายแบบ</li>}
              </AdviceBox>
            )}

            <AdviceBox n={latest.hasTie ? "1" : "2"} title="สาขาที่ควรสำรวจ — ลองทำอะไร และใช้ทักษะอะไร" source="คณะที่แนะนำของรหัส, คำแนะนำสำหรับนักเรียน, ทักษะที่ควรพัฒนา">
              <li className="list-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {bAdvice.explore.slice(0, 6).map(({ row }) => {
                    const rank = denseRank(scores, row.dim);
                    return (
                      <div key={row.name} className="rounded-lg bg-white/80 border border-gray-100 px-3 py-2 min-w-0 text-[13px] leading-6">
                        <div className="text-[14px] font-semibold text-gray-800">{row.name}</div>
                        <div className="text-[12.5px] text-gray-500">
                          กลุ่ม {dimLabel(data, row.dim)} • ด้านนี้ของคุณ{rank <= 3 ? `อยู่${rankText(row.dim)}` : ` ${scores[row.dim]}/${MAX_SCORE}`}
                        </div>
                        <div className="mt-1">
                          <span className="text-gray-500">ลองทำ: </span>
                          {row.advice}
                        </div>
                        <div>
                          <span className="text-gray-500">ทักษะที่ใช้: </span>
                          {row.skills}
                        </div>
                        <a href={row.links[0] || MYTCAS_HOME} target="_blank" rel="noreferrer" className="text-[12.5px] text-sky-600 hover:underline">
                          {row.links[0] ? "ดูหลักสูตรใน myTCAS ↗" : "ค้นหาหลักสูตรใน myTCAS ↗"}
                        </a>
                      </div>
                    );
                  })}
                </div>
                {bAdvice.explore.length === 0 && <p className="text-gray-500">สาขาที่รหัสนี้แนะนำอยู่ในเป้าหมายของคุณแล้ว</p>}
              </li>
            </AdviceBox>

            <AdviceBox n={latest.hasTie ? "2" : "3"} title={`อาชีพที่สัมพันธ์กับรหัส ${code}`} source="อาชีพตัวอย่างของรหัส / อาชีพที่เกี่ยวข้องของสาขา">
              <li className="list-none">
                <CareerList items={resultCareers} data={data} />
                <p className="mt-1.5 text-[12.5px] text-gray-500">เป็นตัวอย่างอาชีพที่สัมพันธ์กับความสนใจแบบนี้ ไม่ได้ยืนยันว่าคุณเหมาะกับอาชีพนั้นแน่นอน</p>
              </li>
            </AdviceBox>
          </div>
        </div>
      )}

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
            <GoalHeader goal={myGoal} onEdit={() => navigate("/studentgoal")} />
            {analyses.map((a, i) => (
              <AlignmentCard key={a.faculty.name} a={a} data={data} latest={latest} scores={scores} alternatives={altsByCard[i]} />
            ))}
          </div>
        )}
        <details className="mt-3 text-[12.5px] text-gray-500">
          <summary className="cursor-pointer select-none">เกณฑ์ที่ใช้วัดความสอดคล้อง</summary>
          <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">
            <li>สูง: สาขาเป้าหมายอยู่ในรายการแนะนำของรหัส 3 ตัวของคุณ (รวมรหัสทางเลือกเมื่อคะแนนเท่ากัน) หรือกลุ่มของสาขาตรงกับด้านที่คุณสนใจมากที่สุด</li>
            <li>ปานกลาง: กลุ่มของสาขาตรงกับด้านอันดับ 2 หรือ 3 ของคุณ</li>
            <li>ต่ำ: กลุ่มของสาขาไม่อยู่ใน 3 ด้านแรกของคุณ</li>
            <li>ด้านที่คะแนนเท่ากันได้อันดับเดียวกัน เช่น ถ้าด้าน I และ A ได้คะแนนเท่ากันที่อันดับ 3 ทั้งสองด้านนับว่าอยู่ใน 3 ด้านแรก</li>
            <li>สาขาทางเลือก: อยู่กลุ่มเดียวกับเป้าหมาย ใช้วิชาหลักหรืออาชีพปลายทางร่วมกัน และไฟล์จับคู่กับรหัสที่มีด้านเด่นของคุณ</li>
            <li>กลุ่มของแต่ละสาขาและรหัสที่แนะนำมาจากไฟล์ข้อมูลคณะ–อาชีพของโรงเรียน • ไม่ใช้เปอร์เซ็นต์ความเหมาะสม</li>
          </ul>
        </details>
      </div>

      {/* แนวทางเตรียมตัวไปสู่เป้าหมาย — เฉพาะเมื่อมีเป้าหมายที่หาเจอในฐานข้อมูล */}
      {advice?.usesGoal && (
        <div className={CARD}>
          <SectionHeader emoji="🧭" title="แนวทางเตรียมตัวไปสู่เป้าหมาย" subtitle={`สำหรับ ${advice.focus.map((f) => f.name).join(", ")}`} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AdviceBox n="1" title="วิชาที่ควรเน้น" source="วิชาที่ควรเน้น, สายการเรียนที่แนะนำ">
              {advice.perFaculty.map((f) => (
                <FacultyItem key={f.name} name={f.name} multi={advice.perFaculty.length > 1}>
                  <div>
                    <b>{f.subjects.join(", ")}</b>
                  </div>
                  <div className="text-[12.5px] text-gray-500">คำแนะนำทั่วไป — วิชาที่ใช้สอบจริงและสัดส่วนคะแนนดูใน “ข้อกำหนดการรับเข้าจริง” (ข้อ 4)</div>
                  <div className="text-gray-600">สายการเรียน: {f.track}</div>
                </FacultyItem>
              ))}
            </AdviceBox>

            <AdviceBox n="2" title="ทักษะที่ควรพัฒนา" source="ทักษะที่ควรพัฒนา, ลักษณะ/คุณลักษณะที่คณะต้องการ">
              {advice.perFaculty.map((f) => (
                <FacultyItem key={f.name} name={f.name} multi={advice.perFaculty.length > 1}>
                  <div>{f.skills}</div>
                  <div className="text-gray-600">สาขานี้ต้องการ: {f.traits}</div>
                </FacultyItem>
              ))}
            </AdviceBox>

            <AdviceBox n="3" title="กิจกรรมหรือประสบการณ์ที่ควรลอง" source="คำแนะนำสำหรับนักเรียน">
              {advice.perFaculty.map((f) => (
                <FacultyItem key={f.name} name={f.name} multi={advice.perFaculty.length > 1}>
                  {f.advice}
                </FacultyItem>
              ))}
            </AdviceBox>

            <AdviceBox n="4" title="การเตรียมสอบ / Portfolio และการสมัคร" source="สิ่งที่ควรเตรียมสอบ, มหาวิทยาลัยตัวอย่าง, หลักสูตรจาก myTCAS">
              {advice.perFaculty.map((f) => (
                <FacultyItem key={f.name} name={f.name} multi={advice.perFaculty.length > 1}>
                  <div>
                    <span className="text-gray-500">คำแนะนำทั่วไปจากข้อมูลแนะแนว: </span>
                    {f.exam}
                  </div>
                  {/portfolio|แฟ้มสะสมผลงาน/i.test(`${f.exam} ${f.advice}`) && (
                    <div className="text-pink-700">สาขานี้ใช้ Portfolio — เริ่มเก็บผลงานที่เกี่ยวข้องตั้งแต่ตอนนี้</div>
                  )}
                  {f.universities.length > 0 && <div className="text-gray-600">มหาวิทยาลัยตัวอย่าง: {f.universities.join(", ")}</div>}
                  {f.programs.length > 0 && <div className="text-[12.5px] text-gray-500">หลักสูตรที่เปิดจริง: {f.programs.slice(0, 2).join(" • ")}</div>}
                  <a href={f.link || MYTCAS_HOME} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline text-[13px]">
                    {f.link ? "ตรวจคุณสมบัติและเกณฑ์รับเข้าล่าสุดใน myTCAS ↗" : `ค้นหาหลักสูตร “${f.name}” ใน myTCAS ↗`}
                  </a>
                  <div className="mt-2">
                    <AdmissionInfo facultyName={f.name} university={myGoal?.university_name ? fullUniName(myGoal.university_name) : null} />
                  </div>
                </FacultyItem>
              ))}
            </AdviceBox>

            <AdviceBox n="5" title="อาชีพที่เกี่ยวข้องกับเป้าหมาย" source="อาชีพที่เกี่ยวข้อง / อาชีพตัวอย่างของรหัส" wide>
              <li className="list-none">
                <CareerList items={goalCareers} data={data} context="goal" />
              </li>
            </AdviceBox>
          </div>
          <p className="text-[12.5px] text-gray-500 mt-3">
            ที่มา: ไฟล์ข้อมูลคณะ–อาชีพ–คำแนะนำ RIASEC ของงานแนะแนว และระบบค้นหาหลักสูตร myTCAS (ทปอ.) — เกณฑ์รับเข้าเปลี่ยนตามปีและรอบ ควรตรวจประกาศล่าสุดก่อนสมัคร
          </p>
        </div>
      )}

      {/* ===== แผนการเตรียมตัว ===== */}
      <GroupLabel>แผนการเตรียมตัว</GroupLabel>
      <div className={CARD}>
        <SectionHeader emoji="🗺️" title="Roadmap การเตรียมตัว" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ROADMAP.map((step) => (
            <div key={step.grade} className="bg-white/70 rounded-xl p-4">
              <div className="text-[15.5px] font-semibold text-pink-600">{step.grade}</div>
              <ul className="mt-2 space-y-1.5 text-[13.5px] text-gray-700">
                {step.items.map((it, i) => (
                  <Check key={i} tone="emerald">
                    {it}
                  </Check>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[13px] text-gray-500 px-1">
        <p>ผลนี้เป็นแนวทางเบื้องต้น ควรใช้ร่วมกับ:</p>
        <ul className="mt-1.5 space-y-1">
          <Check>ความสนใจส่วนตัว</Check>
          <Check>ความสามารถและผลการเรียน</Check>
          <Check>การปรึกษาครูแนะแนว</Check>
        </ul>
        <p className="mt-2 text-[12px] text-gray-400">
          วิธีคิดคะแนนตามหลักของ John Holland (รูปแบบเดียวกับ O*NET Interest Profiler) • ข้อมูลคณะ/มหาวิทยาลัยจาก{" "}
          {data.sources.map((s) => s.name).join(", ")}
        </p>
      </div>

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

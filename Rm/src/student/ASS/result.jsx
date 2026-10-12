import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";
import { getGoals } from "../../callapi/callapi_user.jsx";
import { getCurrentUser } from "../../utils/auth.js";
import useMyRiasec from "../../hooks/useMyRiasec.js";
import {
  RIASEC_ORDER, MAX_SCORE, MIN_SCORE, scorePercent, facultiesForCode, goalTargets, analyzeTarget, personalAdvice, hasGoal,
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
const joinTh = (arr) => (arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(" ")} และ${arr[arr.length - 1]}`);

const ROADMAP = [
  { grade: "ม.4", items: ["ค้นหาความสนใจของตัวเอง", "ลองทำกิจกรรม/ชุมนุมหลากหลายด้าน", "เริ่มทำแบบทดสอบความถนัด"] },
  { grade: "ม.5", items: ["เลือกวิชาเรียนเสริมตามคณะที่สนใจ", "เริ่มทำ Portfolio", "ศึกษาคุณสมบัติของคณะ/มหาวิทยาลัย"] },
  { grade: "ม.6", items: ["เตรียมสอบ TGAT/TPAT/A-Level", "สมัคร TCAS ตามรอบ", "ปรึกษาครูแนะแนวเรื่องแผนสำรอง"] },
];

const ALIGNMENT_META = {
  high: { label: "สูง", cls: "text-emerald-600", box: "bg-emerald-50 border-emerald-100" },
  medium: { label: "ปานกลาง", cls: "text-amber-600", box: "bg-amber-50 border-amber-100" },
  low: { label: "ต่ำ", cls: "text-red-600", box: "bg-red-50 border-red-100" },
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

function AdviceBox({ n, title, wide, children }) {
  return (
    <div className={`bg-white/70 rounded-xl p-4 min-w-0 ${wide ? "lg:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-6 w-6 rounded-full bg-pink-500 text-white text-[12.5px] font-bold flex items-center justify-center shrink-0">{n}</span>
        <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
      </div>
      <ul className="space-y-1.5 text-[13.5px] text-gray-700">{children}</ul>
    </div>
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

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, data, latest } = useMyRiasec(location.state);
  const [animated, setAnimated] = useState(false);
  // undefined = กำลังโหลด, null = ยังไม่ได้ตั้งเป้าหมาย, object = เป้าหมายล่าสุดของนักเรียนคนนี้
  const [myGoal, setMyGoal] = useState(undefined);
  // รหัสที่กำลังดูข้อมูลคณะ/อาชีพ (เปลี่ยนได้เมื่อคะแนนเท่ากันจนมีหลายรหัส)
  const [viewCode, setViewCode] = useState(null);

  useEffect(() => {
    const studentId = getCurrentUser()?.user_id;
    if (!studentId) return setMyGoal(null);
    getGoals()
      .then((rows) => {
        const mine = (rows || [])
          .filter((g) => String(g.user_user_id) === String(studentId) && !g.deleted_at)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setMyGoal(mine[0] || null);
      })
      .catch(() => setMyGoal(null));
  }, []);

  useEffect(() => {
    if (!latest || latest.legacy) return;
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, [latest]);

  const code = viewCode || latest?.code;
  const recommended = useMemo(() => (data && code && !latest?.legacy ? facultiesForCode(data, code) : []), [data, code, latest]);
  const careers = useMemo(() => {
    if (!data || !code || latest?.legacy) return [];
    const seen = new Set();
    const fromCode = data.codes[code].careers.map((title) => ({ title, from: `รหัส ${code}` }));
    const fromFaculty = recommended.flatMap((f) => f.rows.flatMap((row) => row.careers.map((title) => ({ title, from: row.name }))));
    return [...fromCode, ...fromFaculty].filter((c) => (seen.has(c.title) ? false : (seen.add(c.title), true))).slice(0, 9);
  }, [data, code, recommended, latest]);
  // เป้าหมาย (คณะ/อาชีพ/ข้อความ) ที่หาเจอในฐานข้อมูล → วิเคราะห์ความสอดคล้องทีละรายการ
  const ready = data && latest && !latest.legacy && myGoal !== undefined;
  const analyses = useMemo(() => (ready && myGoal ? goalTargets(data, myGoal).map((t) => analyzeTarget(data, latest, t)) : []), [ready, data, latest, myGoal]);
  const advice = useMemo(() => (ready ? personalAdvice(data, latest, analyses) : null), [ready, data, latest, analyses]);

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
  const top3 = latest.code.split("");
  const allCodes = [latest.code, ...latest.alternativeCodes];
  const dims = data.dimensions;
  const summary = `รหัส ${latest.code} หมายถึง "${data.codes[latest.code].meaning}" — คุณสนใจด้าน ${dims[top3[0]].nameEn} (${dims[top3[0]].nameTh}) ${RANK_TH[0]} รองลงมาคือ ${dims[top3[1]].nameEn} (${dims[top3[1]].nameTh}) และ ${dims[top3[2]].nameEn} (${dims[top3[2]].nameTh})`;

  return (
    <Shell>
      {/* ① รหัสฮอลแลนด์ */}
      <div className={`w-full ${CARD} py-6 px-5 md:px-8`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[12.5px] uppercase tracking-widest text-gray-400 font-medium">ผลแบบสำรวจความสนใจ RIASEC • {thaiDate(latest.date)}</p>
            <p className="text-[34px] font-bold text-black mt-1 tracking-wider">{latest.code}</p>
            <ul className="mt-1 space-y-0.5 text-[14.5px] text-gray-700">
              {top3.map((c, i) => (
                <li key={c}>
                  <b>{c}</b> {dims[c].nameEn} ({dims[c].nameTh}) <span className="text-gray-400">• สนใจ{RANK_TH[i]} {scores[c]}/{MAX_SCORE}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 flex-wrap md:flex-col md:items-end">
            {top3.map((c) => (
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
            มีด้านที่ได้คะแนนเท่ากัน รหัสของคุณจึงอาจเป็น <b>{allCodes.join(" หรือ ")}</b> ก็ได้ (ระบบเรียง {latest.code} ตามลำดับหกเหลี่ยม R-I-A-S-E-C) ลองอ่านคำแนะนำของทุกรหัสแล้วดูว่าแบบไหนตรงกับตัวคุณที่สุด
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
                    <span className="font-semibold shrink-0">
                      {scores[c]}/{MAX_SCORE} • {pct}%
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

      {/* ⑤ ความหมายของแต่ละด้าน */}
      <div className={CARD}>
        <SectionHeader emoji="📖" title="ความหมายของแต่ละด้าน" subtitle="ด้านที่มีสีคือ 3 ด้านที่คุณสนใจมากที่สุด" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ranked.map((c) => {
            const i = top3.indexOf(c);
            const bg = ["bg-pink-200/60", "bg-sky-200/60", "bg-yellow-200/60"][i] || "bg-gray-50/60";
            return (
              <div key={c} className={`p-3 rounded-xl ${bg}`}>
                <p className="font-medium text-[14.5px]">
                  {EMOJI[c]} {c} – {dims[c].nameEn} ({dims[c].nameTh}) <span className="text-gray-500 font-normal">{scores[c]}/{MAX_SCORE}</span>
                </p>
                <p className="text-[13.5px] mt-0.5 text-gray-700">{dims[c].traits}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ⑥ จุดเด่น */}
      <div className={CARD}>
        <SectionHeader emoji="⭐" title="จุดเด่นของคุณ" subtitle="3 ด้านที่ได้คะแนนสูงสุด" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {top3.map((c, i) => (
            <div key={c} className="bg-white/70 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[22px]">{["🥇", "🥈", "🥉"][i]}</span>
                <span className="text-[13px] text-gray-500">
                  {scores[c]}/{MAX_SCORE} • {scorePercent(scores[c])}%
                </span>
              </div>
              <div className="text-[15px] font-semibold mt-1">
                {c} – {dims[c].nameTh}
              </div>
              <div className="text-[13.5px] text-gray-600 mt-1 leading-6">{dims[c].traits}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== แนวทางการศึกษาต่อ ===== */}
      <GroupLabel>แนวทางการศึกษาต่อ</GroupLabel>

      {latest.hasTie && (
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="text-gray-600">ดูคำแนะนำของรหัส:</span>
          {allCodes.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setViewCode(c)}
              className={`px-3 py-1 rounded-full border text-[14px] font-semibold ${c === code ? "!bg-pink-500 text-white border-pink-500" : "bg-white text-gray-700 border-gray-200"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* ⑦ คณะที่แนะนำ */}
      <div className={CARD}>
        <SectionHeader emoji="🎓" title="คณะ/สาขาที่สัมพันธ์กับความสนใจ" subtitle={`จากรหัส ${code}: ${data.codes[code].meaning}`} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {recommended.flatMap((f) =>
            f.rows.map((row) => {
              const pos = code.indexOf(row.dim);
              const why =
                pos >= 0
                  ? `คณะนี้อยู่กลุ่ม ${dimLabel(data, row.dim)} ซึ่งเป็นความสนใจ${RANK_TH[pos]}ของคุณ`
                  : `แนะนำตามความหมายของรหัส ${code} (คณะนี้อยู่กลุ่ม ${dimLabel(data, row.dim)})`;
              return (
                <div key={`${f.label}-${row.name}`} className="bg-white/70 rounded-xl p-4 min-w-0">
                  <div className="text-[15px] font-semibold flex items-start gap-1.5">
                    <span className="text-pink-500">✔</span>
                    <span>
                      {row.name}
                      {f.label !== row.name && <span className="text-[12.5px] font-normal text-gray-500"> (แนะนำเป็น "{f.label}")</span>}
                    </span>
                  </div>
                  <p className="text-[13.5px] text-gray-600 mt-1">
                    <span className="text-gray-500">เหตุผล:</span> {why}
                  </p>
                  {row.universities.length > 0 && <p className="text-[13.5px] text-gray-700 mt-1.5">🏫 {row.universities.join(", ")}</p>}
                  <div className="mt-2 grid gap-1 text-[13px] text-gray-600">
                    <div>
                      <span className="text-gray-500">สายการเรียน:</span> {row.track}
                    </div>
                    <div>
                      <span className="text-gray-500">วิชาที่ควรเน้น:</span> {row.subjects.join(", ")}
                    </div>
                    <div>
                      <span className="text-gray-500">คณะต้องการ:</span> {row.traits}
                    </div>
                    <div>
                      <span className="text-gray-500">เตรียมสอบ:</span> {row.exam}
                    </div>
                    <div>
                      <span className="text-gray-500">คำแนะนำ:</span> {row.advice}
                    </div>
                  </div>
                  {row.links[0] && (
                    <a href={row.links[0]} target="_blank" rel="noreferrer" className="inline-block mt-2 text-[13px] text-sky-600 hover:underline">
                      ดูหลักสูตรและเกณฑ์รับเข้าใน myTCAS ↗
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
        <p className="text-[12.5px] text-gray-500 mt-3">
          เกณฑ์รับเข้าเปลี่ยนตามปี รอบ และหลักสูตร — ตรวจประกาศล่าสุดที่ myTCAS และเว็บไซต์มหาวิทยาลัยก่อนสมัครทุกครั้ง
        </p>
      </div>

      {/* ⑧ อาชีพที่เกี่ยวข้อง */}
      <div className={CARD}>
        <SectionHeader emoji="💼" title="อาชีพที่เกี่ยวข้อง" subtitle="ตัวอย่างอาชีพจากรหัสของคุณและคณะที่แนะนำ" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {careers.map((c) => (
            <div key={c.title} className="bg-white/70 rounded-xl px-3.5 py-2.5">
              <div className="text-[14px] font-medium text-gray-800">{c.title}</div>
              <div className="text-[12px] text-gray-500">จาก {c.from}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ⑨ ความสอดคล้องกับเป้าหมาย */}
      <GroupLabel>เป้าหมายของคุณ</GroupLabel>
      <div className={CARD}>
        <SectionHeader emoji="🎯" title="ความสอดคล้องกับเป้าหมาย" subtitle="เทียบเป้าหมายที่ตั้งไว้กับผล RIASEC ทั้ง 6 ด้าน" />
        {!ready ? (
          <p className="text-[14.5px] text-gray-400">กำลังโหลด...</p>
        ) : !hasGoal(myGoal) ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[14.5px] text-gray-600">ยังไม่ได้ตั้งเป้าหมาย — ตั้งเป้าหมายคณะ สาขา หรืออาชีพที่สนใจก่อน แล้วระบบจะเปรียบเทียบกับผลแบบทดสอบนี้และให้คำแนะนำที่ตรงกับเป้าหมายของคุณ</p>
            <button type="button" onClick={() => navigate("/studentgoal")} className="shrink-0 px-4 py-2 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[13.5px] font-medium">
              ไปตั้งเป้าหมาย
            </button>
          </div>
        ) : analyses.length === 0 ? (
          <p className="text-[14.5px] text-gray-600">
            เป้าหมายของคุณคือ <b>{[myGoal.faculty_name, myGoal.career_field].filter(Boolean).join(" / ") || myGoal.goal_text}</b> — ยังไม่มีข้อมูลคณะหรืออาชีพนี้ในฐานข้อมูลของระบบ จึงยังเปรียบเทียบไม่ได้
            ลองเลือกชื่อคณะจากรายการในหน้าเป้าหมาย หรือปรึกษาครูแนะแนว
          </p>
        ) : (
          <div className="grid gap-4">
            {analyses.map((a) => {
              const meta = ALIGNMENT_META[a.level];
              const dim = a.faculty.dim;
              return (
                <div key={a.faculty.name} className={`rounded-xl border px-4 py-4 ${meta.box}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12.5px] text-gray-500">{SOURCE_TH[a.source]}: {a.source === "text" ? `“${a.input.slice(0, 60)}${a.input.length > 60 ? "…" : ""}”` : a.input}</div>
                      <div className="text-[16px] font-semibold text-gray-900">{a.faculty.name}</div>
                    </div>
                    <span className={`shrink-0 rounded-full bg-white px-3 py-1 text-[14px] font-bold ${meta.cls}`}>สอดคล้อง{meta.label}</span>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[13.5px]">
                    <div className="rounded-lg bg-white/80 px-3 py-2">
                      <div className="text-gray-500">ผล RIASEC ของคุณ</div>
                      <div className="font-semibold text-gray-800">
                        {latest.code} · {top3.map((c) => dims[c].nameEn).join(" · ")}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/80 px-3 py-2">
                      <div className="text-gray-500">สาขานี้เน้นด้าน (จากไฟล์ข้อมูลคณะ)</div>
                      <div className="font-semibold text-gray-800">
                        {dimLabel(data, dim)} — คุณได้ {a.dimScore}/{MAX_SCORE} (อันดับ {a.dimRank} จาก 6)
                      </div>
                    </div>
                  </div>

                  <p className="text-[14px] text-gray-700 mt-3 leading-6">
                    <b>เพราะอะไร: </b>
                    {a.reason === "recommended" && `${a.faculty.name} เป็นหนึ่งในสาขาที่แนะนำสำหรับรหัส ${latest.code} โดยตรง ความสนใจของคุณจึงไปทางเดียวกับสาขานี้`}
                    {a.reason === "top" && `สาขานี้เน้นความสนใจด้าน${TRAIT_NOUN[dim]} (${dim}) ซึ่งเป็นด้านที่คุณสนใจมากที่สุด`}
                    {a.reason === "secondary" &&
                      `สาขานี้เน้นความสนใจด้าน${TRAIT_NOUN[dim]} (${dim}) ซึ่งเป็นความสนใจ${RANK_TH[a.position]}ของคุณ — สอดคล้องอยู่บ้าง แต่ยังไม่ใช่ด้านที่โดดเด่นที่สุด`}
                    {a.reason === "outside" &&
                      `ผลประเมินแสดงว่าคุณโดดเด่นด้าน${joinTh(top3.map((c) => TRAIT_NOUN[c]))} ขณะที่สาขานี้เน้นความสนใจด้าน${TRAIT_NOUN[dim]} (${dim}) ซึ่งเป็นด้านอันดับ ${a.dimRank} ของคุณ จึงควรพิจารณาลักษณะของสาขาที่ต้องการเรียนเพิ่มเติม`}
                  </p>
                  <p className="text-[13.5px] text-gray-600 mt-1.5 leading-6">
                    <span className="text-gray-500">สาขานี้ต้องการ: </span>
                    {a.faculty.traits}
                    <br />
                    <span className="text-gray-500">จุดเด่นของคุณ: </span>
                    {dims[top3[0]].traits}
                  </p>

                  {a.level !== "high" && (
                    <div className="mt-3 pt-3 border-t border-black/5">
                      <div className="text-[14px] font-semibold text-gray-800">แนวทางที่ควรพิจารณา</div>
                      <ul className="mt-1.5 space-y-1 text-[13.5px] text-gray-700">
                        <Check>สำรวจสาขาย่อยในคณะที่สนใจ ว่าตรงกับความสนใจด้านไหนของคุณบ้าง (ดูหลักสูตรจริงในลิงก์ myTCAS)</Check>
                        <Check>ลองทำกิจกรรมหรือผลงานที่เกี่ยวข้องกับสาขานี้ เช่น {a.faculty.advice}</Check>
                        <Check>
                          เทียบความสนใจของตัวเองกับวิชาที่สาขานี้เน้น ({a.faculty.subjects.join(", ")}) และทักษะที่ต้องใช้ ({a.faculty.skills})
                        </Check>
                      </ul>
                      {a.bridges.length > 0 && (
                        <div className="mt-3 rounded-lg bg-white/80 px-3 py-2.5">
                          <div className="text-[13.5px] font-medium text-gray-800">สาขาที่เชื่อมความสนใจของคุณกับเป้าหมาย</div>
                          <div className="text-[12.5px] text-gray-500">สาขาที่ไฟล์ข้อมูลจับคู่กับรหัสซึ่งมีทั้งด้าน {top3[0]} ของคุณและด้าน {dim} ของเป้าหมาย</div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {a.bridges.map((b) => (
                              <span key={b.row.name} className="rounded-full bg-pink-50 text-pink-700 px-2.5 py-1 text-[13px]" title={`จากรหัส ${b.codes.join(", ")}`}>
                                {b.row.name} <span className="text-pink-400">({b.codes.slice(0, 3).join(", ")})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[12.5px] text-gray-500 mt-2">
                        ระดับความสอดคล้องไม่ได้แปลว่าเรียนสาขานี้ไม่ได้ — ถ้าตั้งใจจริง ให้ลองสำรวจและเตรียมพื้นฐานตามคำแนะนำด้านล่าง
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <details className="mt-3 text-[12.5px] text-gray-500">
          <summary className="cursor-pointer select-none">เกณฑ์ที่ใช้วัดความสอดคล้อง</summary>
          <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">
            <li>สูง: สาขาเป้าหมายอยู่ในรายการแนะนำของรหัส 3 ตัวของคุณ หรือกลุ่มของสาขาตรงกับด้านที่คุณสนใจมากที่สุด</li>
            <li>ปานกลาง: กลุ่มของสาขาตรงกับด้านอันดับ 2 หรือ 3 ของคุณ</li>
            <li>ต่ำ: กลุ่มของสาขาไม่อยู่ใน 3 ด้านแรกของคุณ</li>
            <li>กลุ่มของแต่ละสาขาและรหัสที่แนะนำมาจากไฟล์ข้อมูลคณะ–อาชีพของโรงเรียน • ไม่ใช้เปอร์เซ็นต์ความเหมาะสม</li>
          </ul>
        </details>
        <p className="text-[12.5px] text-gray-500 mt-2">ผลนี้บอก "ความสนใจ" ไม่ได้วัดความสามารถหรือรับประกันความสำเร็จในการเรียน และไม่ควรนำไปเทียบกับคะแนนของเพื่อน</p>
      </div>

      {/* ⑩ คำแนะนำเฉพาะบุคคล */}
      {advice && (
        <div className={CARD}>
          <SectionHeader
            emoji="🧭"
            title="คำแนะนำเฉพาะบุคคล"
            subtitle={advice.usesGoal ? `จากผล ${latest.code} และเป้าหมาย: ${advice.focus.map((f) => f.name).join(", ")}` : `จากผล ${latest.code} (ยังไม่ได้ตั้งเป้าหมาย จึงใช้สาขาที่ตรงกับรหัสของคุณ: ${advice.focus[0].name})`}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AdviceBox n="1" title="การเรียนและวิชาที่ควรเน้น">
              {advice.study.focusSubjects.map((x) => (
                <Check key={x.faculty}>
                  {x.faculty}: เน้น <b>{x.subjects.join(", ")}</b>
                </Check>
              ))}
              <Check>วิชาที่สาขาซึ่งตรงกับรหัส {latest.code} ใช้บ่อยที่สุด: {advice.study.commonSubjects.join(", ")}</Check>
            </AdviceBox>

            <AdviceBox n="2" title="ทักษะและจุดเด่นที่ควรพัฒนา">
              <Check>
                ใช้จุดเด่นด้าน{joinTh(advice.skills.strengths.map((s) => TRAIT_NOUN[s.code]))} เลือกกิจกรรม เช่น การทำงานเป็นทีม การแก้ปัญหา หรือการนำเสนอ
                แล้วสังเกตว่ากิจกรรมแบบไหนทำให้อยากพัฒนาต่อ
              </Check>
              {advice.skills.focusSkills.map((x) => (
                <Check key={x.faculty}>
                  ทักษะที่ {x.faculty} ใช้: {x.skills}
                </Check>
              ))}
              {advice.skills.toExplore.map((t) => (
                <Check key={t.code}>
                  เป้าหมายของคุณใช้ความสนใจด้าน{TRAIT_NOUN[t.code]} ({t.code} คุณได้ {t.score}/{MAX_SCORE}) ลองทำกิจกรรมที่คนสายนี้ชอบ: {t.traits}
                </Check>
              ))}
            </AdviceBox>

            <AdviceBox n="3" title="กิจกรรมหรือประสบการณ์ที่ควรลอง">
              {advice.activities.map((x) => (
                <Check key={x.text}>
                  {x.text} <span className="text-gray-400">({x.faculty})</span>
                </Check>
              ))}
            </AdviceBox>

            <AdviceBox n="4" title="เตรียมตัวเข้าคณะ/สาขาที่สนใจ">
              {advice.prepare.map((x) => (
                <li key={x.faculty} className="rounded-lg bg-white/80 px-3 py-2 list-none">
                  <div className="font-medium text-gray-800">{x.faculty}</div>
                  <div>สายการเรียน: {x.track}</div>
                  <div>เตรียมสอบ: {x.exam}</div>
                  {x.universities.length > 0 && <div className="text-gray-500">เปิดสอนเช่น {x.universities.join(", ")}</div>}
                  {x.link && (
                    <a href={x.link} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
                      ตรวจเกณฑ์ปัจจุบันใน myTCAS ↗
                    </a>
                  )}
                </li>
              ))}
            </AdviceBox>

            <AdviceBox n="5" title="อาชีพที่เกี่ยวข้องและการสำรวจเพิ่มเติม" wide>
              <li className="flex flex-wrap gap-1.5 list-none">
                {[...new Set([...advice.careers.fromGoal, ...advice.careers.fromCode])].map((c) => (
                  <span key={c} className="rounded-full bg-white/80 border border-gray-100 px-2.5 py-1 text-[13px]">
                    {c}
                  </span>
                ))}
              </li>
              <Check>เลือกอาชีพที่สนใจ 1–2 อาชีพ แล้วลองสัมภาษณ์คนที่ทำงานนั้น หรือดูวิดีโอ “หนึ่งวันของคนทำอาชีพนี้” เพื่อดูว่างานจริงเป็นอย่างไร</Check>
              <Check>ปรึกษาครูแนะแนวเพื่อวางแผนเส้นทางหลักและเส้นทางสำรอง</Check>
            </AdviceBox>
          </div>
          <p className="text-[12.5px] text-gray-500 mt-3">
            ข้อความแนะนำเลือกจากคอลัมน์ในไฟล์ข้อมูลคณะ–อาชีพ (วิชาที่ควรเน้น ทักษะ คำแนะนำ การเตรียมสอบ) ตามผลและเป้าหมายของคุณ — เกณฑ์รับเข้าเปลี่ยนทุกปี ควรตรวจประกาศล่าสุด
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

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";
import { getGoals } from "../../callapi/callapi_user.jsx";
import { getCurrentUser } from "../../utils/auth.js";
import useMyRiasec from "../../hooks/useMyRiasec.js";
import {
  RIASEC_ORDER, MAX_SCORE, MIN_SCORE, scorePercent, facultiesForCode, goalAlignment,
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
  const goalText = myGoal ? myGoal.faculty_name || myGoal.career_field || myGoal.goal_text : "";
  const alignment = useMemo(() => (data && latest && !latest.legacy && myGoal !== undefined ? goalAlignment(data, goalText, latest.code) : null), [data, latest, myGoal, goalText]);

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
      <div className={CARD}>
        <SectionHeader emoji="🎯" title="ความสอดคล้องกับเป้าหมาย" />
        {myGoal === undefined || !alignment ? (
          <p className="text-[14.5px] text-gray-400">กำลังโหลด...</p>
        ) : alignment.level === "none" ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[14.5px] text-gray-600">ยังไม่ได้ตั้งเป้าหมาย — ตั้งเป้าหมายคณะหรืออาชีพที่สนใจก่อน แล้วระบบจะเปรียบเทียบกับผลแบบทดสอบนี้ให้</p>
            <button type="button" onClick={() => navigate("/studentgoal")} className="shrink-0 px-4 py-2 rounded-xl !bg-pink-500 hover:!bg-pink-600 text-white text-[13.5px] font-medium">
              ไปตั้งเป้าหมาย
            </button>
          </div>
        ) : alignment.level === "unknown" ? (
          <p className="text-[14.5px] text-gray-600">
            เป้าหมายของคุณคือ <b>{goalText}</b> — ยังไม่มีข้อมูลคณะนี้ในฐานข้อมูลของระบบ จึงยังเปรียบเทียบไม่ได้ ลองปรึกษาครูแนะแนวเพิ่มเติม
          </p>
        ) : (
          <div className={`rounded-xl border px-4 py-3 ${ALIGNMENT_META[alignment.level].box}`}>
            <p className="text-[15px] text-gray-800">
              เป้าหมาย <b>{goalText}</b> สอดคล้องกับความสนใจของคุณในระดับ{" "}
              <b className={ALIGNMENT_META[alignment.level].cls}>{ALIGNMENT_META[alignment.level].label}</b>
            </p>
            <p className="text-[14px] text-gray-700 mt-1.5 leading-6">
              {alignment.reason === "recommended" && `${alignment.faculty.name} อยู่ในคณะที่แนะนำสำหรับรหัส ${latest.code} ของคุณ`}
              {alignment.reason === "top" && `${alignment.faculty.name} อยู่กลุ่ม ${dimLabel(data, alignment.faculty.dim)} ซึ่งเป็นด้านที่คุณสนใจมากที่สุด`}
              {alignment.reason === "secondary" && `${alignment.faculty.name} อยู่กลุ่ม ${dimLabel(data, alignment.faculty.dim)} ซึ่งเป็นความสนใจ${RANK_TH[alignment.position]}ของคุณ`}
              {alignment.reason === "outside" &&
                `${alignment.faculty.name} อยู่กลุ่ม ${dimLabel(data, alignment.faculty.dim)} ซึ่งไม่อยู่ใน 3 ด้านที่คุณสนใจมากที่สุด (ได้ ${scores[alignment.faculty.dim]}/${MAX_SCORE}) — ไม่ได้แปลว่าเรียนไม่ได้ แต่ควรลองทำกิจกรรมที่เกี่ยวข้องเพื่อสำรวจว่าสนใจจริงไหม`}
            </p>
            {alignment.faculty && (
              <p className="text-[13.5px] text-gray-600 mt-2">
                <span className="text-gray-500">สิ่งที่ควรพัฒนาสำหรับเป้าหมายนี้:</span> {alignment.faculty.skills} — {alignment.faculty.advice}
              </p>
            )}
          </div>
        )}
        <p className="text-[12.5px] text-gray-500 mt-3">ผลนี้บอก "ความสนใจ" ไม่ได้วัดความสามารถหรือรับประกันความสำเร็จในการเรียน และไม่ควรนำไปเทียบกับคะแนนของเพื่อน</p>
      </div>

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

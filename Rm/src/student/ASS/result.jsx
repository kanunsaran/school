import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../../nav.jsx";
import Header from "../../Header";

const resultsData = [
  { code: "R", skill: "Realistic", score: 12, description: "ชอบงานลงมือทำ", detail: "ชอบงานที่ใช้มือหรือเครื่องมือจริง เห็นผลลัพธ์ชัดเจน เช่น งานช่าง ภาคสนาม หรือสร้างของจริง" },
  { code: "I", skill: "Investigative", score: 18, description: "ชอบคิดวิเคราะห์", detail: "ชอบตั้งคำถาม ทดลอง และค้นหาคำตอบอย่างมีเหตุผล เหมาะกับงานวิทยาศาสตร์ เทคโนโลยี หรือวิจัย" },
  { code: "A", skill: "Artistic", score: 15, description: "ชอบสร้างสรรค์", detail: "รักอิสระทางความคิด ชอบแสดงออกและใช้จินตนาการ เช่น ศิลปะ ดนตรี หรือออกแบบ" },
  { code: "S", skill: "Social", score: 20, description: "ชอบช่วยเหลือผู้อื่น", detail: "มีมนุษยสัมพันธ์ดี ชอบทำงานกับคนอื่น ให้คำแนะนำหรือช่วยเหลือ เหมาะกับการสอนและดูแลผู้อื่น" },
  { code: "E", skill: "Enterprising", score: 17, description: "ชอบเป็นผู้นำ", detail: "มั่นใจ กล้าแสดงออก ชอบโน้มน้าวและตัดสินใจ เหมาะกับงานบริหาร การขาย หรือจัดการโครงการ" },
  { code: "C", skill: "Conventional", score: 10, description: "ชอบความเป็นระเบียบ", detail: "ชอบงานที่มีระบบและขั้นตอนชัดเจน รอบคอบ เหมาะกับงานธุรการ บัญชี หรือจัดการข้อมูล" },
];

const topSkillsTemplate = [
  { 
    skill: "ด้านสังคม-มนุษย์สัมพันธ์", 
    description: "คุณถนัดงานที่เกี่ยวกับคนและความสัมพันธ์", 
    careers: ["นักจิตวิทยา", "ครู", "นักสังคมสงเคราะห์"], 
    faculties: [
      { name: "คณะครุศาสตร์", link: "https://www.mytcas.com/" },
      { name: "คณะมนุษยศาสตร์", link: "https://www.mytcas.com/" },
      { name: "คณะสังคมศาสตร์", link: "https://www.mytcas.com/" },
    ] 
  },
  { 
    skill: "ด้านคณิตศาสตร์-วิทยาศาสตร์", 
    description: "คุณถนัดการวิเคราะห์และแก้ปัญหา", 
    careers: ["นักวิจัย", "วิศวกร", "นักคณิตศาสตร์"], 
    faculties: [
      { name: "คณะวิทยาศาสตร์", link: "https://www.mytcas.com/" },
      { name: "คณะวิศวกรรมศาสตร์", link: "https://www.mytcas.com/" },
    ] 
  },
  { 
    skill: "ด้านการสื่อสาร-เจรจา", 
    description: "คุณถนัดการสื่อสารและเจรจา", 
    careers: ["นักประชาสัมพันธ์", "นักข่าว", "ผู้บริหาร"], 
    faculties: [
      { name: "คณะนิเทศศาสตร์", link: "https://www.mytcas.com/" },
      { name: "คณะบริหารธุรกิจ", link: "https://www.mytcas.com/" },
    ] 
  },
];

const colorMap = {
  R: ["from-red-300", "to-red-500"],
  I: ["from-blue-300", "to-blue-500"],
  A: ["from-yellow-300", "to-yellow-400"],
  S: ["from-green-300", "to-green-400"],
  E: ["from-purple-300", "to-purple-500"],
  C: ["from-gray-300", "to-gray-400"],
};

export default function ResultPage() {
  const [animatedWidth, setAnimatedWidth] = useState({});
  const [hoveredCode, setHoveredCode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    resultsData.forEach((r, idx) => {
      setTimeout(() => {
        setAnimatedWidth(prev => ({ ...prev, [r.code]: (r.score / 20) * 100 }));
      }, idx * 300);
    });
  }, []);

  const top3Codes = useMemo(() => [...resultsData].sort((a, b) => b.score - a.score).slice(0, 3).map(d => d.code), []);
  const headerAbbr = top3Codes.join("");
  const headerDesc = top3Codes.map(code => {
    const r = resultsData.find(d => d.code === code);
    return `${r.skill}: ${r.detail}`;
  }).join(", ");

  return (
    <div className="min-h-screen flex bg-white relative overflow-hidden">

      <Header />
      <SidebarNav />

      <main className="flex-1 overflow-auto p-6 pt-16 flex flex-col gap-6 relative z-10">

        {/* ===== BLUR CIRCLES BACKGROUND WITH SUBTLE ANIMATION ===== */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-pink-300/40 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute top-1/3 -right-24 w-96 h-96 bg-rose-300/30 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-fuchsia-200/30 rounded-full blur-3xl animate-float-slow" />

          <div className="absolute top-20 left-1/4 w-24 h-24 bg-yellow-300/50 rounded-full blur-2xl animate-float-slow" />
          <div className="absolute top-40 right-1/3 w-16 h-16 bg-sky-300/50 rounded-full blur-2xl animate-float-slow" />
          <div className="absolute bottom-32 left-20 w-20 h-20 bg-yellow-200/60 rounded-full blur-2xl animate-float-slow" />
          <div className="absolute bottom-20 right-16 w-28 h-28 bg-sky-200/50 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute top-1/2 left-10 w-12 h-12 bg-yellow-300/60 rounded-full blur-xl animate-float-slow" />
          <div className="absolute top-2 right-10 w-14 h-14 bg-sky-300/60 rounded-full blur-xl animate-float-slow" />
        </div>

        {/* HEADER FULL WIDTH */}
        <div className="w-full sticky top-0 z-50 bg-white/40 backdrop-blur-xl py-6 px-8 shadow-md rounded-xl">
          <p className="text-3xl font-bold">{headerAbbr}</p>
          <p className="text-[14px] mt-1">{headerDesc}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">

          {/* LEFT */}
          <div className="md:w-1/2 flex flex-col gap-4">

            {/* Graph */}
            <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl shadow-lg">
              <h2 className="text-[16px] font-semibold mb-4">คะแนนแต่ละด้าน</h2>
              <div className="space-y-3">
                {resultsData.map(r => {
                  const [from, to] = colorMap[r.code];
                  return (
                    <div key={r.code} className="flex items-center gap-3">
                      <div className="w-16 text-[12px]">{r.skill}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-[12px] mb-1">
                          <span>{r.description}</span>
                          <span className="font-semibold">{hoveredCode === r.code ? `${r.score}/20` : ""}</span>
                        </div>
                        <div className="w-full h-4 rounded-full bg-gray-200/50 overflow-hidden"
                          onMouseEnter={() => setHoveredCode(r.code)}
                          onMouseLeave={() => setHoveredCode(null)}
                        >
                          <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${from} ${to}`} style={{ width: `${animatedWidth[r.code] || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Meaning */}
            <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl shadow-lg">
              <h2 className="text-[16px] font-semibold mb-3">ความหมายของแต่ละด้าน</h2>
              <div className="space-y-2">
                {resultsData.map((r, idx) => {
                  let bgColor = "bg-gray-50/50";
                  if (top3Codes.includes(r.code)) {
                    const topIndex = top3Codes.indexOf(r.code);
                    if (topIndex === 0) bgColor = "bg-pink-50/60";
                    else if (topIndex === 1) bgColor = "bg-sky-50/60";
                    else if (topIndex === 2) bgColor = "bg-yellow-50/60";
                  }
                  return (
                    <div key={r.code} className={`p-2 rounded-lg ${bgColor}`}>
                      <p className="font-medium text-[13px]">{r.skill}</p>
                      <p className="text-[12px]">{r.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="md:w-1/2 flex flex-col gap-4">

            <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl shadow-lg">
              <h2 className="text-[16px] font-semibold mb-2">Insight ของคุณ</h2>
              <ul className="list-disc list-inside text-[12px] space-y-1">
                {top3Codes.map(code => {
                  const r = resultsData.find(d => d.code === code);
                  return <li key={code}><span className="font-medium">{r.skill}:</span> {r.detail}</li>
                })}
              </ul>
            </div>

            <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl shadow-lg">
              <h2 className="text-[16px] font-semibold mb-2">คำแนะนำการพัฒนาตัวเอง</h2>
              <ul className="list-disc list-inside text-[12px] space-y-1">
                <li>เข้าร่วมกิจกรรมช่วยเหลือผู้อื่น</li>
                <li>ฝึกวิเคราะห์และแก้ปัญหาอย่างเป็นระบบ</li>
                <li>รับบทบาทนำทีมและตัดสินใจในโปรเจกต์</li>
                <li>ลองทำโปรเจกต์เชิงสร้างสรรค์และทดลองสิ่งใหม่</li>
                <li>เข้าร่วมเวิร์กชอปหรือการเรียนรู้ด้านวิทยาศาสตร์และศิลปะ</li>
              </ul>
            </div>

            <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl shadow-lg">
              <h2 className="text-[16px] font-semibold mb-2">คำแนะนำการศึกษาต่อ / อาชีพ</h2>
              <div className="space-y-2">
                {topSkillsTemplate.map(s => (
                  <div key={s.skill} className="p-3 rounded-xl bg-gray-50/50 shadow-sm">
                    <p className="font-medium text-[13px]">{s.skill}</p>
                    <p className="text-[12px] mt-1">{s.description}</p>
                    <p className="text-[11px]"><span className="font-medium">อาชีพ:</span> {s.careers.join(", ")}</p>
                    <p className="text-[11px]">
                      <span className="font-medium">คณะ:</span>{" "}
                      {s.faculties.map((f, idx) => (
                        <span key={f.name}>
                          <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {f.name}
                          </a>{idx < s.faculties.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 italic">*สามารถหาข้อมูลเพิ่มเติมในเว็บไซต์ TCAS</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* ===== Save Button Below Content ===== */}
        <div className="mt-4 flex justify-end">
          <button
            className="bg-white/50 backdrop-blur-xl px-4 py-2 rounded-xl shadow-lg text-gray-500 font-medium hover:bg-pink-50 hover:text-pink-600 transition-all duration-300"
            onClick={() => navigate("/aptitudeIntro")}
          >
            บันทึกผล
          </button>
        </div>

      </main>

      {/* ===== Floating Animation Keyframes ===== */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(2px, -4px) scale(1.05); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>

    </div>
  )
}


import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../../nav.jsx";
import Header from "../../Header";

const questions = [
  { id: 1, text: "ฉันชอบทำงานที่เกี่ยวกับการแก้ปัญหาทางคณิตศาสตร์หรือวิทยาศาสตร์" },
  { id: 2, text: "ฉันชอบงานที่ต้องใช้ความคิดสร้างสรรค์ เช่น วาดรูป ทำเพลง หรือเขียนบท" },
  { id: 3, text: "ฉันชอบช่วยเหลือหรือดูแลผู้อื่น" },
  { id: 4, text: "ฉันชอบทำงานที่เกี่ยวข้องกับเครื่องมือ เครื่องจักร หรือเทคโนโลยี" },
  { id: 5, text: "ฉันชอบงานที่ต้องมีการพูดคุย ติดต่อ หรือทำงานร่วมกับคนอื่น" }
];

const scale = [
  { value: 1, label: "ไม่ชอบเลย" },
  { value: 2, label: "ไม่ค่อยชอบ" },
  { value: 3, label: "เฉย ๆ" },
  { value: 4, label: "ชอบ" },
  { value: 5, label: "ชอบมาก" },
];

export default function AptitudeTestPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [show, setShow] = useState(false);
  const refs = useRef([]);
  const [currentQ, setCurrentQ] = useState(1);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  const handleSelect = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    if (qId === currentQ && currentQ < questions.length) setCurrentQ(currentQ + 1);
  };

  const handleSubmit = () => {
    for (let q of questions) {
      if (!answers[q.id]) {
        // เลื่อนไปที่ข้อที่ยังไม่ตอบ
        refs.current[q.id - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setCurrentQ(q.id);
        return;
      }
    }
    console.log("คำตอบทั้งหมด:", answers);
    navigate("/result");
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 overflow-auto bg-white " >
        {/* ===== หัวข้อและคำอธิบาย ===== */}
        <div className="text-center mb-6">
          <h1 className="text-[18px] font-bold text-gray-900 mb-2">แบบทดสอบความถนัด</h1>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            โปรดอ่านแต่ละข้อความ และเลือกคำตอบที่ตรงกับความรู้สึกของท่านมากที่สุด โดยไม่ต้องคิดนานเกินไป
            <br />
            (ตอบตามความจริง ไม่ใช่ตามที่คิดว่าควรจะเป็น)
            <br />
            ระดับการตอบ (Likert Scale 5 ระดับ) 1 = ไม่ชอบเลย ... 5 = ชอบมาก
          </p>
        </div>

        {/* ===== คำถาม ===== */}
        <div className={`transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                ref={el => refs.current[idx] = el}
                className={`p-4 border border-gray-200 rounded-2xl transition-all duration-300 backdrop-blur-md bg-white/40 shadow-md ${currentQ === q.id ? "ring-2 ring-pink-200" : ""}`}
              >
                <p className="mb-3 font-medium text-[14px] text-gray-800">
                  {q.id}. {q.text}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {scale.map(s => (
                    <button style={{backgroundColor: "white"}}
                      key={s.value}
                      onClick={() => handleSelect(q.id, s.value)}
                      className={`flex-1 px-3 py-2 rounded-full border text-[14px] transition-all duration-200
        bg-white/70
        hover:bg-pink-50 hover:border-pink-100
        ${answers[q.id] === s.value ? "bg-pink-50 border-pink-200 text-pink-600 font-semibold" : "border-gray-200 text-gray-800"}
      `}
                    >
                      {s.value} ({s.label})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ===== ปุ่มส่งคำตอบ ===== */}
          <div className="mt-6 flex justify-end">
            <button style={{backgroundColor: "white"}}
              onClick={handleSubmit}
              className={`px-3 py-2 rounded-full border text-[14px] font-semibold
                bg-white/70 border-gray-200 text-gray-800 shadow-md
                hover:bg-pink-50 hover:border-pink-100 hover:text-pink-600
                transition-all duration-200`}
            >
              ส่งคำตอบ
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

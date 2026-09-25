import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";
import { FaChevronRight, FaChevronLeft } from "react-icons/fa";

// RIASEC question bank — 10 statements per dimension (60 total).
// The dimension code is only used for scoring; it is never shown to the test-taker.
const QUESTION_BANK = {
  R: [
    "ฉันชอบประกอบ ซ่อมแซม หรือดัดแปลงสิ่งของด้วยตนเอง",
    "ฉันสนุกกับการเรียนรู้ผ่านการลงมือทำจริง",
    "ฉันสนใจการทำงานกับเครื่องมือ อุปกรณ์หรือเทคโนโลยีต่าง ๆ",
    "ฉันชอบกิจกรรมที่ต้องใช้ทักษะเชิงปฏิบัติ",
    "ฉันชอบแก้ปัญหาที่เกิดขึ้นระหว่างการทำงานจริง",
    "ฉันชอบสร้างหรือประดิษฐ์สิ่งใหม่ๆ",
    "ฉันชอบงานที่สามารถเห็นผลลัพธ์ได้อย่างชัดเจน",
    "ฉันสนใจกิจกรรมภาคสนามมากกว่าการนั่งเรียนอย่างเดียว",
    "ฉันชอบทดลองใช้อุปกรณ์หรือเทคโนโลยีใหม่ๆ",
    "ฉันรู้สึกภูมิใจเมื่อได้สร้างผลงานที่จับต้องได้",
  ],
  I: [
    "ฉันชอบตั้งคำถามและค้นหาคำตอบด้วยตนเอง",
    "ฉันสนุกกับการวิเคราะห์ข้อมูลหรือเหตุการณ์ต่าง ๆ",
    "ฉันสนใจการทดลองหรือการวิจัย",
    "ฉันชอบเรียนรู้เรื่องที่ซับซ้อนและท้าทาย",
    "ฉันชอบแก้ปัญหาที่ต้องใช้เหตุผลและตรรกะ",
    "ฉันมักค้นคว้าข้อมูลเพิ่มเติมนอกเหนือจากที่เรียน",
    "ฉันชอบเปรียบเทียบข้อมูลก่อนตัดสินใจ",
    "ฉันสนใจวิทยาศาสตร์ เทคโนโลยี หรือการค้นพบใหม่ๆ",
    "ฉันชอบค้นหาสาเหตุของปัญหาต่าง ๆ",
    "ฉันสนุกกับการคิดหาวิธีแก้ปัญหาใหม่ๆ",
  ],
  A: [
    "ฉันชอบคิดไอเดียใหม่ๆ ที่แตกต่างจากคนอื่น",
    "ฉันสนใจงานศิลปะ ดนตรี การออกแบบ หรือการแสดง",
    "ฉันชอบแสดงออกถึงความคิดและความรู้สึกของตนเอง",
    "ฉันชอบงานที่เปิดโอกาสให้ใช้จินตนาการ",
    "ฉันสนุกกับการสร้างสรรค์ผลงานใหม่ๆ",
    "ฉันชอบออกแบบหรือจัดตกแต่งสิ่งต่าง ๆ",
    "ฉันชอบเล่าเรื่องหรือสร้างเนื้อหาด้วยตนเอง",
    "ฉันชอบทดลองแนวคิดหรือวิธีการที่แปลกใหม่",
    "ฉันสนใจการสร้างสื่อ ภาพ วิดีโอ หรือผลงานสร้างสรรค์",
    "ฉันชอบกิจกรรมที่ไม่มีคำตอบตายตัว",
  ],
  S: [
    "ฉันชอบช่วยอธิบายบทเรียนให้เพื่อนที่ไม่เข้าใจ",
    "ฉันรู้สึกดีเมื่อได้ช่วยเหลือผู้อื่น",
    "ฉันชอบทำงานร่วมกับคนอื่น",
    "ฉันสนใจรับฟังปัญหาและความคิดเห็นของผู้อื่น",
    "ฉันชอบสอนหรือแบ่งปันความรู้ให้คนรอบตัว",
    "ฉันชอบเข้าร่วมกิจกรรมจิตอาสาหรือกิจกรรมเพื่อสังคม",
    "ฉันชอบให้คำแนะนำแก่เพื่อนเมื่อมีปัญหา",
    "ฉันสนใจอาชีพที่เกี่ยวข้องกับการดูแลหรือพัฒนาผู้คน",
    "ฉันมีความสุขเมื่อเห็นคนอื่นได้รับประโยชน์จากสิ่งที่ฉันทำ",
    "ฉันชอบกิจกรรมที่ได้พบปะและทำความรู้จักผู้คนใหม่ๆ",
  ],
  E: [
    "ฉันชอบเป็นผู้นำในการทำงานกลุ่ม",
    "ฉันกล้าแสดงความคิดเห็นต่อหน้าผู้อื่น",
    "ฉันชอบวางแผนและจัดการกิจกรรมต่าง ๆ",
    "ฉันสนุกกับการนำเสนอหรือโน้มน้าวความคิดเห็นของตนเอง",
    "ฉันชอบการแข่งขันและความท้าทาย",
    "ฉันสนใจเรื่องธุรกิจ การลงทุน หรือการสร้างรายได้",
    "ฉันกล้าตัดสินใจในสถานการณ์สำคัญ",
    "ฉันชอบคิดโครงการหรือกิจกรรมใหม่ๆ",
    "ฉันชอบรับผิดชอบงานที่มีผลต่อคนจำนวนมาก",
    "ฉันสนใจบทบาทหัวหน้าหรือผู้บริหารในอนาคต",
  ],
  C: [
    "ฉันชอบวางแผนก่อนเริ่มทำงาน",
    "ฉันชอบจัดระเบียบเอกสารหรือข้อมูลให้เรียบร้อย",
    "ฉันใส่ใจรายละเอียดของงาน",
    "ฉันชอบทำงานตามขั้นตอนที่กำหนดไว้",
    "ฉันมักตรวจสอบความถูกต้องของงานก่อนส่ง",
    "ฉันชอบจัดตารางเวลาให้กับตนเอง",
    "ฉันชอบงานที่มีกฎเกณฑ์และระบบชัดเจน",
    "ฉันสามารถทำงานที่ต้องใช้ความละเอียดได้ดี",
    "ฉันชอบบันทึกหรือจัดเก็บข้อมูลอย่างเป็นระเบียบ",
    "ฉันรู้สึกสบายใจกับงานที่มีเป้าหมายและขั้นตอนชัดเจน",
  ],
};

const CODES = ["R", "I", "A", "S", "E", "C"];
const PAGE_SIZE = 10;
const TOTAL_PAGES = 6;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// flatten all 6 dimensions into one pool, then shuffle once so the
// category is never guessable from question order or grouping
const allQuestions = CODES.flatMap((code) => QUESTION_BANK[code].map((text) => ({ code, text })));
const questions = shuffle(allQuestions).map((q, i) => ({ id: i + 1, ...q }));
const pages = Array.from({ length: TOTAL_PAGES }, (_, p) => questions.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE));

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
  const [currentPage, setCurrentPage] = useState(0);
  const [invalidId, setInvalidId] = useState(null);
  const refs = useRef({});

  const pageQuestions = pages[currentPage];
  const answeredCount = Object.keys(answers).length;
  const isLastPage = currentPage === TOTAL_PAGES - 1;

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, [currentPage]);

  const handleSelect = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (invalidId === qId) setInvalidId(null);
  };

  const submitResult = () => {
    const scores = CODES.reduce((acc, c) => ({ ...acc, [c]: 0 }), {});
    questions.forEach((q) => { scores[q.code] += answers[q.id] || 0; });
    console.log("คะแนนแต่ละด้าน:", scores);
    navigate("/result");
  };

  const handleNext = () => {
    const unanswered = pageQuestions.find((q) => !answers[q.id]);
    if (unanswered) {
      refs.current[unanswered.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setInvalidId(unanswered.id);
      return;
    }
    if (isLastPage) {
      submitResult();
    } else {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentPage === 0) return;
    setCurrentPage((p) => p - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 relative">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 overflow-auto bg-white relative">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <img src="/image/job.png" alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-white/40" />
        </div>

        <div className="relative z-10">
        {/* ===== หัวข้อและคำอธิบาย ===== */}
        <div className="text-center mb-6 mt-4">
          <h1 className="text-[22px] font-bold text-gray-900 mb-2.5">แบบทดสอบความถนัด</h1>
          <p className="text-[15px] text-gray-700 leading-relaxed">
            โปรดอ่านแต่ละข้อความ และเลือกคำตอบที่ตรงกับความรู้สึกของท่านมากที่สุด โดยไม่ต้องคิดนานเกินไป
            <br />
            (ตอบตามความจริง ไม่ใช่ตามที่คิดว่าควรจะเป็น)
            <br />
            ระดับการตอบ (Likert Scale 5 ระดับ) 1 = ไม่ชอบเลย ... 5 = ชอบมาก
          </p>
        </div>

        {/* ===== สถานะความคืบหน้า ===== */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="flex items-center justify-between text-[13.5px] text-gray-500 mb-2">
            <span>หน้า {currentPage + 1} จาก {TOTAL_PAGES}</span>
            <span>ตอบแล้ว {answeredCount}/{questions.length} ข้อ</span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i < currentPage ? "bg-pink-500" : i === currentPage ? "bg-pink-300" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ===== คำถาม ===== */}
        <div className={`max-w-3xl mx-auto transition-all duration-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="space-y-5">
            {pageQuestions.map((q, idx) => {
              const qNumber = currentPage * PAGE_SIZE + idx + 1;
              return (
                <div
                  key={q.id}
                  ref={(el) => (refs.current[q.id] = el)}
                  className={`p-5 border rounded-2xl transition-all duration-300 backdrop-blur-md bg-white/40 shadow-md ${
                    invalidId === q.id ? "ring-2 ring-rose-300 border-rose-200" : "border-gray-200"
                  }`}
                >
                  <p className="mb-3.5 font-medium text-[15.5px] text-gray-800">
                    {qNumber}. {q.text}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {scale.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => handleSelect(q.id, s.value)}
                        className={`flex-1 px-3.5 py-2.5 rounded-full border text-[15px] transition-all duration-200
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
              );
            })}
          </div>

          {/* ===== ปุ่มนำทาง ===== */}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentPage === 0}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[15.5px] font-semibold transition-all duration-200 ${
                currentPage === 0
                  ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-white/70 border-gray-200 text-gray-800 shadow-md hover:bg-gray-50"
              }`}
            >
              <FaChevronLeft className="text-[12.5px]" />
              ย้อนกลับ
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border text-[15.5px] font-semibold
                bg-white/70 border-gray-200 text-gray-800 shadow-md
                hover:bg-pink-50 hover:border-pink-100 hover:text-pink-600
                transition-all duration-200"
            >
              {isLastPage ? "ส่งคำตอบ" : "ถัดไป"}
              {!isLastPage && <FaChevronRight className="text-[12.5px]" />}
            </button>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}

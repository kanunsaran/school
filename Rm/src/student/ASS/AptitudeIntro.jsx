import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";

export default function AssessmentIntroPage() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);

    useEffect(() => {
        setTimeout(() => setShow(true), 100);
    }, []);

    return (
        <div className="min-h-screen w-full bg-white flex text-gray-900">
            <SidebarNav />

            <div className="flex-1 flex flex-col min-w-0">
                <Header />

                <main className="flex-1 w-full relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-sky-50 flex flex-col items-center justify-center px-6 pt-24 pb-16">

            {/* ===== BLUR CIRCLES ===== */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-pink-300/40 rounded-full blur-3xl" />
            <div className="absolute top-1/3 -right-24 w-96 h-96 bg-rose-300/30 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-fuchsia-200/30 rounded-full blur-3xl" />

            {/* ===== เพิ่มสีเหลือง + ฟ้า ===== */}
            <div className="absolute top-20 left-1/4 w-24 h-24 bg-yellow-300/50 rounded-full blur-2xl" />
            <div className="absolute top-40 right-1/3 w-16 h-16 bg-sky-300/50 rounded-full blur-2xl" />
            <div className="absolute bottom-32 left-20 w-20 h-20 bg-yellow-200/60 rounded-full blur-2xl" />
            <div className="absolute bottom-20 right-16 w-28 h-28 bg-sky-200/50 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-10 w-12 h-12 bg-yellow-300/60 rounded-full blur-xl" />
            <div className="absolute top-2 right-10 w-14 h-14 bg-sky-300/60 rounded-full blur-xl" />

            {/* ===== CONTENT ===== */}
            <div
                className={`relative z-10 max-w-2xl mx-auto text-center
                    transform transition-all duration-700
                    ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-snug">
                    ค้นหาความถนัดของคุณ เพื่อวางแผนอนาคตที่ใช่
                </h1>

                <p className="mt-5 text-gray-600 text-[16px] leading-relaxed whitespace-pre-line">
                    ใช้เวลาเพียงไม่กี่นาที เพื่อค้นหาว่าคุณเหมาะกับเส้นทางแบบไหน{"\n"}
                    ไม่มีคำตอบไหนถูกหรือผิด แค่ตอบจากใจของคุณเอง{"\n"}
                    แล้วมาดูกันว่าคณะหรืออาชีพแบบไหนคือ “ตัวคุณ” ที่สุด
                </p>

                <button style={{backgroundColor: "pink"}}
                    onClick={() => navigate("/aptitudetest")}
                    className="group mt-8 relative px-8 py-3 rounded-full text-[16px] font-medium text-white
                 bg-pink-500 hover:bg-pink-600
                 shadow-[0_8px_20px_-10px_rgba(236,72,153,0.8)]
                 transition-all duration-300
                 hover:scale-105 active:scale-95"
                >
                    <span className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition bg-pink-400" />
                    <span className="relative">เริ่มทำแบบทดสอบ</span>
                </button>
            </div>

            {/* ===== IMAGE (เต็มรูป ไม่ครอป ไม่จาง) ===== */}
            <div className="relative z-10 w-full max-w-4xl mt-8">
                <img src="/image/job.png" alt="" className="w-full h-auto object-contain" />
            </div>
                </main>
            </div>
        </div>
    );
}

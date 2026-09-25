import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SidebarNav from "../../nav.jsx";
import Header from "../../Header";

export default function AssessmentIntroPage() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);

    useEffect(() => {
        setTimeout(() => setShow(true), 100);
    }, []);

    return (
        <div className="h-screen flex overflow-hidden bg-gray-50">
            <Header />
            <SidebarNav />

            <main className="flex-1 min-w-0 w-full pt-16">
                <section className="relative w-full h-[calc(100vh-64px)] overflow-hidden">

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
                    {/* ===== CONTENT (center แล้ว) ===== */}
                    <div
                        className={`relative z-10 max-w-xl mx-auto px-6 pt-16 md:pt-20 text-center
            transform transition-all duration-700
            ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                    >
                        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug">
                            ค้นหาความถนัดของคุณ เพื่อวางแผนอนาคตที่ใช่
                            <br />
                            {/* <span className="text-pink-600">
                                เพื่อวางแผนอนาคตที่ใช่
                            </span> */}
                        </h1>

                        <p className="mt-4 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                            ใช้เวลาเพียงไม่กี่นาที เพื่อค้นหาว่าคุณเหมาะกับเส้นทางแบบไหน{"\n"}
                            ไม่มีคำตอบไหนถูกหรือผิด แค่ตอบจากใจของคุณเอง{"\n"}
                            แล้วมาดูกันว่าคณะหรืออาชีพแบบไหนคือ “ตัวคุณ” ที่สุด
                        </p>

                        <button style={{backgroundColor: "pink"}}
                            onClick={() => navigate("/aptitudetest")}
                            className="group mt-6 relative px-6 py-2 rounded-full text-sm font-medium text-white
                         bg-pink-500 hover:bg-pink-600
                         shadow-[0_8px_20px_-10px_rgba(236,72,153,0.8)]
                         transition-all duration-300
                         hover:scale-105 active:scale-95"
                        >
                            <span className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition bg-pink-400" />
                            <span className="relative">เริ่มทำแบบทดสอบ</span>
                        </button>
                    </div>

                    {/* ===== IMAGE BOTTOM ===== */}
                    {/* ===== IMAGE BOTTOM (เต็มรูป ไม่ blend) ===== */}
                    {/* <div className="absolute bottom-0 w-full h-[45%] md:h-[60%] flex items-end justify-center">
                        <img
                            src="/image/job.png"
                            alt="bg"
                            className="w-full h-full object-contain"
                        />
                    </div> */}
                </section>
            </main>
        </div>
    );
}

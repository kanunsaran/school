import { useState } from "react";
import { Button, Spinner } from "flowbite-react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { saveSession } from "./utils/auth.js";
import { API_BASE_URL } from "./config/api.js";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // ฟังก์ชันสำหรับส่ง User ไปยังหน้าที่ถูกต้องตามสิทธิ์ (Role) — ครูไปหน้าหลักครู นักเรียนไปหน้าหลักนักเรียน
    // (หน้านักเรียนจะเช็คต่อเองว่ากรอกข้อมูลทั่วไป /studentinfo ครบหรือยัง ถ้ายังจะเด้งไปกรอกให้อัตโนมัติ)
    const redirectByRole = (role) => {
        if (role === "teacher") navigate("/TeacherDashboard");
        else navigate("/");
    };

    // เก็บ session ไว้ให้หน้าอื่นๆ ทั่วแอปอ่าน user จริงได้ (แทนค่า user ปลอมแบบตายตัวที่เคยใช้)
    // backend ส่ง id/user_id/fullname/email มาแล้ว (ยืนยันแล้วว่า /auth/login คืน user_id ถูกต้อง)
    const storeSession = (data, email) => {
        saveSession({
            token: data.token,
            role: data.role,
            user_id: data.user_id ?? data.id ?? null,
            name: data.fullname ?? data.name ?? null,
            email: data.email ?? email ?? null,
        });
    };

    // ── 1. Email/Password Login ─────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (res.ok) {
                storeSession(data, email);
                redirectByRole(data.role);
            } else {
                alert(data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
            }
        } catch {
            alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    // ── 2. Google Login ─────────────────────────────────────
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                // ดึง User Profile จาก Google API
                const googleRes = await fetch(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );
                const googleUser = await googleRes.json();

                // ส่งข้อมูลไปให้ Backend (อ้างอิงจากไฟล์ auth.routes.js ของคุณ)
                const res = await fetch(`${API_BASE_URL}/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: googleUser.email,
                        name: googleUser.name,
                        picture: googleUser.picture,
                    }),
                });
                const data = await res.json();

                if (res.ok) {
                    storeSession(data, googleUser.email);
                    redirectByRole(data.role);
                } else {
                    alert(data.message || "Google Login failed");
                }
            } catch {
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Google");
            } finally {
                setLoading(false);
            }
        },
        onError: () => alert("การเข้าสู่ระบบถูกยกเลิก"),
    });

    return (
        <div
            className="min-h-screen w-full relative px-6 flex items-center justify-center font-sans"
            style={{
                backgroundImage: "url('/image/school.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <div className="absolute inset-0 bg-black/50" />

            {/* Logo */}
            <div className="absolute top-2 left-6 z-20">
                <img src="/image/logo3.png" alt="School Logo" className="h-35 w-auto object-contain drop-shadow-md" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[420px] rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/40 shadow-2xl px-8 py-10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h1>
                    <p className="text-sm text-gray-500 mt-2">ยินดีต้อนรับกลับเข้าสู่ระบบ</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase ml-1 mb-1">อีเมล</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@school.ac.th"
                                className="w-full pl-10 pr-4 h-11 rounded-xl bg-white/50 border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase ml-1 mb-1">รหัสผ่าน</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                                <Lock size={18} />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-12 h-11 rounded-xl bg-white/50 border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                            <button
  style={{ backgroundColor: "white", border: "none" }}
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
>
  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
</button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link to="/forgot-password" size="sm" className="text-xs text-blue-700 hover:underline font-medium">
                            ลืมรหัสผ่าน?
                        </Link>
                    </div>

                    <Button
    type="submit"
    disabled={loading}
    className="
        w-full h-11
        !rounded-xl
        !bg-pink-500
        hover:!bg-pink-500
        !text-white
        shadow-[0_8px_20px_-10px_rgba(236,72,153,0.8)]
        transition-all duration-300
        active:scale-[0.98]
    "
>
    {loading ? <Spinner size="sm" className="mr-2" /> : "เข้าสู่ระบบ"}
</Button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-400">หรือ</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {/* Google Button */}
                    <button style={{backgroundColor: "white"}}
                        type="button"
                        onClick={() => handleGoogleLogin()} // ✅ ผูกฟังก์ชันเรียบร้อย
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center gap-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <FcGoogle size={22} />
                        เข้าด้วย Google
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-xs text-gray-500">
                            ยังไม่มีบัญชีผู้ใช้?{" "}
                            <Link to="/register" className="text-blue-700 font-bold hover:underline">
                                ลงทะเบียน
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
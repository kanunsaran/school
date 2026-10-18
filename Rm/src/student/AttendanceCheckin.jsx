import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";
import { checkinAttendance } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";

const PENDING_KEY = "pending_checkin_code";
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const thaiDate = (ymd) => {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  return y ? `${d} ${THAI_MONTHS[m - 1]} ${y + 543}` : "";
};

// หน้าที่เปิดจากการสแกน QR เช็กชื่อ (/checkin?code=123456)
// ยังไม่ล็อกอิน → จำรหัสไว้ ไปหน้าเข้าสู่ระบบ แล้วกลับมาเช็กชื่อให้ต่อ • ล็อกอินแล้ว → ส่งรหัสให้เซิร์ฟเวอร์ตรวจทันที
export default function AttendanceCheckinPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const code = new URLSearchParams(window.location.search).get("code") || "";
  const [state, setState] = useState({ phase: "loading" });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!/^\d{6}$/.test(code)) return setState({ phase: "error", message: "ลิงก์เช็กชื่อไม่ถูกต้อง ลองสแกน QR ใหม่ หรือพิมพ์รหัสในหน้าห้องเรียน" });
    if (!user) {
      try {
        sessionStorage.setItem(PENDING_KEY, code);
      } catch {
        /* เบราว์เซอร์ไม่ให้เก็บข้อมูล — ต้องสแกนใหม่หลังล็อกอิน */
      }
      window.location.replace("/login");
      return;
    }
    if (user.role !== "student") return setState({ phase: "error", message: "หน้านี้สำหรับนักเรียน — ครูดูผลการเช็กชื่อได้ที่หน้าการเข้าเรียน" });
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      /* ไม่เป็นไร */
    }
    checkinAttendance(code)
      .then((r) => setState({ phase: r.already ? "already" : "ok", ...r }))
      .catch((e) => setState({ phase: "error", message: e?.response?.data?.message || "เช็กชื่อไม่สำเร็จ ลองใหม่อีกครั้ง" }));
  }, [code, user]);

  const view = {
    loading: { icon: null, title: "กำลังเช็กชื่อ...", tone: "text-gray-500" },
    ok: { icon: FaCheckCircle, title: "เช็กชื่อสำเร็จ", tone: "text-emerald-500" },
    already: { icon: FaInfoCircle, title: "คุณเช็กชื่อคาบนี้ไปแล้ว", tone: "text-sky-500" },
    error: { icon: FaTimesCircle, title: "เช็กชื่อไม่สำเร็จ", tone: "text-red-400" },
  }[state.phase];
  const Icon = view.icon;

  return (
    <div className="min-h-screen bg-pink-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-pink-100 p-6 text-center">
        {Icon ? <Icon className={`mx-auto ${view.tone}`} size={56} /> : <div className="mx-auto h-14 w-14 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />}
        <h1 className="mt-4 text-[20px] font-bold text-gray-900">{view.title}</h1>
        {(state.phase === "ok" || state.phase === "already") && (
          <p className="mt-1 text-[15px] text-gray-600">
            {state.period ? `${state.period} • ` : ""}
            {thaiDate(state.date)}
          </p>
        )}
        {state.phase === "error" && <p className="mt-1 text-[15px] text-gray-600">{state.message}</p>}
        {user?.name && state.phase !== "loading" && <p className="mt-3 text-[13px] text-gray-400">เข้าสู่ระบบในชื่อ {user.name}</p>}
        {state.phase !== "loading" && (
          <div className="mt-5 flex flex-col gap-2">
            {state.grade_id && (
              <button type="button" onClick={() => navigate(`/studentclassroom/${state.grade_id}`)} className="h-11 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14.5px] font-semibold">
                ไปที่ห้องเรียน
              </button>
            )}
            <button type="button" onClick={() => navigate(user?.role === "teacher" ? "/TeacherDashboard" : "/")} className="h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14.5px] font-medium">
              กลับหน้าหลัก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

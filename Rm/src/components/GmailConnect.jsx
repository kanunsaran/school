import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useGoogleLogin } from "@react-oauth/google";
import { FaEnvelope, FaCheckCircle } from "react-icons/fa";
import { getMailAccount, connectGmailAccount, disconnectGmailAccount } from "../callapi/callapi_user.jsx";

const SCOPE = "openid email https://www.googleapis.com/auth/gmail.send";

// ครูกด "เชื่อมต่อ Gmail" ครั้งเดียว → นัดหมายต่อจากนี้ระบบส่งอีเมลแจ้งนักเรียนจาก Gmail ของครูเองอัตโนมัติ
// ต้องเป็นบัญชี Google เดียวกับอีเมลของครูในระบบ (ตรวจที่ backend)
export default function GmailConnect() {
  const [state, setState] = useState(null); // null = กำลังโหลด
  const [busy, setBusy] = useState(false);

  const load = () =>
    getMailAccount()
      .then(setState)
      .catch(() => setState({ available: false, connected: false, error: true }));
  useEffect(() => {
    load();
  }, []);

  const connect = useGoogleLogin({
    flow: "auth-code",
    scope: SCOPE,
    hint: state?.system_email || undefined,
    onSuccess: async ({ code }) => {
      setBusy(true);
      try {
        const r = await connectGmailAccount(code);
        Swal.fire({ icon: "success", title: "เชื่อมต่อ Gmail แล้ว", text: `นัดหมายต่อจากนี้จะส่งอีเมลแจ้งนักเรียนจาก ${r.email} อัตโนมัติ`, timer: 3000, showConfirmButton: false });
        load();
      } catch (e) {
        Swal.fire({ icon: "error", title: "เชื่อมต่อไม่สำเร็จ", text: e?.response?.data?.message || "ลองใหม่อีกครั้ง" });
      } finally {
        setBusy(false);
      }
    },
    onError: () => Swal.fire({ icon: "error", title: "เชื่อมต่อไม่สำเร็จ", text: "ยกเลิกหรือ Google ไม่อนุญาต ลองใหม่อีกครั้ง" }),
  });

  const disconnect = async () => {
    const ok = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกการเชื่อมต่อ Gmail?",
      text: "ระบบจะไม่ส่งอีเมลแจ้งนัดจาก Gmail ของคุณอัตโนมัติอีก",
      showCancelButton: true,
      confirmButtonText: "ยกเลิกการเชื่อมต่อ",
      cancelButtonText: "ไม่ใช่",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    setBusy(true);
    try {
      await disconnectGmailAccount();
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!state || state.error || !state.available) return null; // ระบบยังไม่ได้ตั้งค่า Google → ใช้แบบเปิด Gmail เอง

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5 text-[14.5px] ${state.connected ? "border-emerald-100 bg-emerald-50/60" : "border-pink-100 bg-pink-50/60"}`}>
      {state.connected ? (
        <>
          <FaCheckCircle className="text-emerald-600 shrink-0" />
          <span className="text-gray-700">
            ส่งอีเมลแจ้งนัดจาก <b>{state.email}</b> อัตโนมัติ
          </span>
          <button type="button" onClick={disconnect} disabled={busy} className="ml-auto text-[13.5px] text-gray-500 hover:text-red-600 bg-transparent !p-0">
            ยกเลิกการเชื่อมต่อ
          </button>
        </>
      ) : (
        <>
          <FaEnvelope className="text-pink-500 shrink-0" />
          <span className="text-gray-700">เชื่อมต่อ Gmail เพื่อให้ระบบส่งอีเมลแจ้งนักเรียนจากอีเมลของคุณทันทีที่นัด</span>
          {!state.system_email ? (
            <span className="text-[13.5px] text-red-600">บัญชีของคุณยังไม่มีอีเมลในระบบ</span>
          ) : (
            <button
              type="button"
              onClick={() => connect()}
              disabled={busy}
              className="ml-auto h-9 px-4 rounded-lg !bg-pink-500 hover:!bg-pink-600 text-white text-[13.5px] font-medium disabled:opacity-50"
            >
              {busy ? "กำลังเชื่อมต่อ..." : `เชื่อมต่อ Gmail (${state.system_email})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

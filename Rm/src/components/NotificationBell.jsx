import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaCalendarAlt, FaClock, FaClipboardCheck, FaUserGraduate, FaCommentDots,
  FaCalendarCheck, FaFileAlt, FaBullhorn, FaInfoCircle, FaCog, FaArrowLeft, FaCheckDouble,
} from "react-icons/fa";
import {
  fetchNotifications, getSeenIds, markSeen, relativeTime, NOTIF_EVENT, NOTIF_TYPES,
  getNotifSettings, saveNotifSettings,
} from "../utils/notifications.js";

// ไอคอน/สีของแต่ละประเภท (ตามแบบ: กล่องสีอ่อน + ไอคอนสีเข้ม)
const LOOK = {
  consult: { icon: FaUserGraduate, box: "bg-emerald-50 text-emerald-600" },
  submit: { icon: FaClipboardCheck, box: "bg-blue-50 text-blue-600" },
  dueToday: { icon: FaClock, box: "bg-amber-50 text-amber-500" },
  dueSoon: { icon: FaCalendarAlt, box: "bg-pink-50 text-pink-500" },
  appointment: { icon: FaCalendarCheck, box: "bg-violet-50 text-violet-600" },
  newWork: { icon: FaFileAlt, box: "bg-sky-50 text-sky-600" },
  activity: { icon: FaBullhorn, box: "bg-indigo-50 text-indigo-500" },
  system: { icon: FaInfoCircle, box: "bg-gray-100 text-gray-500" },
};
const CONSULT_ICON_STUDENT = FaCommentDots;

const PREVIEW_COUNT = 5;

export default function NotificationBell({ user }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("list"); // list | all | settings
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState(() => getSeenIds(user?.user_id));
  const [settings, setSettings] = useState(() => getNotifSettings(user?.user_id));
  const ref = useRef(null);

  // Header สร้าง object ผู้ใช้ใหม่ทุกครั้ง → ผูกกับ id/role เท่านั้น ไม่งั้นโหลดซ้ำทุกการ render
  const uid = user?.user_id;
  const role = user?.role;
  const load = useCallback(async () => {
    if (!uid) return;
    try {
      setItems(await fetchNotifications({ user_id: uid, role }));
    } finally {
      setLoading(false);
    }
  }, [uid, role]);

  // โหลดตอนเปิดหน้า + ทุก 1 นาที + ตอนกลับมาที่แท็บ + ตอนมีแจ้งเตือนระบบใหม่
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener(NOTIF_EVENT, onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(NOTIF_EVENT, onFocus);
    };
  }, [load]);

  // ปิดเมื่อคลิกนอกกล่อง / กด Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !seen.has(n.id));

  const toggle = () => {
    setOpen((v) => !v);
    setView("list");
  };

  const markAllRead = () => {
    markSeen(user.user_id, items.map((n) => n.id));
    setSeen(getSeenIds(user.user_id));
  };

  const openItem = (n) => {
    markSeen(user.user_id, [n.id]);
    setSeen(getSeenIds(user.user_id));
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveNotifSettings(user.user_id, next);
    load();
  };

  const shown = view === "all" ? items : items.slice(0, PREVIEW_COUNT);
  const settingKeys = user?.role === "teacher" ? ["consult", "submit", "dueToday", "dueSoon", "activity", "system"] : ["consult", "appointment", "dueToday", "dueSoon", "newWork", "system"];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`การแจ้งเตือน${unread.length ? ` ${unread.length} รายการใหม่` : ""}`}
        className={`relative w-10 h-10 sm:w-11 sm:h-11 !p-0 rounded-full flex items-center justify-center transition ${
          open ? "bg-pink-100 text-pink-600" : "bg-pink-50 text-pink-500 hover:bg-pink-100"
        }`}
      >
        <FaBell size={19} className={unread.length ? "origin-top animate-[bell_1.2s_ease-in-out_1]" : ""} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-pink-500 text-white text-[11.5px] font-bold leading-5 text-center ring-2 ring-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-[68px] sm:top-14 sm:right-0 sm:w-[380px] z-[70] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <span className="hidden sm:block absolute -top-2 right-4 w-4 h-4 rotate-45 bg-white border-l border-t border-gray-200" />

          {/* หัวกล่อง */}
          <div className="relative flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-gray-100">
            {view === "settings" ? (
              <button type="button" onClick={() => setView("list")} className="flex items-center gap-2 text-[17px] font-bold text-gray-900 bg-transparent !p-0">
                <FaArrowLeft size={13} className="text-gray-400" /> ตั้งค่าการแจ้งเตือน
              </button>
            ) : (
              <div className="text-[18px] font-bold text-gray-900">การแจ้งเตือน</div>
            )}
            {view !== "settings" && items.length > 0 && (
              <div className="flex items-center gap-3">
                {unread.length > 0 && (
                  <button type="button" onClick={markAllRead} title="อ่านทั้งหมดแล้ว" className="text-gray-400 hover:text-pink-600 bg-transparent !p-0">
                    <FaCheckDouble size={14} />
                  </button>
                )}
                {items.length > PREVIEW_COUNT && (
                  <button type="button" onClick={() => setView(view === "all" ? "list" : "all")} className="text-[14.5px] font-semibold text-blue-600 hover:text-blue-700 bg-transparent !p-0">
                    {view === "all" ? "แสดงน้อยลง" : "ดูทั้งหมด"}
                  </button>
                )}
              </div>
            )}
          </div>

          {view === "settings" ? (
            <div className="px-5 py-3 space-y-1 max-h-[60vh] overflow-y-auto">
              <div className="text-[13px] text-gray-500 mb-1">เลือกเรื่องที่ต้องการให้แจ้งเตือน</div>
              {settingKeys.map((k) => {
                const L = LOOK[k];
                const Icon = k === "consult" && user.role !== "teacher" ? CONSULT_ICON_STUDENT : L.icon;
                return (
                  <label key={k} className="flex items-center gap-3 py-2 cursor-pointer">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${L.box}`}>
                      <Icon size={15} />
                    </span>
                    <span className="flex-1 text-[15px] text-gray-800">{k === "consult" && user.role !== "teacher" ? "ครูตอบคำขอปรึกษา" : NOTIF_TYPES[k].label}</span>
                    <input type="checkbox" checked={settings[k] !== false} onChange={(e) => updateSetting(k, e.target.checked)} className="w-5 h-5 accent-pink-500" />
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto overscroll-contain">
              {loading && <div className="px-5 py-8 text-center text-[14.5px] text-gray-400">กำลังโหลด...</div>}
              {!loading && items.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-pink-50 text-pink-400 flex items-center justify-center">
                    <FaBell size={18} />
                  </div>
                  <div className="text-[15px] font-medium text-gray-700">ไม่มีการแจ้งเตือน</div>
                  <div className="text-[13.5px] text-gray-400">เรื่องที่ต้องดำเนินการจะแสดงที่นี่</div>
                </div>
              )}
              {shown.map((n) => {
                const L = LOOK[n.type] || LOOK.system;
                const Icon = n.type === "consult" && user.role !== "teacher" ? CONSULT_ICON_STUDENT : L.icon;
                const isNew = !seen.has(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className={`w-full text-left flex items-start gap-3.5 px-5 py-3.5 transition !rounded-none ${isNew ? "bg-pink-50/40 hover:bg-pink-50" : "bg-white hover:bg-gray-50"}`}
                  >
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${L.box}`}>
                      <Icon size={19} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[15.5px] font-bold text-gray-900 leading-snug">{n.title}</span>
                        <span className="shrink-0 text-[12.5px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                          {n.timeLabel || relativeTime(n.at)}
                          {isNew && <span className="w-2 h-2 rounded-full bg-pink-500" />}
                        </span>
                      </span>
                      <span className="block mt-0.5 text-[14px] text-gray-600 leading-snug whitespace-pre-line break-words">{n.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {view !== "settings" && (
            <button
              type="button"
              onClick={() => setView("settings")}
              className="w-full flex items-center gap-2.5 px-5 py-3 border-t border-gray-100 text-[14.5px] text-gray-600 hover:bg-gray-50 bg-white !rounded-none"
            >
              <FaCog className="text-gray-400" /> ตั้งค่าการแจ้งเตือน
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import {
  getAssAll,
  getAllSubmissions,
  getConsultationRequests,
  getFeedPosts,
  getAppointments,
} from "../callapi/callapi_user.jsx";
import { isConsultationUnread } from "./consultationStore.js";

// แจ้งเตือนมุมขวาบน — แจ้งเฉพาะเรื่องหลักที่ต้องเข้าไปดำเนินการ (ไม่แจ้งทุกความเคลื่อนไหว)
// ครู: คำขอปรึกษาใหม่ ⭐⭐⭐, นักเรียนส่งงาน (รอตรวจ), งานถึงกำหนดวันนี้/ใกล้ถึงกำหนด, กิจกรรม/ประกาศใหม่จากคนอื่น, แจ้งเตือนระบบ
// นักเรียน: ครูตอบคำขอปรึกษา, นัดหมายใหม่, งานที่ยังไม่ส่งที่ถึงกำหนด/ใกล้กำหนด, งานใหม่
// สถานะ "อ่านแล้ว" เก็บในเครื่อง (localStorage) แยกตามผู้ใช้

export const NOTIF_TYPES = {
  consult: { label: "คำขอปรึกษา", priority: 1 },
  submit: { label: "นักเรียนส่งงาน", priority: 2 },
  dueToday: { label: "กำหนดส่งวันนี้", priority: 2 },
  dueSoon: { label: "ใกล้ถึงกำหนดส่ง", priority: 3 },
  appointment: { label: "นัดหมาย", priority: 2 },
  newWork: { label: "งานใหม่", priority: 4 },
  activity: { label: "กิจกรรม/ประกาศใหม่", priority: 5 },
  system: { label: "แจ้งเตือนระบบ", priority: 3 },
};

const DAY = 86400000;
const RECENT_DAYS = 7; // แจ้งเรื่องใหม่ย้อนหลังไม่เกิน 7 วัน

const keyOf = (userId, name) => `notif_${name}_${userId}`;
const readJson = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage เต็ม/ปิดอยู่ ก็ไม่เป็นไร */
  }
};

// ---------- อ่านแล้ว / ตั้งค่า ----------
export const getSeenIds = (userId) => new Set(readJson(keyOf(userId, "seen"), []));
export const markSeen = (userId, ids) => {
  const seen = getSeenIds(userId);
  ids.forEach((id) => seen.add(id));
  writeJson(keyOf(userId, "seen"), [...seen].slice(-500));
};

export const getNotifSettings = (userId) => ({ consult: true, submit: true, dueToday: true, dueSoon: true, appointment: true, newWork: true, activity: true, system: true, ...readJson(keyOf(userId, "settings"), {}) });
export const saveNotifSettings = (userId, settings) => writeJson(keyOf(userId, "settings"), settings);

// ---------- แจ้งเตือนระบบ (เช่น นำเข้าตารางสอน) — เก็บในเครื่อง แล้วกระจายให้กระดิ่งอัปเดตทันที ----------
export const NOTIF_EVENT = "app:notifications-changed";
export const pushSystemNotification = (userId, { title, text, tone = "info", link }) => {
  if (!userId) return;
  const list = readJson(keyOf(userId, "system"), []);
  list.unshift({ id: `sys-${Date.now()}`, title, text, tone, link, at: new Date().toISOString() });
  writeJson(keyOf(userId, "system"), list.slice(0, 20));
  window.dispatchEvent(new Event(NOTIF_EVENT));
};
const systemNotifications = (userId) =>
  readJson(keyOf(userId, "system"), [])
    .filter((n) => Date.now() - new Date(n.at) < RECENT_DAYS * DAY)
    .map((n) => ({ ...n, type: "system" }));

// ---------- ตัวช่วยเวลา ----------
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const daysUntil = (d) => Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
const isRecent = (d) => d && Date.now() - new Date(d) < RECENT_DAYS * DAY;
const timeText = (d) => new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

export const relativeTime = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d);
  if (diff < 0) return timeText(d);
  if (diff < 60000) return "เมื่อสักครู่";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
  const days = -daysUntil(d);
  if (days === 0) return timeText(d);
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันก่อน`;
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

// งานที่มีกำหนดส่งวันนี้ / ภายใน 2 วัน
const deadlineNotes = (assignments, { link, skip } = {}) => {
  const out = [];
  assignments.forEach((a) => {
    if (!a.deadline || (skip && skip(a))) return;
    const due = new Date(a.deadline);
    if (due < new Date()) return; // เลยกำหนดแล้วไม่ต้องเตือน
    const d = daysUntil(due);
    const hasTime = due.getHours() || due.getMinutes();
    if (d === 0) {
      out.push({ id: `due0-${a.ass_id}-${startOfDay(due).getTime()}`, type: "dueToday", title: "กำหนดส่งวันนี้", text: `งาน “${a.title}”\nครบกำหนดส่งวันนี้${hasTime ? ` เวลา ${timeText(due)} น.` : ""}`, at: startOfDay(new Date()).toISOString(), timeLabel: "วันนี้", link: link(a) });
    } else if (d > 0 && d <= 2) {
      out.push({ id: `due${d}-${a.ass_id}-${startOfDay(due).getTime()}`, type: "dueSoon", title: "ใกล้ถึงกำหนดส่ง", text: `งาน “${a.title}”\nกำหนดส่งในอีก ${d} วัน`, at: startOfDay(new Date()).toISOString(), timeLabel: d === 1 ? "พรุ่งนี้" : `อีก ${d} วัน`, link: link(a) });
    }
  });
  return out;
};

// ---------- ครู ----------
const teacherNotifications = async (user) => {
  const [assignments, submissions, consults, posts] = await Promise.all([
    getAssAll().catch(() => []),
    getAllSubmissions().catch(() => []),
    getConsultationRequests({ teacher_user_id: user.user_id }).catch(() => []),
    getFeedPosts().catch(() => []),
  ]);
  const out = [];

  // คำขอปรึกษา: ข้อความล่าสุดมาจากนักเรียนและครูยังไม่ได้เปิดอ่าน → รวมเป็นรายการเดียว
  const waiting = (consults || []).filter((c) => {
    if (c.status === "closed" || c.status === "เสร็จสิ้น") return false;
    const last = c.messages?.[c.messages.length - 1];
    const at = last?.created_at || c.created_at;
    return (!last || last.sender_role === "student") && isConsultationUnread(c.request_id, at);
  });
  if (waiting.length) {
    const latest = waiting.map((c) => c.messages?.[c.messages.length - 1]?.created_at || c.created_at).sort().pop();
    out.push({
      id: `consult-${waiting.map((c) => `${c.request_id}:${c.messages?.length || 0}`).join(",")}`,
      type: "consult",
      title: "นักเรียนขอคำปรึกษาใหม่",
      text: waiting.length === 1 ? `${waiting[0].student_name}: “${waiting[0].subject}”\nรอการตอบกลับ` : `มีนักเรียนขอคำปรึกษา ${waiting.length} รายการ\nรอการตอบกลับ`,
      at: latest,
      link: "/consultations",
    });
  }

  // นักเรียนส่งงาน (ยังไม่ให้คะแนน) ภายใน 7 วัน — รวมตามงาน
  const byAss = {};
  (submissions || []).forEach((s) => {
    const at = s.created_at || s.timestamp;
    if (s.score != null || !isRecent(at)) return;
    (byAss[s.assignment_ass_id] ||= []).push({ ...s, at });
  });
  Object.entries(byAss).forEach(([assId, list]) => {
    const a = (assignments || []).find((x) => String(x.ass_id) === String(assId));
    const latest = list.map((s) => s.at).sort().pop();
    out.push({
      id: `submit-${assId}-${list.length}-${latest}`,
      type: "submit",
      title: "นักเรียนส่งงานใหม่",
      text: `งาน “${a?.title || "ไม่ทราบชื่องาน"}”\nส่งแล้ว ${list.length} คน รอตรวจ`,
      at: latest,
      link: `/work/${assId}`,
    });
  });

  out.push(...deadlineNotes(assignments || [], { link: (a) => `/work/${a.ass_id}` }));

  // กิจกรรม/ประกาศใหม่ที่คนอื่นโพสต์
  (posts || [])
    .filter((p) => String(p.author_id) !== String(user.user_id) && isRecent(p.created_at))
    .slice(0, 5)
    .forEach((p) =>
      out.push({
        id: `post-${p.post_id}`,
        type: "activity",
        title: "กิจกรรมใหม่",
        text: `“${p.title || p.content?.slice(0, 40) || "กิจกรรม"}”\nเพิ่มโดย${p.author_name ? ` ${p.author_name}` : "ผู้ใช้อื่น"}`,
        at: p.created_at,
        link: "/newsfeed",
      })
    );
  return out;
};

// ---------- นักเรียน ----------
const studentNotifications = async (user) => {
  const [assignments, submissions, consults, appts] = await Promise.all([
    getAssAll().catch(() => []),
    getAllSubmissions().catch(() => []),
    getConsultationRequests({ student_user_id: user.user_id }).catch(() => []),
    getAppointments({ student_user_id: user.user_id }).catch(() => []),
  ]);
  const out = [];
  const mine = new Set((submissions || []).filter((s) => String(s.user_user_id) === String(user.user_id)).map((s) => String(s.assignment_ass_id)));

  // ครูตอบคำขอปรึกษา
  (consults || []).forEach((c) => {
    const last = c.messages?.[c.messages.length - 1];
    if (last?.sender_role === "teacher" && isRecent(last.created_at)) {
      out.push({ id: `reply-${c.request_id}-${last.message_id}`, type: "consult", title: "ครูตอบคำขอปรึกษา", text: `หัวข้อ “${c.subject}”\n${last.message_text?.slice(0, 60) || ""}`, at: last.created_at, link: "/studentconsultations" });
    }
  });

  // นัดหมายที่ครูนัดมา (ยังไม่ถึงวัน)
  (appts || [])
    .filter((a) => a.status !== "cancelled" && String(a.created_by_user_id ?? a.teacher_user_id) !== String(user.user_id) && new Date(a.appointment_date) >= startOfDay(new Date()) && isRecent(a.created_at))
    .forEach((a) =>
      out.push({
        id: `appt-${a.appointment_id}`,
        type: "appointment",
        title: "นัดหมายใหม่จากครู",
        text: `${a.note ? `“${a.note}” ` : ""}กับ ${a.teacher_name || "ครู"}\n${new Date(a.appointment_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} เวลา ${String(a.appointment_time).slice(0, 5)} น.`,
        at: a.created_at,
        link: "/studentcalendar",
      })
    );

  const due = deadlineNotes(assignments || [], { link: (a) => `/studentworkdetail/${a.ass_id}`, skip: (a) => mine.has(String(a.ass_id)) });
  out.push(...due);
  const dueIds = new Set(due.map((n) => n.link)); // งานที่เตือนกำหนดส่งแล้ว ไม่ต้องแจ้ง "งานใหม่" ซ้ำ

  (assignments || [])
    .filter((a) => isRecent(a.create_at) && !mine.has(String(a.ass_id)) && !dueIds.has(`/studentworkdetail/${a.ass_id}`))
    .slice(0, 5)
    .forEach((a) => out.push({ id: `new-${a.ass_id}`, type: "newWork", title: "งานใหม่", text: `“${a.title}”${a.deadline ? `\nกำหนดส่ง ${new Date(a.deadline).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}` : ""}`, at: a.create_at, link: `/studentworkdetail/${a.ass_id}` }));
  return out;
};

export const fetchNotifications = async (user) => {
  if (!user?.user_id) return [];
  const settings = getNotifSettings(user.user_id);
  const list = user.role === "teacher" ? await teacherNotifications(user) : await studentNotifications(user);
  return [...list, ...systemNotifications(user.user_id)]
    .filter((n) => settings[n.type] !== false)
    .sort((a, b) => NOTIF_TYPES[a.type].priority - NOTIF_TYPES[b.type].priority || new Date(b.at) - new Date(a.at));
};

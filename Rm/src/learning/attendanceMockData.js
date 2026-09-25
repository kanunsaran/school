// ================================================================
// MOCK DATA — หน้าจัดการการเข้าเรียน (Attendance Management)
// ข้อมูลหลอกทั้งหมดในไฟล์นี้ไว้ใช้ต่อ UI ก่อน ยังไม่เชื่อม backend จริง
// โครงสร้าง field ตั้งชื่อให้ตรงกับ pattern ที่ backend จริงใช้อยู่ในระบบนี้
// (fullname, user_id, grade_idgrade ฯลฯ) เผื่อภายหลังสลับไปดึงจาก API ได้ไม่ต้องแก้ shape เยอะ
// ================================================================

// ---------------- 1. Header / ข้อมูลห้อง ----------------
export const mockClassInfo = {
  grade_idgrade: 1,
  className: "ม.6/5",
  homeroomTeacher: "ครูสุพรรณี ใจดี",
  academicYear: 2569,
  semester: 1,
  currentDate: "2026-07-10",
};

// ---------------- 2. Dashboard สรุปข้อมูล ----------------
export const mockAttendanceSummary = {
  total: 13,
  present: 8,
  presentPercent: 62,
  late: 1,
  leave: 1,
  absent: 2,
  notCheckedIn: 1,
  isCheckInComplete: false, // true = เช็กชื่อครบแล้ว, false = ยังมีคนไม่เช็ก
};

// ---------------- 3. ตัวกรอง (Filter) ----------------
export const mockRoomOptions = [
  { grade_idgrade: 1, label: "ม.6/1" },
  { grade_idgrade: 2, label: "ม.6/2" },
  { grade_idgrade: 3, label: "ม.6/3" },
  { grade_idgrade: 4, label: "ม.6/5" },
];

export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  LATE: "late",
  LEAVE: "leave",
  ABSENT: "absent",
  NOT_CHECKED: "not_checked",
};

export const mockStatusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: ATTENDANCE_STATUS.PRESENT, label: "มาเรียน" },
  { value: ATTENDANCE_STATUS.LATE, label: "สาย" },
  { value: ATTENDANCE_STATUS.LEAVE, label: "ลา" },
  { value: ATTENDANCE_STATUS.ABSENT, label: "ขาด" },
  { value: ATTENDANCE_STATUS.NOT_CHECKED, label: "ยังไม่เช็กชื่อ" },
];

export const mockSortOptions = [
  { value: "number", label: "เลขที่" },
  { value: "name", label: "ชื่อ" },
  { value: "checkinTime", label: "เวลาเช็กชื่อ" },
  { value: "status", label: "สถานะ" },
];

export const CHECKIN_METHOD = {
  QR: "qr",
  GPS: "gps",
  TEACHER: "teacher",
  MANUAL: "manual",
};

// ---------------- 4. ตารางรายชื่อนักเรียน (วันนี้) ----------------
const rawAttendanceRows = [
  {
    attendance_id: 1,
    user_id: 101,
    code: "65001",
    number: 1,
    fullname: "สมชาย ใจกล้า",
    avatar: "https://i.pravatar.cc/80?u=101",
    checkinTime: "07:30",
    method: CHECKIN_METHOD.QR,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 2,
    user_id: 102,
    code: "65002",
    number: 2,
    fullname: "สมหญิง แสนดี",
    avatar: "https://i.pravatar.cc/80?u=102",
    checkinTime: "07:31",
    method: CHECKIN_METHOD.QR,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 3,
    user_id: 103,
    code: "65003",
    number: 3,
    fullname: "กิตติ พูนสวัสดิ์",
    avatar: "https://i.pravatar.cc/80?u=103",
    checkinTime: "07:33",
    method: CHECKIN_METHOD.GPS,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 4,
    user_id: 104,
    code: "65004",
    number: 4,
    fullname: "อรทัย วิชาญศรี",
    avatar: "https://i.pravatar.cc/80?u=104",
    checkinTime: "07:34",
    method: CHECKIN_METHOD.QR,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 5,
    user_id: 105,
    code: "65005",
    number: 5,
    fullname: "ธนากร อนันตกุล",
    avatar: "https://i.pravatar.cc/80?u=105",
    checkinTime: "08:32",
    method: CHECKIN_METHOD.QR,
    status: ATTENDANCE_STATUS.LATE,
    note: "มาสายรถติด",
  },
  {
    attendance_id: 6,
    user_id: 106,
    code: "65006",
    number: 6,
    fullname: "มณีนุช อัคคหาด",
    avatar: "https://i.pravatar.cc/80?u=106",
    checkinTime: "-",
    method: CHECKIN_METHOD.TEACHER,
    status: ATTENDANCE_STATUS.LEAVE,
    note: "ลาป่วย มีใบรับรองแพทย์",
  },
  {
    attendance_id: 7,
    user_id: 107,
    code: "65007",
    number: 7,
    fullname: "ภคพล อนันตคามนึง",
    avatar: "https://i.pravatar.cc/80?u=107",
    checkinTime: "-",
    method: CHECKIN_METHOD.MANUAL,
    status: ATTENDANCE_STATUS.ABSENT,
    note: "",
  },
  {
    attendance_id: 8,
    user_id: 108,
    code: "65008",
    number: 8,
    fullname: "บุรัสกร อนันตกุล",
    avatar: "https://i.pravatar.cc/80?u=108",
    checkinTime: "-",
    method: CHECKIN_METHOD.MANUAL,
    status: ATTENDANCE_STATUS.ABSENT,
    note: "ขาดติดต่อกัน 3 วัน",
  },
  {
    attendance_id: 9,
    user_id: 109,
    code: "65009",
    number: 9,
    fullname: "รินทร์ลดา พรหมศรี",
    avatar: "https://i.pravatar.cc/80?u=109",
    checkinTime: "07:29",
    method: CHECKIN_METHOD.QR,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 10,
    user_id: 110,
    code: "65010",
    number: 10,
    fullname: "ชูศักดิ์ พูนสวัสดิ์",
    avatar: "https://i.pravatar.cc/80?u=110",
    checkinTime: "07:35",
    method: CHECKIN_METHOD.GPS,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 11,
    user_id: 111,
    code: "65011",
    number: 11,
    fullname: "วิจิตรา วิชาญศรี",
    avatar: "https://i.pravatar.cc/80?u=111",
    checkinTime: "07:36",
    method: CHECKIN_METHOD.QR,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 12,
    user_id: 112,
    code: "65012",
    number: 12,
    fullname: "เอกชัย ศรีสุวรรณ",
    avatar: "https://i.pravatar.cc/80?u=112",
    checkinTime: "07:38",
    method: CHECKIN_METHOD.QR,
    status: ATTENDANCE_STATUS.PRESENT,
    note: "",
  },
  {
    attendance_id: 13,
    user_id: 113,
    code: "65013",
    number: 13,
    fullname: "ปิยะดา เกษมสุข",
    avatar: "https://i.pravatar.cc/80?u=113",
    checkinTime: "-",
    method: null,
    status: ATTENDANCE_STATUS.NOT_CHECKED,
    note: "",
  },
];

// เพิ่มอีเมล (สมมติ) ต่อท้ายทีเดียวจากรหัสนักเรียน แทนที่จะพิมพ์ซ้ำในทุกก้อนด้านบน
export const mockAttendanceRows = rawAttendanceRows.map((r) => ({
  ...r,
  email: `${r.code}@ourschool.ac.th`,
}));

// ---------------- 5. Timeline การเช็กชื่อ (เรียงตามเวลา) ----------------
export const mockCheckinTimeline = mockAttendanceRows
  .filter((r) => r.checkinTime !== "-")
  .sort((a, b) => a.checkinTime.localeCompare(b.checkinTime))
  .map((r) => ({ user_id: r.user_id, fullname: r.fullname, time: r.checkinTime, method: r.method }));

// ---------------- 6. นักเรียนที่ยังไม่เช็กชื่อ ----------------
export const mockNotCheckedIn = mockAttendanceRows.filter(
  (r) => r.status === ATTENDANCE_STATUS.NOT_CHECKED
);

// ---------------- 7. สถิติย้อนหลัง ----------------
export const mockAttendanceHistory = {
  dateRange: { from: "2026-06-01", to: "2026-06-30" },
  classSummary: {
    present: 210,
    late: 12,
    leave: 8,
    absent: 6,
  },
  pieData: [
    { status: "มาเรียน", value: 210, color: "#10b981" },
    { status: "สาย", value: 12, color: "#f59e0b" },
    { status: "ลา", value: 8, color: "#ec4899" },
    { status: "ขาด", value: 6, color: "#ef4444" },
  ],
  barData: [
    { date: "2026-06-01", present: 11, late: 1, leave: 0, absent: 0 },
    { date: "2026-06-02", present: 10, late: 0, leave: 1, absent: 1 },
    { date: "2026-06-03", present: 12, late: 0, leave: 0, absent: 0 },
    { date: "2026-06-04", present: 9, late: 1, leave: 1, absent: 1 },
    { date: "2026-06-05", present: 11, late: 0, leave: 0, absent: 1 },
  ],
  lineData: [
    { date: "2026-06-01", attendanceRate: 92 },
    { date: "2026-06-02", attendanceRate: 83 },
    { date: "2026-06-03", attendanceRate: 100 },
    { date: "2026-06-04", attendanceRate: 75 },
    { date: "2026-06-05", attendanceRate: 92 },
  ],
};

// ---------------- 8. รายละเอียดนักเรียน (Drawer) ----------------
export const mockStudentDetail = {
  user_id: 106,
  code: "65006",
  fullname: "มณีนุช อัคคหาด",
  avatar: "https://i.pravatar.cc/160?u=106",
  className: "ม.6/5",
  parentPhone: "081-234-5678",
  totalDays: 30,
  presentDays: 24,
  absentDays: 2,
  leaveDays: 3,
  lateDays: 1,
  attendancePercent: 80,
  editLogs: [
    {
      log_id: 1,
      teacher: "ครูสมหญิง ดีใจ",
      from: ATTENDANCE_STATUS.ABSENT,
      to: ATTENDANCE_STATUS.LEAVE,
      time: "2026-07-09T09:40:00",
    },
    {
      log_id: 2,
      teacher: "ครูสุพรรณี ใจดี",
      from: ATTENDANCE_STATUS.NOT_CHECKED,
      to: ATTENDANCE_STATUS.PRESENT,
      time: "2026-07-08T07:45:00",
    },
  ],
  teacherNotes: [
    { note_id: 1, text: "ลาป่วยบ่อย ควรติดตามอาการ", createdAt: "2026-07-09T10:00:00" },
  ],
};

// ---------------- 9. ระบบแจ้งเตือน ----------------
export const mockAttendanceNotifications = [
  { id: 1, type: "warning", text: "นักเรียนยังไม่เช็กชื่อ 1 คน" },
  { id: 2, type: "danger", text: "นักเรียนขาดเรียน 2 คน" },
  { id: 3, type: "warning", text: "นักเรียนสายเกิน 08:30 จำนวน 1 คน" },
  { id: 4, type: "danger", text: "นักเรียนขาดติดต่อกันเกิน 3 วัน จำนวน 1 คน (บุรัสกร อนันตกุล)" },
  { id: 5, type: "info", text: "มีใบลารออนุมัติ 1 รายการ" },
];

// ---------------- 10. Audit Log (รวมทั้งห้อง) ----------------
export const mockAuditLog = [
  {
    log_id: 1,
    teacher: "ครูสมหญิง ดีใจ",
    fullname: "มณีนุช อัคคหาด",
    from: ATTENDANCE_STATUS.ABSENT,
    to: ATTENDANCE_STATUS.LEAVE,
    time: "2026-07-09T09:40:00",
  },
  {
    log_id: 2,
    teacher: "ครูสุพรรณี ใจดี",
    fullname: "ธนากร อนันตกุล",
    from: ATTENDANCE_STATUS.NOT_CHECKED,
    to: ATTENDANCE_STATUS.LATE,
    time: "2026-07-10T08:35:00",
  },
];

// ---------------- 11. ใบลารออนุมัติ ----------------
export const mockPendingLeaveRequests = [
  {
    leave_id: 1,
    user_id: 106,
    fullname: "มณีนุช อัคคหาด",
    reason: "ลาป่วย มีใบรับรองแพทย์",
    date: "2026-07-10",
    attachmentUrl: null,
    status: "pending", // pending | approved | rejected
  },
];

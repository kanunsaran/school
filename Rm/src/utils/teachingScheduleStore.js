// ค่าคงที่ระดับโรงเรียนสำหรับ "คาบสอนวันนี้" (แดชบอร์ดครู) — ข้อมูลจริงมาจาก backend (/teaching-schedule) ผ่าน callapi_user.jsx แล้ว
// ไฟล์นี้เหลือแค่ตัวเลือกวัน/คาบที่ใช้ทำ dropdown เท่านั้น

// day: 0=จันทร์ ... 4=ศุกร์ (ตรงกับ (date.getDay()+6)%7 ที่ใช้คำนวณ "วันนี้")
export const WEEKDAY_OPTIONS = [
  { value: 0, label: "วันจันทร์" },
  { value: 1, label: "วันอังคาร" },
  { value: 2, label: "วันพุธ" },
  { value: 3, label: "วันพฤหัสบดี" },
  { value: 4, label: "วันศุกร์" },
];

// คาบเรียนตามตารางจริงของโรงเรียนขอนแก่นวิทยายน (9 คาบ)
export const PERIOD_OPTIONS = [
  { period: 1, time: "08:30-09:25" },
  { period: 2, time: "09:25-10:20" },
  { period: 3, time: "10:20-11:15" },
  { period: 4, time: "11:15-12:10" },
  { period: 5, time: "12:10-13:05" },
  { period: 6, time: "13:05-14:00" },
  { period: 7, time: "14:00-14:55" },
  { period: 8, time: "14:55-15:50" },
  { period: 9, time: "16:00-17:00" },
];

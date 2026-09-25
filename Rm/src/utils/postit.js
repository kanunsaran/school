// ตัวช่วยกลาง ใช้ร่วมกันระหว่างหน้า YC ของครู (yc1, yc2) กับของนักเรียน (StudentCommunity)
// กันสีโพสต์อิท/รายชื่อหมวดหมู่ไม่ตรงกันระหว่างสองฝั่ง

// สีพื้นโพสต์อิท — คีย์ต้องตรงกับ POSTIT_TAPE_MAP (ใช้ key เดียวกันเลือกทั้งสีพื้น+เทปพร้อมกัน)
export const POSTIT_COLOR_MAP = {
  pink: "bg-[#FADBE6]",
  yellow: "bg-[#FFF0A6]",
  blue: "bg-[#DDF2F2]",
  mint: "bg-[#CFF2E6]",
  purple: "bg-[#E9DFF7]",
  peach: "bg-[#FFE3D1]",
  lavender: "bg-[#EDE7FE]",
  lemon: "bg-[#FFF9C4]",
  rose: "bg-[#FFE0E9]",
  sky: "bg-[#DCEEFF]",
  sage: "bg-[#E3EFDD]",
  sand: "bg-[#F5EBDD]",
  coral: "bg-[#FFDCD1]",
  teal: "bg-[#D6F5F0]",
};

export const POSTIT_TAPE_MAP = {
  pink: "bg-[#F7B5C9]",
  yellow: "bg-[#FFE073]",
  blue: "bg-[#BFE7FF]",
  mint: "bg-[#BCEBD8]",
  purple: "bg-[#D3C2F0]",
  peach: "bg-[#FFC9A8]",
  lavender: "bg-[#D9CCFC]",
  lemon: "bg-[#FFF176]",
  rose: "bg-[#FFB3C6]",
  sky: "bg-[#AEDBFF]",
  sage: "bg-[#C6E0B4]",
  sand: "bg-[#E8D5B7]",
  coral: "bg-[#FFB8A3]",
  teal: "bg-[#A9E5DC]",
};

// ตัวเลือกสีคงที่ในฟอร์มสร้าง/แก้ไขโพสต์ (นอกจากนี้มีวงกลม "เลือกเอง" แยกต่างหากให้พิมพ์สีอะไรก็ได้)
export const PRESET_COLORS = ["pink", "blue", "yellow"];
export const PRESET_TAPES = ["pink", "blue", "yellow", "mint"];

const COLOR_KEYS = Object.keys(POSTIT_COLOR_MAP);
const TAPE_KEYS = Object.keys(POSTIT_TAPE_MAP);

// คืน { className, style } ให้ใช้กับ div ได้ตรงๆ — รองรับทั้งคีย์ชื่อสี (เช่น "pink") และค่า hex ที่ผู้ใช้เลือกเอง (เช่น "#a3d9ff")
export function getPostitColorStyle(color) {
  if (color && color.startsWith("#")) {
    return { className: "", style: { backgroundColor: color } };
  }
  return { className: POSTIT_COLOR_MAP[color] || POSTIT_COLOR_MAP.pink, style: undefined };
}

export function getPostitTapeStyle(tape) {
  if (tape && tape.startsWith("#")) {
    return { className: "", style: { backgroundColor: tape } };
  }
  return { className: POSTIT_TAPE_MAP[tape] || POSTIT_TAPE_MAP.pink, style: undefined };
}

// อิงจาก post_id เสมอ (ไม่ใช่ index ในลิสต์) โพสต์เดียวกันเลยได้สีเดียวกันทุกหน้า ไม่ว่าจะอยู่ตำแหน่งไหนในลิสต์/ผลค้นหา
// ใช้เป็น fallback สำหรับโพสต์เก่าที่ยังไม่มีสีบันทึกไว้จริงในฐานข้อมูลเท่านั้น
export function getPostitColor(postId) {
  const n = Number(postId) || 0;
  return COLOR_KEYS[n % COLOR_KEYS.length];
}

export function getPostitTape(postId) {
  const n = Number(postId) || 0;
  return TAPE_KEYS[n % TAPE_KEYS.length];
}

// หมวดหมู่ต้องสะกด/ใช้คำเดียวกันทุกหน้า (ครู, นักเรียน, ฟอร์มสร้างโพสต์) ไม่งั้นกรองแล้วไม่เจอกัน
export const POSTIT_CATEGORIES = ["การเรียน", "อาชีพ", "สุขภาพใจ", "ศึกษาต่อ/ทุนเรียน"];

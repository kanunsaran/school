// ================================================================
// หมวดหมู่ที่ครูเพิ่มเองตอนโพสต์ — เก็บในตาราง feed_categories จริงแล้ว (ผ่าน callapi_user.jsx)
// รวมกับ CATEGORY_LIST มาตรฐานตอนใช้งานจริง โดยแคชผลไว้ในหน่วยความจำ (module-level)
// เพราะฟังก์ชัน getAllCategories/getCategoryMetaMap/getFilterOptions ถูกเรียกแบบ sync
// ที่จุดใช้งานเดิมจำนวนมาก — loadFeedCategories() คืออันเดียวที่ต้อง await เพื่อเติมแคชนี้
// ================================================================
import { CATEGORY_LIST } from "../learning/newsFeedMockData.js";
import { getFeedCategories, createFeedCategory } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "./auth.js";

// สีสำหรับหมวดหมู่ที่เพิ่มเอง — ตั้งใจไม่ใช้ pink/amber/emerald/purple/sky/red ซ้ำกับหมวดหมู่มาตรฐาน
const CUSTOM_COLOR_PALETTE = [
  { badge: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  { badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  { badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  { badge: "bg-lime-50 text-lime-700 border-lime-200", dot: "bg-lime-500" },
  { badge: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" },
  { badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { badge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", dot: "bg-fuchsia-500" },
  { badge: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
];

let customCategories = [];

const slugify = (label) => {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `custom_${base || Date.now()}`;
};

// ดึงหมวดหมู่ custom จาก backend มาเติมแคช — เรียกตอน mount ของหน้าที่ใช้งาน (NewsFeed/image เป็นต้น)
export async function loadFeedCategories() {
  try {
    const rows = await getFeedCategories();
    const builtInKeys = new Set(CATEGORY_LIST.map((c) => c.key));
    customCategories = (rows || [])
      // หมวดหมู่มาตรฐาน 6 อันถูก seed เข้าตารางไว้ด้วยแล้ว (ให้เห็นครบตอนเปิดฐานข้อมูลตรง ๆ) แต่สี/ป้ายของอันมาตรฐาน
      // ยังยึดจาก CATEGORY_LIST เป็นหลักเสมอ กันไม่ให้ทับกันเป็นหมวดหมู่ซ้ำในตัวกรอง/สีเพี้ยน
      .filter((r) => !builtInKeys.has(r.category_key))
      .map((r) => {
        const color = CUSTOM_COLOR_PALETTE[(r.color_index ?? 0) % CUSTOM_COLOR_PALETTE.length];
        return { key: r.category_key, label: r.label, badge: color.badge, dot: color.dot };
      });
  } catch (err) {
    console.error("โหลดหมวดหมู่ custom ไม่สำเร็จ:", err);
  }
  return customCategories;
}
// โหลดล่วงหน้าทันทีที่ import โมดูลนี้ครั้งแรก เผื่อหน้าที่ยังไม่ทัน await ก็มีโอกาสได้ข้อมูลอุ่นไว้ก่อน
loadFeedCategories();

// รวมหมวดหมู่มาตรฐาน + ที่ครูเพิ่มเอง → ใช้เป็น source เดียวทั้งตัวกรองด้านบนและป้ายหมวดหมู่บนโพสต์/รูปภาพ
export function getAllCategories() {
  return [...CATEGORY_LIST, ...customCategories];
}

// object map key -> {label, badge, dot} ไว้ lookup หมวดหมู่ของโพสต์เดียว (รองรับหมวดหมู่ custom ด้วย)
export function getCategoryMetaMap() {
  return Object.fromEntries(getAllCategories().map((c) => [c.key, c]));
}

// ตัวเลือกสำหรับตัวกรองด้านบน (มี "ทั้งหมด" นำหน้า) — label ตรงกับป้ายหมวดหมู่บนโพสต์เสมอเพราะดึงจาก source เดียวกัน
export function getFilterOptions() {
  return [{ key: "all", label: "ทั้งหมด" }, ...getAllCategories().map(({ key, label }) => ({ key, label }))];
}

// เพิ่มหมวดหมู่ใหม่จากฝั่งครู คืนค่า key ของหมวดหมู่ (ใช้ชื่อเดิมถ้ามีอยู่แล้วไม่ว่าจะเป็น built-in หรือ custom)
export async function addCustomCategory(label) {
  const trimmed = (label || "").trim();
  if (!trimmed) return null;

  const existing = getAllCategories().find((c) => c.label === trimmed);
  if (existing) return existing.key;

  let key = slugify(trimmed);
  while (customCategories.some((c) => c.key === key) || CATEGORY_LIST.some((c) => c.key === key)) {
    key = `${key}_${Math.floor(Math.random() * 1000)}`;
  }

  const colorIndex = customCategories.length % CUSTOM_COLOR_PALETTE.length;
  const color = CUSTOM_COLOR_PALETTE[colorIndex];

  const row = await createFeedCategory({
    category_key: key,
    label: trimmed,
    color_index: colorIndex,
    created_by_user_id: getCurrentUser()?.user_id,
  });
  const finalKey = row?.category_key || key;
  if (!customCategories.some((c) => c.key === finalKey)) {
    customCategories = [...customCategories, { key: finalKey, label: row?.label || trimmed, badge: color.badge, dot: color.dot }];
  }
  return finalKey;
}

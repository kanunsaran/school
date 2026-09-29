import { useSyncExternalStore } from "react";

// เปิด/ปิดเมนูข้าง (sidebar) บนจอเล็ก — ปุ่ม ☰ อยู่ใน Header ส่วนเมนูอยู่ใน nav.jsx / navstudent.jsx
let open = false;
let mounted = 0; // จำนวน sidebar ที่แสดงอยู่ (หน้าที่ไม่มี sidebar จะไม่โชว์ปุ่ม ☰)
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());

export const setSidebarOpen = (value) => {
  open = typeof value === "function" ? value(open) : value;
  emit();
};

export const toggleSidebar = () => setSidebarOpen((v) => !v);

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSidebarOpen = () => useSyncExternalStore(subscribe, () => open);

export const useHasSidebar = () => useSyncExternalStore(subscribe, () => mounted > 0);

// เรียกใน sidebar: useEffect(registerSidebar, [])
export const registerSidebar = () => {
  mounted += 1;
  emit();
  return () => {
    mounted -= 1;
    if (mounted === 0) open = false;
    emit();
  };
};

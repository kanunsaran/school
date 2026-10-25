import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import flowbiteReact from "flowbite-react/plugin/vite";

// ใช้ backend ของเว็บจริงตอนรันบนเครื่อง: ตั้ง VITE_PROXY_TARGET=http://178.128.58.65:5173 และ VITE_API_URL=/api
// (scripts/dev.sh ตั้งให้เอง) → คำขอ /api/* จาก localhost:5173 ถูกส่งต่อไปเซิร์ฟเวอร์จริง เหมือนที่เว็บจริงเรียก ไม่ติด CORS
const proxyTarget = process.env.VITE_PROXY_TARGET;

// https://vite.dev/config/
export default defineConfig({
  // plugins: [react()],
  plugins: [[react()], tailwindcss(), flowbiteReact()],
  server: proxyTarget ? { proxy: { "/api": { target: proxyTarget, changeOrigin: true } } } : undefined,
})

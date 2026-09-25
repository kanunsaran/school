import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../utils/auth.js";

// เดินหน้าเข้าเพจได้เฉพาะตอน login แล้วเท่านั้น ไม่งั้นเด้งกลับไปหน้า login
// role ระบุได้ (ถ้ามี) เพื่อกันครูเข้าหน้านักเรียนและกลับกัน
export default function RequireAuth({ role, children }) {
  const user = getCurrentUser();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;

  return children;
}

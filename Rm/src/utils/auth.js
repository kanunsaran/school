// เก็บ session ผู้ใช้จริงหลัง login (แทนค่า user ปลอมแบบตายตัว CURRENT_STUDENT_ID/CURRENT_USER_ID/CURRENT_TEACHER ที่กระจายอยู่ทั่วแอป)
// เก็บเป็น localStorage ก้อนเดียว ให้ทุกหน้าอ่านค่าเดียวกันได้ตรงกัน ไม่ต้องเดค token เอง
const SESSION_KEY = "auth_session";

export const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isLoggedIn = () => !!getCurrentUser();

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

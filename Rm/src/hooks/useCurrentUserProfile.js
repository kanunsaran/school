import { useEffect, useState } from "react";
import { getCurrentUser } from "../utils/auth.js";
import { getStudentGeneralInfo, getTeacherGeneralInfo } from "../callapi/callapi_user.jsx";

// ดึงชื่อ+รูปโปรไฟล์จริงของผู้ใช้ที่ login อยู่ ณ ตอนนี้ (ใช้แทนค่าคงที่ CURRENT_TEACHER/CURRENT_USER ที่ hardcode ไว้)
// role นักเรียน/ครู จะไปดึง avatar_url จากตาราง student_general_info / teacher_general_info ตามลำดับ
export default function useCurrentUserProfile() {
  const user = getCurrentUser();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchInfo = user.role === "teacher" ? getTeacherGeneralInfo : user.role === "student" ? getStudentGeneralInfo : null;
    if (!fetchInfo) return;

    fetchInfo(user.user_id)
      .then((data) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      })
      .catch((err) => console.error("โหลดรูปโปรไฟล์ไม่สำเร็จ:", err));
  }, [user?.role, user?.user_id]);

  return { name: user?.name || "", avatarUrl, userId: user?.user_id ?? null, role: user?.role ?? null };
}

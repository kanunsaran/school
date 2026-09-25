import { useParams } from "react-router-dom";
import ClassworkPage from "./work.jsx";
import AttendancePage from "./Attendance.jsx";
import StudentClassmatesPage from "../student/learning/StudentClassmates.jsx";

// wrapper บาง ๆ อ่าน gradeId จาก URL แล้วส่งต่อให้หน้าเดิมในโหมด embedded
// (หน้าเดิม /work /student /attendance /score ยังใช้งานแยกได้ตามปกติ ไม่กระทบกัน)
export function ClassroomWorkTab() {
  const { gradeId } = useParams();
  return <ClassworkPage embedded gradeId={gradeId} />;
}

export function ClassroomStudentsTab() {
  const { gradeId } = useParams();
  return <StudentClassmatesPage embedded gradeId={gradeId} teacherMode />;
}

export function ClassroomAttendanceTab() {
  const { gradeId } = useParams();
  return <AttendancePage embedded gradeId={gradeId} />;
}

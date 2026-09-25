import { useParams } from "react-router-dom";
import ClassworkPage from "./work.jsx";
import StudentListPage from "./students.jsx";
import AttendancePage from "./Attendance.jsx";

// wrapper บาง ๆ อ่าน gradeId จาก URL แล้วส่งต่อให้หน้าเดิมในโหมด embedded
// (หน้าเดิม /work /student /attendance /score ยังใช้งานแยกได้ตามปกติ ไม่กระทบกัน)
export function ClassroomWorkTab() {
  const { gradeId } = useParams();
  return <ClassworkPage embedded gradeId={gradeId} />;
}

export function ClassroomStudentsTab() {
  const { gradeId } = useParams();
  return <StudentListPage embedded gradeId={gradeId} />;
}

export function ClassroomAttendanceTab() {
  const { gradeId } = useParams();
  return <AttendancePage embedded gradeId={gradeId} />;
}

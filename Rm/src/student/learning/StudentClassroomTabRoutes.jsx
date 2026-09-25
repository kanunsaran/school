import { useOutletContext } from "react-router-dom";
import StudentClassworkPage from "./Classwork.jsx";
import StudentClassmatesPage from "./StudentClassmates.jsx";

// wrapper บาง ๆ อ่าน gradeId จาก context ของ StudentClassroomShell แล้วส่งต่อให้หน้าเดิมในโหมด embedded
// (หน้าเดิม /classwork /studentclassmates ยังใช้งานแยกได้ตามปกติ ไม่กระทบกัน)
export function StudentClassroomWorkTab() {
  const { gradeId } = useOutletContext();
  return <StudentClassworkPage embedded gradeId={gradeId} />;
}

export function StudentClassroomClassmatesTab() {
  const { gradeId } = useOutletContext();
  return <StudentClassmatesPage embedded gradeId={gradeId} />;
}

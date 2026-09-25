import { FaRegClipboard, FaQuestionCircle, FaRegFileAlt } from "react-icons/fa";

// สีประจำประเภทโพสต์ ใช้ร่วมกันทุกจุดที่แสดงไอคอน/badge ของ งาน/คำถาม/เนื้อหา
// งาน = ชมพู, คำถาม = ม่วง, เนื้อหา = ฟ้า
export const POST_TYPE_META = {
  assignment: { icon: FaRegClipboard, iconBoxCls: "bg-pink-50 text-pink-500", badgeCls: "bg-pink-50 text-pink-700" },
  question: { icon: FaQuestionCircle, iconBoxCls: "bg-purple-50 text-purple-500", badgeCls: "bg-purple-50 text-purple-700" },
  content: { icon: FaRegFileAlt, iconBoxCls: "bg-blue-50 text-blue-500", badgeCls: "bg-blue-50 text-blue-700" },
};

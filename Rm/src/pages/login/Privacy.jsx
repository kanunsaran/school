import { Link } from "react-router-dom";

// นโยบายความเป็นส่วนตัว — Google ต้องการลิงก์นี้ในหน้าตั้งค่า OAuth ก่อนเปิดให้ทุกคนล็อกอินด้วย Google ได้
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">นโยบายความเป็นส่วนตัว</h1>
        <div className="space-y-3 text-sm leading-relaxed text-gray-700">
          <p>
            ระบบนี้ใช้สำหรับงานแนะแนวและดูแลนักเรียนภายในโรงเรียนเท่านั้น
          </p>
          <p>
            เมื่อเข้าสู่ระบบด้วย Google ระบบจะขอเฉพาะ ชื่อ อีเมล และรูปโปรไฟล์ เพื่อใช้ยืนยันตัวตนและสร้างบัญชีผู้ใช้
            ไม่มีการเข้าถึงข้อมูลอื่นในบัญชี Google ของคุณ
          </p>
          <p>
            ข้อมูลที่กรอกในระบบ เช่น ข้อมูลนักเรียน ผลแบบประเมิน และการนัดหมาย จะเห็นได้เฉพาะตัวนักเรียนและครูที่เกี่ยวข้อง
            ไม่มีการขายหรือส่งต่อข้อมูลให้บุคคลภายนอก
          </p>
          <p>หากต้องการลบบัญชีหรือข้อมูล โปรดติดต่อครูที่ปรึกษาหรือผู้ดูแลระบบของโรงเรียน</p>
        </div>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

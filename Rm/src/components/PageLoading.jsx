// สปินเนอร์กลางจอ ใช้แทนข้อความ "กำลังโหลด..." เดิมที่กระจายอยู่ทุกหน้า ให้หน้าตาเหมือนกันทั้งแอป
export default function PageLoading({ label = "กำลังโหลด...", fullScreen = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-gray-400 ${fullScreen ? "min-h-screen" : "py-16"}`}>
      <div className="w-9 h-9 rounded-full border-[3px] border-pink-100 border-t-pink-500 animate-spin" />
      {label && <div className="text-[14px]">{label}</div>}
    </div>
  );
}

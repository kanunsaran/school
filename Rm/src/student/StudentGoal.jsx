import { useState } from "react";
import SidebarNav from "../nav";
import Header from "../Header";

export default function StudentGoalPage() {
  const [isEditing, setIsEditing] = useState(false);

  const [student, setStudent] = useState({
    name: "นางสาว เจนนิษฐ์ เกือบสุขใจ",
    number: "45",
    class: "6/17",
    goal: "ศิลปกรรมศาสตร์",
    university: "มหาวิทยาลัยศิลปากร คณะศิลปกรรมศาสตร์",
    inspiration:
      "ชอบวาดภาพ ดนตรี และงานออกแบบ มีความคิดสร้างสรรค์",
    gpa: "3.80",
    avatar: "/image/student.png",
  });

  // ✅ state สำรอง (สำหรับ edit mode)
  const [tempStudent, setTempStudent] = useState(student);

  const comments = [
    {
      id: 1,
      teacher: "ครูสุพรรณี",
      time: "28/03/2569 10:30",
      text: "ควรเริ่มทำ Portfolio ได้แล้วนะ",
    },
  ];

  const handleChange = (field, value) => {
    setTempStudent({ ...tempStudent, [field]: value });
  };

  // ✅ อัปโหลดรูป (tap รูป)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setTempStudent({ ...tempStudent, avatar: imageUrl });
  };

  return (
    <div className="flex min-h-screen bg-white">
      <SidebarNav role="student" />

      <div className="flex-1">
        <Header title="เป้าหมายของฉัน" />

        <div className="max-w-6xl mx-auto px-6 pt-24 py-10 space-y-10">

          {/* PROFILE */}
          <div className="bg-white rounded-[28px] p-8 flex items-center gap-6 border border-gray-100 shadow-[0_6px_30px_rgba(0,0,0,0.05)]">

            {/* AVATAR */}
            <div className="relative group">
              <label className="cursor-pointer block">
                <img
                  src={isEditing ? tempStudent.avatar : student.avatar}
                  className="w-28 h-28 rounded-2xl object-cover transition group-hover:brightness-90"
                />

                {isEditing && (
                  <div className="
                    absolute inset-0
                    bg-black/30
                    rounded-2xl
                    flex items-center justify-center
                    text-white text-xs
                    opacity-0 group-hover:opacity-100
                    transition
                  ">
                    เปลี่ยนรูป
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* INFO */}
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold text-gray-800">
                {student.name}
              </h2>

              <p className="text-gray-400 text-sm">
                เลขที่ {student.number} • ห้อง {student.class}
              </p>

              <div className="flex gap-12 mt-3">

                {/* GOAL */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">เป้าหมาย</p>

                  {isEditing ? (
                    <input
                      value={tempStudent.goal}
                      onChange={(e) =>
                        handleChange("goal", e.target.value)
                      }
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">
                      {student.goal}
                    </p>
                  )}
                </div>

                {/* GPA */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">GPA</p>
                  <p className="text-gray-800 font-medium">
                    {student.gpa}
                  </p>
                </div>

              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setTempStudent(student);
                    }}
                    className="px-4 py-2 text-sm rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                  >
                    ยกเลิก
                  </button>

                  <button
                    onClick={() => {
                      setStudent(tempStudent);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-sm rounded-xl bg-pink-500 text-white hover:bg-pink-600 transition"
                  >
                    บันทึก
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setTempStudent(student);
                    setIsEditing(true);
                  }}
                  className="px-4 py-2 text-sm rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  แก้ไข
                </button>
              )}
            </div>

          </div>

          {/* GRID */}
          <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-8">

            {/* LEFT */}
            <div className="space-y-8">

              {/* UNIVERSITY */}
              <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                  🎓 มหาวิทยาลัยที่สนใจ
                </h3>

                {isEditing ? (
                  <input
                    value={tempStudent.university}
                    onChange={(e) =>
                      handleChange("university", e.target.value)
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                  />
                ) : (
                  <p className="text-gray-600 text-sm">
                    {student.university}
                  </p>
                )}
              </div>

              {/* INSPIRATION */}
              <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                  💡 เหตุผล / แรงบันดาลใจ
                </h3>

                {isEditing ? (
                  <textarea
                    value={tempStudent.inspiration}
                    onChange={(e) =>
                      handleChange("inspiration", e.target.value)
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-pink-200"
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {student.inspiration}
                  </p>
                )}
              </div>

            </div>

            {/* RIGHT */}
            <div className="space-y-8">

              {/* ADVICE */}
              <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                  📚 คำแนะนำการศึกษาต่อ
                </h3>

                <ul className="text-sm text-gray-600 space-y-3">
                  <li>• เตรียม Portfolio (สำคัญมาก)</li>
                  <li>• เน้นผลงานศิลปะที่หลากหลาย</li>
                  <li>• ฝึกวาด / ออกแบบ / digital art</li>
                  <li>• เตรียมสัมภาษณ์</li>
                </ul>
              </div>

              {/* COMMENTS */}
              <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                  💬 ความคิดเห็นจากครู
                </h3>

                <div className="space-y-4">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="border border-gray-100 rounded-2xl p-4"
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {c.teacher}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.time}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import Avatar from "../components/Avatar.jsx";

export default function TeacherStudentGoalPage() {
  const [search, setSearch] = useState("");

  // ✅ comment
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);

  const teacherName = "ครูสุพรรณี";

  const student = {
    name: "นางสาว เจนนิษฐ์ เกือนสุขใจ",
    number: "45",
    class: "6/17",
    goal: "ศิลปกรรมศาสตร์",
    gpa: "3.50",
    avatar: null,
  };

  // ✅ filter search
  const filteredStudent =
    student.name.toLowerCase().includes(search.toLowerCase())
      ? student
      : null;

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    const newComment = {
      id: Date.now(),
      text: commentText,
      teacher: teacherName,
      time: new Date().toLocaleString("th-TH"),
    };

    setComments([newComment, ...comments]);
    setCommentText("");
  };

  const handleDelete = (id) => {
    setComments(comments.filter((c) => c.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-whithe">
      <SidebarNav role="teacher" />

      <div className="flex-1">
        <Header title="เป้าหมายของนักเรียน" />

        {/* 🔍 SEARCH TOP */}
        <div className="px-6 pt-24">
          <div className="max-w-6xl mx-auto">
            <div className="
              bg-white
              border border-gray-100
              rounded-2xl
              px-4 py-3
              flex items-center
              shadow-sm
            ">
              <svg
                className="w-4 h-4 text-gray-400 mr-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อนักเรียน..."
                className="w-full text-sm bg-transparent focus:outline-none placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

          {!filteredStudent && (
            <div className="text-center text-gray-400 py-10">
              ไม่พบนักเรียน
            </div>
          )}

          {filteredStudent && (
            <>
              {/* PROFILE */}
              <div className="bg-white rounded-3xl p-7 flex items-center gap-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <Avatar src={student.avatar} name={student.name} size={112} rounded="rounded-2xl" />

                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {student.name}
                  </h2>

                  <p className="text-gray-500 text-sm mt-1">
                    เลขที่ {student.number} • ห้อง {student.class}
                  </p>

                  <div className="flex gap-10 mt-4">
                    <div>
                      <p className="text-xs text-gray-400">เป้าหมาย</p>
                      <p className="font-medium text-gray-800">
                        {student.goal}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">GPA</p>
                      <p className="font-medium text-gray-800">
                        {student.gpa}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID */}
              <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-8">

                {/* LEFT */}
                <div className="space-y-8">

                  <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">
                      🎓 มหาวิทยาลัยที่สนใจ
                    </h3>
                    <p className="text-gray-600 text-sm">
                      มหาวิทยาลัยศิลปากร คณะศิลปกรรมศาสตร์
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">
                      💡 เหตุผล / แรงบันดาลใจ
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      ชอบวาดภาพ ดนตรี และงานออกแบบ มีความคิดสร้างสรรค์
                      และต้องการพัฒนาทักษะด้านศิลปะในระดับมหาวิทยาลัย
                    </p>
                  </div>

                  <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">
                      📈 พัฒนาการเป้าหมาย
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-3">
                      <li>ม.4 → ด้านภาษา</li>
                      <li>ม.5 → ด้านศิลปะ</li>
                      <li>ม.6 → ศิลปกรรมศาสตร์</li>
                    </ul>
                  </div>

                </div>

                {/* RIGHT */}
                <div className="space-y-8">

                  <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
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

                  {/* COMMENT INPUT */}
                  <div className="bg-white rounded-3xl p-7 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800">
                      💬 แสดงความคิดเห็น / คำแนะนำ
                    </h3>

                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="เขียนคำแนะนำสำหรับนักเรียน..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-pink-200"
                    />

                    <button style={{ backgroundColor: "rgba(252, 231, 243, 0.8)" }}
                      onClick={handleAddComment}
                      className="w-full bg-pink-500 text-black rounded-2xl py-3 text-sm font-medium hover:bg-pink-600 active:scale-[0.98] transition"
                    >
                      บันทึกความคิดเห็น
                    </button>
                  </div>

                  {/* COMMENT LIST */}
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {c.teacher}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {c.time}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs text-gray-300 hover:text-red-400"
                          >
                            ลบ
                          </button>
                        </div>

                        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
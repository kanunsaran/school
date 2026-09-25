import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaChalkboardTeacher } from "react-icons/fa";
import SidebarNav from "../../navstudent";
import TeacherSidebarNav from "../../nav.jsx";
import Header from "../../Header";
import PageLoading from "../../components/PageLoading.jsx";
import { getStudent, getEnrollments, getClasses, getStudentGeneralInfo } from "../../callapi/callapi_user.jsx";
import { gradeLabel } from "../../utils/gradeLabel.js";
import { CURRENT_TEACHER } from "../../utils/feedShared.js";
import { initialOf } from "../../utils/avatar.js";
import Avatar from "../../components/Avatar.jsx";

// ⚠️ ยังไม่มีระบบ login จริง ใช้ user_id placeholder เดียวกับหน้านักเรียนอื่น (StudentPortfolio.jsx, yc1.jsx) รอทำ auth จริงค่อยเปลี่ยน
const CURRENT_STUDENT_ID = "1";

// teacherMode=true ใช้หน้าเดียวกันนี้แสดงรายชื่อนักเรียนทั้งห้องฝั่งครู (ไม่ตัดตัวเองออกเหมือนฝั่งนักเรียน) — ใช้จาก /classroom/:id/students
export default function StudentClassmatesPage({ embedded = false, gradeId: propGradeId, teacherMode = false } = {}) {
  const [myGrade, setMyGrade] = useState(null);
  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
        ]);
        const mine = (enrollData || []).find((e) => String(e.user_user_id) === String(CURRENT_STUDENT_ID));
        const gid = propGradeId || mine?.grade_idgrade || null;
        setMyGrade((gradeData || []).find((g) => String(g.idgrade) === String(gid)) || null);

        const classmateIds = new Set(
          (enrollData || [])
            .filter((e) => String(e.grade_idgrade) === String(gid) && (teacherMode || String(e.user_user_id) !== String(CURRENT_STUDENT_ID)))
            .map((e) => String(e.user_user_id))
        );
        setClassmates((studentData || []).filter((s) => classmateIds.has(String(s.user_id))));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [propGradeId, teacherMode]);

  // รูปโปรไฟล์จริงของเพื่อนแต่ละคน — มีก็ใช้จริง ไม่มีก็ให้ Avatar fallback เป็นวงกลมสีชมพู+ตัวอักษรแรก
  const [avatarByUser, setAvatarByUser] = useState({});
  useEffect(() => {
    const toFetch = classmates.filter((s) => !(s.user_id in avatarByUser));
    if (toFetch.length === 0) return;
    Promise.all(
      toFetch.map((s) =>
        getStudentGeneralInfo(s.user_id)
          .then((res) => [s.user_id, res?.avatar_url || null])
          .catch(() => [s.user_id, null])
      )
    ).then((entries) => {
      setAvatarByUser((prev) => {
        const next = { ...prev };
        entries.forEach(([id, url]) => { next[id] = url; });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classmates]);

  const filtered = useMemo(() => {
    let list = classmates;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => (s.fullname || "").toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => (a.fullname || "").localeCompare(b.fullname || "", "th"));
  }, [classmates, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((s) => {
      const letter = initialOf(s.fullname);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter).push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const content = (
    <>
      {!embedded && (
        <div className="mb-5">
          <h1 className="page-title">เพื่อนร่วมชั้น</h1>
          <p className="page-subtitle mt-0.5">{myGrade ? `ห้อง ${gradeLabel(myGrade)}` : "รายชื่อเพื่อนร่วมห้องของคุณ"}</p>
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : (
        <>
          {teacherMode ? (
            <>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-3 mb-5">
                <span className="w-11 h-11 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
                  <FaChalkboardTeacher size={16} />
                </span>
                <div>
                  <div className="text-[14px] text-gray-400">ครูประจำชั้น</div>
                  <div className="text-[15px] font-semibold text-gray-900">{myGrade?.teacher_name || "ยังไม่ระบุ"}</div>
                </div>
              </div>

              <div className="relative w-full sm:w-96 mb-2">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อเพื่อน..."
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-[15px] outline-none focus:border-pink-400"
                />
              </div>
              <div className="text-[14px] text-gray-500 mb-5">นักเรียนในห้อง {classmates.length} คน</div>
            </>
          ) : (
            <>
              <div className="relative w-full sm:w-96 mb-5">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อเพื่อน..."
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-[15px] outline-none focus:border-pink-400"
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-3 mb-5">
                <span className="w-11 h-11 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
                  <FaChalkboardTeacher size={16} />
                </span>
                <div>
                  <div className="text-[14px] text-gray-400">ครูที่ปรึกษา</div>
                  <div className="text-[15px] font-semibold text-gray-900">{CURRENT_TEACHER.name}</div>
                </div>
                <div className="ml-auto text-[14px] text-gray-500">นักเรียนในห้อง {classmates.length} คน</div>
              </div>
            </>
          )}

          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400">ไม่พบเพื่อนร่วมชั้น</div>
          ) : (
            grouped.map(([letter, students]) => (
              <div key={letter} className="mb-5">
                <div className="text-[13px] text-gray-400 mb-2 px-1">{letter}</div>
                <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
                  {students.map((s) => (
                    <div key={s.user_id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar src={avatarByUser[s.user_id]} name={s.fullname} size={36} />
                      <div className="text-[15px] text-gray-800">{s.fullname}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-white flex text-[15px] text-gray-900">
      <Header />
      {teacherMode ? <TeacherSidebarNav /> : <SidebarNav />}

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        {content}
      </main>
    </div>
  );
}

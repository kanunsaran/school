import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import SidebarNav from "../../navstudent";
import Header from "../../Header";

export default function StudentClassmatesPage() {

  const [search, setSearch] = useState("");

  const teachers = useMemo(() => [
    { name: "อาจารย์ชูศักดิ์ พูนสวัสดิ์" },
    { name: "อาจารย์วิจิตรา วิชาญศรี" },
  ], []);

  const [students] = useState([
    { name: "กนกพัฒน์ ธรรมรักษ์" },
    { name: "มณีนุช อัคคหาด" },
    { name: "ภคณ อนันตคามนึง" },
    { name: "บุรศกร อนันตกุล" },
    { name: "รินทร์ลดา พรหมศรี" },
  ]);

  const filteredStudents = students
    .filter(s => s.name.includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  const grouped = filteredStudents.reduce((acc, s) => {
    const l = s.name[0];
    if (!acc[l]) acc[l] = [];
    acc[l].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900">

      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="w-full">

          {/* ✅ เปลี่ยนชื่อหน้า */}
          <div className="mb-8">
            <h1 className="text-[18px] font-medium text-gray-900 tracking-tight">
              เพื่อนในชั้นเรียน
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              นักเรียน {students.length} คน
            </p>
          </div>

          <SectionCard title="ครูผู้สอน">
            {teachers.map((t, i) => (
              <Row key={i} name={t.name} />
            ))}
          </SectionCard>

          <div className="mt-8 mb-4 relative max-w-sm">
            <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อนักเรียน"
              className="
                w-full bg-white border border-gray-200 rounded-xl
                pl-9 pr-3 py-2.5 text-[14px]
                shadow-sm outline-none
                focus:ring-2 focus:ring-gray-200
              "
            />
          </div>

          {Object.keys(grouped).map(letter => (
            <div key={letter} className="mb-6">

              <div className="text-xs text-gray-400 mb-2 px-1">
                {letter}
              </div>

              <div className="bg-white rounded-2xl shadow-sm divide-y">

                {grouped[letter].map((s, i) => (
                  <Row
                    key={i}
                    name={s.name}
                  />
                ))}

              </div>
            </div>
          ))}

        </div>
      </main>
    </div>
  );
}


/* Section */
function SectionCard({ title, children }) {
  return (
    <div className="mb-6">
      <div className="text-xs text-gray-400 mb-2 px-1">{title}</div>
      <div className="bg-white rounded-2xl shadow-sm divide-y">
        {children}
      </div>
    </div>
  );
}


function Row({ name }) {
  return (
    <div className="
      flex items-center justify-between
      px-4 py-3
      hover:bg-gray-50
      transition
    ">

      <div className="flex items-center gap-3">

        <div className="
          w-9 h-9 rounded-full bg-gray-200
          text-gray-600 flex items-center justify-center
          text-[13px] font-medium
        ">
          {name[0]}
        </div>

        <div className="text-[14.5px] text-gray-800">
          {name}
        </div>

      </div>

    </div>
  );
}

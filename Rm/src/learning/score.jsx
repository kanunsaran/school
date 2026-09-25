import { useMemo, useState, useEffect } from "react";
import { FaSearch, FaTrash } from "react-icons/fa";
import Select from "react-select";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getScoreUser, getAssAll } from "../callapi/callapi_user.jsx";
export default function ScorePage({ embedded = false, gradeId } = {}) {
  // ⚠️ ยังกรองตามห้องไม่ได้จริง เพราะ backend คืนคะแนนทั้งโรงเรียนมาเสมอ (ไม่มีคอลัมน์ผูกกับห้องเรียน) และอ้างอิงนักเรียนด้วยชื่อ ไม่ใช่ id — เก็บ prop ไว้ให้พร้อมใช้ทันทีที่ backend รองรับ
  void gradeId;

  const [search, setSearch] = useState("");

  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [topic, setTopic] = useState({ value: "all", label: "หัวข้อทั้งหมด" });

  const [removing, setRemoving] = useState({});

  /* ================= LOAD DATA ================= */

  useEffect(() => {

    const loadData = async () => {

      try {

        const scoreData = await getScoreUser();
        setStudents(scoreData);

        const assData = await getAssAll();
        setAssignments(assData);

      } catch (err) {
        console.error(err);
      }

    };

    loadData();

  }, []);

  /* ================= TOPIC OPTIONS ================= */

  const topicOptions = useMemo(() => {

    const options = assignments.map(a => ({
      value: `c${a.ass_id}`,
      label: a.title,
      max_score: a.max_score
    }));

    return [
      { value: "all", label: "หัวข้อทั้งหมด", max_score: null },
      ...options
    ];

  }, [assignments]);

  const selectedTopic = topicOptions.find(t => t.value === topic.value);

  /* ================= UPDATE SCORE ================= */

  const handleUpdateScore = (name, topicKey, newScore) => {

    setStudents(prev =>
      prev.map(s =>
        s.name === name
          ? {
            ...s,
            scores: {
              ...s.scores,
              [topicKey]: newScore
            }
          }
          : s
      )
    );

  };

  /* ================= DELETE ================= */

  const handleDelete = (name) => {

    const ok = window.confirm(`ลบ "${name}" ใช่ไหม?`);
    if (!ok) return;

    setRemoving(prev => ({ ...prev, [name]: true }));

    setTimeout(() => {

      setStudents(prev => prev.filter(s => s.name !== name));

      setRemoving(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });

    }, 200);

  };

  /* ================= FILTER ================= */

  const filteredStudents = students
    .filter(s => s.name.includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  const grouped = filteredStudents.reduce((acc, s) => {

    const l = s.name[0];

    if (!acc[l]) acc[l] = [];

    acc[l].push(s);

    return acc;

  }, {});

  /* ================= UI ================= */

  const content = (

        <div className="w-full">

          {/* TITLE */}

          {!embedded && (
            <div className="mb-8">

              <h1 className="text-[18px] font-medium">
                คะแนนนักเรียน
              </h1>

              <p className="text-sm text-gray-400">
                {students.length} คน
              </p>

            </div>
          )}

          {embedded && (
            <div className="mb-6 rounded-xl bg-amber-50 text-amber-700 text-[12.5px] px-4 py-2.5">
              แสดงคะแนนของนักเรียนทั้งโรงเรียน เนื่องจากระบบยังไม่รองรับการผูกคะแนนกับห้องเรียนโดยตรง
            </div>
          )}

          {/* SEARCH + FILTER */}

          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">

            <div className="relative max-w-sm w-full">

              <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหานักเรียน"
                className="
                w-full bg-white border border-gray-200 rounded-xl
                pl-9 pr-3 py-2.5 text-sm
                shadow-sm outline-none
                focus:ring-2 focus:ring-gray-200
                "
              />

            </div>

            <Select
              value={topic}
              onChange={setTopic}
              options={topicOptions}
              isSearchable={false}
              className="w-[200px] text-sm"
              styles={{
                control: (base) => ({
                  ...base,
                  borderRadius: "12px",
                  borderColor: "#e5e7eb",
                  boxShadow: "none",
                  minHeight: "38px",
                }),
                menu: (base) => ({
                  ...base,
                  borderRadius: "12px",
                  overflow: "hidden",
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? "#f3f4f6" : "white",
                  color: "#111827",
                }),
              }}
            />

          </div>

          {/* HEADER */}

          <div className="flex justify-between px-4 py-2 text-xs text-gray-400">

            <div>ชื่อ</div>

            <div className="w-[120px] text-right">
              {topic.value === "all"
                ? "รวมคะแนน"
                : `คะแนน / ${selectedTopic?.max_score}`}
            </div>

          </div>

          {/* LIST */}

          {Object.keys(grouped).map(letter => (

            <div key={letter} className="mb-6">

              <div className="text-xs text-gray-400 mb-2 px-1">
                {letter}
              </div>

              <div className="bg-white rounded-2xl shadow-sm divide-y">

                {grouped[letter].map((s, i) => (
                  <Row
                    key={i}
                    student={s}
                    topic={topic}
                    max_score={selectedTopic?.max_score}
                    removing={removing[s.name]}
                    onDelete={() => handleDelete(s.name)}
                    onUpdate={handleUpdateScore}
                  />
                ))}

              </div>

            </div>

          ))}

        </div>

  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900">
      <Header />
      <SidebarNav />
      <main className="flex-1 min-w-0 px-6 md:px-8 pt-24 pb-10 bg-white">
        {content}
      </main>
    </div>
  );

}

/* ================= ROW ================= */

function Row({ student, topic, max_score, onDelete, removing, onUpdate }) {

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const getScore = () => {

    if (topic.value === "all") {

      const vals = Object.values(student.scores);

      return vals.reduce((a, b) => a + b, 0);

    }

    return student.scores[topic.value] ?? "";

  };

  const score = getScore();

  const handleSave = () => {

    if (topic.value === "all") return;

    const num = Number(value);

    if (isNaN(num)) {
      setEditing(false);
      return;
    }

    onUpdate(student.name, topic.value, num);

    setEditing(false);

  };

  const getColor = () => {

    if (score === "") return "text-gray-400";

    if (score >= 8) return "text-green-600";

    if (score >= 5) return "text-yellow-600";

    return "text-red-500";

  };

  return (

    <div className={`
      transition-all duration-200
      ${removing ? "opacity-0 translate-x-3" : "opacity-100"}
    `}>

      <div className="flex justify-between px-4 py-3 hover:bg-gray-50">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
            {student.name[0]}
          </div>

          <div className="text-sm">
            {student.name}
          </div>

        </div>

        <div className="flex items-center gap-4 w-[120px] justify-end">

          {editing ? (

            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-14 text-sm text-center border border-gray-200 rounded-lg"
            />

          ) : (

            <div
              onClick={() => {
                if (topic.value === "all") return;
                setEditing(true);
                setValue(score);
              }}
              className={`text-sm font-medium cursor-pointer ${getColor()}`}
            >
              {score === ""
                ? "-"
                : topic.value === "all"
                  ? score
                  : `${score}/${max_score}`
              }
            </div>

          )}

          <FaTrash
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 cursor-pointer"
            size={14}
          />

        </div>

      </div>

    </div>

  );

}
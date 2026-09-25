import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  FaSearch, FaSlidersH, FaPlus, FaPaperPlane, FaPaperclip, FaRegCalendarAlt, FaCommentDots,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getStudent, getEnrollments, getClasses, getTypeResults, getTypes, getFaculties, getGoals } from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { notAvailableYet } from "../utils/feedShared.js";
import {
  getConsultations, createConsultation, addMessage, CONSULTATION_CATEGORIES, STATUS_META,
} from "../utils/consultationStore.js";

const PAGE_SIZE = 10;

const formatDate = (d) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function ConsultationsPage() {
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [typeResults, setTypeResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const refreshLocal = () => setItems(getConsultations());

  useEffect(() => {
    refreshLocal();
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData, typeResultData, typeData, facultyData, goalData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTypeResults().catch(() => []),
          getTypes().catch(() => []),
          getFaculties().catch(() => []),
          getGoals().catch(() => []),
        ]);
        setStudents(studentData || []);
        setEnrollments(enrollData || []);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setTypeResults(typeResultData || []);
        setTypes(typeData || []);
        setFaculties(facultyData || []);
        setGoals(goalData || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const gradeByUserId = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (!map.has(String(e.user_user_id))) map.set(String(e.user_user_id), e.grade_idgrade);
    });
    return map;
  }, [enrollments]);

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((c) => c.status === "pending").length,
      in_progress: items.filter((c) => c.status === "in_progress").length,
      done: items.filter((c) => c.status === "done").length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    let list = items;
    if (tab !== "all") list = list.filter((c) => c.status === tab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.studentName.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [items, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [tab, search]);

  const selected = items.find((c) => c.id === selectedId) || null;

  const latestTypeResultFor = (userId) =>
    typeResults.filter((r) => String(r.user_user_id) === String(userId)).sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0];
  const latestGoalFor = (userId) =>
    goals.filter((g) => String(g.user_user_id) === String(userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  const selectedTypeResult = selected ? latestTypeResultFor(selected.studentUserId) : null;
  const selectedType = selectedTypeResult ? types.find((t) => String(t.type_id) === String(selectedTypeResult.type_type_id)) : null;
  const selectedFaculty = selectedTypeResult ? faculties.find((f) => String(f.faculty_id) === String(selectedTypeResult.recommended_faculty_id)) : null;
  const selectedGoal = selected ? latestGoalFor(selected.studentUserId) : null;
  const priorConsultCount = selected ? items.filter((c) => c.studentUserId === selected.studentUserId && c.id !== selected.id).length : 0;

  const handleSend = () => {
    if (!selected || !replyText.trim()) return;
    addMessage(selected.id, { sender: "teacher", text: replyText.trim() });
    setReplyText("");
    refreshLocal();
  };

  const handleSimulate = async () => {
    if (students.length === 0) {
      Swal.fire({ icon: "info", title: "ยังไม่มีนักเรียนในระบบ" });
      return;
    }
    const studentOptions = students
      .map((s) => `<option value="${s.user_id}">${s.fullname} (${s.student_code || "-"})</option>`)
      .join("");
    const categoryOptions = CONSULTATION_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
    const { value: formValues } = await Swal.fire({
      title: "จำลองคำขอปรึกษา",
      html: `
        <div style="font-size:12px;color:#9ca3af;text-align:left;margin-bottom:8px;">
          * ระบบยังไม่มีหน้าให้นักเรียนส่งคำขอจริง ปุ่มนี้ไว้ทดสอบ UI โดยเลือกนักเรียนจริงในระบบ
        </div>
        <select id="swal-student" class="swal2-select" style="display:block;width:100%;margin-bottom:.6rem;">${studentOptions}</select>
        <select id="swal-category" class="swal2-select" style="display:block;width:100%;margin-bottom:.6rem;">${categoryOptions}</select>
        <input id="swal-subject" class="swal2-input" placeholder="หัวข้อคำขอ เช่น เลือกคณะไม่ถูก ช่วยแนะนำหน่อยค่ะ">
        <textarea id="swal-message" class="swal2-textarea" placeholder="รายละเอียดคำขอ"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "สร้างคำขอ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#db2777",
      preConfirm: () => {
        const studentUserId = document.getElementById("swal-student").value;
        const category = document.getElementById("swal-category").value;
        const subject = document.getElementById("swal-subject").value.trim();
        const message = document.getElementById("swal-message").value.trim();
        if (!subject || !message) {
          Swal.showValidationMessage("กรอกหัวข้อและรายละเอียดให้ครบ");
          return false;
        }
        return { studentUserId, category, subject, message };
      },
    });
    if (!formValues) return;
    const student = students.find((s) => String(s.user_id) === String(formValues.studentUserId));
    const grade = classesList.find((c) => String(c.id) === String(gradeByUserId.get(String(formValues.studentUserId))));
    createConsultation({
      studentUserId: formValues.studentUserId,
      studentName: student?.fullname || "-",
      roomLabel: grade ? gradeLabel(grade) : "-",
      subject: formValues.subject,
      category: formValues.category,
      message: formValues.message,
    });
    refreshLocal();
  };

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">คำขอปรึกษา</h1>
            <p className="text-[13px] text-gray-500 mt-1">จัดการคำขอคำปรึกษาจากนักเรียน</p>
          </div>
          <button
            type="button"
            onClick={handleSimulate}
            className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13px] font-semibold flex items-center gap-2"
          >
            <FaPlus size={11} /> จำลองคำขอ (ทดสอบ)
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-16">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center text-gray-400">
            <FaCommentDots size={26} className="mx-auto mb-3 text-gray-300" />
            <div className="text-[14px] mb-1">ยังไม่มีคำขอปรึกษาเข้ามา</div>
            <div className="text-[12.5px] text-gray-400 max-w-md mx-auto">
              ระบบยังไม่มีหน้าให้นักเรียนส่งคำขอปรึกษาจริง — กด "จำลองคำขอ (ทดสอบ)" ด้านบนเพื่อทดลองดูหน้าตาการทำงานได้
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-6 items-start">
            {/* ===== ซ้าย: รายการคำขอ ===== */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {[
                  { key: "all", label: "ทั้งหมด" },
                  { key: "pending", label: "รอดำเนินการ" },
                  { key: "in_progress", label: "กำลังดำเนินการ" },
                  { key: "done", label: "เสร็จสิ้น" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors ${
                      tab === t.key ? "bg-pink-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t.label} {counts[t.key]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อนักเรียน หรือหัวข้อ..."
                    className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[13.5px] outline-none focus:border-pink-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => notAvailableYet("ตัวกรองเพิ่มเติม")}
                  className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white text-[12.5px] text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 shrink-0"
                >
                  <FaSlidersH size={11} /> ตัวกรอง
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {paged.map((c) => {
                  const isSelected = selectedId === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`text-left rounded-2xl border p-4 transition ${isSelected ? "border-pink-300 bg-pink-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <img src={`https://i.pravatar.cc/80?u=student-${c.studentUserId}`} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[13.5px] font-semibold text-gray-900 truncate">{c.studentName}</div>
                            <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_META[c.status].cls}`}>{STATUS_META[c.status].label}</span>
                          </div>
                          <div className="text-[11.5px] text-gray-400">{c.roomLabel}</div>
                          <div className="text-[12.5px] text-gray-600 mt-1 truncate">เรื่อง: {c.subject}</div>
                          <div className="text-[11px] text-gray-300 mt-1">{formatDate(c.createdAt)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[13px]">ก่อนหน้า</button>
                  <span className="text-[13px] text-gray-500">หน้า {page} / {totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[13px]">ถัดไป</button>
                </div>
              )}
            </div>

            {/* ===== ขวา: รายละเอียด ===== */}
            <div className="min-w-0 xl:sticky xl:top-24">
              {!selected ? (
                <div className="rounded-2xl border border-gray-200 p-16 text-center text-gray-400">เลือกคำขอปรึกษาเพื่อดูรายละเอียด</div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-[15px] font-semibold text-gray-900">{selected.subject}</div>
                        <div className="text-[12px] text-gray-400 mt-0.5">
                          คำขอจาก: {selected.studentName} · {selected.roomLabel} · วันที่ส่ง: {formatDateTime(selected.createdAt)}
                        </div>
                      </div>
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_META[selected.status].cls}`}>{STATUS_META[selected.status].label}</span>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-[13.5px] text-gray-700 whitespace-pre-line">{selected.message}</p>
                      <span className="inline-block mt-3 text-[11px] font-medium px-2 py-1 rounded-full bg-pink-50 text-pink-600">หมวดหมู่: {selected.category}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-[12px] font-semibold text-gray-700 mb-2">ผลการประเมิน RIASEC</div>
                      {selectedTypeResult ? (
                        <>
                          <div className="text-[13px] font-semibold text-pink-700">{selectedType?.type_name || "-"}</div>
                          <div className="text-[11px] text-gray-400 mt-1">{formatDate(selectedTypeResult.test_date)}</div>
                          {selectedFaculty && <div className="text-[11px] text-gray-500 mt-1">แนะนำ: {selectedFaculty.faculty_name}</div>}
                        </>
                      ) : (
                        <div className="text-[12px] text-gray-400">ยังไม่ได้ทำแบบประเมิน</div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-[12px] font-semibold text-gray-700 mb-2">เป้าหมายของนักเรียน</div>
                      {selectedGoal ? (
                        <>
                          <div className="text-[13px] text-gray-800">{selectedGoal.career_field || "-"}</div>
                          <div className="text-[11px] text-gray-400 mt-1">คณะ: {selectedGoal.faculty_name || "-"}</div>
                        </>
                      ) : (
                        <div className="text-[12px] text-gray-400">ยังไม่ได้ตั้งเป้าหมาย</div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-[12px] font-semibold text-gray-700 mb-2">ประวัติการให้คำปรึกษา</div>
                      {priorConsultCount > 0 ? (
                        <div className="text-[13px] text-gray-800">เคยปรึกษามาแล้ว {priorConsultCount} ครั้ง</div>
                      ) : (
                        <div className="text-[12px] text-gray-400">ยังไม่เคยได้รับคำปรึกษาจากครูแนะแนว</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <div className="text-[13px] font-semibold text-gray-900 mb-3">ประวัติการสนทนา</div>
                    {selected.messages.length === 0 ? (
                      <div className="text-[12.5px] text-gray-400 text-center py-6">ยังไม่มีการตอบกลับ — เริ่มการสนทนาเพื่อให้คำปรึกษาและช่วยเหลือนักเรียน</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {selected.messages.map((m) => (
                          <div key={m.id} className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${m.sender === "teacher" ? "bg-pink-600 text-white ml-auto" : "bg-gray-100 text-gray-800"}`}>
                            <div className="text-[13px] whitespace-pre-line">{m.text}</div>
                            <div className={`text-[10.5px] mt-1 ${m.sender === "teacher" ? "text-pink-100" : "text-gray-400"}`}>{formatDateTime(m.at)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <div className="text-[13px] font-semibold text-gray-900 mb-2">ตอบกลับ / ให้คำปรึกษา</div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="พิมพ์ข้อความตอบกลับ..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-pink-400 resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => notAvailableYet("แนบไฟล์")} className="h-8 px-3 rounded-lg text-[12px] text-gray-500 hover:bg-gray-100 bg-transparent flex items-center gap-1.5">
                          <FaPaperclip size={11} /> แนบไฟล์
                        </button>
                        <button type="button" onClick={() => notAvailableYet("นัดหมาย")} className="h-8 px-3 rounded-lg text-[12px] text-gray-500 hover:bg-gray-100 bg-transparent flex items-center gap-1.5">
                          <FaRegCalendarAlt size={11} /> นัดหมาย
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!replyText.trim()}
                        className="h-9 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[12.5px] font-semibold disabled:opacity-40 flex items-center gap-2"
                      >
                        <FaPaperPlane size={11} /> ส่งข้อความ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

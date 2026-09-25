import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaDownload, FaChevronRight, FaTimes, FaUser } from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getStudent, getEnrollments, getClasses, getTypeResults, getTypes, getFaculties } from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { getAssessments } from "../utils/assessmentStore.js";

const STATUS_META = {
  completed: { label: "เสร็จสิ้น", cls: "bg-emerald-50 text-emerald-700" },
  not_done: { label: "ยังไม่ได้ทำ", cls: "bg-red-50 text-red-600" },
};

const formatDateTime = (d) => (d ? new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function AssessmentResultsPage() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [typeResults, setTypeResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  const customAssessments = useMemo(() => getAssessments(), []);
  const assessmentOptions = useMemo(
    () => [{ id: "holland", title: "Holland Code (RIASEC)" }, ...customAssessments.map((a) => ({ id: a.id, title: a.title }))],
    [customAssessments]
  );

  const [assessmentFilter, setAssessmentFilter] = useState("holland");
  const [roomFilter, setRoomFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData, typeResultData, typeData, facultyData] = await Promise.all([
          getStudent().catch(() => []),
          getEnrollments().catch(() => []),
          getClasses().catch(() => []),
          getTypeResults().catch(() => []),
          getTypes().catch(() => []),
          getFaculties().catch(() => []),
        ]);
        setStudents(studentData || []);
        setEnrollments(enrollData || []);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setTypeResults(typeResultData || []);
        setTypes(typeData || []);
        setFaculties(facultyData || []);
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

  const latestResultByUserId = useMemo(() => {
    const map = new Map();
    typeResults.forEach((r) => {
      const existing = map.get(String(r.user_user_id));
      if (!existing || new Date(r.test_date) > new Date(existing.test_date)) map.set(String(r.user_user_id), r);
    });
    return map;
  }, [typeResults]);

  const isHolland = assessmentFilter === "holland";

  const rows = useMemo(() => {
    let list = students.map((s) => {
      const result = isHolland ? latestResultByUserId.get(String(s.user_id)) : null;
      return {
        student: s,
        gradeId: gradeByUserId.get(String(s.user_id)) ?? null,
        result,
        status: result ? "completed" : "not_done",
      };
    });
    if (roomFilter) list = list.filter((r) => String(r.gradeId) === String(roomFilter));
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.student.fullname?.toLowerCase().includes(q) || r.student.student_code?.toLowerCase?.().includes(q));
    }
    // ไม่ใช่ Holland (แบบประเมินที่สร้างเอง) ยังไม่มีหน้าให้นักเรียนทำจริง เลยไม่มีใครทำเลย — คงรายชื่อไว้ให้เห็นแต่สถานะ "ยังไม่ได้ทำ" ทั้งหมด
    list = list.slice().sort((a, b) => a.student.fullname.localeCompare(b.student.fullname, "th"));
    return list;
  }, [students, gradeByUserId, latestResultByUserId, roomFilter, statusFilter, search, isHolland]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [roomFilter, statusFilter, search, assessmentFilter]);

  const selected = rows.find((r) => r.student.user_id === selectedId) || null;
  const selectedType = selected?.result ? types.find((t) => String(t.type_id) === String(selected.result.type_type_id)) : null;
  const selectedFaculty = selected?.result ? faculties.find((f) => String(f.faculty_id) === String(selected.result.recommended_faculty_id)) : null;
  const selectedGrade = selected?.gradeId ? classesList.find((c) => String(c.id) === String(selected.gradeId)) : null;

  const downloadReport = () => {
    const header = ["รหัสนักเรียน", "ชื่อ-นามสกุล", "ห้อง", "แบบประเมิน", "วันที่ทำ", "สถานะ", "กลุ่มบุคลิกภาพ", "คณะแนะนำ"];
    const csvRows = rows.map((r) => {
      const c = classesList.find((c) => String(c.id) === String(r.gradeId));
      const t = r.result ? types.find((tt) => String(tt.type_id) === String(r.result.type_type_id)) : null;
      const f = r.result ? faculties.find((ff) => String(ff.faculty_id) === String(r.result.recommended_faculty_id)) : null;
      return [
        r.student.student_code || "",
        r.student.fullname || "",
        c ? gradeLabel(c) : "",
        assessmentOptions.find((a) => a.id === assessmentFilter)?.title || "",
        r.result ? formatDateTime(r.result.test_date) : "",
        STATUS_META[r.status].label,
        t?.type_name || "",
        f ? `${f.faculty_name} (${f.university_name})` : "",
      ].map(csvEscape).join(",");
    });
    const csv = "﻿" + [header.map(csvEscape).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ผลการประเมิน_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-900">ผลการประเมิน</h1>
          <p className="text-[13px] text-gray-500 mt-1">ดูผลการประเมินของนักเรียนรายบุคคล</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_460px] gap-6 items-start">
          {/* ===== ซ้าย: รายชื่อ ===== */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <div className="relative flex-1 min-w-45">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อนักเรียน / รหัสนักเรียน" className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[13.5px] outline-none focus:border-pink-400" />
              </div>
              <select value={assessmentFilter} onChange={(e) => setAssessmentFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400">
                {assessmentOptions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
              <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400">
                <option value="">ทุกห้อง</option>
                {classesList.map((c) => <option key={c.id} value={c.id}>{gradeLabel(c)}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-pink-400">
                <option value="">สถานะ: ทั้งหมด</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="not_done">ยังไม่ได้ทำ</option>
              </select>
              <button type="button" onClick={downloadReport} className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13px] font-semibold flex items-center gap-2">
                <FaDownload size={11} /> ดาวน์โหลด
              </button>
            </div>

            <div className="mb-2 text-[13px] text-gray-500">พบนักเรียน {rows.length} คน</div>

            {!isHolland && (
              <div className="mb-3 rounded-xl bg-amber-50 text-amber-700 text-[12.5px] px-4 py-2.5">
                แบบประเมินนี้เป็นแบบที่สร้างเอง ระบบยังไม่มีหน้าให้นักเรียนทำจริง จึงยังไม่มีผู้ทำ
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {loading ? (
                <div className="text-center text-gray-400 py-14">กำลังโหลด...</div>
              ) : paged.length === 0 ? (
                <div className="text-center text-gray-400 py-14 text-[13px]">ไม่พบนักเรียน</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {paged.map((r, i) => {
                    const c = classesList.find((cc) => String(cc.id) === String(r.gradeId));
                    const isSelected = selectedId === r.student.user_id;
                    return (
                      <button
                        type="button"
                        key={r.student.user_id}
                        onClick={() => setSelectedId(r.student.user_id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 bg-white"}`}
                      >
                        <div className="text-[12px] text-gray-400 w-5 shrink-0">{(page - 1) * PAGE_SIZE + i + 1}</div>
                        <img src={`https://i.pravatar.cc/80?u=student-${r.student.user_id}`} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] font-medium text-gray-900 truncate">{r.student.fullname}</div>
                          <div className="text-[11.5px] text-gray-400">{r.student.student_code}</div>
                        </div>
                        <div className="text-[12px] text-gray-500 w-20 shrink-0">{c ? gradeLabel(c) : "-"}</div>
                        <div className="text-[11.5px] text-gray-500 w-28 shrink-0">{r.result ? formatDateTime(r.result.test_date) : "-"}</div>
                        <span className={`text-[11px] font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_META[r.status].cls}`}>{STATUS_META[r.status].label}</span>
                        <FaChevronRight className="text-gray-300 shrink-0" size={11} />
                      </button>
                    );
                  })}
                </div>
              )}
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
          <div className="rounded-2xl border border-gray-200 bg-white p-6 xl:sticky xl:top-24">
            {!selected ? (
              <div className="text-center text-gray-400 py-16 flex flex-col items-center gap-2">
                <FaUser size={22} className="text-gray-300" />
                เลือกนักเรียนเพื่อดูผลการประเมิน
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[14px] font-semibold text-gray-900">ผลการประเมินของนักเรียน</div>
                  <button type="button" onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent">
                    <FaTimes size={13} />
                  </button>
                </div>

                <div className="flex items-start gap-3 mb-5">
                  <img src={`https://i.pravatar.cc/120?u=student-${selected.student.user_id}`} className="w-16 h-16 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[16px] font-bold text-gray-900">{selected.student.fullname}</div>
                    <div className="text-[12.5px] text-gray-500">รหัสนักเรียน {selected.student.student_code} {selectedGrade && `· ชั้น ${gradeLabel(selectedGrade)}`}</div>
                    <button type="button" onClick={() => navigate("/student")} className="text-[12px] text-pink-600 hover:underline bg-transparent mt-1">ดูโปรไฟล์นักเรียน →</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[12.5px] mb-5">
                  <InfoBox label="แบบประเมิน" value={assessmentOptions.find((a) => a.id === assessmentFilter)?.title} />
                  <InfoBox label="วันที่ทำ" value={selected.result ? formatDateTime(selected.result.test_date) : "-"} />
                </div>

                {!selected.result ? (
                  <div className="rounded-xl bg-gray-50 text-gray-400 text-[13px] px-4 py-6 text-center">นักเรียนคนนี้ยังไม่ได้ทำแบบประเมินนี้</div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-5 mb-4">
                      <div className="text-[13px] text-pink-700/70 mb-1">กลุ่มบุคลิกภาพที่ได้</div>
                      <div className="text-[19px] font-bold text-pink-800">{selectedType?.type_name || "-"}</div>
                      {selectedType?.description && <p className="text-[12.5px] text-gray-600 mt-2">{selectedType.description}</p>}
                    </div>

                    {selectedFaculty && (
                      <div className="rounded-2xl border border-gray-200 p-4 mb-4">
                        <div className="text-[12.5px] text-gray-500 mb-1">คณะ/มหาวิทยาลัยแนะนำ</div>
                        <div className="text-[14px] font-semibold text-gray-900">{selectedFaculty.faculty_name}</div>
                        <div className="text-[12.5px] text-gray-500">{selectedFaculty.university_name}</div>
                      </div>
                    )}

                    <div className="text-[11.5px] text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
                      ระบบยังไม่ได้เก็บคะแนนแยกราย 6 มิติ (RIASEC) ต่อคำถาม จึงยังแสดงกราฟเรดาร์แบบละเอียดไม่ได้ — แสดงเฉพาะกลุ่มบุคลิกภาพหลักที่สรุปผลได้จริงเท่านั้น
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <div className="text-gray-400">{label}</div>
      <div className="text-gray-800 font-medium truncate">{value}</div>
    </div>
  );
}

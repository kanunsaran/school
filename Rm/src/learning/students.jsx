import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaSearch, FaSlidersH, FaDownload, FaPrint, FaTimes, FaChevronDown, FaEnvelope, FaChalkboardTeacher, FaBullseye, FaUniversity,
  FaBrain, FaUserFriends, FaCalendarCheck, FaStickyNote, FaCommentDots, FaIdCard,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  getStudent, getEnrollments, getClasses, getAssAll, getAllSubmissions,
  getGoals, getTypeResults, getTypes, getFaculties, getStudentAttendanceSummary,
} from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { notAvailableYet } from "../utils/feedShared.js";

const PAGE_SIZE = 20;

const STATUS_META = {
  normal: { label: "ปกติ", cls: "bg-emerald-50 text-emerald-700" },
  watch: { label: "ต้องติดตาม", cls: "bg-amber-50 text-amber-700" },
  risk: { label: "เสี่ยง", cls: "bg-red-50 text-red-700" },
  unknown: { label: "ยังไม่มีข้อมูล", cls: "bg-gray-100 text-gray-500" },
};

// สถานะยังไม่มีคอลัมน์จริงในระบบ เลยคำนวณจาก % การมาเรียนแทน (proxy ที่ยังไม่ใช่ค่าที่ครูตั้งเองได้)
const statusFromAttendance = (pct) => {
  if (pct == null) return "unknown";
  if (pct >= 90) return "normal";
  if (pct >= 70) return "watch";
  return "risk";
};

const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const notYetBirthday = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (notYetBirthday) age -= 1;
  return age;
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "-");

const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// 7 หมวดตามภาพอ้างอิง — มีข้อมูลจริงแค่บางฟีลด์ในหมวด "ข้อมูลพื้นฐาน" (ชื่อ/วันเกิด/อายุ/รหัส/อีเมล) นอกนั้นระบบยังไม่มีคอลัมน์เก็บ
// จึงขึ้น "ยังไม่มีข้อมูลในระบบ" ตรงๆ แทนการมั่วข้อมูล
const GENERAL_INFO_SECTIONS = [
  { key: "basic", title: "ข้อมูลพื้นฐาน", desc: "ชื่อ-สกุล, วันเกิด, อายุ, เพศ, สัญชาติ, ศาสนา, กรุ๊ปเลือด, น้ำหนัก, ส่วนสูง" },
  { key: "family", title: "ข้อมูลครอบครัว", desc: "บิดา, มารดา, ผู้ปกครอง, พี่น้อง" },
  { key: "address", title: "ที่อยู่", desc: "ที่อยู่ตามทะเบียนบ้านและที่อยู่ปัจจุบัน" },
  { key: "prevEdu", title: "ประวัติการศึกษาเดิม", desc: "ระดับชั้น, ชื่อสถานศึกษาเดิม, ผลการเรียนเดิม, วิชาที่ชอบ/ไม่ชอบ" },
  { key: "health", title: "ข้อมูลสุขภาพ", desc: "โรคประจำตัว, แพ้ยา, ประวัติการรักษา, น้ำหนัก, ส่วนสูง, การนอน" },
  { key: "interest", title: "ความสนใจและความสามารถพิเศษ", desc: "งานอดิเรก, ความสนใจ, ความสามารถพิเศษ, รางวัลที่ได้รับ" },
  { key: "extra", title: "ข้อมูลเพิ่มเติม", desc: "ข้อมูลอื่น ๆ ที่เกี่ยวข้องกับนักเรียน" },
];

const DETAIL_TABS = [
  { key: "info", label: "ข้อมูลทั่วไป", icon: FaIdCard },
  { key: "goal", label: "เป้าหมาย", icon: FaBullseye },
  { key: "grades", label: "ผลการเรียน", icon: FaUniversity },
  { key: "attendance", label: "การเช็คชื่อ", icon: FaCalendarCheck },
  { key: "activity", label: "กิจกรรม", icon: FaUserFriends },
  { key: "holland", label: "แบบประเมิน (Holland)", icon: FaBrain },
  { key: "counseling", label: "การให้คำปรึกษา", icon: FaCommentDots },
  { key: "notes", label: "บันทึกเพิ่มเติม", icon: FaStickyNote },
];

export default function StudentListPage({ embedded = false, gradeId: propGradeId } = {}) {
  const [searchParams] = useSearchParams();
  const gradeFilter = propGradeId || searchParams.get("gradeId") || "";

  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState(gradeFilter);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [openInfoSections, setOpenInfoSections] = useState(new Set());
  const toggleInfoSection = (key) => {
    setOpenInfoSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (embedded && propGradeId) setRoomFilter(String(propGradeId));
  }, [embedded, propGradeId]);

  const [allStudents, setAllStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [typeResults, setTypeResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentData, enrollData, gradeData, assData, subData, goalData, typeResultData, typeData, facultyData] =
          await Promise.all([
            getStudent().catch(() => []),
            getEnrollments().catch(() => []),
            getClasses().catch(() => []),
            getAssAll().catch(() => []),
            getAllSubmissions().catch(() => []),
            getGoals().catch(() => []),
            getTypeResults().catch(() => []),
            getTypes().catch(() => []),
            getFaculties().catch(() => []),
          ]);
        setAllStudents(studentData || []);
        setEnrollments(enrollData || []);
        setClassesList((gradeData || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade })));
        setAssignments(assData || []);
        setSubmissions(subData || []);
        setGoals(goalData || []);
        setTypeResults(typeResultData || []);
        setTypes(typeData || []);
        setFaculties(facultyData || []);
      } catch (err) {
        console.error("โหลดข้อมูลนักเรียนไม่สำเร็จ:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // เกรดที่นักเรียนแต่ละคน enroll อยู่จริง (เอาแถวแรกถ้ามีมากกว่าหนึ่ง)
  const gradeByUserId = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (!map.has(String(e.user_user_id))) map.set(String(e.user_user_id), { gradeId: e.grade_idgrade, seatNo: e.seat_no });
    });
    return map;
  }, [enrollments]);

  const maxScoreByAssId = useMemo(
    () => Object.fromEntries(assignments.map((a) => [String(a.ass_id), Number(a.max_score) || 0])),
    [assignments]
  );

  const computeScorePct = (userId) => {
    const mine = submissions.filter((s) => String(s.user_user_id) === String(userId) && s.score != null);
    if (mine.length === 0) return null;
    let sumScore = 0, sumMax = 0;
    mine.forEach((s) => {
      const max = maxScoreByAssId[String(s.assignment_ass_id)];
      if (max) { sumScore += Number(s.score); sumMax += max; }
    });
    return sumMax > 0 ? Math.round((sumScore / sumMax) * 100) : null;
  };

  // ===== attendance summary รายคน โหลดแบบ lazy เฉพาะคนที่กำลังแสดงในหน้านี้ + cache ไว้ ไม่โหลดซ้ำ =====
  const [attendanceByUser, setAttendanceByUser] = useState({});

  const students = useMemo(() => {
    let list = allStudents.map((s) => {
      const enroll = gradeByUserId.get(String(s.user_id));
      return { ...s, gradeId: enroll?.gradeId ?? null, seatNo: enroll?.seatNo ?? null };
    });
    if (roomFilter) list = list.filter((s) => String(s.gradeId) === String(roomFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.fullname?.toLowerCase().includes(q) || s.student_code?.toLowerCase?.().includes(q));
    }
    list = list.slice().sort((a, b) => (a.fullname || "").localeCompare(b.fullname || "", "th"));
    if (statusFilter) {
      list = list.filter((s) => {
        const att = attendanceByUser[s.user_id];
        const pct = att && att.totalDays > 0 ? Math.round((Number(att.presentDays) / Number(att.totalDays)) * 100) : null;
        return statusFromAttendance(pct) === statusFilter;
      });
    }
    return list;
  }, [allStudents, gradeByUserId, roomFilter, search, statusFilter, attendanceByUser]);

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pagedStudents = useMemo(
    () => students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [students, page]
  );

  useEffect(() => { setPage(1); }, [roomFilter, search, statusFilter]);

  useEffect(() => {
    if (!pagedStudents.length) return;
    const toFetch = pagedStudents.filter((s) => s.gradeId && !(s.user_id in attendanceByUser));
    if (toFetch.length === 0) return;
    Promise.all(
      toFetch.map((s) =>
        getStudentAttendanceSummary(s.user_id, s.gradeId)
          .then((res) => [s.user_id, res])
          .catch(() => [s.user_id, null])
      )
    ).then((entries) => {
      setAttendanceByUser((prev) => {
        const next = { ...prev };
        entries.forEach(([id, res]) => { next[id] = res; });
        return next;
      });
    });
  }, [pagedStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId && pagedStudents.length > 0) setSelectedId(pagedStudents[0].user_id);
  }, [pagedStudents, selectedId]);

  const selectedStudent = students.find((s) => s.user_id === selectedId) || pagedStudents[0] || null;

  // ครูที่ปรึกษา — เอาจากชื่อครูของห้องที่นักเรียนคนนี้ enroll อยู่ (field จริงในตาราง grade)
  const selectedTeacherName = useMemo(() => {
    if (!selectedStudent?.gradeId) return null;
    return classesList.find((c) => String(c.id) === String(selectedStudent.gradeId))?.teacher_name || null;
  }, [selectedStudent, classesList]);

  const selectedGradeLabel = useMemo(() => {
    if (!selectedStudent?.gradeId) return null;
    const c = classesList.find((c) => String(c.id) === String(selectedStudent.gradeId));
    return c ? gradeLabel(c) : null;
  }, [selectedStudent, classesList]);

  const selectedAttendance = selectedStudent ? attendanceByUser[selectedStudent.user_id] : null;
  const selectedAttendancePct =
    selectedAttendance && Number(selectedAttendance.totalDays) > 0
      ? Math.round((Number(selectedAttendance.presentDays) / Number(selectedAttendance.totalDays)) * 100)
      : null;
  const selectedStatus = statusFromAttendance(selectedAttendancePct);
  const selectedScorePct = selectedStudent ? computeScorePct(selectedStudent.user_id) : null;

  const selectedGoal = selectedStudent
    ? goals.filter((g) => String(g.user_user_id) === String(selectedStudent.user_id)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    : null;

  const selectedTypeResult = selectedStudent
    ? typeResults.filter((r) => String(r.user_user_id) === String(selectedStudent.user_id)).sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0]
    : null;
  const selectedType = selectedTypeResult ? types.find((t) => String(t.type_id) === String(selectedTypeResult.type_type_id)) : null;
  const selectedRecommendedFaculty = selectedTypeResult
    ? faculties.find((f) => String(f.faculty_id) === String(selectedTypeResult.recommended_faculty_id))
    : null;

  const selectedSubmissions = selectedStudent
    ? submissions.filter((s) => String(s.user_user_id) === String(selectedStudent.user_id) && s.score != null)
    : [];

  const toggleCheck = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCheckAll = () => {
    setCheckedIds((prev) => (prev.size === pagedStudents.length ? new Set() : new Set(pagedStudents.map((s) => s.user_id))));
  };

  const exportTargets = checkedIds.size > 0 ? students.filter((s) => checkedIds.has(s.user_id)) : students;

  const getGoalFor = (userId) =>
    goals.filter((g) => String(g.user_user_id) === String(userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const getTypeResultFor = (userId) =>
    typeResults.filter((r) => String(r.user_user_id) === String(userId)).sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0];

  // หัวคอลัมน์ + ค่าต่อคนของแต่ละหมวด ใช้ร่วมกันทั้ง CSV (ตาราง) และ PDF (การ์ดโปรไฟล์ต่อคน)
  const CATEGORY_HEADERS = {
    personal: ["ห้อง", "เลขที่", "อีเมล", "วันเกิด", "อายุ"],
    goal: ["เป้าหมาย", "สายอาชีพที่สนใจ", "คณะที่อยากเข้า"],
    academic: ["คะแนนเฉลี่ย(%)"],
    attendance: ["การมาเรียน(%)", "สถานะ"],
    holland: ["กลุ่มบุคลิกภาพ", "คณะแนะนำ"],
  };
  const CATEGORY_VALUES = {
    personal: (s) => {
      const c = classesList.find((cc) => String(cc.id) === String(s.gradeId));
      return [c ? gradeLabel(c) : "-", s.seatNo ?? "-", s.email || "-", s.dob ? formatDate(s.dob) : "-", s.dob ? `${ageFromDob(s.dob)} ปี` : "-"];
    },
    goal: (s) => {
      const goal = getGoalFor(s.user_id);
      return [goal?.goal_text || "-", goal?.career_field || "-", goal?.faculty_name || "-"];
    },
    academic: (s) => {
      const pct = computeScorePct(s.user_id);
      return [pct != null ? pct : "-"];
    },
    attendance: (s) => {
      const att = attendanceByUser[s.user_id];
      const attPct = att && Number(att.totalDays) > 0 ? Math.round((Number(att.presentDays) / Number(att.totalDays)) * 100) : null;
      return [attPct != null ? attPct : "-", STATUS_META[statusFromAttendance(attPct)].label];
    },
    holland: (s) => {
      const tr = getTypeResultFor(s.user_id);
      const type = tr ? types.find((t) => String(t.type_id) === String(tr.type_type_id)) : null;
      const fac = tr ? faculties.find((f) => String(f.faculty_id) === String(tr.recommended_faculty_id)) : null;
      return [type?.type_name || "ยังไม่ได้ทำ", fac ? `${fac.faculty_name} (${fac.university_name})` : "-"];
    },
  };

  const EXPORT_CATEGORIES = [
    { key: "personal", label: "ข้อมูลทั่วไป", available: true },
    { key: "goal", label: "เป้าหมายการศึกษาต่อ", available: true },
    { key: "academic", label: "ผลการเรียน", available: true },
    { key: "attendance", label: "การมาเรียน / เช็คชื่อ", available: true },
    { key: "holland", label: "แบบประเมิน Holland", available: true },
    { key: "counseling", label: "บันทึกการให้คำปรึกษา", available: false },
  ];

  const [exportStep, setExportStep] = useState(0); // 0 = ปิด, 1-3 = ขั้นตอน
  const [exportCategoryKeys, setExportCategoryKeys] = useState(() => new Set(["personal", "goal", "academic"]));
  const [exportFormat, setExportFormat] = useState("pdf"); // pdf | excel | csv
  const [exportMethod, setExportMethod] = useState("single"); // single | zip (zip ยังไม่เปิดใช้งาน)
  const [exportIncludeToc, setExportIncludeToc] = useState(true);
  const [exportIncludePhoto, setExportIncludePhoto] = useState(true);
  const [exportProgress, setExportProgress] = useState(null);

  const openExportWizard = () => setExportStep(1);
  const closeExportWizard = () => { setExportStep(0); setExportProgress(null); };
  const toggleExportCategory = (key) => {
    setExportCategoryKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedCategories = EXPORT_CATEGORIES.filter((c) => exportCategoryKeys.has(c.key) && c.available);

  const runCsvExport = () => {
    const header = ["รหัสนักเรียน", "ชื่อ-นามสกุล", ...selectedCategories.flatMap((c) => CATEGORY_HEADERS[c.key])];
    const rows = exportTargets.map((s) => [
      s.student_code || "",
      s.fullname || "",
      ...selectedCategories.flatMap((c) => CATEGORY_VALUES[c.key](s)),
    ]);
    const csv = "﻿" + [header.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `นักเรียน_รวมข้อมูล_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF จริง — เปิดหน้าต่างใหม่ จัดเป็นการ์ดโปรไฟล์ต่อคน (มีสารบัญ/รูปได้ตามที่ติ๊กไว้) รวมเป็นเอกสารเดียว แล้วเรียก print() ให้กด "บันทึกเป็น PDF" ได้เลย ไม่ต้องใช้ library เพิ่ม
  const runPdfExport = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      notAvailableYet("เปิดหน้าต่างพิมพ์ไม่สำเร็จ (ตรวจสอบตัวบล็อกป๊อปอัพ)");
      return;
    }
    const scopeLabel = checkedIds.size > 0 ? `นักเรียนที่เลือก ${checkedIds.size} คน` : `ทั้งหมด ${exportTargets.length} คน`;
    const genDate = new Date().toLocaleString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const toc = exportIncludeToc
      ? `<div class="toc"><h2>สารบัญ</h2><ol>${exportTargets.map((s) => `<li><a href="#stu-${s.user_id}">${s.fullname}</a></li>`).join("")}</ol></div>`
      : "";

    const cards = exportTargets
      .map((s) => {
        const c = classesList.find((cc) => String(cc.id) === String(s.gradeId));
        const photo = exportIncludePhoto ? `<img class="avatar" src="https://i.pravatar.cc/160?u=student-${s.user_id}" />` : "";
        const sections = selectedCategories
          .map((cat) => {
            const values = CATEGORY_VALUES[cat.key](s);
            const rows = CATEGORY_HEADERS[cat.key].map((h, i) => `<tr><td class="k">${h}</td><td>${values[i] ?? "-"}</td></tr>`).join("");
            return `<div class="section"><div class="section-title">${cat.label}</div><table>${rows}</table></div>`;
          })
          .join("");
        return `<section class="card" id="stu-${s.user_id}">
          <div class="card-head">
            ${photo}
            <div>
              <div class="name">${s.fullname}</div>
              <div class="sub">รหัส ${s.student_code || "-"} ${c ? `· ${gradeLabel(c)}` : ""}</div>
            </div>
          </div>
          ${sections}
        </section>`;
      })
      .join("");

    win.document.write(`<!doctype html>
      <html lang="th"><head><meta charset="utf-8"><title>รายงานนักเรียน</title>
      <style>
        body { font-family: "Sarabun", "Noto Sans Thai", sans-serif; padding: 28px; color: #1f2937; }
        h1 { font-size: 19px; margin: 0 0 2px; color: #db2777; }
        p.meta { font-size: 12.5px; color: #6b7280; margin: 0 0 18px; }
        .toc { page-break-after: always; }
        .toc ol { font-size: 13px; line-height: 1.9; }
        .toc a { color: #1f2937; text-decoration: none; }
        .card { page-break-inside: avoid; page-break-after: always; padding-top: 6px; }
        .card:last-child { page-break-after: auto; }
        .card-head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
        .name { font-size: 16px; font-weight: 700; }
        .sub { font-size: 12px; color: #6b7280; }
        .section { margin-bottom: 12px; }
        .section-title { font-size: 12.5px; font-weight: 700; color: #9d174d; background: #fce7f3; padding: 4px 10px; border-radius: 6px; display: inline-block; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; }
        td { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 12.5px; }
        td.k { width: 160px; color: #6b7280; background: #fafafa; }
      </style></head>
      <body>
        <h1>รายงานข้อมูลนักเรียน</h1>
        <p class="meta">${scopeLabel} · หมวด: ${selectedCategories.map((c) => c.label).join(", ")} · ออกรายงานเมื่อ ${genDate}</p>
        ${toc}
        ${cards}
      </body></html>`);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  };

  const confirmExport = () => {
    setExportProgress(0);
    const timer = setInterval(() => {
      setExportProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          if (exportFormat === "csv") runCsvExport();
          else if (exportFormat === "pdf") runPdfExport();
          setTimeout(closeExportWizard, 250);
          return 100;
        }
        return p + 20;
      });
    }, 70);
  };

  const content = (
    <div className="w-full">
      {!embedded && (
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">นักเรียนของฉัน</h1>
            <p className="text-[13px] text-gray-500 mt-1">ภาพรวมและข้อมูลรายบุคคลของนักเรียนที่ดูแล</p>
          </div>
        </div>
      )}

      {/* ===== Toolbar ===== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!embedded && (
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-gray-500">ห้องเรียนที่สอน</label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13.5px] outline-none focus:border-pink-400"
            >
              <option value="">ทุกห้อง</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>{gradeLabel(c)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[12px] text-gray-500">สถานะ</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-[13.5px] outline-none focus:border-pink-400"
          >
            <option value="">ทั้งหมด</option>
            <option value="normal">ปกติ</option>
            <option value="watch">ต้องติดตาม</option>
            <option value="risk">เสี่ยง</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-55">
          <label className="text-[12px] text-gray-500">&nbsp;</label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
              className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[13.5px] outline-none focus:border-pink-400"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => notAvailableYet("ตัวกรองเพิ่มเติม")}
          className="h-10 mt-5 px-4 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <FaSlidersH size={12} /> ตัวกรองเพิ่มเติม
        </button>

        <button
          type="button"
          onClick={openExportWizard}
          className="h-10 mt-5 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13px] font-semibold flex items-center gap-2"
        >
          <FaDownload size={12} /> ส่งออก{checkedIds.size > 0 ? ` (${checkedIds.size})` : "ทั้งหมด"}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-10 mt-5 px-4 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <FaPrint size={12} /> พิมพ์รายงาน
        </button>
      </div>

      <div className="mb-3 text-[13px] text-gray-500">พบนักเรียน {students.length} คน</div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">กำลังโหลด...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">
          {/* ===== รายชื่อนักเรียน (ซ้าย) ===== */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 text-[12.5px] text-gray-500">
              <input
                type="checkbox"
                checked={pagedStudents.length > 0 && checkedIds.size === pagedStudents.length}
                onChange={toggleCheckAll}
                className="accent-pink-600"
              />
              เลือกทั้งหมด{checkedIds.size > 0 && ` (เลือกแล้ว ${checkedIds.size})`}
            </div>
            <div className="max-h-[720px] overflow-y-auto divide-y divide-gray-100">
              {pagedStudents.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-[13px]">ไม่พบนักเรียน</div>
              ) : (
                pagedStudents.map((s) => {
                  const att = attendanceByUser[s.user_id];
                  const attPct = att && Number(att.totalDays) > 0 ? Math.round((Number(att.presentDays) / Number(att.totalDays)) * 100) : null;
                  const scorePct = computeScorePct(s.user_id);
                  const status = statusFromAttendance(attPct);
                  const isSelected = selectedStudent?.user_id === s.user_id;
                  return (
                    <button
                      type="button"
                      key={s.user_id}
                      onClick={() => { setSelectedId(s.user_id); setActiveTab("info"); }}
                      className={`w-full text-left px-4 py-3 flex items-start gap-2.5 transition ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 bg-white"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checkedIds.has(s.user_id)}
                        onChange={(e) => { e.stopPropagation(); toggleCheck(s.user_id); }}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-pink-600 mt-1.5 shrink-0"
                      />
                      <img src={`https://i.pravatar.cc/80?u=student-${s.user_id}`} className="w-10 h-10 rounded-full shrink-0 object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium text-gray-900 truncate">{s.fullname}</div>
                        <div className="text-[11.5px] text-gray-400">{s.student_code}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-gray-500">คะแนน {scorePct ?? "-"}{scorePct != null && "%"}</span>
                          <span className="text-[11px] text-gray-500">· มาเรียน {attPct ?? "-"}{attPct != null && "%"}</span>
                        </div>
                        <span className={`inline-block mt-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full ${STATUS_META[status].cls}`}>
                          {STATUS_META[status].label}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ===== รายละเอียดนักเรียน (ขวา) ===== */}
          {!selectedStudent ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-gray-400">เลือกนักเรียนเพื่อดูรายละเอียด</div>
          ) : (
            <div className="min-w-0">
              {/* Profile header */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-5">
                <div className="flex flex-wrap items-start gap-6">
                  <img src={`https://i.pravatar.cc/160?u=student-${selectedStudent.user_id}`} className="w-20 h-20 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[19px] font-bold text-gray-900">{selectedStudent.fullname}</div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_META[selectedStatus].cls}`}>
                        {STATUS_META[selectedStatus].label}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px] text-gray-500">
                      <div>รหัสนักเรียน <span className="text-gray-800">{selectedStudent.student_code}</span></div>
                      <div>ชั้น <span className="text-gray-800">{selectedGradeLabel || "ยังไม่ระบุห้อง"}{selectedStudent.seatNo != null && ` เลขที่ ${selectedStudent.seatNo}`}</span></div>
                      <div className="flex items-center gap-1.5"><FaChalkboardTeacher size={11} /> ครูที่ปรึกษา <span className="text-gray-800">{selectedTeacherName || "ยังไม่ระบุ"}</span></div>
                      <div className="flex items-center gap-1.5"><FaEnvelope size={11} /> อีเมล <span className="text-gray-800 truncate">{selectedStudent.email || "-"}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                    <MiniStat label="คะแนนเฉลี่ย" value={selectedScorePct != null ? `${selectedScorePct}%` : "-"} valueClass="text-pink-600" />
                    <MiniStat label="การมาเรียน" value={selectedAttendancePct != null ? `${selectedAttendancePct}%` : "-"} valueClass="text-emerald-600" />
                    <MiniStat label="เป้าหมาย" value={selectedGoal?.career_field || "ยังไม่ตั้ง"} small />
                    <MiniStat label="ผล Holland" value={selectedType?.type_name || "ยังไม่ทำ"} small />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-5 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {DETAIL_TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px bg-transparent transition ${
                        activeTab === t.key ? "border-pink-600 text-pink-700" : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <t.icon size={12} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "info" && (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
                  {GENERAL_INFO_SECTIONS.map((sec, i) => {
                    const open = openInfoSections.has(sec.key);
                    return (
                      <div key={sec.key}>
                        <button
                          type="button"
                          onClick={() => toggleInfoSection(sec.key)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-left bg-transparent"
                        >
                          <span className="w-6 h-6 rounded-full bg-pink-600 text-white text-[11.5px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-medium text-gray-900">{sec.title}</div>
                            <div className="text-[11.5px] text-gray-400 truncate">{sec.desc}</div>
                          </div>
                          <FaChevronDown className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} size={12} />
                        </button>
                        {open && (
                          <div className="px-4 pb-4 pl-13">
                            {sec.key === "basic" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                <InfoRow label="ชื่อ-สกุล" value={selectedStudent.fullname || "-"} />
                                <InfoRow label="รหัสนักเรียน" value={selectedStudent.student_code || "-"} />
                                <InfoRow label="วันเกิด" value={selectedStudent.dob ? formatDate(selectedStudent.dob) : "-"} />
                                <InfoRow label="อายุ" value={selectedStudent.dob ? `${ageFromDob(selectedStudent.dob)} ปี` : "-"} />
                                <InfoRow label="อีเมล" value={selectedStudent.email || "-"} />
                                <InfoRow label="เพศ / สัญชาติ / ศาสนา" value="ยังไม่มีข้อมูล" muted />
                                <InfoRow label="กรุ๊ปเลือด" value="ยังไม่มีข้อมูล" muted />
                                <InfoRow label="น้ำหนัก / ส่วนสูง" value="ยังไม่มีข้อมูล" muted />
                              </div>
                            ) : (
                              <div className="text-[13px] text-gray-400 py-1">ยังไม่มีข้อมูลในระบบ</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "goal" && (
                <InfoCard title="เป้าหมายของนักเรียน">
                  {!selectedGoal ? (
                    <div className="text-[13px] text-gray-400 py-2">นักเรียนยังไม่ได้ตั้งเป้าหมาย</div>
                  ) : (
                    <>
                      <InfoRow label="เป้าหมาย" value={selectedGoal.goal_text} />
                      <InfoRow label="สายอาชีพที่สนใจ" value={selectedGoal.career_field || "-"} />
                      <InfoRow label="คณะที่อยากเข้า" value={selectedGoal.faculty_name || "-"} />
                    </>
                  )}
                </InfoCard>
              )}

              {activeTab === "grades" && (
                <InfoCard title="ผลการเรียน (สะสมจากงานที่ส่ง)">
                  <div className="mb-3 text-[12px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    ระบบยังไม่มีแนวคิดวิชา/หน่วยกิต/เกรดรายภาคเรียน จึงแสดงเป็นคะแนนสะสมจากงานที่ส่งจริงแทน GPA/GPAX
                  </div>
                  {selectedSubmissions.length === 0 ? (
                    <div className="text-[13px] text-gray-400 py-2">ยังไม่มีงานที่ให้คะแนนแล้ว</div>
                  ) : (
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-100">
                          <th className="py-2 font-medium">งาน</th>
                          <th className="py-2 font-medium text-right">คะแนน</th>
                          <th className="py-2 font-medium text-right">เต็ม</th>
                          <th className="py-2 font-medium text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedSubmissions.map((s) => {
                          const max = maxScoreByAssId[String(s.assignment_ass_id)] || null;
                          const title = assignments.find((a) => String(a.ass_id) === String(s.assignment_ass_id))?.title || `งาน #${s.assignment_ass_id}`;
                          return (
                            <tr key={s.send_id}>
                              <td className="py-2 text-gray-800">{title}</td>
                              <td className="py-2 text-right text-gray-800">{s.score}</td>
                              <td className="py-2 text-right text-gray-500">{max ?? "-"}</td>
                              <td className="py-2 text-right font-medium text-pink-600">{max ? Math.round((s.score / max) * 100) : "-"}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </InfoCard>
              )}

              {activeTab === "attendance" && (
                <InfoCard title="สรุปการมาเรียน">
                  {!selectedAttendance || Number(selectedAttendance.totalDays) === 0 ? (
                    <div className="text-[13px] text-gray-400 py-2">ยังไม่มีข้อมูลการเช็คชื่อ</div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-8">
                      <StudentAttendanceDonut summary={selectedAttendance} />
                      <div className="text-[13px] text-gray-600">
                        จากทั้งหมด {selectedAttendance.totalDays} วัน · มาเรียน {selectedAttendancePct}%
                      </div>
                    </div>
                  )}
                </InfoCard>
              )}

              {activeTab === "activity" && (
                <InfoCard title="กิจกรรม">
                  <div className="text-[13px] text-gray-400 py-2">ระบบยังไม่มีการเก็บข้อมูลกิจกรรมของนักเรียนรายบุคคล</div>
                </InfoCard>
              )}

              {activeTab === "holland" && (
                <InfoCard title="ผลแบบประเมินแนวทาง (Holland)">
                  {!selectedTypeResult ? (
                    <div className="text-[13px] text-gray-400 py-2">นักเรียนยังไม่ได้ทำแบบทดสอบ</div>
                  ) : (
                    <>
                      <InfoRow label="กลุ่มบุคลิกภาพ" value={selectedType?.type_name || "-"} />
                      <InfoRow label="คำอธิบาย" value={selectedType?.description || "-"} />
                      <InfoRow label="คณะแนะนำ" value={selectedRecommendedFaculty ? `${selectedRecommendedFaculty.faculty_name} · ${selectedRecommendedFaculty.university_name}` : "-"} />
                      <InfoRow label="วันที่ทำแบบทดสอบ" value={formatDate(selectedTypeResult.test_date)} />
                    </>
                  )}
                </InfoCard>
              )}

              {activeTab === "counseling" && (
                <InfoCard title="การให้คำปรึกษา">
                  <div className="text-[13px] text-gray-400 py-2">ฟีเจอร์นี้ยังไม่เปิดใช้งาน — ระบบยังไม่มีตารางบันทึกการให้คำปรึกษา</div>
                </InfoCard>
              )}

              {activeTab === "notes" && (
                <InfoCard title="บันทึกเพิ่มเติม">
                  <div className="text-[13px] text-gray-400 py-2">ฟีเจอร์นี้ยังไม่เปิดใช้งาน</div>
                </InfoCard>
              )}
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[13px]">
            ก่อนหน้า
          </button>
          <span className="text-[13px] text-gray-500">หน้า {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[13px]">
            ถัดไป
          </button>
        </div>
      )}

      {exportStep > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && closeExportWizard()}>
          <div className="bg-white rounded-2xl w-full max-w-[440px] p-6 shadow-xl">
            {exportStep === 1 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-semibold text-gray-900">ส่งออกข้อมูลนักเรียน</h2>
                  <button type="button" onClick={closeExportWizard} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent"><FaTimes size={13} /></button>
                </div>

                <div className="text-[12.5px] text-gray-500 mb-2">
                  เลือกข้อมูลที่ต้องการส่งออก ({checkedIds.size > 0 ? `นักเรียนที่เลือก ${checkedIds.size} คน` : `ทั้งหมด ${exportTargets.length} คน`})
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  {EXPORT_CATEGORIES.map((c) => (
                    <label key={c.key} className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13.5px] ${c.available ? "text-gray-800" : "text-gray-300"}`}>
                      <input
                        type="checkbox"
                        disabled={!c.available}
                        checked={exportCategoryKeys.has(c.key)}
                        onChange={() => toggleExportCategory(c.key)}
                        className="accent-pink-600"
                      />
                      {c.label}
                      {!c.available && <span className="text-[11px] text-gray-300">(ยังไม่มีข้อมูล)</span>}
                    </label>
                  ))}
                </div>

                <div className="text-[12.5px] text-gray-500 mb-2">รูปแบบไฟล์</div>
                <div className="flex flex-col gap-1 mb-5">
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13.5px] text-gray-800">
                    <input type="radio" name="fmt" checked={exportFormat === "pdf"} onChange={() => setExportFormat("pdf")} className="accent-pink-600" /> PDF
                  </label>
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13.5px] text-gray-300">
                    <input type="radio" name="fmt" disabled className="accent-pink-600" /> Excel (.xlsx) <span className="text-[11px]">(เร็วๆ นี้)</span>
                  </label>
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13.5px] text-gray-800">
                    <input type="radio" name="fmt" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} className="accent-pink-600" /> CSV (.csv)
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeExportWizard} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                  <button
                    type="button"
                    disabled={selectedCategories.length === 0}
                    onClick={() => setExportStep(exportFormat === "pdf" ? 2 : 3)}
                    className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13px] font-semibold disabled:opacity-40"
                  >
                    ถัดไป
                  </button>
                </div>
              </>
            )}

            {exportStep === 2 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-semibold text-gray-900">ตั้งค่าการส่งออก PDF</h2>
                  <button type="button" onClick={closeExportWizard} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent"><FaTimes size={13} /></button>
                </div>

                <div className="text-[12.5px] text-gray-500 mb-2">วิธีจัดไฟล์</div>
                <div className="flex flex-col gap-1 mb-4">
                  <label className="flex items-start gap-2.5 px-2 py-2 rounded-lg text-[13.5px] text-gray-800">
                    <input type="radio" name="method" checked={exportMethod === "single"} onChange={() => setExportMethod("single")} className="accent-pink-600 mt-0.5" />
                    <span>รวมเป็นไฟล์เดียว<br /><span className="text-[11.5px] text-gray-400">รวมข้อมูลนักเรียนทั้งหมดในไฟล์ PDF เดียว</span></span>
                  </label>
                  <label className="flex items-start gap-2.5 px-2 py-2 rounded-lg text-[13.5px] text-gray-300">
                    <input type="radio" name="method" disabled className="accent-pink-600 mt-0.5" />
                    <span>แยกเป็นไฟล์คนละไฟล์ (ZIP) <span className="text-[11px]">(เร็วๆ นี้)</span><br /><span className="text-[11.5px] text-gray-300">แยกไฟล์ PDF รายบุคคล แล้วบีบอัดเป็นไฟล์ ZIP</span></span>
                  </label>
                </div>

                <div className="text-[12.5px] text-gray-500 mb-2">ตัวเลือกเพิ่มเติม</div>
                <div className="flex flex-col gap-1 mb-5">
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13.5px] text-gray-800">
                    <input type="checkbox" checked={exportIncludeToc} onChange={(e) => setExportIncludeToc(e.target.checked)} className="accent-pink-600" /> ใส่สารบัญ (สารบัญรายชื่อ)
                  </label>
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13.5px] text-gray-800">
                    <input type="checkbox" checked={exportIncludePhoto} onChange={(e) => setExportIncludePhoto(e.target.checked)} className="accent-pink-600" /> แสดงรูปนักเรียน
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setExportStep(1)} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-600 hover:bg-gray-50">ย้อนกลับ</button>
                  <button type="button" onClick={() => setExportStep(3)} className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13px] font-semibold">ถัดไป</button>
                </div>
              </>
            )}

            {exportStep === 3 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-semibold text-gray-900">ยืนยันการส่งออก</h2>
                  <button type="button" onClick={closeExportWizard} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent"><FaTimes size={13} /></button>
                </div>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 mb-5 text-[13px] text-gray-700">
                  <div className="font-medium text-emerald-800 mb-1.5">ข้อมูลที่ส่งออก</div>
                  <ul className="list-disc pl-5 space-y-0.5 mb-3">
                    {selectedCategories.map((c) => <li key={c.key}>{c.label}</li>)}
                  </ul>
                  <div>รูปแบบไฟล์: <span className="font-medium">{exportFormat === "pdf" ? "PDF" : "CSV"}</span></div>
                  {exportFormat === "pdf" && <div>วิธีจัดไฟล์: <span className="font-medium">{exportMethod === "single" ? "รวมเป็นไฟล์เดียว" : "แยกเป็นไฟล์ (ZIP)"}</span></div>}
                  <div>จำนวน: <span className="font-medium">{exportTargets.length} คน</span></div>
                </div>

                {exportProgress != null ? (
                  <div className="mb-5">
                    <div className="text-[12.5px] text-gray-500 mb-1.5">กำลังสร้างไฟล์... {exportProgress}%</div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${exportProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setExportStep(exportFormat === "pdf" ? 2 : 1)} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-600 hover:bg-gray-50">ย้อนกลับ</button>
                    <button type="button" onClick={confirmExport} className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[13px] font-semibold">ยืนยันการส่งออก</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />
      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        {content}
      </main>
    </div>
  );
}

/* ===== ส่วนย่อย ===== */

function MiniStat({ label, value, valueClass = "text-gray-900", small }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 min-w-0">
      <div className="text-[11px] text-gray-400 truncate">{label}</div>
      <div className={`font-semibold truncate ${small ? "text-[13px]" : "text-[17px]"} ${valueClass}`}>{value}</div>
    </div>
  );
}

function InfoCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      <div className="text-[14px] font-semibold text-gray-900 mb-3">{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, muted }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-[13px]">
      <div className="text-gray-400 shrink-0">{label}</div>
      <div className={`text-right ${muted ? "text-gray-400" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

function StudentAttendanceDonut({ summary }) {
  const data = [
    { label: "มาเรียน", value: Number(summary.presentDays) || 0, color: "#10b981" },
    { label: "สาย", value: Number(summary.lateDays) || 0, color: "#f59e0b" },
    { label: "ลา", value: Number(summary.leaveDays) || 0, color: "#db2777" },
    { label: "ขาด", value: Number(summary.absentDays) || 0, color: "#ef4444" },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const stops = data
    .map((d) => {
      const start = (cumulative / total) * 100;
      cumulative += d.value;
      const end = (cumulative / total) * 100;
      return `${d.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-6">
      <div className="w-28 h-28 rounded-full shrink-0 ring-4 ring-white shadow-sm" style={{ background: `conic-gradient(${stops})` }} />
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-[12.5px] text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            {d.label} · <span className="font-semibold">{d.value}</span> วัน
          </div>
        ))}
      </div>
    </div>
  );
}

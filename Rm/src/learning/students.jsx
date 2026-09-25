import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Select from "react-select";
import {
  FaSearch, FaSlidersH, FaDownload, FaPrint, FaTimes, FaChevronDown, FaEnvelope, FaChalkboardTeacher, FaBullseye, FaUniversity,
  FaBrain, FaCalendarCheck, FaStickyNote, FaCommentDots, FaIdCard, FaCheck,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import PageLoading from "../components/PageLoading.jsx";
import Avatar from "../components/Avatar.jsx";
import {
  getStudent, getEnrollments, getClasses, getAssAll, getAllSubmissions,
  getGoals, getTypeResults, getTypes, getFaculties, getStudentAttendanceSummary, getStudentGeneralInfo,
} from "../callapi/callapi_user.jsx";
import { gradeLabel } from "../utils/gradeLabel.js";
import { notAvailableYet } from "../utils/feedShared.js";
import { bigFilterSelectStyles } from "../utils/reactSelectStyles.js";

const GOAL_FILTER_OPTIONS = [
  { value: "all", label: "เป้าหมาย: ทั้งหมด" },
  { value: "has", label: "ตั้งเป้าหมายแล้ว" },
  { value: "none", label: "ยังไม่ตั้งเป้าหมาย" },
];

const HOLLAND_FILTER_OPTIONS = [
  { value: "all", label: "แบบประเมิน Holland: ทั้งหมด" },
  { value: "done", label: "ทำแบบประเมินแล้ว" },
  { value: "none", label: "ยังไม่ทำแบบประเมิน" },
];

const INFO_FILTER_OPTIONS = [
  { value: "all", label: "ข้อมูลทั่วไป: ทั้งหมด" },
  { value: "has", label: "มีข้อมูลแล้ว" },
  { value: "none", label: "ยังไม่มีข้อมูล" },
];

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

// ดึงจริงจาก getStudentGeneralInfo() — โครงสร้างข้อมูลจริงจาก backend เป็น personal/contact/address/family/health/education/interests
// (ยืนยันจาก GET /studentinfo/1 จริง) ขยายให้ครบทุกฟิลด์ของฟอร์ม /studentinfo แล้ว (คอลัมน์ form_data เป็น JSON ขยาย shape ได้โดยไม่ต้อง
// แก้ตาราง) — รองรับทั้งข้อมูลเก่าที่เคยบันทึกด้วย shape แบบย่อ (เช่น father.name ก้อนเดียว) และแบบเต็มใหม่ (father.first_name/last_name แยก)
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "" : v);

// ตรงกับฟอร์ม /studentinfo ทุกฟิลด์แบบ 1:1 (แยกเป็น 13 ส่วนตามหัวข้อ FormSection จริงของฟอร์ม) — ฟิลด์ไหนฟอร์มไม่มีให้กรอกจริงจะไม่ปรากฏที่นี่

const GENERAL_INFO_SECTIONS = [
  {
    key: "student",
    title: "ข้อมูลนักเรียน",
    subtitle: "ชื่อ-นามสกุล, ชื่อเล่น, วันเกิด, อายุ, ศาสนา, เชื้อชาติ, สัญชาติ, โทรศัพท์, ชั้น/ห้อง/เลขที่",
    fields: (fd) => {
      const m = fd.meta || {};
      const p = fd.personal || {};
      return [
        ["ชื่อ-นามสกุล", `${val(p.first_name)} ${val(p.last_name)}`.trim()],
        ["ชื่อเล่น", val(p.nickname)],
        ["วันเกิด", p.dob ? formatDate(p.dob) : ""],
        ["อายุ", p.age ? `${p.age} ปี` : ""],
        ["นับถือศาสนา", val(p.religion)],
        ["เชื้อชาติ", val(p.ethnicity)],
        ["สัญชาติ", val(p.nationality)],
        ["โทรศัพท์", val(fd.contact?.phone)],
        ["ปีการศึกษา", val(m.academic_year)],
        ["ระดับชั้น", val(m.classroom)],
        ["ห้อง", val(m.room)],
        ["เลขที่", val(m.roll_number)],
      ];
    },
  },
  {
    key: "address",
    title: "ที่อยู่ปัจจุบัน",
    subtitle: "บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด, โทรศัพท์",
    fields: (fd) => {
      const a = fd.address || {};
      return [
        ["บ้านเลขที่", val(a.house_no)],
        ["ถนน", val(a.road)],
        ["ตำบล / แขวง", val(a.subdistrict)],
        ["อำเภอ / เขต", val(a.district)],
        ["จังหวัด", val(a.province)],
        ["โทรศัพท์", val(fd.contact?.address_phone)],
      ];
    },
  },
  {
    key: "father",
    title: "ข้อมูลบิดา",
    subtitle: "ชื่อ, อายุ, โทรศัพท์, การศึกษา, อาชีพ, รายได้, สถานที่ทำงาน",
    fields: (fd) => {
      const f = fd.family?.father || {};
      return [
        ["ชื่อ-นามสกุล", `${val(f.first_name)} ${val(f.last_name)}`.trim()],
        ["อายุ", f.age ? `${f.age} ปี` : ""],
        ["โทรศัพท์", val(f.phone)],
        ["ระดับการศึกษา", val(f.education)],
        ["อาชีพ", val(f.occupation)],
        ["รายได้เฉลี่ยเดือนละ", f.income != null ? `${f.income} บาท` : ""],
        ["สถานที่ทำงาน", val(f.workplace)],
        ["โทรศัพท์ที่ทำงาน", val(f.work_phone)],
      ];
    },
  },
  
  {
    key: "mother",
    title: "ข้อมูลมารดา",
    subtitle: "ชื่อ, อายุ, โทรศัพท์, การศึกษา, อาชีพ, รายได้, สถานที่ทำงาน",
    fields: (fd) => {
      const m = fd.family?.mother || {};
      return [
        ["ชื่อ-นามสกุล", `${val(m.first_name)} ${val(m.last_name)}`.trim()],
        ["อายุ", m.age ? `${m.age} ปี` : ""],
        ["โทรศัพท์", val(m.phone)],
        ["ระดับการศึกษา", val(m.education)],
        ["อาชีพ", val(m.occupation)],
        ["รายได้เฉลี่ยเดือนละ", m.income != null ? `${m.income} บาท` : ""],
        ["สถานที่ทำงาน", val(m.workplace)],
        ["โทรศัพท์ที่ทำงาน", val(m.work_phone)],
      ];
    },
  },
  {
    key: "familyStatus",
    title: "สถานภาพครอบครัว",
    subtitle: "สถานภาพสมรสบิดามารดา, พักอาศัยอยู่กับ, จำนวนพี่น้อง",
    fields: (fd) => {
      const f = fd.family || {};
      const s = f.siblings_same_parents || {};
      const sf = f.siblings_father_other || {};
      const sm = f.siblings_mother_other || {};
      return [
        ["สถานภาพสมรสบิดามารดา", (f.parents_marital_status || []).join(", ")],
        ["นักเรียนพักอาศัยอยู่กับ", f.living_with === "อื่นๆ" ? `อื่นๆ (${val(f.living_with_other)})` : val(f.living_with)],
        ["พี่น้องท้องเดียวกัน", s.total != null ? `${s.total} คน (ชาย ${val(s.male)} หญิง ${val(s.female)})` : ""],
        ["นักเรียนเป็นบุตรลำดับที่", val(f.birth_order)],
        ["พี่น้องจากบิดากับภรรยาคนอื่น", sf.total != null ? `${sf.total} คน (ชาย ${val(sf.male)} หญิง ${val(sf.female)})` : ""],
        ["พี่น้องจากมารดากับสามีคนอื่น", sm.total != null ? `${sm.total} คน (ชาย ${val(sm.male)} หญิง ${val(sm.female)})` : ""],
      ];
    },
  },
  {
    key: "guardian",
    title: "ผู้ปกครอง (กรณีไม่ใช่บิดามารดา)",
    subtitle: "ชื่อ, อายุ, เกี่ยวข้องโดยเป็น, โทรศัพท์, อาชีพ, รายได้",
    fields: (fd) => {
      const g = fd.family?.guardian || {};
      return [
        ["ชื่อ-นามสกุล", `${val(g.first_name)} ${val(g.last_name)}`.trim()],
        ["อายุ", g.age ? `${g.age} ปี` : ""],
        ["เกี่ยวข้องกับนักเรียนโดยเป็น", val(g.relation)],
        ["โทรศัพท์", val(g.phone)],
        ["อาชีพ", val(g.occupation)],
        ["รายได้เฉลี่ยเดือนละ", g.income != null ? `${g.income} บาท` : ""],
      ];
    },
  },
  {
    key: "living",
    title: "สภาพความเป็นอยู่",
    subtitle: "ลักษณะที่พักอาศัย, สภาพชุมชน, ภาระหน้าที่, ค่าใช้จ่ายประจำวัน, การเดินทาง",
    fields: (fd) => {
      const l = fd.living_situation || {};
      return [
        ["บุคคลในครอบครัวที่รักและไว้ใจมากที่สุด", val(l.most_trusted_family_member)],
        ["ลักษณะที่พักอาศัย", val(l.housing_type)],
        ["มีห้องส่วนตัวหรือไม่", val(l.has_own_room)],
        ["จำนวนสมาชิกที่อาศัยในบ้าน", l.household_member_count != null ? `${l.household_member_count} คน (${val(l.household_members_description)})` : ""],
        ["สภาพของชุมชน", (l.community_condition || []).join(", ") + (l.community_condition?.includes("อื่นๆ") ? ` (${val(l.community_condition_other)})` : "")],
        ["บุคคลที่มีอิทธิพลมากที่สุดในบ้าน", val(l.most_influential_person)],
        ["บุคคลที่มีอิทธิพลน้อยที่สุดในบ้าน", val(l.least_influential_person)],
        ["ภาระหน้าที่นักเรียน", l.household_chores === "ต้องทำงานบ้าน" ? `ต้องทำงานบ้าน (${val(l.chores_detail)})` : val(l.household_chores)],
        ["เวลาออกนอกบ้าน", val(l.leave_permission)],
        ["ค่าใช้จ่ายประจำวันได้รับจาก", val(l.allowance_source)],
        ["ประมาณวันละ", l.allowance_amount != null ? `${l.allowance_amount} บาท` : ""],
        ["ระยะทางจากบ้านมาโรงเรียน", l.distance_km != null ? `${l.distance_km} กม.` : ""],
        ["ยานพาหนะที่ใช้เดินทางมาโรงเรียน", l.transport_method === "ผู้ปกครองมาส่ง" ? `ผู้ปกครองมาส่ง (${val(l.transport_other)})` : val(l.transport_method)],
      ];
    },
  },
  {
    key: "priorEducation",
    title: "สำเร็จการศึกษาจากที่ใดมาก่อนแล้ว",
    subtitle: "ระดับชั้น, ชื่อสถานศึกษา, เกรดเฉลี่ย",
    table: (fd) => {
      const rows = fd.education?.prior_education || [];
      return { columns: ["ระดับชั้น", "ชื่อสถานศึกษา", "เกรดเฉลี่ย"], rows: rows.map((r) => [val(r.level), val(r.school), val(r.gpa)]) };
    },
  },
  {
    key: "studyBehavior",
    title: "การเรียนและพฤติกรรม",
    subtitle: "วิชาที่ชอบ/ไม่ชอบ, วิชาที่ได้คะแนนมาก/น้อย, การมาโรงเรียน, เวลาทำการบ้าน",
    fields: (fd) => {
      const e = fd.education || {};
      return [
        ["วิชาที่ชอบมากที่สุด", val(e.favorite_subject)],
        ["เพราะ", val(e.favorite_subject_reason)],
        ["วิชาที่ชอบน้อยที่สุด", val(e.least_favorite_subject)],
        ["เพราะ", val(e.least_favorite_subject_reason)],
        ["วิชาที่ได้คะแนนมากที่สุด", (e.top_score_subjects || []).join(", ")],
        ["วิชาที่ได้คะแนนน้อยที่สุด", (e.low_score_subjects || []).join(", ")],
        ["การมาโรงเรียน", e.attendance === "ขาดเรียนบ่อยๆ" ? `ขาดเรียนบ่อยๆ (${val(e.attendance_reason)})` : val(e.attendance)],
        ["เวลาสำหรับทำการบ้านและอ่านหนังสือ", e.homework_time === "ไม่มีเวลา" ? `ไม่มีเวลา (${val(e.homework_time_reason)})` : val(e.homework_time)],
      ];
    },
  },
  {
    key: "closeFriends",
    title: "เพื่อนสนิทของนักเรียน",
    subtitle: "ชื่อ-นามสกุล, ชั้น, โทรศัพท์",
    table: (fd) => {
      const friends = fd.education?.close_friends || [];
      return { columns: ["ชื่อ-นามสกุล", "ชั้น", "โทรศัพท์"], rows: friends.map((f) => [`${val(f.first_name)} ${val(f.last_name)}`.trim(), val(f.classroom), val(f.phone)]) };
    },
  },
  {
    key: "interests",
    title: "ความสนใจและแนวทางการประกอบอาชีพ",
    subtitle: "งานอดิเรก, ความสามารถพิเศษ, เป้าหมายการศึกษา, อาชีพที่สนใจ",
    fields: (fd) => {
      const i = fd.interests || {};
      return [
        ["งานอดิเรกของนักเรียน", val(i.hobby)],
        ["ความสามารถพิเศษ", val(i.special_ability)],
        ["ระดับการศึกษาที่นักเรียนจะเรียนให้จบชั้นสูงสุด", val(i.student_edu_goal)],
        ["ระดับการศึกษาที่ผู้ปกครองจะเรียนให้จบชั้นสูงสุด", val(i.guardian_edu_goal)],
        ["อาชีพที่นักเรียนสนใจ", (i.interested_careers || []).join(", ")],
        ["อาชีพที่ผู้ปกครองคาดหวังให้นักเรียนเป็น", val(i.guardian_expected_career)],
      ];
    },
  },
  {
    key: "health",
    title: "ประวัติสุขภาพ",
    subtitle: "โรคประจำตัว, น้ำหนัก, ส่วนสูง, การนอน, ประวัติการเจ็บป่วย",
    fields: (fd) => {
      const h = fd.health || {};
      return [
        ["โรคประจำตัวของนักเรียน", val(h.chronic_disease)],
        ["อาการเมื่อโรคกำเริบ", val(h.chronic_disease_symptoms)],
        ["น้ำหนัก", h.weight_kg ? `${h.weight_kg} กก.` : ""],
        ["ส่วนสูง", h.height_cm ? `${h.height_cm} ซม.` : ""],
        ["ตามปกตินอนวันละ", val(h.sleep_hours)],
      ];
    },
    table: (fd) => {
      const list = (fd.health?.illness_history || []).filter((r) => r.cause);
      return list.length ? { title: "นักเรียนเคยเจ็บป่วยหรือได้รับอุบัติเหตุร้ายแรง", columns: ["ป่วยเพราะ", "เมื่ออายุ (ปี)"], rows: list.map((r) => [val(r.cause), val(r.age)]) } : null;
    },
  },
  {
    key: "preparedBy",
    title: "ผู้กรอกข้อมูล",
    subtitle: "ลงชื่อ, ลงวันที่",
    fields: (fd) => {
      const pb = fd.prepared_by || {};
      return [
        ["ลงชื่อ (ผู้กรอกข้อมูล)", val(pb.name)],
        ["ลงวันที่", pb.date ? formatDate(pb.date) : ""],
      ];
    },
  },
];

const DETAIL_TABS = [
  { key: "info", label: "ข้อมูลทั่วไป", icon: FaIdCard },
  { key: "goal", label: "เป้าหมาย", icon: FaBullseye },
  { key: "grades", label: "ผลการเรียน", icon: FaUniversity },
  { key: "attendance", label: "การเช็คชื่อ", icon: FaCalendarCheck },
  { key: "holland", label: "แบบประเมิน (Holland)", icon: FaBrain },
  { key: "counseling", label: "การให้คำปรึกษา", icon: FaCommentDots },
  { key: "notes", label: "บันทึกเพิ่มเติม", icon: FaStickyNote },
];

export default function StudentListPage({ embedded = false, gradeId: propGradeId } = {}) {
  const [searchParams] = useSearchParams();
  const gradeFilter = propGradeId || searchParams.get("gradeId") || "";

  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState(gradeFilter);
  const [goalFilter, setGoalFilter] = useState("all");
  const [hollandFilter, setHollandFilter] = useState("all");
  const [infoFilter, setInfoFilter] = useState("all");
  const [advFilterOpen, setAdvFilterOpen] = useState(false);
  const advFilterCount = (goalFilter !== "all" ? 1 : 0) + (hollandFilter !== "all" ? 1 : 0) + (infoFilter !== "all" ? 1 : 0);
  const advFilterActive = advFilterCount > 0;
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
  const [generalInfoByUser, setGeneralInfoByUser] = useState({});

  // ห้อง+ค้นหา กรองก่อน แยกจากตัวกรองเพิ่มเติม เพราะตัวกรอง "ข้อมูลทั่วไป" ต้องรู้ก่อนว่าใครมี/ไม่มีข้อมูลทั่วไปบ้าง (ต้องโหลดครบทุกคนในห้องนี้ก่อน ไม่ใช่แค่หน้าที่กำลังดู)
  const roomScopedStudents = useMemo(() => {
    let list = allStudents.map((s) => {
      const enroll = gradeByUserId.get(String(s.user_id));
      return { ...s, gradeId: enroll?.gradeId ?? null, seatNo: enroll?.seatNo ?? null };
    });
    if (roomFilter) list = list.filter((s) => String(s.gradeId) === String(roomFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.fullname?.toLowerCase().includes(q) ||
          s.student_code?.toLowerCase?.().includes(q) ||
          (s.seatNo != null && String(s.seatNo).includes(q))
      );
    }
    return list;
  }, [allStudents, gradeByUserId, roomFilter, search]);

  // โหลดข้อมูลทั่วไปของทุกคนในห้องนี้ล่วงหน้า (ไม่ใช่แค่หน้าที่กำลังดู) เพราะตัวกรองเพิ่มเติมต้องใช้เช็คทั้งห้อง
  useEffect(() => {
    const toFetch = roomScopedStudents.filter((s) => !(s.user_id in generalInfoByUser));
    if (toFetch.length === 0) return;
    Promise.all(
      toFetch.map((s) =>
        getStudentGeneralInfo(s.user_id)
          .then((res) => [s.user_id, res])
          .catch(() => [s.user_id, null])
      )
    ).then((entries) => {
      setGeneralInfoByUser((prev) => {
        const next = { ...prev };
        entries.forEach(([id, res]) => { next[id] = res; });
        return next;
      });
    });
  }, [roomScopedStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  const students = useMemo(() => {
    let list = roomScopedStudents;
    if (goalFilter !== "all") {
      const hasGoal = (userId) => goals.some((g) => String(g.user_user_id) === String(userId));
      list = list.filter((s) => (goalFilter === "has" ? hasGoal(s.user_id) : !hasGoal(s.user_id)));
    }
    if (hollandFilter !== "all") {
      const hasResult = (userId) => typeResults.some((r) => String(r.user_user_id) === String(userId));
      list = list.filter((s) => (hollandFilter === "done" ? hasResult(s.user_id) : !hasResult(s.user_id)));
    }
    if (infoFilter !== "all") {
      list = list.filter((s) => (infoFilter === "has" ? !!generalInfoByUser[s.user_id] : !generalInfoByUser[s.user_id]));
    }
    list = list.slice().sort((a, b) => (a.fullname || "").localeCompare(b.fullname || "", "th"));
    return list;
  }, [roomScopedStudents, goalFilter, hollandFilter, infoFilter, goals, typeResults, generalInfoByUser]);

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pagedStudents = useMemo(
    () => students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [students, page]
  );

  useEffect(() => { setPage(1); }, [roomFilter, search, goalFilter, hollandFilter, infoFilter]);

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
        h1 { font-size: 19px; margin: 0 0 2px; color: #ec4899; }
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
            <h1 className="page-title">นักเรียนของฉัน</h1>
            <p className="page-subtitle mt-1">ภาพรวมและข้อมูลรายบุคคลของนักเรียนที่ดูแล</p>
          </div>
        </div>
      )}

      {/* ===== Toolbar ===== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-col gap-1 flex-1 min-w-55">
          <label className="text-[14px] text-gray-500">&nbsp;</label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] z-10" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ หรือเลขที่..."
              className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[15.5px] outline-none focus:border-pink-400"
            />
          </div>
        </div>

        {!embedded && (
          <div className="flex flex-col gap-1 w-56">
            <label className="text-[14px] text-gray-500">ห้องเรียนที่สอน</label>
            <Select
              styles={bigFilterSelectStyles}
              value={
                roomFilter
                  ? { value: roomFilter, label: gradeLabel(classesList.find((c) => String(c.id) === String(roomFilter)) || {}) }
                  : { value: "", label: "ทุกห้อง" }
              }
              onChange={(opt) => setRoomFilter(opt.value)}
              options={[{ value: "", label: "ทุกห้อง" }, ...classesList.map((c) => ({ value: c.id, label: gradeLabel(c) }))]}
              isSearchable={false}
            />
          </div>
        )}

        <div className="relative mt-5">
          <button
            type="button"
            onClick={() => setAdvFilterOpen((v) => !v)}
            className={`h-10 px-4 rounded-xl border text-[15px] flex items-center gap-2 ${
              advFilterActive ? "border-pink-400 bg-pink-50 text-pink-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FaSlidersH size={12} /> ตัวกรองเพิ่มเติม{advFilterActive && ` (${advFilterCount})`}
          </button>

          {advFilterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAdvFilterOpen(false)} />
              <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-gray-200 bg-white shadow-lg p-4 flex flex-col gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-1">เป้าหมาย</label>
                  <Select
                    styles={bigFilterSelectStyles}
                    value={GOAL_FILTER_OPTIONS.find((o) => o.value === goalFilter)}
                    onChange={(opt) => setGoalFilter(opt.value)}
                    options={GOAL_FILTER_OPTIONS}
                    isSearchable={false}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-1">แบบประเมิน Holland</label>
                  <Select
                    styles={bigFilterSelectStyles}
                    value={HOLLAND_FILTER_OPTIONS.find((o) => o.value === hollandFilter)}
                    onChange={(opt) => setHollandFilter(opt.value)}
                    options={HOLLAND_FILTER_OPTIONS}
                    isSearchable={false}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-1">ข้อมูลทั่วไป</label>
                  <Select
                    styles={bigFilterSelectStyles}
                    value={INFO_FILTER_OPTIONS.find((o) => o.value === infoFilter)}
                    onChange={(opt) => setInfoFilter(opt.value)}
                    options={INFO_FILTER_OPTIONS}
                    isSearchable={false}
                  />
                </div>
                {advFilterActive && (
                  <button
                    type="button"
                    onClick={() => { setGoalFilter("all"); setHollandFilter("all"); setInfoFilter("all"); }}
                    className="text-[13px] text-pink-600 hover:underline bg-transparent text-left"
                  >
                    ล้างตัวกรองเพิ่มเติม
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={openExportWizard}
          className="h-10 mt-5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-semibold flex items-center gap-2"
        >
          <FaDownload size={12} /> ส่งออก{checkedIds.size > 0 ? ` (${checkedIds.size})` : "ทั้งหมด"}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="h-10 mt-5 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <FaPrint size={12} /> พิมพ์รายงาน
        </button>
      </div>

      <div className="mb-3 text-[15px] text-gray-500">พบนักเรียน {students.length} คน</div>

      {loading ? (
        <PageLoading />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
          {/* ===== รายชื่อนักเรียน (ซ้าย) — เส้นคั่นแทนกรอบครอบ ให้ต่อเนื่องกับฝั่งขวา ===== */}
          <div className="xl:border-r xl:border-gray-200 xl:pr-6">
            <button
              type="button"
              onClick={toggleCheckAll}
              className="w-full px-2 py-2.5 border-b border-gray-100 flex items-center gap-2 text-[14.5px] text-gray-500 bg-transparent hover:bg-gray-50"
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${pagedStudents.length > 0 && checkedIds.size === pagedStudents.length ? "bg-pink-500 text-white" : "border-2 border-gray-300"}`}>
                {pagedStudents.length > 0 && checkedIds.size === pagedStudents.length && <FaCheck size={9} />}
              </span>
              เลือกทั้งหมด{checkedIds.size > 0 && ` (เลือกแล้ว ${checkedIds.size})`}
            </button>
            <div className="max-h-[720px] overflow-y-auto divide-y divide-gray-100">
              {pagedStudents.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-[15px]">ไม่พบนักเรียน</div>
              ) : (
                pagedStudents.map((s) => {
                  const isSelected = selectedStudent?.user_id === s.user_id;
                  return (
                    <button
                      type="button"
                      key={s.user_id}
                      onClick={() => { setSelectedId(s.user_id); setActiveTab("info"); }}
                      className={`w-full text-left px-2 py-3 flex items-center gap-2.5 transition rounded-lg ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 bg-white"}`}
                    >
                      <span
                        role="checkbox"
                        aria-checked={checkedIds.has(s.user_id)}
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); toggleCheck(s.user_id); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleCheck(s.user_id); } }}
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 cursor-pointer ${checkedIds.has(s.user_id) ? "bg-pink-500 text-white" : "border-2 border-gray-300"}`}
                      >
                        {checkedIds.has(s.user_id) && <FaCheck size={9} />}
                      </span>
                      <Avatar src={generalInfoByUser[s.user_id]?.avatar_url} name={s.fullname} size={40} />
                      <div className="min-w-0 flex-1 text-[15.5px] font-medium text-gray-900 truncate">{s.fullname}</div>
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
              <div className="border-b border-gray-200 py-6 mb-5">
                <div className="flex flex-wrap items-start gap-6">
                  <Avatar src={generalInfoByUser[selectedStudent.user_id]?.avatar_url} name={selectedStudent.fullname} size={80} />
                  <div className="flex-1 min-w-70">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[21px] font-bold text-gray-900">{selectedStudent.fullname}</div>
                      <span className={`text-[13px] font-medium px-2 py-0.5 rounded-full ${STATUS_META[selectedStatus].cls}`}>
                        {STATUS_META[selectedStatus].label}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[15px] text-gray-500">
                      <div>รหัสนักเรียน <span className="text-gray-800">{selectedStudent.student_code}</span></div>
                      <div>ชั้น <span className="text-gray-800">{selectedGradeLabel || "ยังไม่ระบุห้อง"}{selectedStudent.seatNo != null && ` เลขที่ ${selectedStudent.seatNo}`}</span></div>
                      <div className="flex items-center gap-1.5"><FaChalkboardTeacher size={11} /> ครูที่ปรึกษา <span className="text-gray-800">{selectedTeacherName || "ยังไม่ระบุ"}</span></div>
                      <div className="flex items-center gap-1.5"><FaEnvelope size={11} /> อีเมล <span className="text-gray-800 truncate">{selectedStudent.email || "-"}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto shrink-0">
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
                      className={`flex items-center gap-2 px-3.5 py-2.5 text-[15px] font-medium whitespace-nowrap border-b-2 -mb-px bg-transparent transition ${
                        activeTab === t.key ? "border-pink-500 text-pink-700" : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <t.icon size={12} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "info" && (() => {
                const generalInfo = generalInfoByUser[selectedStudent.user_id];
                const formData = generalInfo?.form_data;
                return (
                  <>
                    {generalInfoByUser[selectedStudent.user_id] === undefined ? (
                      <div className="py-2 rounded-2xl border border-dashed border-gray-200">
                        <PageLoading label="กำลังโหลดข้อมูลทั่วไป..." />
                      </div>
                    ) : !formData ? (
                      <div className="text-center text-gray-400 py-10 rounded-2xl border border-dashed border-gray-200">
                        นักเรียนคนนี้ยังไม่เคยกรอกแบบฟอร์มข้อมูลทั่วไป (/studentinfo)
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {GENERAL_INFO_SECTIONS.map((sec, i) => {
                          const open = openInfoSections.has(sec.key);
                          const rows = sec.fields ? sec.fields(formData) : [];
                          const tableInfo = sec.table ? sec.table(formData) : null;
                          return (
                            <div key={sec.key}>
                              <button
                                type="button"
                                onClick={() => toggleInfoSection(sec.key)}
                                className="w-full flex items-center gap-3 px-2 py-3.5 hover:bg-gray-50 text-left bg-transparent"
                              >
                                <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-[13.5px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[15.5px] font-medium text-gray-900">{sec.title}</div>
                                  {!open && sec.subtitle && (
                                    <div className="text-[12.5px] text-gray-400 truncate mt-0.5">{sec.subtitle}</div>
                                  )}
                                </div>
                                <FaChevronDown className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} size={12} />
                              </button>
                              {open && (
                                <div className="px-2 pb-4 pl-11 space-y-4">
                                  {rows.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                      {rows.map(([label, value]) => (
                                        <InfoRow key={label} label={label} value={value || "-"} muted={!value} />
                                      ))}
                                    </div>
                                  )}
                                  {tableInfo && (
                                    <div>
                                      {tableInfo.title && <div className="text-[13.5px] text-gray-500 mb-1.5">{tableInfo.title}</div>}
                                      {tableInfo.rows.length === 0 ? (
                                        <div className="text-[15px] text-gray-400">ยังไม่มีข้อมูล</div>
                                      ) : (
                                        <table className="w-full text-[14px] border-collapse">
                                          <thead>
                                            <tr className="text-left text-gray-400 text-[12.5px]">
                                              {tableInfo.columns.map((c) => <th key={c} className="font-normal pb-2 pr-3">{c}</th>)}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {tableInfo.rows.map((r, ri) => (
                                              <tr key={ri} className="border-t border-gray-100">
                                                {r.map((cell, ci) => <td key={ci} className="py-2 pr-3 text-gray-700">{cell || "-"}</td>)}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  )}
                                  {rows.length === 0 && !tableInfo && (
                                    <div className="text-[15px] text-gray-400 py-1">ยังไม่มีข้อมูล</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}

              {activeTab === "goal" && (
                <InfoCard title="เป้าหมายของนักเรียน">
                  {!selectedGoal ? (
                    <div className="text-[15px] text-gray-400 py-2">นักเรียนยังไม่ได้ตั้งเป้าหมาย</div>
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
                  <div className="mb-3 text-[14px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    ระบบยังไม่มีแนวคิดวิชา/หน่วยกิต/เกรดรายภาคเรียน จึงแสดงเป็นคะแนนสะสมจากงานที่ส่งจริงแทน GPA/GPAX
                  </div>
                  {selectedSubmissions.length === 0 ? (
                    <div className="text-[15px] text-gray-400 py-2">ยังไม่มีงานที่ให้คะแนนแล้ว</div>
                  ) : (
                    <table className="w-full text-[15px]">
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
                    <div className="text-[15px] text-gray-400 py-2">ยังไม่มีข้อมูลการเช็คชื่อ</div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-8">
                      <StudentAttendanceDonut summary={selectedAttendance} />
                      <div className="text-[15px] text-gray-600">
                        จากทั้งหมด {selectedAttendance.totalDays} วัน · มาเรียน {selectedAttendancePct}%
                      </div>
                    </div>
                  )}
                </InfoCard>
              )}

              {activeTab === "holland" && (
                <InfoCard title="ผลแบบประเมินแนวทาง (Holland)">
                  {!selectedTypeResult ? (
                    <div className="text-[15px] text-gray-400 py-2">นักเรียนยังไม่ได้ทำแบบทดสอบ</div>
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
                  <div className="text-[15px] text-gray-400 py-2">ฟีเจอร์นี้ยังไม่เปิดใช้งาน — ระบบยังไม่มีตารางบันทึกการให้คำปรึกษา</div>
                </InfoCard>
              )}

              {activeTab === "notes" && (
                <InfoCard title="บันทึกเพิ่มเติม">
                  <div className="text-[15px] text-gray-400 py-2">ฟีเจอร์นี้ยังไม่เปิดใช้งาน</div>
                </InfoCard>
              )}
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[15px]">
            ก่อนหน้า
          </button>
          <span className="text-[15px] text-gray-500">หน้า {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 text-[15px]">
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
                  <h2 className="text-[18px] font-semibold text-gray-900">ส่งออกข้อมูลนักเรียน</h2>
                  <button type="button" onClick={closeExportWizard} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent"><FaTimes size={13} /></button>
                </div>

                <div className="text-[14.5px] text-gray-500 mb-2">
                  เลือกข้อมูลที่ต้องการส่งออก ({checkedIds.size > 0 ? `นักเรียนที่เลือก ${checkedIds.size} คน` : `ทั้งหมด ${exportTargets.length} คน`})
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  {EXPORT_CATEGORIES.map((c) => (
                    <label key={c.key} className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-[15.5px] ${c.available ? "text-gray-800" : "text-gray-300"}`}>
                      <input
                        type="checkbox"
                        disabled={!c.available}
                        checked={exportCategoryKeys.has(c.key)}
                        onChange={() => toggleExportCategory(c.key)}
                        className="accent-pink-600"
                      />
                      {c.label}
                      {!c.available && <span className="text-[13px] text-gray-300">(ยังไม่มีข้อมูล)</span>}
                    </label>
                  ))}
                </div>

                <div className="text-[14.5px] text-gray-500 mb-2">รูปแบบไฟล์</div>
                <div className="flex flex-col gap-1 mb-5">
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[15.5px] text-gray-800">
                    <input type="radio" name="fmt" checked={exportFormat === "pdf"} onChange={() => setExportFormat("pdf")} className="accent-pink-600" /> PDF
                  </label>
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[15.5px] text-gray-300">
                    <input type="radio" name="fmt" disabled className="accent-pink-600" /> Excel (.xlsx) <span className="text-[13px]">(เร็วๆ นี้)</span>
                  </label>
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[15.5px] text-gray-800">
                    <input type="radio" name="fmt" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} className="accent-pink-600" /> CSV (.csv)
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeExportWizard} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                  <button
                    type="button"
                    disabled={selectedCategories.length === 0}
                    onClick={() => setExportStep(exportFormat === "pdf" ? 2 : 3)}
                    className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-semibold disabled:opacity-40"
                  >
                    ถัดไป
                  </button>
                </div>
              </>
            )}

            {exportStep === 2 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-gray-900">ตั้งค่าการส่งออก PDF</h2>
                  <button type="button" onClick={closeExportWizard} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent"><FaTimes size={13} /></button>
                </div>

                <div className="text-[14.5px] text-gray-500 mb-2">วิธีจัดไฟล์</div>
                <div className="flex flex-col gap-1 mb-4">
                  <label className="flex items-start gap-2.5 px-2 py-2 rounded-lg text-[15.5px] text-gray-800">
                    <input type="radio" name="method" checked={exportMethod === "single"} onChange={() => setExportMethod("single")} className="accent-pink-600 mt-0.5" />
                    <span>รวมเป็นไฟล์เดียว<br /><span className="text-[13.5px] text-gray-400">รวมข้อมูลนักเรียนทั้งหมดในไฟล์ PDF เดียว</span></span>
                  </label>
                  <label className="flex items-start gap-2.5 px-2 py-2 rounded-lg text-[15.5px] text-gray-300">
                    <input type="radio" name="method" disabled className="accent-pink-600 mt-0.5" />
                    <span>แยกเป็นไฟล์คนละไฟล์ (ZIP) <span className="text-[13px]">(เร็วๆ นี้)</span><br /><span className="text-[13.5px] text-gray-300">แยกไฟล์ PDF รายบุคคล แล้วบีบอัดเป็นไฟล์ ZIP</span></span>
                  </label>
                </div>

                <div className="text-[14.5px] text-gray-500 mb-2">ตัวเลือกเพิ่มเติม</div>
                <div className="flex flex-col gap-1 mb-5">
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[15.5px] text-gray-800">
                    <input type="checkbox" checked={exportIncludeToc} onChange={(e) => setExportIncludeToc(e.target.checked)} className="accent-pink-600" /> ใส่สารบัญ (สารบัญรายชื่อ)
                  </label>
                  <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[15.5px] text-gray-800">
                    <input type="checkbox" checked={exportIncludePhoto} onChange={(e) => setExportIncludePhoto(e.target.checked)} className="accent-pink-600" /> แสดงรูปนักเรียน
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setExportStep(1)} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-600 hover:bg-gray-50">ย้อนกลับ</button>
                  <button type="button" onClick={() => setExportStep(3)} className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-semibold">ถัดไป</button>
                </div>
              </>
            )}

            {exportStep === 3 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-semibold text-gray-900">ยืนยันการส่งออก</h2>
                  <button type="button" onClick={closeExportWizard} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 flex items-center justify-center bg-transparent"><FaTimes size={13} /></button>
                </div>

                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 mb-5 text-[15px] text-gray-700">
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
                    <div className="text-[14.5px] text-gray-500 mb-1.5">กำลังสร้างไฟล์... {exportProgress}%</div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${exportProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setExportStep(exportFormat === "pdf" ? 2 : 1)} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-600 hover:bg-gray-50">ย้อนกลับ</button>
                    <button type="button" onClick={confirmExport} className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-semibold">ยืนยันการส่งออก</button>
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
      <div className="text-[13px] text-gray-400 truncate">{label}</div>
      <div className={`font-semibold truncate ${small ? "text-[15px]" : "text-[19px]"} ${valueClass}`}>{value}</div>
    </div>
  );
}

function InfoCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      <div className="text-[16px] font-semibold text-gray-900 mb-3">{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, muted }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-[15px]">
      <div className="text-gray-400 shrink-0">{label}</div>
      <div className={`text-right ${muted ? "text-gray-400" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

function StudentAttendanceDonut({ summary }) {
  const data = [
    { label: "มาเรียน", value: Number(summary.presentDays) || 0, color: "#10b981" },
    { label: "สาย", value: Number(summary.lateDays) || 0, color: "#f59e0b" },
    { label: "ลา", value: Number(summary.leaveDays) || 0, color: "#ec4899" },
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
          <div key={d.label} className="flex items-center gap-2 text-[14.5px] text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            {d.label} · <span className="font-semibold">{d.value}</span> วัน
          </div>
        ))}
      </div>
    </div>
  );
}

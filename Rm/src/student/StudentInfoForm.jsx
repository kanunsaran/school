import { useEffect, useRef, useState, cloneElement } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import SidebarNav from "../navstudent";
import Header from "../Header";
import { FaCamera, FaUserGraduate, FaCheck } from "react-icons/fa";
import { getStudentGeneralInfo, saveStudentGeneralInfo } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import ThaiDateField from "../components/ThaiDateField.jsx";
import PageLoading from "../components/PageLoading.jsx";

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

// ใช้ user จาก session จริงหลัง login (เดิม hardcode "1" ทำให้บัญชีอื่นบันทึกข้อมูลไปอยู่คนละ user_id กับที่ StudentDashboard เช็ค เลยเด้งกลับมากรอกซ้ำไม่รู้จบ)
const CURRENT_STUDENT_ID = getCurrentUser()?.user_id ?? "1";

const PARTS = [
  { label: "ประวัติส่วนตัวและครอบครัว" },
  { label: "ประวัติการศึกษา" },
  { label: "ความสนใจและแนวทางอาชีพ" },
  { label: "ประวัติสุขภาพ" },
];

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// ✅ schema เต็ม ครบทุกฟิลด์ในฟอร์มนี้ (ขยายจาก schema เดิมของ backend ที่มีแค่บางฟิลด์ — คอลัมน์ form_data เป็น JSON
// ขยาย shape ได้โดยไม่ต้อง ALTER TABLE ฝั่ง backend จึงรับ payload นี้ได้เลยไม่ต้องแก้อะไรเพิ่ม)
// คงกลุ่ม personal/contact/address/family/health/education/interests เดิมไว้ (ใส่ฟิลด์เพิ่มในกลุ่มเดิม) และเพิ่ม 2 กลุ่มใหม่ที่ไม่เคยมีที่เก็บ:
// living_situation (สภาพความเป็นอยู่) กับ prepared_by (ผู้กรอกข้อมูล)
const toBackendSchema = (form) => {
  const beYear = Number(form.birthYear); // ฟอร์มเก็บเป็น พ.ศ. backend เก็บ ISO (ค.ศ.)
  const monthIndex = THAI_MONTHS.indexOf(form.birthMonth);
  const dob =
    beYear && monthIndex >= 0 && form.birthDay
      ? `${beYear - 543}-${String(monthIndex + 1).padStart(2, "0")}-${String(form.birthDay).padStart(2, "0")}`
      : null;

  const num = (v) => (v === "" || v == null ? null : Number(v));

  return {
    meta: {
      academic_year: form.academicYear || null,
      classroom: form.classroom || null,
      room: form.room || null,
      roll_number: form.rollNumber || null,
    },
    personal: {
      first_name: form.firstName || null,
      last_name: form.lastName || null,
      nickname: form.nickname || null,
      consent: !!form.consent,
      dob,
      age: num(form.age),
      nationality: form.nationality || null,
      ethnicity: form.ethnicity || null,
      religion: form.religion || null,
    },
    contact: {
      phone: form.phone || null,
      address_phone: form.addressPhone || null,
    },
    address: {
      house_no: form.houseNo || null,
      road: form.road || null,
      subdistrict: form.subdistrict || null,
      district: form.district || null,
      province: form.province || null,
    },
    family: {
      father: {
        first_name: form.fatherFirstName || null, last_name: form.fatherLastName || null, age: num(form.fatherAge), phone: form.fatherPhone || null,
        education: form.fatherEducation || null, occupation: form.fatherOccupation || null, income: num(form.fatherIncome),
        workplace: form.fatherWorkplace || null, work_phone: form.fatherWorkPhone || null,
      },
      mother: {
        first_name: form.motherFirstName || null, last_name: form.motherLastName || null, age: num(form.motherAge), phone: form.motherPhone || null,
        education: form.motherEducation || null, occupation: form.motherOccupation || null, income: num(form.motherIncome),
        workplace: form.motherWorkplace || null, work_phone: form.motherWorkPhone || null,
      },
      parents_marital_status: form.parentsMaritalStatus,
      living_with: form.livingWith || null,
      living_with_other: form.livingWithOther || null,
      guardian: {
        first_name: form.guardianFirstName || null, last_name: form.guardianLastName || null, age: num(form.guardianAge),
        relation: form.guardianRelation || null, phone: form.guardianPhone || null, occupation: form.guardianOccupation || null, income: num(form.guardianIncome),
      },
      siblings_same_parents: { total: num(form.siblingsSameParents.total), male: num(form.siblingsSameParents.male), female: num(form.siblingsSameParents.female) },
      birth_order: num(form.birthOrder),
      siblings_father_other: { total: num(form.siblingsFatherOther.total), male: num(form.siblingsFatherOther.male), female: num(form.siblingsFatherOther.female) },
      siblings_mother_other: { total: num(form.siblingsMotherOther.total), male: num(form.siblingsMotherOther.male), female: num(form.siblingsMotherOther.female) },
    },
    living_situation: {
      most_trusted_family_member: form.mostTrustedFamilyMember || null,
      housing_type: form.housingType || null,
      has_own_room: form.hasOwnRoom || null,
      household_member_count: num(form.householdMemberCount),
      household_members_description: form.householdMembersDescription || null,
      community_condition: form.communityCondition,
      community_condition_other: form.communityConditionOther || null,
      most_influential_person: form.mostInfluentialPerson || null,
      least_influential_person: form.leastInfluentialPerson || null,
      household_chores: form.householdChores || null,
      chores_detail: form.choresDetail || null,
      leave_permission: form.leavePermission || null,
      allowance_source: form.allowanceSource || null,
      allowance_amount: num(form.allowanceAmount),
      distance_km: num(form.distanceKm),
      transport_method: form.transportMethod || null,
      transport_other: form.transportOther || null,
    },
    education: {
      prior_education: form.priorEducation.map((r) => ({ level: r.level, school: r.school || null, gpa: num(r.gpa) })),
      favorite_subject: form.favoriteSubject || null,
      favorite_subject_reason: form.favoriteSubjectReason || null,
      least_favorite_subject: form.leastFavoriteSubject || null,
      least_favorite_subject_reason: form.leastFavoriteSubjectReason || null,
      top_score_subjects: form.topScoreSubjects.filter(Boolean),
      low_score_subjects: form.lowScoreSubjects.filter(Boolean),
      attendance: form.attendance || null,
      attendance_reason: form.attendanceReason || null,
      homework_time: form.homeworkTime || null,
      homework_time_reason: form.homeworkTimeReason || null,
      close_friends: form.closeFriends.filter((f) => f.firstName || f.lastName).map((f) => ({ first_name: f.firstName, last_name: f.lastName, classroom: f.classroom, phone: f.phone })),
    },
    interests: {
      hobby: form.hobby || null,
      special_ability: form.specialAbility || null,
      student_edu_goal: form.studentEduGoal || null,
      guardian_edu_goal: form.guardianEduGoal || null,
      interested_careers: form.interestedCareers.filter(Boolean),
      guardian_expected_career: form.guardianExpectedCareer || null,
    },
    health: {
      illness_history: form.illnessHistory.filter((h) => h.cause).map((h) => ({ cause: h.cause, age: num(h.age) })),
      chronic_disease: form.chronicDisease || null,
      chronic_disease_symptoms: form.chronicDiseaseSymptoms || null,
      weight_kg: num(form.weight),
      height_cm: num(form.height),
      sleep_hours: form.sleepHours || null,
    },
    prepared_by: {
      name: form.preparedByName || null,
      date: form.preparedDate || null,
    },
  };
};

// แปลงกลับจาก schema จริงของ backend มาเติมในฟอร์ม — รองรับทั้งข้อมูลเก่าที่เคยบันทึกด้วย schema แบบย่อ (father.name เป็นชื่อเต็ม)
// และ schema เต็มแบบใหม่ (father.first_name/last_name แยกกัน) กันของเดิมที่เคยกรอกไว้ก่อนหน้านี้หาย
const fromBackendSchema = (fd) => {
  const patch = {};
  const splitName = (name) => {
    const parts = String(name || "").trim().split(/\s+/);
    return [parts[0] || "", parts.slice(1).join(" ") || ""];
  };
  const personName = (obj) =>
    obj?.first_name || obj?.last_name ? [obj.first_name || "", obj.last_name || ""] : splitName(obj?.name);

  if (fd.meta) {
    const m = fd.meta;
    if (m.academic_year) patch.academicYear = String(m.academic_year);
    if (m.classroom) patch.classroom = m.classroom;
    if (m.room) patch.room = m.room;
    if (m.roll_number) patch.rollNumber = String(m.roll_number);
  }
  if (fd.personal) {
    const p = fd.personal;
    if (p.first_name) patch.firstName = p.first_name;
    if (p.last_name) patch.lastName = p.last_name;
    if (p.nickname) patch.nickname = p.nickname;
    if (p.consent != null) patch.consent = !!p.consent;
    if (p.age) patch.age = String(p.age);
    if (p.nationality) patch.nationality = p.nationality;
    if (p.ethnicity) patch.ethnicity = p.ethnicity;
    if (p.religion) patch.religion = p.religion;
    if (p.dob) {
      const [y, m, d] = p.dob.split("-");
      patch.birthYear = String(Number(y) + 543);
      patch.birthMonth = THAI_MONTHS[Number(m) - 1] || "";
      patch.birthDay = String(Number(d));
    }
  }
  if (fd.contact) {
    if (fd.contact.phone) patch.phone = fd.contact.phone;
    if (fd.contact.address_phone) patch.addressPhone = fd.contact.address_phone;
  }
  if (fd.address) {
    const a = fd.address;
    if (a.house_no) patch.houseNo = a.house_no;
    if (a.road) patch.road = a.road;
    if (a.subdistrict) patch.subdistrict = a.subdistrict;
    if (a.district) patch.district = a.district;
    if (a.province) patch.province = a.province;
    // เข้ากันได้กับของเก่าที่เคยเก็บเป็นสตริงที่อยู่รวมก้อนเดียว (current_address/house_registration)
    if (!a.house_no && a.current_address) patch.houseNo = a.current_address;
  }
  if (fd.family) {
    const f = fd.family;
    if (f.father) {
      [patch.fatherFirstName, patch.fatherLastName] = personName(f.father);
      if (f.father.age) patch.fatherAge = String(f.father.age);
      if (f.father.phone) patch.fatherPhone = f.father.phone;
      if (f.father.education) patch.fatherEducation = f.father.education;
      if (f.father.occupation) patch.fatherOccupation = f.father.occupation;
      if (f.father.income) patch.fatherIncome = String(f.father.income);
      if (f.father.workplace) patch.fatherWorkplace = f.father.workplace;
      if (f.father.work_phone) patch.fatherWorkPhone = f.father.work_phone;
    }
    if (f.mother) {
      [patch.motherFirstName, patch.motherLastName] = personName(f.mother);
      if (f.mother.age) patch.motherAge = String(f.mother.age);
      if (f.mother.phone) patch.motherPhone = f.mother.phone;
      if (f.mother.education) patch.motherEducation = f.mother.education;
      if (f.mother.occupation) patch.motherOccupation = f.mother.occupation;
      if (f.mother.income) patch.motherIncome = String(f.mother.income);
      if (f.mother.workplace) patch.motherWorkplace = f.mother.workplace;
      if (f.mother.work_phone) patch.motherWorkPhone = f.mother.work_phone;
    }
    if (f.parents_marital_status) patch.parentsMaritalStatus = f.parents_marital_status;
    if (f.living_with) patch.livingWith = f.living_with;
    if (f.living_with_other) patch.livingWithOther = f.living_with_other;
    if (f.guardian) {
      [patch.guardianFirstName, patch.guardianLastName] = personName(f.guardian);
      if (f.guardian.age) patch.guardianAge = String(f.guardian.age);
      if (f.guardian.relation) patch.guardianRelation = f.guardian.relation;
      if (f.guardian.phone) patch.guardianPhone = f.guardian.phone;
      if (f.guardian.occupation) patch.guardianOccupation = f.guardian.occupation;
      if (f.guardian.income) patch.guardianIncome = String(f.guardian.income);
    }
    if (f.siblings_same_parents) {
      const s = f.siblings_same_parents;
      patch.siblingsSameParents = { total: s.total != null ? String(s.total) : "", male: s.male != null ? String(s.male) : "", female: s.female != null ? String(s.female) : "" };
    } else if (f.siblings_count != null) {
      patch.siblingsSameParents = { total: String(f.siblings_count), male: "", female: "" }; // เข้ากันได้กับของเก่า
    }
    if (f.birth_order != null) patch.birthOrder = String(f.birth_order);
    if (f.siblings_father_other) {
      const s = f.siblings_father_other;
      patch.siblingsFatherOther = { total: s.total != null ? String(s.total) : "", male: s.male != null ? String(s.male) : "", female: s.female != null ? String(s.female) : "" };
    }
    if (f.siblings_mother_other) {
      const s = f.siblings_mother_other;
      patch.siblingsMotherOther = { total: s.total != null ? String(s.total) : "", male: s.male != null ? String(s.male) : "", female: s.female != null ? String(s.female) : "" };
    }
  }
  if (fd.living_situation) {
    const l = fd.living_situation;
    if (l.most_trusted_family_member) patch.mostTrustedFamilyMember = l.most_trusted_family_member;
    if (l.housing_type) patch.housingType = l.housing_type;
    if (l.has_own_room) patch.hasOwnRoom = l.has_own_room;
    if (l.household_member_count != null) patch.householdMemberCount = String(l.household_member_count);
    if (l.household_members_description) patch.householdMembersDescription = l.household_members_description;
    if (l.community_condition) patch.communityCondition = l.community_condition;
    if (l.community_condition_other) patch.communityConditionOther = l.community_condition_other;
    if (l.most_influential_person) patch.mostInfluentialPerson = l.most_influential_person;
    if (l.least_influential_person) patch.leastInfluentialPerson = l.least_influential_person;
    if (l.household_chores) patch.householdChores = l.household_chores;
    if (l.chores_detail) patch.choresDetail = l.chores_detail;
    if (l.leave_permission) patch.leavePermission = l.leave_permission;
    if (l.allowance_source) patch.allowanceSource = l.allowance_source;
    if (l.allowance_amount != null) patch.allowanceAmount = String(l.allowance_amount);
    if (l.distance_km != null) patch.distanceKm = String(l.distance_km);
    if (l.transport_method) patch.transportMethod = l.transport_method;
    if (l.transport_other) patch.transportOther = l.transport_other;
  }
  if (fd.education) {
    const e = fd.education;
    if (e.prior_education?.length) patch.priorEducation = e.prior_education.map((r) => ({ level: r.level, school: r.school || "", gpa: r.gpa != null ? String(r.gpa) : "" }));
    if (e.favorite_subject) patch.favoriteSubject = e.favorite_subject;
    if (e.favorite_subject_reason) patch.favoriteSubjectReason = e.favorite_subject_reason;
    if (e.least_favorite_subject) patch.leastFavoriteSubject = e.least_favorite_subject;
    if (e.least_favorite_subject_reason) patch.leastFavoriteSubjectReason = e.least_favorite_subject_reason;
    if (e.top_score_subjects?.length) patch.topScoreSubjects = [...e.top_score_subjects, "", ""].slice(0, 2);
    if (e.low_score_subjects?.length) patch.lowScoreSubjects = [...e.low_score_subjects, "", ""].slice(0, 2);
    if (e.attendance) patch.attendance = e.attendance;
    if (e.attendance_reason) patch.attendanceReason = e.attendance_reason;
    if (e.homework_time) patch.homeworkTime = e.homework_time;
    if (e.homework_time_reason) patch.homeworkTimeReason = e.homework_time_reason;
    if (e.close_friends?.length) patch.closeFriends = [...e.close_friends.map((f) => ({ firstName: f.first_name || "", lastName: f.last_name || "", classroom: f.classroom || "", phone: f.phone || "" })), { firstName: "", lastName: "", classroom: "", phone: "" }].slice(0, 2);
    // เข้ากันได้กับของเก่าที่เคยเก็บแค่โรงเรียนล่าสุดก้อนเดียว (ไม่มี prior_education แบบตาราง)
    if (e.previous_school && !patch.priorEducation) {
      patch.priorEducation = [
        { level: "ประถมศึกษาปีที่ 6", school: "", gpa: "" },
        { level: "มัธยมศึกษาปีที่ 3", school: e.previous_school, gpa: e.gpa != null ? String(e.gpa) : "" },
      ];
    }
  }
  if (fd.interests) {
    const i = fd.interests;
    if (i.hobby) patch.hobby = i.hobby;
    else if (i.hobbies?.length) patch.hobby = i.hobbies.join(", "); // เข้ากันได้กับของเก่า
    if (i.special_ability) patch.specialAbility = i.special_ability;
    else if (fd.education?.special_skills?.length) patch.specialAbility = fd.education.special_skills.join(", "); // เข้ากันได้กับของเก่า
    if (i.student_edu_goal) patch.studentEduGoal = i.student_edu_goal;
    else if (i.future_goal) patch.studentEduGoal = i.future_goal; // เข้ากันได้กับของเก่า
    if (i.guardian_edu_goal) patch.guardianEduGoal = i.guardian_edu_goal;
    if (i.interested_careers?.length) patch.interestedCareers = [...i.interested_careers, "", "", ""].slice(0, 3);
    else if (i.target_faculty) patch.interestedCareers = [i.target_faculty, "", ""]; // เข้ากันได้กับของเก่า
    if (i.guardian_expected_career) patch.guardianExpectedCareer = i.guardian_expected_career;
  }
  if (fd.health) {
    const h = fd.health;
    if (h.illness_history?.length) patch.illnessHistory = [...h.illness_history.map((r) => ({ cause: r.cause || "", age: r.age != null ? String(r.age) : "" })), { cause: "", age: "" }].slice(0, 2);
    if (h.chronic_disease) patch.chronicDisease = h.chronic_disease;
    else if (h.medical_condition) patch.chronicDisease = h.medical_condition; // เข้ากันได้กับของเก่า
    if (h.chronic_disease_symptoms) patch.chronicDiseaseSymptoms = h.chronic_disease_symptoms;
    if (h.weight_kg) patch.weight = String(h.weight_kg);
    if (h.height_cm) patch.height = String(h.height_cm);
    if (h.sleep_hours) patch.sleepHours = h.sleep_hours;
  }
  if (fd.prepared_by) {
    if (fd.prepared_by.name) patch.preparedByName = fd.prepared_by.name;
    if (fd.prepared_by.date) patch.preparedDate = fd.prepared_by.date;
  }
  return patch;
};

const initialForm = {
  avatar: "",
  academicYear: "2569",
  classroom: "",
  room: "",
  rollNumber: "",

  firstName: "",
  lastName: "",
  nickname: "",
  consent: false,
  religion: "",
  ethnicity: "",
  nationality: "",
  birthDay: "",
  birthMonth: "",
  birthYear: "",
  age: "",
  phone: "",

  houseNo: "",
  road: "",
  subdistrict: "",
  district: "",
  province: "",
  addressPhone: "",

  fatherFirstName: "", fatherLastName: "", fatherAge: "", fatherPhone: "",
  fatherEducation: "", fatherOccupation: "", fatherIncome: "", fatherWorkplace: "", fatherWorkPhone: "",
  motherFirstName: "", motherLastName: "", motherAge: "", motherPhone: "",
  motherEducation: "", motherOccupation: "", motherIncome: "", motherWorkplace: "", motherWorkPhone: "",

  parentsMaritalStatus: [],
  livingWith: "",
  livingWithOther: "",

  guardianFirstName: "",
  guardianLastName: "",
  guardianAge: "",
  guardianRelation: "",
  guardianPhone: "",
  guardianOccupation: "",
  guardianIncome: "",

  siblingsSameParents: { total: "", male: "", female: "" },
  birthOrder: "",
  siblingsFatherOther: { total: "", male: "", female: "" },
  siblingsMotherOther: { total: "", male: "", female: "" },

  mostTrustedFamilyMember: "",
  housingType: "",
  hasOwnRoom: "",
  householdMemberCount: "",
  householdMembersDescription: "",
  communityCondition: [],
  communityConditionOther: "",
  mostInfluentialPerson: "",
  leastInfluentialPerson: "",
  householdChores: "",
  choresDetail: "",
  leavePermission: "",
  allowanceSource: "",
  allowanceAmount: "",
  distanceKm: "",
  transportMethod: "",
  transportOther: "",

  priorEducation: [
    { level: "ประถมศึกษาปีที่ 6", school: "", gpa: "" },
    { level: "มัธยมศึกษาปีที่ 3", school: "", gpa: "" },
  ],
  favoriteSubject: "",
  favoriteSubjectReason: "",
  leastFavoriteSubject: "",
  leastFavoriteSubjectReason: "",
  topScoreSubjects: ["", ""],
  lowScoreSubjects: ["", ""],
  attendance: "",
  attendanceReason: "",
  homeworkTime: "",
  homeworkTimeReason: "",
  closeFriends: [
    { firstName: "", lastName: "", classroom: "", phone: "" },
    { firstName: "", lastName: "", classroom: "", phone: "" },
  ],

  hobby: "",
  specialAbility: "",
  studentEduGoal: "",
  guardianEduGoal: "",
  interestedCareers: ["", "", ""],
  guardianExpectedCareer: "",

  illnessHistory: [
    { cause: "", age: "" },
    { cause: "", age: "" },
  ],
  chronicDisease: "",
  chronicDiseaseSymptoms: "",
  weight: "",
  height: "",
  sleepHours: "",

  preparedByName: "",
  preparedDate: "",
};

export default function StudentInfoForm() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(0);
  const [photoError, setPhotoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // โหลดข้อมูลที่เคยกรอกไว้ (ถ้ามี) มาเติมในฟอร์มให้อัตโนมัติ แทนที่จะเริ่มว่างทุกครั้ง
  useEffect(() => {
    getStudentGeneralInfo(CURRENT_STUDENT_ID)
      .then((data) => {
        if (data?.form_data) setForm((prev) => ({ ...prev, ...fromBackendSchema(data.form_data) }));
      })
      .catch((err) => console.error("โหลดข้อมูลนักเรียนไม่สำเร็จ:", err))
      .finally(() => setLoading(false));
  }, []);

  const goNext = () => {
    setStep((s) => Math.min(s + 1, PARTS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const onNestedChange = (key, subkey, value) => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], [subkey]: value } }));
    setSaved(false);
  };

  const onListItemChange = (key, index, field, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
    setSaved(false);
  };

  const onListValueChange = (key, index, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((v, i) => (i === index ? value : v)),
    }));
    setSaved(false);
  };

  const onPickPhoto = () => fileInputRef.current?.click();

  const onPhotoSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("ขนาดไฟล์รูปใหญ่เกิน 10MB กรุณาเลือกไฟล์ใหม่");
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onload = () => onChange("avatar", reader.result);
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setSubmitting(true);
    try {
      await saveStudentGeneralInfo(CURRENT_STUDENT_ID, toBackendSchema(form));
      setSaved(true);
      navigate("/");
    } catch (err) {
      console.error("บันทึกข้อมูลนักเรียนไม่สำเร็จ:", err);
      Swal.fire("บันทึกไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const requiredCore = [
    form.firstName,
    form.lastName,
    form.birthDay,
    form.birthMonth,
    form.birthYear,
    form.phone,
    form.houseNo,
    form.subdistrict,
    form.district,
    form.province,
    form.classroom,
    form.room,
    form.rollNumber,
  ];

  const isFormComplete =
    requiredCore.every((v) => String(v).trim() !== "") && form.consent;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex text-[15.5px] text-gray-900">
        <Header />
        <SidebarNav />
        <main className="flex-1 min-w-0 w-full bg-white pt-16 flex items-center justify-center text-gray-400">
          <PageLoading label="กำลังโหลดข้อมูล..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex text-[15.5px] text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full bg-white pt-16">
        <div className="w-full px-8 py-8 max-w-none">
          {/* Heading */}
          <div className="mb-6">
            <div className="page-title">
              ข้อมูลส่วนตัวของนักเรียน
            </div>
            <div className="page-subtitle mt-0.5">
              โรงเรียนขอนแก่นวิทยายน • ปีการศึกษา {form.academicYear}
            </div>
          </div>

          {/* คำชี้แจง */}
          <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-[14px] text-gray-600 leading-relaxed">
            <span className="font-medium text-gray-800">คำชี้แจง</span> ให้นักเรียนเติมข้อความในแบบสอบถามให้ตรงกับความเป็นจริงมากที่สุด
            การตอบตามความเป็นจริงจะเป็นประโยชน์แก่ตัวนักเรียนเอง และข้อมูลในแบบสอบถามนี้จะเก็บเป็นความลับ
          </div>

          {/* Photo + class/roll header */}
          <div className="flex items-start gap-6 mb-10">
            <div className="relative shrink-0">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt="รูปนักเรียน"
                  className="w-24 h-32 rounded-xl object-cover border border-gray-200"
                />
              ) : (
                <div className="w-24 h-32 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
                  <FaUserGraduate className="text-gray-400 text-[32px]" />
                </div>
              )}

              <button
                type="button"
                onClick={onPickPhoto}
                className="absolute -right-2 -bottom-2 h-11 w-11 rounded-full
                           bg-white border border-gray-300 shadow
                           hover:bg-gray-50 transition
                           flex items-center justify-center"
              >
                <FaCamera className="text-gray-700 text-[20px]" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onPhotoSelected}
                className="hidden"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[21.5px] font-medium text-gray-900 truncate">
                {`${form.firstName} ${form.lastName}`.trim() || "ยังไม่ระบุชื่อ"}
              </div>
              <div className="text-[13.5px] text-gray-400 mt-2">
                กรุณาใช้รูปถ่ายแนวตั้ง (Portrait) หน้าตรง เห็นใบหน้าชัดเจน ขนาดไฟล์ไม่เกิน 5MB
              </div>
              {photoError && <div className="text-[13.5px] text-red-500 mt-1">{photoError}</div>}

              <div className="grid grid-cols-3 gap-3 mt-4 max-w-sm">
                <Field label="ระดับชั้น">
                  <SelectInput
                    value={form.classroom}
                    onChange={(v) => onChange("classroom", v)}
                    placeholder="ม. ..."
                    options={Array.from({ length: 6 }, (_, i) => ({
                      value: `ม.${i + 1}`,
                      label: `ม.${i + 1}`,
                    }))}
                  />
                </Field>
                <Field label="ห้อง">
                  <SelectInput
                    value={form.room}
                    onChange={(v) => onChange("room", v)}
                    placeholder="ห้อง"
                    options={Array.from({ length: 22 }, (_, i) => ({
                      value: String(i + 1),
                      label: String(i + 1),
                    }))}
                  />
                </Field>
                <Field label="เลขที่">
                  <TextInput
                    type="number"
                    value={form.rollNumber}
                    onChange={(v) => onChange("rollNumber", v)}
                    placeholder="เลขที่"
                  />
                </Field>
              </div>
            </div>
          </div>

          {saved && (
            <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-[15.5px] text-gray-700 flex items-center gap-2">
              <FaCheck className="text-green-600 text-[13.5px]" />
              บันทึกข้อมูลเรียบร้อยแล้ว
            </div>
          )}

          <StepIndicator parts={PARTS} current={step} onSelect={setStep} />

          <div>
            {step === 0 && (
              <>
                <PartHeading part="ด้านที่ 1" title="ประวัติส่วนตัวและครอบครัว" />

                <FormSection title="ข้อมูลนักเรียน">
                  <Field label="ชื่อ">
                    <TextInput required value={form.firstName} onChange={(v) => onChange("firstName", v)} placeholder="ชื่อ" />
                  </Field>
                  <Field label="นามสกุล">
                    <TextInput required value={form.lastName} onChange={(v) => onChange("lastName", v)} placeholder="นามสกุล" />
                  </Field>
                  <Field label="ชื่อเล่น" required={false}>
                    <TextInput value={form.nickname} onChange={(v) => onChange("nickname", v)} placeholder="ชื่อเล่น" />
                  </Field>

                  <div className="md:col-span-2 flex items-start gap-2 -mt-1 mb-1">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={form.consent}
                      onChange={(e) => onChange("consent", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-pink-500"
                    />
                    <label htmlFor="consent" className="text-[12.5px] text-gray-500 leading-relaxed">
                      ยินยอมให้งานแนะแนวเก็บรวบรวม ใช้ และ/หรือเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าที่งานแนะแนวมีอยู่หรือที่ข้าพเจ้าได้ให้
                      หรือจะได้ให้กับงานแนะแนว ซึ่งครอบคลุมทั้ง 5 ด้าน ได้แก่ บริการศึกษาข้อมูลนักเรียนเป็นรายบุคคล บริการสนเทศ
                      บริการให้การปรึกษา บริการจัดวางตัวบุคคล และบริการติดตามผล
                    </label>
                  </div>

                  <Field label="นับถือศาสนา" required={false}>
                    <TextInput value={form.religion} onChange={(v) => onChange("religion", v)} placeholder="ศาสนา" />
                  </Field>
                  <Field label="เชื้อชาติ" required={false}>
                    <TextInput value={form.ethnicity} onChange={(v) => onChange("ethnicity", v)} placeholder="เชื้อชาติ" />
                  </Field>
                  <Field label="สัญชาติ" required={false}>
                    <TextInput value={form.nationality} onChange={(v) => onChange("nationality", v)} placeholder="สัญชาติ" />
                  </Field>

                  <Field label="เกิดวันที่">
                    <TextInput required type="number" value={form.birthDay} onChange={(v) => onChange("birthDay", v)} placeholder="วันที่" />
                  </Field>
                  <Field label="เดือน">
                    <SelectInput
                      required
                      value={form.birthMonth}
                      onChange={(v) => onChange("birthMonth", v)}
                      placeholder="เลือกเดือน"
                      options={THAI_MONTHS.map((m) => ({ value: m, label: m }))}
                    />
                  </Field>
                  <Field label="พ.ศ.">
                    <TextInput required type="number" value={form.birthYear} onChange={(v) => onChange("birthYear", v)} placeholder="พ.ศ." />
                  </Field>
                  <Field label="อายุ (ปี)" required={false}>
                    <TextInput type="number" value={form.age} onChange={(v) => onChange("age", v)} placeholder="อายุ" />
                  </Field>
                  <Field label="โทรศัพท์">
                    <TextInput required value={form.phone} onChange={(v) => onChange("phone", v)} placeholder="เบอร์โทรศัพท์" />
                  </Field>
                </FormSection>

                <FormSection title="ที่อยู่ปัจจุบัน">
                  <Field label="บ้านเลขที่">
                    <TextInput required value={form.houseNo} onChange={(v) => onChange("houseNo", v)} placeholder="บ้านเลขที่" />
                  </Field>
                  <Field label="ถนน" required={false}>
                    <TextInput value={form.road} onChange={(v) => onChange("road", v)} placeholder="ถนน" />
                  </Field>
                  <Field label="ตำบล / แขวง">
                    <TextInput required value={form.subdistrict} onChange={(v) => onChange("subdistrict", v)} placeholder="ตำบล / แขวง" />
                  </Field>
                  <Field label="อำเภอ / เขต">
                    <TextInput required value={form.district} onChange={(v) => onChange("district", v)} placeholder="อำเภอ / เขต" />
                  </Field>
                  <Field label="จังหวัด">
                    <TextInput required value={form.province} onChange={(v) => onChange("province", v)} placeholder="จังหวัด" />
                  </Field>
                  <Field label="โทรศัพท์" required={false}>
                    <TextInput value={form.addressPhone} onChange={(v) => onChange("addressPhone", v)} placeholder="เบอร์โทรศัพท์บ้าน" />
                  </Field>
                </FormSection>

                <FormSection title="ข้อมูลบิดา">
                  <PersonFields prefix="father" form={form} onChange={onChange} />
                </FormSection>

                <FormSection title="ข้อมูลมารดา">
                  <PersonFields prefix="mother" form={form} onChange={onChange} />
                </FormSection>

                <FormSection title="สถานภาพครอบครัว">
                  <div className="md:col-span-2">
                    <FieldLabel>สถานภาพสมรสของบิดามารดา</FieldLabel>
                    <ChoicePills
                      multiple
                      options={["อยู่ด้วยกัน", "แยกกันอยู่", "หย่าร้าง", "บิดาสมรสใหม่", "บิดาถึงแก่กรรม", "มารดาสมรสใหม่", "มารดาถึงแก่กรรม"]}
                      value={form.parentsMaritalStatus}
                      onChange={(v) => onChange("parentsMaritalStatus", v)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel>นักเรียนพักอาศัยอยู่กับ</FieldLabel>
                    <ChoicePills
                      options={["บิดามารดา", "บิดา", "มารดา", "บิดาและมารดาเลี้ยง", "มารดาและบิดาเลี้ยง", "บิดามารดาบุญธรรม", "อื่นๆ"]}
                      value={form.livingWith}
                      onChange={(v) => onChange("livingWith", v)}
                    />
                    {form.livingWith === "อื่นๆ" && (
                      <ConditionalField>
                        <TextInput value={form.livingWithOther} onChange={(v) => onChange("livingWithOther", v)} placeholder="ระบุ" />
                      </ConditionalField>
                    )}
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                    <Field label="พี่น้องท้องเดียวกัน (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsSameParents.total}
                        onChange={(v) => onNestedChange("siblingsSameParents", "total", v)} placeholder="รวม" />
                    </Field>
                    <Field label="ชาย (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsSameParents.male}
                        onChange={(v) => onNestedChange("siblingsSameParents", "male", v)} placeholder="ชาย" />
                    </Field>
                    <Field label="หญิง (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsSameParents.female}
                        onChange={(v) => onNestedChange("siblingsSameParents", "female", v)} placeholder="หญิง" />
                    </Field>
                    <Field label="นักเรียนเป็นบุตรลำดับที่" className="md:col-span-3" required={false}>
                      <TextInput type="number" value={form.birthOrder} onChange={(v) => onChange("birthOrder", v)} placeholder="ลำดับที่" />
                    </Field>

                    <Field label="พี่น้องจากบิดากับภรรยาคนอื่น (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsFatherOther.total}
                        onChange={(v) => onNestedChange("siblingsFatherOther", "total", v)} placeholder="รวม" />
                    </Field>
                    <Field label="ชาย (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsFatherOther.male}
                        onChange={(v) => onNestedChange("siblingsFatherOther", "male", v)} placeholder="ชาย" />
                    </Field>
                    <Field label="หญิง (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsFatherOther.female}
                        onChange={(v) => onNestedChange("siblingsFatherOther", "female", v)} placeholder="หญิง" />
                    </Field>

                    <Field label="พี่น้องจากมารดากับสามีคนอื่น (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsMotherOther.total}
                        onChange={(v) => onNestedChange("siblingsMotherOther", "total", v)} placeholder="รวม" />
                    </Field>
                    <Field label="ชาย (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsMotherOther.male}
                        onChange={(v) => onNestedChange("siblingsMotherOther", "male", v)} placeholder="ชาย" />
                    </Field>
                    <Field label="หญิง (คน)" required={false}>
                      <TextInput type="number" value={form.siblingsMotherOther.female}
                        onChange={(v) => onNestedChange("siblingsMotherOther", "female", v)} placeholder="หญิง" />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="ผู้ปกครอง (กรณีไม่ใช่บิดามารดา)">
                  <Field label="ชื่อ" required={false}>
                    <TextInput value={form.guardianFirstName} onChange={(v) => onChange("guardianFirstName", v)} placeholder="ชื่อ" />
                  </Field>
                  <Field label="นามสกุล" required={false}>
                    <TextInput value={form.guardianLastName} onChange={(v) => onChange("guardianLastName", v)} placeholder="นามสกุล" />
                  </Field>
                  <Field label="อายุ" required={false}>
                    <TextInput type="number" value={form.guardianAge} onChange={(v) => onChange("guardianAge", v)} placeholder="ปี" />
                  </Field>
                  <Field label="เกี่ยวข้องกับนักเรียนโดยเป็น" required={false}>
                    <TextInput value={form.guardianRelation} onChange={(v) => onChange("guardianRelation", v)} placeholder="เช่น ลุง, ป้า, ตา, ยาย" />
                  </Field>
                  <Field label="โทรศัพท์" required={false}>
                    <TextInput value={form.guardianPhone} onChange={(v) => onChange("guardianPhone", v)} placeholder="เบอร์โทรศัพท์" />
                  </Field>
                  <Field label="อาชีพ" required={false}>
                    <TextInput value={form.guardianOccupation} onChange={(v) => onChange("guardianOccupation", v)} placeholder="อาชีพ" />
                  </Field>
                  <Field label="รายได้เฉลี่ยเดือนละ (บาท)" required={false}>
                    <TextInput type="number" value={form.guardianIncome} onChange={(v) => onChange("guardianIncome", v)} placeholder="บาท" />
                  </Field>
                </FormSection>

                <FormSection title="สภาพความเป็นอยู่" isLastSection>
                  <Field label="บุคคลในครอบครัวที่นักเรียนรักและไว้ใจมากที่สุด" className="md:col-span-2" required={false}>
                    <TextInput value={form.mostTrustedFamilyMember} onChange={(v) => onChange("mostTrustedFamilyMember", v)} placeholder="ระบุ" />
                  </Field>

                  <div>
                    <FieldLabel>ลักษณะที่พักอาศัย</FieldLabel>
                    <ChoicePills options={["บ้านตนเอง", "บ้านเช่า"]} value={form.housingType} onChange={(v) => onChange("housingType", v)} />
                  </div>
                  <div>
                    <FieldLabel>มีห้องส่วนตัวหรือไม่</FieldLabel>
                    <ChoicePills options={["มี", "ไม่มี"]} value={form.hasOwnRoom} onChange={(v) => onChange("hasOwnRoom", v)} />
                  </div>

                  <Field label="จำนวนสมาชิกที่อาศัยในบ้าน (คน)" required={false}>
                    <TextInput type="number" value={form.householdMemberCount} onChange={(v) => onChange("householdMemberCount", v)} placeholder="จำนวน" />
                  </Field>
                  <Field label="คือ" required={false}>
                    <TextInput value={form.householdMembersDescription} onChange={(v) => onChange("householdMembersDescription", v)} placeholder="เช่น พ่อ แม่ พี่ชาย" />
                  </Field>

                  <div className="md:col-span-2">
                    <FieldLabel>สภาพของชุมชน</FieldLabel>
                    <ChoicePills
                      multiple
                      options={["ขโมยชุกชุม", "สงบสุขดี", "มีอาชญากรรมหรือปัญหาบ่อยๆ", "อื่นๆ"]}
                      value={form.communityCondition}
                      onChange={(v) => onChange("communityCondition", v)}
                    />
                    {form.communityCondition.includes("อื่นๆ") && (
                      <ConditionalField>
                        <TextInput value={form.communityConditionOther} onChange={(v) => onChange("communityConditionOther", v)} placeholder="ระบุ" />
                      </ConditionalField>
                    )}
                  </div>

                  <Field label="บุคคลที่มีอิทธิพลมากที่สุดในบ้าน" required={false}>
                    <TextInput value={form.mostInfluentialPerson} onChange={(v) => onChange("mostInfluentialPerson", v)} placeholder="ระบุ" />
                  </Field>
                  <Field label="บุคคลที่มีอิทธิพลน้อยที่สุดในบ้าน" required={false}>
                    <TextInput value={form.leastInfluentialPerson} onChange={(v) => onChange("leastInfluentialPerson", v)} placeholder="ระบุ" />
                  </Field>

                  <div>
                    <FieldLabel>ภาระหน้าที่นักเรียน</FieldLabel>
                    <ChoicePills options={["ไม่ต้องทำงานบ้าน", "ต้องทำงานบ้าน"]} value={form.householdChores} onChange={(v) => onChange("householdChores", v)} />
                    {form.householdChores === "ต้องทำงานบ้าน" && (
                      <ConditionalField>
                        <TextInput value={form.choresDetail} onChange={(v) => onChange("choresDetail", v)} placeholder="คือ" />
                      </ConditionalField>
                    )}
                  </div>

                  <div>
                    <FieldLabel>เวลาออกนอกบ้าน ไม่ว่าเวลาใดก็ตาม</FieldLabel>
                    <ChoicePills options={["ต้องขออนุญาต", "ไม่ต้องขออนุญาต"]} value={form.leavePermission} onChange={(v) => onChange("leavePermission", v)} />
                  </div>

                  <Field label="นักเรียนได้รับค่าใช้จ่ายประจำวันจาก" required={false}>
                    <TextInput value={form.allowanceSource} onChange={(v) => onChange("allowanceSource", v)} placeholder="เช่น พ่อแม่" />
                  </Field>
                  <Field label="ประมาณวันละ (บาท)" required={false}>
                    <TextInput type="number" value={form.allowanceAmount} onChange={(v) => onChange("allowanceAmount", v)} placeholder="บาท" />
                  </Field>

                  <Field label="ระยะทางจากบ้านมาโรงเรียน (กิโลเมตร)" required={false}>
                    <TextInput type="number" value={form.distanceKm} onChange={(v) => onChange("distanceKm", v)} placeholder="กิโลเมตร" />
                  </Field>

                  <div className="md:col-span-2">
                    <FieldLabel>ยานพาหนะที่ใช้เดินทางมาโรงเรียน</FieldLabel>
                    <ChoicePills
                      options={["เดินเท้า", "รถจักรยานยนต์", "รถโดยสารประจำทาง", "ผู้ปกครองมาส่ง"]}
                      value={form.transportMethod}
                      onChange={(v) => onChange("transportMethod", v)}
                    />
                    {form.transportMethod === "ผู้ปกครองมาส่ง" && (
                      <ConditionalField>
                        <TextInput value={form.transportOther} onChange={(v) => onChange("transportOther", v)} placeholder="โดย..." />
                      </ConditionalField>
                    )}
                  </div>
                </FormSection>
              </>
            )}

            {step === 1 && (
              <>
                <PartHeading part="ด้านที่ 2" title="ประวัติการศึกษา" />

                <FormSection title="สำเร็จการศึกษาจากที่ใดมาก่อนแล้ว">
                  <div className="md:col-span-2 overflow-x-auto">
                    <table className="w-full text-[14.5px] border-collapse">
                      <thead>
                        <tr className="text-left text-gray-400 text-[13.5px]">
                          <th className="font-normal pb-2">ระดับชั้น</th>
                          <th className="font-normal pb-2">ชื่อสถานศึกษา</th>
                          <th className="font-normal pb-2 w-32">เกรดเฉลี่ย</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.priorEducation.map((row, i) => (
                          <tr key={row.level} className="border-t border-gray-100">
                            <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{row.level}</td>
                            <td className="py-2 pr-3">
                              <TextInput
                                value={row.school}
                                onChange={(v) => onListItemChange("priorEducation", i, "school", v)}
                                placeholder="ชื่อสถานศึกษา"
                              />
                            </td>
                            <td className="py-2">
                              <TextInput
                                type="number"
                                value={row.gpa}
                                onChange={(v) => onListItemChange("priorEducation", i, "gpa", v)}
                                placeholder="เกรดเฉลี่ย"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </FormSection>

                <FormSection title="การเรียนและพฤติกรรม">
                  <Field label="วิชาที่ชอบมากที่สุด" required={false}>
                    <TextInput value={form.favoriteSubject} onChange={(v) => onChange("favoriteSubject", v)} placeholder="วิชา" />
                  </Field>
                  <Field label="เพราะ" required={false}>
                    <TextInput value={form.favoriteSubjectReason} onChange={(v) => onChange("favoriteSubjectReason", v)} placeholder="เหตุผล" />
                  </Field>

                  <Field label="วิชาที่ชอบน้อยที่สุด" required={false}>
                    <TextInput value={form.leastFavoriteSubject} onChange={(v) => onChange("leastFavoriteSubject", v)} placeholder="วิชา" />
                  </Field>
                  <Field label="เพราะ" required={false}>
                    <TextInput value={form.leastFavoriteSubjectReason} onChange={(v) => onChange("leastFavoriteSubjectReason", v)} placeholder="เหตุผล" />
                  </Field>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <FieldLabel className="md:col-span-2">วิชาที่ได้คะแนนมากที่สุด</FieldLabel>
                    {form.topScoreSubjects.map((v, i) => (
                      <TextInput key={i} value={v} onChange={(val) => onListValueChange("topScoreSubjects", i, val)} placeholder={`วิชาที่ ${i + 1}`} />
                    ))}
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <FieldLabel className="md:col-span-2">วิชาที่ได้คะแนนน้อยที่สุด</FieldLabel>
                    {form.lowScoreSubjects.map((v, i) => (
                      <TextInput key={i} value={v} onChange={(val) => onListValueChange("lowScoreSubjects", i, val)} placeholder={`วิชาที่ ${i + 1}`} />
                    ))}
                  </div>

                  <div>
                    <FieldLabel>การมาโรงเรียน</FieldLabel>
                    <ChoicePills options={["สม่ำเสมอ", "ขาดเรียนบ่อยๆ"]} value={form.attendance} onChange={(v) => onChange("attendance", v)} />
                    {form.attendance === "ขาดเรียนบ่อยๆ" && (
                      <ConditionalField>
                        <TextInput value={form.attendanceReason} onChange={(v) => onChange("attendanceReason", v)} placeholder="เพราะ" />
                      </ConditionalField>
                    )}
                  </div>

                  <div>
                    <FieldLabel>เวลาสำหรับทำการบ้านและอ่านหนังสือ</FieldLabel>
                    <ChoicePills options={["มีเวลาเพียงพอ", "ไม่มีเวลา"]} value={form.homeworkTime} onChange={(v) => onChange("homeworkTime", v)} />
                    {form.homeworkTime === "ไม่มีเวลา" && (
                      <ConditionalField>
                        <TextInput value={form.homeworkTimeReason} onChange={(v) => onChange("homeworkTimeReason", v)} placeholder="เพราะ" />
                      </ConditionalField>
                    )}
                  </div>
                </FormSection>

                <FormSection title="เพื่อนสนิทของนักเรียน" isLastSection>
                  {form.closeFriends.map((f, i) => (
                    <div key={i} className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-3">
                      <TextInput value={f.firstName} onChange={(v) => onListItemChange("closeFriends", i, "firstName", v)} placeholder="ชื่อ" />
                      <TextInput value={f.lastName} onChange={(v) => onListItemChange("closeFriends", i, "lastName", v)} placeholder="นามสกุล" />
                      <TextInput value={f.classroom} onChange={(v) => onListItemChange("closeFriends", i, "classroom", v)} placeholder="ชั้น" />
                      <TextInput value={f.phone} onChange={(v) => onListItemChange("closeFriends", i, "phone", v)} placeholder="โทรศัพท์" />
                    </div>
                  ))}
                </FormSection>
              </>
            )}

            {step === 2 && (
              <>
                <PartHeading part="ด้านที่ 3" title="ความสนใจและแนวทางการประกอบอาชีพ" />

                <FormSection title="ความสนใจและแนวทางการประกอบอาชีพ" isLastSection>
                  <Field label="งานอดิเรกของนักเรียน" required={false}>
                    <TextInput value={form.hobby} onChange={(v) => onChange("hobby", v)} placeholder="งานอดิเรก" />
                  </Field>
                  <Field label="ความสามารถพิเศษ" required={false}>
                    <TextInput value={form.specialAbility} onChange={(v) => onChange("specialAbility", v)} placeholder="ความสามารถพิเศษ" />
                  </Field>
                  <Field label="ระดับการศึกษาที่นักเรียนจะเรียนให้จบชั้นสูงสุด" required={false}>
                    <TextInput value={form.studentEduGoal} onChange={(v) => onChange("studentEduGoal", v)} placeholder="เช่น ปริญญาตรี" />
                  </Field>
                  <Field label="ระดับการศึกษาที่ผู้ปกครองจะเรียนให้จบชั้นสูงสุด" required={false}>
                    <TextInput value={form.guardianEduGoal} onChange={(v) => onChange("guardianEduGoal", v)} placeholder="เช่น ปริญญาตรี" />
                  </Field>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                    <FieldLabel className="md:col-span-3">อาชีพที่นักเรียนสนใจ</FieldLabel>
                    {form.interestedCareers.map((v, i) => (
                      <TextInput key={i} value={v} onChange={(val) => onListValueChange("interestedCareers", i, val)} placeholder={`อาชีพที่ ${i + 1}`} />
                    ))}
                  </div>

                  <Field label="อาชีพที่ผู้ปกครองคาดหวังให้นักเรียนเป็น" className="md:col-span-2" required={false}>
                    <TextInput value={form.guardianExpectedCareer} onChange={(v) => onChange("guardianExpectedCareer", v)} placeholder="อาชีพ" />
                  </Field>
                </FormSection>
              </>
            )}

            {step === 3 && (
              <>
                <PartHeading part="ด้านที่ 4" title="ประวัติสุขภาพ" />

                <FormSection title="ประวัติสุขภาพ">
                  <div className="md:col-span-2">
                    <FieldLabel>นักเรียนเคยเจ็บป่วยหรือได้รับอุบัติเหตุร้ายแรง</FieldLabel>
                    <div className="space-y-3">
                      {form.illnessHistory.map((ill, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
                          <TextInput
                            value={ill.cause}
                            onChange={(v) => onListItemChange("illnessHistory", i, "cause", v)}
                            placeholder="ป่วยเพราะ (ระบุโรคหรือสาเหตุ)"
                          />
                          <TextInput
                            type="number"
                            value={ill.age}
                            onChange={(v) => onListItemChange("illnessHistory", i, "age", v)}
                            placeholder="เมื่ออายุ (ปี)"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Field label="โรคประจำตัวของนักเรียน (ถ้ามี)" required={false}>
                    <TextInput value={form.chronicDisease} onChange={(v) => onChange("chronicDisease", v)} placeholder="ระบุ" />
                  </Field>
                  <Field label="อาการเมื่อโรคกำเริบ" required={false}>
                    <TextInput value={form.chronicDiseaseSymptoms} onChange={(v) => onChange("chronicDiseaseSymptoms", v)} placeholder="ระบุ" />
                  </Field>

                  <Field label="น้ำหนัก (กิโลกรัม)" required={false}>
                    <TextInput type="number" value={form.weight} onChange={(v) => onChange("weight", v)} placeholder="น้ำหนัก" />
                  </Field>
                  <Field label="ส่วนสูง (เซนติเมตร)" required={false}>
                    <TextInput type="number" value={form.height} onChange={(v) => onChange("height", v)} placeholder="ส่วนสูง" />
                  </Field>

                  <div className="md:col-span-2">
                    <FieldLabel>ตามปกตินอนวันละ</FieldLabel>
                    <ChoicePills
                      options={["4-6 ชั่วโมง", "6-8 ชั่วโมง", "8-10 ชั่วโมง"]}
                      value={form.sleepHours}
                      onChange={(v) => onChange("sleepHours", v)}
                    />
                  </div>
                </FormSection>

                <FormSection title="ผู้กรอกข้อมูล" isLastSection>
                  <Field label="ลงชื่อ (ผู้กรอกข้อมูล)" required={false}>
                    <TextInput value={form.preparedByName} onChange={(v) => onChange("preparedByName", v)} placeholder="ชื่อ-นามสกุล" />
                  </Field>
                  <Field label="ลงวันที่" required={false}>
                    <ThaiDateField value={form.preparedDate} onChange={(v) => onChange("preparedDate", v)} dense heightClass="h-10 px-3" radiusClass="rounded-lg" />
                  </Field>
                </FormSection>
              </>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="h-11 px-6 rounded-full text-[15.5px] font-medium border border-gray-300
                           text-gray-600 hover:bg-gray-50 transition
                           disabled:opacity-0 disabled:pointer-events-none"
              >
                ย้อนกลับ
              </button>

              {step < PARTS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="h-11 px-6 rounded-full text-[15.5px] font-medium
                             bg-pink-500 text-white hover:bg-pink-600 transition"
                >
                  ถัดไป
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={submitting}
                  className={`h-11 px-6 rounded-full text-[15.5px] font-medium border transition disabled:opacity-60
                    ${
                      isFormComplete
                        ? "bg-pink-500 border-pink-500 text-white hover:bg-pink-600"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  <FaCheck className="inline mr-2 text-[14.5px]" />
                  {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ===== Shared form components ===== */

function StepIndicator({ parts, current, onSelect }) {
  return (
    <div className="flex items-center mb-8">
      {parts.map((p, i) => (
        <div key={p.label} className="flex items-center flex-1 last:flex-none">
          <button type="button" onClick={() => onSelect(i)} className="flex items-center gap-2 min-w-0">
            <span
              className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[13.5px] font-medium transition
                ${
                  i === current
                    ? "bg-pink-500 text-white"
                    : i < current
                    ? "bg-pink-100 text-pink-600"
                    : "bg-gray-100 text-gray-400"
                }`}
            >
              {i + 1}
            </span>
            <span className={`hidden sm:block text-[13.5px] truncate ${i === current ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {p.label}
            </span>
          </button>
          {i < parts.length - 1 && (
            <div className={`flex-1 h-px mx-3 ${i < current ? "bg-pink-200" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ConditionalField({ children }) {
  return (
    <div className="mt-3 pl-3 max-w-sm border-l-2 border-pink-100">
      {children}
    </div>
  );
}

function PartHeading({ part, title }) {
  return (
    <div className="flex items-center gap-3 mt-2 mb-4">
      <span className="text-[12.5px] font-medium text-pink-600 bg-pink-50 rounded-full px-2.5 py-1 shrink-0">
        {part}
      </span>
      <h2 className="text-[16.5px] font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-6">
        <div className="text-[16px] font-medium text-gray-900 mb-5 pb-3 border-b border-gray-100">
          {title}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {children}
        </div>
      </div>
    </section>
  );
}

function PersonFields({ prefix, form, onChange }) {
  return (
    <>
      <Field label="ชื่อ" required={false}>
        <TextInput value={form[`${prefix}FirstName`]} onChange={(v) => onChange(`${prefix}FirstName`, v)} placeholder="ชื่อ" />
      </Field>
      <Field label="นามสกุล" required={false}>
        <TextInput value={form[`${prefix}LastName`]} onChange={(v) => onChange(`${prefix}LastName`, v)} placeholder="นามสกุล" />
      </Field>
      <Field label="อายุ (ปี)" required={false}>
        <TextInput type="number" value={form[`${prefix}Age`]} onChange={(v) => onChange(`${prefix}Age`, v)} placeholder="อายุ" />
      </Field>
      <Field label="โทรศัพท์" required={false}>
        <TextInput value={form[`${prefix}Phone`]} onChange={(v) => onChange(`${prefix}Phone`, v)} placeholder="เบอร์โทรศัพท์" />
      </Field>
      <Field label="ระดับการศึกษา" className="md:col-span-2" required={false}>
        <TextInput value={form[`${prefix}Education`]} onChange={(v) => onChange(`${prefix}Education`, v)} placeholder="ระดับการศึกษา" />
      </Field>
      <Field label="อาชีพ" required={false}>
        <TextInput value={form[`${prefix}Occupation`]} onChange={(v) => onChange(`${prefix}Occupation`, v)} placeholder="อาชีพ" />
      </Field>
      <Field label="รายได้เฉลี่ยเดือนละ (บาท)" required={false}>
        <TextInput type="number" value={form[`${prefix}Income`]} onChange={(v) => onChange(`${prefix}Income`, v)} placeholder="บาท" />
      </Field>
      <Field label="สถานที่ทำงาน" required={false}>
        <TextInput value={form[`${prefix}Workplace`]} onChange={(v) => onChange(`${prefix}Workplace`, v)} placeholder="สถานที่ทำงาน" />
      </Field>
      <Field label="โทรศัพท์ที่ทำงาน" required={false}>
        <TextInput value={form[`${prefix}WorkPhone`]} onChange={(v) => onChange(`${prefix}WorkPhone`, v)} placeholder="เบอร์โทรศัพท์ที่ทำงาน" />
      </Field>
    </>
  );
}

function FieldLabel({ children, className = "" }) {
  return (
    <label className={`block text-[13.5px] text-gray-600 mb-2 ${className}`}>{children}</label>
  );
}

function Field({ label, children, className = "", required = true }) {
  return (
    <div className={className}>
      <label className="block text-[13.5px] text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {required ? cloneElement(children, { required: true }) : children}
    </div>
  );
}

function ChoicePills({ options, value, onChange, multiple = false }) {
  const isSelected = (opt) => (multiple ? (value || []).includes(opt) : value === opt);

  const toggle = (opt) => {
    if (multiple) {
      const set = new Set(value || []);
      if (set.has(opt)) set.delete(opt);
      else set.add(opt);
      onChange(Array.from(set));
    } else {
      onChange(value === opt ? "" : opt);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3.5 py-2 rounded-full text-[14.5px] border transition
            ${
              isSelected(opt)
                ? "bg-pink-500 border-pink-500 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", required = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full h-11 text-gray-900 bg-white
                 border border-gray-200 rounded-lg px-3 text-[15.5px]
                 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300
                 placeholder:text-gray-400"
    />
  );
}

function SelectInput({ value, onChange, options, placeholder, required = false }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full h-11 text-gray-900 bg-white
                 border border-gray-200 rounded-lg px-3 text-[15.5px]
                 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

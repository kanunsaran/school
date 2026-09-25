import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import SidebarNav from "../nav.jsx";
import Header from "../Header.jsx";
import { FaEdit, FaCamera, FaChevronRight, FaCheck } from "react-icons/fa";
import {
  getTeacher,
  getClasses,
  getTeacherGeneralInfo,
  saveTeacherGeneralInfo,
  uploadTeacherAvatar,
  updateUser,
} from "../callapi/callapi_user.jsx";
import { getCurrentUser, logout } from "../utils/auth.js";
import { gradeLabel } from "../utils/gradeLabel.js";
import { resolveFileUrl } from "../utils/media.js";
import Avatar from "../components/Avatar.jsx";
import { API_BASE_URL } from "../config/api.js";

const CURRENT_TEACHER_ID = getCurrentUser()?.user_id ?? "1";
const API_BASE = API_BASE_URL;

export default function TeacherProfilePage() {
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    subjects: "",
    level: "",
    year: "",
    avatar: null,
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  // ดึงข้อมูลจริงของครูที่ login อยู่: ชื่อ/อีเมลจากตาราง users + เบอร์โทร/กลุ่มสาระ/วิชา/ปีการศึกษาจาก teacher_general_info
  // ระดับชั้นที่ปรึกษา เดาแบบ best-effort จากชื่อครูใน classes.teacher_name (schema ไม่มี FK เชื่อม user_id จริง)
  useEffect(() => {
    const load = async () => {
      try {
        const [teachers, classes, info] = await Promise.all([
          getTeacher().catch(() => []),
          getClasses().catch(() => []),
          getTeacherGeneralInfo(CURRENT_TEACHER_ID).catch(() => null),
        ]);

        const me = teachers.find((t) => String(t.user_id) === String(CURRENT_TEACHER_ID));
        const myClass = classes.find(
          (c) => c.teacher_name && me?.fullname && c.teacher_name.trim() === me.fullname.trim()
        );

        const fd = info?.form_data || {};
        setTeacher({
          name: me?.fullname || "",
          email: me?.email || "",
          phone: fd.contact?.phone || "-",
          department: fd.department || "",
          subjects: fd.subjects || "",
          level: fd.level || (myClass ? `ที่ปรึกษาห้อง ${gradeLabel(myClass)}` : ""),
          year: fd.year || "",
          avatar: info?.avatar_url ? resolveFileUrl(API_BASE, info.avatar_url) : null,
        });
      } catch (err) {
        console.error("โหลดข้อมูลโปรไฟล์ครูไม่สำเร็จ:", err);
      }
    };
    load();
  }, []);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // ===== password modal =====
  const [pwOpen, setPwOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  // กด "เสร็จสิ้น" (ออกจากโหมดแก้ไข) ค่อยยิงบันทึกจริง — ชื่อ/อีเมลไปที่ users, ที่เหลือไปที่ teacher_general_info
  // ต้องดึง form_data ล่าสุดมา merge ก่อนส่งกลับ ไม่งั้น PUT จะทับข้อมูลกลุ่มอื่นที่เคยกรอกไว้ทั้งหมด (form_data ฝั่ง backend คือ REPLACE ไม่ใช่ merge)
  const toggleEdit = async () => {
    if (editing) {
      const confirmResult = await Swal.fire({
        icon: "question",
        title: "บันทึกการแก้ไขโปรไฟล์?",
        text: "ตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก",
        showCancelButton: true,
        confirmButtonText: "บันทึก",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#ec4899",
      });
      if (!confirmResult.isConfirmed) return;

      setSaving(true);
      try {
        await updateUser(CURRENT_TEACHER_ID, { fullname: teacher.name, email: teacher.email });

        const existing = await getTeacherGeneralInfo(CURRENT_TEACHER_ID).catch(() => null);
        const mergedFormData = {
          ...(existing?.form_data || {}),
          contact: { ...(existing?.form_data?.contact || {}), phone: teacher.phone },
          department: teacher.department,
          subjects: teacher.subjects,
          level: teacher.level,
          year: teacher.year,
        };
        await saveTeacherGeneralInfo(CURRENT_TEACHER_ID, mergedFormData);
      } catch (err) {
        console.error("บันทึกโปรไฟล์ครูไม่สำเร็จ:", err);
        alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      } finally {
        setSaving(false);
      }
    }
    setEditing((v) => !v);
  };

  const onChange = (key, value) => {
    setTeacher((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await uploadTeacherAvatar(CURRENT_TEACHER_ID, file);
      const url = resolveFileUrl(API_BASE, result.avatar_url);
      setTeacher((prev) => ({ ...prev, avatar: url }));
    } catch (err) {
      console.error("อัปโหลดรูปโปรไฟล์ไม่สำเร็จ:", err);
      alert("อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const closePw = () => {
    setPwOpen(false);
    setShowPw(false);
    setPw({ current: "", next: "", confirm: "" });
  };

  const canSavePw =
    pw.current.trim() &&
    pw.next.trim() &&
    pw.confirm.trim() &&
    pw.next === pw.confirm &&
    pw.next.length >= 8;

  const onSavePw = () => {
    // 🔗 ต่อ API เปลี่ยนรหัสผ่านตรงนี้ได้เลย
    closePw();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex text-[15.5px] text-gray-900">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full bg-white pt-16">
        {/* Top bar */}
        <div className="sticky top-16 z-10 bg-white border-b border-gray-200">
          <div className="w-full px-8 py-5 flex items-center justify-between">
            <div>
              <div className="page-title">
                โปรไฟล์
              </div>
              <div className="page-subtitle">
                ข้อมูลบัญชีและข้อมูลการสอน
              </div>
            </div>

            {/* Edit / Done */}
            <button
              type="button"
              onClick={toggleEdit}
              disabled={saving}
              className={`h-10 px-4 rounded-full text-[15px] font-medium transition disabled:opacity-60 ${
                editing || saving
                  ? "bg-pink-500 text-white hover:bg-pink-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {saving ? (
                "กำลังบันทึก..."
              ) : editing ? (
                <>
                  <FaCheck className="inline mr-2 text-[14.5px]" />
                  เสร็จสิ้น
                </>
              ) : (
                <>
                  <FaEdit className="inline mr-2 text-[14.5px]" />
                  แก้ไข
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full px-8 py-8 max-w-none">
          {/* Header */}
          <div className="flex items-center gap-6 mb-10">
            <div className="relative shrink-0">
              <Avatar
                src={teacher.avatar}
                name={teacher.name}
                size={96}
                className="border border-gray-200"
              />

              {editing && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -right-2 -bottom-2 h-11 w-11 rounded-full
                               bg-white border border-gray-300 shadow
                               hover:bg-gray-50 transition
                               flex items-center justify-center disabled:opacity-60"
                    title="อัปโหลดรูปโปรไฟล์"
                  >
                    <FaCamera className="text-gray-700 text-[20px]" />
                  </button>
                </>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[21.5px] font-medium text-gray-900 truncate">
                {teacher.name}
              </div>
              <div className="text-[15.5px] text-gray-500 mt-1">
                {teacher.level || teacher.department || "ครู"}
              </div>
            </div>
          </div>

          {/* Sections */}
          <SettingsSection title="ข้อมูลส่วนตัว">
            <EditableRow
              label="ชื่อ–นามสกุล"
              value={teacher.name}
              editing={editing}
              onChange={(v) => onChange("name", v)}
            />
            <EditableRow
              label="อีเมล"
              value={teacher.email}
              editing={editing}
              onChange={(v) => onChange("email", v)}
            />
            <EditableRow
              label="เบอร์โทรศัพท์"
              value={teacher.phone}
              editing={editing}
              onChange={(v) => onChange("phone", v)}
              isLast
            />
          </SettingsSection>

          <SettingsSection title="ข้อมูลการสอน">
            <EditableRow
              label="กลุ่มสาระ"
              value={teacher.department}
              editing={editing}
              onChange={(v) => onChange("department", v)}
            />
            <EditableRow
              label="รายวิชาที่สอน"
              value={teacher.subjects}
              editing={editing}
              onChange={(v) => onChange("subjects", v)}
            />
            <EditableRow
              label="ระดับชั้น"
              value={teacher.level}
              editing={editing}
              onChange={(v) => onChange("level", v)}
            />
            <EditableRow
              label="ปีการศึกษา"
              value={teacher.year}
              editing={editing}
              onChange={(v) => onChange("year", v)}
              isLast
            />
          </SettingsSection>

          <SettingsSection title="การตั้งค่าบัญชี">
            <ActionRow
              label="เปลี่ยนรหัสผ่าน"
              onClick={() => setPwOpen(true)}
            />
            <ActionRow label="ออกจากระบบ" danger isLast onClick={onLogout} />
          </SettingsSection>
        </div>
      </main>

      {/* Change Password Modal */}
      {pwOpen && (
        <PasswordModal
          show={showPw}
          onToggleShow={() => setShowPw((v) => !v)}
          pw={pw}
          setPw={setPw}
          onClose={closePw}
          onSave={onSavePw}
          canSave={canSavePw}
        />
      )}
    </div>
  );
}

/* ===== Components ===== */

function SettingsSection({ title, children }) {
  return (
    <section className="mb-10">
      <div className="text-[12.5px] tracking-wider text-gray-500 mb-3 px-1">
        {title}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function EditableRow({ label, value, editing, onChange, isLast }) {
  return (
    <>
      <div className="px-5 py-4 flex items-center justify-between gap-6 text-[15.5px]">
        <div className="text-gray-500">{label}</div>

        {editing ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-right text-gray-900 bg-gray-100
                       rounded-lg px-3 py-2
                       outline-none focus:ring-2 focus:ring-gray-300"
          />
        ) : (
          <div className="text-gray-900 text-right">{value}</div>
        )}
      </div>
      {!isLast && <div className="h-px bg-gray-100" />}
    </>
  );
}

function ActionRow({ label, danger, isLast, onClick }) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="w-full px-5 py-4 flex items-center justify-between
                   text-[15.5px] hover:bg-gray-50 transition"
      >
        <span className={danger ? "text-red-600" : "text-gray-900"}>
          {label}
        </span>
        <FaChevronRight className="text-gray-400 text-[13.5px]" />
      </button>
      {!isLast && <div className="h-px bg-gray-100" />}
    </>
  );
}

/* ===== Password Modal (reuse same style) ===== */

function PasswordModal({ show, onToggleShow, pw, setPw, onClose, onSave, canSave }) {
  const hint =
    !pw.next && !pw.confirm
      ? "อย่างน้อย 8 ตัวอักษร"
      : pw.next.length < 8
      ? "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร"
      : pw.confirm && pw.next !== pw.confirm
      ? "รหัสผ่านใหม่ไม่ตรงกัน"
      : "";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-[420px] max-w-[92vw] rounded-3xl bg-white shadow-xl border border-gray-200">
        <div className="px-6 py-6">
          <div className="text-center">
            <div className="text-[18.5px] font-semibold text-gray-900">
              เปลี่ยนรหัสผ่าน
            </div>
            <div className="text-[15.5px] text-gray-500 mt-1">
              เพื่อความปลอดภัยของบัญชี
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <PasswordInput
              label="รหัสผ่านปัจจุบัน"
              value={pw.current}
              onChange={(v) => setPw((p) => ({ ...p, current: v }))}
              show={show}
              onToggle={onToggleShow}
            />
            <PasswordInput
              label="รหัสผ่านใหม่"
              value={pw.next}
              onChange={(v) => setPw((p) => ({ ...p, next: v }))}
              show={show}
              onToggle={onToggleShow}
            />
            <PasswordInput
              label="ยืนยันรหัสผ่านใหม่"
              value={pw.confirm}
              onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
              show={show}
              onToggle={onToggleShow}
            />

            {hint && (
              <div className="text-[13.5px] text-gray-500 px-1">
                {hint}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-full
                         bg-gray-100 text-gray-700
                         text-[15.5px] font-medium
                         hover:bg-gray-200 transition"
            >
              ยกเลิก
            </button>

            <button
              onClick={onSave}
              disabled={!canSave}
              className="flex-1 h-10 rounded-full
                         bg-pink-500 text-white
                         text-[15.5px] font-medium
                         hover:bg-pink-600 transition
                         disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange, show, onToggle }) {
  return (
    <div>
      <div className="text-[13.5px] text-gray-500 mb-1 px-1">{label}</div>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 rounded-xl border border-gray-300
                     px-4 pr-12 text-[15.5px]
                     outline-none
                     focus:border-gray-400
                     focus:ring-2 focus:ring-gray-200
                     transition"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2
                     text-[13.5px] text-gray-500
                     hover:text-gray-700 transition"
        >
          {show ? "ซ่อน" : "แสดง"}
        </button>
      </div>
    </div>
  );
}

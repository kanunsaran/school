import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import {
  FaSearch,
  FaSyncAlt,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaFilter,
  FaEdit,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaQrcode,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaCheckCircle,
} from "react-icons/fa";
import {
  getClasses,
  getAttendance,
  updateAttendance,
  bulkCheckinAttendance,
  bulkSetAttendanceStatus,
  bulkNoteAttendance,
  getAttendanceHistory,
  getAttendanceLog,
  getStudentAttendanceSummary,
  getActiveAttendanceSession,
  createAttendanceSession,
  closeAttendanceSession,
} from "../callapi/callapi_user.jsx";
import {
  mockStatusOptions,
  mockSortOptions,
  ATTENDANCE_STATUS,
  CHECKIN_METHOD,
} from "./attendanceMockData.js";

// พาสเทลสดใส โทนเดียวกับสีชมพูของเว็บ (bg อ่อน + ตัวอักษรเข้มพออ่านง่าย) ไม่หม่น ไม่มืด
const STATUS_META = {
  [ATTENDANCE_STATUS.PRESENT]: { label: "มาเรียน", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  [ATTENDANCE_STATUS.LATE]: { label: "สาย", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  [ATTENDANCE_STATUS.LEAVE]: { label: "ลา", dot: "bg-pink-500", badge: "bg-pink-50 text-pink-700 border-pink-200" },
  [ATTENDANCE_STATUS.ABSENT]: { label: "ขาด", dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
  [ATTENDANCE_STATUS.NOT_CHECKED]: { label: "ยังไม่เช็ก", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 border-gray-200" },
};

const METHOD_META = {
  [CHECKIN_METHOD.QR]: { label: "QR Code", icon: <FaQrcode /> },
  [CHECKIN_METHOD.GPS]: { label: "GPS", icon: <FaMapMarkerAlt /> },
  [CHECKIN_METHOD.TEACHER]: { label: "ครูเช็กให้", icon: <FaChalkboardTeacher /> },
  [CHECKIN_METHOD.MANUAL]: { label: "Manual", icon: <FaEdit /> },
};

const PIE_COLORS = {
  [ATTENDANCE_STATUS.PRESENT]: "#10b981",
  [ATTENDANCE_STATUS.LATE]: "#f59e0b",
  [ATTENDANCE_STATUS.LEAVE]: "#ec4899",
  [ATTENDANCE_STATUS.ABSENT]: "#ef4444",
};

const PAGE_SIZE = 10;

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getDaysAgoStr = (days) => {
  const d = new Date(Date.now() - days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getNowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const getInMinutesTimeStr = (minutes) => {
  const d = new Date(Date.now() + minutes * 60000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatDateThai = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return "";
  return new Date(yyyy_mm_dd).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
};

// แสดงห้องจาก grades เป็น "ม.6/17 (วิทย์-คณิต)" (เหมือนกับ WorkCreate.jsx / students.jsx)
const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

// map แถวจาก backend (attendance_id, user_user_id, attendance_date, checkin_time ...) ให้เป็น shape ที่ UI ใช้
const normalizeRow = (r) => ({
  attendance_id: r.attendance_id,
  user_id: r.user_user_id,
  code: r.student_code ?? String(r.user_user_id),
  seatNo: r.seat_no ?? null,
  fullname: r.fullname,
  email: r.email || "-",
  avatar: `https://i.pravatar.cc/80?u=${r.user_user_id}`,
  checkinTime: r.checkin_time ? String(r.checkin_time).slice(0, 5) : "-",
  method: r.method,
  status: r.status,
  note: r.note || "",
});

const notAvailableYet = (label) =>
  Swal.fire({ icon: "info", title: label, text: "ฟีเจอร์นี้ยังไม่เปิดใช้งาน", confirmButtonText: "รับทราบ" });

export default function AttendancePage({ embedded = false, gradeId: propGradeId } = {}) {
  const [classesList, setClassesList] = useState([]);
  const [roomFilter, setRoomFilter] = useState(propGradeId ? String(propGradeId) : "");
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState(false);
  const [auditLog, setAuditLog] = useState([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("number");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [checkedInAllRoom, setCheckedInAllRoom] = useState(false);

  const [historyFrom, setHistoryFrom] = useState(getDaysAgoStr(30));
  const [historyTo, setHistoryTo] = useState(getTodayStr());
  const [historyData, setHistoryData] = useState({ byDate: [], totals: null });

  // เซสชันเช็กชื่อ (QR/รหัส) — session = null คือยังไม่เปิดอยู่ตอนนี้ (⚪)
  const [session, setSession] = useState(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const tableTopRef = useRef(null);
  const scrollToTable = () => tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const selectedRoomLabel = classesList.find((c) => String(c.id) === String(roomFilter))
    ? gradeLabel(classesList.find((c) => String(c.id) === String(roomFilter)))
    : "";

  // ===== โหลดรายชื่อห้อง (grades จริง) ครั้งเดียวตอนเข้าเพจ =====
  useEffect(() => {
    getClasses()
      .then((data) => {
        const list = (data || []).map((c) => ({ ...c, id: c.id ?? c.grade_id ?? c.idgrade }));
        setClassesList(list);
        // ฝัง (embedded) เป็นแท็บในหน้าห้องเรียน ก็บังคับกรองตาม gradeId ของห้องนั้นเสมอ ไม่เลือกห้องแรกให้เอง
        if (!propGradeId && list.length > 0) setRoomFilter(list[0].id);
      })
      .catch((err) => console.error("โหลดรายชื่อห้องเรียนไม่สำเร็จ:", err));
  }, [propGradeId]);

  useEffect(() => {
    if (embedded && propGradeId) setRoomFilter(String(propGradeId));
  }, [embedded, propGradeId]);

  // ===== โหลดรายชื่อ + สถานะการเข้าเรียน + audit log + เซสชันที่เปิดอยู่ ทุกครั้งที่เปลี่ยนห้อง/วันที่ =====
  const fetchAttendance = () => {
    if (!roomFilter) return;
    setRowsLoading(true);
    setRowsError(false);
    getAttendance(roomFilter, selectedDate)
      .then((data) => setRows((data || []).map(normalizeRow)))
      .catch((err) => {
        console.error("โหลดข้อมูลการเข้าเรียนไม่สำเร็จ:", err);
        setRowsError(true);
        setRows([]);
      })
      .finally(() => setRowsLoading(false));

    getAttendanceLog(roomFilter, selectedDate)
      .then((data) => setAuditLog(data || []))
      .catch((err) => {
        console.error("โหลดประวัติการแก้ไขไม่สำเร็จ:", err);
        setAuditLog([]);
      });

    getActiveAttendanceSession(roomFilter)
      .then((data) => {
        if (!data) {
          setSession(null);
          return;
        }
        setSession({
          session_id: data.session_id,
          date: data.session_date,
          period: data.period,
          startTime: String(data.start_time).slice(0, 5),
          endTime: String(data.end_time).slice(0, 5),
          endAt: new Date(`${String(data.session_date).slice(0, 10)}T${String(data.end_time).slice(0, 5)}`),
          code: data.code,
          status: data.status,
        });
      })
      .catch((err) => console.error("โหลดเซสชันเช็กชื่อไม่สำเร็จ:", err));
  };

  useEffect(fetchAttendance, [roomFilter, selectedDate]);

  // ===== โหลดสถิติย้อนหลัง ทุกครั้งที่เปลี่ยนห้อง/ช่วงวันที่ =====
  const fetchHistory = () => {
    if (!roomFilter) return;
    getAttendanceHistory(roomFilter, historyFrom, historyTo)
      .then((data) => setHistoryData(data || { byDate: [], totals: null }))
      .catch((err) => {
        console.error("โหลดสถิติย้อนหลังไม่สำเร็จ:", err);
        setHistoryData({ byDate: [], totals: null });
      });
  };

  useEffect(fetchHistory, [roomFilter, historyFrom, historyTo]);

  const summary = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length;
    const late = rows.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length;
    const leave = rows.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length;
    const absent = rows.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
    const notCheckedIn = rows.filter((r) => r.status === ATTENDANCE_STATUS.NOT_CHECKED).length;
    return {
      total,
      present,
      presentPercent: total ? Math.round((present / total) * 100) : 0,
      late,
      leave,
      absent,
      notCheckedIn,
      isCheckInComplete: total > 0 && notCheckedIn === 0,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.fullname.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "number") return (a.seatNo ?? 9999) - (b.seatNo ?? 9999);
      if (sortBy === "checkinTime") return (a.checkinTime === "-" ? "99:99" : a.checkinTime).localeCompare(b.checkinTime === "-" ? "99:99" : b.checkinTime);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return a.fullname.localeCompare(b.fullname, "th");
    });
    return sorted;
  }, [rows, statusFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setSortBy("number");
    setPage(1);
  };

  const applyFilterFromCard = (status) => {
    setStatusFilter(status);
    setPage(1);
    scrollToTable();
  };

  const refreshData = () => {
    fetchAttendance();
    fetchHistory();
    setSelectedIds([]);
    setCheckedInAllRoom(false);
    Swal.fire({ icon: "success", title: "รีเฟรชข้อมูลแล้ว", timer: 900, showConfirmButton: false });
  };

  const saveEdit = async (updated) => {
    try {
      await updateAttendance(updated.attendance_id, {
        status: updated.status,
        checkin_time: updated.checkinTime === "-" ? null : `${updated.checkinTime}:00`,
        note: updated.note,
      });
      setEditingRow(null);
      fetchAttendance();
    } catch (err) {
      console.error("บันทึกการแก้ไขไม่สำเร็จ:", err);
      Swal.fire("บันทึกไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const bulkSetStatus = async (status) => {
    try {
      await bulkSetAttendanceStatus(selectedIds, status);
      setSelectedIds([]);
      fetchAttendance();
    } catch (err) {
      console.error("แก้ไขสถานะหลายคนไม่สำเร็จ:", err);
      Swal.fire("แก้ไขไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  const bulkAddNote = async () => {
    const result = await Swal.fire({
      title: "เพิ่มหมายเหตุให้ทุกคนที่เลือก",
      input: "text",
      inputPlaceholder: "เช่น กิจกรรมโรงเรียน",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed || !result.value) return;
    try {
      await bulkNoteAttendance(selectedIds, result.value);
      setSelectedIds([]);
      fetchAttendance();
    } catch (err) {
      console.error("เพิ่มหมายเหตุหลายคนไม่สำเร็จ:", err);
      Swal.fire("บันทึกไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  // ครูเช็กชื่อให้นักเรียนคนเดียว
  const checkInOne = async (row) => {
    try {
      await updateAttendance(row.attendance_id, {
        status: ATTENDANCE_STATUS.PRESENT,
        checkin_time: `${getNowTimeStr()}:00`,
        note: row.note,
      });
      fetchAttendance();
    } catch (err) {
      console.error("เช็กชื่อให้ไม่สำเร็จ:", err);
      Swal.fire("เช็กชื่อไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  // เช็กชื่อทั้งห้อง — ให้ backend ไล่เช็กให้ทุกคนที่ยัง not_checked ในห้อง+วันนี้
  const checkInAllNotChecked = async () => {
    if (summary.notCheckedIn === 0) {
      Swal.fire({ icon: "info", title: "ไม่มีใครค้างเช็กชื่อแล้ว", timer: 1200, showConfirmButton: false });
      return;
    }
    try {
      const result = await bulkCheckinAttendance(roomFilter, selectedDate);
      setCheckedInAllRoom(true);
      fetchAttendance();
      Swal.fire({ icon: "success", title: `เช็กชื่อให้ ${result?.updated ?? ""} คนแล้ว`, timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("เช็กชื่อทั้งห้องไม่สำเร็จ:", err);
      Swal.fire("เช็กชื่อไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  // เริ่มเซสชันเช็กชื่อ (จากปุ่ม "เปิดการเช็กชื่อ" มุมขวาบน)
  const startSession = async ({ date, period, startTime, endTime }) => {
    try {
      await createAttendanceSession({
        grade_idgrade: roomFilter,
        session_date: date,
        period,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
      });
      setSessionModalOpen(false);
      fetchAttendance();
      Swal.fire({ icon: "success", title: "เปิดการเช็กชื่อแล้ว", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("เปิดการเช็กชื่อไม่สำเร็จ:", err);
      Swal.fire("เปิดไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  // ปิดเซสชัน — ไม่ว่าจะครูกดปิดเองหรือหมดเวลาอัตโนมัติ (backend จะตั้งคนที่ยัง not_checked เป็น "ขาด" ให้เอง)
  const closeSession = async (auto) => {
    if (!session?.session_id) return;
    try {
      const result = await closeAttendanceSession(session.session_id);
      fetchAttendance();
      Swal.fire({
        icon: auto ? "info" : "success",
        title: auto ? "หมดเวลา — ปิดการเช็กชื่ออัตโนมัติ" : "ปิดการเช็กชื่อแล้ว",
        text: `คนที่ยังไม่เช็กชื่อ ${result?.absentCount ?? 0} คน ถูกตั้งเป็น "ขาด" ให้อัตโนมัติ`,
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("ปิดการเช็กชื่อไม่สำเร็จ:", err);
      Swal.fire("ปิดไม่สำเร็จ", "ลองใหม่อีกครั้ง", "error");
    }
  };

  // นาฬิกาไว้คำนวณเวลาที่เหลือของ badge สถานะ + เช็กว่าหมดเวลาเซสชันหรือยัง (ติ๊กทุกวินาทีเฉพาะตอนเปิดอยู่)
  useEffect(() => {
    if (session?.status !== "open") return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [session?.status]);

  useEffect(() => {
    if (session?.status === "open" && now >= session.endAt) {
      closeSession(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, session?.status]);

  const toggleSelectAllOnPage = (checked) => {
    const pageIds = pageRows.map((r) => r.attendance_id);
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, ...pageIds])) : prev.filter((id) => !pageIds.includes(id))
    );
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openStudentDrawer = async (row) => {
    setDrawerStudent({
      user_id: row.user_id,
      code: row.code,
      fullname: row.fullname,
      email: row.email,
      avatar: row.avatar,
      className: selectedRoomLabel,
      presentDays: null,
      lateDays: null,
      leaveDays: null,
      absentDays: null,
      attendancePercent: null,
      editLogs: auditLog.filter((l) => l.fullname === row.fullname),
    });
    try {
      const summaryData = await getStudentAttendanceSummary(row.user_id, roomFilter);
      const total = Number(summaryData?.totalDays) || 0;
      const present = Number(summaryData?.presentDays) || 0;
      setDrawerStudent((prev) =>
        prev && prev.user_id === row.user_id
          ? {
              ...prev,
              presentDays: present,
              lateDays: Number(summaryData?.lateDays) || 0,
              leaveDays: Number(summaryData?.leaveDays) || 0,
              absentDays: Number(summaryData?.absentDays) || 0,
              attendancePercent: total ? Math.round((present / total) * 100) : 0,
            }
          : prev
      );
    } catch (err) {
      console.error("โหลดสถิติรายคนไม่สำเร็จ:", err);
    }
  };

  const notCheckedInRows = useMemo(
    () => rows.filter((r) => r.status === ATTENDANCE_STATUS.NOT_CHECKED),
    [rows]
  );

  const pieData = useMemo(() => {
    if (!historyData.totals) return [];
    const t = historyData.totals;
    return [
      { status: "มาเรียน", value: Number(t.present) || 0, color: PIE_COLORS[ATTENDANCE_STATUS.PRESENT] },
      { status: "สาย", value: Number(t.late) || 0, color: PIE_COLORS[ATTENDANCE_STATUS.LATE] },
      { status: "ลา", value: Number(t.leave_count) || 0, color: PIE_COLORS[ATTENDANCE_STATUS.LEAVE] },
      { status: "ขาด", value: Number(t.absent) || 0, color: PIE_COLORS[ATTENDANCE_STATUS.ABSENT] },
    ];
  }, [historyData]);

  const barData = useMemo(
    () =>
      (historyData.byDate || []).map((d) => ({
        date: String(d.attendance_date).slice(0, 10),
        present: Number(d.present) || 0,
        late: Number(d.late) || 0,
        leave: Number(d.leave_count) || 0,
        absent: Number(d.absent) || 0,
      })),
    [historyData]
  );

  const hasHistoryData = pieData.some((d) => d.value > 0) || barData.length > 0;

  const content = (
    <>
        {/* ===== Header ===== */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          {!embedded && (
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">การเข้าเรียน</h1>
              <p className="text-gray-500 mt-1">{selectedRoomLabel || "เลือกห้องเรียน"}</p>
            </div>
          )}

          {/* ตัวกรองห้อง + ปุ่มเปิดการเช็กชื่อ — มุมขวาบน ใกล้ตัวกรองวันที่ เพราะเป็นสิ่งที่ครูทำก่อนทุกคาบ */}
          <div className="flex flex-col items-end gap-2 ml-auto">
            <div className="flex items-center gap-2">
              {!embedded && (
                <>
                  <span className="text-[13px] text-gray-500">ห้อง</span>
                  <select
                    value={roomFilter}
                    onChange={(e) => {
                      setRoomFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-[14px] outline-none focus:border-pink-400"
                  >
                    {classesList.length === 0 && <option value="">ไม่พบห้องเรียน</option>}
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {gradeLabel(c)}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <span className="text-[13px] text-gray-500 ml-2">วันที่</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-pink-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <SessionStatusBadge session={session} now={now} />
              <button
                type="button"
                onClick={() => setSessionModalOpen(true)}
                disabled={!roomFilter}
                className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white text-[13px] font-semibold flex items-center gap-2"
              >
                <FaQrcode /> {session?.status === "open" ? "ดูรหัสเช็กชื่อ" : "เปิดการเช็กชื่อ"}
              </button>
            </div>
          </div>
        </div>

        {rowsError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-[13px]">
            โหลดข้อมูลการเข้าเรียนไม่สำเร็จ — ตรวจสอบว่า backend เปิด endpoint <code>/attendance</code> แล้วหรือยัง
          </div>
        )}

        {/* ===== Dashboard cards ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="นักเรียนทั้งหมด"
            value={summary.total}
            sub={`ห้อง ${selectedRoomLabel}`}
            onClick={() => applyFilterFromCard("all")}
          />
          <StatCard
            label="มาเรียน"
            value={summary.present}
            sub={`${summary.presentPercent}%`}
            valueClassName="text-emerald-600"
            onClick={() => applyFilterFromCard(ATTENDANCE_STATUS.PRESENT)}
          />
          <StatCard
            label="สาย"
            value={summary.late}
            sub="คน"
            valueClassName="text-amber-600"
            onClick={() => applyFilterFromCard(ATTENDANCE_STATUS.LATE)}
          />
          <StatCard
            label="ลา"
            value={summary.leave}
            sub="คน"
            valueClassName="text-pink-600"
            onClick={() => applyFilterFromCard(ATTENDANCE_STATUS.LEAVE)}
          />
          <StatCard
            label="ขาด"
            value={summary.absent}
            sub="คน"
            valueClassName="text-red-600"
            onClick={() => applyFilterFromCard(ATTENDANCE_STATUS.ABSENT)}
          />
          <div
            onClick={() => applyFilterFromCard(ATTENDANCE_STATUS.NOT_CHECKED)}
            className="rounded-2xl border border-gray-200 bg-white p-5 cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="text-[13px] text-gray-500">สถานะการเช็กชื่อ</div>
            {summary.isCheckInComplete ? (
              <div className="mt-2 flex items-center gap-2 text-emerald-600 font-semibold">
                <FaCheckCircle /> เช็กชื่อเสร็จแล้ว
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-yellow-600 font-semibold">
                ⏳ ยังไม่ครบ ({summary.notCheckedIn} คน)
              </div>
            )}
          </div>
        </div>

        {/* ===== นักเรียนที่ยังไม่เช็กชื่อ ===== */}
        {notCheckedInRows.length > 0 && (
          <div
            onClick={() => applyFilterFromCard(ATTENDANCE_STATUS.NOT_CHECKED)}
            className="mb-6 rounded-2xl border border-dashed border-yellow-300 bg-yellow-50 px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-yellow-100 transition-colors"
          >
            <div className="text-yellow-800 font-medium">ยังไม่เช็กชื่อ {notCheckedInRows.length} คน</div>
            <div className="text-[13px] text-yellow-700 underline">ดูรายชื่อ →</div>
          </div>
        )}

        {/* ===== Filters ===== */}
        <div ref={tableTopRef} className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหารหัสนักเรียน หรือชื่อ-นามสกุล"
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-[14px] outline-none focus:border-pink-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-[14px] outline-none focus:border-pink-400"
            >
              {mockStatusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-[14px] outline-none focus:border-pink-400"
            >
              {mockSortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  เรียงตาม{s.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <FaFilter className="text-[12px]" /> รีเซ็ตตัวกรอง
            </button>
          </div>
        </div>

        {/* ===== Action bar ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={checkInAllNotChecked}
              className={`h-10 px-4 rounded-xl border text-[13px] font-medium flex items-center gap-2 ${
                checkedInAllRoom
                  ? "bg-pink-600 border-pink-600 text-white hover:bg-pink-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <FaCheckCircle /> เช็กชื่อทั้งห้อง
            </button>
            <ActionButton icon={<FaSyncAlt />} label="รีเฟรชข้อมูล" onClick={refreshData} />
            <ActionButton icon={<FaFileExcel />} label="Export Excel" onClick={() => notAvailableYet("Export Excel")} />
            <ActionButton icon={<FaFilePdf />} label="Export PDF" onClick={() => notAvailableYet("Export PDF")} />
            <ActionButton icon={<FaPrint />} label="พิมพ์รายงาน" onClick={() => notAvailableYet("พิมพ์รายงาน")} />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2">
              <span className="text-[13px] text-pink-700 font-medium">เลือกแล้ว {selectedIds.length} คน</span>
              <button type="button" onClick={() => bulkSetStatus(ATTENDANCE_STATUS.PRESENT)} className="h-8 px-3 rounded-full bg-white border border-gray-200 text-[12px] text-emerald-700 hover:bg-emerald-50">
                เปลี่ยนเป็นมาเรียน
              </button>
              <button type="button" onClick={() => bulkSetStatus(ATTENDANCE_STATUS.LEAVE)} className="h-8 px-3 rounded-full bg-white border border-gray-200 text-[12px] text-pink-700 hover:bg-pink-50">
                เปลี่ยนเป็นลา
              </button>
              <button type="button" onClick={() => bulkSetStatus(ATTENDANCE_STATUS.ABSENT)} className="h-8 px-3 rounded-full bg-white border border-gray-200 text-[12px] text-red-700 hover:bg-red-50">
                เปลี่ยนเป็นขาด
              </button>
              <button type="button" onClick={bulkAddNote} className="h-8 px-3 rounded-full bg-white border border-gray-200 text-[12px] text-gray-700 hover:bg-gray-50">
                เพิ่มหมายเหตุ
              </button>
            </div>
          )}
        </div>

        {/* ===== ตารางรายชื่อนักเรียน ===== */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[12px] text-gray-500">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(r.attendance_id))}
                      onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="py-3 px-2">ลำดับ</th>
                  <th className="py-3 px-2">รหัส</th>
                  <th className="py-3 px-2">เลขที่</th>
                  <th className="py-3 px-2">ชื่อ</th>
                  <th className="py-3 px-2">อีเมล</th>
                  <th className="py-3 px-2">เวลาเช็กชื่อ</th>
                  <th className="py-3 px-2">วิธีเช็กชื่อ</th>
                  <th className="py-3 px-2">สถานะ</th>
                  <th className="py-3 px-2">หมายเหตุ</th>
                  <th className="py-3 px-2 pr-4 text-right">แก้ไข</th>
                </tr>
              </thead>
              <tbody>
                {rowsLoading && (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-gray-400">กำลังโหลด...</td>
                  </tr>
                )}

                {!rowsLoading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-gray-400">
                      {roomFilter ? "ไม่พบข้อมูลนักเรียนในห้อง/วันที่นี้" : "เลือกห้องเรียนก่อน"}
                    </td>
                  </tr>
                )}

                {!rowsLoading &&
                  pageRows.map((r, i) => {
                    const meta = STATUS_META[r.status];
                    const method = METHOD_META[r.method];
                    return (
                      <tr key={r.attendance_id} className="border-b border-gray-50 hover:bg-gray-50/60 text-[13.5px]">
                        <td className="py-3 pl-4 pr-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(r.attendance_id)}
                            onChange={() => toggleSelectOne(r.attendance_id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-3 px-2 text-gray-500">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="py-3 px-2 text-gray-500">{r.code}</td>
                        <td className="py-3 px-2 text-gray-500">{r.seatNo ?? "-"}</td>
                        <td className="py-3 px-2">
                          <button
                            type="button"
                            onClick={() => openStudentDrawer(r)}
                            className="flex items-center gap-2 text-gray-900 hover:text-pink-600 bg-transparent"
                          >
                            <img src={r.avatar} className="w-7 h-7 rounded-full" />
                            {r.fullname}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-gray-500">{r.email}</td>
                        <td className="py-3 px-2 text-gray-600">{r.checkinTime}</td>
                        <td className="py-3 px-2 text-gray-500">
                          {method ? (
                            <span className="inline-flex items-center gap-1.5">
                              {method.icon} {method.label}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium ${meta.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-500 max-w-[160px] truncate" title={r.note}>
                          {r.note || "-"}
                        </td>
                        <td className="py-3 px-2 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === ATTENDANCE_STATUS.NOT_CHECKED && (
                              <button
                                type="button"
                                onClick={() => checkInOne(r)}
                                className="h-8 px-3 rounded-full bg-pink-50 text-pink-700 text-[12px] font-medium hover:bg-pink-100"
                                title="เช็กชื่อให้"
                              >
                                เช็กให้
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingRow(r)}
                              title="แก้ไข"
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: "8px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <span style={{ width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#4b5563" }} />
                              <span style={{ width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#4b5563" }} />
                              <span style={{ width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#4b5563" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-[13px] text-gray-400">
              แสดง {filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, filteredRows.length)} จาก {filteredRows.length} คน
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-40 bg-white"
              >
                <FaChevronLeft size={11} />
              </button>
              <span className="text-[13px] text-gray-600">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-40 bg-white"
              >
                <FaChevronRight size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* ===== สถิติย้อนหลัง (โทนสีชมพูเดียวกับเว็บ ใช้ตัวกรองห้องเดียวกับด้านบน) ===== */}
        <div className="mt-8 rounded-2xl border border-pink-100 bg-white p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div>
              <div className="text-[19px] font-bold text-gray-900">สถิติย้อนหลัง</div>
              <div className="text-[13px] text-pink-600 font-medium mt-0.5">ห้อง {selectedRoomLabel}</div>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <input
                type="date"
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 px-2 outline-none focus:border-pink-400"
              />
              <span>ถึง</span>
              <input
                type="date"
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 px-2 outline-none focus:border-pink-400"
              />
              <button
                type="button"
                onClick={fetchHistory}
                className="h-10 px-4 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[13px] font-semibold"
              >
                อัปเดตสถิติ
              </button>
            </div>
          </div>

          {!hasHistoryData ? (
            <div className="py-10 text-center text-gray-400">ไม่มีข้อมูลในช่วงวันที่นี้</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-pink-50/60 border border-pink-100 p-7">
                <div className="text-[16px] font-semibold text-gray-800">สัดส่วนการมาเรียน</div>
                <div className="text-[13px] text-gray-400 mb-6">มาเรียน / ลา / สาย / ขาด</div>
                <AttendancePieChart data={pieData} />
              </div>
              <div className="rounded-2xl bg-pink-50/60 border border-pink-100 p-7">
                <div className="text-[16px] font-semibold text-gray-800">สรุปรายวัน</div>
                <div className="text-[13px] text-gray-400 mb-6">ดูแนวโน้มการเข้าเรียนย้อนหลัง</div>
                <AttendanceBarChart data={barData} />
              </div>
            </div>
          )}
        </div>

        {/* ===== Audit log ===== */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-[16px] font-semibold text-gray-900 mb-4">ประวัติการแก้ไข</div>
          {auditLog.length === 0 ? (
            <div className="text-gray-400 text-sm">ยังไม่มีการแก้ไข</div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {auditLog.map((log) => (
                <div key={log.log_id} className="py-3 text-[13px] text-gray-600">
                  <span className="font-medium text-gray-800">{log.teacher_name || "ระบบ"}</span> แก้ไข{" "}
                  <span className="font-medium text-gray-800">{log.fullname}</span> จาก{" "}
                  <span className="font-medium">{STATUS_META[log.from_status]?.label || "-"}</span>{" "}
                  เป็น <span className="font-medium">{STATUS_META[log.to_status]?.label || "-"}</span>{" "}
                  <span className="text-gray-400">· {formatLogTime(log.changed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      {editingRow && (
        <EditAttendanceModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={saveEdit}
        />
      )}

      {drawerStudent && (
        <StudentDrawer student={drawerStudent} onClose={() => setDrawerStudent(null)} />
      )}

      {sessionModalOpen && (
        <SessionModal
          session={session}
          now={now}
          defaultDate={selectedDate}
          onClose={() => setSessionModalOpen(false)}
          onStart={startSession}
          onCloseSession={() => closeSession(false)}
        />
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex text-[14px] text-gray-800">
      <Header />
      <SidebarNav />
      <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
        {content}
      </main>
    </div>
  );
}

const formatLogTime = (iso) => {
  try {
    return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
};

const formatRemaining = (endAt, now) => {
  const diffSec = Math.max(0, Math.floor((endAt - now) / 1000));
  const mm = String(Math.floor(diffSec / 60)).padStart(2, "0");
  const ss = String(diffSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

/* ===== Badge สถานะเซสชันเช็กชื่อ — ⚪ ยังไม่เปิด / 🟢 เปิดอยู่ (นับถอยหลัง) / 🔴 ปิดแล้ว ===== */
function SessionStatusBadge({ session, now }) {
  if (!session) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-[13px]">
        ⚪ ยังไม่ได้เปิดการเช็กชื่อ
      </span>
    );
  }
  if (session.status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13px] font-medium">
        🟢 กำลังเปิดรับการเช็กชื่อ (เหลือเวลา {formatRemaining(session.endAt, now)} นาที)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 h-10 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[13px] font-medium">
      🔴 ปิดการเช็กชื่อแล้ว
    </span>
  );
}

/* ===== Modal เปิด/ดูสถานะเซสชันเช็กชื่อ (QR + รหัส) =====
   ถ้ายังไม่มีเซสชัน หรือเซสชันก่อนหน้าปิดไปแล้ว -> ฟอร์มตั้งค่าคาบ/เวลาเพื่อเปิดใหม่
   ถ้ามีเซสชันเปิดอยู่ -> โชว์รหัส + เวลาที่เหลือ + ปุ่มปิดก่อนเวลา */
function SessionModal({ session, now, defaultDate, onClose, onStart, onCloseSession }) {
  const [date, setDate] = useState(defaultDate);
  const [period, setPeriod] = useState("");
  const [startTime, setStartTime] = useState(getNowTimeStr());
  const [endTime, setEndTime] = useState(getInMinutesTimeStr(15));

  const isOpen = session?.status === "open";

  const handleStart = () => {
    if (!period.trim()) {
      Swal.fire("ยังไม่ได้ระบุคาบเรียน", "กรอกคาบเรียน เช่น คาบ 1", "warning");
      return;
    }
    if (!startTime || !endTime || endTime <= startTime) {
      Swal.fire("เวลาไม่ถูกต้อง", "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม", "warning");
      return;
    }
    onStart({ date, period, startTime, endTime });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-[380px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-gray-900">
            {isOpen ? "รหัสเช็กชื่อ" : "เปิดการเช็กชื่อ"}
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 bg-transparent">
            <FaTimes size={13} />
          </button>
        </div>

        {isOpen ? (
          <>
            <div className="text-[13px] text-gray-500 mb-1">{session.period} · {formatDateThai(session.date)}</div>
            <div className="text-[12px] text-emerald-600 font-medium mb-4">
              🟢 เหลือเวลา {formatRemaining(session.endAt, now)} นาที
            </div>

            <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 p-6 flex flex-col items-center">
              <div className="w-40 h-40 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-300">
                <FaQrcode size={72} />
              </div>
              <div className="mt-2 text-[11px] text-gray-400">
                (ตัวอย่าง — QR สแกนได้จริงต้องต่อ library เพิ่ม)
              </div>
              <div className="mt-4 text-[12px] text-gray-500">รหัสเช็กชื่อ</div>
              <div className="text-3xl font-bold tracking-[0.3em] text-pink-700">{session.code}</div>
            </div>

            <button
              type="button"
              onClick={onCloseSession}
              className="mt-5 w-full h-11 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold"
            >
              ปิดการเช็กชื่อตอนนี้
            </button>
          </>
        ) : (
          <>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 mb-4 outline-none focus:border-pink-400"
            />

            <label className="block text-[13px] font-medium text-gray-700 mb-1">คาบเรียน</label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="เช่น คาบ 1"
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 mb-4 outline-none focus:border-pink-400"
            />

            <div className="flex gap-3 mb-5">
              <div className="flex-1">
                <label className="block text-[13px] font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:border-pink-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[13px] font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl hover:bg-gray-100 text-gray-700 font-medium bg-white">
                ยกเลิก
              </button>
              <button type="button" onClick={handleStart} className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold">
                เปิดการเช็กชื่อ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===== Stat card (dashboard) ===== */
function StatCard({ label, value, sub, valueClassName = "text-gray-900", onClick }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl border border-gray-200 bg-white p-5 cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between"
    >
      <div className="text-[13px] text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${valueClassName}`}>{value}</div>
      <div className="text-[12px] text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, className }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
      <div className={`text-2xl font-bold ${className}`}>{value ?? "-"}</div>
      <div className="text-[12px] text-gray-500 mt-1">{label}</div>
    </div>
  );
}

/* ===== Action bar button ===== */
function ActionButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-2 text-[13px]"
    >
      {icon} {label}
    </button>
  );
}

/* ===== Pie chart (ใช้ conic-gradient ล้วน ๆ ไม่พึ่ง library) ===== */
function AttendancePieChart({ data }) {
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
    <div className="flex items-center gap-8">
      <div className="w-40 h-40 rounded-full shrink-0 ring-8 ring-white shadow-sm" style={{ background: `conic-gradient(${stops})` }} />
      <div className="flex flex-col gap-3">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2.5 text-[14px] text-gray-700">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            {d.status} · <span className="font-semibold">{d.value}</span> ({Math.round((d.value / total) * 100)}%)
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Bar chart (stacked, div ล้วน ๆ) ===== */
function AttendanceBarChart({ data }) {
  const MAX_H = 160;
  const max = Math.max(...data.map((d) => d.present + d.late + d.leave + d.absent), 1);

  return (
    <div className="flex items-end gap-4" style={{ height: MAX_H + 28 }}>
      {data.map((d) => {
        const total = d.present + d.late + d.leave + d.absent || 1;
        const barH = (total / max) * MAX_H;
        const seg = (v) => (v / total) * barH;
        return (
          <div key={d.date} className="flex flex-col items-center gap-2 flex-1">
            <div className="w-full flex flex-col-reverse rounded-t-lg overflow-hidden shadow-sm" style={{ height: barH }}>
              <div style={{ height: seg(d.present), backgroundColor: "#10b981" }} />
              <div style={{ height: seg(d.late), backgroundColor: "#f59e0b" }} />
              <div style={{ height: seg(d.leave), backgroundColor: "#ec4899" }} />
              <div style={{ height: seg(d.absent), backgroundColor: "#ef4444" }} />
            </div>
            <div className="text-[11px] text-gray-500 font-medium">{d.date.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ===== Edit attendance modal ===== */
function EditAttendanceModal({ row, onClose, onSave }) {
  const [status, setStatus] = useState(row.status);
  const [checkinTime, setCheckinTime] = useState(row.checkinTime === "-" ? "" : row.checkinTime);
  const [note, setNote] = useState(row.note);

  const handleSave = () => {
    onSave({ ...row, status, checkinTime: checkinTime || "-", note });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-[360px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-gray-900">แก้ไขการเข้าเรียน</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 bg-transparent">
            <FaTimes size={13} />
          </button>
        </div>

        <div className="text-[13px] text-gray-500 mb-4">{row.fullname}</div>

        <label className="block text-[13px] font-medium text-gray-700 mb-1">สถานะ</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 mb-4 outline-none focus:border-pink-400"
        >
          {Object.entries(STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>

        <label className="block text-[13px] font-medium text-gray-700 mb-1">เวลาเช็กชื่อ</label>
        <input
          type="time"
          value={checkinTime}
          onChange={(e) => setCheckinTime(e.target.value)}
          className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 mb-4 outline-none focus:border-pink-400"
        />

        <label className="block text-[13px] font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 mb-5 outline-none focus:border-pink-400 resize-none"
          placeholder="เช่น ลาป่วย, มาสายรถติด"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl hover:bg-gray-100 text-gray-700 font-medium bg-white">
            ยกเลิก
          </button>
          <button type="button" onClick={handleSave} className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold">
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Student detail drawer ===== */
function StudentDrawer({ student, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[380px] max-w-full h-full bg-white shadow-xl p-6 overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 bg-transparent">
          <FaTimes size={13} />
        </button>

        <div className="flex flex-col items-center text-center mt-4">
          <img src={student.avatar} className="w-20 h-20 rounded-full" />
          <div className="mt-3 text-[17px] font-semibold text-gray-900">{student.fullname}</div>
          <div className="text-[13px] text-gray-500">รหัส {student.code} · {student.className}</div>
          <div className="text-[13px] text-gray-400">{student.email}</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MiniStat label="มาเรียน (วัน)" value={student.presentDays} className="text-emerald-600" />
          <MiniStat label="สาย (วัน)" value={student.lateDays} className="text-amber-600" />
          <MiniStat label="ลา (วัน)" value={student.leaveDays} className="text-pink-600" />
          <MiniStat label="ขาด (วัน)" value={student.absentDays} className="text-red-600" />
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-[12px] text-gray-500">เปอร์เซ็นต์การเข้าเรียน</div>
          <div className="text-2xl font-bold text-pink-600 mt-1">
            {student.attendancePercent === null ? "..." : `${student.attendancePercent}%`}
          </div>
        </div>

        {student.editLogs?.length > 0 && (
          <div className="mt-6">
            <div className="text-[13px] font-semibold text-gray-700 mb-2">ประวัติการแก้ไขสถานะ (วันนี้)</div>
            <div className="flex flex-col gap-2">
              {student.editLogs.map((log) => (
                <div key={log.log_id} className="text-[12.5px] text-gray-500">
                  {log.teacher_name || "ระบบ"} แก้จาก <span className="font-medium text-gray-700">{STATUS_META[log.from_status]?.label || "-"}</span> เป็น{" "}
                  <span className="font-medium text-gray-700">{STATUS_META[log.to_status]?.label || "-"}</span> · {formatLogTime(log.changed_at)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import { read, utils, writeFile } from "xlsx";
import {
  FaCloudUploadAlt, FaFileExcel, FaFileCsv, FaDownload, FaLightbulb, FaCheckCircle,
  FaExclamationTriangle, FaTimes, FaCheck, FaSyncAlt, FaArrowLeft, FaLayerGroup,
  FaUserFriends, FaChevronRight,
} from "react-icons/fa";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { getClasses, getStudent, importStudents } from "../callapi/callapi_user.jsx";
import { filterSelectStyles } from "../utils/reactSelectStyles.js";

const MAX_SIZE_MB = 10;
const IMPORT_BATCH_SIZE = 200; // ไฟล์ใหญ่เป็นหมื่นแถวส่งทีเดียวเสี่ยง request timeout — แบ่งส่งเป็นชุด

const STEPS = [
  { key: 1, label: "อัปโหลดไฟล์" },
  { key: 2, label: "จับคู่คอลัมน์" },
  { key: 3, label: "ตรวจสอบข้อมูล" },
  { key: 4, label: "นำเข้าสำเร็จ" },
];

// ฟิลด์ที่ระบบต้องการ — ตามไฟล์จริงของโรงเรียน: ชื่อ (มีรหัสห้อง-เลขที่ "xx-yy" นำหน้าชื่อจริงในคอลัมน์เดียวกัน), สกุล, อีเมล, ระดับชั้น
// อีเมลใช้เป็น username ล็อกอินจริงตาม src/login.jsx ส่วนรหัสผ่านตั้งต้น = ข้อความก่อน @ ของอีเมล (เช่น 691-64888@kkw.ac.th -> รหัสผ่าน 691-64888)
const SYSTEM_FIELDS = [
  { key: "first_name", label: "ชื่อ", hint: "มีรหัสห้อง-เลขที่นำหน้าชื่อจริง เช่น 01-01 กฤษณพล", required: true, aliases: ["ชื่อ", "firstname", "first name"] },
  { key: "last_name", label: "สกุล", required: true, aliases: ["สกุล", "นามสกุล", "lastname", "last name", "surname"] },
  { key: "email", label: "อีเมล", required: true, aliases: ["อีเมล", "email", "e-mail", "mail"] },
  { key: "grade_level", label: "ระดับชั้น", required: true, aliases: ["ระดับชั้น", "ชั้น", "grade", "level"] },
];

// "01-01 กฤษณพล" -> { section: "1", seatNo: "1", name: "กฤษณพล" } — xx คือห้อง yy คือเลขที่ (ตัด 0 นำหน้าออก เช่น 01 -> 1)
const parseNameWithRoomSeat = (v) => {
  const raw = String(v ?? "").trim();
  const m = raw.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*(.*)$/);
  if (!m) return { section: null, seatNo: null, name: raw };
  return { section: String(Number(m[1])), seatNo: String(Number(m[2])), name: m[3].trim() };
};

// "ม.1" / "ม 1" -> "1" ให้ตรงกับ grade_name ในระบบ (เก็บเป็นตัวเลขล้วน ไม่มี "ม." นำหน้า)
const parseGradeLevel = (v) => String(v ?? "").replace(/^ม\.?\s*/i, "").trim();

const VALIDATION_STATUS_META = {
  ok: { label: "พร้อมนำเข้า", cls: "bg-emerald-50 text-emerald-700" },
  duplicate: { label: "ข้อมูลซ้ำ", cls: "bg-amber-50 text-amber-700" },
  incomplete: { label: "ข้อมูลไม่ครบ", cls: "bg-red-50 text-red-700" },
};

const normalizeHeader = (h) => String(h ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");

// จับคู่คอลัมน์ในไฟล์กับฟิลด์ระบบอัตโนมัติ โดยเทียบชื่อหัวคอลัมน์กับรายการ alias ของแต่ละฟิลด์
const autoMapColumns = (columns) => {
  const mapping = {};
  const used = new Set();
  SYSTEM_FIELDS.forEach((field) => {
    const found = columns.find((c) => {
      if (used.has(c.index)) return false;
      const norm = normalizeHeader(c.header);
      return field.aliases.some((a) => norm.includes(normalizeHeader(a)));
    });
    if (found) {
      mapping[field.key] = found.index;
      used.add(found.index);
    }
  });
  return mapping;
};

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatDateTime = (d) => new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const cellValue = (row, mapping, fieldKey) => {
  const idx = mapping[fieldKey];
  if (idx == null) return "";
  return String(row[idx] ?? "").trim();
};

// ตรวจสอบทุกแถวตาม mapping ปัจจุบัน — ข้อมูลไม่ครบ / รูปแบบห้อง-เลขที่ผิด / ห้องเรียนไม่ตรงกับที่มีจริง / อีเมลซ้ำในไฟล์หรือซ้ำกับที่มีอยู่แล้ว
const validateRows = (dataRows, mapping, classesList, existingStudents) => {
  const emailCount = new Map();
  dataRows.forEach((row) => {
    const email = cellValue(row, mapping, "email").toLowerCase();
    if (email) emailCount.set(email, (emailCount.get(email) || 0) + 1);
  });
  const existingEmails = new Set((existingStudents || []).map((s) => (s.email || "").toLowerCase()).filter(Boolean));

  return dataRows.map((row, i) => {
    const firstNameRaw = cellValue(row, mapping, "first_name");
    const parsedName = parseNameWithRoomSeat(firstNameRaw);
    const firstName = parsedName.name;
    const section = parsedName.section;
    const seatNo = parsedName.seatNo;
    const roomSeatText = section && seatNo ? `${section}-${seatNo}` : "";

    const lastName = cellValue(row, mapping, "last_name");
    const email = cellValue(row, mapping, "email");
    const gradeLevelText = cellValue(row, mapping, "grade_level");

    const errors = [];
    if (!firstNameRaw) errors.push("ไม่มีชื่อ");
    else if (!section || !seatNo) errors.push(`ไม่พบรหัสห้อง-เลขที่นำหน้าชื่อ "${firstNameRaw}" (ต้องเป็น xx-yy ชื่อ เช่น 01-01 กฤษณพล)`);
    else if (!firstName) errors.push("ไม่มีชื่อจริงต่อจากรหัสห้อง-เลขที่");
    if (!lastName) errors.push("ไม่มีสกุล");
    if (!email) errors.push("ไม่มีอีเมล");
    if (!gradeLevelText) errors.push("ไม่มีระดับชั้น");

    // ห้องเรียนไม่จำเป็นต้องมีอยู่ในระบบมาก่อน — ถ้ายังไม่มีให้ backend สร้างห้องใหม่ตอนนำเข้า (isNewClass) ไม่ถือเป็น error
    const gradeNamePart = gradeLevelText ? parseGradeLevel(gradeLevelText) : null;
    const matchedClass = section && gradeNamePart
      ? classesList.find((c) => Number(c.grade_name) === Number(gradeNamePart) && Number(c.section) === Number(section))
      : null;
    const isNewClass = !!(section && gradeNamePart && !matchedClass);

    const password = email.includes("@") ? email.split("@")[0] : "";

    const dupInFile = !!email && emailCount.get(email.toLowerCase()) > 1;
    const dupInSystem = !!email && existingEmails.has(email.toLowerCase());
    if (dupInFile) errors.push("อีเมลซ้ำกันเองในไฟล์");
    if (dupInSystem) errors.push("มีอีเมลนี้ในระบบอยู่แล้ว");

    let status = "ok";
    if (!firstName || !lastName || !email || !gradeLevelText || !section || !seatNo) status = "incomplete";
    else if (dupInFile || dupInSystem) status = "duplicate";

    return {
      rowIndex: i,
      firstName, lastName, fullname: `${firstName} ${lastName}`.trim(),
      email, password, roomSeatText, gradeLevelText,
      section, seatNo,
      gradeId: matchedClass?.grade_id ?? matchedClass?.idgrade ?? null,
      gradeName: gradeNamePart,
      isNewClass,
      status, errors,
    };
  });
};

export default function ImportStudentsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [fileMeta, setFileMeta] = useState(null); // { name, size, uploadedAt }
  const [columns, setColumns] = useState([]); // [{ index, header, samples: [] }]
  const [dataRows, setDataRows] = useState([]); // array ของแถวดิบ (array ต่อแถว)
  const [mapping, setMapping] = useState({}); // { fieldKey: colIndex }

  const [classesList, setClassesList] = useState([]);
  const [existingStudents, setExistingStudents] = useState([]);

  const [validationRows, setValidationRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { done, total } จำนวนชุดที่ส่งไปแล้ว — ไฟล์ใหญ่นับหมื่นแถวส่งทีเดียวไม่ไหว
  const [importResult, setImportResult] = useState(null); // { ok, count, total } หรือ { ok:false, pending:true }

  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    Promise.all([getClasses().catch(() => []), getStudent().catch(() => [])]).then(([classData, studentData]) => {
      setClassesList((classData || []).map((c) => ({ ...c, grade_id: c.grade_id ?? c.idgrade })));
      setExistingStudents(studentData || []);
    });
  }, []);

  const resetWizard = () => {
    setStep(1);
    setFileMeta(null);
    setColumns([]);
    setDataRows([]);
    setMapping({});
    setValidationRows([]);
    setImportResult(null);
  };

  const downloadTemplate = () => {
    const header = SYSTEM_FIELDS.map((f) => f.label);
    const sample = [
      ["01-01 กฤษณพล", "ศรีสง่า", "691-64888@kkw.ac.th", "ม.1"],
      ["01-02 สมหญิง", "รักเรียน", "691-64889@kkw.ac.th", "ม.1"],
    ];
    const ws = utils.aoa_to_sheet([header, ...sample]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "นักเรียน");
    writeFile(wb, "ตัวอย่างไฟล์นำเข้ารายชื่อนักเรียน.xlsx");
  };

  const parseFile = async (file) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      Swal.fire({ icon: "warning", title: "ไฟล์ไม่ถูกต้อง", text: "รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) และ CSV (.csv)" });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      Swal.fire({ icon: "warning", title: "ไฟล์ใหญ่เกินไป", text: `ขนาดไฟล์ต้องไม่เกิน ${MAX_SIZE_MB} MB` });
      return;
    }
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      if (!rows.length) {
        Swal.fire({ icon: "warning", title: "ไฟล์ว่างเปล่า", text: "ไม่พบข้อมูลในไฟล์นี้" });
        return;
      }
      const headerRow = rows[0] || [];
      const rawDataRows = rows.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
      if (!rawDataRows.length) {
        Swal.fire({ icon: "warning", title: "ไม่พบข้อมูลนักเรียน", text: "ไฟล์นี้มีแค่หัวตาราง ไม่มีแถวข้อมูล" });
        return;
      }
      const cols = headerRow
        .map((h, index) => ({
          index,
          header: String(h ?? "").trim(),
          samples: rawDataRows.slice(0, 3).map((r) => String(r[index] ?? "").trim()).filter(Boolean),
        }))
        .filter((c) => c.header !== "");

      setFileMeta({ name: file.name, size: file.size, uploadedAt: new Date().toISOString() });
      setColumns(cols);
      setDataRows(rawDataRows);
      setMapping(autoMapColumns(cols));
      setStep(2);
    } catch (err) {
      console.error("อ่านไฟล์ไม่สำเร็จ:", err);
      Swal.fire({ icon: "error", title: "อ่านไฟล์ไม่สำเร็จ", text: "รูปแบบไฟล์อาจเสียหายหรือไม่รองรับ ลองตรวจสอบไฟล์อีกครั้ง" });
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    parseFile(e.dataTransfer.files?.[0]);
  };

  const summary = useMemo(() => {
    const firstNameIdx = mapping.first_name;
    const gradeIdx = mapping.grade_level;
    const emailIdx = mapping.email;
    const distinctGrades = (firstNameIdx != null && gradeIdx != null)
      ? new Set(
          dataRows
            .map((r) => {
              const { section } = parseNameWithRoomSeat(r[firstNameIdx]);
              const level = String(r[gradeIdx] ?? "").trim();
              return section && level ? `${level}|${section}` : null;
            })
            .filter(Boolean)
        )
      : null;
    const withEmail = emailIdx != null ? dataRows.filter((r) => String(r[emailIdx] ?? "").trim()).length : null;
    let dupCount = null;
    if (emailIdx != null) {
      const count = new Map();
      dataRows.forEach((r) => {
        const email = String(r[emailIdx] ?? "").trim().toLowerCase();
        if (email) count.set(email, (count.get(email) || 0) + 1);
      });
      dupCount = Array.from(count.values()).filter((n) => n > 1).length;
    }
    return {
      total: dataRows.length,
      grades: distinctGrades ? distinctGrades.size : null,
      withEmail,
      dup: dupCount,
    };
  }, [dataRows, mapping]);

  const goToValidation = () => {
    const missingRequired = SYSTEM_FIELDS.filter((f) => f.required && mapping[f.key] == null);
    if (missingRequired.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "จับคู่คอลัมน์ยังไม่ครบ",
        text: `กรุณาจับคู่คอลัมน์สำหรับ: ${missingRequired.map((f) => f.label).join(", ")}`,
      });
      return;
    }
    setValidationRows(validateRows(dataRows, mapping, classesList, existingStudents));
    setStep(3);
  };

  const okRows = useMemo(() => validationRows.filter((r) => r.status === "ok"), [validationRows]);

  const handleImport = async () => {
    if (okRows.length === 0) return;

    const newClassCount = new Set(okRows.filter((r) => r.isNewClass).map((r) => `${r.gradeName}|${r.section}`)).size;
    const confirmResult = await Swal.fire({
      icon: "question",
      title: "ยืนยันนำเข้าข้อมูล?",
      html: `กำลังจะสร้างบัญชีนักเรียนใหม่ <b>${okRows.length} คน</b>${
        newClassCount > 0 ? `<br/>และสร้างห้องเรียนใหม่ <b>${newClassCount} ห้อง</b> ที่ยังไม่มีในระบบ` : ""
      }<br/><br/>การกระทำนี้จะสร้างบัญชีจริงในระบบ ต้องการดำเนินการต่อหรือไม่?`,
      showCancelButton: true,
      confirmButtonText: "นำเข้าข้อมูล",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ec4899",
    });
    if (!confirmResult.isConfirmed) return;

    const toPayloadRow = (r) => ({
      first_name: r.firstName,
      last_name: r.lastName,
      fullname: r.fullname,
      email: r.email,
      password: r.password,
      grade_id: r.gradeId,
      grade_name: r.gradeName,
      section: r.section,
      seat_no: r.seatNo,
      is_new_class: r.isNewClass,
    });
    const isRowOk = (r) => r?.success === true || r?.ok === true || r?.status === "success";

    // ไฟล์ใหญ่เป็นหมื่นแถวส่งทีเดียวเสี่ยง timeout — แบ่งส่งเป็นชุดละ IMPORT_BATCH_SIZE แถวแทน
    const batches = [];
    for (let i = 0; i < okRows.length; i += IMPORT_BATCH_SIZE) batches.push(okRows.slice(i, i + IMPORT_BATCH_SIZE));

    setImporting(true);
    setImportProgress({ done: 0, total: batches.length });
    let successCount = 0;
    const failed = [];
    const newClassIds = new Set(); // นับจาก created_new_class ที่ backend ยืนยันจริง (ไม่ใช่แค่ที่หน้าเว็บเดาไว้)
    let batchError = null;

    for (let b = 0; b < batches.length; b++) {
      try {
        const res = await importStudents(batches[b].map(toPayloadRow));
        // backend ตอบกลับเป็น per-row results (แต่ละแถวรันแยกทรานแซกชัน ไม่ล้มทั้งชุดถ้าบางแถวมีปัญหา)
        // รองรับหลาย shape เผื่อกรณี: array ตรงๆ, { results: [...] } — แต่ละ item เช็คทั้ง success/ok/status
        // แต่ละ item ที่สำเร็จมี grade_id/created_new_class แนบมาด้วย ใช้นับจำนวนห้องใหม่ที่สร้างจริง
        const results = Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : null;
        if (results) {
          results.forEach((r, i) => {
            if (isRowOk(r)) {
              successCount += 1;
              if (r?.created_new_class && r?.grade_id != null) newClassIds.add(r.grade_id);
            } else {
              failed.push({ row: batches[b][i], message: r?.message || r?.error });
            }
          });
        } else {
          successCount += batches[b].length; // ไม่มี per-row info มาให้ — ถือว่าทั้งชุดสำเร็จ
        }
      } catch (err) {
        console.error(`นำเข้าชุดที่ ${b + 1}/${batches.length} ไม่สำเร็จ:`, err);
        batchError = err;
        const serverMessage = err?.response?.data?.message || err?.message || "เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว";
        batches[b].forEach((row) => failed.push({ row, message: serverMessage }));
      }
      setImportProgress({ done: b + 1, total: batches.length });
    }

    if (successCount === 0 && batchError) {
      const status = batchError?.response?.status;
      // เฉพาะ 404 เท่านั้นที่แปลว่า endpoint ยังไม่มีจริง — สถานะอื่น (401/400/422/500/เชื่อมต่อไม่ได้) ให้โชว์ error จริงแทนการเดาว่า "ยังไม่เปิดใช้งาน"
      const isMissingEndpoint = status === 404;
      setImportResult({
        ok: false,
        pending: isMissingEndpoint,
        total: okRows.length,
        errorStatus: status,
        errorDetail: !isMissingEndpoint ? (batchError?.response?.data?.message || batchError?.message || "ไม่ทราบสาเหตุ") : null,
      });
    } else {
      setImportResult({ ok: true, count: successCount, total: okRows.length, failed, newClassCreated: newClassIds.size });
    }
    setImporting(false);
    setImportProgress(null);
    setStep(4);
  };

  const handleCancel = () => {
    if (!fileMeta) { navigate("/student"); return; }
    Swal.fire({
      icon: "warning",
      title: "ยกเลิกการนำเข้า?",
      text: "ข้อมูลที่อัปโหลดไว้จะหายไป",
      showCancelButton: true,
      confirmButtonText: "ยกเลิกการนำเข้า",
      cancelButtonText: "กลับไปทำต่อ",
      confirmButtonColor: "#ef4444",
    }).then((res) => {
      if (res.isConfirmed) navigate("/student");
    });
  };

  return (
    <div className="min-h-screen bg-white flex text-gray-900">
      <Header />
      <SidebarNav />
      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="mb-6">
          <h1 className="page-title">นำเข้ารายชื่อนักเรียน</h1>
          <p className="page-subtitle mt-1">อัปโหลดไฟล์รายชื่อนักเรียนเพื่อสร้างบัญชีผู้ใช้ให้นักเรียนทั้งห้องในคราวเดียว</p>
        </div>

        <StepIndicator step={step} />

        {step < 4 && (
          <InfoBanner onDownloadTemplate={downloadTemplate} onShowHelp={() => setShowHelpModal(true)} />
        )}

        <div className="mt-6">
          {step === 1 && (
            <FileDropzone
              dragOver={dragOver}
              parsing={parsing}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onPick={() => fileInputRef.current?.click()}
            />
          )}

          {step === 2 && (
            <MappingStep
              fileMeta={fileMeta}
              dataRows={dataRows}
              columns={columns}
              mapping={mapping}
              setMapping={setMapping}
              summary={summary}
              onChangeFile={() => fileInputRef.current?.click()}
            />
          )}

          {step === 3 && (
            <ValidationStep rows={validationRows} okCount={okRows.length} />
          )}

          {step === 4 && (
            importResult?.ok
              ? <SuccessScreen count={importResult.count} total={importResult.total} failed={importResult.failed} newClassCreated={importResult.newClassCreated} onDone={() => navigate("/student")} onImportMore={resetWizard} />
              : <PendingBackendScreen
                  total={importResult?.total ?? 0}
                  pending={importResult?.pending}
                  errorStatus={importResult?.errorStatus}
                  errorDetail={importResult?.errorDetail}
                  onDone={() => navigate("/student")}
                  onImportMore={resetWizard}
                />
          )}
        </div>

        {step < 4 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={importing}
              onClick={step === 2 ? () => setStep(1) : step === 3 ? () => setStep(2) : handleCancel}
              className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium hover:bg-gray-50 flex items-center gap-2 disabled:opacity-40"
            >
              {step === 1 ? "ยกเลิก" : <><FaArrowLeft size={12} /> ย้อนกลับ</>}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={goToValidation}
                className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold flex items-center gap-2"
              >
                ตรวจสอบข้อมูล <FaChevronRight size={12} />
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleImport}
                disabled={okRows.length === 0 || importing}
                className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold flex items-center gap-2 disabled:opacity-40"
              >
                {importing
                  ? importProgress && importProgress.total > 1
                    ? `กำลังนำเข้า... (ชุดที่ ${importProgress.done}/${importProgress.total})`
                    : "กำลังนำเข้า..."
                  : `นำเข้าข้อมูล (${okRows.length} คน)`} <FaChevronRight size={12} />
              </button>
            )}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { parseFile(e.target.files?.[0]); e.target.value = ""; }}
        />
      </main>

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
    </div>
  );
}

/* ===== ส่วนย่อย ===== */

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-4 mb-2 border-b border-gray-100 overflow-x-auto">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 ${
                step === s.key ? "bg-pink-500 text-white" : step > s.key ? "bg-pink-100 text-pink-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > s.key ? <FaCheck size={10} /> : s.key}
            </span>
            <span className={`text-[14px] font-medium whitespace-nowrap ${step === s.key ? "text-pink-700" : "text-gray-400"}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <span className="w-10 h-px bg-gray-200 mx-2" />}
        </div>
      ))}
    </div>
  );
}

function InfoBanner({ onDownloadTemplate, onShowHelp }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-white border border-pink-100 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white text-pink-500 flex items-center justify-center shrink-0 shadow-sm">
          <FaCloudUploadAlt size={20} />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-gray-800">อัปโหลดไฟล์รายชื่อนักเรียนเพื่อเพิ่มข้อมูลเข้าสู่ระบบ</div>
          <div className="text-[13px] text-gray-500">รองรับไฟล์ Excel (.xlsx) และ CSV (.csv) ขนาดไฟล์ไม่เกิน {MAX_SIZE_MB} MB</div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={onDownloadTemplate} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-[13.5px] font-medium hover:bg-gray-50 flex items-center gap-2">
          <FaDownload size={12} /> ดาวน์โหลดไฟล์ตัวอย่าง
        </button>
        <button type="button" onClick={onShowHelp} className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[13.5px] font-semibold flex items-center gap-2">
          <FaLightbulb size={12} /> ดูวิธีการนำเข้า
        </button>
      </div>
    </div>
  );
}

function FileDropzone({ dragOver, parsing, onDragOver, onDragLeave, onDrop, onPick }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${dragOver ? "border-pink-400 bg-pink-50/50" : "border-gray-200 bg-gray-50/50"}`}
    >
      <FaCloudUploadAlt className="mx-auto text-gray-300" size={48} />
      <div className="text-[15px] text-gray-500 mt-3">ลากไฟล์มาวางที่นี่ หรือ</div>
      <button
        type="button"
        onClick={onPick}
        disabled={parsing}
        className="mt-4 h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14px] font-semibold disabled:opacity-50"
      >
        {parsing ? "กำลังอ่านไฟล์..." : "เลือกไฟล์"}
      </button>
      <div className="text-[13px] text-gray-400 mt-4 flex items-center justify-center gap-2">
        <FaFileExcel className="text-emerald-400" /> .xlsx / .xls
        <span className="text-gray-300">•</span>
        <FaFileCsv className="text-blue-400" /> .csv
        <span className="text-gray-300">•</span> ไม่เกิน {MAX_SIZE_MB} MB
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="text-[13px] text-gray-500">{label}</div>
        <div className="text-[20px] font-bold text-gray-900">{value ?? "-"}</div>
      </div>
    </div>
  );
}

function MappingStep({ fileMeta, dataRows, columns, mapping, setMapping, summary, onChangeFile }) {
  const setFieldMapping = (fieldKey, colIndex) => setMapping((prev) => ({ ...prev, [fieldKey]: colIndex }));

  const columnOptions = columns.map((c) => ({ value: c.index, label: c.header }));

  const previewRows = dataRows.slice(0, 5);

  return (
    <div>
      {/* การ์ดไฟล์ */}
      <div className="rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <FaFileExcel className="text-emerald-500 shrink-0" size={28} />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-gray-800 truncate">{fileMeta?.name}</div>
            <div className="text-[13px] text-gray-500">
              อัปโหลดเมื่อ {fileMeta && formatDateTime(fileMeta.uploadedAt)} · {fileMeta && formatBytes(fileMeta.size)} · {dataRows.length} แถว · {columns.length} คอลัมน์
            </div>
          </div>
        </div>
        <button type="button" onClick={onChangeFile} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-[13.5px] font-medium hover:bg-gray-50 flex items-center gap-2 shrink-0">
          <FaSyncAlt size={11} /> เปลี่ยนไฟล์
        </button>
      </div>

      {/* สรุปข้อมูลที่พบในไฟล์ */}
      <div className="mb-2 text-[15px] font-semibold text-gray-800">สรุปข้อมูลที่พบในไฟล์</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={<FaUserFriends size={17} />} label="นักเรียนทั้งหมด" value={`${summary.total} คน`} />
        <SummaryCard icon={<FaLayerGroup size={17} />} label="ห้องเรียน" value={summary.grades != null ? `${summary.grades} ห้อง` : "-"} />
        <SummaryCard icon={<FaCheckCircle size={17} />} label="อีเมลนักเรียน" value={summary.withEmail != null ? `${summary.withEmail} รายการ` : "-"} />
        <SummaryCard icon={<FaExclamationTriangle size={17} />} label="ข้อมูลซ้ำ" value={summary.dup != null ? `${summary.dup} รายการ` : "-"} />
      </div>

      {/* จับคู่คอลัมน์ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="text-[14px] font-semibold text-gray-800 mb-1">คอลัมน์ในไฟล์</div>
          <div className="text-[12.5px] text-gray-400 mb-3">คอลัมน์ที่ตรวจพบในไฟล์ที่อัปโหลด</div>
          <div className="flex flex-col gap-2">
            {columns.map((c) => (
              <div key={c.index} className="rounded-xl border border-gray-200 px-3.5 py-2.5">
                <div className="text-[13.5px] font-medium text-gray-800">{c.header}</div>
                {c.samples.length > 0 && <div className="text-[12px] text-gray-400 truncate">{c.samples.join(", ")}, ...</div>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[14px] font-semibold text-gray-800 mb-1">ข้อมูลในระบบ</div>
          <div className="text-[12.5px] text-gray-400 mb-3"><span className="text-red-500">*</span> จำเป็นต้องจับคู่</div>
          <div className="flex flex-col gap-2">
            {SYSTEM_FIELDS.map((f) => {
              const mapped = mapping[f.key] != null;
              const mappedHeader = mapped ? columns.find((c) => c.index === mapping[f.key])?.header : null;
              return (
                <div key={f.key} className={`rounded-xl border px-3.5 py-2.5 ${mapped ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-[13.5px] font-medium text-gray-800">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </div>
                    {mapped && <FaCheckCircle className="text-emerald-500 shrink-0" size={14} />}
                  </div>
                  {f.hint && <div className="text-[11px] text-gray-400 mb-1.5">{f.hint}</div>}
                  <Select
                    styles={filterSelectStyles}
                    options={columnOptions}
                    value={mapped ? { value: mapping[f.key], label: mappedHeader } : null}
                    onChange={(opt) => setFieldMapping(f.key, opt?.value ?? null)}
                    placeholder="เลือกคอลัมน์จากไฟล์..."
                    isClearable
                    isSearchable
                    noOptionsMessage={() => "ไม่พบคอลัมน์"}
                  />
                  <div className={`text-[11.5px] mt-1 ${mapped ? "text-emerald-600" : f.required ? "text-red-400" : "text-gray-400"}`}>
                    {mapped ? `จับคู่แล้ว: ${mappedHeader}` : f.required ? "ยังไม่ได้จับคู่" : "ไม่บังคับ — ข้ามได้"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ตัวอย่างข้อมูล */}
      {previewRows.length > 0 && (
        <div className="mt-6">
          <div className="text-[14px] font-semibold text-gray-800 mb-2">ตัวอย่างข้อมูล {previewRows.length} แถวแรก</div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {SYSTEM_FIELDS.map((f) => (
                    <th key={f.key} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {SYSTEM_FIELDS.map((f) => (
                      <td key={f.key} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{cellValue(row, mapping, f.key) || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ValidationStep({ rows, okCount }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const dupCount = rows.filter((r) => r.status === "duplicate").length;
  const incompleteCount = rows.filter((r) => r.status === "incomplete").length;
  const newClassCount = new Set(rows.filter((r) => r.isNewClass).map((r) => `${r.gradeName}|${r.section}`)).size;

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const changeFilter = (f) => { setFilter(f); setPage(1); };

  const FILTER_TABS = [
    { key: "all", label: "ทั้งหมด", count: rows.length },
    { key: "ok", label: "พร้อมนำเข้า", count: okCount },
    { key: "duplicate", label: "ข้อมูลซ้ำ", count: dupCount },
    { key: "incomplete", label: "ข้อมูลไม่ครบ", count: incompleteCount },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <SummaryCard icon={<FaCheckCircle size={17} />} label="พร้อมนำเข้า" value={`${okCount} คน`} />
        <SummaryCard icon={<FaExclamationTriangle size={17} />} label="ข้อมูลซ้ำ" value={`${dupCount} คน`} />
        <SummaryCard icon={<FaTimes size={17} />} label="ข้อมูลไม่ครบ" value={`${incompleteCount} คน`} />
      </div>

      {newClassCount > 0 && (
        <div className="mb-4 rounded-xl bg-blue-50 text-blue-700 px-3.5 py-2.5 text-[13px] flex items-center gap-2">
          <FaLayerGroup size={13} className="shrink-0" /> พบห้องเรียนใหม่ {newClassCount} ห้องที่ยังไม่มีในระบบ — ระบบจะสร้างห้องเรียนเหล่านี้ให้อัตโนมัติตอนนำเข้า
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeFilter(t.key)}
            className={`h-8 px-3 rounded-full text-[12.5px] font-medium transition-colors ${
              filter === t.key ? "bg-pink-500 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">ชื่อ-สกุล</th>
              <th className="text-left font-medium px-4 py-2.5">ห้อง-เลขที่</th>
              <th className="text-left font-medium px-4 py-2.5">ระดับชั้น</th>
              <th className="text-left font-medium px-4 py-2.5">อีเมล</th>
              <th className="text-left font-medium px-4 py-2.5">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((r) => {
              const meta = VALIDATION_STATUS_META[r.status];
              return (
                <tr key={r.rowIndex}>
                  <td className="px-4 py-2.5 text-gray-800 whitespace-nowrap">{r.fullname || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                    {r.roomSeatText || "-"} {r.isNewClass && <span className="text-[11px] text-blue-500">(ห้องใหม่)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{r.gradeLevelText || "-"}</td>
                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{r.email || "-"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className={`inline-flex w-fit px-2.5 py-1 rounded-full text-[12px] font-medium ${meta.cls}`}>{meta.label}</span>
                      {r.errors.length > 0 && <span className="text-[11.5px] text-gray-400">{r.errors.join(", ")}</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-[13px] text-gray-500">
          <div>แสดง {(pageSafe - 1) * PAGE_SIZE + 1}-{Math.min(pageSafe * PAGE_SIZE, filtered.length)} จาก {filtered.length} แถว</div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pageSafe <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">ก่อนหน้า</button>
            <span>{pageSafe}/{totalPages}</span>
            <button type="button" disabled={pageSafe >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">ถัดไป</button>
          </div>
        </div>
      )}

      {okCount === 0 && (
        <div className="mt-4 text-[13px] text-red-500 flex items-center gap-2">
          <FaExclamationTriangle /> ไม่มีแถวข้อมูลที่พร้อมนำเข้า — กรุณาแก้ไขไฟล์หรือการจับคู่คอลัมน์แล้วลองใหม่
        </div>
      )}
      {okCount > 0 && (dupCount > 0 || incompleteCount > 0) && (
        <div className="mt-4 text-[13px] text-gray-500">ระบบจะนำเข้าเฉพาะแถวที่มีสถานะ "พร้อมนำเข้า" เท่านั้น แถวที่ซ้ำหรือข้อมูลไม่ครบจะถูกข้าม</div>
      )}
    </div>
  );
}

function SuccessScreen({ count, total, failed = [], newClassCreated, onDone, onImportMore }) {
  const allOk = failed.length === 0;
  return (
    <div className="flex flex-col items-center text-center py-14">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${allOk ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"}`}>
        {allOk ? <FaCheckCircle size={42} /> : <FaExclamationTriangle size={38} />}
      </div>
      <div className="text-[22px] font-bold text-gray-900">{allOk ? "นำเข้าข้อมูลสำเร็จ!" : "นำเข้าข้อมูลเสร็จสิ้น มีบางรายการไม่สำเร็จ"}</div>
      <div className="text-[14px] text-gray-500 mt-2">นำเข้าบัญชีนักเรียนสำเร็จ {count} จาก {total} คน</div>
      {!!newClassCreated && (
        <div className="text-[13.5px] text-blue-600 mt-1 flex items-center gap-1.5">
          <FaLayerGroup size={12} /> สร้างห้องเรียนใหม่ {newClassCreated} ห้อง
        </div>
      )}

      {failed.length > 0 && (
        <div className="mt-4 w-full max-w-[480px] text-left rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <div className="text-[13px] font-semibold text-amber-700 mb-1.5">รายการที่ไม่สำเร็จ:</div>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {failed.map((f, i) => (
              <div key={i} className="text-[12.5px] text-amber-700">
                {f.row?.fullname || "-"} ({f.row?.email || "-"}) — {f.message || "ไม่ทราบสาเหตุ"}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-7">
        <button type="button" onClick={onImportMore} className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium hover:bg-gray-50">นำเข้าไฟล์อื่นเพิ่ม</button>
        <button type="button" onClick={onDone} className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold">ไปที่รายชื่อนักเรียน</button>
      </div>
    </div>
  );
}

// แสดงตอนที่ backend ยังไม่มี endpoint /auth/students/import จริง — ไม่ปลอมผลว่าสำเร็จ บอกตรง ๆ ว่าฝั่งเว็บพร้อมแล้ว รอฝั่งระบบหลังบ้าน
function PendingBackendScreen({ total, pending, errorStatus, errorDetail, onDone, onImportMore }) {
  return (
    <div className="flex flex-col items-center text-center py-14">
      <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-5">
        <FaExclamationTriangle size={38} />
      </div>
      <div className="text-[20px] font-bold text-gray-900">{pending ? "ยังนำเข้าข้อมูลจริงไม่ได้" : "นำเข้าข้อมูลไม่สำเร็จ"}</div>
      {pending ? (
        <div className="text-[14px] text-gray-500 mt-2 max-w-[440px] leading-relaxed">
          หน้าเว็บตรวจสอบและเตรียมข้อมูลของนักเรียน {total} คนพร้อมแล้ว แต่ระบบหลังบ้านยังไม่เปิดใช้งานการสร้างบัญชีนักเรียนอัตโนมัติ
          กรุณาแจ้งผู้ดูแลระบบเพื่อเปิดใช้งานฟีเจอร์นี้ก่อน
        </div>
      ) : (
        <div className="text-[14px] text-gray-500 mt-2 max-w-[480px] leading-relaxed">
          พยายามนำเข้านักเรียน {total} คน แต่เซิร์ฟเวอร์ตอบกลับข้อผิดพลาด{errorStatus ? ` (HTTP ${errorStatus})` : ""}:
          <div className="mt-2 rounded-xl bg-red-50 text-red-600 px-3.5 py-2.5 text-[13px] text-left break-words">{errorDetail}</div>
          <div className="mt-2">ลองตรวจสอบว่ายังล็อกอินอยู่ไหม (session อาจหมดอายุระหว่างนำเข้า) แล้วลองใหม่อีกครั้ง</div>
        </div>
      )}
      <div className="flex items-center gap-3 mt-7">
        <button type="button" onClick={onImportMore} className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium hover:bg-gray-50">ลองใหม่อีกครั้ง</button>
        <button type="button" onClick={onDone} className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold">กลับไปหน้ารายชื่อนักเรียน</button>
      </div>
    </div>
  );
}

function HelpModal({ onClose }) {
  const steps = [
    { title: "ดาวน์โหลดไฟล์ตัวอย่าง", desc: "กดปุ่ม \"ดาวน์โหลดไฟล์ตัวอย่าง\" เพื่อดูรูปแบบคอลัมน์ที่ระบบรองรับ" },
    { title: "กรอกข้อมูลนักเรียนลงไฟล์", desc: "กรอกตามคอลัมน์ในไฟล์ตัวอย่าง: ชื่อ (ใส่รหัสห้อง-เลขที่นำหน้า เช่น \"01-01 กฤษณพล\"), สกุล, อีเมล, ระดับชั้น (เช่น ม.1)" },
    { title: "อัปโหลดไฟล์", desc: "ลากไฟล์มาวาง หรือกด \"เลือกไฟล์\" (รองรับ .xlsx, .xls, .csv ไม่เกิน 10 MB)" },
    { title: "ตรวจสอบการจับคู่คอลัมน์", desc: "ระบบจะจับคู่คอลัมน์ให้อัตโนมัติ ตรวจสอบและแก้ไขให้ถูกต้องก่อนไปขั้นตอนถัดไป" },
    { title: "ตรวจสอบและนำเข้าข้อมูล", desc: "ตรวจสอบรายชื่อที่ข้อมูลซ้ำหรือไม่ครบ แล้วกด \"นำเข้าข้อมูล\" เพื่อเพิ่มบัญชีนักเรียนเข้าสู่ระบบ" },
  ];
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-gray-900 flex items-center gap-2"><FaLightbulb className="text-pink-500" /> วิธีการนำเข้ารายชื่อนักเรียน</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-transparent"><FaTimes size={18} /></button>
        </div>
        <div className="flex flex-col gap-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-pink-50 text-pink-600 text-[12px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
              <div>
                <div className="text-[14px] font-medium text-gray-800">{s.title}</div>
                <div className="text-[13px] text-gray-500 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-6 w-full h-11 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold">เข้าใจแล้ว</button>
      </div>
    </div>
  );
}

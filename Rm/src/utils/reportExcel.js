import { safeFileName, todayStamp } from "./reportPdf.js";

// รายงาน Excel (.xlsx) กลาง — ชื่อรายงาน/เงื่อนไขด้านบน, หัวตาราง + ตัวกรอง, ความกว้างคอลัมน์พอดีข้อความ
// ใช้ columns/rows ชุดเดียวกับ exportReportPdf เพื่อให้ PDF กับ Excel มีข้อมูลตรงกัน
// sheets: [{ name, columns:[{label,key|get,excelWidth}], rows }] หรือส่ง columns/rows ตรงๆ (ชีตเดียว)

const cellValue = (col, row) => {
  const v = typeof col.get === "function" ? col.get(row) : row[col.key];
  if (v == null || v === "") return "-";
  return v;
};

const textWidth = (v) => [...String(v ?? "")].filter((ch) => !/[ัิ-ฺ็-๎]/.test(ch)).length; // สระบน/ล่างไม่กินความกว้าง

export const exportReportExcel = async ({ title, info = [], sheets, columns, rows, sheetName = "รายงาน", filename }) => {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const list = sheets || [{ name: sheetName, columns, rows }];

  list.forEach((sh) => {
    const head = [[title], ...info.filter(([, v]) => v != null && v !== "").map(([k, v]) => [`${k}: ${v}`]), []];
    const header = sh.columns.map((c) => c.label);
    const body = (sh.rows || []).map((r) => (r.__group ? [r.__group] : sh.columns.map((c) => cellValue(c, r))));
    const aoa = [...head, header, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = sh.columns.map((c, i) => ({
      wch: c.excelWidth || Math.min(60, Math.max(textWidth(c.label) + 2, ...body.slice(0, 300).map((r) => textWidth(r[i]) + 2), 8)),
    }));
    const headerRow = head.length; // 0-based
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: headerRow + body.length, c: sh.columns.length - 1 } }) };
    ws["!merges"] = head.slice(0, -1).map((_, r) => ({ s: { r, c: 0 }, e: { r, c: Math.max(0, sh.columns.length - 1) } }));
    XLSX.utils.book_append_sheet(wb, ws, String(sh.name || "รายงาน").slice(0, 31).replace(/[\\/?*[\]:]/g, "-"));
  });

  XLSX.writeFile(wb, filename || `${safeFileName(title)}_${todayStamp()}.xlsx`);
};

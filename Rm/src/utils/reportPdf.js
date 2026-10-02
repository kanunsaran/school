// รายงาน PDF กลางของระบบ (ใช้ทุกปุ่ม "ส่งออก/ดาวน์โหลดรายงาน" ฝั่งครู)
// หน้าตา: หัวกระดาษโรงเรียน + ชื่อรายงาน + เงื่อนไข → กล่องสรุปตัวเลข → ตารางสลับสีแถว (หัวตารางซ้ำทุกหน้า)
// หรือบล็อกข้อมูลรายคน → เลขหน้า "หน้า x/y" + วันที่ออกรายงาน; ฟอนต์ TH Sarabun New
// จัดหน้าอัตโนมัติด้วยการวัดความสูงจริงในเบราว์เซอร์ แล้ววาดเป็นภาพด้วย html-to-image ใส่ jsPDF (ภาษาไทยถูกต้องเสมอ)

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const dash = (v) => (v == null || (typeof v === "string" && !v.trim()) ? "-" : v);

const SIZES = { portrait: { w: 794, h: 1123 }, landscape: { w: 1123, h: 794 } };

const CSS = `
.rpt, .rpt * { box-sizing: border-box; }
.rpt .page { position: relative; background: #fff; overflow: hidden; color: #111;
  font-family: 'TH Sarabun New', 'Tahoma', sans-serif; font-size: 21px; line-height: 1.2; padding: 34px 40px 56px; }
.rpt .head { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #db2777; padding-bottom: 8px; margin-bottom: 10px; }
.rpt .head img { width: 62px; height: 62px; object-fit: contain; }
.rpt .school { font-size: 20px; color: #555; line-height: 1.1; }
.rpt .title { font-size: 32px; font-weight: 700; line-height: 1.05; color: #111; }
.rpt .subtitle { font-size: 21px; color: #444; }
.rpt .cont { font-size: 21px; color: #666; margin-bottom: 6px; }
.rpt .info { display: flex; flex-wrap: wrap; gap: 4px 22px; font-size: 21px; margin: 2px 0 10px; }
.rpt .info b { font-weight: 700; }
.rpt .summary { display: flex; gap: 10px; margin: 0 0 12px; }
.rpt .stat { flex: 1; border: 1px solid #f3c4dc; background: #fdf2f8; border-radius: 8px; padding: 6px 10px; }
.rpt .stat .v { font-size: 32px; font-weight: 700; line-height: 1.05; color: #be185d; }
.rpt .stat .l { font-size: 19px; color: #444; }
.rpt .stat.green { background: #ecfdf5; border-color: #a7f3d0; } .rpt .stat.green .v { color: #047857; }
.rpt .stat.amber { background: #fffbeb; border-color: #fde68a; } .rpt .stat.amber .v { color: #b45309; }
.rpt .stat.blue  { background: #eff6ff; border-color: #bfdbfe; } .rpt .stat.blue .v  { color: #1d4ed8; }
.rpt .stat.red   { background: #fef2f2; border-color: #fecaca; } .rpt .stat.red .v   { color: #b91c1c; }
.rpt .stat.gray  { background: #f9fafb; border-color: #e5e7eb; } .rpt .stat.gray .v  { color: #374151; }
.rpt table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.rpt th { background: #fce7f3; color: #831843; font-weight: 700; font-size: 20px; text-align: left; padding: 4px 7px; border: 1px solid #f3c4dc; }
.rpt td { padding: 3px 7px; border: 1px solid #e3e3e3; vertical-align: top; font-size: 20px; word-break: break-word; }
.rpt tr:nth-child(even) td { background: #fafafa; }
.rpt .c { text-align: center; } .rpt .r { text-align: right; }
.rpt .group td { background: #fdf2f8 !important; font-weight: 700; color: #9d174d; }
.rpt .block { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px; break-inside: avoid; }
.rpt .block .bh { background: #fdf2f8; border-bottom: 1px solid #f3c4dc; padding: 4px 10px; font-weight: 700; font-size: 22px; color: #831843; display: flex; justify-content: space-between; gap: 10px; }
.rpt .block .bh span { font-weight: 400; color: #555; font-size: 20px; }
.rpt .block table td { border: 0; border-bottom: 1px solid #f1f1f1; }
.rpt .block table td.k { width: 17%; color: #555; }
.rpt .block .sec td { background: #fafafa; font-weight: 700; color: #444; }
.rpt .empty { padding: 18px; text-align: center; color: #888; border: 1px dashed #ddd; border-radius: 8px; }
.rpt .foot { position: absolute; left: 40px; right: 40px; bottom: 18px; display: flex; justify-content: space-between; font-size: 17px; color: #666; border-top: 1px solid #eee; padding-top: 4px; }
.rpt .note { font-size: 18px; color: #555; margin-top: 8px; }
`;

const ensureStyles = () => {
  if (document.getElementById("rpt-style")) return;
  const base = `${window.location.origin}/fonts`;
  const style = document.createElement("style");
  style.id = "rpt-style";
  style.textContent = `
@font-face { font-family: 'TH Sarabun New'; src: url('${base}/THSarabunNew.ttf') format('truetype'); font-weight: 400; font-display: block; }
@font-face { font-family: 'TH Sarabun New'; src: url('${base}/THSarabunNew-Bold.ttf') format('truetype'); font-weight: 700; font-display: block; }
${CSS}`;
  document.head.appendChild(style);
};

export const thaiDateTime = (d = new Date()) =>
  d.toLocaleString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const thaiDate = (d) => {
  if (!d) return "-";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

const cellValue = (col, row) => (typeof col.get === "function" ? col.get(row) : row[col.key]);

const headHtml = (o, first) => {
  if (!first) return `<div class="cont"><b>${esc(o.title)}</b> (ต่อ)</div>`;
  const info = (o.info || []).filter(([, v]) => v != null && v !== "");
  return `
    <div class="head">
      <img src="${window.location.origin}/image/school-emblem.png" alt="" />
      <div>
        <div class="school">${esc(o.school || "โรงเรียนขอนแก่นวิทยายน • งานแนะแนว")}</div>
        <div class="title">${esc(o.title)}</div>
        ${o.subtitle ? `<div class="subtitle">${esc(o.subtitle)}</div>` : ""}
      </div>
    </div>
    ${info.length ? `<div class="info">${info.map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join("")}</div>` : ""}`;
};

const summaryHtml = (summary) =>
  summary?.length
    ? `<div class="summary">${summary
        .map((s) => `<div class="stat ${s.tone || ""}"><div class="v">${esc(dash(s.value))}</div><div class="l">${esc(s.label)}</div></div>`)
        .join("")}</div>`
    : "";

const theadHtml = (cols) =>
  `<thead><tr>${cols
    .map((c) => `<th class="${c.align === "center" ? "c" : c.align === "right" ? "r" : ""}" style="width:${c.width || "auto"}">${esc(c.label)}</th>`)
    .join("")}</tr></thead>`;

const rowHtml = (cols, row) =>
  row.__group
    ? `<tr class="group"><td colspan="${cols.length}">${esc(row.__group)}</td></tr>`
    : `<tr>${cols
        .map((c) => `<td class="${c.align === "center" ? "c" : c.align === "right" ? "r" : ""}">${esc(dash(cellValue(c, row)))}</td>`)
        .join("")}</tr>`;

// บล็อกรายคน: หัวข้อ–ค่า 2 คู่ต่อแถว (การ์ดเตี้ย ใส่ได้หลายคนต่อหน้า) ค่ายาวมากกินเต็มแถว
const blockHtml = (b) => {
  const out = [];
  let pair = [];
  const flush = () => {
    if (!pair.length) return;
    const cells = pair.map(([k, v]) => `<td class="k">${esc(k)}</td><td>${esc(dash(v))}</td>`).join("");
    out.push(`<tr>${cells}${pair.length === 1 ? '<td class="k"></td><td></td>' : ""}</tr>`);
    pair = [];
  };
  (b.rows || []).forEach((r) => {
    if (r.section) {
      flush();
      out.push(`<tr class="sec"><td colspan="4">${esc(r.section)}</td></tr>`);
    } else if (String(r[1] ?? "").length > 34) {
      flush();
      out.push(`<tr><td class="k">${esc(r[0])}</td><td colspan="3">${esc(dash(r[1]))}</td></tr>`);
    } else {
      pair.push(r);
      if (pair.length === 2) flush();
    }
  });
  flush();
  return `
  <div class="block">
    <div class="bh">${esc(b.heading)}${b.sub ? `<span>${esc(b.sub)}</span>` : ""}</div>
    <table>${out.join("")}</table>
  </div>`;
};

// จัดหน้า: วัดจริงใน DOM แล้วตัดขึ้นหน้าใหม่เมื่อเนื้อหาล้น
const paginate = (host, o, size) => {
  const pages = [];
  const newPage = () => {
    const page = document.createElement("div");
    page.className = "page";
    page.style.width = `${size.w}px`;
    page.style.height = `${size.h}px`;
    page.innerHTML = `<div class="content">${headHtml(o, pages.length === 0)}</div>`;
    host.appendChild(page);
    pages.push(page);
    return page.querySelector(".content");
  };
  // พื้นที่เนื้อหา = สูงหน้า − ขอบบน − พื้นที่ท้ายกระดาษ (เลขหน้า)
  const fits = (content) => content.scrollHeight <= size.h - 34 - 56;

  let content = newPage();
  if (o.summary?.length) content.insertAdjacentHTML("beforeend", summaryHtml(o.summary));

  if (o.table) {
    const cols = o.table.columns;
    const rows = o.table.rows || [];
    if (!rows.length) content.insertAdjacentHTML("beforeend", `<div class="empty">${esc(o.emptyText || "ไม่มีข้อมูล")}</div>`);
    let tbody = null;
    const startTable = () => {
      content.insertAdjacentHTML("beforeend", `<table>${theadHtml(cols)}<tbody></tbody></table>`);
      tbody = content.lastElementChild.querySelector("tbody");
    };
    if (rows.length) startTable();
    rows.forEach((row) => {
      tbody.insertAdjacentHTML("beforeend", rowHtml(cols, row));
      if (!fits(content) && tbody.children.length > 1) {
        tbody.lastElementChild.remove();
        content = newPage();
        startTable();
        tbody.insertAdjacentHTML("beforeend", rowHtml(cols, row));
      }
    });
  }

  if (o.blocks) {
    if (!o.blocks.length) content.insertAdjacentHTML("beforeend", `<div class="empty">${esc(o.emptyText || "ไม่มีข้อมูล")}</div>`);
    o.blocks.forEach((b) => {
      content.insertAdjacentHTML("beforeend", blockHtml(b));
      if (!fits(content) && content.children.length > 1) {
        content.lastElementChild.remove();
        content = newPage();
        content.insertAdjacentHTML("beforeend", blockHtml(b));
      }
    });
  }

  if (o.note) {
    content.insertAdjacentHTML("beforeend", `<div class="note">${esc(o.note)}</div>`);
    if (!fits(content)) {
      content.lastElementChild.remove();
      content = newPage();
      content.insertAdjacentHTML("beforeend", `<div class="note">${esc(o.note)}</div>`);
    }
  }

  const printed = thaiDateTime();
  pages.forEach((p, i) =>
    p.insertAdjacentHTML("beforeend", `<div class="foot"><span>${esc(o.title)} • พิมพ์เมื่อ ${esc(printed)}</span><span>หน้า ${i + 1}/${pages.length}</span></div>`)
  );
  return pages;
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const todayStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const safeFileName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").trim();

// o: { title, subtitle, info:[[k,v]], summary:[{label,value,tone}], table:{columns,rows} | blocks:[{heading,sub,rows}],
//      orientation: "portrait"|"landscape", filename, note, emptyText }
// onProgress(0..1); คืน Blob ถ้า o.returnBlob ไม่งั้นดาวน์โหลดเลย
export const exportReportPdf = async (o, onProgress) => {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  ensureStyles();
  const orientation = o.orientation || "portrait";
  const size = SIZES[orientation];
  const host = document.createElement("div");
  host.className = "rpt";
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${size.w}px;pointer-events:none`;
  document.body.appendChild(host);
  try {
    try {
      await Promise.race([
        Promise.all([document.fonts.load("400 18px 'TH Sarabun New'", "ก"), document.fonts.load("700 18px 'TH Sarabun New'", "ก")]),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
    } catch {
      /* ใช้ฟอนต์สำรอง */
    }
    const pages = paginate(host, o, size);
    await Promise.all([...host.querySelectorAll("img")].map((img) => (img.complete ? null : img.decode().catch(() => null))));
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation, compress: true });
    const [pw, ph] = orientation === "portrait" ? [210, 297] : [297, 210];
    for (let i = 0; i < pages.length; i++) {
      const img = await toJpeg(pages[i], { quality: 0.88, pixelRatio: 2, backgroundColor: "#ffffff", width: size.w, height: size.h });
      if (i > 0) pdf.addPage("a4", orientation);
      pdf.addImage(img, "JPEG", 0, 0, pw, ph);
      onProgress?.((i + 1) / pages.length);
    }
    const blob = pdf.output("blob");
    if (o.returnBlob) return blob;
    downloadBlob(blob, o.filename || `${safeFileName(o.title)}_${todayStamp()}.pdf`);
    return blob;
  } finally {
    host.remove();
  }
};

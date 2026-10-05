import { API_BASE_URL } from "../config/api.js";
import { resolveFileUrl } from "./media.js";
import { downloadBlob, thaiDateTime, exportReportPdf } from "./reportPdf.js";
import {
  SECTIONS, REPORT_TYPES, RIASEC, RIASEC_TH, rankRiasec, riasecCode, goalAlignment, analysisOf, generalRows, goalRows,
} from "./studentReportData.js";

// รายงานรายบุคคล (PDF) — หน้าตาตามต้นแบบ: การ์ดนักเรียน → กล่องตามหัวข้อที่ครูเลือก (เลือกอะไรใส่แค่นั้น)
// จัดหน้าอัตโนมัติ (ไม่กำหนดจำนวนหน้า) • หลายคน = PDF เดียว แต่ละคนเริ่มหน้าใหม่ • กราฟ RIASEC หกเหลี่ยม

const W = 794;
const H = 1123;
const PAD_TOP = 30;
const FOOT = 50;

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dash = (v) => (v == null || v === "" ? "-" : v);
const thaiDate = (d) => (d ? new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-");
const thaiDT = (d) => (d ? new Date(d).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-");
// ปีการศึกษาไทยเริ่ม พ.ค.
const academicYear = () => {
  const d = new Date();
  return d.getFullYear() + 543 - (d.getMonth() < 4 ? 1 : 0);
};
const ATT_TH = { present: "มาเรียน", late: "สาย", leave: "ลา", absent: "ขาด" };
const METHOD_TH = { qr: "QR Code", gps: "GPS", teacher: "ครูเช็กให้", manual: "Manual" };

const CSS = `
.srp, .srp * { box-sizing: border-box; }
.srp .page { width: ${W}px; height: ${H}px; position: relative; overflow: hidden; background: #fff; color: #1f2937;
  font-family: 'TH Sarabun New', 'Tahoma', sans-serif; font-size: 20px; line-height: 1.22; padding: ${PAD_TOP}px 38px ${FOOT}px; }
.srp .top { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #db2777; padding-bottom: 6px; margin-bottom: 12px; }
.srp .top .l { display: flex; align-items: center; gap: 10px; }
.srp .top img { width: 46px; height: 46px; object-fit: contain; }
.srp .top .school { font-size: 18px; color: #6b7280; line-height: 1; }
.srp .top .ttl { font-size: 28px; font-weight: 700; color: #831843; line-height: 1.05; }
.srp .top .r { font-size: 17px; color: #6b7280; text-align: right; line-height: 1.1; }
.srp .card { display: flex; gap: 16px; align-items: center; border: 1px solid #f3c4dc; background: linear-gradient(90deg,#fdf2f8,#fff); border-radius: 14px; padding: 12px 16px; margin-bottom: 12px; }
.srp .photo { width: 92px; height: 92px; border-radius: 14px; object-fit: cover; background: #fce7f3; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 44px; font-weight: 700; color: #db2777; overflow: hidden; }
.srp .photo img { width: 100%; height: 100%; object-fit: cover; }
.srp .card .name { font-size: 30px; font-weight: 700; line-height: 1.05; color: #111827; }
.srp .card .meta { display: flex; flex-wrap: wrap; gap: 2px 18px; font-size: 19px; color: #4b5563; margin-top: 4px; }
.srp .card .meta b { color: #111827; }
.srp .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.srp .chip { font-size: 16px; padding: 1px 10px; border-radius: 999px; background: #fff; border: 1px solid #f3c4dc; color: #9d174d; }
.srp .box { border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
.srp .box .bh { display: flex; align-items: center; gap: 8px; background: #fdf2f8; border-bottom: 1px solid #f3c4dc; padding: 5px 14px; font-size: 22px; font-weight: 700; color: #831843; }
.srp .box .bh .n { width: 26px; height: 26px; border-radius: 8px; background: #db2777; color: #fff; font-size: 17px; display: flex; align-items: center; justify-content: center; }
.srp .box .bb { padding: 8px 14px 10px; }
.srp .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 22px; }
.srp .kv .it { display: flex; gap: 8px; border-bottom: 1px dashed #eee; padding: 2px 0; min-width: 0; }
.srp .kv .it.wide { grid-column: 1 / -1; }
.srp .kv .k { color: #6b7280; flex-shrink: 0; min-width: 118px; }
.srp .kv .v { color: #111827; font-weight: 700; word-break: break-word; }
.srp .stats { display: flex; gap: 8px; margin-bottom: 8px; }
.srp .st { flex: 1; border-radius: 10px; padding: 4px 10px; background: #f9fafb; border: 1px solid #e5e7eb; }
.srp .st .v { font-size: 28px; font-weight: 700; line-height: 1.05; }
.srp .st .l { font-size: 17px; color: #4b5563; }
.srp .st.g { background:#ecfdf5; border-color:#a7f3d0; } .srp .st.g .v { color:#047857; }
.srp .st.a { background:#fffbeb; border-color:#fde68a; } .srp .st.a .v { color:#b45309; }
.srp .st.b { background:#eff6ff; border-color:#bfdbfe; } .srp .st.b .v { color:#1d4ed8; }
.srp .st.r { background:#fef2f2; border-color:#fecaca; } .srp .st.r .v { color:#b91c1c; }
.srp .st.p { background:#fdf2f8; border-color:#f3c4dc; } .srp .st.p .v { color:#be185d; }
.srp table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.srp th { background: #fce7f3; color: #831843; font-weight: 700; font-size: 18px; text-align: left; padding: 3px 7px; border: 1px solid #f3c4dc; }
.srp td { padding: 2px 7px; border: 1px solid #ececec; font-size: 18px; vertical-align: top; word-break: break-word; }
.srp tr:nth-child(even) td { background: #fafafa; }
.srp .c { text-align: center; }
.srp .tag { display: inline-block; padding: 0 8px; border-radius: 999px; font-size: 16px; font-weight: 700; }
.srp .tag.ok { background:#ecfdf5; color:#047857; } .srp .tag.late { background:#fffbeb; color:#b45309; }
.srp .tag.no { background:#fef2f2; color:#b91c1c; } .srp .tag.wait { background:#f3f4f6; color:#4b5563; } .srp .tag.leave { background:#eff6ff; color:#1d4ed8; }
.srp .holland { display: flex; gap: 16px; align-items: center; }
.srp .holland svg { flex-shrink: 0; }
.srp .bars { flex: 1; }
.srp .bar { display: flex; align-items: center; gap: 8px; margin: 3px 0; font-size: 18px; }
.srp .bar .lb { width: 128px; flex-shrink: 0; }
.srp .bar .lb b { color: #831843; }
.srp .bar .tr { flex: 1; height: 12px; border-radius: 999px; background: #f3f4f6; overflow: hidden; }
.srp .bar .fl { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#f9a8d4,#db2777); }
.srp .bar .nv { width: 34px; text-align: right; font-weight: 700; }
.srp .typebox { margin-top: 8px; background: #fdf2f8; border-radius: 10px; padding: 6px 12px; font-size: 19px; }
.srp .typebox b { color: #831843; }
.srp .an { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
.srp .an .sec { border-radius: 10px; padding: 6px 12px; background: #f9fafb; }
.srp .an .sec h4 { margin: 0 0 2px; font-size: 20px; font-weight: 700; }
.srp .an ul { margin: 0; padding-left: 20px; list-style: disc; } .srp .an li { font-size: 18.5px; margin: 1px 0; }
.srp .an .s1 { background:#ecfdf5; } .srp .an .s1 h4 { color:#047857; }
.srp .an .s2 { background:#eff6ff; } .srp .an .s2 h4 { color:#1d4ed8; }
.srp .an .s3 { background:#fffbeb; } .srp .an .s3 h4 { color:#b45309; }
.srp .an .s4 { background:#fdf2f8; } .srp .an .s4 h4 { color:#be185d; }
.srp .lvl { display: inline-block; padding: 0 10px; border-radius: 999px; font-weight: 700; margin-right: 6px; }
.srp .lvl.hi { background:#047857; color:#fff; } .srp .lvl.mid { background:#d97706; color:#fff; } .srp .lvl.lo { background:#dc2626; color:#fff; } .srp .lvl.na { background:#9ca3af; color:#fff; }
.srp .empty { color: #9ca3af; padding: 6px 0; }
.srp .cont { font-size: 18px; color: #9ca3af; margin: -4px 0 6px; }
.srp .foot { position: absolute; left: 38px; right: 38px; bottom: 16px; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 4px; font-size: 16px; color: #6b7280; }
`;

const ensureStyles = () => {
  if (document.getElementById("srp-style")) return;
  const base = `${window.location.origin}/fonts`;
  const st = document.createElement("style");
  st.id = "srp-style";
  st.textContent = `
@font-face { font-family: 'TH Sarabun New'; src: url('${base}/THSarabunNew.ttf') format('truetype'); font-weight: 400; font-display: block; }
@font-face { font-family: 'TH Sarabun New'; src: url('${base}/THSarabunNew-Bold.ttf') format('truetype'); font-weight: 700; font-display: block; }
${CSS}`;
  document.head.appendChild(st);
};

// ---------- กราฟ RIASEC หกเหลี่ยม (SVG) ----------
export const radarSvg = (scores, size = 250) => {
  const cx = size / 2;
  const cy = size / 2 + 4;
  const R = size / 2 - 30;
  const vals = RIASEC.map((c) => Number(scores?.[c]) || 0);
  const max = Math.max(10, Math.ceil(Math.max(...vals) / 10) * 10);
  const pt = (i, r) => {
    const a = (-90 + i * 60) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ring = (f) => RIASEC.map((_, i) => pt(i, R * f).join(",")).join(" ");
  const poly = vals.map((v, i) => pt(i, (R * v) / max).join(",")).join(" ");
  const labels = RIASEC.map((c, i) => {
    const [x, y] = pt(i, R + 17);
    return `<text x="${x}" y="${y + 7}" text-anchor="middle" font-size="22" font-weight="700" fill="#831843" font-family="TH Sarabun New, Tahoma">${c}</text>`;
  }).join("");
  const dots = vals.map((v, i) => {
    const [x, y] = pt(i, (R * v) / max);
    return `<circle cx="${x}" cy="${y}" r="4" fill="#db2777"/>`;
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${[1, 0.75, 0.5, 0.25].map((f) => `<polygon points="${ring(f)}" fill="${f === 1 ? "#fdf2f8" : "none"}" stroke="#f3c4dc" stroke-width="1.2"/>`).join("")}
    ${RIASEC.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="#f3c4dc" stroke-width="1"/>`).join("")}
    <polygon points="${poly}" fill="rgba(219,39,119,0.28)" stroke="#db2777" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
};

// ---------- บล็อกของแต่ละหัวข้อ ----------
const kv = (rows) =>
  `<div class="kv">${rows
    .map(([k, v]) => `<div class="it${String(v).length > 30 ? " wide" : ""}"><span class="k">${esc(k)}</span><span class="v">${esc(dash(v))}</span></div>`)
    .join("")}</div>`;

const box = (n, title, body) => `<div class="box"><div class="bh"><span class="n">${n}</span>${esc(title)}</div><div class="bb">${body}</div></div>`;

const statBox = (items) =>
  `<div class="stats">${items.map(([l, v, t]) => `<div class="st ${t || ""}"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`).join("")}</div>`;

const workTag = (w) => `<span class="tag ${w.status === "ส่งแล้ว" ? "ok" : w.status === "ส่งช้า" ? "late" : w.overdue ? "no" : "wait"}">${esc(w.status)}</span>`;
const attTag = (s) => `<span class="tag ${s === "present" ? "ok" : s === "late" ? "late" : s === "leave" ? "leave" : "no"}">${esc(ATT_TH[s] || s)}</span>`;

// แต่ละหัวข้อคืน { html } (บล็อกเดียว) หรือ { head, table:{thead, rows[]} } (ตารางยาว ตัดข้ามหน้าได้)
const sectionBlocks = (d, key, n) => {
  if (key === "general") return [{ html: box(n, SECTIONS.general, kv(generalRows(d))) }];
  if (key === "goal") return [{ html: box(n, SECTIONS.goal, kv(goalRows(d))) }];
  if (key === "holland") {
    const ranked = rankRiasec(d);
    if (!ranked.length) return [{ html: box(n, SECTIONS.holland, `<div class="empty">นักเรียนยังไม่ได้ทำแบบประเมิน Holland</div>`) }];
    const typeBox = `<div class="typebox">กลุ่มบุคลิกภาพเด่น: <b>${esc(d.type?.type_name || `${ranked[0][0]} – ${RIASEC_TH[ranked[0][0]]}`)}</b>${d.faculty ? ` • คณะแนะนำ: <b>${esc(`${d.faculty.faculty_name} (${d.faculty.university_name})`)}</b>` : ""}<br/><span style="color:#6b7280">ทำแบบประเมินเมื่อ ${esc(thaiDate(d.result?.test_date))}</span></div>`;
    if (!d.scores) {
      return [{ html: box(n, SECTIONS.holland, `${typeBox}<div class="empty" style="margin-top:6px">* ผลนี้บันทึกไว้ก่อนระบบเก็บคะแนนรายด้าน จึงยังไม่มีกราฟ (ให้นักเรียนทำแบบทดสอบใหม่เพื่อแสดงกราฟ)</div>`) }];
    }
    const max = Math.max(10, Math.ceil(Math.max(...RIASEC.map((c) => Number(d.scores[c]) || 0)) / 10) * 10);
    const bars = RIASEC.map((c) => {
      const v = Number(d.scores[c]) || 0;
      return `<div class="bar"><span class="lb"><b>${c}</b> ${RIASEC_TH[c]}</span><span class="tr"><span class="fl" style="display:block;width:${(v / max) * 100}%"></span></span><span class="nv">${v}</span></div>`;
    }).join("");
    return [{ html: box(n, SECTIONS.holland, `<div class="holland">${radarSvg(d.scores)}<div class="bars">${bars}<div style="font-size:17px;color:#6b7280;margin-top:4px">รหัส Holland: <b style="color:#831843">${ranked.slice(0, 3).map(([c]) => c).join("-")}</b></div></div></div>${typeBox}`) }];
  }
  if (key === "analysis") {
    const a = analysisOf(d);
    const cls = { สูง: "hi", ปานกลาง: "mid", ควรทบทวน: "lo" }[a.alignment.level] || "na";
    const ul = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    return [{
      html: box(n, SECTIONS.analysis, `<div class="an">
        <div class="sec s1"><h4>จุดเด่น</h4>${ul(a.strengths)}</div>
        <div class="sec s2"><h4>ความสอดคล้องกับเป้าหมาย</h4><div style="font-size:18.5px"><span class="lvl ${cls}">${esc(a.alignment.level)}</span>${esc(a.alignment.detail)}</div></div>
        <div class="sec s3"><h4>สิ่งที่ควรพัฒนา</h4>${ul(a.improve)}</div>
        <div class="sec s4"><h4>คำแนะนำจากครูแนะแนว</h4>${ul(a.advice)}</div>
      </div>`),
    }];
  }
  if (key === "submissions") {
    const w = d.work;
    const done = w.filter((x) => x.done).length;
    const late = w.filter((x) => x.late).length;
    const miss = w.filter((x) => x.overdue).length;
    const pcts = w.map((x) => x.scorePct).filter((x) => x != null);
    const avg = pcts.length ? `${Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length)}%` : "-";
    const stats = statBox([["งานทั้งหมด", w.length, ""], ["ส่งแล้ว", done, "g"], ["ส่งช้า", late, "a"], ["ไม่ส่ง (เลยกำหนด)", miss, "r"], ["คะแนนเฉลี่ย", avg, "p"]]);
    if (!w.length) return [{ html: box(n, SECTIONS.submissions, `${stats}<div class="empty">ยังไม่มีงานที่มอบหมาย</div>`) }];
    return [{
      head: `<div class="box"><div class="bh"><span class="n">${n}</span>${esc(SECTIONS.submissions)}</div><div class="bb">${stats}`,
      tail: `</div></div>`,
      thead: `<tr><th style="width:5%">#</th><th style="width:37%">งาน</th><th style="width:16%">กำหนดส่ง</th><th style="width:18%">ส่งเมื่อ</th><th style="width:13%" class="c">สถานะ</th><th style="width:11%" class="c">คะแนน</th></tr>`,
      rows: w.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${esc(x.title)}</td><td>${esc(thaiDate(x.deadline))}</td><td>${esc(x.submittedAt ? thaiDT(x.submittedAt) : "-")}</td><td class="c">${workTag(x)}</td><td class="c">${esc(x.score)}</td></tr>`),
    }];
  }
  if (key === "attendance") {
    const a = d.attendance;
    const pct = a.total ? `${Math.round(((a.present + a.late) / a.total) * 100)}%` : "-";
    const stats = statBox([["มาเรียน", `${a.present} ครั้ง`, "g"], ["สาย", `${a.late} ครั้ง`, "a"], ["ลา", `${a.leave} ครั้ง`, "b"], ["ขาด", `${a.absent} ครั้ง`, "r"], ["เข้าเรียน", pct, "p"]]);
    if (!a.records.length) return [{ html: box(n, SECTIONS.attendance, `${stats}<div class="empty">ยังไม่มีข้อมูลการเช็กชื่อ</div>`) }];
    return [{
      head: `<div class="box"><div class="bh"><span class="n">${n}</span>${esc(SECTIONS.attendance)}</div><div class="bb">${stats}`,
      tail: `</div></div>`,
      thead: `<tr><th style="width:7%">#</th><th style="width:26%">วันที่</th><th style="width:17%" class="c">สถานะ</th><th style="width:16%" class="c">เวลา</th><th style="width:14%">วิธี</th><th>หมายเหตุ</th></tr>`,
      rows: a.records.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(thaiDate(r.attendance_date))}</td><td class="c">${attTag(r.status)}</td><td class="c">${esc(r.checkin_time ? `${String(r.checkin_time).slice(0, 5)} น.` : "-")}</td><td>${esc(METHOD_TH[r.method] || "-")}</td><td>${esc(r.note || "-")}</td></tr>`),
    }];
  }
  return [];
};

const studentCard = (d, typeKey) => {
  const s = d.student;
  const initial = (s.fullname || "?").replace(/^(นางสาว|เด็กหญิง|เด็กชาย|นาย|นาง)\s*/, "").charAt(0);
  const chips = [];
  if (typeKey === "guidance" && d.type) chips.push(`กลุ่ม ${d.type.type_name}`);
  if (typeKey === "guidance" && d.goal?.faculty_name) chips.push(`เป้าหมาย: ${d.goal.faculty_name}`);
  return `<div class="card">
    <div class="photo">${d.avatarUrl ? `<img src="${d.avatarUrl}" />` : esc(initial)}</div>
    <div style="min-width:0">
      <div class="name">${esc(s.fullname)}</div>
      <div class="meta"><span>ชั้น <b>${esc(d.classLabel ? `ม.${d.classLabel}` : "-")}</b></span><span>เลขที่ <b>${esc(dash(s.seatNo))}</b></span><span>รหัสนักเรียน <b>${esc(dash(s.student_code))}</b></span>${d.fd.personal?.nickname ? `<span>ชื่อเล่น <b>${esc(d.fd.personal.nickname)}</b></span>` : ""}</div>
      ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}
    </div>
  </div>`;
};

const topBar = (title, right) => `<div class="top">
  <div class="l"><img src="${window.location.origin}/image/school-emblem.png" alt="" /><div><div class="school">โรงเรียนขอนแก่นวิทยายน • งานแนะแนว</div><div class="ttl">${esc(title)}</div></div></div>
  <div class="r">${right}</div></div>`;

// ---------- จัดหน้า ----------
const paginateStudents = (host, list, typeKey, sections) => {
  const title = REPORT_TYPES[typeKey].title;
  const pages = [];
  const contentLimit = H - PAD_TOP - FOOT;
  let current = null;

  const newPage = (d, cont) => {
    const page = document.createElement("div");
    page.className = "page";
    page.dataset.student = d.student.fullname;
    page.innerHTML = `<div class="content">${topBar(title, `ปีการศึกษา ${academicYear()}<br/>พิมพ์ ${esc(thaiDateTime())}`)}${cont ? `<div class="cont">${esc(d.student.fullname)} (ต่อ)</div>` : ""}</div>`;
    host.appendChild(page);
    pages.push(page);
    current = page.querySelector(".content");
    return current;
  };
  const fits = () => current.scrollHeight <= contentLimit;

  list.forEach((d) => {
    newPage(d, false);
    current.insertAdjacentHTML("beforeend", studentCard(d, typeKey));
    let n = 0;
    sections.forEach((key) => {
      n += 1;
      sectionBlocks(d, key, n).forEach((blk) => {
        if (blk.html) {
          current.insertAdjacentHTML("beforeend", blk.html);
          if (!fits() && current.children.length > 2) {
            current.lastElementChild.remove();
            newPage(d, true);
            current.insertAdjacentHTML("beforeend", blk.html);
          }
          return;
        }
        // ตารางยาว: ใส่ทีละแถว ล้นแล้วขึ้นหน้าใหม่พร้อมหัวตารางซ้ำ
        const start = () => {
          current.insertAdjacentHTML("beforeend", `${blk.head}<table><thead>${blk.thead}</thead><tbody></tbody></table>${blk.tail}`);
          return current.lastElementChild.querySelector("tbody");
        };
        let tbody = start();
        if (!fits() && current.children.length > 2) {
          current.lastElementChild.remove();
          newPage(d, true);
          tbody = start();
        }
        blk.rows.forEach((row) => {
          tbody.insertAdjacentHTML("beforeend", row);
          if (!fits() && tbody.children.length > 1) {
            tbody.lastElementChild.remove();
            newPage(d, true);
            tbody = start();
            tbody.insertAdjacentHTML("beforeend", row);
          }
        });
      });
    });
  });

  pages.forEach((p, i) =>
    p.insertAdjacentHTML("beforeend", `<div class="foot"><span>${esc(title)} • ${esc(p.dataset.student)}</span><span>หน้า ${i + 1}/${pages.length}</span></div>`)
  );
  return pages;
};

// ---------- สร้าง PDF + ภาพตัวอย่าง ----------
const renderPages = async (pages, onProgress) => {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const images = [];
  for (let i = 0; i < pages.length; i++) {
    const img = await toJpeg(pages[i], { quality: 0.88, pixelRatio: 2, backgroundColor: "#ffffff", width: W, height: H });
    images.push(img);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, 210, 297);
    onProgress?.((i + 1) / pages.length);
  }
  return { blob: pdf.output("blob"), images };
};

// โหลดรูปนักเรียนเป็น data URL ก่อน — รูปที่โหลดไม่ได้ (404/CORS) จะทำให้ html-to-image ล้มทั้งไฟล์ จึงใช้ตัวอักษรย่อแทน
const toDataUrl = async (url) => {
  try {
    const res = await fetch(resolveFileUrl(API_BASE_URL, url));
    if (!res.ok || !String(res.headers.get("content-type") || "").startsWith("image/")) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// list = ผลจาก loadReportData, sections = คีย์หัวข้อที่ครูเลือก (เรียงตาม SECTIONS)
export const buildIndividualReport = async (list, typeKey, sections, onProgress) => {
  ensureStyles();
  const host = document.createElement("div");
  host.className = "srp";
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${W}px;pointer-events:none`;
  document.body.appendChild(host);
  try {
    await Promise.race([
      Promise.all([document.fonts.load("400 20px 'TH Sarabun New'", "ก"), document.fonts.load("700 20px 'TH Sarabun New'", "ก")]),
      new Promise((r) => setTimeout(r, 5000)),
    ]).catch(() => null);
    const ordered = Object.keys(SECTIONS).filter((k) => sections.includes(k));
    const withPhotos = await Promise.all(list.map(async (d) => ({ ...d, avatarUrl: d.avatarUrl ? await toDataUrl(d.avatarUrl) : null })));
    const pages = paginateStudents(host, withPhotos, typeKey, ordered);
    await Promise.all([...host.querySelectorAll("img")].map((img) => (img.complete ? null : img.decode().catch(() => null))));
    return await renderPages(pages, onProgress);
  } finally {
    host.remove();
  }
};

export const saveReportPdf = (blob, filename) => downloadBlob(blob, filename);

// ---------- ตารางสรุปทั้งห้อง (แถวละคน) ----------
const pctText = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "-");

export const buildClassSummary = async (list, typeKey, roomText, onProgress) => {
  const t = REPORT_TYPES[typeKey];
  const base = { __no: 0 };
  const no = { label: "เลขที่", width: "7%", align: "center", get: (r) => r.d.student.seatNo ?? r.__no };
  const name = { label: "ชื่อ-นามสกุล", width: "27%", get: (r) => r.d.student.fullname };
  const rows = list.map((d, i) => ({ ...base, __no: i + 1, d }));
  let columns;
  let summary;
  let orientation = "portrait";

  if (typeKey === "guidance") {
    orientation = "landscape";
    const levels = list.map((d) => goalAlignment(d).level);
    columns = [
      no,
      { ...name, width: "22%" },
      { label: "เป้าหมาย / คณะที่อยากเข้า", width: "29%", get: (r) => [r.d.goal?.faculty_name, r.d.goal?.goal_text].filter(Boolean).join(" • ") || "-" },
      { label: "RIASEC", width: "10%", align: "center", get: (r) => riasecCode(r.d) },
      { label: "กลุ่มเด่น", width: "16%", get: (r) => r.d.type?.type_name || (rankRiasec(r.d)[0] ? RIASEC_TH[rankRiasec(r.d)[0][0]] : "ยังไม่ได้ทำ") },
      { label: "ความสอดคล้อง", width: "16%", align: "center", get: (r) => goalAlignment(r.d).level },
    ];
    summary = [
      { label: "นักเรียน", value: list.length, tone: "gray" },
      { label: "มีเป้าหมายแล้ว", value: list.filter((d) => d.goal).length, tone: "blue" },
      { label: "ทำ Holland แล้ว", value: list.filter((d) => d.result).length },
      { label: "สอดคล้องสูง", value: levels.filter((l) => l === "สูง").length, tone: "green" },
      { label: "ควรทบทวน", value: levels.filter((l) => l === "ควรทบทวน").length, tone: "red" },
    ];
  } else if (typeKey === "submissions") {
    const st = (d) => {
      const w = d.work;
      const pcts = w.map((x) => x.scorePct).filter((x) => x != null);
      return {
        total: w.length,
        done: w.filter((x) => x.done).length,
        onTime: w.filter((x) => x.done && !x.late).length,
        late: w.filter((x) => x.late).length,
        miss: w.filter((x) => !x.done).length,
        avg: pcts.length ? `${Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)}%` : "-",
      };
    };
    columns = [
      no, name,
      { label: "มอบหมาย", width: "11%", align: "center", get: (r) => st(r.d).total },
      { label: "ส่งแล้ว", width: "10%", align: "center", get: (r) => st(r.d).done },
      { label: "ตรงเวลา", width: "10%", align: "center", get: (r) => st(r.d).onTime },
      { label: "ส่งช้า", width: "9%", align: "center", get: (r) => st(r.d).late },
      { label: "ยังไม่ส่ง", width: "11%", align: "center", get: (r) => st(r.d).miss },
      { label: "คะแนนเฉลี่ย", width: "15%", align: "center", get: (r) => st(r.d).avg },
    ];
    const all = list.map(st);
    const sum = (k) => all.reduce((a, x) => a + x[k], 0);
    summary = [
      { label: "นักเรียน", value: list.length, tone: "gray" },
      { label: "ส่งครบทุกงาน", value: all.filter((x) => x.total && x.miss === 0).length, tone: "green" },
      { label: "ส่งช้า (ครั้ง)", value: sum("late"), tone: "amber" },
      { label: "ค้างส่ง (ครั้ง)", value: sum("miss"), tone: "red" },
      { label: "อัตราการส่ง", value: pctText(sum("done"), sum("total")) },
    ];
  } else {
    columns = [
      no, name,
      { label: "มา", width: "10%", align: "center", get: (r) => r.d.attendance.present },
      { label: "สาย", width: "10%", align: "center", get: (r) => r.d.attendance.late },
      { label: "ลา", width: "10%", align: "center", get: (r) => r.d.attendance.leave },
      { label: "ขาด", width: "10%", align: "center", get: (r) => r.d.attendance.absent },
      { label: "รวม (ครั้ง)", width: "12%", align: "center", get: (r) => r.d.attendance.total },
      { label: "% เข้าเรียน", width: "14%", align: "center", get: (r) => pctText(r.d.attendance.present + r.d.attendance.late, r.d.attendance.total) },
    ];
    const sum = (k) => list.reduce((a, d) => a + d.attendance[k], 0);
    summary = [
      { label: "นักเรียน", value: list.length, tone: "gray" },
      { label: "มา", value: sum("present"), tone: "green" },
      { label: "สาย", value: sum("late"), tone: "amber" },
      { label: "ลา", value: sum("leave"), tone: "blue" },
      { label: "ขาด", value: sum("absent"), tone: "red" },
    ];
  }

  return exportReportPdf(
    {
      title: t.classTitle,
      subtitle: `ห้อง ${roomText} • ${list.length} คน • ปีการศึกษา ${academicYear()}`,
      info: [["ห้อง", roomText], ["จำนวนนักเรียน", `${list.length} คน`], ["พิมพ์เมื่อ", thaiDateTime()]],
      summary,
      table: { columns, rows },
      orientation,
      emptyText: "ไม่มีนักเรียน",
      returnImages: true,
    },
    onProgress
  );
};

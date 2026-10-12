// เติมลิงก์หลักสูตร myTCAS ให้สาขาในไฟล์ข้อมูลคณะที่ยังไม่มีลิงก์อ้างอิง
// ค้นจาก courses.json ของ myTCAS: มหาวิทยาลัยตัวอย่างของสาขา (คอลัมน์ "มหาวิทยาลัยตัวอย่าง") + คำค้นชื่อสาขาด้านล่าง
// ผลลัพธ์: Rm/src/data/mytcas-links.json — riasec-xlsx-to-json.cjs นำไปรวมให้สาขาที่ไม่มีลิงก์ในไฟล์ Excel
// ใช้: node scripts/mytcas-links.mjs
import fs from "node:fs";
import zlib from "node:zlib";
import https from "node:https";
import { fullUniName } from "../Rm/src/utils/goals.js";

const get = (url) =>
  new Promise((resolve, reject) =>
    https
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve(JSON.parse((buf[0] === 0x1f ? zlib.gunzipSync(buf) : buf).toString("utf8")));
        });
      })
      .on("error", reject)
  );

// คำค้นของแต่ละสาขา (ทดสอบกับชื่อสาขาวิชา/ชื่อหลักสูตรใน myTCAS) — ไม่มีในรายการ = ใช้ชื่อสาขาก่อนวงเล็บ
const TERMS = {
  "วิศวกรรมโยธา": /วิศวกรรมโยธา/,
  "วิศวกรรมเครื่องกล": /วิศวกรรมเครื่องกล/,
  "วิศวกรรมไฟฟ้า": /วิศวกรรมไฟฟ้า(?!สื่อสาร)/,
  "วิศวกรรมอุตสาหการ": /วิศวกรรมอุตสาหการ/,
  "เกษตรศาสตร์": /สาขาวิชาเกษตรศาสตร์|เกษตรศาสตรบัณฑิต/,
  "สัตวแพทยศาสตร์": /สัตวแพทยศาสตรบัณฑิต/,
  "ประมง": /ประมง/,
  "วนศาสตร์": /วนศาสตร์/,
  "เทคโนโลยีการบิน": /การบิน/,
  "วิทยาศาสตร์การกีฬา": /วิทยาศาสตร์การกีฬา/,
  "แพทยศาสตร์": /(?<!ทันต|สัตว)แพทยศาสตรบัณฑิต/,
  "ทันตแพทยศาสตร์": /ทันตแพทยศาสตรบัณฑิต/,
  "เภสัชศาสตร์": /เภสัชศาสตรบัณฑิต/,
  "วิทยาศาสตร์ (เคมี)": /สาขาวิชาเคมี$|สาขาวิชาเคมี\s/,
  "วิทยาศาสตร์ (ชีววิทยา)": /สาขาวิชาชีววิทยา$|สาขาวิชาชีววิทยา\s/,
  "วิทยาการคอมพิวเตอร์": /วิทยาการคอมพิวเตอร์/,
  "เทคนิคการแพทย์": /เทคนิคการแพทย์/,
  "สาธารณสุขศาสตร์": /สาธารณสุขศาสตรบัณฑิต|สาขาวิชาสาธารณสุขศาสตร์/,
  "คณิตศาสตร์/สถิติ": /สาขาวิชาคณิตศาสตร์$|สาขาวิชาคณิตศาสตร์\s|สาขาวิชาสถิติ$/,
  "ศิลปกรรมศาสตร์ (ทัศนศิลป์)": /ทัศนศิลป์|จิตรกรรม/,
  "สถาปัตยกรรมศาสตร์": /^(?!.*(ภูมิ|ภายใน|ไทย)).*สถาปัตยกรรม/,
  "มัณฑนศิลป์": /มัณฑนศิลป์|ศิลปะการออกแบบภายใน/,
  "นิเทศศาสตร์ (โฆษณา/ภาพยนตร์)": /นิเทศศาสตร์|การภาพยนตร์|โฆษณา/,
  "ดุริยางคศาสตร์": /ดุริยางค|ดนตรี/,
  "การออกแบบแฟชั่น": /แฟชั่น/,
  "การออกแบบผลิตภัณฑ์": /ออกแบบผลิตภัณฑ์/,
  "อักษรศาสตร์/มนุษยศาสตร์ (วรรณกรรม)": /อักษรศาสตรบัณฑิต|ภาษาและวรรณคดีไทย|วรรณคดี|วรรณกรรม/,
  "ภาพยนตร์และสื่อดิจิทัล": /ภาพยนตร์|สื่อดิจิทัล|แอนิเมชัน/,
  "ครุศาสตร์/ศึกษาศาสตร์": /^(?!.*(พลศึกษา|ศิลปศึกษา)).*(ครุศาสตรบัณฑิต|ศึกษาศาสตรบัณฑิต)/,
  "พยาบาลศาสตร์": /พยาบาลศาสตรบัณฑิต/,
  "จิตวิทยา": /จิตวิทยา/,
  "สังคมสงเคราะห์ศาสตร์": /สังคมสงเคราะห์/,
  "กายภาพบำบัด": /กายภาพบำบัด/,
  "สาธารณสุขศาสตร์ (สายชุมชน)": /สาธารณสุขชุมชน|สาธารณสุขศาสตร์/,
  "การศึกษาปฐมวัย": /ปฐมวัย/,
  "กิจกรรมบำบัด": /กิจกรรมบำบัด/,
  "บริหารธุรกิจ (การตลาด)": /การตลาด/,
  "บริหารธุรกิจ (การจัดการ)": /^(?!.*ระหว่างประเทศ).*(บริหารธุรกิจบัณฑิต.*การจัดการ|สาขาวิชาการจัดการ$)/,
  "นิติศาสตร์": /นิติศาสตรบัณฑิต/,
  "รัฐศาสตร์": /รัฐศาสตรบัณฑิต|สาขาวิชารัฐศาสตร์/,
  "เศรษฐศาสตร์ (นโยบาย)": /เศรษฐศาสตรบัณฑิต|สาขาวิชาเศรษฐศาสตร์/,
  "การจัดการโรงแรม/การท่องเที่ยว": /โรงแรม|การท่องเที่ยว/,
  "นิเทศศาสตร์ (PR/โฆษณา)": /ประชาสัมพันธ์|โฆษณา|นิเทศศาสตร์/,
  "ธุรกิจระหว่างประเทศ": /ธุรกิจระหว่างประเทศ/,
  "บัญชี": /บัญชีบัณฑิต|สาขาวิชาการบัญชี/,
  "การเงิน/การธนาคาร": /การเงิน/,
  "เศรษฐศาสตร์ (วิเคราะห์)": /เศรษฐศาสตรบัณฑิต|สาขาวิชาเศรษฐศาสตร์/,
  "สถิติประยุกต์": /สถิติ/,
  "รัฐประศาสนศาสตร์": /รัฐประศาสนศาสตร์/,
  "ระบบสารสนเทศทางธุรกิจ": /ระบบสารสนเทศ/,
  "การจัดการโลจิสติกส์": /โลจิสติกส์/,
};

const riasec = JSON.parse(fs.readFileSync(new URL("../Rm/src/data/riasec.json", import.meta.url), "utf8"));
const courses = await get("https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json");
const linkOf = (c) => `https://course.mytcas.com/universities/${c.university_id}/faculties/${c.faculty_id}/fields/${c.group_field_id}_${c.field_id}`;
const SHORT = Object.fromEntries(riasec.faculties.flatMap((f) => f.universities).map((u) => [fullUniName(u), u]));

const out = {};
const report = [];
riasec.faculties
  // ยังไม่มีลิงก์จาก Excel (หรือมีแต่ลิงก์ที่สคริปต์นี้เติมไว้ครั้งก่อน)
  .filter((f) => !f.links.length || f.linkSource === "mytcas-auto")
  .forEach((f) => {
    const re = TERMS[f.name] || new RegExp(f.name.split(" (")[0]);
    const programs = [];
    const links = [];
    f.universities.forEach((u) => {
      const full = fullUniName(u);
      const hit = courses
        .filter((c) => c.university_name_th.trim() === full && re.test(`${c.field_name_th} ${c.program_name_th}`.trim()))
        // ภาษาไทยปกติก่อน หลักสูตรนานาชาติ/พิเศษไว้หลัง
        .sort((a, b) => (a.program_type_id === "A" ? 0 : 1) - (b.program_type_id === "A" ? 0 : 1))[0];
      if (!hit) return;
      programs.push(`${SHORT[full] || u}: ${hit.program_name_th.trim()}`);
      links.push(linkOf(hit));
    });
    report.push(`${f.name}: ${links.length}/${f.universities.length}${programs.length ? " — " + programs.join(" | ") : ""}`);
    if (links.length) out[f.name] = { programs, links };
  });

const dest = new URL("../Rm/src/data/mytcas-links.json", import.meta.url);
fs.writeFileSync(dest, JSON.stringify({ source: "myTCAS courses.json", fetchedAt: new Date().toISOString().slice(0, 10), faculties: out }, null, 1) + "\n");
console.log(report.join("\n"));
console.log(`\nเติมลิงก์ได้ ${Object.keys(out).length} สาขา`);

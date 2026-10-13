// เติมลิงก์หลักสูตร myTCAS ให้สาขาในไฟล์ข้อมูลคณะที่ยังไม่มีลิงก์อ้างอิง
// ค้นจาก courses.json ของ myTCAS: มหาวิทยาลัยตัวอย่างของสาขา (คอลัมน์ "มหาวิทยาลัยตัวอย่าง") + คำค้นชื่อสาขาด้านล่าง
// ผลลัพธ์: Rm/src/data/mytcas-links.json — riasec-xlsx-to-json.cjs นำไปรวมให้สาขาที่ไม่มีลิงก์ในไฟล์ Excel
//        Rm/src/data/mytcas-programs.json — ดัชนีหลักสูตรทุกมหาวิทยาลัย (หน้าเว็บใช้ดึงเกณฑ์รับเข้าจริงของหลักสูตรที่นักเรียนเลือก)
//        Rm/src/data/mytcas-score-labels.json — ชื่อวิชา/คะแนนที่ใช้ในเกณฑ์รับเข้า
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
  "มัณฑนศิลป์": /คณะมัณฑนศิลป์|ศิลปะการออกแบบภายใน/,
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
  // สาขาที่ Excel มีลิงก์แล้ว — ใช้ทำดัชนีหลักสูตรทุกมหาวิทยาลัย (รหัสกลุ่มสาขาของ myTCAS กว้างเกินไป จึงต้องค้นด้วยชื่อ)
  "การออกแบบอุตสาหกรรม": /ออกแบบอุตสาหกรรม/,
  "รังสีเทคนิค": /รังสีเทคนิค/,
  "การจัดการเทคโนโลยี": /การจัดการเทคโนโลยี/,
  "เทคโนโลยีสารสนเทศ": /เทคโนโลยีสารสนเทศ/,
  "ศิลปศึกษา": /ศิลปศึกษา/,
  "สถาปัตยกรรมภายใน": /สถาปัตยกรรมภายใน/,
  "พลศึกษา": /พลศึกษา/,
  "วิศวกรรมความปลอดภัย": /วิศวกรรมความปลอดภัย|ความปลอดภัย/,
  "การจัดการสิ่งแวดล้อม": /สิ่งแวดล้อม/,
  "ปฏิบัติการฉุกเฉินการแพทย์": /ฉุกเฉินการแพทย์/,
  "การจัดการธุรกิจอาหาร": /ธุรกิจอาหาร|การจัดการ.*อาหาร|อาหาร.*การจัดการ/,
  "การจัดการอุตสาหกรรม": /การจัดการอุตสาหกรรม/,
  "วิศวกรรมคอมพิวเตอร์": /วิศวกรรมคอมพิวเตอร์/,
  "อัญมณีและเครื่องประดับ": /อัญมณี|เครื่องประดับ/,
  "เทคโนโลยีการพิมพ์": /การพิมพ์/,
  "อาชีวอนามัยและความปลอดภัย": /อาชีวอนามัย/,
  "วิศวกรรมชีวการแพทย์": /วิศวกรรมชีวการแพทย์/,
  "วิศวกรรมสื่อดิจิทัล": /วิศวกรรมสื่อดิจิทัล|วิศวกรรมมัลติมีเดีย/,
  "นวัตกรรมสังคม": /นวัตกรรมสังคม/,
  "การออกแบบดิจิทัลและอินเทอร์แอคทีฟ": /อินเทอร์แอคทีฟ|อินเตอร์แอคทีฟ|ประสบการณ์ผู้ใช้|UX/,
  "วิทยาการข้อมูล": /วิทยาการข้อมูล|วิทยาศาสตร์ข้อมูล/,
  "สังคมวิทยาและมานุษยวิทยา": /สังคมวิทยา|มานุษยวิทยา/,
  "โภชนาการและการกำหนดอาหาร": /โภชนา|กำหนดอาหาร/,
  "อักษรศาสตร์ (ภาษาศาสตร์)": /ภาษาศาสตร์/,
  "สารสนเทศศาสตร์": /สารสนเทศศาสตร์|บรรณารักษ/,
  "เวชระเบียนและสารสนเทศสุขภาพ": /เวชระเบียน|เวชสารสนเทศ|สารสนเทศสุขภาพ/,
  "นาฏศิลป์และการละคร": /นาฏศิลป์|การละคร|ศิลปะการแสดง/,
  "การออกแบบกราฟิก": /กราฟิก|นิเทศศิลป์/,
  "ดิจิทัลเกม": /เกม/,
  "การจัดการอีเวนต์": /อีเวนต์|การจัดงาน|ไมซ์|MICE/,
  "วารสารศาสตร์": /วารสารศาสตร์|หนังสือพิมพ์|ข่าว/,
  "การตลาด (สายสร้างสรรค์)": /การตลาด/,
  "การจัดการอุตสาหกรรมสร้างสรรค์": /อุตสาหกรรมสร้างสรรค์|ธุรกิจสร้างสรรค์/,
  "เทคโนโลยีการศึกษา": /เทคโนโลยีการศึกษา|เทคโนโลยีและสื่อสารการศึกษา/,
  "พัฒนาสังคม": /พัฒนาสังคม|พัฒนาชุมชน/,
  "การจัดการภัยพิบัติ": /ภัยพิบัติ|สาธารณภัย/,
  "การจัดการทรัพยากรมนุษย์": /ทรัพยากรมนุษย์/,
  "การจัดการธุรกิจบันเทิง": /บันเทิง/,
  "ภาษาและการสื่อสาร": /ภาษา.*การสื่อสาร|การสื่อสาร.*ภาษา/,
};

// สาขาที่คำค้นได้หลายหลักสูตรในคณะเดียว → หลักสูตรที่ใช้เป็นลิงก์ตัวอย่าง
const PREFER = { "มัณฑนศิลป์": /ภายใน/ };

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
        .filter((c) => c.university_name_th.trim() === full && re.test(`${c.field_name_th} ${c.program_name_th}${re.source.includes("คณะ") ? ` ${c.faculty_name_th}` : ""}`.trim()))
        // ภาษาไทยปกติก่อน หลักสูตรนานาชาติ/พิเศษไว้หลัง
        .sort(
          (a, b) =>
            (PREFER[f.name] ? (PREFER[f.name].test(a.program_name_th) ? 0 : 1) - (PREFER[f.name].test(b.program_name_th) ? 0 : 1) : 0) ||
            (a.program_type_id === "A" ? 0 : 1) - (b.program_type_id === "A" ? 0 : 1)
        )[0];
      if (!hit) return;
      programs.push(`${SHORT[full] || u}: ${hit.program_name_th.trim()}`);
      links.push(linkOf(hit));
    });
    report.push(`${f.name}: ${links.length}/${f.universities.length}${programs.length ? " — " + programs.join(" | ") : ""}`);
    if (links.length) out[f.name] = { programs, links };
  });

// ดัชนีหลักสูตรของทุกมหาวิทยาลัยต่อสาขา → หน้าเว็บใช้หาหลักสูตรของมหาวิทยาลัยที่นักเรียนเลือก แล้วดึงเกณฑ์รับเข้าจริง (rounds/{program_id}.json) จาก myTCAS
// รูปแบบ: universities = [ชื่อ], faculties[สาขา] = [[ลำดับมหาวิทยาลัย, program_id, ชื่อหลักสูตร, ประเภทหลักสูตร, วิทยาเขต]]
const uniNames = [];
const uniIdx = (n) => (uniNames.includes(n) ? uniNames.indexOf(n) : uniNames.push(n) - 1);
const index = {};
riasec.faculties.forEach((f) => {
  const re = TERMS[f.name];
  if (!re) return;
  const list = courses
    // คำค้นที่ขึ้นต้นด้วย "คณะ" ค้นจากชื่อคณะด้วย (เช่น คณะมัณฑนศิลป์ ที่ชื่อหลักสูตรเป็น "การออกแบบภายใน")
    .filter((c) => re.test(`${c.field_name_th} ${c.program_name_th}${re.source.includes("คณะ") ? ` ${c.faculty_name_th}` : ""}`.trim()))
    .map((c) => [uniIdx(c.university_name_th.trim()), c.program_id, c.program_name_th.trim(), c.program_type_name_th.trim() === "ภาษาไทย ปกติ" ? "" : c.program_type_name_th.trim(), c.campus_name_th.trim() === "วิทยาเขตหลัก" ? "" : c.campus_name_th.trim()]);
  if (list.length) index[f.name] = list;
});
const noIndex = riasec.faculties.filter((f) => !index[f.name]).map((f) => f.name);
fs.writeFileSync(
  new URL("../Rm/src/data/mytcas-programs.json", import.meta.url),
  JSON.stringify({ source: "myTCAS courses.json (ทปอ.)", fetchedAt: new Date().toISOString().slice(0, 10), universities: uniNames, faculties: index }) + "\n"
);
console.log(`ดัชนีหลักสูตร: ${Object.keys(index).length} สาขา, ${Object.values(index).reduce((a, l) => a + l.length, 0)} หลักสูตร${noIndex.length ? " | ไม่มีหลักสูตร: " + noIndex.join(", ") : ""}`);

// ชื่อวิชา/คะแนนที่ใช้ในเกณฑ์รับเข้า (เช่น a_lv_61 = A-Level คณิตศาสตร์ประยุกต์ 1) — ดึงจากตารางที่เว็บ course.mytcas.com ใช้เอง
const home = await new Promise((resolve, reject) =>
  https.get("https://course.mytcas.com/", (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(b)); }).on("error", reject)
);
const mainSrc = home.match(/src="(\/static\/js\/main\.[^"]+\.js)"/)?.[1];
const mainJs = await new Promise((resolve, reject) =>
  https.get(`https://course.mytcas.com${mainSrc}`, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(b)); }).on("error", reject)
);
const labels = {};
const unq = (t) => JSON.parse(`"${t.replace(/\\'/g, "'")}"`);
for (const m of mainJs.matchAll(/\{"key":"([a-z_0-9]+)","max_value":([0-9.]+),"label":"((?:[^"\\]|\\.)*)","short_label":"((?:[^"\\]|\\.)*)"\}/g)) {
  labels[m[1]] = { max: Number(m[2]), label: unq(m[3]), short: unq(m[4]) };
}
if (Object.keys(labels).length < 50) throw new Error("อ่านตารางชื่อวิชาจาก myTCAS ไม่ได้ — โครงสร้างเว็บอาจเปลี่ยน");
fs.writeFileSync(new URL("../Rm/src/data/mytcas-score-labels.json", import.meta.url), JSON.stringify({ source: `course.mytcas.com ${mainSrc}`, labels }) + "\n");
console.log(`ชื่อวิชา/คะแนน: ${Object.keys(labels).length} รายการ`);

const dest = new URL("../Rm/src/data/mytcas-links.json", import.meta.url);
fs.writeFileSync(dest, JSON.stringify({ source: "myTCAS courses.json", fetchedAt: new Date().toISOString().slice(0, 10), faculties: out }, null, 1) + "\n");
console.log(report.join("\n"));
console.log(`\nเติมลิงก์ได้ ${Object.keys(out).length} สาขา`);

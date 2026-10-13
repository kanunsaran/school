// ตรวจข้อมูลสาขาใน Rm/src/data/riasec.json กับข้อมูลต้นทาง myTCAS (ทปอ.)
// - ลิงก์หลักสูตรต้องชี้ไปมหาวิทยาลัย/คณะ/สาขาที่มีอยู่จริงใน courses.json และชื่อหลักสูตรต้องตรงกับที่ประกาศ
// - ชื่อมหาวิทยาลัยตัวอย่างต้องมีในรายชื่อมหาวิทยาลัยของ myTCAS
// ใช้: node scripts/verify-riasec-data.mjs   (ออก exit code 1 ถ้าพบปัญหา)
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

const data = JSON.parse(fs.readFileSync(new URL("../Rm/src/data/riasec.json", import.meta.url), "utf8"));
const courses = await get("https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json");
const unis = new Set((await get("https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/universities.json")).map((u) => u.university_name.trim()));
const norm = (s) => String(s).replace(/\s+/g, "").trim();

const problems = [];
const notes = [];
let linkCount = 0;
data.faculties.forEach((f) => {
  f.universities.forEach((u) => {
    // บางสถาบันรับสมัครเองนอกระบบ TCAS (เช่น สถาบันการบินพลเรือน) — เป็นข้อสังเกต ไม่ใช่ข้อมูลผิด
    if (!unis.has(fullUniName(u))) notes.push(`[มหาวิทยาลัย] ${f.name}: "${u}" ไม่อยู่ในระบบ TCAS (ตรวจการรับสมัครที่เว็บสถาบันโดยตรง)`);
  });
  f.links.forEach((link, i) => {
    linkCount++;
    const m = link.match(/universities\/(\d+)\/faculties\/(\d+)\/fields\/(\d+)_(\d+)/);
    if (!m) return problems.push(`[ลิงก์] ${f.name}: รูปแบบลิงก์ไม่ถูกต้อง ${link}`);
    const [, uid, fid, gid, fld] = m;
    const hits = courses.filter((c) => c.university_id === uid && c.faculty_id === fid && c.group_field_id === gid && c.field_id === fld);
    if (!hits.length) return problems.push(`[ลิงก์] ${f.name}: ไม่พบหลักสูตรที่ ${link}`);
    const prog = f.programs[i];
    if (!prog) return problems.push(`[ชื่อหลักสูตร] ${f.name}: ลิงก์ที่ ${i + 1} ไม่มีชื่อหลักสูตรคู่กัน`);
    const [uniShort, ...rest] = prog.split(":");
    const name = rest.join(":").trim();
    if (fullUniName(uniShort) !== hits[0].university_name_th.trim()) problems.push(`[ชื่อหลักสูตร] ${f.name}: "${uniShort}" ไม่ตรงกับมหาวิทยาลัยของลิงก์ (${hits[0].university_name_th.trim()})`);
    const official = hits.find((c) => norm(name).startsWith(norm(c.program_name_th)));
    // ชื่อใน Excel = ชื่อหลักสูตรที่ประกาศ + "(วิชาเอก …)" → หลักสูตรถูกต้อง แต่วิชาเอกไม่ได้อยู่ในข้อมูล myTCAS
    if (official && norm(name) !== norm(official.program_name_th)) notes.push(`[ชื่อหลักสูตร] ${f.name}: "${name}" — myTCAS ประกาศชื่อ "${official.program_name_th.trim()}" (ส่วนวิชาเอกมาจากไฟล์ Excel)`);
    else if (!official) problems.push(`[ชื่อหลักสูตร] ${f.name}: "${name}" ไม่ตรงกับชื่อที่ประกาศ (${hits.map((c) => c.program_name_th.trim()).slice(0, 2).join(" / ")})`);
  });
});
console.log(`ตรวจ ${data.faculties.length} สาขา, ${linkCount} ลิงก์, มหาวิทยาลัยตัวอย่าง ${data.faculties.reduce((a, f) => a + f.universities.length, 0)} รายการ`);
console.log(problems.length ? problems.join("\n") : "ไม่พบข้อมูลที่ไม่ตรงกับต้นทาง ✓");
if (notes.length) console.log(`\nข้อสังเกต (${notes.length}):\n${notes.join("\n")}`);
// บันทึกวันที่ตรวจไว้ใน data-sources.json (หน้าเว็บแสดงให้ครู/นักเรียนตรวจย้อนกลับได้) — เฉพาะเมื่อไม่พบปัญหา
if (!problems.length) {
  const srcPath = new URL("../Rm/src/data/data-sources.json", import.meta.url);
  const src = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  src.sources.forEach((s) => {
    if (s.id === "mytcas") Object.assign(s, { checkedAt: today, checked: `${linkCount} ลิงก์หลักสูตร ตรงกับ courses.json` });
  });
  fs.writeFileSync(srcPath, JSON.stringify(src, null, 1) + "\n");
}
process.exitCode = problems.length ? 1 : 0;

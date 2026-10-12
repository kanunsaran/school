// แปลงไฟล์ RIASEC-ข้อมูลคำแนะนำ (ปรับปรุง).xlsx → Rm/src/data/riasec.json (ฐานข้อมูลหน้าผลแบบทดสอบ)
// ใช้: node scripts/riasec-xlsx-to-json.cjs "<path ไฟล์ xlsx>"
const path = require('path');
const fs = require('fs');
const XLSX = require(path.join(__dirname, '../Rm/node_modules/xlsx'));

const src = process.argv[2];
if (!src) { console.error('ระบุ path ไฟล์ xlsx'); process.exit(1); }
const wb = XLSX.readFile(src);
const sheet = (n) => {
  if (!wb.Sheets[n]) throw new Error(`ไม่พบชีต "${n}"`);
  return XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' });
};
const list = (s) => String(s || '').split(/,\s*/).map((x) => x.trim()).filter(Boolean);
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

const dimensions = {};
sheet('คู่มือมิติ RIASEC').forEach((r) => {
  const full = r['ชื่อเต็ม'];
  const m = full.match(/^(\w+)\s*\((.+)\)$/);
  dimensions[r['มิติ']] = { code: r['มิติ'], nameEn: m ? m[1] : full, nameTh: m ? m[2] : full, traits: r['ลักษณะเด่น'] };
});

const faculties = sheet('คณะ-อาชีพ-คำแนะนำ').map((r) => ({
  name: r['คณะ/สาขา'],
  dim: r['มิติ'],
  universities: list(r['มหาวิทยาลัยตัวอย่าง']).filter((u) => !u.startsWith('-')),
  careers: list(r['อาชีพที่เกี่ยวข้อง']),
  skills: r['ทักษะที่ควรพัฒนา'],
  advice: r['คำแนะนำสำหรับนักเรียน'],
  track: r['สายการเรียนที่แนะนำ'],
  traits: r['ลักษณะ/คุณลักษณะที่คณะต้องการ'],
  subjects: list(r['วิชาที่ควรเน้น']),
  exam: r['สิ่งที่ควรเตรียมสอบ'],
  programs: lines(r['หลักสูตรที่พบ (myTCAS)']).filter((x) => x !== '-'),
  links: lines(r['ลิงก์อ้างอิง']).filter((x) => /^https?:\/\//.test(x)),
}));

const codes = {};
sheet('รหัสผสม 3 ตัวอักษร').forEach((r) => {
  codes[r['รหัส']] = { meaning: r['ความหมายโดยสรุป'], faculties: list(r['คณะที่แนะนำ']), careers: list(r['อาชีพตัวอย่าง']) };
});

const aliases = {};
sheet('ชื่อคณะที่เทียบเท่า').forEach((r) => { aliases[r['ชื่อในชีตรหัส']] = r['ใช้ข้อมูลจากคณะ/สาขา'].split(' / ').map((x) => x.trim()); });

// ตรวจความครบถ้วน: ทุกคณะที่รหัสแนะนำต้องเปิดหาในชีตคณะได้
const names = new Set(faculties.map((f) => f.name));
const problems = [];
Object.entries(aliases).forEach(([k, v]) => v.forEach((x) => { if (!names.has(x)) problems.push(`ชื่อเทียบเท่า ${k} → ${x} ไม่มีในชีตคณะ`); }));
Object.entries(codes).forEach(([c, v]) => v.faculties.forEach((n) => { if (!names.has(n) && !aliases[n]) problems.push(`${c}: ไม่พบคณะ ${n}`); }));
if (Object.keys(codes).length !== 120) problems.push(`จำนวนรหัส ${Object.keys(codes).length} (ต้องเป็น 120)`);
if (Object.keys(dimensions).length !== 6) problems.push('จำนวนมิติต้องเป็น 6');
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const sources = sheet('แหล่งอ้างอิงข้อมูล').map((r) => ({ name: r['แหล่งข้อมูล'], use: r['ใช้สำหรับ'], note: r['หมายเหตุ'] }));
const out = { source: path.basename(src), dimensions, codes, faculties, aliases, sources };
const dest = path.join(__dirname, '../Rm/src/data/riasec.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
console.log(`เขียน ${dest}: มิติ ${Object.keys(dimensions).length}, รหัส ${Object.keys(codes).length}, คณะ ${faculties.length}, ชื่อเทียบเท่า ${Object.keys(aliases).length}`);

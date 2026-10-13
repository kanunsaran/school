// ดึงข้อมูลอาชีพตัวแทนของแต่ละสาขาจาก O*NET OnLine (กระทรวงแรงงานสหรัฐฯ) → Rm/src/data/onet-faculties.json
// ใช้แสดง "ความรู้หลักของงาน" และรหัสความสนใจ (RIASEC) ที่ O*NET กำหนดให้อาชีพนั้น เพื่อเทียบกับข้อมูลแนะแนวของโรงเรียน
// การจับคู่สาขา → อาชีพ O*NET ทำด้วยมือ (ด้านล่าง) และสคริปต์ตรวจว่าชื่ออาชีพในหน้า O*NET ตรงกับที่ตั้งใจ
// สาขาที่ไม่มีอาชีพเทียบได้ชัดเจน = ไม่ใส่ (หน้าเว็บจะไม่แสดงข้อมูล O*NET)
// ใช้: node scripts/onet-faculties.mjs
import fs from "node:fs";
import https from "node:https";

const MAP = {
  "วิศวกรรมโยธา": ["17-2051.00", "Civil Engineers"],
  "วิศวกรรมเครื่องกล": ["17-2141.00", "Mechanical Engineers"],
  "วิศวกรรมไฟฟ้า": ["17-2071.00", "Electrical Engineers"],
  "วิศวกรรมอุตสาหการ": ["17-2112.00", "Industrial Engineers"],
  "เกษตรศาสตร์": ["19-1013.00", "Soil and Plant Scientists"],
  "สัตวแพทยศาสตร์": ["29-1131.00", "Veterinarians"],
  "ประมง": ["19-1023.00", "Zoologists and Wildlife Biologists"],
  "วนศาสตร์": ["19-1032.00", "Foresters"],
  "เทคโนโลยีการบิน": ["53-2011.00", "Airline Pilots, Copilots, and Flight Engineers"],
  "วิทยาศาสตร์การกีฬา": ["29-1128.00", "Exercise Physiologists"],
  "แพทยศาสตร์": ["29-1215.00", "Family Medicine Physicians"],
  "ทันตแพทยศาสตร์": ["29-1021.00", "Dentists, General"],
  "เภสัชศาสตร์": ["29-1051.00", "Pharmacists"],
  "วิทยาศาสตร์ (เคมี)": ["19-2031.00", "Chemists"],
  "วิทยาศาสตร์ (ชีววิทยา)": ["19-1029.04", "Biologists"],
  "วิทยาการคอมพิวเตอร์": ["15-1252.00", "Software Developers"],
  "เทคนิคการแพทย์": ["29-2011.00", "Medical and Clinical Laboratory Technologists"],
  "สาธารณสุขศาสตร์": ["19-1041.00", "Epidemiologists"],
  "คณิตศาสตร์/สถิติ": ["15-2041.00", "Statisticians"],
  "ศิลปกรรมศาสตร์ (ทัศนศิลป์)": ["27-1013.00", "Fine Artists, Including Painters, Sculptors, and Illustrators"],
  "สถาปัตยกรรมศาสตร์": ["17-1011.00", "Architects, Except Landscape and Naval"],
  "มัณฑนศิลป์": ["27-1025.00", "Interior Designers"],
  "นิเทศศาสตร์ (โฆษณา/ภาพยนตร์)": ["27-2012.00", "Producers and Directors"],
  "ดุริยางคศาสตร์": ["27-2042.00", "Musicians and Singers"],
  "การออกแบบแฟชั่น": ["27-1022.00", "Fashion Designers"],
  "การออกแบบผลิตภัณฑ์": ["27-1021.00", "Commercial and Industrial Designers"],
  "อักษรศาสตร์/มนุษยศาสตร์ (วรรณกรรม)": ["27-3043.00", "Writers and Authors"],
  "ภาพยนตร์และสื่อดิจิทัล": ["27-4032.00", "Film and Video Editors"],
  "ครุศาสตร์/ศึกษาศาสตร์": ["25-2031.00", "Secondary School Teachers, Except Special and Career/Technical Education"],
  "พยาบาลศาสตร์": ["29-1141.00", "Registered Nurses"],
  "จิตวิทยา": ["19-3033.00", "Clinical and Counseling Psychologists"],
  "สังคมสงเคราะห์ศาสตร์": ["21-1021.00", "Child, Family, and School Social Workers"],
  "กายภาพบำบัด": ["29-1123.00", "Physical Therapists"],
  "สาธารณสุขศาสตร์ (สายชุมชน)": ["21-1094.00", "Community Health Workers"],
  "การศึกษาปฐมวัย": ["25-2011.00", "Preschool Teachers, Except Special Education"],
  "กิจกรรมบำบัด": ["29-1122.00", "Occupational Therapists"],
  "บริหารธุรกิจ (การตลาด)": ["11-2021.00", "Marketing Managers"],
  "บริหารธุรกิจ (การจัดการ)": ["11-1021.00", "General and Operations Managers"],
  "นิติศาสตร์": ["23-1011.00", "Lawyers"],
  "รัฐศาสตร์": ["19-3094.00", "Political Scientists"],
  "เศรษฐศาสตร์ (นโยบาย)": ["19-3011.00", "Economists"],
  "การจัดการโรงแรม/การท่องเที่ยว": ["11-9081.00", "Lodging Managers"],
  "นิเทศศาสตร์ (PR/โฆษณา)": ["27-3031.00", "Public Relations Specialists"],
  "บัญชี": ["13-2011.00", "Accountants and Auditors"],
  "การเงิน/การธนาคาร": ["13-2051.00", "Financial and Investment Analysts"],
  "เศรษฐศาสตร์ (วิเคราะห์)": ["19-3011.00", "Economists"],
  "สถิติประยุกต์": ["15-2041.00", "Statisticians"],
  "ระบบสารสนเทศทางธุรกิจ": ["15-1211.00", "Computer Systems Analysts"],
  "การจัดการโลจิสติกส์": ["13-1081.00", "Logisticians"],
  "การออกแบบอุตสาหกรรม": ["27-1021.00", "Commercial and Industrial Designers"],
  "รังสีเทคนิค": ["29-2034.00", "Radiologic Technologists and Technicians"],
  "การจัดการเทคโนโลยี": ["11-3021.00", "Computer and Information Systems Managers"],
  "เทคโนโลยีสารสนเทศ": ["15-1244.00", "Network and Computer Systems Administrators"],
  "ศิลปศึกษา": ["25-2031.00", "Secondary School Teachers, Except Special and Career/Technical Education"],
  "สถาปัตยกรรมภายใน": ["27-1025.00", "Interior Designers"],
  "พลศึกษา": ["27-2022.00", "Coaches and Scouts"],
  "วิศวกรรมความปลอดภัย": ["17-2111.00", "Health and Safety Engineers, Except Mining Safety Engineers and Inspectors"],
  "การจัดการสิ่งแวดล้อม": ["19-2041.00", "Environmental Scientists and Specialists, Including Health"],
  "ปฏิบัติการฉุกเฉินการแพทย์": ["29-2043.00", "Paramedics"],
  "การจัดการธุรกิจอาหาร": ["11-9051.00", "Food Service Managers"],
  "การจัดการอุตสาหกรรม": ["11-3051.00", "Industrial Production Managers"],
  "วิศวกรรมคอมพิวเตอร์": ["17-2061.00", "Computer Hardware Engineers"],
  "อัญมณีและเครื่องประดับ": ["51-9071.00", "Jewelers and Precious Stone and Metal Workers"],
  "เทคโนโลยีการพิมพ์": ["51-5111.00", "Prepress Technicians and Workers"],
  "อาชีวอนามัยและความปลอดภัย": ["19-5011.00", "Occupational Health and Safety Specialists"],
  "วิศวกรรมชีวการแพทย์": ["17-2031.00", "Bioengineers and Biomedical Engineers"],
  "วิศวกรรมสื่อดิจิทัล": ["27-1014.00", "Special Effects Artists and Animators"],
  "การออกแบบดิจิทัลและอินเทอร์แอคทีฟ": ["15-1255.00", "Web and Digital Interface Designers"],
  "วิทยาการข้อมูล": ["15-2051.00", "Data Scientists"],
  "สังคมวิทยาและมานุษยวิทยา": ["19-3041.00", "Sociologists"],
  "โภชนาการและการกำหนดอาหาร": ["29-1031.00", "Dietitians and Nutritionists"],
  "อักษรศาสตร์ (ภาษาศาสตร์)": ["27-3091.00", "Interpreters and Translators"],
  "สารสนเทศศาสตร์": ["25-4022.00", "Librarians and Media Collections Specialists"],
  "เวชระเบียนและสารสนเทศสุขภาพ": ["29-9021.00", "Health Information Technologists and Medical Registrars"],
  "นาฏศิลป์และการละคร": ["27-2011.00", "Actors"],
  "การออกแบบกราฟิก": ["27-1024.00", "Graphic Designers"],
  "ดิจิทัลเกม": ["15-1255.01", "Video Game Designers"],
  "การจัดการอีเวนต์": ["13-1121.00", "Meeting, Convention, and Event Planners"],
  "วารสารศาสตร์": ["27-3023.00", "News Analysts, Reporters, and Journalists"],
  "การตลาด (สายสร้างสรรค์)": ["13-1161.00", "Market Research Analysts and Marketing Specialists"],
  "เทคโนโลยีการศึกษา": ["25-9031.00", "Instructional Coordinators"],
  "การจัดการภัยพิบัติ": ["11-9161.00", "Emergency Management Directors"],
  "การจัดการทรัพยากรมนุษย์": ["13-1071.00", "Human Resources Specialists"],
  "การจัดการธุรกิจบันเทิง": ["13-1011.00", "Agents and Business Managers of Artists, Performers, and Athletes"],
  "ภาษาและการสื่อสาร": ["27-3031.00", "Public Relations Specialists"],
};

const get = (url) =>
  new Promise((resolve, reject) =>
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (guidance-app data check)" } }, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => resolve({ status: res.statusCode, body: b }));
    }).on("error", reject)
  );
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const section = (page, id) => {
  const i = page.indexOf(`id="${id}"`);
  if (i < 0) return "";
  const j = page.indexOf('class="reportsection"', i + 30);
  return page.slice(i, j > 0 ? j : i + 20000);
};

const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
const out = {};
const problems = [];
const notes = [];
const cache = {};
for (const [faculty, [code, expect]] of Object.entries(MAP)) {
  const url = `https://www.onetonline.org/link/summary/${code}`;
  if (!cache[code]) {
    const r = await get(url);
    if (r.status !== 200) { problems.push(`${faculty}: ${code} HTTP ${r.status}`); continue; }
    const page = r.body;
    const title = text(page.match(/<title>(.*?)<\/title>/s)?.[1] || "").replace(/^\S+\s+-\s+/, "");
    const tasks = [...section(page, "Tasks").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]).replace(/\s*Related occupations.*$/, "")).filter((x) => x.length > 15).slice(0, 5);
    const knowledge = [...section(page, "Knowledge").matchAll(/<b>([^<]+)<\/b>\s*—/g)].map((m) => text(m[1])).slice(0, 5);
    const interest = text(section(page, "Interests")).match(/Interest code:\s*([RIASEC]{1,3})/)?.[1] || null;
    cache[code] = { code, title, url, tasks, knowledge, interest };
    await new Promise((res) => setTimeout(res, 400));
  }
  const c = cache[code];
  if (c.title !== expect) problems.push(`${faculty}: ชื่อในหน้า O*NET "${c.title}" ≠ ที่ตั้งใจ "${expect}"`);
  if (!c.interest) problems.push(`${faculty}: อ่านรหัสความสนใจไม่ได้`);
  if (!c.knowledge.length) notes.push(`${faculty}: หน้า O*NET ของ ${c.title} ไม่มีข้อมูล Knowledge (แสดงเฉพาะรหัสความสนใจ)`);
  out[faculty] = c;
}
fs.writeFileSync(
  new URL("../Rm/src/data/onet-faculties.json", import.meta.url),
  JSON.stringify({ source: "O*NET OnLine (onetonline.org) — U.S. Department of Labor/ETA, CC BY 4.0", checkedAt: today, faculties: out }, null, 1) + "\n"
);
console.log(`O*NET: ${Object.keys(out).length} สาขา, ${Object.keys(cache).length} อาชีพ`);
console.log(problems.length ? problems.join("\n") : "ชื่ออาชีพตรงกับที่ตั้งใจทุกสาขา ✓");
if (notes.length) console.log(notes.join("\n"));
process.exitCode = problems.length ? 1 : 0;

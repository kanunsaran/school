// ทดสอบความสอดคล้องกับเป้าหมาย + คำแนะนำเฉพาะบุคคล — รัน: node scripts/riasec-goal.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import * as R from "../Rm/src/utils/riasecScoring.js";
const data = JSON.parse(fs.readFileSync(new URL("../Rm/src/data/riasec.json", import.meta.url), "utf8"));
const res = (s) => R.resultFromScores(s);
const run = (title, result, goal) => {
  console.log(`\n## ${title} — ผล ${result.code}`);
  if (!R.hasGoal(goal)) { console.log("  ยังไม่ตั้งเป้าหมาย → เชิญชวนตั้งเป้าหมาย"); return []; }
  const an = R.goalTargets(data, goal).map((t) => R.analyzeTarget(data, result, t));
  an.forEach((a) => console.log(`  [${a.source}] "${a.input}" → ${a.faculty.name} (มิติ ${a.faculty.dim}, คุณได้ ${a.dimScore}/50 อันดับ ${a.dimRank}) = ${a.level} (${a.reason})${a.alternatives.length ? " | ทางเลือก: " + a.alternatives.map((b) => b.row.name + "[" + b.work.join(",") + "]").join(", ") : ""}`));
  const adv = R.personalAdvice(data, result, an);
  // คำแนะนำต้องใช้เฉพาะคณะในเป้าหมาย และทุกช่องต้องมาจากไฟล์ (ไม่ว่าง)
  assert.deepEqual(adv.perFaculty.map((f) => f.name), [...new Set(an.map((a) => a.faculty.name))]);
  adv.perFaculty.forEach((f) => ["subjects", "skills", "traits", "advice", "track", "exam", "careers"].forEach((k) => assert.ok(f[k] && f[k].length, `${f.name}.${k} ว่าง`)));
  adv.perFaculty.forEach((f) => console.log(`  คำแนะนำ [${f.name}] วิชา: ${f.subjects.join(",")} | กิจกรรม: ${f.advice.slice(0, 40)}… | อาชีพ: ${f.careers.join(",")}`));
  if (adv.toExplore.length) console.log("  ด้านที่ควรสำรวจ:", adv.toExplore.map((t) => `${t.code} (${t.score}/50)`).join(", "));
  return an;
};
const SIE = res({ R: 20, I: 40, A: 25, S: 46, E: 35, C: 15 });
assert.equal(SIE.code, "SIE");
// 1) ไม่สอดคล้อง — ตัวอย่างในสเปก: SIE + คณะศิลปกรรมศาสตร์
let an = run("ไม่สอดคล้อง (ตัวอย่างในสเปก)", SIE, { faculty_name: "คณะศิลปกรรมศาสตร์", career_field: "", goal_text: "" });
assert.equal(an[0].level, "low"); assert.ok(an[0].alternatives.length > 0);
// ทางเลือกต้องมีงานใกล้กับเป้าหมาย และอยู่ในรหัสเดียวกับเป้าหมายในตารางของงานแนะแนว — ไม่ใช่ปฐมวัย/ครุศาสตร์/กิจกรรมบำบัด
an[0].alternatives.forEach((x) => {
  assert.ok(x.work.length > 0);
  assert.ok(x.codes.every((c) => data.codes[c].faculties.includes(an[0].faculty.name)));
});
assert.ok(!an[0].alternatives.some((x) => /ปฐมวัย|ครุศาสตร์|กิจกรรมบำบัด/.test(x.row.name)));
// 2) สอดคล้อง — SIE + สาธารณสุขศาสตร์ (อยู่ในคณะที่ SIE แนะนำ)
an = run("สอดคล้อง", SIE, { faculty_name: "สาธารณสุขศาสตร์", career_field: "นักวิชาการสาธารณสุข", goal_text: "" });
assert.equal(an[0].level, "high");
// 3) ปานกลาง — SIE + แพทยศาสตร์ (มิติ I = อันดับ 2)
an = run("ปานกลาง", SIE, { faculty_name: "แพทยศาสตร์", career_field: "", goal_text: "" });
assert.equal(an[0].level, "medium");
// 4) ยังไม่ตั้งเป้าหมาย
run("ยังไม่ตั้งเป้าหมาย", SIE, { faculty_name: "", career_field: "", goal_text: " " });
assert.equal(R.hasGoal(null), false);
// 5) ข้อมูลจริงในฐานข้อมูล: คณะ + อาชีพ + ข้อความ
const SIA = res({ R: 20, I: 40, A: 30, S: 50, E: 30, C: 10 });
an = run("ข้อมูลจริง (คณะ+อาชีพ+ข้อความ)", SIA, { faculty_name: "คณะศิลปกรรมศาสตร์", career_field: "นักออกแบบกราฟิก", goal_text: "อยากเรียนต่อด้านการออกแบบกราฟิก เพื่อเป็นนักออกแบบมืออาชีพในอนาคต" });
assert.deepEqual(an.map((a) => a.faculty.name), ["ศิลปกรรมศาสตร์ (ทัศนศิลป์)", "การออกแบบกราฟิก"]);
// 6) ตั้งแค่อาชีพ
an = run("ตั้งแค่อาชีพ", SIA, { faculty_name: "", career_field: "พยาบาล", goal_text: "" });
assert.equal(an[0].faculty.name, "พยาบาลศาสตร์");
// 7) ไม่มีเป้าหมายในฐานข้อมูล → คำแนะนำใช้คณะที่รหัสแนะนำ
const adv = R.personalAdvice(data, SIA, []);
assert.equal(adv.usesGoal, false); assert.equal(adv.focus[0].name, data.codes.SIA.faculties[0]); assert.equal(adv.perFaculty.length, 2);
// 8) คะแนนเท่ากันที่อันดับ 3: I = A = 36 → A อยู่ใน 3 ด้านแรกร่วมกัน → ไม่ใช่ "ต่ำ"
const TIE = res({ R: 20, I: 36, A: 36, S: 46, E: 40, C: 15 });
an = run("คะแนนเท่ากัน I = A = 36", TIE, { faculty_name: "คณะศิลปกรรมศาสตร์", career_field: "", goal_text: "" });
assert.equal(an[0].rank, 3); assert.deepEqual(an[0].tied, ["I"]); assert.equal(an[0].level, "medium");
// 9) เท่ากันที่อันดับ 1 → สูง
an = run("คะแนนเท่ากันอันดับ 1", res({ R: 20, I: 30, A: 46, S: 46, E: 40, C: 15 }), { faculty_name: "คณะศิลปกรรมศาสตร์", career_field: "", goal_text: "" });
assert.equal(an[0].level, "high");
// 10) ไม่เชื่อมแบบฝืน: "การสื่อสารด้วยภาพ" เป็นงานด้าน A ไม่ถูกยกให้ด้าน S, "สุขภาพ" ไม่ใช่ "ภาพ"
const vis = data.faculties.find((f) => f.name === "ศิลปกรรมศาสตร์ (ทัศนศิลป์)");
const linksSIE = R.interestLinks(data, SIE, vis);
assert.ok(!linksSIE.some((x) => x.code === "S" && x.phrases.some((p) => p.includes("ภาพ"))), "S ต้องไม่ได้ 'การสื่อสารด้วยภาพ'");
assert.ok(!linksSIE.some((x) => x.mine), "SIE ไม่มีด้านเด่นที่เชื่อมกับทัศนศิลป์ได้จริง");
const pub = data.faculties.find((f) => f.name === "สาธารณสุขศาสตร์");
assert.ok(!R.interestLinks(data, SIE, pub).some((x) => x.code === "A"), "'ความสนใจสุขภาพ' ไม่ใช่ด้าน A");
// 11) รหัสหลักหลายแบบ (C = A = 36 ที่อันดับ 3 → SIC / SIA): ด้านที่เสมอกันนับเป็นความสนใจเด่นเท่ากัน
const MULTI = res({ R: 20, I: 40, A: 36, S: 46, E: 30, C: 36 });
assert.ok(MULTI.alternativeCodes.length > 0);
an = run("รหัสหลายแบบ " + [MULTI.code, ...MULTI.alternativeCodes].join("/"), MULTI, { faculty_name: "การออกแบบกราฟิก", career_field: "", goal_text: "" });
assert.notEqual(an[0].level, "low", "A เสมออันดับ 3 ต้องไม่ถูกนับว่าไม่ใช่ความสนใจเด่น");
assert.ok(R.interestLinks(data, MULTI, an[0].faculty).filter((x) => x.mine).map((x) => x.code).includes("A"));
// 12) สาขาทางเลือก: มีเหตุผล (งานร่วม) และบอกส่วนที่ต่าง
an[0].alternatives.forEach((x) => { assert.ok(x.shared.length && x.work.length); assert.ok(Array.isArray(x.differs)); });
// 13) กรณีจากผู้ตรวจ: S=42 C=39 I=36 A=36 → I และ A อันดับ 3 ร่วมกัน, รหัส SCI / SCA, คำแนะนำแยกตามรหัส
const CASE = res({ R: 20, I: 36, A: 36, S: 42, E: 25, C: 39 });
assert.deepEqual([CASE.code, ...CASE.alternativeCodes], ["SCI", "SCA"]);
assert.equal(R.denseRank(CASE.scores, "I"), 3); assert.equal(R.denseRank(CASE.scores, "A"), 3);
assert.deepEqual(R.tiedWith(CASE.scores, "I"), ["A"]);
assert.deepEqual(R.topDims(CASE), ["I", "A", "S", "C"]);
const advSCI = R.riasecAdvice(data, { ...CASE, code: "SCI", alternativeCodes: [] });
const advSCA = R.riasecAdvice(data, { ...CASE, code: "SCA", alternativeCodes: [] });
const names = (a) => a.explore.map((x) => x.row.name);
console.log("SCI →", names(advSCI).join(", "), "| SCA →", names(advSCA).join(", "));
assert.ok(names(advSCI).every((n) => R.facultiesForCode(data, "SCI").some((f) => f.rows.some((r) => r.name === n))), "คำแนะนำ SCI ต้องมาจากรหัส SCI เท่านั้น");
assert.ok(names(advSCA).every((n) => R.facultiesForCode(data, "SCA").some((f) => f.rows.some((r) => r.name === n))), "คำแนะนำ SCA ต้องมาจากรหัส SCA เท่านั้น");
// 14) กรณีจากสเปก: S42 C39 I36 A36 R35 E35
const SP = res({ S: 42, C: 39, I: 36, A: 36, R: 35, E: 35 });
assert.equal(SP.code, "SCI"); assert.deepEqual(SP.alternativeCodes, ["SCA"]);
assert.equal(SP.differentiation, 42 - 35);
assert.deepEqual(R.RIASEC_ORDER.map((c) => R.rankLabel(SP.scores, c)), ["อันดับร่วม 5", "อันดับร่วม 3", "อันดับร่วม 3", "อันดับ 1", "อันดับร่วม 5", "อันดับ 2"]);
assert.deepEqual(R.RIASEC_ORDER.map((c) => R.scorePercent(SP.scores[c])), [70, 72, 72, 84, 70, 78]);
// สาขาที่ควรสำรวจ ≤ 3 ทุกสาขามีลักษณะที่เชื่อมกับความสนใจเด่น และมาจากรหัสหลัก/ทางเลือกเท่านั้น
const ex = R.exploreFaculties(data, SP, []);
console.log("สาขาที่ควรสำรวจ:", ex.map((x) => `${x.row.name}[${x.code}]`).join(", "));
assert.ok(ex.length <= 3 && ex.length > 0);
ex.forEach((x) => { assert.ok(x.links.length > 0); assert.ok(["SCI", "SCA"].includes(x.code)); });
// ไม่แนะนำสาขาที่ตั้งเป็นเป้าหมายแล้ว
assert.ok(!R.exploreFaculties(data, SP, ["พยาบาลศาสตร์"]).some((x) => x.row.name === "พยาบาลศาสตร์"));
// ทุกสาขาใน 120 รหัส: ≤ 3 และไม่มีสาขาที่ไม่มีความเชื่อมโยง
Object.keys(data.codes).forEach((code) => {
  const r = R.resultFromScores(Object.fromEntries(R.RIASEC_ORDER.map((c) => [c, code.includes(c) ? 50 - code.indexOf(c) * 5 : 15])));
  const l = R.exploreFaculties(data, r, []);
  assert.ok(l.length <= 3 && l.every((x) => x.links.length > 0), code);
});
// ข้อค้นพบความเชื่อมโยง: เงื่อนไขตรวจสอบได้ ไม่ขึ้นกับว่าด้านใดได้คะแนนสูงสุดเพียงอย่างเดียว
const kind = (f) => R.analyzeTarget(data, SP, R.goalTargets(data, { faculty_name: f })[0]).kind;
assert.equal(kind("พยาบาลศาสตร์"), "recommended");
assert.equal(kind("การออกแบบกราฟิก"), "main"); // A อันดับร่วม 3 = ความสนใจเด่น
assert.equal(kind("วิศวกรรมโยธา"), "partial");
console.log("ข้อค้นพบ:", ["พยาบาลศาสตร์", "การออกแบบกราฟิก", "วิศวกรรมโยธา", "บัญชี"].map((f) => `${f}=${kind(f)}`).join(", "));
// 15) กรณีทดสอบตามสเปก "ก่อนให้ครูแนะแนวทดลองใช้" (ตรรกะ — ส่วนหน้าเว็บทดสอบด้วย Playwright แยก)
const level = (r, f) => { const t = R.goalTargets(data, { faculty_name: f })[0]; return t ? R.analyzeTarget(data, r, t).displayLevel : null; };
const acts = (r, ex = [], extra = []) => R.exploreActivities(data, r, ex, extra);
// (1) SCI
const c1 = res({ R: 20, I: 38, A: 25, S: 46, E: 30, C: 40 });
assert.equal(c1.code, "SCI");
assert.ok(acts(c1).every((a) => a.text === null || !/(?<!ตรวจ)สอบ|TPAT/.test(a.text)), "กิจกรรมต้องไม่ใช่การเตรียมสอบ");
// (2) SEC — กิจกรรม/สาขาต่างจาก SCI
const c2 = res({ R: 20, I: 25, A: 22, S: 44, E: 40, C: 38 });
assert.equal(c2.code, "SEC");
assert.notDeepEqual(acts(c1).map((a) => a.text), acts(c2).map((a) => a.text));
assert.notDeepEqual(R.exploreFaculties(data, c1).map((x) => x.row.name), R.exploreFaculties(data, c2).map((x) => x.row.name));
// (3) คะแนนเสมอ: ทุกด้านที่เสมอในอันดับ 3 ได้กิจกรรม
const c3 = res({ R: 35, I: 36, A: 36, S: 42, E: 35, C: 39 });
assert.deepEqual(acts(c3).map((a) => a.dim).sort(), ["A", "C", "I", "S"]);
// (4) สูง / (5) ต่ำ
assert.equal(level(c1, "พยาบาลศาสตร์"), "high");
assert.equal(level(c1, "คณะศิลปกรรมศาสตร์"), "low");
// กรณีต่ำ: มีกิจกรรมด้านหลักของเป้าหมาย (A) ให้ลอง โดยไม่ใช้สาขาเป้าหมายเอง
const lowActs = acts(c1, ["ศิลปกรรมศาสตร์ (ทัศนศิลป์)"], ["A"]);
assert.ok(lowActs.some((a) => a.dim === "A" && a.forGoal));
assert.ok(!lowActs.some((a) => a.faculty?.name === "ศิลปกรรมศาสตร์ (ทัศนศิลป์)"));
// (6) ไม่มีเป้าหมาย
assert.equal(R.hasGoal({ faculty_name: "", goal_text: "" }), false);
// (7) ข้อมูลไม่ครบ: เป้าหมายที่ไม่มีในฐานข้อมูล → ไม่มีผลวิเคราะห์ (หน้าเว็บแจ้งว่าเปรียบเทียบไม่ได้)
assert.equal(R.goalTargets(data, { faculty_name: "คณะเวทมนตร์ศาสตร์" }).length, 0);
// (8) ไม่มีกิจกรรมของด้านนั้นในข้อมูลโรงเรียน → text = null (หน้าเว็บใช้คำแนะนำทั่วไปพร้อมป้าย)
const flat = R.resultFromScores({ R: 30, I: 30, A: 30, S: 30, E: 30, C: 30 });
assert.ok(acts(flat).some((a) => a.text === null));
console.log("กรณีครูทดลองใช้ 1–8: SCI กิจกรรม", acts(c1).map((a) => `${a.dim}:${a.text ? "โรงเรียน" : "ทั่วไป"}`).join(","), "| SEC", acts(c2).map((a) => `${a.dim}:${a.text ? "โรงเรียน" : "ทั่วไป"}`).join(","));
console.log("\nผ่านทุกกรณี ✓");

// ===== ข้อ 7 ของสเปกปรับปรุง: คำแนะนำ RIASEC (ส่วน B), อาชีพ ≤ 3, คะแนนเท่ากัน =====
console.log("\n===== ส่วน B / อาชีพ / คะแนนเท่ากัน =====");
const check3 = (list, label) => {
  assert.ok(list.length <= 3, `${label}: เกิน 3`);
  assert.equal(new Set(list.map((c) => c.title)).size, list.length, `${label}: อาชีพซ้ำ`);
};
// ทุกรหัส 120 ตัว: อาชีพใต้ผล RIASEC ไม่เกิน 3 ไม่ซ้ำ และผูกกับข้อมูลจริง
Object.keys(data.codes).forEach((code) => {
  const r = R.resultFromScores(Object.fromEntries(R.RIASEC_ORDER.map((c) => [c, code.includes(c) ? 50 - code.indexOf(c) * 5 : 15])));
  assert.equal(r.code, code);
  const list = R.careersForResult(data, r);
  check3(list, code);
  list.forEach((c) => assert.ok(data.codes[code].careers.includes(c.title) || data.faculties.some((f) => f.careers.includes(c.title)), `${code}: ${c.title} ไม่มีในไฟล์`));
});
console.log("อาชีพใต้ผล RIASEC: ครบ 120 รหัส ≤3 ไม่ซ้ำ และมีในไฟล์ทุกรายการ ✓");

// ตัวอย่าง SCI ในสเปก
const SCI = res({ R: 20, I: 38, A: 18, S: 46, E: 25, C: 40 });
assert.equal(SCI.code, "SCI");
const bSCI = R.riasecAdvice(data, SCI);
console.log("SCI ลักษณะงาน:", bSCI.workStyles[0].meaning, "| กิจกรรมจาก:", bSCI.activities.map((a) => a.faculty).join(", "));
console.log("SCI อาชีพ:", R.careersForResult(data, SCI).map((c) => `${c.title} (${c.faculty?.name})`).join(", "));
assert.ok(bSCI.activities.length > 0 && bSCI.skills.length > 0);

// 3) ความเชื่อมโยงความสนใจ ↔ สาขา: วลีต้องมาจากไฟล์ของสาขา และด้านที่ได้ต้องตรงกับความหมายของวลี (ไม่ฝืนจับคู่)
const graphic = data.faculties.find((f) => f.name === "การออกแบบกราฟิก");
const tr = R.interestLinks(data, SCI, graphic);
console.log("SCI → การออกแบบกราฟิก:", tr.map((x) => `${x.code}${x.mine ? "*" : ""}:${x.phrases.join("/")}`).join("  "));
tr.forEach((x) => x.phrases.forEach((p) => assert.ok(`${graphic.traits} ${graphic.skills}`.includes(p))));
assert.ok(!tr.some((x) => x.code === "S" && x.phrases.some((p) => p.includes("ภาพ"))));
// ไม่มีด้านเด่นที่เชื่อมได้จริง → ไม่มีรายการของนักเรียน (mine)
const vet = data.faculties.find((f) => f.name === "สัตวแพทยศาสตร์");
const E1 = res({ R: 10, I: 10, A: 30, S: 10, E: 50, C: 40 });
console.log("ECA → สัตวแพทย์:", JSON.stringify(R.interestLinks(data, E1, vet).filter((x) => x.mine)));

// 5) คะแนนเท่ากันหลายด้าน — อันดับเท่ากัน ไม่อ้างว่าด้านใดเด่นกว่า
const T = res({ R: 20, I: 40, A: 40, S: 40, E: 20, C: 10 });
assert.deepEqual(["I", "A", "S"].map((c) => R.denseRank(T.scores, c)), [1, 1, 1]);
assert.deepEqual(R.tiedWith(T.scores, "I"), ["A", "S"]);
assert.ok(T.hasTie && T.alternativeCodes.length === 5);
assert.equal(R.riasecAdvice(data, T).workStyles.length, 6); // แสดงความหมายของทุกรหัสที่เป็นไปได้
console.log("คะแนนเท่ากัน I=A=S: อันดับ 1 ทั้งสามด้าน, รหัสที่เป็นไปได้", [T.code, ...T.alternativeCodes].join(", "), "✓");

// 6) อาชีพในข้อมูลไม่ครบ 3 — แสดงเท่าที่มี ไม่สร้างเพิ่ม
const fewRow = data.faculties.find((f) => f.careers.length < 3 && !Object.keys(data.codes).some((c) => R.facultiesForCode(data, c).some((x) => x.rows.includes(f))));
if (fewRow) {
  const l = R.careersForGoal(data, SCI, [fewRow], "");
  console.log(`อาชีพไม่ครบ: ${fewRow.name} มี ${fewRow.careers.length} อาชีพ → แสดง ${l.length}:`, l.map((c) => c.title).join(", "));
  assert.equal(l.length, fewRow.careers.length);
} else {
  const dent = data.faculties.find((f) => f.name === "ทันตแพทยศาสตร์");
  const l = R.careersForGoal(data, SCI, [dent], "");
  console.log("อาชีพไม่ครบ: ทันตแพทยศาสตร์ มี 2 อาชีพในชีตคณะ → แสดง", l.map((c) => `${c.title}[${c.source}]`).join(", "));
  check3(l, "ทันตะ"); assert.equal(l.length, 2, "ต้องแสดงเท่าที่มี ไม่เติมจากสาขาอื่น");
}

// 7) อาชีพเป้าหมายซ้ำกับอาชีพของสาขา — แสดงครั้งเดียว และอยู่อันดับแรก
const gl = R.careersForGoal(data, SCI, [graphic], "นักออกแบบกราฟิก");
console.log("เป้าหมายอาชีพซ้ำกับสาขา:", gl.map((c) => `${c.title}[${c.source}]`).join(", "));
check3(gl, "graphic"); assert.equal(gl[0].title, "นักออกแบบกราฟิก"); assert.equal(gl[0].source, "goal");

// อาชีพต่อยอดจากสาขาอื่นในเป้าหมายเดียวกัน (คณะศิลปกรรม + การออกแบบกราฟิก)
const two = [data.faculties.find((f) => f.name === "ศิลปกรรมศาสตร์ (ทัศนศิลป์)"), graphic];
const tl = R.careersForGoal(data, SCI, two, "นักออกแบบกราฟิก");
console.log("เป้าหมาย 2 สาขา:", tl.map((c) => `${c.title}[${c.source}]`).join(", "));
assert.deepEqual(tl.map((c) => c.source), ["goal", "faculty", "faculty"]);
const tl2 = R.careersForGoal(data, SCI, two, "");
console.log("เป้าหมาย 2 สาขา (ไม่ระบุอาชีพ):", tl2.map((c) => `${c.title}[${c.faculty.name}]`).join(", "));
assert.deepEqual(tl2.map((c) => c.source), ["faculty", "faculty", "faculty"]);
assert.ok(two.every((f) => tl2.some((c) => c.faculty === f)), "ทุกสาขาในเป้าหมายต้องมีอาชีพแสดง");

// 8) แก้ไขเป้าหมาย → คำแนะนำและอาชีพเปลี่ยนตาม
const before = R.goalTargets(data, { faculty_name: "การออกแบบกราฟิก", career_field: "นักออกแบบกราฟิก" }).map((t) => R.analyzeTarget(data, SCI, t));
const after = R.goalTargets(data, { faculty_name: "พยาบาลศาสตร์", career_field: "พยาบาล" }).map((t) => R.analyzeTarget(data, SCI, t));
const advB = R.personalAdvice(data, SCI, before), advA = R.personalAdvice(data, SCI, after);
assert.notDeepEqual(advB.perFaculty.map((f) => f.name), advA.perFaculty.map((f) => f.name));
console.log("แก้เป้าหมาย: ก่อน", before.map((a) => `${a.faculty.name}=${a.level}`).join(","), "→ หลัง", after.map((a) => `${a.faculty.name}=${a.level}`).join(","),
  "| อาชีพหลัง:", R.careersForGoal(data, SCI, advA.focus, "พยาบาล").map((c) => c.title).join(", "));
// ส่วน B ไม่ซ้ำส่วน A
const bEx = R.riasecAdvice(data, SCI, advA.focus.map((f) => f.name));
assert.ok(!bEx.explore.some((x) => advA.focus.some((f) => f.name === x.row.name)));
console.log("\nผ่านทุกกรณีเพิ่มเติม ✓");

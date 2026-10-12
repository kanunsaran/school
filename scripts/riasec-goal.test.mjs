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
  an.forEach((a) => console.log(`  [${a.source}] "${a.input}" → ${a.faculty.name} (มิติ ${a.faculty.dim}, คุณได้ ${a.dimScore}/50 อันดับ ${a.dimRank}) = ${a.level} (${a.reason})${a.bridges.length ? " | สาขาเชื่อม: " + a.bridges.map((b) => b.row.name + "[" + b.codes.join(",") + "]").join(", ") : ""}`));
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
assert.equal(an[0].level, "low"); assert.ok(an[0].bridges.length > 0);
// 2) สอดคล้อง — SIE + สาธารณสุขศาสตร์ (อยู่ในคณะที่ SIE แนะนำ)
an = run("สอดคล้อง", SIE, { faculty_name: "สาธารณสุขศาสตร์", career_field: "นักวิชาการสาธารณสุข", goal_text: "" });
assert.equal(an[0].level, "high"); assert.equal(an[0].bridges.length, 0);
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
console.log("\nผ่านทุกกรณี ✓");

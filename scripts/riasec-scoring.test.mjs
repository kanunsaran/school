// ทดสอบการคิดคะแนน RIASEC ตามไฟล์วิธีคิดคะแนน — รัน: node scripts/riasec-scoring.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import * as R from "../Rm/src/utils/riasecScoring.js";
const data = JSON.parse(fs.readFileSync(new URL("../Rm/src/data/riasec.json", import.meta.url), "utf8"));
// สร้างคำตอบ 60 ข้อให้ได้คะแนนตามต้องการ
const answersFor = (target) => Object.entries(target).flatMap(([code, total]) => {
  const base = Math.floor(total / 10), extra = total % 10;
  return Array.from({ length: 10 }, (_, i) => ({ code, value: base + (i < extra ? 1 : 0) }));
});
const log = (name, r) => console.log(`${name}: ${JSON.stringify(r.scores)} → ${r.code}${r.hasTie ? " (หรือ " + r.alternativeCodes.join(", ") + ")" : ""} | diff ${r.differentiation}${r.lowDifferentiation ? " (ใกล้กัน)" : ""} | consistency ${r.consistency}`);

// 1) คะแนนปกติ — ตัวอย่างในไฟล์วิธีคิดคะแนน: ต้องได้ SIA, diff 27, ความสอดคล้องปานกลาง
const r1 = R.scoreRiasec(answersFor({ R: 24, I: 41, A: 33, S: 46, E: 28, C: 19 }));
log("กรณี 1 ปกติ (ตัวอย่างในไฟล์)", r1);
assert.equal(r1.code, "SIA"); assert.equal(r1.differentiation, 27); assert.equal(r1.consistency, "medium"); assert.equal(r1.hasTie, false);

// 2) หลายด้านใกล้กัน — ห่างกัน 1 คะแนน ต้องเรียงตามคะแนนจริง และแจ้งว่าคะแนนใกล้กันทุกมิติ
const r2 = R.scoreRiasec(answersFor({ R: 30, I: 32, A: 31, S: 33, E: 29, C: 28 }));
log("กรณี 2 ใกล้กัน", r2);
assert.equal(r2.code, "SIA"); assert.equal(r2.differentiation, 5); assert.equal(r2.lowDifferentiation, true); assert.equal(r2.hasTie, false);

// 3) คะแนนเท่ากันที่รอยต่ออันดับ 3 — A กับ E ได้ 40 เท่ากัน: รหัสหลักใช้ลำดับหกเหลี่ยม (A มาก่อน) และแสดงทางเลือก
const r3 = R.scoreRiasec(answersFor({ R: 20, I: 25, A: 40, S: 45, E: 40, C: 15 }));
log("กรณี 3 เท่ากัน", r3);
assert.equal(r3.code, "SAE"); assert.deepEqual(r3.alternativeCodes, ["SEA"]); assert.equal(r3.hasTie, true);

// 3b) เท่ากันข้ามรอยต่อ 3/4 — I, A, S = 35 แต่มี R = 45 อันดับ 1: ต้องได้ RIA หรือ RIS/RAI/RAS/RSI/RSA
const r3b = R.scoreRiasec(answersFor({ R: 45, I: 35, A: 35, S: 35, E: 20, C: 20 }));
log("กรณี 3b เท่ากันข้ามรอยต่อ", r3b);
assert.equal(r3b.code, "RIA"); assert.equal(r3b.alternativeCodes.length, 5);

// ขอบเขต: ตอบ 1 ทุกข้อ = 10, ตอบ 5 ทุกข้อ = 50
assert.deepEqual(Object.values(R.sumScores(answersFor({ R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 }))), [10, 10, 10, 10, 10, 10]);
assert.equal(R.scorePercent(50), 100); assert.equal(R.scorePercent(41), 82);
assert.throws(() => R.sumScores([{ code: "R", value: 6 }]));
// ความสอดคล้องบนหกเหลี่ยมตามตารางในไฟล์
assert.equal(R.hexDistance("R", "I"), 1); assert.equal(R.hexDistance("E", "C"), 1); assert.equal(R.hexDistance("R", "C"), 1);
assert.equal(R.hexDistance("R", "A"), 2); assert.equal(R.hexDistance("S", "C"), 2);
assert.equal(R.hexDistance("R", "S"), 3); assert.equal(R.hexDistance("I", "E"), 3); assert.equal(R.hexDistance("A", "C"), 3);

// ทุกรหัสที่ระบบสร้างได้ต้องมีในฐานข้อมูล และทุกรหัสต้องมีคณะ ≥ 1 แถว
const perms = R.RIASEC_ORDER.flatMap((a) => R.RIASEC_ORDER.flatMap((b) => R.RIASEC_ORDER.map((c) => a + b + c))).filter((x) => new Set(x).size === 3);
assert.equal(perms.length, 120);
perms.forEach((c) => { assert.ok(data.codes[c], "ไม่มีรหัส " + c); assert.ok(R.facultiesForCode(data, c).every((f) => f.rows.length > 0), "คณะไม่ครบ " + c); });

// ความสอดคล้องกับเป้าหมาย
const show = (goal, code) => { const a = R.goalAlignment(data, goal, code); console.log(`  เป้าหมาย "${goal}" กับ ${code} → ${a.level}${a.faculty ? " (" + a.faculty.name + ", มิติ " + a.faculty.dim + ")" : ""}`); return a; };
console.log("ความสอดคล้องกับเป้าหมาย:");
assert.equal(show("คณะจิตวิทยา จุฬาฯ", "SIA").level, "high");            // อยู่ในคณะที่แนะนำ
assert.equal(show("คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น", "SIA").level, "medium"); // มิติ I = ตัวที่ 2
assert.equal(show("สัตวแพทยศาสตร์", "SIA").faculty.name, "สัตวแพทยศาสตร์");    // ต้องไม่สับสนกับแพทยศาสตร์
assert.equal(show("วิศวกรรมโยธา", "SIA").level, "low");                   // มิติ R ไม่อยู่ใน 3 ตัวแรก
assert.equal(show("คณะการโรงแรมอวกาศ", "SIA").level, "unknown");
assert.equal(show("", "SIA").level, "none");
console.log("ผ่านทุกกรณี ✓");

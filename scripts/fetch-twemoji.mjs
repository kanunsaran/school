// ดาวน์โหลดรูปอิโมจิอาชีพจาก Twemoji (กราฟิก CC BY 4.0) มาเก็บใน Rm/public/emoji/twemoji/
// รายชื่อมาจาก Rm/src/utils/careerEmoji.js • ใช้: node scripts/fetch-twemoji.mjs
import fs from "node:fs";
import path from "node:path";
import { ALL_CODES } from "../Rm/src/utils/careerEmoji.js";

const VERSION = "16.0.1";
const BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${VERSION}/assets/svg`;
const outDir = new URL("../Rm/public/emoji/twemoji/", import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });
const failed = [];
for (const code of ALL_CODES) {
  const r = await fetch(`${BASE}/${code}.svg`);
  if (r.ok) fs.writeFileSync(path.join(outDir, `${code}.svg`), Buffer.from(await r.arrayBuffer()));
  else failed.push(code);
}
fs.writeFileSync(
  path.join(outDir, "LICENSE.txt"),
  `Emoji graphics from Twemoji ${VERSION} — https://github.com/jdecked/twemoji\nCopyright 2019 Twitter, Inc and other contributors; Copyright 2024 jdecked and other contributors.\nGraphics licensed under CC BY 4.0: https://creativecommons.org/licenses/by/4.0/\n`
);
console.log(`ดาวน์โหลด ${ALL_CODES.length - failed.length}/${ALL_CODES.length} รูป → ${outDir}`);
if (failed.length) console.log("ไม่พบ:", failed.join(", "));
process.exitCode = failed.length ? 1 : 0;

// ดาวน์โหลดรูปอิโมจิอาชีพจาก Microsoft Fluent Emoji (MIT) มาเก็บใน Rm/public/emoji/fluent/
// รายชื่อมาจาก Rm/src/utils/careerEmoji.js • ใช้: node scripts/fetch-fluent-emoji.mjs
import fs from "node:fs";
import path from "node:path";
import { ALL_EMOJI } from "../Rm/src/utils/careerEmoji.js";

const BASE = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets";
const snake = (n) => n.toLowerCase().replace(/[^a-z0-9-]+/g, "_");
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const outDir = new URL("../Rm/public/emoji/fluent/", import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });
const seen = new Set();
const failed = [];
for (const [name, skin] of ALL_EMOJI) {
  if (seen.has(name)) continue;
  seen.add(name);
  const urls = [
    skin ? `${BASE}/${encodeURIComponent(name)}/Default/3D/${snake(name)}_3d_default.png` : null,
    `${BASE}/${encodeURIComponent(name)}/3D/${snake(name)}_3d.png`,
    `${BASE}/${encodeURIComponent(name)}/Default/3D/${snake(name)}_3d_default.png`,
  ].filter(Boolean);
  let ok = false;
  for (const u of urls) {
    const r = await fetch(u);
    if (r.ok) {
      fs.writeFileSync(path.join(outDir, `${slug(name)}.png`), Buffer.from(await r.arrayBuffer()));
      ok = true;
      break;
    }
  }
  if (!ok) failed.push(name);
}
fs.writeFileSync(
  path.join(outDir, "LICENSE.txt"),
  "Images from Microsoft Fluent Emoji — https://github.com/microsoft/fluentui-emoji\nMIT License, Copyright (c) Microsoft Corporation.\n"
);
console.log(`ดาวน์โหลด ${seen.size - failed.length}/${seen.size} รูป → ${outDir}`);
if (failed.length) console.log("ไม่พบ:", failed.join(", "));
process.exitCode = failed.length ? 1 : 0;

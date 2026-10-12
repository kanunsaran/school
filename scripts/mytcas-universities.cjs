// ดึงรายชื่อมหาวิทยาลัยที่เปิดรับใน TCAS จาก myTCAS → Rm/src/data/universities.json (ใช้เป็นตัวเลือกในหน้าตั้งเป้าหมาย)
// ใช้: node scripts/mytcas-universities.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const get = (url) =>
  new Promise((resolve, reject) =>
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(JSON.parse((buf[0] === 0x1f ? zlib.gunzipSync(buf) : buf).toString('utf8')));
      });
    }).on('error', reject)
  );
(async () => {
  const unis = await get('https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/universities.json');
  const names = [...new Set(unis.map((u) => u.university_name.trim()))].sort((a, b) => a.localeCompare(b, 'th'));
  const out = { source: 'myTCAS (course.mytcas.com) — universities.json', fetchedAt: new Date().toISOString().slice(0, 10), universities: names };
  const dest = path.join(__dirname, '../Rm/src/data/universities.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
  console.log(`เขียน ${dest}: ${names.length} มหาวิทยาลัย`);
})();

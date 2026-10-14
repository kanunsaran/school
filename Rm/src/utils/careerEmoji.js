// รูปอิโมจิประกอบอาชีพ — Twemoji (กราฟิก CC BY 4.0: github.com/jdecked/twemoji)
// ไฟล์รูปเก็บในเว็บเองที่ public/emoji/twemoji/ (ดาวน์โหลดด้วย scripts/fetch-twemoji.mjs) ไม่โหลดจากเว็บภายนอกตอนใช้งาน
// จับคู่จากคำในชื่ออาชีพ (เรียงจากเฉพาะเจาะจง → ทั่วไป) ไม่พบ = ใช้รูปตามด้านหลักของสาขา

// [รูปแบบคำในชื่ออาชีพ, ชื่ออิโมจิ (ตาม Unicode)]
export const CAREER_EMOJI_RULES = [
  [/ทันต/, "Tooth"],
  [/สัตวแพทย์|สัตว์(?!น้ำ)|ปศุสัตว์/, "Paw prints"],
  [/ฉุกเฉิน|กู้ภัย|Paramedic|ช่วยชีวิต/, "Ambulance"],
  [/รังสี|X-ray/i, "X-ray"],
  [/เภสัช|ร้านยา|พัฒนายา/, "Pill"],
  [/เทคนิคการแพทย์|ห้องปฏิบัติการ/, "Scientist"],
  [/สาธารณสุข|ส่งเสริมสุขภาพ/, "Health worker"],
  [/ภัยพิบัติ|สาธารณภัย/, "Safety vest"],
  [/พยาบาล|แพทย์|กายภาพ|กิจกรรมบำบัด|ฟื้นฟู|อาชีวอนามัย/, "Health worker"],
  [/เวชระเบียน|เวชสถิติ|สารสนเทศโรงพยาบาล/, "Clipboard"],
  [/โภชนา|กำหนดอาหาร|เชฟ|อาหาร/, "Cook"],
  [/จิตวิทยา|ให้คำปรึกษา/, "Brain"],
  [/ครู|อาจารย์|ศึกษานิเทศก์|ผู้ช่วยสอน|หลักสูตร|การศึกษา|e-Learning/, "Teacher"],
  [/ผู้ฝึกสอนกีฬา|โค้ช|กีฬา|นันทนาการ/, "Sports medal"],
  [/นักบิน|การบิน|อากาศยาน|จราจรทางอากาศ/, "Pilot"],
  [/ทนาย|อัยการ|กฎหมาย/, "Balance scale"],
  [/การทูต|ข้าราชการ|เจ้าหน้าที่รัฐ|นโยบาย|การเมือง|ราชการ/, "Classical building"],
  [/บัญชี|ภาษี|Auditor/i, "Abacus"],
  [/การเงิน|ธนาคาร|ลงทุน|ประกันภัย|Actuary/i, "Money bag"],
  [/เกม/, "Video game"],
  [/แอนิเมชัน|ภาพยนตร์|ผู้กำกับ|ตัดต่อ|วิดีโอ|โปรดิวเซอร์/, "Clapper board"],
  [/นักแสดง|นักเต้น|นาฏศิลป์|การแสดง/, "Performing arts"],
  [/นักดนตรี|นักแต่งเพลง|ดนตรี|นักร้อง|ศิลปิน/, "Musical notes"],
  [/นักข่าว|บรรณาธิการ|นักเขียน/, "Newspaper"],
  [/แปล|ล่าม|ภาษา/, "Globe with meridians"],
  [/บรรณารักษ์|สารสนเทศ|คลังข้อมูล|จัดการเนื้อหา/, "Books"],
  [/เครื่องประดับ|อัญมณี/, "Gem stone"],
  [/เสื้อผ้า|แฟชั่น|สไตลิสต์/, "Dress"],
  [/ตกแต่งภายใน|ภายใน|เฟอร์นิเจอร์/, "Couch and lamp"],
  [/บรรจุภัณฑ์|ผลิตภัณฑ์/, "Package"],
  [/งานพิมพ์|สิ่งพิมพ์/, "Printer"],
  [/สถาปนิก|ผังเมือง/, "Triangular ruler"],
  [/UX|UI|หน้าจอ|ดิจิทัล/, "Mobile phone"],
  [/โยธา|ก่อสร้าง/, "Building construction"],
  [/ไฟฟ้า|พลังงาน|ระบบควบคุม/, "High voltage"],
  [/เครื่องกล|ยานยนต์|ซ่อม|เครื่องจักร|ช่าง/, "Mechanic"],
  [/ป่าไม้|อนุรักษ์|นิเวศ|สิ่งแวดล้อม/, "Evergreen tree"],
  [/ประมง|ทะเล|สัตว์น้ำ|เพาะเลี้ยง/, "Fish"],
  [/กราฟิก|Art Director|ภาพประกอบ|จิตรกร|ครีเอทีฟ|ออกแบบ|Technical Artist/i, "Artist"],
  [/ซอฟต์แวร์|นักพัฒนา(?:ซอฟต์แวร์|ระบบ|แอป)|โปรแกรม|Data|AI|Machine Learning|ข้อมูล|ระบบ|เครือข่าย|ฐานข้อมูล|คอมพิวเตอร์|มัลติมีเดีย|สมองกล/i, "Technologist"],
  [/ความปลอดภัย|จป/, "Safety vest"],
  [/การผลิต|คุณภาพ|QC|โรงงาน|อุตสาหการ/i, "Factory"],
  [/โลจิสติกส์|คลังสินค้า|ห่วงโซ่อุปทาน|ส่งออก|นำเข้า|การค้าระหว่างประเทศ/, "Delivery truck"],
  [/เกษตร|พืช|ฟาร์ม/, "Farmer"],
  [/นักเคมี|นักวิทยาศาสตร์|นักวิจัย|ห้องปฏิบัติการ|เทคนิคการแพทย์|เทคโนโลยีชีวภาพ|พันธุศาสตร์|ชีว/, "Scientist"],
  [/สถิติ|เศรษฐ|วิเคราะห์|ระบาดวิทยา/, "Chart increasing"],
  [/โรงแรม|ท่องเที่ยว/, "Hotel"],
  [/อีเวนต์|Event|จัดงาน|การประชุม|นิทรรศการ/i, "Party popper"],
  [/การตลาด|แบรนด์|โฆษณา|ประชาสัมพันธ์|คอนเทนต์|สื่อสารองค์กร/, "Megaphone"],
  [/สังคมสงเคราะห์|ชุมชน|มูลนิธิ|สวัสดิการ|สังคม/, "Handshake"],
  [/บุคคล|HR|สรรหา|พัฒนาองค์กร/i, "Office worker"],
  [/ผู้จัดการ|ผู้ประกอบการ|ที่ปรึกษา|บริหาร|Business/i, "Briefcase"],
];
// รูปสำรองตามด้านหลักของสาขา
export const DIM_FALLBACK_EMOJI = { R: "Hammer and wrench", I: "Microscope", A: "Artist palette", S: "Handshake", E: "Briefcase", C: "Card file box" };

// รหัส Unicode ของแต่ละอิโมจิ = ชื่อไฟล์ใน Twemoji
export const EMOJI_CODE = {
  Tooth: "1f9b7", "Paw prints": "1f43e", Ambulance: "1f691", "X-ray": "1fa7b", Pill: "1f48a",
  Scientist: "1f9d1-200d-1f52c", "Health worker": "1f9d1-200d-2695-fe0f", "Safety vest": "1f9ba", Clipboard: "1f4cb",
  Cook: "1f9d1-200d-1f373", Brain: "1f9e0", Teacher: "1f9d1-200d-1f3eb", "Sports medal": "1f3c5",
  Pilot: "1f9d1-200d-2708-fe0f", "Balance scale": "2696", "Classical building": "1f3db", Abacus: "1f9ee",
  "Money bag": "1f4b0", "Video game": "1f3ae", "Clapper board": "1f3ac", "Performing arts": "1f3ad",
  "Musical notes": "1f3b6", Newspaper: "1f4f0", "Globe with meridians": "1f310", Books: "1f4da",
  "Gem stone": "1f48e", Dress: "1f457", "Couch and lamp": "1f6cb", Package: "1f4e6", Printer: "1f5a8",
  "Triangular ruler": "1f4d0", "Mobile phone": "1f4f1", "Building construction": "1f3d7", "High voltage": "26a1",
  Mechanic: "1f9d1-200d-1f527", "Evergreen tree": "1f332", Fish: "1f41f", Artist: "1f9d1-200d-1f3a8",
  Technologist: "1f9d1-200d-1f4bb", Factory: "1f3ed", "Delivery truck": "1f69a", Farmer: "1f9d1-200d-1f33e",
  "Chart increasing": "1f4c8", Hotel: "1f3e8", "Party popper": "1f389", Megaphone: "1f4e3", Handshake: "1f91d",
  "Office worker": "1f9d1-200d-1f4bc", Briefcase: "1f4bc", "Hammer and wrench": "1f6e0", Microscope: "1f52c",
  "Artist palette": "1f3a8", "Card file box": "1f5c3",
};
export const emojiFile = (name) => `/emoji/twemoji/${EMOJI_CODE[name]}.svg`;
// ชื่ออิโมจิทั้งหมดที่ใช้ (ให้สคริปต์ดาวน์โหลด)
export const ALL_EMOJI = [...new Set([...CAREER_EMOJI_RULES.map(([, name]) => name), ...Object.values(DIM_FALLBACK_EMOJI)])];

export const careerEmoji = (title, dim) => {
  const hit = CAREER_EMOJI_RULES.find(([re]) => re.test(title || ""));
  const name = hit ? hit[1] : DIM_FALLBACK_EMOJI[dim] || "Briefcase";
  return { name, src: emojiFile(name) };
};

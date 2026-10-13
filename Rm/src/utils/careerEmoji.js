// รูปอิโมจิประกอบอาชีพ — Microsoft Fluent Emoji (3D, MIT License: github.com/microsoft/fluentui-emoji)
// ไฟล์รูปเก็บในเว็บเองที่ public/emoji/fluent/ (ดาวน์โหลดด้วย scripts/fetch-fluent-emoji.mjs) ไม่โหลดจากเว็บภายนอกตอนใช้งาน
// จับคู่จากคำในชื่ออาชีพ (เรียงจากเฉพาะเจาะจง → ทั่วไป) ไม่พบ = ใช้รูปตามด้านหลักของสาขา

// [รูปแบบคำในชื่ออาชีพ, ชื่ออิโมจิใน Fluent, มีสีผิว (ใช้แบบ Default)]
export const CAREER_EMOJI_RULES = [
  [/ทันต/, "Tooth"],
  [/สัตวแพทย์|สัตว์(?!น้ำ)|ปศุสัตว์/, "Paw prints"],
  [/ฉุกเฉิน|กู้ภัย|Paramedic|ช่วยชีวิต/, "Ambulance"],
  [/รังสี|X-ray/i, "X-ray"],
  [/เภสัช|ร้านยา|พัฒนายา/, "Pill"],
  [/เทคนิคการแพทย์|ห้องปฏิบัติการ/, "Scientist", true],
  [/สาธารณสุข|ส่งเสริมสุขภาพ/, "Health worker", true],
  [/ภัยพิบัติ|สาธารณภัย/, "Safety vest"],
  [/พยาบาล|แพทย์|กายภาพ|กิจกรรมบำบัด|ฟื้นฟู|อาชีวอนามัย/, "Health worker", true],
  [/เวชระเบียน|เวชสถิติ|สารสนเทศโรงพยาบาล/, "Clipboard"],
  [/โภชนา|กำหนดอาหาร|เชฟ|อาหาร/, "Cook", true],
  [/จิตวิทยา|ให้คำปรึกษา/, "Brain"],
  [/ครู|อาจารย์|ศึกษานิเทศก์|ผู้ช่วยสอน|หลักสูตร|การศึกษา|e-Learning/, "Teacher", true],
  [/ผู้ฝึกสอนกีฬา|โค้ช|กีฬา|นันทนาการ/, "Sports medal"],
  [/นักบิน|การบิน|อากาศยาน|จราจรทางอากาศ/, "Pilot", true],
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
  [/เครื่องกล|ยานยนต์|ซ่อม|เครื่องจักร|ช่าง/, "Mechanic", true],
  [/ป่าไม้|อนุรักษ์|นิเวศ|สิ่งแวดล้อม/, "Evergreen tree"],
  [/ประมง|ทะเล|สัตว์น้ำ|เพาะเลี้ยง/, "Fish"],
  [/กราฟิก|Art Director|ภาพประกอบ|จิตรกร|ครีเอทีฟ|ออกแบบ|Technical Artist/i, "Artist", true],
  [/ซอฟต์แวร์|นักพัฒนา(?:ซอฟต์แวร์|ระบบ|แอป)|โปรแกรม|Data|AI|Machine Learning|ข้อมูล|ระบบ|เครือข่าย|ฐานข้อมูล|คอมพิวเตอร์|มัลติมีเดีย|สมองกล/i, "Technologist", true],
  [/ความปลอดภัย|จป/, "Safety vest"],
  [/การผลิต|คุณภาพ|QC|โรงงาน|อุตสาหการ/i, "Factory"],
  [/โลจิสติกส์|คลังสินค้า|ห่วงโซ่อุปทาน|ส่งออก|นำเข้า|การค้าระหว่างประเทศ/, "Delivery truck"],
  [/เกษตร|พืช|ฟาร์ม/, "Farmer", true],
  [/นักเคมี|นักวิทยาศาสตร์|นักวิจัย|ห้องปฏิบัติการ|เทคนิคการแพทย์|เทคโนโลยีชีวภาพ|พันธุศาสตร์|ชีว/, "Scientist", true],
  [/สถิติ|เศรษฐ|วิเคราะห์|ระบาดวิทยา/, "Chart increasing"],
  [/โรงแรม|ท่องเที่ยว/, "Hotel"],
  [/อีเวนต์|Event|จัดงาน|การประชุม|นิทรรศการ/i, "Party popper"],
  [/การตลาด|แบรนด์|โฆษณา|ประชาสัมพันธ์|คอนเทนต์|สื่อสารองค์กร/, "Megaphone"],
  [/สังคมสงเคราะห์|ชุมชน|มูลนิธิ|สวัสดิการ|สังคม/, "Handshake"],
  [/บุคคล|HR|สรรหา|พัฒนาองค์กร/i, "Office worker", true],
  [/ผู้จัดการ|ผู้ประกอบการ|ที่ปรึกษา|บริหาร|Business/i, "Briefcase"],
];
// รูปสำรองตามด้านหลักของสาขา
export const DIM_FALLBACK_EMOJI = { R: "Hammer and wrench", I: "Microscope", A: "Artist palette", S: "Handshake", E: "Briefcase", C: "Card file box" };

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
export const emojiFile = (name) => `/emoji/fluent/${slug(name)}.png`;
// ชื่ออิโมจิทั้งหมดที่ใช้ (ให้สคริปต์ดาวน์โหลด) พร้อมบอกว่ามีสีผิวหรือไม่
export const ALL_EMOJI = [
  ...CAREER_EMOJI_RULES.map(([, name, skin]) => [name, Boolean(skin)]),
  ...Object.values(DIM_FALLBACK_EMOJI).map((name) => [name, false]),
];

export const careerEmoji = (title, dim) => {
  const hit = CAREER_EMOJI_RULES.find(([re]) => re.test(title || ""));
  const name = hit ? hit[1] : DIM_FALLBACK_EMOJI[dim] || "Briefcase";
  return { name, src: emojiFile(name) };
};

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";
import { getGoals } from "../../callapi/callapi_user.jsx";
import { getCurrentUser } from "../../utils/auth.js";

const resultsData = [
  { code: "R", skill: "Realistic", score: 12, description: "ชอบงานลงมือทำ", detail: "ชอบงานที่ใช้มือหรือเครื่องมือจริง เห็นผลลัพธ์ชัดเจน เช่น งานช่าง ภาคสนาม หรือสร้างของจริง" },
  { code: "I", skill: "Investigative", score: 18, description: "ชอบคิดวิเคราะห์", detail: "ชอบตั้งคำถาม ทดลอง และค้นหาคำตอบอย่างมีเหตุผล เหมาะกับงานวิทยาศาสตร์ เทคโนโลยี หรือวิจัย" },
  { code: "A", skill: "Artistic", score: 15, description: "ชอบสร้างสรรค์", detail: "รักอิสระทางความคิด ชอบแสดงออกและใช้จินตนาการ เช่น ศิลปะ ดนตรี หรือออกแบบ" },
  { code: "S", skill: "Social", score: 20, description: "ชอบช่วยเหลือผู้อื่น", detail: "มีมนุษยสัมพันธ์ดี ชอบทำงานกับคนอื่น ให้คำแนะนำหรือช่วยเหลือ เหมาะกับการสอนและดูแลผู้อื่น" },
  { code: "E", skill: "Enterprising", score: 17, description: "ชอบเป็นผู้นำ", detail: "มั่นใจ กล้าแสดงออก ชอบโน้มน้าวและตัดสินใจ เหมาะกับงานบริหาร การขาย หรือจัดการโครงการ" },
  { code: "C", skill: "Conventional", score: 10, description: "ชอบความเป็นระเบียบ", detail: "ชอบงานที่มีระบบและขั้นตอนชัดเจน รอบคอบ เหมาะกับงานธุรการ บัญชี หรือจัดการข้อมูล" },
];

const colorMap = {
  R: ["from-red-300", "to-red-500"],
  I: ["from-blue-300", "to-blue-500"],
  A: ["from-yellow-300", "to-yellow-400"],
  S: ["from-green-300", "to-green-400"],
  E: ["from-purple-300", "to-purple-500"],
  C: ["from-gray-300", "to-gray-400"],
};

const BADGE_MAP = {
  R: { emoji: "🔧", title: "นักปฏิบัติ" },
  I: { emoji: "🔬", title: "นักคิดวิเคราะห์" },
  A: { emoji: "🎨", title: "นักสร้างสรรค์" },
  S: { emoji: "🤝", title: "นักช่วยเหลือ" },
  E: { emoji: "🎯", title: "ผู้นำ" },
  C: { emoji: "🗂️", title: "นักจัดระเบียบ" },
};

const CAREER_MAP = {
  R: [{ emoji: "🔧", title: "ช่างเทคนิค" }, { emoji: "🌾", title: "นักเกษตรศาสตร์" }, { emoji: "🏗️", title: "วิศวกรโยธา" }],
  I: [{ emoji: "🧑‍🔬", title: "นักวิจัย" }, { emoji: "🧑‍💻", title: "Data Analyst" }, { emoji: "👨‍⚕️", title: "แพทย์" }],
  A: [{ emoji: "🎨", title: "นักออกแบบ" }, { emoji: "🎵", title: "นักดนตรี" }, { emoji: "✍️", title: "นักเขียน" }],
  S: [{ emoji: "👩‍🏫", title: "ครู" }, { emoji: "👩‍⚕️", title: "พยาบาล" }, { emoji: "🧑‍💼", title: "HR" }],
  E: [{ emoji: "👩‍⚖️", title: "นักกฎหมาย" }, { emoji: "📈", title: "นักการตลาด" }, { emoji: "🧑‍💼", title: "ผู้จัดการ" }],
  C: [{ emoji: "📊", title: "นักบัญชี" }, { emoji: "🗂️", title: "ธุรการ" }, { emoji: "💰", title: "นักการเงิน" }],
};

const FACULTY_MAP = {
  R: [{ name: "คณะวิศวกรรมศาสตร์", universities: ["มหาวิทยาลัยขอนแก่น", "จุฬาลงกรณ์มหาวิทยาลัย"], scoreNote: "เน้น TGAT + TPAT3" }],
  I: [
    { name: "คณะวิทยาศาสตร์", universities: ["มหาวิทยาลัยมหิดล", "มหาวิทยาลัยเชียงใหม่"], scoreNote: "เน้น TGAT + A-Level วิทย์/คณิต" },
    { name: "คณะแพทยศาสตร์", universities: ["มหาวิทยาลัยขอนแก่น", "จุฬาลงกรณ์มหาวิทยาลัย"], scoreNote: "เน้น TPAT1 + A-Level" },
  ],
  A: [{ name: "คณะศิลปกรรมศาสตร์", universities: ["จุฬาลงกรณ์มหาวิทยาลัย", "มหาวิทยาลัยศิลปากร"], scoreNote: "เน้นแฟ้มสะสมผลงาน + สัมภาษณ์" }],
  S: [
    { name: "คณะครุศาสตร์ / ศึกษาศาสตร์", universities: ["มหาวิทยาลัยขอนแก่น", "จุฬาลงกรณ์มหาวิทยาลัย"], scoreNote: "เน้น TGAT + วิชาเฉพาะครู" },
    { name: "คณะพยาบาลศาสตร์", universities: ["มหาวิทยาลัยมหิดล", "มหาวิทยาลัยขอนแก่น"], scoreNote: "เน้น TPAT1 + A-Level วิทย์" },
  ],
  E: [{ name: "คณะบริหารธุรกิจ", universities: ["จุฬาลงกรณ์มหาวิทยาลัย", "มหาวิทยาลัยธรรมศาสตร์"], scoreNote: "เน้น TGAT + A-Level คณิต/อังกฤษ" }],
  C: [{ name: "คณะบัญชี", universities: ["จุฬาลงกรณ์มหาวิทยาลัย", "มหาวิทยาลัยขอนแก่น"], scoreNote: "เน้น TGAT + A-Level คณิต" }],
};

const ROADMAP = [
  { grade: "ม.4", items: ["ค้นหาความสนใจของตัวเอง", "ลองทำกิจกรรม/ชุมนุมหลากหลายด้าน", "เริ่มทำแบบทดสอบความถนัด"] },
  { grade: "ม.5", items: ["เลือกวิชาเรียนเสริมตามคณะที่สนใจ", "เริ่มทำ Portfolio", "ศึกษาคุณสมบัติของคณะ/มหาวิทยาลัย"] },
  { grade: "ม.6", items: ["เตรียมสอบ TGAT/TPAT/A-Level", "สมัคร TCAS ตามรอบ", "ปรึกษาครูแนะแนวเรื่องแผนสำรอง"] },
];

// วลีนามที่ใช้บรรยาย "จุดเด่น" ของแต่ละกลุ่มบุคลิกภาพ — สำหรับประโยคเปรียบเทียบกับเป้าหมาย (คนละชุดกับ description/detail ด้านบนที่ใช้โชว์การ์ดคะแนน)
const TRAIT_NOUN = {
  R: "การลงมือปฏิบัติจริง",
  I: "การคิดวิเคราะห์",
  A: "ความคิดสร้างสรรค์",
  S: "การช่วยเหลือและการสื่อสารกับผู้อื่น",
  E: "การเป็นผู้นำและการโน้มน้าวใจ",
  C: "ความเป็นระเบียบและความรอบคอบ",
};

// ฐานข้อมูลคณะที่พบบ่อย — ใช้จับคู่กับข้อความเป้าหมายอิสระที่นักเรียนพิมพ์เองในหน้า "เป้าหมายของฉัน" (goal.faculty_name)
// เรียงจากคณะที่ชื่อเจาะจง/ทับซ้อนกับคณะอื่นไปหาคณะทั่วไป (เช่น "สัตวแพทยศาสตร์"/"ทันตแพทยศาสตร์" ต้องเช็คก่อน "แพทยศาสตร์" เพราะมีคำว่า "แพทยศาสตร์" ซ้อนอยู่ในชื่อด้วย)
const FACULTY_PROFILES = [
  { match: ["ทันตแพทย", "ทันตะ"], name: "ทันตแพทยศาสตร์", types: ["I", "R", "S"],
    needText: "ความสนใจด้านวิทยาศาสตร์ ความละเอียดในการลงมือปฏิบัติ และการดูแลผู้ป่วยเป็นสำคัญ",
    tips: [
      { emoji: "🧬", text: "เสริมความรู้ด้าน ชีววิทยา" },
      { emoji: "🧪", text: "พัฒนาความรู้ด้าน เคมี" },
      { emoji: "✋", text: "ฝึกทักษะการลงมือปฏิบัติที่ต้องใช้ความละเอียด" },
      { emoji: "🦷", text: "เรียนรู้เกี่ยวกับ การดูแลสุขภาพช่องปากและวิชาชีพทันตแพทย์" },
    ] },
  { match: ["สัตวแพทย"], name: "สัตวแพทยศาสตร์", types: ["I", "R", "S"],
    needText: "ความสนใจด้านวิทยาศาสตร์ชีวภาพ ความรักสัตว์ และความอดทนในการดูแลรักษา",
    tips: [
      { emoji: "🧬", text: "เสริมความรู้ด้าน ชีววิทยา" },
      { emoji: "🐾", text: "หาประสบการณ์ดูแล/ใกล้ชิดสัตว์" },
      { emoji: "🔬", text: "เข้าร่วม กิจกรรมทางวิทยาศาสตร์" },
      { emoji: "🏥", text: "เรียนรู้เกี่ยวกับ การดูแลรักษาสัตว์และวิชาชีพสัตวแพทย์" },
    ] },
  { match: ["แพทยศาสตร์", "แพทย์"], name: "แพทยศาสตร์", types: ["I", "S"],
    needText: "ความสนใจด้านวิทยาศาสตร์ การวิเคราะห์ และการดูแลผู้ป่วยเป็นสำคัญ",
    tips: [
      { emoji: "🧬", text: "เสริมความรู้ด้าน ชีววิทยา" },
      { emoji: "🧪", text: "พัฒนาความรู้ด้าน เคมี" },
      { emoji: "🔬", text: "เข้าร่วม กิจกรรมทางวิทยาศาสตร์" },
      { emoji: "🏥", text: "เรียนรู้เกี่ยวกับ การดูแลผู้ป่วยและวิชาชีพแพทย์" },
    ] },
  { match: ["เภสัช"], name: "เภสัชศาสตร์", types: ["I", "C"],
    needText: "ความละเอียดรอบคอบด้านเคมีและวิทยาศาสตร์ รวมถึงความรับผิดชอบสูงเรื่องความปลอดภัยของยา",
    tips: [
      { emoji: "🧪", text: "พัฒนาความรู้ด้าน เคมี" },
      { emoji: "🧬", text: "เสริมความรู้ด้าน ชีววิทยา/สรีรวิทยา" },
      { emoji: "📋", text: "ฝึกความละเอียดรอบคอบในการทำงานตามขั้นตอน" },
      { emoji: "💊", text: "เรียนรู้เกี่ยวกับ ยาและระบบสาธารณสุข" },
    ] },
  { match: ["พยาบาล"], name: "พยาบาลศาสตร์", types: ["S", "I"],
    needText: "ความเห็นอกเห็นใจ ความอดทน และความสนใจด้านวิทยาศาสตร์สุขภาพ",
    tips: [
      { emoji: "🩺", text: "หาประสบการณ์ช่วยเหลือ/ดูแลผู้อื่น" },
      { emoji: "🧬", text: "เสริมความรู้ด้าน ชีววิทยา" },
      { emoji: "🤝", text: "ฝึกทักษะการสื่อสารและการรับฟัง" },
      { emoji: "🏥", text: "เรียนรู้เกี่ยวกับ ระบบการพยาบาลและงานโรงพยาบาล" },
    ] },
  { match: ["วิศวกรรม", "วิศวะ"], name: "วิศวกรรมศาสตร์", types: ["R", "I"],
    needText: "ความสนใจด้านคณิตศาสตร์ กลไก และการแก้ปัญหาเชิงเทคนิค",
    tips: [
      { emoji: "🔧", text: "ฝึกลงมือประกอบ/ซ่อมแซมสิ่งของจริง" },
      { emoji: "📐", text: "เสริมความรู้ด้าน คณิตศาสตร์และฟิสิกส์" },
      { emoji: "💻", text: "ลองเขียนโปรแกรมหรือใช้ซอฟต์แวร์เชิงวิศวกรรมเบื้องต้น" },
      { emoji: "🏗️", text: "เข้าร่วมกิจกรรมประกวดสิ่งประดิษฐ์/หุ่นยนต์" },
    ] },
  { match: ["คอมพิวเตอร์", "ไอที", "เทคโนโลยีสารสนเทศ"], name: "วิทยาการคอมพิวเตอร์", types: ["I", "R"],
    needText: "ความสนใจด้านตรรกะ การแก้ปัญหา และเทคโนโลยี",
    tips: [
      { emoji: "💻", text: "ฝึกเขียนโปรแกรมเบื้องต้น" },
      { emoji: "🧩", text: "ฝึกแก้โจทย์เชิงตรรกะ/คณิตศาสตร์" },
      { emoji: "🤖", text: "เข้าร่วมกิจกรรมด้านเทคโนโลยี/แฮกกาธอน" },
      { emoji: "📊", text: "เรียนรู้พื้นฐานข้อมูลและระบบคอมพิวเตอร์" },
    ] },
  { match: ["สถาปัตย"], name: "สถาปัตยกรรมศาสตร์", types: ["A", "R"],
    needText: "จินตนาการเชิงพื้นที่ ความคิดสร้างสรรค์ และความสนใจด้านการออกแบบ",
    tips: [
      { emoji: "✏️", text: "ฝึกวาดภาพและออกแบบเชิงพื้นที่" },
      { emoji: "🏛️", text: "ศึกษางานสถาปัตยกรรมที่สนใจ" },
      { emoji: "📐", text: "เสริมความรู้ด้าน คณิตศาสตร์และฟิสิกส์" },
      { emoji: "💡", text: "ทำแฟ้มสะสมผลงานด้านการออกแบบ" },
    ] },
  { match: ["ศิลปกรรม", "วิจิตรศิลป์", "ออกแบบ"], name: "ศิลปกรรมศาสตร์", types: ["A"],
    needText: "ความคิดสร้างสรรค์ จินตนาการ และความสนใจด้านศิลปะ/การออกแบบ",
    tips: [
      { emoji: "🎨", text: "ฝึกฝนทักษะศิลปะ/การออกแบบอย่างสม่ำเสมอ" },
      { emoji: "🖼️", text: "ทำแฟ้มสะสมผลงานศิลปะ" },
      { emoji: "🎭", text: "เข้าร่วมกิจกรรมสร้างสรรค์ต่างๆ" },
      { emoji: "💡", text: "ทดลองเทคนิคหรือสื่อใหม่ๆ" },
    ] },
  { match: ["นิเทศ", "วารสาร"], name: "นิเทศศาสตร์", types: ["A", "E"],
    needText: "ความคิดสร้างสรรค์ การสื่อสาร และความมั่นใจในการนำเสนอ",
    tips: [
      { emoji: "🎤", text: "ฝึกพูดนำเสนอต่อหน้าคนหมู่มาก" },
      { emoji: "✍️", text: "ฝึกเขียนเนื้อหา/สร้างสื่อ" },
      { emoji: "🎬", text: "ลองผลิตสื่อ ภาพ หรือวิดีโอ" },
      { emoji: "📱", text: "ติดตามแนวโน้มสื่อและการตลาดยุคใหม่" },
    ] },
  { match: ["ครุศาสตร์", "ศึกษาศาสตร์"], name: "ครุศาสตร์ / ศึกษาศาสตร์", types: ["S"],
    needText: "ความเห็นอกเห็นใจ ความอดทน และความสนใจในการสอน/พัฒนาผู้อื่น",
    tips: [
      { emoji: "🧑‍🏫", text: "ลองเป็นผู้ช่วยสอนหรือติวให้เพื่อน" },
      { emoji: "🤝", text: "ฝึกฟังและเข้าใจผู้อื่น" },
      { emoji: "🎯", text: "เข้าร่วมกิจกรรมจิตอาสา" },
      { emoji: "📚", text: "ศึกษาวิธีการสอนและจิตวิทยาการเรียนรู้" },
    ] },
  { match: ["นิติศาสตร์", "กฎหมาย"], name: "นิติศาสตร์", types: ["E", "C"],
    needText: "ความละเอียดรอบคอบ ตรรกะ และความมั่นใจในการโต้แย้ง/นำเสนอเหตุผล",
    tips: [
      { emoji: "⚖️", text: "ฝึกวิเคราะห์เหตุผลและโต้แย้งอย่างมีหลักการ" },
      { emoji: "📖", text: "อ่านข่าว/กรณีศึกษาด้านกฎหมาย" },
      { emoji: "🗣️", text: "ฝึกพูดนำเสนอต่อหน้าคนหมู่มาก" },
      { emoji: "📝", text: "ฝึกเขียนเชิงวิเคราะห์อย่างเป็นระบบ" },
    ] },
  { match: ["รัฐศาสตร์"], name: "รัฐศาสตร์", types: ["E", "S"],
    needText: "ความสนใจด้านสังคม การเมือง และการเป็นผู้นำ",
    tips: [
      { emoji: "🗳️", text: "ติดตามข่าวสารสังคม/การเมือง" },
      { emoji: "🗣️", text: "ฝึกพูดนำเสนอและโต้วาที" },
      { emoji: "🤝", text: "เข้าร่วมกิจกรรมเพื่อสังคม/ผู้นำนักเรียน" },
      { emoji: "📚", text: "ศึกษาโครงสร้างสังคมและการปกครอง" },
    ] },
  { match: ["บริหารธุรกิจ", "การจัดการ", "บริหาร"], name: "บริหารธุรกิจ", types: ["E"],
    needText: "ความมั่นใจ ทักษะการนำเสนอ และความสนใจด้านธุรกิจ/การบริหาร",
    tips: [
      { emoji: "💼", text: "ลองทำโครงการ/ธุรกิจจำลองเล็กๆ" },
      { emoji: "🗣️", text: "ฝึกพูดนำเสนอต่อหน้าคนหมู่มาก" },
      { emoji: "📊", text: "ศึกษาข้อมูลตลาดและการบริหารเบื้องต้น" },
      { emoji: "🤝", text: "ฝึกทำงานเป็นทีมและความเป็นผู้นำ" },
    ] },
  { match: ["บัญชี"], name: "บัญชี", types: ["C"],
    needText: "ความละเอียดรอบคอบ ความชอบตัวเลข และความเป็นระบบระเบียบ",
    tips: [
      { emoji: "🔢", text: "ฝึกทำโจทย์คณิตศาสตร์/ตัวเลขให้คล่อง" },
      { emoji: "📋", text: "ฝึกจัดระเบียบข้อมูลอย่างเป็นระบบ" },
      { emoji: "🧮", text: "ลองใช้โปรแกรมบัญชี/ตารางคำนวณเบื้องต้น" },
      { emoji: "✅", text: "ฝึกความละเอียดในการตรวจสอบความถูกต้อง" },
    ] },
  { match: ["เศรษฐศาสตร์"], name: "เศรษฐศาสตร์", types: ["I", "C"],
    needText: "ความสนใจด้านตัวเลข การวิเคราะห์ข้อมูล และแนวโน้มเศรษฐกิจ",
    tips: [
      { emoji: "📈", text: "ติดตามข่าวเศรษฐกิจและการเงิน" },
      { emoji: "🔢", text: "ฝึกวิเคราะห์ข้อมูลเชิงตัวเลข" },
      { emoji: "📊", text: "ฝึกอ่านและตีความกราฟ/สถิติ" },
      { emoji: "📚", text: "ศึกษาแนวคิดเศรษฐศาสตร์เบื้องต้น" },
    ] },
  { match: ["จิตวิทยา", "สังคมสงเคราะห์"], name: "จิตวิทยา / สังคมสงเคราะห์ศาสตร์", types: ["S", "I"],
    needText: "ความเข้าใจผู้อื่น ความเห็นอกเห็นใจ และความสนใจด้านพฤติกรรมมนุษย์",
    tips: [
      { emoji: "🧠", text: "อ่านเรื่องราวเกี่ยวกับพฤติกรรม/จิตวิทยาเบื้องต้น" },
      { emoji: "🤝", text: "ฝึกฟังและเข้าใจผู้อื่นอย่างลึกซึ้ง" },
      { emoji: "🎯", text: "เข้าร่วมกิจกรรมจิตอาสา/ช่วยเหลือสังคม" },
      { emoji: "📝", text: "ฝึกสังเกตและบันทึกพฤติกรรมรอบตัว" },
    ] },
  { match: ["เกษตร"], name: "เกษตรศาสตร์", types: ["R", "I"],
    needText: "ความสนใจด้านชีววิทยา ธรรมชาติ และการลงมือปฏิบัติจริง",
    tips: [
      { emoji: "🌱", text: "ลองปลูก/ดูแลพืชหรือสัตว์ด้วยตนเอง" },
      { emoji: "🧬", text: "เสริมความรู้ด้าน ชีววิทยา" },
      { emoji: "🔬", text: "เข้าร่วม กิจกรรมทางวิทยาศาสตร์" },
      { emoji: "🚜", text: "เรียนรู้เทคโนโลยีการเกษตรสมัยใหม่" },
    ] },
];

const findFacultyProfile = (facultyName) => {
  if (!facultyName) return null;
  return FACULTY_PROFILES.find((p) => p.match.some((kw) => facultyName.includes(kw))) || null;
};

// วัดระดับความสอดคล้อง: เทียบ RIASEC 3 อันดับแรกของนักเรียนกับกลุ่มที่คณะเป้าหมายต้องการ (เรียงตามความสำคัญ)
const computeAlignmentLevel = (top3Codes, profile) => {
  const matched = profile.types.filter((t) => top3Codes.includes(t));
  if (matched.length === 0) return "low";
  const topTypeIsStudentTop2 = profile.types[0] === top3Codes[0] || profile.types[0] === top3Codes[1];
  if (topTypeIsStudentTop2 || matched.length >= 2) return "high";
  return "medium";
};

const ALIGNMENT_META = {
  high: { label: "สูง", cls: "text-emerald-600" },
  medium: { label: "ปานกลาง", cls: "text-amber-600" },
  low: { label: "ต่ำ", cls: "text-red-600" },
};

const RADAR_SIZE = 280;

function RadarChart({ data }) {
  const cx = RADAR_SIZE / 2;
  const cy = RADAR_SIZE / 2;
  const r = 92;
  const n = data.length;
  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i, frac) => {
    const a = angleFor(i);
    return [cx + r * frac * Math.cos(a), cy + r * frac * Math.sin(a)];
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = data.map((d, i) => point(i, d.score / 20));
  const dataPath = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="w-full max-w-[280px] mx-auto">
      {rings.map((frac) => (
        <polygon
          key={frac}
          points={data.map((_, i) => point(i, frac).join(",")).join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
      })}
      <polygon points={dataPath} fill="#ec4899" fillOpacity="0.25" stroke="#ec4899" strokeWidth="2" />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#ec4899" />
      ))}
      {data.map((d, i) => {
        const [x, y] = point(i, 1.24);
        return (
          <text
            key={d.code}
            x={x}
            y={y}
            fontSize="12"
            fontWeight="700"
            fill="#374151"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {d.code}
          </text>
        );
      })}
    </svg>
  );
}

function SectionHeader({ emoji, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-9 w-9 rounded-xl bg-pink-500/10 text-[19px] flex items-center justify-center shrink-0">
        {emoji}
      </div>
      <div>
        <h2 className="text-[16.5px] font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-[13.5px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function GroupLabel({ children }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="text-[12.5px] font-semibold tracking-widest text-pink-500 uppercase whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-200/70" />
    </div>
  );
}

function Check({ children, tone = "pink" }) {
  const toneClass = tone === "emerald" ? "text-emerald-500" : "text-pink-500";
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 shrink-0 ${toneClass}`}>✓</span>
      <span>{children}</span>
    </li>
  );
}

const CARD = "bg-white/60 border border-white/60 backdrop-blur-xl p-5 rounded-2xl shadow-sm";

export default function ResultPage() {
  const [animatedWidth, setAnimatedWidth] = useState({});
  const [sentToTeacher, setSentToTeacher] = useState(false);
  // undefined = กำลังโหลด, null = ยังไม่ได้ตั้งเป้าหมาย, object = เป้าหมายล่าสุดของนักเรียนคนนี้
  const [myGoal, setMyGoal] = useState(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    resultsData.forEach((r, idx) => {
      setTimeout(() => {
        setAnimatedWidth((prev) => ({ ...prev, [r.code]: (r.score / 20) * 100 }));
      }, idx * 300);
    });
  }, []);

  useEffect(() => {
    const studentId = getCurrentUser()?.user_id;
    if (!studentId) { setMyGoal(null); return; }
    getGoals()
      .then((rows) => {
        const mine = (rows || [])
          .filter((g) => String(g.user_user_id) === String(studentId))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setMyGoal(mine[0] || null);
      })
      .catch((err) => { console.error("โหลดเป้าหมายของนักเรียนไม่สำเร็จ:", err); setMyGoal(null); });
  }, []);

  const sorted = useMemo(() => [...resultsData].sort((a, b) => b.score - a.score), []);
  const top3Codes = useMemo(() => sorted.slice(0, 3).map((d) => d.code), [sorted]);
  const headerAbbr = top3Codes.join("");
  const headerDesc = top3Codes
    .map((code) => {
      const r = resultsData.find((d) => d.code === code);
      return `${r.skill}: ${r.detail}`;
    })
    .join(", ");

  const top1 = resultsData.find((d) => d.code === top3Codes[0]);
  const top2 = resultsData.find((d) => d.code === top3Codes[1]);
  const quote = `คุณมีศักยภาพในการเป็น${BADGE_MAP[top1.code].title}ที่${top2 ? BADGE_MAP[top2.code].title.replace("นัก", "") : ""}ได้ดี พร้อมทั้ง${top1.description}และ${top2 ? top2.description : ""}`;

  const recommendedFaculties = useMemo(() => top3Codes.flatMap((c) => FACULTY_MAP[c] || []).slice(0, 3), [top3Codes]);
  const recommendedCareers = useMemo(() => {
    const seen = new Set();
    return top3Codes
      .flatMap((c) => CAREER_MAP[c] || [])
      .filter((c) => (seen.has(c.title) ? false : (seen.add(c.title), true)))
      .slice(0, 5);
  }, [top3Codes]);
  // ===== ความสอดคล้องกับเป้าหมาย — เทียบ RIASEC 3 อันดับแรกกับสิ่งที่คณะเป้าหมาย (ที่ตั้งไว้ที่หน้า "เป้าหมายของฉัน") ต้องการ =====
  const goalProfile = useMemo(() => findFacultyProfile(myGoal?.faculty_name), [myGoal]);
  const alignmentLevel = useMemo(
    () => (goalProfile ? computeAlignmentLevel(top3Codes, goalProfile) : null),
    [goalProfile, top3Codes]
  );
  const traitsText = useMemo(() => {
    const names = top3Codes.map((c) => TRAIT_NOUN[c]);
    if (names.length <= 1) return names.join("");
    return `${names.slice(0, -1).join(" ")} และ${names[names.length - 1]}`;
  }, [top3Codes]);
  const alignmentDetailText = useMemo(() => {
    if (!goalProfile) return null;
    return `คุณมีความโดดเด่นด้าน${traitsText} ขณะที่${goalProfile.name}ต้องการ${goalProfile.needText}`;
  }, [goalProfile, traitsText]);
  const closingAdviceText = useMemo(() => {
    if (!goalProfile || !alignmentLevel) return null;
    if (alignmentLevel === "high") {
      return `ผลการประเมินของคุณสอดคล้องกับเป้าหมาย${goalProfile.name}เป็นอย่างดี คุณมีจุดแข็งที่ตรงกับสิ่งที่สาขานี้ต้องการอยู่แล้ว ควรพัฒนาต่อยอดอย่างต่อเนื่องเพื่อความพร้อมสูงสุด`;
    }
    if (alignmentLevel === "medium") {
      return `ผลการประเมินของคุณมีความสอดคล้องกับเป้าหมาย${goalProfile.name}อยู่บ้าง ลองพัฒนาเพิ่มเติมในด้านที่แนะนำด้านล่าง เพื่อเสริมความพร้อมให้มากขึ้น`;
    }
    return `แม้ผลการประเมินจะไม่สอดคล้องกับเป้าหมาย${goalProfile.name}มากนัก แต่ไม่ได้หมายความว่าคุณไม่สามารถศึกษาต่อในสายนี้ได้ หากมีความตั้งใจ ควรเริ่มพัฒนาพื้นฐานตามคำแนะนำด้านล่าง และทดลองเข้าร่วมกิจกรรมที่เกี่ยวข้อง เพื่อสำรวจความสนใจและความพร้อมของตนเองเพิ่มเติม`;
  }, [goalProfile, alignmentLevel]);

  return (
    <div className="min-h-screen flex bg-white relative overflow-x-hidden">

      <Header />
      <SidebarNav />

      <div className="flex-1 overflow-x-hidden">
      <main className="w-full max-w-[1320px] mx-auto overflow-x-hidden px-6 md:px-8 pt-24 pb-10 flex flex-col gap-6 relative z-10">
          {/* background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-pink-300/40 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute top-1/3 -right-24 w-96 h-96 bg-rose-300/30 rounded-full blur-3xl animate-float-slow" />
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-fuchsia-200/30 rounded-full blur-3xl animate-float-slow" />

            <div className="absolute top-20 left-1/4 w-24 h-24 bg-yellow-300/50 rounded-full blur-2xl animate-float-slow" />
            <div className="absolute top-40 right-1/3 w-16 h-16 bg-sky-300/50 rounded-full blur-2xl animate-float-slow" />
            <div className="absolute bottom-32 left-20 w-20 h-20 bg-yellow-200/60 rounded-full blur-2xl animate-float-slow" />
            <div className="absolute bottom-20 right-16 w-28 h-28 bg-sky-200/50 rounded-full blur-3xl animate-float-slow" />
          </div>

          {/* Hero */}
          <div className={`w-full ${CARD} py-6 px-6 md:px-8`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-[12.5px] uppercase tracking-widest text-gray-400 font-medium">
                  ผลแบบทดสอบความถนัด RIASEC
                </p>
                <p className="text-3xl font-bold text-black mt-1">{headerAbbr}</p>
                <p className="text-[15.5px] mt-2 text-gray-600 max-w-md leading-6">{headerDesc}</p>
              </div>

              <div className="flex gap-2 flex-wrap md:flex-col md:items-end">
                {top3Codes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1.5 text-[13.5px] font-medium shadow-sm"
                  >
                    <span>{BADGE_MAP[code].emoji}</span>
                    {BADGE_MAP[code].title}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-[14.5px] mt-5 pt-4 border-t border-gray-200/70 italic text-gray-600 leading-6">
              "{quote}"
            </p>
          </div>

          {/* ===== ผลการวิเคราะห์ ===== */}
          <div className="flex flex-col gap-6">
            <GroupLabel>ผลการวิเคราะห์</GroupLabel>

            {/* Score + Radar */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className={`md:w-1/2 ${CARD}`}>
                <SectionHeader emoji="📊" title="คะแนนแต่ละด้าน" />
                <div className="space-y-3">
                  {resultsData.map((r) => {
                    const [from, to] = colorMap[r.code];
                    const percent = Math.round((r.score / 20) * 100);
                    return (
                      <div key={r.code} className="flex items-center gap-3">
                        <div className="w-16 text-[13.5px]">{r.skill}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-[13.5px] mb-1">
                            <span>{r.description}</span>
                            <span className="font-semibold">{r.score}/20 • {percent}%</span>
                          </div>
                          <div className="w-full h-4 rounded-full bg-gray-200/50 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${from} ${to}`}
                              style={{ width: `${animatedWidth[r.code] || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`md:w-1/2 ${CARD}`}>
                <SectionHeader emoji="🕸️" title="ภาพรวม RIASEC" subtitle="เปรียบเทียบทั้ง 6 ด้านในภาพเดียว" />
                <RadarChart data={resultsData} />
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mt-3 text-[12.5px] text-gray-600">
                  {resultsData.map((r) => (
                    <div key={r.code} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${colorMap[r.code][0]} ${colorMap[r.code][1]}`} />
                      {r.code} · {r.skill}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Meaning */}
            <div className={CARD}>
              <SectionHeader emoji="📖" title="ความหมายของแต่ละด้าน" />
              <div className="grid sm:grid-cols-2 gap-2">
                {resultsData.map((r) => {
                  let bgColor = "bg-gray-50/60";

                  if (top3Codes.includes(r.code)) {
                    const topIndex = top3Codes.indexOf(r.code);
                    if (topIndex === 0) bgColor = "bg-pink-200/60";
                    else if (topIndex === 1) bgColor = "bg-sky-200/60";
                    else if (topIndex === 2) bgColor = "bg-yellow-200/60";
                  }

                  return (
                    <div key={r.code} className={`p-3 rounded-xl ${bgColor}`}>
                      <p className="font-medium text-[14.5px]">{r.skill}</p>
                      <p className="text-[13.5px] mt-0.5">{r.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths */}
            <div className={CARD}>
              <SectionHeader emoji="⭐" title="จุดเด่นของคุณ" />
              <div className="grid sm:grid-cols-3 gap-3">
                {top3Codes.map((code, i) => {
                  const r = resultsData.find((d) => d.code === code);
                  const medal = ["🥇", "🥈", "🥉"][i];
                  return (
                    <div key={code} className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-[20px]">{medal}</div>
                      <div className="text-[13.5px] font-semibold mt-1">{r.skill}</div>
                      <div className="text-[12.5px] text-gray-500 mt-0.5">{r.score}/20</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== แนวทางการศึกษาต่อ ===== */}
          <div className="flex flex-col gap-6">
            <GroupLabel>แนวทางการศึกษาต่อ</GroupLabel>

            <div className="flex flex-col md:flex-row gap-6">
              <div className={`md:w-1/2 ${CARD}`}>
                <SectionHeader emoji="🎓" title="คณะที่เหมาะสม" />
                <div className="grid gap-3">
                  {recommendedFaculties.map((f, i) => (
                    <div key={i} className="bg-white/70 rounded-xl p-4">
                      <div className="text-[14.5px] font-semibold flex items-center gap-1.5">
                        <span className="text-pink-500">✔</span> {f.name}
                      </div>
                      <div className="text-[13.5px] text-gray-600 mt-1">เช่น {f.universities.join(", ")}</div>
                      <div className="text-[12.5px] text-gray-500 mt-1">{f.scoreNote}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`md:w-1/2 ${CARD}`}>
                <SectionHeader emoji="💼" title="อาชีพที่เหมาะกับคุณ" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {recommendedCareers.map((c, i) => (
                    <div key={i} className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-[22px]">{c.emoji}</div>
                      <div className="text-[13.5px] font-medium mt-1">{c.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ===== ความสอดคล้องกับเป้าหมาย + สิ่งที่ควรพัฒนา ===== */}
          <div className="flex flex-col gap-6">
            <div className={CARD}>
              <SectionHeader emoji="🎯" title="ความสอดคล้องกับเป้าหมาย" />
              {myGoal === undefined ? (
                <p className="text-[14.5px] text-gray-400">กำลังโหลด...</p>
              ) : !myGoal ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[14.5px] text-gray-500">ยังไม่ได้ตั้งเป้าหมาย ลองตั้งเป้าหมายก่อนเพื่อดูว่าผลการประเมินนี้สอดคล้องกับเป้าหมายของคุณแค่ไหน</p>
                  <button
                    type="button"
                    onClick={() => navigate("/studentgoal")}
                    className="shrink-0 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[13.5px] font-medium transition"
                  >
                    ไปตั้งเป้าหมาย
                  </button>
                </div>
              ) : !goalProfile ? (
                <p className="text-[14.5px] text-gray-600">
                  เป้าหมายของคุณคือ <span className="font-semibold">{myGoal.faculty_name}</span> — ระบบยังไม่มีข้อมูลเปรียบเทียบสำหรับคณะนี้โดยเฉพาะ ลองปรึกษาครูแนะแนวเพื่อดูความเหมาะสมเพิ่มเติมได้
                </p>
              ) : (
                <p className="text-[14.5px] leading-relaxed text-gray-700">
                  ผลการประเมินของคุณมีความสอดคล้องกับเป้าหมายในระดับ
                  <span className={`font-bold ${ALIGNMENT_META[alignmentLevel].cls}`}>{ALIGNMENT_META[alignmentLevel].label}</span>
                  <br />
                  {alignmentDetailText}
                </p>
              )}
            </div>

            {/* ===== สิ่งที่ควรพัฒนาเพื่อไปสู่เป้าหมาย (รวมคำแนะนำสำหรับคุณไว้ในการ์ดเดียวกัน) ===== */}
            {goalProfile && (
              <div className={`${CARD} border-pink-100 bg-pink-50/50`}>
                <SectionHeader emoji="🌱" title="สิ่งที่ควรพัฒนาเพื่อไปสู่เป้าหมาย" subtitle={`สำหรับเป้าหมาย: ${goalProfile.name}`} />
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {goalProfile.tips.map((tip, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-white/70 rounded-xl px-3.5 py-3">
                      <span className="text-[19px] shrink-0">{tip.emoji}</span>
                      <span className="text-[13.5px] text-gray-700">{tip.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[14.5px] text-gray-700 leading-relaxed mt-4 pt-4 border-t border-pink-100">{closingAdviceText}</p>
              </div>
            )}
          </div>

          {/* ===== แผนการเตรียมตัว ===== */}
          <div className="flex flex-col gap-6">
            <GroupLabel>แผนการเตรียมตัว</GroupLabel>

            <div className={CARD}>
              <SectionHeader emoji="🗺️" title="Roadmap การเตรียมตัว" />
              <div className="grid sm:grid-cols-3 gap-4">
                {ROADMAP.map((step) => (
                  <div key={step.grade} className="bg-white/70 rounded-xl p-4">
                    <div className="text-[15.5px] font-semibold text-pink-600">{step.grade}</div>
                    <ul className="mt-2 space-y-1.5 text-[13.5px] text-gray-700">
                      {step.items.map((it, i) => (
                        <Check key={i} tone="emerald">{it}</Check>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[13.5px] text-gray-500 px-1">
              <p>ผลนี้เป็นแนวทางเบื้องต้น ควรใช้ร่วมกับ:</p>
              <ul className="mt-1.5 space-y-1">
                <Check>ความสนใจส่วนตัว</Check>
                <Check>ความสามารถและผลการเรียน</Check>
                <Check>การปรึกษาครูแนะแนว</Check>
              </ul>
            </div>
          </div>

          {/* buttons */}
          <div className="flex justify-end gap-2 flex-wrap print:hidden pb-2">
            <button
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-500 text-[14.5px] font-medium hover:bg-gray-50 transition"
              onClick={() => window.print()}
            >
              พิมพ์ผล
            </button>
            {/* <button
              className={`px-4 py-2 rounded-xl text-[14.5px] font-medium transition ${
                sentToTeacher
                  ? "bg-emerald-100 text-emerald-600"
                  : "border border-sky-200 bg-white text-sky-600 hover:bg-sky-50"
              }`}
              onClick={() => setSentToTeacher(true)}
            >
              {sentToTeacher ? "✓ ส่งผลให้ครูแล้ว" : "ส่งผลให้ครู"}
            </button> */}
            <button
              className="px-5 py-2 rounded-xl bg-pink-500 text-white text-[14.5px] font-medium shadow-sm hover:bg-pink-600 transition"
              onClick={() => navigate("/aptitudeIntro")}
            >
              บันทึกผล
            </button>
          </div>

        </main>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(2px, -4px) scale(1.05); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>

    </div>
  );
}

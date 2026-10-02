// ส่งออก "ข้อมูลส่วนตัวของนักเรียน" เป็น PDF หน้า-หลัง ตามแบบฟอร์มกระดาษของโรงเรียนขอนแก่นวิทยายน
// ข้อมูลมาจาก student_general_info.form_data (ที่นักเรียนกรอกในหน้า /studentinfo) ช่องไหนไม่กรอกใส่ "-"
// วาดหน้าเป็นภาพด้วย html-to-image แล้วใส่ jsPDF (สระ/วรรณยุกต์ไทยถูกต้องเสมอ) — หลายคนแยกไฟล์รายคนแล้วรวมเป็น ZIP

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const isEmpty = (v) => v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

// ช่องกรอก (เส้นจุดไข่ปลา) — ว่างใส่ "-" (ความกว้างขั้นต่ำย่อลงให้แต่ละบรรทัดไม่ล้นเหมือนแบบฟอร์มจริง)
const FIELD_SCALE = 0.78;
const f = (v, w = 120, { money = false } = {}) => {
  let text = isEmpty(v) ? "-" : String(v).trim();
  if (money && !isEmpty(v) && !Number.isNaN(Number(v))) text = Number(v).toLocaleString("th-TH");
  return `<span class="f" style="min-width:${Math.round(w * FIELD_SCALE)}px">${esc(text)}</span>`;
};

// ตัวเลือก ( ✓ ) — selected: string หรือ array
const c = (label, selected) => {
  const on = Array.isArray(selected) ? selected.includes(label) : selected === label;
  return `<span class="c"><span class="box">(${on ? '<b class="tick">✓</b>' : "&nbsp;&nbsp;&nbsp;"})</span> ${esc(label)}</span>`;
};

const parseDob = (dob) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob || "");
  return m ? { d: Number(m[3]), m: THAI_MONTHS[Number(m[2]) - 1], y: Number(m[1]) + 543 } : {};
};

const parseThaiDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  if (m) return { d: Number(m[3]), m: Number(m[2]), y: Number(m[1]) + 543 };
  return {};
};

const stripGradePrefix = (v) => (isEmpty(v) ? "" : String(v).replace(/^ม\.?\s*/, ""));

// fd = form_data, fallback = ข้อมูลจากรายชื่อนักเรียน (ใช้ตอนนักเรียนยังไม่กรอกฟอร์ม)
const buildPages = (fd = {}, fallback = {}) => {
  const meta = fd.meta || {};
  const p = fd.personal || {};
  const ct = fd.contact || {};
  const ad = fd.address || {};
  const fam = fd.family || {};
  const fa = fam.father || {};
  const mo = fam.mother || {};
  const gu = fam.guardian || {};
  const ls = fd.living_situation || {};
  const ed = fd.education || {};
  const it = fd.interests || {};
  const he = fd.health || {};
  const pb = fd.prepared_by || {};
  const sib = (o) => o || {};
  const s1 = sib(fam.siblings_same_parents);
  const s2 = sib(fam.siblings_father_other);
  const s3 = sib(fam.siblings_mother_other);
  const dob = parseDob(p.dob);
  const prior = ed.prior_education || [];
  const priorRow = (level) => prior.find((r) => r.level === level) || {};
  const friends = [...(ed.close_friends || []), {}, {}].slice(0, 2);
  const ill = [...(he.illness_history || []), {}, {}].slice(0, 2);
  const top = [...(ed.top_score_subjects || []), "", ""];
  const low = [...(ed.low_score_subjects || []), "", ""];
  const careers = [...(it.interested_careers || []), "", "", ""];
  const signDate = parseThaiDate(pb.date);

  const firstName = p.first_name ?? fallback.firstName;
  const lastName = p.last_name ?? fallback.lastName;
  const grade = stripGradePrefix(meta.classroom) || fallback.grade;
  const room = meta.room ?? fallback.room;
  const roll = meta.roll_number ?? fallback.rollNumber;

  const page1 = `
  <div class="page">
    <div class="title-wrap">
      <div class="title">ข้อมูลส่วนตัวของนักเรียนชั้น ม. ${f(grade, 50)}/${f(room, 50)}</div>
      <div class="roll">เลขที่ ${f(roll, 50)}</div>
    </div>
    <div class="subtitle">โรงเรียนขอนแก่นวิทยายน &nbsp;ปีการศึกษา ${esc(meta.academic_year || "2569")}</div>
    <div class="para"><b>คำชี้แจง</b> &nbsp; ให้นักเรียนเติมข้อความในแบบสอบถามให้ตรงกับความเป็นจริงมากที่สุด การตอบตามความเป็นจริงจะเป็นประโยชน์แก่ตัวนักเรียนเอง และข้อมูลในแบบสอบถามนี้จะเก็บเป็นความลับ</div>
    <div class="h">ด้านที่ 1 ประวัติส่วนตัวและครอบครัว</div>
    <div class="q"><span class="n">1.</span>ข้าพเจ้าชื่อ${f(firstName, 150)}นามสกุล${f(lastName, 170)}ชื่อเล่น${f(p.nickname, 80)} ${p.consent === false ? "<s>ยินยอมให้</s> (ไม่ยินยอม)" : "ยินยอมให้"}งานแนะแนวเก็บรวบรวม ใช้ และ/หรือเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าที่งานแนะแนวมีอยู่หรือที่ข้าพเจ้าได้ให้หรือจะได้ให้กับงานแนะแนว ซึ่งครอบคลุมทั้ง 5 ด้าน ประกอบด้วย บริการศึกษาข้อมูลนักเรียนเป็นรายบุคคล บริการสนเทศ บริการให้การปรึกษา บริการจัดวางตัวบุคคล และบริการติดตามผล</div>
    <div class="l">นับถือศาสนา${f(p.religion, 90)}เชื้อชาติ${f(p.ethnicity, 90)}สัญชาติ${f(p.nationality, 230)}</div>
    <div class="l">เกิดวันที่${f(dob.d, 40)}เดือน${f(dob.m, 110)}พ.ศ.${f(dob.y, 70)}อายุ${f(p.age, 50)}ปี โทรศัพท์${f(ct.phone, 150)}</div>
    <div class="q"><span class="n">2.</span>ที่อยู่ปัจจุบันพักอยู่บ้านเลขที่${f(ad.house_no, 120)}ถนน${f(ad.road, 150)}ตำบล${f(ad.subdistrict, 120)}</div>
    <div class="l">อำเภอ${f(ad.district, 170)}จังหวัด${f(ad.province, 170)}โทรศัพท์${f(ct.address_phone, 150)}</div>
    <div class="q"><span class="n">3.</span>บิดาชื่อ${f(fa.first_name, 140)}นามสกุล${f(fa.last_name, 150)}อายุ${f(fa.age, 45)}ปี โทรศัพท์${f(fa.phone, 140)}</div>
    <div class="l">ระดับการศึกษาของบิดา${f(fa.education, 480)}</div>
    <div class="l">อาชีพ${f(fa.occupation, 240)}รายได้เฉลี่ยเดือนละ${f(fa.income, 190, { money: true })}บาท</div>
    <div class="l">สถานที่ทำงาน${f(fa.workplace, 300)}โทรศัพท์${f(fa.work_phone, 150)}</div>
    <div class="l">มารดาชื่อ${f(mo.first_name, 140)}นามสกุล${f(mo.last_name, 150)}อายุ${f(mo.age, 45)}ปี โทรศัพท์${f(mo.phone, 140)}</div>
    <div class="l">ระดับการศึกษาของมารดา${f(mo.education, 470)}</div>
    <div class="l">อาชีพ${f(mo.occupation, 240)}รายได้เฉลี่ยเดือนละ${f(mo.income, 190, { money: true })}บาท</div>
    <div class="l">สถานที่ทำงาน${f(mo.workplace, 300)}โทรศัพท์${f(mo.work_phone, 150)}</div>
    <div class="q"><span class="n">4.</span>สถานภาพสมรสของบิดามารดา ${["อยู่ด้วยกัน", "แยกกันอยู่", "หย่าร้าง", "บิดาสมรสใหม่"].map((o) => c(o, fam.parents_marital_status || [])).join("")}</div>
    <div class="l">${["บิดาถึงแก่กรรม", "มารดาสมรสใหม่", "มารดาถึงแก่กรรม"].map((o) => c(o, fam.parents_marital_status || [])).join("")}</div>
    <div class="q"><span class="n">5.</span>นักเรียนพักอาศัยอยู่กับ ${["บิดามารดา", "บิดา", "มารดา"].map((o) => c(o, fam.living_with)).join("")}</div>
    <div class="l">${["บิดาและมารดาเลี้ยง", "มารดาและบิดาเลี้ยง", "บิดามารดาบุญธรรม", "อื่นๆ"].map((o) => c(o, fam.living_with)).join("")}${fam.living_with === "อื่นๆ" ? f(fam.living_with_other, 100) : ""}</div>
    <div class="q"><span class="n">6.</span>ผู้ปกครองชื่อ${f(gu.first_name, 150)}นามสกุล${f(gu.last_name, 170)}อายุ${f(gu.age, 50)}ปี</div>
    <div class="l">เกี่ยวข้องกับนักเรียนโดยเป็น${f(gu.relation, 190)}โทรศัพท์${f(gu.phone, 150)}</div>
    <div class="l">อาชีพ${f(gu.occupation, 240)}รายได้เฉลี่ยเดือนละ${f(gu.income, 160, { money: true })}บาท</div>
    <div class="q"><span class="n">7.</span>นักเรียนมีพี่น้องที่เกิดจากบิดามารดาเดียวกัน${f(s1.total, 40)}คน ชาย${f(s1.male, 40)}คน หญิง${f(s1.female, 40)}คน นักเรียนเป็นบุตรลำดับที่${f(fam.birth_order, 40)}</div>
    <div class="l">นักเรียนมีพี่น้องที่เกิดจากบิดากับภรรยาคนอื่น${f(s2.total, 40)}คน ชาย${f(s2.male, 40)}คน หญิง${f(s2.female, 40)}คน</div>
    <div class="l">นักเรียนมีพี่น้องที่เกิดจากมารดากับสามีคนอื่น${f(s3.total, 40)}คน ชาย${f(s3.male, 40)}คน หญิง${f(s3.female, 40)}คน</div>
    <div class="q"><span class="n">8.</span>บุคคลในครอบครัว ที่นักเรียนรักและไว้ใจ<u>มากที่สุด</u>ในบ้าน คือ${f(ls.most_trusted_family_member, 280)}</div>
    <div class="q"><span class="n">9.</span>ลักษณะที่พักอาศัย ${c("บ้านตนเอง", ls.housing_type)}${c("บ้านเช่า", ls.housing_type)} มีห้องส่วนตัวหรือไม่ ${c("มี", ls.has_own_room)}${c("ไม่มี", ls.has_own_room)}</div>
    <div class="l">จำนวนสมาชิกที่อาศัยในบ้าน${f(ls.household_member_count, 50)}คน คือ${f(ls.household_members_description, 330)}</div>
    <div class="l">สภาพของชุมชน ${["ขโมยชุกชุม", "สงบสุขดี", "มีอาชญากรรมหรือปัญหาบ่อยๆ", "อื่นๆ"].map((o) => c(o, ls.community_condition || [])).join("")}${(ls.community_condition || []).includes("อื่นๆ") ? f(ls.community_condition_other, 90) : ""}</div>
    <div class="q"><span class="n">10.</span>บุคคลที่นักเรียนคิดว่ามีอิทธิพล<u>มากที่สุด</u>ในบ้าน คือ${f(ls.most_influential_person, 180)} บุคคลที่นักเรียนคิดว่ามีอิทธิพล<u>น้อยที่สุด</u>ในบ้าน คือ${f(ls.least_influential_person, 180)}</div>
    <div class="q"><span class="n">11.</span>ภาระหน้าที่ที่นักเรียน ${c("ไม่ต้องทำงานบ้าน", ls.household_chores)}${c("ต้องทำงานบ้าน", ls.household_chores)} คือ${f(ls.household_chores === "ต้องทำงานบ้าน" ? ls.chores_detail : "", 200)}</div>
    <div class="q"><span class="n">12.</span>เวลาที่นักเรียนจะออกนอกบ้านไม่ว่าเวลาใดก็ตาม ${c("ต้องขออนุญาต", ls.leave_permission)}${c("ไม่ต้องขออนุญาต", ls.leave_permission)}</div>
    <div class="q"><span class="n">13.</span>นักเรียนได้รับค่าใช้จ่ายประจำวันจาก${f(ls.allowance_source, 180)}ประมาณวันละ${f(ls.allowance_amount, 110, { money: true })}บาท</div>
    <div class="q"><span class="n">14.</span>ระยะทางจากบ้านมาโรงเรียน${f(ls.distance_km, 80)}กิโลเมตร ยานพาหนะที่ใช้เดินทางมาโรงเรียน</div>
    <div class="l">${["เดินเท้า", "รถจักรยานยนต์", "รถโดยสารประจำทาง", "ผู้ปกครองมาส่ง"].map((o) => c(o, ls.transport_method)).join("")} โดย${f(ls.transport_method === "ผู้ปกครองมาส่ง" ? ls.transport_other : "", 140)}</div>
    <div class="pageno">(1)</div>
  </div>`;

  const page2 = `
  <div class="page">
    <div class="h">ด้านที่ 2 ประวัติการศึกษา</div>
    <div class="q"><span class="n">1.</span>สำเร็จการศึกษาจากที่ใดมาก่อนแล้ว</div>
    <table class="tbl">
      <tr><th style="width:30%">ระดับชั้น</th><th>ชื่อสถานศึกษา</th><th style="width:22%">เกรดเฉลี่ย</th></tr>
      ${["ประถมศึกษาปีที่ 6", "มัธยมศึกษาปีที่ 3"]
        .map((lv) => {
          const r = priorRow(lv);
          return `<tr><td>${lv}</td><td class="v">${esc(isEmpty(r.school) ? "-" : r.school)}</td><td class="v center">${esc(isEmpty(r.gpa) ? "-" : r.gpa)}</td></tr>`;
        })
        .join("")}
    </table>
    <div class="q"><span class="n">2.</span>วิชาที่ชอบ<u>มากที่สุด</u> คือ${f(ed.favorite_subject, 200)}เพราะ${f(ed.favorite_subject_reason, 230)}</div>
    <div class="q"><span class="n">3.</span>วิชาที่ชอบ<u>น้อยที่สุด</u> คือ${f(ed.least_favorite_subject, 200)}เพราะ${f(ed.least_favorite_subject_reason, 230)}</div>
    <div class="q"><span class="n">4.</span>วิชาที่ได้คะแนน<u>มากที่สุด</u>คือ 1.${f(top[0], 200)} 2.${f(top[1], 200)}</div>
    <div class="q"><span class="n">5.</span>วิชาที่ได้คะแนน<u>น้อยสุด</u>คือ 1.${f(low[0], 210)} 2.${f(low[1], 200)}</div>
    <div class="q"><span class="n">6.</span>การมาโรงเรียน ${c("สม่ำเสมอ", ed.attendance)}${c("ขาดเรียนบ่อยๆ", ed.attendance)} เพราะ${f(ed.attendance === "ขาดเรียนบ่อยๆ" ? ed.attendance_reason : "", 220)}</div>
    <div class="q"><span class="n">7.</span>นักเรียน ${c("มีเวลาเพียงพอ", ed.homework_time)}สำหรับทำการบ้านและอ่านหนังสือ</div>
    <div class="l" style="padding-left:96px">${c("ไม่มีเวลา", ed.homework_time)} เพราะ${f(ed.homework_time === "ไม่มีเวลา" ? ed.homework_time_reason : "", 360)}</div>
    <div class="q"><span class="n">8.</span>เพื่อนสนิทของนักเรียน</div>
    ${friends
      .map(
        (fr) =>
          `<div class="l" style="padding-left:56px">➢ ชื่อ${f(fr.first_name, 150)}นามสกุล${f(fr.last_name, 160)}ชั้น${f(fr.classroom, 50)}โทรศัพท์${f(fr.phone, 120)}</div>`
      )
      .join("")}
    <div class="h">ด้านที่ 3 ความสนใจและแนวทางการประกอบอาชีพ</div>
    <div class="q"><span class="n">1.</span>งานอดิเรกของนักเรียน คือ${f(it.hobby, 480)}</div>
    <div class="q"><span class="n">2.</span>ความสามารถพิเศษ คือ${f(it.special_ability, 500)}</div>
    <div class="q"><span class="n">3.</span>ระดับการศึกษาที่นักเรียนจะเรียนให้จบชั้นสูงสุด คือ${f(it.student_edu_goal, 300)}</div>
    <div class="q"><span class="n">4.</span>ระดับการศึกษาที่ผู้ปกครองจะเรียนให้จบชั้นสูงสุด คือ${f(it.guardian_edu_goal, 290)}</div>
    <div class="q"><span class="n">5.</span>อาชีพที่นักเรียนสนใจ 1.${f(careers[0], 140)} 2.${f(careers[1], 140)} 3.${f(careers[2], 140)}</div>
    <div class="q"><span class="n">6.</span>อาชีพที่ผู้ปกครองคาดหวังให้นักเรียนเป็น คือ${f(it.guardian_expected_career, 330)}</div>
    <div class="h">ด้านที่ 4 ประวัติสุขภาพ</div>
    <div class="q"><span class="n">1.</span>นักเรียนเคยเจ็บป่วย หรือได้รับอุบัติเหตุร้ายแรง</div>
    ${ill
      .map(
        (h) =>
          `<div class="l" style="padding-left:96px">❖ ป่วยเพราะ (ระบุโรคหรือสาเหตุ) คือ${f(h.cause, 250)}เมื่ออายุ${f(h.age, 50)}ปี</div>`
      )
      .join("")}
    <div class="q"><span class="n">2.</span>โรคประจำตัวของนักเรียน (ถ้ามี)${f(he.chronic_disease, 190)}อาการเมื่อโรคกำเริบ${f(he.chronic_disease_symptoms, 170)}</div>
    <div class="q"><span class="n">3.</span>น้ำหนัก${f(he.weight_kg, 90)}กิโลกรัม ส่วนสูง${f(he.height_cm, 90)}เซนติเมตร</div>
    <div class="q"><span class="n">4.</span>ตามปกติข้าพเจ้านอนวันละ ${["4-6 ชั่วโมง", "6-8 ชั่วโมง", "8-10 ชั่วโมง"].map((o) => c(o, he.sleep_hours)).join("")}</div>
    <div class="sign">
      <div>ลงชื่อ${f(pb.name, 230)}ผู้กรอกข้อมูล</div>
      <div>ลงวันที่${f(signDate.d, 40)}/${f(signDate.m, 40)}/${f(signDate.y, 60)}</div>
    </div>
    <div class="pageno">(2)</div>
  </div>`;

  return { page1, page2 };
};

// @font-face ของ TH Sarabun New (ไฟล์อยู่ใน public/fonts) + CSS ของแบบฟอร์ม (ทุกตัวขึ้นต้นด้วย .sif ไม่ชนกับ CSS ของแอป)
const fontFaceCss = (base) => `
@font-face { font-family: 'TH Sarabun New'; src: url('${base}/THSarabunNew.ttf') format('truetype'); font-weight: 400; font-display: block; }
@font-face { font-family: 'TH Sarabun New'; src: url('${base}/THSarabunNew-Bold.ttf') format('truetype'); font-weight: 700; font-display: block; }`;

const FORM_CSS = `
    .sif, .sif * { box-sizing: border-box; }
    .sif { margin: 0; background: #fff; }
    .sif .page { width: 794px; height: 1123px; padding: 40px 48px 36px 56px; position: relative; overflow: hidden; background: #fff;
            font-family: 'TH Sarabun New', 'Tahoma', sans-serif; font-size: 20px; line-height: 1.16; color: #000; }
    .sif .title-wrap { position: relative; text-align: center; }
    .sif .title { font-weight: 700; font-size: 23px; }
    .sif .roll { position: absolute; right: 0; top: 0; border: 1.3px solid #111; padding: 0 10px; font-weight: 700; font-size: 20px; }
    .sif .subtitle { text-align: center; font-weight: 700; font-size: 22px; margin-bottom: 4px; }
    .sif .para { text-indent: 0; margin: 2px 0 2px; }
    .sif .h { font-weight: 700; margin-top: 6px; }
    .sif .q { padding-left: 28px; text-indent: -20px; margin-left: 12px; }
    .sif .q .n { display: inline-block; width: 20px; text-indent: 0; }
    .sif .l { padding-left: 40px; }
    .sif .f { display: inline-block; border-bottom: 1.2px dotted #333; text-align: center; padding: 0 4px; margin: 0 2px;
         color: #1e3a8a; font-weight: 700; line-height: 0.95; text-indent: 0; vertical-align: baseline; }
    .sif .c { margin-right: 11px; white-space: nowrap; }
    .sif .c .box { font-weight: 400; }
    .sif .tick { color: #1e3a8a; font-weight: 700; }
    .sif .tbl { border-collapse: collapse; width: calc(100% - 40px); margin: 4px 0 6px 40px; }
    .sif .tbl th, .sif .tbl td { border: 1.2px solid #111; padding: 3px 10px; text-align: left; }
    .sif .tbl th { text-align: center; font-weight: 400; }
    .sif .tbl td.v { color: #1e3a8a; font-weight: 600; }
    .sif .tbl td.center { text-align: center; }
    .sif .sign { margin-top: 26px; margin-left: auto; width: 360px; text-align: right; }
    .sif .pageno { position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-size: 17px; color: #555; }
    .sif u { text-underline-offset: 3px; }
`;

// HTML ทั้งหน้า (ใช้ดูตัวอย่าง/ทดสอบ)
export const buildStudentFormHtml = (fd = {}, fallback = {}, fontBase = "/fonts") => {
  const { page1, page2 } = buildPages(fd, fallback);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaceCss(fontBase)}${FORM_CSS}</style></head><body style="margin:0"><div class="sif">${page1}${page2}</div></body></html>`;
};

// แบบฟอร์ม → PDF (A4 2 หน้า): ให้เบราว์เซอร์วาดเองผ่าน html-to-image (ตรงกับที่เห็นบนจอ ฟอนต์ไทยถูกตำแหน่ง)
const ensureFormStyles = () => {
  if (document.getElementById("sif-style")) return;
  const style = document.createElement("style");
  style.id = "sif-style";
  style.textContent = fontFaceCss(`${window.location.origin}/fonts`) + FORM_CSS;
  document.head.appendChild(style);
};

const renderPdf = async (fd, fallback) => {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  ensureFormStyles();
  const { page1, page2 } = buildPages(fd, fallback);
  const host = document.createElement("div");
  host.className = "sif";
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;pointer-events:none";
  host.innerHTML = page1 + page2;
  document.body.appendChild(host);
  try {
    try {
      await Promise.race([
        Promise.all([document.fonts.load("400 20px 'TH Sarabun New'", "ก"), document.fonts.load("700 20px 'TH Sarabun New'", "ก")]),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
    } catch {
      /* ใช้ฟอนต์สำรอง */
    }
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pages = [...host.querySelectorAll(".page")];
    for (let i = 0; i < pages.length; i++) {
      const img = await toJpeg(pages[i], { quality: 0.9, pixelRatio: 2, backgroundColor: "#ffffff", width: 794, height: 1123 });
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, 210, 297);
    }
    return pdf.output("blob");
  } finally {
    host.remove();
  }
};

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").trim();

// items: [{ formData, fallback: { firstName, lastName, fullname, grade, room, rollNumber } }]
// 1 คน → ดาวน์โหลด PDF, หลายคน → PDF แยกรายคน รวมเป็น ZIP; onProgress(0..1)
export const exportStudentInfoForms = async (items, onProgress) => {
  const files = [];
  for (let i = 0; i < items.length; i++) {
    const { formData, fallback } = items[i];
    const blob = await renderPdf(formData || {}, fallback || {});
    const fd = formData || {};
    const grade = stripGradePrefix(fd.meta?.classroom) || fallback?.grade || "";
    const room = fd.meta?.room ?? fallback?.room ?? "";
    const roll = fd.meta?.roll_number ?? fallback?.rollNumber ?? "";
    const name = [fd.personal?.first_name, fd.personal?.last_name].filter(Boolean).join(" ") || fallback?.fullname || "นักเรียน";
    const cls = grade ? `ม${grade}${room ? `-${room}` : ""}_` : "";
    const no = roll !== "" && roll != null ? `เลขที่${roll}_` : "";
    files.push({ name: `ข้อมูลส่วนตัว_${safeName(cls + no + name)}.pdf`, blob });
    onProgress?.((i + 1) / (items.length + (items.length > 1 ? 0.3 : 0)));
  }
  if (files.length === 1) {
    download(files[0].blob, files[0].name);
  } else {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const used = new Set();
    files.forEach((fl) => {
      let n = fl.name;
      for (let k = 2; used.has(n); k++) n = fl.name.replace(/\.pdf$/, `_${k}.pdf`);
      used.add(n);
      zip.file(n, fl.blob);
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    download(zipBlob, `ข้อมูลส่วนตัวนักเรียน_${files.length}คน_${today}.zip`);
  }
  onProgress?.(1);
  return files.length;
};

// ประโยคสรุปความสนใจจากคะแนนจริง (interestSummary) — ใช้ร่วมกันระหว่างหน้าผลของนักเรียนและหน้าผลการประเมินฝั่งครู
// "ใกล้เคียงกัน" เฉพาะเมื่อคะแนนต่างกันไม่เกิน CLOSE_POINTS • ข้อความแม่แบบของระบบ ไม่ได้วัดความสามารถ
import { interestSummary } from "./riasecScoring.js";
import { PLAIN } from "../data/guidanceTexts.js";

export const joinTh = (arr) => (arr.length <= 1 ? arr.join("") : `${arr.slice(0, -1).join(" ")} และ${arr[arr.length - 1]}`);
export const TRAIT_NOUN = { R: "การลงมือปฏิบัติ", I: "การคิดวิเคราะห์", A: "การสร้างสรรค์", S: "การช่วยเหลือผู้อื่น", E: "ภาวะผู้นำ", C: "ความเป็นระบบ" };

const plain = (list) => (list.length === 2 && !/\s/.test(PLAIN[list[0]]) ? `${PLAIN[list[0]]}และ${PLAIN[list[1]]}` : joinTh(list.map((c) => PLAIN[c])));

// subject = "คุณ" (หน้านักเรียน) หรือ "นักเรียน" (หน้าครู)
export const interestSummaryText = (scores, subject = "คุณ") => {
  const sum = interestSummary(scores);
  return (
    `${subject}มีความสนใจเด่นด้าน${plain(sum.lead)}${sum.leadClose ? "ในระดับใกล้เคียงกัน" : ""}` +
    (sum.rest.length === 0
      ? ""
      : sum.rest.length === 1
      ? ` รองลงมาคือด้าน${plain(sum.rest)}`
      : sum.restClose
      ? ` ขณะเดียวกันก็มีความสนใจด้าน${plain(sum.rest)}${sum.leadClose ? "ด้วย" : "ในระดับใกล้เคียงกัน"}`
      : ` รองลงมาคือด้าน${plain(sum.rest)}`)
  );
};

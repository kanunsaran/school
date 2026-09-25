// ค่าคงที่ที่ใช้ร่วมกันระหว่างหน้าแฟ้มสะสมผลงานฝั่งนักเรียน (StudentPortfolio.jsx) และฝั่งครู (Portfolio.jsx)
// การเรียก API จริงอยู่ใน callapi_user.jsx (getPortfolioWorks, createPortfolioWork, ...) ตามแพทเทิร์นเดียวกับฟีเจอร์อื่นในแอป
// ⚠️ ต้องตรงกับ ENUM ในตาราง portfolio_works ของ backend เป๊ะๆ: visibility('public','private'), status('รอคำแนะนำ','ให้คำแนะนำแล้ว','ต้องแก้ไข')

// แค่รายการหมวดหมู่ตั้งต้นให้เลือกตอนสร้างผลงาน — คอลัมน์ category เป็น varchar ไม่ได้บังคับ ENUM ฝั่ง backend
export const PORTFOLIO_CATEGORIES = ["พอร์ตฟอลิโอ", "เกียรติบัตร", "กิจกรรม", "จิตอาสา", "ผลงาน", "โครงงาน"];

export const VISIBILITY_META = {
  public: { value: "public", label: "สาธารณะ", fullLabel: "สาธารณะ", hint: "เพื่อนและครูเห็นได้" },
  private: { value: "private", label: "ส่วนตัว", fullLabel: "ส่วนตัว", hint: "ครูผู้สอนกับตัวฉันเท่านั้น" },
};

export const STATUS_META = {
  "รอคำแนะนำ": { value: "รอคำแนะนำ", label: "รอคำแนะนำ", color: "amber" },
  "ให้คำแนะนำแล้ว": { value: "ให้คำแนะนำแล้ว", label: "ให้คำแนะนำแล้ว", color: "emerald" },
  "ต้องแก้ไข": { value: "ต้องแก้ไข", label: "ต้องแก้ไข", color: "red" },
};

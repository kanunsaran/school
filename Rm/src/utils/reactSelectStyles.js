// สไตล์ react-select แบบกะทัดรัด สูง 40px ให้หน้าตาตรงกับปุ่ม/ช่องค้นหาที่เหลือในตัวกรอง — ใช้ร่วมกันทุกหน้าที่มีตัวกรองแบบเลือก
export const filterSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "40px",
    height: "40px",
    borderRadius: "12px",
    borderColor: state.isFocused ? "#f9a8d4" : "#e5e7eb",
    boxShadow: "none",
    fontSize: "13px",
    cursor: "pointer",
    "&:hover": { borderColor: "#f9a8d4" },
  }),
  valueContainer: (base) => ({ ...base, height: "40px", padding: "0 10px" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: "none" }),
  indicatorsContainer: (base) => ({ ...base, height: "40px" }),
  singleValue: (base) => ({ ...base, color: "#374151" }),
  menu: (base) => ({ ...base, borderRadius: "12px", overflow: "hidden", zIndex: 20 }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    borderRadius: "8px",
    fontSize: "13px",
    backgroundColor: state.isSelected ? "#ec4899" : state.isFocused ? "#fdf2f8" : "white",
    color: state.isSelected ? "white" : "#374151",
    cursor: "pointer",
  }),
};

// เหมือน filterSelectStyles แต่ตัวหนังสือใหญ่ขึ้น (15px) สูง 44px — ใช้ในป็อปอัพ/ฟอร์มที่อยากให้ตัวหนังสืออ่านง่ายขึ้น
// (ตอนนี้ใช้ที่ป็อปอัพ "เพิ่มคาบสอน" ของแดชบอร์ดครู และตัวกรองห้องใน TeacherCalendar)
export const bigFilterSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "44px",
    height: "44px",
    borderRadius: "12px",
    borderColor: state.isFocused ? "#f9a8d4" : "#e5e7eb",
    boxShadow: "none",
    fontSize: "15px",
    cursor: "pointer",
    "&:hover": { borderColor: "#f9a8d4" },
  }),
  valueContainer: (base) => ({ ...base, height: "44px", padding: "0 12px" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: "none" }),
  indicatorsContainer: (base) => ({ ...base, height: "44px" }),
  singleValue: (base) => ({ ...base, color: "#374151" }),
  menu: (base) => ({ ...base, borderRadius: "12px", overflow: "hidden", zIndex: 20 }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    borderRadius: "8px",
    fontSize: "15px",
    padding: "8px 12px",
    backgroundColor: state.isSelected ? "#ec4899" : state.isFocused ? "#fdf2f8" : "white",
    color: state.isSelected ? "white" : "#374151",
    cursor: "pointer",
  }),
};

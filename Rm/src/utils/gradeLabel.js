// แสดงห้องจาก grades เป็น "6/17 (วิทย์-คณิต)"
export const gradeLabel = (c) => `${c.grade_name}/${c.section}${c.track ? ` (${c.track})` : ""}`;

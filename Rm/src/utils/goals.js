// เป้าหมายการศึกษาต่อของนักเรียน (ตาราง goal) — นักเรียน 1 คนตั้งได้หลายข้อ เรียงด้วย priority (1 = เป้าหมายหลัก)
// ใช้ฟังก์ชันเดียวกันทุกหน้า เพื่อให้ "เป้าหมายหลัก" ตรงกันทั้งฝั่งนักเรียนและครู

export const MAX_GOALS = 3;
export const GOAL_RANK_LABEL = ["เป้าหมายหลัก", "เป้าหมายสำรอง 1", "เป้าหมายสำรอง 2"];

// เรียง: priority น้อยก่อน (ข้อมูลเก่าที่ไม่มี priority ไว้ท้าย เรียงจากใหม่ไปเก่า)
export const sortGoals = (goals) =>
  [...(goals || [])].sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99) || new Date(b.created_at) - new Date(a.created_at) || b.goal_id - a.goal_id
  );

export const goalsOf = (goals, userId) => sortGoals((goals || []).filter((g) => String(g.user_user_id) === String(userId) && !g.deleted_at));

export const primaryGoalOf = (goals, userId) => goalsOf(goals, userId)[0] || null;

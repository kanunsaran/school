// จอเล็กกว่า xl (1280px) = มือถือ/ไอแพด → แผงรายละเอียดแสดงเป็นป๊อปอัพ (ResponsiveSheet)
export const isBelowXl = () => !window.matchMedia("(min-width: 1280px)").matches;

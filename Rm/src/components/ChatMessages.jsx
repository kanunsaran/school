import Avatar from "./Avatar.jsx";

// แชทคำขอปรึกษา (ใช้ทั้งฝั่งครูและนักเรียน) — อ่านง่ายขึ้น:
// ฝั่งเราเป็นฟองสีชมพูเข้มชิดขวา ฝั่งอีกคนเป็นฟองสีขาวชิดซ้ายพร้อมรูป+ชื่อ, คั่นวันที่, เวลาใต้ข้อความสุดท้ายของแต่ละกลุ่ม
// messages: [{ id, sender, text, at }]

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

const dayLabel = (d) => {
  const date = new Date(d);
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "เมื่อวาน";
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

const timeLabel = (d) => new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// กลุ่ม = ข้อความติดกันจากคนเดิมในวันเดียวกัน ห่างกันไม่เกิน 5 นาที
const buildGroups = (messages) => {
  const groups = [];
  messages.forEach((m) => {
    const last = groups[groups.length - 1];
    const lastMsg = last?.items[last.items.length - 1];
    const sameDay = lastMsg && dayKey(lastMsg.at) === dayKey(m.at);
    const close = lastMsg && Math.abs(new Date(m.at) - new Date(lastMsg.at)) < 5 * 60 * 1000;
    if (last && last.sender === m.sender && sameDay && close) last.items.push(m);
    else groups.push({ sender: m.sender, items: [m], newDay: !lastMsg || !sameDay });
  });
  return groups;
};

export default function ChatMessages({ messages, mySender, otherName, otherAvatarUrl, endRef }) {
  const groups = buildGroups(messages || []);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 py-4 flex flex-col gap-3">
      {groups.length === 0 && <div className="m-auto text-[14.5px] text-gray-400">ยังไม่มีข้อความ</div>}

      {groups.map((g, gi) => {
        const mine = g.sender === mySender;
        const lastAt = g.items[g.items.length - 1].at;
        return (
          <div key={gi} className="flex flex-col gap-3">
            {g.newDay && (
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-[12.5px] text-gray-500">{dayLabel(g.items[0].at)}</span>
              </div>
            )}

            <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <Avatar src={otherAvatarUrl} name={otherName} size={32} className="shrink-0 mb-5" />}

              <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
                {!mine && <div className="px-1 text-[12.5px] font-medium text-gray-500">{otherName}</div>}
                {g.items.map((m, i) => {
                  // มุมฟองฝั่งผู้ส่งแบนลงเล็กน้อยเมื่อข้อความต่อกัน ให้เห็นเป็นกลุ่มเดียวกัน
                  const corner = mine
                    ? `rounded-br-md ${i > 0 ? "rounded-tr-md" : ""}`
                    : `rounded-bl-md ${i > 0 ? "rounded-tl-md" : ""}`;
                  return (
                    <div
                      key={m.id}
                      className={`w-fit max-w-full rounded-2xl ${corner} px-4 py-2.5 shadow-sm ${
                        mine ? "bg-pink-500 text-white" : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      <div className="text-[15.5px] leading-relaxed whitespace-pre-line break-words">{m.text}</div>
                    </div>
                  );
                })}
                <div className="px-1 text-[12px] text-gray-400">{timeLabel(lastAt)}</div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

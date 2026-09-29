import { useState } from "react";

// การตอบกลับใต้นัดหมาย (ใช้ทั้งปฏิทินครูและปฏิทินนักเรียน)
export default function AppointmentReplyThread({ replies, onAdd, placeholder }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  };
  return (
    <div className="mt-2.5 pl-13">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="text-pink-600 text-[13.5px] bg-transparent">
        {expanded ? "ซ่อนการตอบกลับ" : replies.length > 0 ? `ดูการตอบกลับ (${replies.length})` : "ตอบกลับ"}
      </button>

      {expanded && (
        <div className="mt-1.5">
          {replies.length > 0 && (
            <div className="space-y-2 mb-2">
              {replies.map((r, i) => (
                <div key={i} className="text-[14.5px] bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">{r.author}</span>
                  <span className="text-[12.5px] text-gray-400"> • {r.time}</span>
                  <div className="mt-1 text-gray-600">{r.text}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder={placeholder}
              className="flex-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-[14.5px] outline-none focus:border-gray-400 placeholder:text-gray-400"
            />
            <button type="button" onClick={submit} className="h-10 px-3.5 rounded-lg bg-pink-500 text-white text-[14.5px] hover:bg-pink-600 transition shrink-0">
              ส่ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

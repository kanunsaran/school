import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  FaPlus, FaCommentDots, FaCommentAlt, FaPaperPlane, FaPaperclip, FaBullseye, FaChartBar,
  FaInfoCircle, FaLock, FaSearch, FaListUl, FaTimes,
  FaBook, FaGraduationCap, FaClipboardList, FaBriefcase, FaHeart, FaEllipsisH,
} from "react-icons/fa";
import SidebarNav from "../navstudent";
import Header from "../Header";
import PageLoading from "../components/PageLoading.jsx";
import {
  getTypeResults, getTypes, getGoals,
  getConsultationRequests, createConsultationRequest, replyToConsultation,
} from "../callapi/callapi_user.jsx";
import { CURRENT_TEACHER, notAvailableYet } from "../utils/feedShared.js";
import { getCurrentUser } from "../utils/auth.js";
import { CONSULTATION_CATEGORIES, STATUS_META, normalizeConsultation } from "../utils/consultationStore.js";

const CURRENT_STUDENT_ID = getCurrentUser()?.user_id;

const CATEGORY_ICONS = {
  "การเรียน": <FaBook size={11} />,
  "การเลือกคณะ": <FaGraduationCap size={11} />,
  "TCAS": <FaClipboardList size={11} />,
  "อาชีพในอนาคต": <FaBriefcase size={11} />,
  "ปัญหาส่วนตัว": <FaHeart size={11} />,
  "อื่นๆ": <FaEllipsisH size={11} />,
};

const formatDate = (d) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const formatTime = (d) => new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// รวมข้อความติดกันจากคนเดิมเป็นกลุ่มเดียว — โชว์เวลาแค่ใต้ข้อความสุดท้ายของกลุ่ม (แพทเทิร์นเดียวกับฝั่งครู)
const groupMessages = (messages) => {
  const groups = [];
  messages.forEach((m) => {
    const last = groups[groups.length - 1];
    if (last && last.sender === m.sender) last.items.push(m);
    else groups.push({ sender: m.sender, items: [m] });
  });
  return groups;
};

// เวลาแบบย่อในลิสต์แชท: วันนี้โชว์เวลา, เมื่อวานโชว์ "เมื่อวาน", ก่อนหน้านั้นโชว์ "N วันก่อน"
const formatListTime = (d) => {
  const date = new Date(d);
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return formatTime(d);
  if (diffDays === 1) return "เมื่อวาน";
  if (diffDays < 7) return `${diffDays} วันก่อน`;
  return formatDate(d);
};

export default function StudentConsultationsPage() {
  const [typeResults, setTypeResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formCategory, setFormCategory] = useState(CONSULTATION_CATEGORIES[0]);
  const [formMessage, setFormMessage] = useState("");
  const messagesEndRef = useRef(null);
  const replyTextareaRef = useRef(null);

  const refreshItems = () =>
    getConsultationRequests({ student_user_id: CURRENT_STUDENT_ID })
      .then((data) => setItems((data || []).map(normalizeConsultation)))
      .catch(() => setItems([]));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [typeResultData, typeData, goalData] = await Promise.all([
          getTypeResults().catch(() => []),
          getTypes().catch(() => []),
          getGoals().catch(() => []),
          refreshItems(),
        ]);
        setTypeResults(typeResultData || []);
        setTypes(typeData || []);
        setGoals(goalData || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const myLatestType = useMemo(
    () => typeResults.filter((r) => String(r.user_user_id) === String(CURRENT_STUDENT_ID)).sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0],
    [typeResults]
  );
  const myTypeName = myLatestType ? types.find((t) => String(t.type_id) === String(myLatestType.type_type_id))?.type_name : null;
  const myLatestGoal = useMemo(
    () => goals.filter((g) => String(g.user_user_id) === String(CURRENT_STUDENT_ID)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
    [goals]
  );

  const latestActivityAt = (c) => (c.messages.length > 0 ? c.messages[c.messages.length - 1].at : c.createdAt);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => (c.subject || "").toLowerCase().includes(q));
    }
    return list.slice().sort((a, b) => new Date(latestActivityAt(b)) - new Date(latestActivityAt(a)));
  }, [items, search]);

  const selected = items.find((c) => c.id === selectedId) || null;
  useEffect(() => {
    if (filtered.length > 0 && !filtered.find((c) => c.id === selectedId)) setSelectedId(filtered[0].id);
    else if (filtered.length === 0) setSelectedId(null);
  }, [filtered, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedId, selected?.messages?.length]);

  // ช่องพิมพ์ตอบกลับ: สูงเท่าที่พิมพ์จริง พิมพ์ยาวขึ้นค่อยขยายลงมา (แพทเทิร์นเดียวกับฝั่งครู)
  useEffect(() => {
    const el = replyTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [replyText]);

  const handleSend = async () => {
    if (!selected || !replyText.trim()) return;
    try {
      await replyToConsultation(selected.id, {
        sender_user_id: CURRENT_STUDENT_ID,
        sender_role: "student",
        message_text: replyText.trim(),
      });
      setReplyText("");
      await refreshItems();
    } catch {
      Swal.fire({ icon: "error", title: "ส่งข้อความไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  const openCreateModal = () => {
    setFormCategory(CONSULTATION_CATEGORIES[0]);
    setFormMessage("");
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async () => {
    if (!formMessage.trim()) return;
    try {
      const created = await createConsultationRequest({
        student_user_id: CURRENT_STUDENT_ID,
        category: formCategory,
        subject: formCategory,
        message: formMessage.trim(),
      });
      await refreshItems();
      setSelectedId(created.request_id);
      setShowCreateModal(false);
      Swal.fire({ icon: "success", title: "ส่งคำขอปรึกษาแล้ว", timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "ส่งคำขอไม่สำเร็จ", text: "ลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div className="h-screen bg-white flex text-gray-900 overflow-hidden">
      <Header />
      <SidebarNav />

      <main className="flex-1 min-w-0 w-full flex flex-col overflow-hidden pt-24 bg-white">
        <div className="px-6 md:px-8 mb-4 shrink-0 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="page-title">คำขอคำปรึกษาของฉัน</h1>
            <p className="page-subtitle mt-1">คุยกับครูแนะแนวเรื่องการเรียน การเลือกคณะ หรือเรื่องอื่นๆ ที่กังวลใจ</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[14px] font-semibold flex items-center gap-2"
          >
            <FaPlus size={11} /> สร้างคำขอใหม่
          </button>
        </div>

        {loading ? (
          <PageLoading />
        ) : items.length === 0 && !search.trim() ? (
          <div className="mx-6 md:mx-8 rounded-2xl border border-dashed border-gray-200 py-20 text-center text-gray-400">
            <FaCommentDots size={28} className="mx-auto mb-3 text-gray-300" />
            <div className="text-[15.5px] mb-1">ยังไม่มีคำขอปรึกษา</div>
            <div className="text-[14px] text-gray-400 max-w-md mx-auto">กด "สร้างคำขอใหม่" เพื่อเริ่มปรึกษาครูแนะแนว</div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 px-6 md:px-8 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5 h-full">
            {/* ===== ซ้าย: รายการคำขอของฉัน — เส้นคั่นแทนกรอบครอบ เหมือนฝั่งครู ===== */}
            <div className="min-w-0 xl:border-r xl:border-gray-200 xl:pr-5 flex flex-col h-full overflow-hidden">
              <div className="pb-3 border-b border-gray-100 shrink-0">
                <div className="text-[16.5px] font-semibold text-gray-900 mb-2">คำขอของฉัน</div>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาหัวข้อ..."
                    className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-9 pr-3 text-[15px] outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-[14.5px]">ไม่พบคำขอ</div>
                ) : (
                  filtered.map((c) => {
                    const isSelected = selectedId === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left py-4 px-2 rounded-lg transition ${isSelected ? "bg-pink-50" : "hover:bg-gray-50 bg-white"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-11 h-11 shrink-0 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center">
                            {CATEGORY_ICONS[c.subject] || <FaCommentDots size={14} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[15.5px] font-semibold text-gray-900 truncate">{c.subject}</div>
                              <span className="text-[13px] text-gray-400 shrink-0">{formatListTime(latestActivityAt(c))}</span>
                            </div>
                            <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_META[c.status].cls}`}>
                              {STATUS_META[c.status].label}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ===== ขวา: บทสนทนา ===== */}
            {!selected ? (
              <div className="text-center text-gray-400 py-16">เลือกคำขอปรึกษาเพื่อดูบทสนทนา หรือกด "สร้างคำขอใหม่" เพื่อเริ่มปรึกษาครู</div>
            ) : (
              <div className="min-w-0 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[18.5px] font-bold text-gray-900 truncate">หัวข้อ: {selected.subject}</div>
                      <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_META[selected.status].cls}`}>{STATUS_META[selected.status].label}</span>
                    </div>
                    <div className="text-[14px] text-gray-500 mt-1">
                      ครูที่ปรึกษา: {CURRENT_TEACHER.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowInfo((v) => !v)}
                      className={`h-11 px-3.5 rounded-lg border text-[14.5px] font-medium flex items-center gap-1.5 ${showInfo ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"}`}
                    >
                      <FaInfoCircle size={13} /> ข้อมูลของฉัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAssessment((v) => !v)}
                      className={`h-11 px-3.5 rounded-lg border text-[14.5px] font-medium flex items-center gap-1.5 ${showAssessment ? "border-pink-300 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"}`}
                    >
                      <FaChartBar size={13} /> ผลประเมิน
                    </button>
                  </div>
                </div>

                {showInfo && (
                  <div className="p-4 border-b border-gray-100 shrink-0">
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1"><FaBullseye className="text-pink-400" size={12} /> เป้าหมายการศึกษาต่อ</div>
                      {myLatestGoal ? (
                        <>
                          <div className="text-[14px] font-medium text-gray-900">{myLatestGoal.faculty_name || "-"}</div>
                          {myLatestGoal.career_field && <div className="text-[12.5px] text-gray-500 mt-0.5">{myLatestGoal.career_field}</div>}
                        </>
                      ) : (
                        <div className="text-[13px] text-gray-400">ยังไม่ได้ตั้งเป้าหมาย</div>
                      )}
                    </div>
                  </div>
                )}

                {showAssessment && (
                  <div className="p-4 border-b border-gray-100 shrink-0">
                    <div className="rounded-xl bg-gray-50 p-3.5">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1"><FaChartBar className="text-blue-400" size={12} /> ผลประเมิน RIASEC ล่าสุด</div>
                      {myTypeName ? (
                        <div className="text-[14px] font-semibold text-pink-700">{myTypeName}</div>
                      ) : (
                        <div className="text-[13px] text-gray-400">ยังไม่ได้ทำแบบประเมิน</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5">
                  {groupMessages(selected.messages).map((g, gi) => (
                    <div key={gi} className={`max-w-[80%] flex flex-col gap-1 ${g.sender === "student" ? "ml-auto items-end" : "items-start"}`}>
                      {g.items.map((m) => (
                        <div key={m.id} className={`w-fit rounded-xl px-4 py-3 ${g.sender === "student" ? "bg-pink-100 text-gray-900" : "bg-gray-100 text-gray-800"}`}>
                          <div className="text-[16px] whitespace-pre-line">{m.text}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-100 shrink-0 flex items-end gap-2">
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => notAvailableYet("แนบไฟล์")}
                      className="absolute left-2 bottom-2.5 w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent flex items-center justify-center"
                    >
                      <FaPaperclip size={14} />
                    </button>
                    <textarea
                      ref={replyTextareaRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={1}
                      placeholder="พิมพ์ข้อความ..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-[16px] outline-none focus:border-pink-400 resize-none overflow-hidden leading-relaxed"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!replyText.trim()}
                    className="h-11 w-11 shrink-0 rounded-xl bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center disabled:opacity-40"
                  >
                    <FaPaperPlane size={16} />
                  </button>
                </div>
                <div className="px-4 pb-3 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <FaLock size={9} /> การสนทนาทั้งหมดเป็นความลับและปลอดภัย
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </main>

      {/* สร้างคำขอใหม่ — โมดัลธรรมดาแบบเดียวกับหน้าอื่นในระบบ (ไม่ใช้ GradientPopup) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-120 max-w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                <FaCommentDots className="text-gray-500" size={15} /> สร้างคำขอคำปรึกษาใหม่
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-700 bg-transparent">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="px-5 py-5 overflow-y-auto flex flex-col gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 mb-1.5">
                  <FaListUl className="text-pink-500" size={12} /> เลือกหัวข้อ
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-[13.5px] outline-none focus:border-pink-400"
                >
                  {CONSULTATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 mb-1.5">
                  <FaCommentAlt className="text-pink-500" size={12} /> เล่ารายละเอียดให้ครูฟัง
                </label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={4}
                  autoFocus
                  placeholder="เล่าเรื่องที่คุณกังวล หรือสิ่งที่อยากปรึกษาให้ครูแนะแนวเข้าใจ..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-pink-400 resize-none"
                />
                <div className="text-right text-[11px] text-gray-400 mt-1">{formMessage.length}/500</div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 mb-2">
                  <FaInfoCircle className="text-pink-500" size={12} /> ตัวอย่างหัวข้อ
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONSULTATION_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormCategory(c)}
                      className={`h-8 px-3 rounded-full text-[12px] font-medium flex items-center gap-1.5 border transition-colors ${
                        formCategory === c ? "bg-pink-500 border-pink-500 text-white" : "bg-pink-50 border-pink-100 text-pink-700 hover:bg-pink-100"
                      }`}
                    >
                      {CATEGORY_ICONS[c]} {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-blue-50 text-blue-700 px-3.5 py-2.5 text-[11.5px] leading-relaxed">
                <FaLock size={12} className="shrink-0 mt-0.5" />
                <span>ข้อมูลของคุณจะถูกเก็บเป็นความลับ คุณสามารถมั่นใจได้ว่าเราจะดูแลข้อมูลของคุณเป็นอย่างดี</span>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-[14px] font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitCreate}
                disabled={!formMessage.trim()}
                className="flex-1 h-11 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14px] font-semibold flex items-center justify-center gap-2"
              >
                ส่งคำขอ <FaPaperPlane size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

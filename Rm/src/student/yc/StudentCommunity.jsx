import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "../../navstudent.jsx";
import Header from "../../Header";
import PageLoading from "../../components/PageLoading.jsx";
import Select from "react-select";
import Swal from "sweetalert2";
import {
    FaSearch,
    FaRegHeart,
    FaRegCommentDots,
    FaRegPaperPlane,
    FaPlus,
} from "react-icons/fa";
import {
    getdatayc,
    createPostit,
    updatePostit,
    deletePostit,
    getPostitLikeStatus,
    togglePostitLike,
} from "../../callapi/callapi_user.jsx";
import {
    getPostitColor,
    getPostitTape,
    getPostitColorStyle,
    getPostitTapeStyle,
    POSTIT_CATEGORIES,
    PRESET_COLORS,
    PRESET_TAPES,
} from "../../utils/postit.js";

// ⚠️ TODO: ทดไว้ก่อน รอทำหน้า login ค่อยเอา user_id จริงมาแทน
const CURRENT_USER_ID = "1";

export default function StudentCommunityPage() {
    const navigate = useNavigate();

    // หมวดหมู่ชุดเดียวกับฝั่งครู กันกรอง/แสดงผลไม่ตรงกัน + เพิ่มชิป "โพสต์ของฉัน" ไว้อันที่ 2 ต่อจาก "ทั้งหมด"
    const chips = useMemo(() => ["ทั้งหมด", "โพสต์ของฉัน", ...POSTIT_CATEGORIES], []);

    const [activeChip, setActiveChip] = useState("ทั้งหมด");
    const [q, setQ] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState(null);

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPosts() {
            try {
                const res = await getdatayc();

                const mapped = await Promise.all(
                    res.data.map(async (p) => {
                        let likeStatus = { count: 0, liked: false };
                        try {
                            likeStatus = await getPostitLikeStatus(p.post_id, CURRENT_USER_ID);
                        } catch (err) {
                            console.error("โหลดไลก์ไม่สำเร็จ:", err);
                        }

                        return {
                            id: p.post_id,
                            ownerId: p.user_user_id,
                            // ใช้สีที่บันทึกไว้จริงก่อน ถ้าโพสต์เก่าไม่มี (สร้างก่อนมีฟีเจอร์นี้) ค่อย fallback เป็นสีคำนวณจาก id
                            color: p.color || getPostitColor(p.post_id),
                            tape: p.tape || getPostitTape(p.post_id),
                            category: p.category,
                            text: p.content,
                            likes: likeStatus.count,
                            liked: likeStatus.liked,
                            comments: p.comments ?? 0,
                            shares: p.shares ?? 0,
                        };
                    })
                );

                setPosts(mapped);
            } catch (err) {
                console.error("โหลดโพสต์ YC ไม่สำเร็จ:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchPosts();
    }, []);

    const addPost = async (text, topic, color, tape) => {
        try {
            const result = await createPostit({
                content: text,
                category: topic,
                user_id: CURRENT_USER_ID,
                color,
                tape,
            });

            // ใช้สีที่พี่เลือกในฟอร์มจริงๆ (ตัวเดียวกับที่เพิ่งบันทึกลง backend ไป)
            const newPost = {
                id: result.post_id,
                ownerId: CURRENT_USER_ID,
                color,
                tape,
                category: topic,
                text,
                likes: 0,
                liked: false,
                comments: 0,
                shares: 0,
            };

            setPosts((prev) => [newPost, ...prev]);
        } catch (err) {
            console.error("สร้างโพสต์ไม่สำเร็จ:", err);
            alert("สร้างโพสต์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    };

    const handleUpdatePost = async (postId, text, topic, color, tape) => {
        try {
            await updatePostit(postId, {
                content: text,
                category: topic,
                color,
                tape,
                user_id: CURRENT_USER_ID,
            });

            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, text, category: topic, color, tape } : p
                )
            );
        } catch (err) {
            console.error("แก้ไขโพสต์ไม่สำเร็จ:", err);
            alert("แก้ไขโพสต์ไม่สำเร็จ (แก้ไขได้เฉพาะโพสต์ของตัวเอง)");
        }
    };

    const handleDeletePost = async (postId) => {
        const result = await Swal.fire({
            title: "ลบโพสต์นี้?",
            text: "ลบแล้วกู้คืนไม่ได้",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#d33",
        });

        if (!result.isConfirmed) return;

        try {
            await deletePostit(postId, CURRENT_USER_ID);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
        } catch (err) {
            console.error("ลบโพสต์ไม่สำเร็จ:", err);
            alert("ลบโพสต์ไม่สำเร็จ (ลบได้เฉพาะโพสต์ของตัวเอง)");
        }
    };

    // ============ LIKE (กันไม่ให้ trigger การ์ดพาไปหน้ารายละเอียด) ============
    const handleToggleLike = async (postId, e) => {
        e.stopPropagation();
        try {
            const result = await togglePostitLike(postId, CURRENT_USER_ID);
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, likes: result.count, liked: result.liked } : p
                )
            );
        } catch (err) {
            console.error(err);
        }
    };

    const filtered = posts.filter((p) => {
        const text = p.text.replaceAll("\n", " ");

        const okQ = q.trim()
            ? text.toLowerCase().includes(q.toLowerCase())
            : true;

        const okCategory =
            activeChip === "ทั้งหมด"
                ? true
                : activeChip === "โพสต์ของฉัน"
                    ? String(p.ownerId) === String(CURRENT_USER_ID)
                    : p.category === activeChip;

        return okQ && okCategory;
    });

    const closeComposer = () => {
        setShowModal(false);
        setEditingPost(null);
    };

    return (
        <div className="min-h-screen w-full bg-white flex text-[15.5px] text-gray-800">
            <Header />
            <SidebarNav />

            {/* ===== Main (เต็มจอ + ธีม YC) ===== */}
            <main className="flex-1 min-w-0 w-full pt-15 bg-white">
                <div className="w-full border-b border-gray-100 bg-gradient-to-b from-[#FFF1F7] to-white py-8">
                    <div className="flex justify-center">
                        <img src="/image/youth-counselor-logo.png" alt="Youth Counselor" className="h-20 w-auto object-contain" />
                    </div>
                </div>

                {/* Search */}
                <div className="mt-6 w-full flex justify-center">
                    <div className="w-full max-w-[980px]">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="ค้นหาเรื่อง หรือ คำถาม"
                                    className="w-full h-11 rounded-full border border-gray-300 bg-white pl-11 pr-4 outline-none focus:border-pink-300"
                                />
                            </div>

                            {/* ปุ่มสร้างโพสต์ — มีเฉพาะฝั่งนักเรียน ครูไม่มี */}
                            <button style={{ backgroundColor: "white" }}
                                type="button"
                                onClick={() => {
                                    setEditingPost(null);
                                    setShowModal(true);
                                }}
                                className="h-11 w-11 rounded-full bg-pink-500 text-black flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition"
                            >
                                <FaPlus />
                            </button>
                        </div>

                        {/* Chips */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {chips.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setActiveChip(c)}
                                    className={`h-9 px-4 rounded-full border text-[14.5px] font-medium transition-colors ${activeChip === c
                                            ? "bg-pink-500 border-pink-500 text-white"
                                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid cards */}
                <div className="mt-6 w-full flex justify-center">
                    <div className="w-full max-w-[1080px]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                <PageLoading label="กำลังโหลดโพสต์…" />
                            ) : (
                                filtered.map((p) => (
                                    <PostItCard
                                        key={p.id}
                                        post={p}
                                        isOwner={String(p.ownerId) === String(CURRENT_USER_ID)}
                                        onClick={() => navigate(`/studentyc/${p.id}`)}
                                        onLikeClick={(e) => handleToggleLike(p.id, e)}
                                        onEdit={() => {
                                            setEditingPost(p);
                                            setShowModal(true);
                                        }}
                                        onDelete={() => handleDeletePost(p.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Quote */}
                        <div className="mt-8 text-center text-[19.5px] text-gray-700">
                            "ทุกเรื่องราว มีคนรับฟัง"
                        </div>
                    </div>
                </div>
            </main>

            {showModal && (
                <CreatePostModal
                    initialData={editingPost}
                    onClose={closeComposer}
                    onSubmit={(text, color, tape, topic) => {
                        if (editingPost) {
                            handleUpdatePost(editingPost.id, text, topic, color, tape);
                        } else {
                            addPost(text, topic, color, tape);
                        }
                        closeComposer();
                    }}
                />
            )}
        </div>
    );
}

/* ================= MODAL ================= */
function CreatePostModal({ onClose, onSubmit, initialData }) {
    const isEditing = !!initialData;

    const [text, setText] = useState(initialData?.text || "");
    const [color, setColor] = useState(initialData?.color || "pink");
    const [tapeColor, setTapeColor] = useState(initialData?.tape || "pink");

    // หมวดหมู่ต้องตรงกับที่ฝั่งครูใช้กรอง ไม่งั้นโพสต์จะไม่โผล่ตอนครูกรองตามหมวด
    const topicOptions = POSTIT_CATEGORIES.map((c) => ({ value: c, label: c }));

    const [topic, setTopic] = useState(
        topicOptions.find((o) => o.value === initialData?.category) || topicOptions[0]
    );

    // เลือกเองว่าเป็น custom ถ้าไม่ใช่ค่าที่อยู่ใน preset (เช่นเป็น hex ที่พิมพ์เอง)
    const isCustomColor = !PRESET_COLORS.includes(color);
    const isCustomTape = !PRESET_TAPES.includes(tapeColor);

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="w-[700px] bg-white rounded-3xl p-6 relative">

                <button style={{backgroundColor: "white"}} onClick={onClose} className="absolute right-5 top-5 text-xl" >
                    ✕
                </button>

                {/* React Select */}
                <div className="mb-6 max-w-[200px]">
                    <div className="text-[14.5px] mb-2">เลือกหัวข้อ</div>

                    <Select
                        options={topicOptions}
                        value={topic}
                        onChange={(e) => setTopic(e)}
                        placeholder="เลือกหัวข้อ"
                        isSearchable={false}
                        className="text-[14.5px]"
                        styles={{
                            control: (base, state) => ({
                                ...base,
                                minHeight: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                borderColor: state.isFocused ? "#ec4899" : "#e5e7eb",
                                backgroundColor: "#f9fafb",
                                boxShadow: "none",
                                outline: "none",
                                "&:hover": {
                                    borderColor: "#ec4899",
                                },
                            }),
                            valueContainer: (base) => ({
                                ...base,
                                padding: "0 10px",
                            }),
                            placeholder: (base) => ({
                                ...base,
                                color: "#9ca3af",
                                fontSize: "13px",
                            }),
                            singleValue: (base) => ({
                                ...base,
                                color: "#374151",
                                fontSize: "13px",
                            }),
                            indicatorSeparator: () => ({
                                display: "none",
                            }),
                            dropdownIndicator: (base) => ({
                                ...base,
                                padding: "4px",
                                color: "#9ca3af",
                                "&:hover": {
                                    color: "#ec4899",
                                },
                            }),
                            menu: (base) => ({
                                ...base,
                                borderRadius: "10px",
                                overflow: "hidden",
                                marginTop: "6px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            }),
                            option: (base, state) => ({
                                ...base,
                                fontSize: "13px",
                                padding: "8px 12px",
                                backgroundColor: state.isSelected
                                    ? "#ec4899"
                                    : state.isFocused
                                        ? "#fdf2f8"
                                        : "white",
                                color: state.isSelected ? "#ffffff" : "#374151",
                                cursor: "pointer",
                            }),
                        }}
                        theme={(theme) => ({
                            ...theme,
                            colors: {
                                ...theme.colors,
                                primary: "#ec4899",
                                primary25: "#fdf2f8",
                                primary50: "#f9a8d4",
                            },
                        })}
                    />
                </div>

                <div className="mb-6">
                    <div className="text-[14.5px] mb-2">เลือกสี Post it</div>
                    <div className="flex gap-3 items-center">
                        {PRESET_COLORS.map((c) => (
                            <div
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full cursor-pointer shrink-0 ${getPostitColorStyle(c).className} ${color === c ? "ring-2 ring-black" : ""
                                    }`}
                            />
                        ))}

                        {/* วงกลมเลือกสีเอง — เปิด color picker ของเครื่อง เลือกสีอะไรก็ได้ */}
                        <label
                            title="เลือกสีเอง"
                            className={`relative w-8 h-8 rounded-full cursor-pointer shrink-0 overflow-hidden border border-gray-300 ${isCustomColor ? "ring-2 ring-black" : ""
                                }`}
                            style={{
                                background: isCustomColor
                                    ? color
                                    : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                            }}
                        >
                            <input
                                type="color"
                                value={isCustomColor ? color : "#fadbe6"}
                                onChange={(e) => setColor(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </label>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="text-[14.5px] mb-2">เลือกสีเทป</div>
                    <div className="flex gap-3 items-center">
                        {PRESET_TAPES.map((c) => (
                            <div
                                key={c}
                                onClick={() => setTapeColor(c)}
                                className={`w-10 h-4 rounded-sm cursor-pointer shrink-0 ${getPostitTapeStyle(c).className} ${tapeColor === c ? "ring-2 ring-black" : ""
                                    }`}
                            />
                        ))}

                        {/* เลือกสีเทปเอง */}
                        <label
                            title="เลือกสีเทปเอง"
                            className={`relative w-10 h-4 rounded-sm cursor-pointer shrink-0 overflow-hidden border border-gray-300 ${isCustomTape ? "ring-2 ring-black" : ""
                                }`}
                            style={{
                                background: isCustomTape
                                    ? tapeColor
                                    : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                            }}
                        >
                            <input
                                type="color"
                                value={isCustomTape ? tapeColor : "#f7b5c9"}
                                onChange={(e) => setTapeColor(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </label>
                    </div>
                </div>

                <div className="flex justify-center">
                    <div
                        className={`w-[250px] h-[250px] ${getPostitColorStyle(color).className} p-4 rounded-xl relative`}
                        style={getPostitColorStyle(color).style}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div
                                className={`w-20 h-4 ${getPostitTapeStyle(tapeColor).className} opacity-80`}
                                style={getPostitTapeStyle(tapeColor).style}
                            />
                        </div>

                        {/* topic preview */}
                        <div className="text-[13px] mb-1 text-gray-500 text-center">
                            {topic.label}
                        </div>

                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="เขียนคำถามของคุณที่นี่..."
                            className="w-full h-full bg-transparent outline-none resize-none text-center"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
    <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300"
    >
        ยกเลิก
    </button>

    <button
        onClick={() => {
            if (!text) return;
            onSubmit(text, color, tapeColor, topic.value);
        }}
        className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600"
    >
        {isEditing ? "บันทึก" : "ส่งคำถาม"}
    </button>
</div>
            </div>
        </div>
    );
}

/* ===== เมนูจุดสามจุด แก้ไข/ลบ — เฉพาะเจ้าของโพสต์ ===== */
function PostMenu({ onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "3px",
                    width: "24px",
                    height: "24px",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                }}
            >
                <span style={{ display: "block", width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#374151" }} />
                <span style={{ display: "block", width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#374151" }} />
                <span style={{ display: "block", width: "4px", height: "4px", borderRadius: "9999px", backgroundColor: "#374151" }} />
            </button>

            {open && (
                <div className="absolute right-0 top-8 z-20 w-28 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-[13.5px]">
                    <button
                        type="button"
                        style={{ backgroundColor: "white" }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            onEdit();
                        }}
                        className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50"
                    >
                        แก้ไข
                    </button>
                    <button
                        type="button"
                        style={{ backgroundColor: "white" }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            onDelete();
                        }}
                        className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50"
                    >
                        ลบ
                    </button>
                </div>
            )}
        </div>
    );
}

/* ===== Post-it card (หน้าตาเหมือนหน้าครู yc1 เป๊ะ) ===== */
function PostItCard({ post, isOwner, onClick, onLikeClick, onEdit, onDelete }) {
    const colorStyle = getPostitColorStyle(post.color);
    const tapeStyle = getPostitTapeStyle(post.tape);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === "Enter") onClick?.(); }}
            className="text-left cursor-pointer"
            style={{ backgroundColor: "white" }}
        >
            <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_10px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_35px_rgba(0,0,0,0.10)] transition-shadow">
                {/* จองพื้นที่แถวนี้ไว้เสมอ (สูงเท่ากันทุกการ์ด ไม่ว่าจะมีเมนูหรือไม่) ให้การ์ดสูงเท่าฝั่งครู — มีแต่เจ้าของโพสต์เท่านั้นที่เห็นปุ่มเมนูจริง */}
                <div className="flex justify-end mb-1" style={{ minHeight: "24px" }}>
                    {isOwner && <PostMenu onEdit={onEdit} onDelete={onDelete} />}
                </div>

                {/* post-it (เทปแปะทับขอบบน เอียงเหมือนแปะเทปจริง — สไตล์เดียวกับหน้าครู) */}
                <div className="relative">
                    <div
                        className={`absolute left-1/2 -top-3 h-5 w-24 rounded-sm ${tapeStyle.className} opacity-80 shadow-sm z-10`}
                        style={{ ...tapeStyle.style, transform: "translateX(-50%) rotate(-4deg)" }}
                    />

                    <div className={`rounded-xl ${colorStyle.className} p-5 min-h-[150px] relative`} style={colorStyle.style}>
                        <div className="whitespace-pre-line text-[16.5px] leading-relaxed text-gray-800">
                            {post.text}
                        </div>

                        {/* tiny folded corner */}
                        <div className="absolute right-0 bottom-0 w-10 h-10 bg-white/35 rounded-tl-2xl" />
                    </div>
                </div>

                {/* footer icons */}
                <div className="mt-3 flex items-center gap-6 text-gray-600 text-[13.5px]">
                    <button
                        type="button"
                        style={{ backgroundColor: "white" }}
                        onClick={onLikeClick}
                        className={`flex items-center gap-2 hover:opacity-70 transition ${post.liked ? "text-pink-500" : "text-gray-500"}`}
                    >
                        <FaRegHeart className={post.liked ? "text-pink-500" : "text-gray-500"} />
                        <span>{post.likes}</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <FaRegCommentDots className="text-gray-500" />
                        <span>{post.comments}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FaRegPaperPlane className="text-gray-500" />
                        <span>{post.shares}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

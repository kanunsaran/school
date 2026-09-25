
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import {
    FaTimes,
    FaYoutube,
    FaUpload,
    FaLink,
    FaPaperclip
} from "react-icons/fa";

import Select from "react-select";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

const MAX_FILES = 10;
const MAX_SIZE_MB = 10;

export default function PostComposerModal({
    open,
    onClose,
    onSubmit,
    initialData
}) {

    const [attachments, setAttachments] = useState([]);
    const [removedFileIds, setRemovedFileIds] = useState([]);
    const fileInputRef = useRef(null);

    const attachLink = async (type) => {

        const result = await Swal.fire({
            title: type === "youtube" ? "แนบ YouTube" : "แนบลิงก์",
            input: "text",
            inputPlaceholder: "วาง URL ที่นี่...",
            showCancelButton: true,
            confirmButtonText: "แนบ",
            cancelButtonText: "ยกเลิก"
        });

        if (!result.isConfirmed || !result.value) return;

        const url = result.value;

        setAttachments(prev => [
            // youtube/ลิงก์ แนบได้อย่างละ 1 อัน ถ้าแนบใหม่ให้แทนที่อันเดิม
            ...prev.filter(a => a.type !== type),
            {
                id: Date.now(),
                type: type,
                url: url
            }
        ]);

    };

    // ============ อัปโหลดไฟล์จากเครื่อง (เลือกได้หลายไฟล์พร้อมกัน) ============
    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e) => {
        const selected = Array.from(e.target.files || []);
        if (!selected.length) return;

        const currentFileCount = attachments.filter(a => a.type === "file").length;

        if (currentFileCount + selected.length > MAX_FILES) {
            Swal.fire("แนบไฟล์เกินจำนวน", `แนบไฟล์ได้สูงสุด ${MAX_FILES} ไฟล์ต่อโพสต์`, "warning");
            e.target.value = "";
            return;
        }

        const oversize = selected.find(f => f.size > MAX_SIZE_MB * 1024 * 1024);
        if (oversize) {
            Swal.fire("ไฟล์ใหญ่เกินไป", `แต่ละไฟล์ต้องไม่เกิน ${MAX_SIZE_MB}MB (${oversize.name})`, "warning");
            e.target.value = "";
            return;
        }

        const newAttachments = selected.map((file, i) => {
            const isImage = file.type.startsWith("image/");
            return {
                id: Date.now() + i,
                type: "file",
                file, // File object จริง ไว้ส่งตอน submit
                name: file.name,
                isImage,
                previewUrl: isImage ? URL.createObjectURL(file) : null
            };
        });

        setAttachments(prev => [...prev, ...newAttachments]);

        e.target.value = ""; // reset เพื่อให้เลือกไฟล์เดิมซ้ำได้อีก
    };

    const removeAttachment = (item) => {
        // ถ้าเป็นไฟล์เดิมที่เคยอัปโหลดไว้แล้ว (มี file_id) ต้องจำไว้ลบที่ backend ตอน submit ด้วย
        if (item.type === "file" && item.file_id) {
            setRemovedFileIds(prev => [...prev, item.file_id]);
        }
        setAttachments(prev => prev.filter(a => a.id !== item.id));
    };

    const classOptions = [
        { value: "6/5", label: "วิชาแนะแนว 6/5" },
        { value: "6/6", label: "วิชาแนะแนว 6/6" },
        { value: "6/7", label: "วิชาแนะแนว 6/7" }
    ];

    const [selectedClass, setSelectedClass] = useState(classOptions[0]);
    const [postText, setPostText] = useState("");

    useEffect(() => {

        if (initialData) {

            setPostText(initialData.content || "");

            const newAttachments = [];

            if (initialData.youtube_url) {
                newAttachments.push({
                    id: Date.now() + 1,
                    type: "youtube",
                    url: initialData.youtube_url
                });
            }

            if (initialData.link_url) {
                newAttachments.push({
                    id: Date.now() + 2,
                    type: "link",
                    url: initialData.link_url
                });
            }

            (initialData.files || []).forEach((f, i) => {
                const name = f.file_name || (f.file_url || "").split("/").pop();
                const type = f.file_type || f.mime_type || "";
                newAttachments.push({
                    id: Date.now() + 3 + i,
                    type: "file",
                    url: f.file_url, // ไฟล์เดิมที่เคยอัปโหลดไว้แล้ว (ยังไม่มี File object ใหม่)
                    name,
                    isImage: type ? type.startsWith("image/") : /\.(png|jpe?g|gif|webp|svg)$/i.test(name || ""),
                    file_id: f.file_id
                });
            });

            setAttachments(newAttachments);
            setRemovedFileIds([]);

        } else {

            setPostText("");
            setAttachments([]);
            setRemovedFileIds([]);

        }

    }, [initialData]);

    // เคลียร์ฟอร์มกลับเป็นค่าว่าง ใช้ตอนปิด modal (ยกเลิก/โพสต์เสร็จแล้ว) กันข้อมูลเดิมค้างรอบถัดไป
    const resetAndClose = () => {
        setPostText("");
        setAttachments([]);
        setRemovedFileIds([]);
        onClose();
    };

    if (!open) return null;

    const imageAttachments = attachments.filter(a => a.type === "file" && a.isImage);
    const otherAttachments = attachments.filter(a => !(a.type === "file" && a.isImage));

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">

            <div className="w-[900px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-[fadeIn_.18s_ease]">

                {/* header */}
                <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100">

                    <div className="text-[18px] font-semibold text-gray-900">
                        {initialData ? "แก้ไขโพสต์" : "ประกาศ"}
                    </div>

                    <button
                        onClick={resetAndClose}
                        className="text-gray-400 hover:text-gray-700 transition"
                    >
                        <FaTimes size={18} />
                    </button>

                </div>

                {/* body */}
                <div className="p-6">

                    <div className="text-[13px] font-semibold text-gray-600">
                        สำหรับ
                    </div>

                    {/* select */}
                    <div className="mt-3 w-[280px]">

                        <Select
                            value={selectedClass}
                            onChange={setSelectedClass}
                            options={classOptions}
                            isSearchable={false}
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    minHeight: "44px",
                                    borderRadius: "16px",
                                    borderColor: "#e5e7eb",
                                    boxShadow: "none",
                                    fontSize: "14px",
                                    "&:hover": {
                                        borderColor: "#cbd5e1"
                                    }
                                }),
                                menu: (base) => ({
                                    ...base,
                                    borderRadius: "14px",
                                    overflow: "hidden"
                                })
                            }}
                        />

                    </div>

                    {/* editor */}
                    <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

                        <CKEditor
                            editor={ClassicEditor}
                            data={postText}
                            onChange={(event, editor) => {
                                setPostText(editor.getData());
                            }}
                            config={{
                                placeholder: "ประกาศบางสิ่งในชั้นเรียน...",
                                toolbar: [
                                    "bold",
                                    "italic",
                                    "underline",
                                    "bulletedList",
                                    "numberedList",
                                    "link"
                                ]
                            }}
                        />

                        {(imageAttachments.length > 0 || otherAttachments.length > 0) && (
                            <div className="mt-4 flex flex-col gap-3 px-4 pb-4">

                                {/* รูปภาพ: thumbnail เรียงเป็นแถว เลื่อนดูได้ถ้ามีเยอะ */}
                                {imageAttachments.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {imageAttachments.map((item) => (
                                            <div key={item.id} className="relative shrink-0" style={{ width: 96, height: 96 }}>
                                                <img
                                                    src={item.previewUrl || item.url}
                                                    className="w-full h-full object-cover rounded-xl border border-gray-200"
                                                />
                                                <button
                                                    onClick={() => removeAttachment(item)}
                                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-500 flex items-center justify-center shadow"
                                                >
                                                    <FaTimes size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* youtube / ลิงก์ / ไฟล์เอกสารที่ไม่ใช่รูป: แสดงเป็นแถวเหมือนเดิม */}
                                {otherAttachments.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3"
                                    >

                                        <div className="flex items-center gap-3 min-w-0">

                                            {item.type === "youtube" && (
                                                <FaYoutube className="text-red-500 shrink-0" />
                                            )}
                                            {item.type === "link" && (
                                                <FaLink className="text-blue-500 shrink-0" />
                                            )}
                                            {item.type === "file" && (
                                                <FaPaperclip className="text-gray-500 shrink-0" />
                                            )}

                                            {item.type === "file" ? (
                                                <span className="text-sm text-gray-700 truncate">
                                                    {item.name}
                                                </span>
                                            ) : (
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    className="text-sm text-blue-600 hover:underline truncate"
                                                >
                                                    {item.url}
                                                </a>
                                            )}

                                        </div>

                                        <button
                                            onClick={() => removeAttachment(item)}
                                            className="text-gray-400 hover:text-red-500 shrink-0"
                                        >
                                            <FaTimes />
                                        </button>

                                    </div>
                                ))}

                            </div>
                        )}

                    </div>

                    {/* input ไฟล์ที่ซ่อนไว้ ใช้ยิง click ผ่านปุ่ม "อัปโหลด" — เลือกได้หลายไฟล์ */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelected}
                        accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                        multiple
                        className="hidden"
                    />

                    {/* attach */}
                    <div className="mt-6 flex gap-10">

                        <Attach
                            icon={<FaYoutube />}
                            label="YouTube"
                            onClick={() => attachLink("youtube")}
                        />

                        <Attach icon={<FaUpload />} label="อัปโหลด" onClick={openFilePicker} />

                        <Attach
                            icon={<FaLink />}
                            label="ลิงก์"
                            onClick={() => attachLink("link")}
                        />

                    </div>

                </div>

                {/* footer */}
                <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">

                    <button
                        onClick={resetAndClose}
                        style={{ backgroundColor: "white" }}
                        className="h-11 px-6 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                    >
                        ยกเลิก
                    </button>


                    <button
                        disabled={!postText}
                        onClick={() => {
                            if (!postText) return;
                            onSubmit({
                                content: postText,
                                attachments: attachments,
                                removedFileIds
                            });
                            resetAndClose();
                        }}
style={{ backgroundColor: "rgba(252, 231, 243, 0.8)" }}
className={`
  h-11 px-8 rounded-xl
  font-semibold
  border border-gray-200
  bg-white
  text-black
  hover:text-blue-600
  hover:border-blue-400
  hover:bg-blue-500
  active:scale-95
  transition-all duration-200
  shadow-sm hover:shadow
  ${!postText && "cursor-not-allowed"}
`}
>
  {initialData ? "บันทึก" : "โพสต์"}
</button>
                </div>

            </div>

        </div>
    );
}

function Attach({ icon, label, onClick }) {

    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-2 w-[86px] group"
            style={{ backgroundColor: "white" }}
        >

            <div
                className="
          w-14 h-14 rounded-full
          border border-gray-200
          bg-white
          shadow-sm
          flex items-center justify-center
          text-gray-700
          group-hover:-translate-y-1
          group-hover:shadow-lg
          group-hover:bg-gray-50
          transition
          "
            >
                {icon}
            </div>

            <div className="text-[13px] text-gray-600 group-hover:text-gray-900 transition">
                {label}
            </div>

        </button>
    );
}

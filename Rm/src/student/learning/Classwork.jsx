import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import SidebarNav from "../../navstudent";
import Header from "../../Header";
import { FaRegFileAlt, FaRegClipboard } from "react-icons/fa";

export default function StudentClassworkPage() {
    const navigate = useNavigate();

    const docs = [
        {
            title: "การรู้จักและเข้าใจตนเอง",
            date: "โพสต์เมื่อ 15 พฤษภาคม 2568",
        },
        {
            title: "บุคลิกภาพของฉัน",
            date: "โพสต์เมื่อ 10 พฤษภาคม 2568",
        },
    ];

    const works = [
        {
            title: "การรู้จักและเข้าใจตนเอง",
            status: "ยังไม่ได้ส่ง",
            due: "ครบกำหนด 15 พฤษภาคม 2568",
        },
        {
            title: "วิเคราะห์ตนเอง",
            status: "ส่งแล้ว",
            due: "ครบกำหนด 12 พฤษภาคม 2568",
        },
        {
            title: "Mindset",
            status: "ครบกำหนด",
            due: "ครบกำหนด 1 พฤษภาคม 2568",
        },
    ];

    const topicOptions = useMemo(
        () => [
            { value: "all", label: "หัวข้อทั้งหมด" },
            { value: "none", label: "ไม่มีหัวข้อ" },
            { value: "c1", label: "บทที่ 1" },
            { value: "c2", label: "บทที่ 2" },
        ],
        []
    );

    const [topic, setTopic] = useState(topicOptions[0]);

    const selectBaseStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: 40,
            height: 40,
            borderRadius: 12,
            borderColor: state.isFocused ? "#9CA3AF" : "#E5E7EB",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(0,0,0,0.05)" : "none",
            backgroundColor: "#fff",
            cursor: "pointer",
        }),
        valueContainer: (base) => ({ ...base, padding: "0 10px" }),
        indicatorSeparator: () => ({ display: "none" }),
        menu: (base) => ({
            ...base,
            borderRadius: 14,
            border: "1px solid #E5E7EB",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            zIndex: 999999,
        }),
    };

    return (
        <div className="min-h-screen w-full bg-white flex text-[14px] text-gray-800">
            <SidebarNav role="student" />

            <div className="flex-1 flex flex-col overflow-y-auto">
                <Header title="งานในชั้นเรียน" />

                <main className="w-full px-6 md:px-8 pt-24 pb-10">

                    {/* Title */}
                    <h1 className="text-[18px] font-medium text-gray-900">
                        งานในชั้นเรียน
                    </h1>

                    {/* Filter */}
                    <div className="mt-6">
                        <div className="w-[220px]">
                            <Select
                                value={topic}
                                onChange={(opt) => setTopic(opt)}
                                options={topicOptions}
                                styles={selectBaseStyles}
                                isSearchable={false}
                            />
                        </div>
                    </div>

                    {/* Docs */}
                    <Section title="เอกสารประกอบการเรียน" />
                    <div className="mt-3 border-t border-b border-gray-200">
                        {docs.map((d, i) => (
                            <Row
                                key={i}
                                icon={<FaRegFileAlt />}
                                title={d.title}
                                date={d.date}
                                onClick={() => navigate(`/document/${i}`)}
                            />
                        ))}
                    </div>

                    {/* Works */}
                    <div className="mt-10">
                        <Section title="ใบงาน" />
                        <div className="mt-3 border-t border-b border-gray-200">
                            {works.map((w, i) => (
                                <Row
                                    key={i}
                                    icon={<FaRegClipboard />}
                                    title={w.title}
                                    date={w.due}
                                    status={w.status}
                                    onClick={() => navigate(`/classwork/${i}`)}
                                />
                            ))}
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}

/* Section */
const Section = ({ title }) => (
    <div className="mt-10">
        <h2 className="text-[13px] font-medium text-gray-400">
            {title}
        </h2>
    </div>
);

const Row = ({ icon, title, status, date, onClick }) => {
    const getStatusColor = () => {
        if (status === "ส่งแล้ว") return "text-emerald-500";
        if (status === "ยังไม่ได้ส่ง") return "text-amber-500";
        if (status === "ครบกำหนด") return "text-rose-500";
        return "text-gray-400";
    };

    return (
        <div
            onClick={onClick}
            className="
                flex justify-between items-center
                px-5 py-4
                border-b border-gray-200
                hover:bg-gray-50
                cursor-pointer
            "
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-gray-400 text-[13px]">{icon}</span>
                <p className="text-[14px] text-gray-800 truncate">{title}</p>
            </div>

            {(status || date) && (
                <div className={`text-[13px] font-medium text-right ${getStatusColor()}`}>
                    {status || date}
                </div>
            )}
        </div>
    );
};

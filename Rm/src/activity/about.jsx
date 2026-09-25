import { useEffect, useState } from "react";
import SidebarNav from "../nav.jsx";
import StudentSidebarNav from "../navstudent.jsx";
import Header from "../Header.jsx";
import PageLoading from "../components/PageLoading.jsx";
import SchoolInfoEditModal from "../components/SchoolInfoEditModal.jsx";
import { getSchoolInfo } from "../callapi/callapi_user.jsx";
import { getCurrentUser } from "../utils/auth.js";
import { resolveFileUrl } from "../utils/media.js";
import { API_BASE } from "../utils/feedShared.js";
import {
    FaSchool,
    FaMapMarkerAlt,
    FaPhoneAlt,
    FaEnvelope,
    FaGlobe,
    FaFacebook,
    FaBook,
    FaPalette,
    FaEdit,
} from "react-icons/fa";

export default function About() {
    const currentUser = getCurrentUser();
    const isTeacher = currentUser?.role === "teacher";
    const Sidebar = isTeacher ? SidebarNav : StudentSidebarNav;

    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);

    useEffect(() => {
        getSchoolInfo()
            .then((data) => setInfo(data))
            .catch((err) => console.error("โหลดข้อมูลโรงเรียนไม่สำเร็จ:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !info) {
        return (
            <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
                <Sidebar />
                <div className="flex-1 min-w-0">
                    <Header />
                    <main className="flex-1 min-w-0 px-8 pt-24 pb-16">
                        <PageLoading />
                    </main>
                </div>
            </div>
        );
    }

    const colors = info.colors?.length === 3 ? info.colors : [{ name: "ชมพู", image_url: null }, { name: "ฟ้า", image_url: null }, { name: "เหลือง", image_url: null }];
    const colorStyle = (c) =>
        c.image_url
            ? { backgroundImage: `url(${resolveFileUrl(API_BASE, c.image_url)})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#e5e7eb" };

    return (
        <div className="min-h-screen w-full bg-white flex text-[16px] text-gray-800">
            <Sidebar />

            <div className="flex-1 min-w-0">
                <Header />

                <main className="flex-1 min-w-0 px-8 pt-24 pb-16">

                    {/* Hero */}
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="h-1.5 flex">
                            {colors.map((c, i) => (
                                <div key={i} className="flex-1" style={colorStyle(c)} />
                            ))}
                        </div>
                        <div className="px-6 py-7 flex items-center justify-between gap-5 bg-white">
                            <div className="flex items-center gap-5">
                                <div className="h-16 w-16 rounded-2xl bg-pink-500 text-white flex items-center justify-center text-[26px] shrink-0">
                                    <FaSchool />
                                </div>
                                <div>
                                    <h1 className="page-title">
                                        {info.school_name_th}
                                    </h1>
                                    <p className="text-[14.5px] text-gray-500 mt-1">
                                        {info.school_name_en}
                                    </p>
                                    <p className="page-subtitle mt-1">
                                        {info.subtitle}
                                    </p>
                                </div>
                            </div>

                            {isTeacher && (
                                <button
                                    type="button"
                                    onClick={() => setEditOpen(true)}
                                    className="h-10 px-4 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 text-[14px] font-semibold flex items-center gap-2 shrink-0"
                                >
                                    <FaEdit size={13} /> แก้ไขข้อมูล
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid lg:grid-cols-[1.2fr_1fr] gap-8">

                        {/* LEFT */}
                        <div className="space-y-6">

                            {/* About School */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">

                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center text-[18px]">
                                        <FaSchool />
                                    </div>

                                    <h2 className="text-[17px] font-semibold text-gray-900">
                                        เกี่ยวกับโรงเรียน
                                    </h2>
                                </div>

                                <p className="text-[15.5px] text-gray-600 leading-8 whitespace-pre-line">
                                    {info.description}
                                </p>

                            </div>

                            {/* Contact */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">

                                <h2 className="text-[17px] font-semibold text-gray-900 mb-5">
                                    ข้อมูลการติดต่อ
                                </h2>

                                <div className="space-y-5">

                                    <div className="flex gap-4">

                                        <div className="w-11 h-11 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center text-[16px] shrink-0">
                                            <FaMapMarkerAlt />
                                        </div>

                                        <div>
                                            <div className="text-[15.5px] font-medium text-gray-900">
                                                ที่อยู่
                                            </div>

                                            <div className="text-[15px] text-gray-500 leading-7 whitespace-pre-line">
                                                {info.address}
                                            </div>

                                        </div>

                                    </div>

                                    <div className="flex gap-4">

                                        <div className="w-11 h-11 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center text-[16px] shrink-0">
                                            <FaPhoneAlt />
                                        </div>

                                        <div>
                                            <div className="text-[15.5px] font-medium">
                                                โทรศัพท์
                                            </div>

                                            <div className="text-[15px] text-gray-500 leading-7">
                                                {(info.phones || []).map((p, i) => (
                                                    <div key={i}>{p}</div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>

                                    <div className="flex gap-4">

                                        <div className="w-11 h-11 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center text-[16px] shrink-0">
                                            <FaEnvelope />
                                        </div>

                                        <div>
                                            <div className="text-[15.5px] font-medium">
                                                อีเมล
                                            </div>

                                            <div className="text-[15px] text-gray-500 leading-7">
                                                {(info.emails || []).map((e, i) => (
                                                    <div key={i}>{e}</div>
                                                ))}
                                            </div>

                                        </div>

                                    </div>

                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-6">

                                    {info.website_url && (
                                        <a
                                            href={info.website_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-11 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[15px] font-medium flex items-center justify-center gap-2 transition"
                                        >
                                            <FaGlobe />
                                            เว็บไซต์
                                        </a>
                                    )}

                                    {info.facebook_url && (
                                        <a
                                            href={info.facebook_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="h-11 rounded-xl border border-gray-200 hover:bg-gray-50 text-[15px] font-medium flex items-center justify-center gap-2 transition"
                                        >
                                            <FaFacebook className="text-blue-600" />
                                            Facebook
                                        </a>
                                    )}

                                </div>

                            </div>

                        </div>

                        {/* RIGHT */}
                        <div className="space-y-6">
                            {/* Google Map */}
                            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                                <iframe
                                    title="School location"
                                    src="https://www.google.com/maps?q=Khon+Kaen+Wittayayon+School&output=embed"
                                    className="w-full h-70"
                                    loading="lazy"
                                />
                            </div>

                            {/* Motto */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-11 h-11 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center text-[16px] shrink-0">
                                        <FaBook />
                                    </div>

                                    <div>
                                        <h2 className="text-[17px] font-semibold text-gray-900">
                                            คติพจน์โรงเรียน
                                        </h2>

                                        <p className="text-[14.5px] text-gray-400">
                                            Philosophy
                                        </p>
                                    </div>
                                </div>

                                <p className="text-[22px] font-semibold text-pink-500">
                                    {info.motto_pali}
                                </p>

                                <p className="mt-2 text-[15px] text-gray-500 leading-8">
                                    {info.motto_translation}
                                </p>

                                <div className="mt-5 pt-5 border-t border-gray-100">
                                    <div className="text-[14.5px] text-gray-400 mb-1">
                                        คำขวัญโรงเรียน
                                    </div>
                                    <p className="text-[15px] text-gray-600 leading-8">
                                        {info.slogan}
                                    </p>
                                </div>
                            </div>

                            {/* School Colors */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">

                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-11 h-11 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center text-[16px] shrink-0">
                                        <FaPalette />
                                    </div>

                                    <div>
                                        <h2 className="text-[17px] font-semibold text-gray-900">
                                            สีประจำโรงเรียน
                                        </h2>

                                        <p className="text-[14.5px] text-gray-400">
                                            School Colors
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    {colors.map((c, i) => (
                                        <div key={i} className="rounded-xl border border-gray-200 p-4 text-center">
                                            <div className="w-14 h-14 rounded-full mx-auto mb-3" style={colorStyle(c)}></div>
                                            <div className="text-[15px] font-medium">{c.name}</div>
                                        </div>
                                    ))}
                                </div>

                            </div>

                        </div>
                    </div>
                </main>
            </div>

            {editOpen && (
                <SchoolInfoEditModal
                    info={info}
                    onClose={() => setEditOpen(false)}
                    onSaved={(updated) => setInfo(updated)}
                />
            )}
        </div>
    );
}

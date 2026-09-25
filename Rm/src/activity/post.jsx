

// import React, { useMemo, useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import SidebarNav from "../nav.jsx"; 
// import Header from "../Header";

// import {
//   FaHome,
//   FaRegHeart,
//   FaRegCommentDots,
//   FaRegPaperPlane,
//   FaRegImage,
//   FaRegFileAlt,
//   FaRegUser,
//   FaChevronDown,
//   FaRegSmile,
//   FaUpload,

// } from "react-icons/fa";
// import { useEffect } from "react";
// import {
//   getannouncements,
//   createAnnouncement,
//   deleteAnnouncement,
//   updateAnnouncement
// } from "../callapi/callapi_user";
// import { FaEllipsisH } from "react-icons/fa";







// export default function PostPage() {
//   const [confirmPostOpen, setConfirmPostOpen] = useState(false);
//   const [menuOpen, setMenuOpen] = useState(null);
//   const [editingPost, setEditingPost] = useState(null);
//   const [editText, setEditText] = useState("");
//   const [editImage, setEditImage] = useState(null);
// const [editFile, setEditFile] = useState(null);
// const [removeFiles, setRemoveFiles] = useState([]);
//   const teacher = useMemo(
//     () => ({
//       name: "คุณครู สุพรรณี",
//       role: "ครูประจำชั้น ป.6/5",
//       avatar: "/image/Teachar.jpg",
//     }),
//     []
//   );

  

//   const location = useLocation();
//   const [openActivities, setOpenActivities] = useState(true);

//   // const [year, setYear] = useState("ปีการศึกษา");
//   // const [level, setLevel] = useState("ชั้นปีการศึกษา");
//   const [yearOpen, setYearOpen] = useState(false);
//   const [levelOpen, setLevelOpen] = useState(false);

//   const [composer, setComposer] = useState("");
//   const [image, setImage] = useState(null);
//   const [file, setFile] = useState(null);
//   const [posts, setPosts] = useState([]);
//   const iconBtn = "hover:text-gray-800 cursor-pointer flex items-center justify-center";
//   const [files, setFiles] = useState({});
//   const [attachOpen, setAttachOpen] = useState(false);



//   const [loading, setLoading] = useState(true);


//   const routes = {
//     home: "/",
//     activityPost: "/activities/posts",
//     activityPhotos: "/activities/photos",
//     activityAbout: "/activities/about",
//     assessment: "/assessment",
//     community: "/community",
//     goals: "/goals",
//     logout: "/logout",
//   };

//   const isActive = (path) => location.pathname === path;
//   useEffect(() => {
//     loadPosts();
//   }, []);

//   const loadPosts = async () => {
//     try {
//       const data = await getannouncements();
//       const postList = Array.isArray(data) ? data : [];

//       setPosts(postList);

//       const fileMap = {};

//       for (const p of postList) {
//         const res = await fetch(
//           `http://localhost:3000/announcements/${p.news_id}/files`
//         );
//         const f = await res.json();
//         fileMap[p.news_id] = f;
//       }

//       setFiles(fileMap);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };
//   const handlePost = async () => {
//     if (!composer.trim()) return;
  
//     try {
//       const res = await createAnnouncement("กิจกรรม", composer);
//       const newsId = res.news_id;

//       if (image) {
//         const form = new FormData();
//         form.append("file", image);

//         await fetch(`http://localhost:3000/announcements/${newsId}/upload`, {
//           method: "POST",
//           body: form,
//         });
//       }

//       if (file) {
//         const form = new FormData();
//         form.append("file", file);

//         await fetch(`http://localhost:3000/announcements/${newsId}/upload`, {
//           method: "POST",
//           body: form,
//         });
//       }

//       setComposer("");
//       setImage(null);
//       setFile(null);

//       loadPosts();
//     } catch (err) {
//       console.error(err);
//     }
//   };
//   const handleImageChange = (e) => {
//     setImage(e.target.files[0]);
//   };

//   const handleFileChange = (e) => {
//     setFile(e.target.files[0]);
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("ต้องการลบโพสต์หรือไม่")) return;
  
//     try {
//       await deleteAnnouncement(id);
//       loadPosts();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const handleUpdate = async () => {
//     try {
  
//       await updateAnnouncement(editingPost, editText);
  
//       if (editImage) {
//         const form = new FormData();
//         form.append("file", editImage);
  
//         await fetch(`http://localhost:3000/announcements/${editingPost}/upload`, {
//           method: "POST",
//           body: form,
//         });
//       }
  
//       if (editFile) {
//         const form = new FormData();
//         form.append("file", editFile);
  
//         await fetch(`http://localhost:3000/announcements/${editingPost}/upload`, {
//           method: "POST",
//           body: form,
//         });
//       }
  
//       for (const fileId of removeFiles) {
//         await fetch(`http://localhost:3000/files/${fileId}`, {
//           method: "DELETE",
//         });
//       }
  
//       setEditingPost(null);
//       setEditText("");
//       setEditImage(null);
//       setEditFile(null);
//       setRemoveFiles([]);
  
//       loadPosts();
  
//     } catch (err) {
//       console.error(err);
//     }
//   };
  


//   return (
//     <div className="min-h-screen bg-white text-[13px] text-gray-800">
//       <div className="flex">
//         <Header />
//         <SidebarNav />

//         {/* ================= Main ================= */}
//         <main className="flex-1 pt-18" style={{backgroundColor: "white"}} >
//           {/* header */}
          
//           <div className="px-10 pt-8 pb-4 flex items-center justify-between">
//             <h1 className="text-[40px] leading-none font-extrabold text-gray-900" >
//               กิจกรรม
//             </h1>

//             {/* <div className="flex gap-5" >
//               <Dropdown 
//                 value={year}
//                 open={yearOpen}
//                 onToggle={() => {
//                   setYearOpen((v) => !v);
//                   setLevelOpen(false);
//                 }}
//                 options={["ปีการศึกษา", "2568", "2567", "2566" ]} 
//                 onPick={(v) => {
//                   setYear(v);
//                   setYearOpen(false);
//                 }}
//               />
//               <Dropdown 
//                 value={level}
//                 open={levelOpen}
//                 onToggle={() => {
//                   setLevelOpen((v) => !v);
//                   setYearOpen(false);
//                 }}
//                 options={["ชั้นปีการศึกษา", "ป.6/1", "ป.6/2", "ป.6/5"]}
//                 onPick={(v) => {
//                   setLevel(v);
//                   setLevelOpen(false);
//                 }}
//               />
//             </div> */}
//           </div>

//           <div className="px-10 pb-10">
//             <div className="grid grid-cols-12 gap-8">
//               <section className="col-span-9 space-y-6">
//                 {/* composer */}
//                 <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
//                   <div className="p-5 flex gap-4">
//                     <img
//                       src={teacher.avatar}
//                       alt="avatar"
//                       className="h-12 w-12 rounded-full object-cover"
//                     />

//                     <div className="flex-1">
//                       <div className="font-semibold text-gray-900">{teacher.name}</div>

//                       <textarea

//                         value={composer}
//                         onChange={(e) => setComposer(e.target.value)}
//                         placeholder="ใส่รายละเอียดกิจกรรมที่นี่"
//                         className="mt-3 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
//                         rows={2}
//                       />
//                       {image && (
//                         <div className="text-xs text-gray-500 mt-2">
//                           รูป: {image.name}
//                         </div>
//                       )}

//                       {image && (
//                         <div className="mt-2">
//                           <img
//                             src={URL.createObjectURL(image)}
//                             className="max-h-60 rounded-lg border"
//                           />
//                         </div>
//                       )}

//                       {file && (
//                         <div className="mt-2 p-3 border rounded-lg bg-gray-50 text-sm">
//                           <div className="font-medium">{file.name}</div>

//                           {file.type === "application/pdf" && (
//                             <iframe
//                               src={URL.createObjectURL(file)}
//                               className="w-full h-60 mt-2 rounded"
//                             />
//                           )}

//                           {(file.type.includes("word") || file.type.includes("officedocument")) && (
//                             <div className="text-gray-500 mt-1">
//                               ไฟล์ Word แสดง preview ไม่ได้ (จะเปิดหลังโพสต์)
//                             </div>
//                           )}
//                         </div>
//                       )}

//                       <div className="mt-3 flex items-center justify-between">
//                         <div className="flex items-center gap-4 text-gray-800">

//                           <label className={iconBtn} title="แนบรูป">
//                             <FaRegImage />
//                             <input
//                               type="file"
//                               accept="image/*"
//                               onChange={handleImageChange}
//                               className="hidden"
//                             />
//                           </label>

//                           <label className={iconBtn} title="อัปโหลดไฟล์">
//                             <FaUpload />
//                             <input
//                               type="file"
//                               onChange={handleFileChange}
//                               className="hidden"
//                             />
//                           </label>

//                           {/* <button className={iconBtn} title="เพิ่มอีโมจิ">
//   <FaRegSmile />
// </button> */}

//                         </div>

//                         <div className="flex items-center gap-3">
//                           <button 
//                             onClick={() => setComposer("")}
//                             className="px-6 py-2 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50" style={{backgroundColor: "white"}}
//                           >
//                             ยกเลิก
//                           </button>
//                           <button style={{ backgroundColor: "rgba(252, 231, 243, 0.8)" }}
//   className="px-7 py-2 rounded-full bg-pink-500 text-black hover:bg-pink-600 shadow-sm" 
//   onClick={() => setConfirmPostOpen(true)}
// >
//   โพสต์
// </button>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>


//                 {/* feed from DB */}
//                 {loading && <div className="text-gray-400">กำลังโหลด...</div>}

//                 {!loading && posts.length === 0 && (
//                   <div className="text-gray-400">ยังไม่มีประกาศ</div>
//                 )}

//                 {!loading &&
//                   posts.map((post) => (
//                     <div
//                       key={post.news_id}
//                       className="bg-white rounded-2xl border border-gray-200 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
//                     >
//                       <div className="p-6 flex gap-4">
//                         <img
//                           src={teacher.avatar}
//                           alt="avatar"
//                           className="h-12 w-12 rounded-full object-cover"
//                         />

//                         <div className="flex-1">
//                         <div className="flex items-start justify-between gap-4">

// {/* LEFT : ชื่อ + เวลา */}
// <div>
//   <div className="font-semibold text-gray-900">
//     {teacher.name}
//   </div>

//   <div className="text-gray-500 mt-1 text-[12px]">
//     {(post.timestamp || post.created_at) &&
//       `${new Date(post.timestamp || post.created_at).toLocaleDateString("th-TH", {
//         year: "numeric",
//         month: "long",
//         day: "numeric",
//       })} เวลา ${new Date(post.timestamp || post.created_at).toLocaleTimeString(
//         "th-TH",
//         {
//           hour: "2-digit",
//           minute: "2-digit",
//         }
//       )} น.`}
//   </div>
// </div>

// {/* RIGHT : ... */}
// <div className="relative" style={{backgroundColor: "white"}}>
//   <button style={{backgroundColor: "white"}}
//     onClick={() =>
//       setMenuOpen(menuOpen === post.news_id ? null : post.news_id)
//     }
//     className="p-2 rounded-full hover:bg-gray-100"
//   >
//     <FaEllipsisH className="text-gray-500" />
//   </button>

//   {menuOpen === post.news_id && (
//     <div className="absolute right-0 mt-2 w-36 bg-white border rounded-xl shadow-lg z-50" >

//       <button style={{backgroundColor: "white"}}
//         onClick={() => {
//           setEditingPost(post.news_id);
//           setEditText(post.content);
//           setEditImage(null);
//           setEditFile(null);
//           setRemoveFiles([]);
//           setMenuOpen(null);
//         }}
//         className="w-full text-left px-4 py-2 hover:bg-gray-100"
//       >
//         แก้ไขโพสต์
//       </button>

//       <button style={{backgroundColor: "white"}}
//         onClick={() => handleDelete(post.news_id)}
//         className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50"
//       >
//         ลบโพสต์
//       </button>

//     </div>
//   )}
// </div>


                            
//                           </div>

//                           {editingPost === post.news_id ? (
//   <div className="mt-4 space-y-3">

//     <textarea
//       value={editText}
//       onChange={(e) => setEditText(e.target.value)}
//       className="w-full border rounded-xl p-3"
//       rows={4}
//     />

//     {/* เพิ่มรูป */}
//     <label className="flex items-center gap-2 text-sm cursor-pointer">
//       <FaRegImage />
//       เพิ่มรูป
//       <input
//         type="file"
//         accept="image/*"
//         className="hidden"
//         onChange={(e) => setEditImage(e.target.files[0])}
//       />
//     </label>
//     {editImage && (
//   <div className="mt-2">
//     <img
//       src={URL.createObjectURL(editImage)}
//       className="max-h-60 rounded-lg border"
//     />
//   </div>
// )}

//     {/* เพิ่มไฟล์ */}
//     <label className="flex items-center gap-2 text-sm cursor-pointer">
//       <FaUpload />
//       เพิ่มไฟล์
//       <input
//         type="file"
//         className="hidden"
//         onChange={(e) => setEditFile(e.target.files[0])}
//       />
//     </label>
//     {editFile && (
//   <div className="mt-2 p-3 border rounded-lg bg-gray-50 text-sm">
//     <div className="font-medium">{editFile.name}</div>

//     {editFile.type === "application/pdf" && (
//       <iframe
//         src={URL.createObjectURL(editFile)}
//         className="w-full h-60 mt-2 rounded"
//       />
//     )}

//     {editFile.type.startsWith("image") && (
//       <img
//         src={URL.createObjectURL(editFile)}
//         className="max-h-60 rounded-lg border mt-2"
//       />
//     )}

//     {!editFile.type.startsWith("image") &&
//       editFile.type !== "application/pdf" && (
//         <div className="text-gray-500 mt-1">
//           preview ไม่รองรับไฟล์นี้
//         </div>
//       )}
//   </div>
// )}

//   </div>
// ) : (
//   <div className="mt-4 whitespace-pre-line leading-relaxed">
//     {post.content}
//   </div>
// )}
// {editingPost === post.news_id && (
//   <div className="flex gap-2 mt-4">
//     <button style={{backgroundColor: "white"}}
//       onClick={() => {
//         setEditingPost(null);
//         setEditText("");
//       }}
//       className="px-4 py-2 rounded-lg bg-gray-100"
//     >
//       ยกเลิก
//     </button>

//     <button style={{ backgroundColor: "rgba(252, 231, 243, 0.8)" }}
//       onClick={handleUpdate}
//       className="px-4 py-2 rounded-lg bg-pink-500 text-black"
//     >
//       บันทึก
//     </button>
//   </div>
// )}
//                           {files[post.news_id]?.map((f) => (

// <div key={f.file_id} className="mt-3 relative">
//                               {editingPost === post.news_id && (
//   <button style={{backgroundColor: "white"}}
//     onClick={() =>
//       setRemoveFiles((prev) => [...prev, f.file_id])
//     }
//     className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded"
//   >
//     ลบ
//   </button>
// )}

//                               {f.file_type.startsWith("image") && (
//                                 <img
//                                   src={`http://localhost:3000${f.file_path}`}
//                                   className="rounded-xl max-h-80 object-cover"
//                                 />
//                               )}

//                               {f.file_type === "application/pdf" && (
//                                 <iframe
//                                   src={`http://localhost:3000${f.file_path}`}
//                                   className="w-full h-96 rounded-lg border"
//                                 />
//                               )}

//                               {!f.file_type.startsWith("image") &&
//                                 f.file_type !== "application/pdf" && (
//                                   <a
//                                     href={`http://localhost:3000${f.file_path}`}
//                                     target="_blank"
//                                     className="mt-2 p-3 border rounded-lg bg-gray-50 text-sm block hover:bg-gray-100"
//                                   >
//                                     <div className="font-medium">
//                                       {f.file_name || f.file_path.split("/").pop()}
//                                     </div>
//                                     <div className="text-gray-500 text-xs">
//                                       คลิกเพื่อเปิดไฟล์
//                                     </div>
//                                   </a>
//                                 )}


//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     </div>
//                   ))}





//               </section>

//               {/* right card */}
//               <aside className="col-span-3">
//                 <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_6px_18px_rgba(0,0,0,0.06)] p-6">
//                   <div className="text-2xl font-extrabold mb-4">แนะนำตัว</div>
//                   <ul className="space-y-3 text-gray-700">
//                     <li className="flex gap-2">
//                       <span className="text-gray-400">•</span>
//                       <span>เพจ - หน่วยงานราชการ</span>
//                     </li>
//                     <li className="flex gap-2">
//                       <span className="text-gray-400">•</span>
//                       <span>58 ถนนกลางเมือง ต.ในเมือง</span>
//                     </li>
//                     <li className="flex gap-2">
//                       <span className="text-gray-400">•</span>
//                       <span>kkw.ac.th</span>
//                     </li>
//                     <li className="flex gap-2">
//                       <span className="text-gray-400">•</span>
//                       <span>ยังไม่มีคะแนน (0 รีวิว)</span>
//                     </li>
//                   </ul>
//                 </div>
//               </aside>
//             </div>
//           </div>
//           </main>
//       </div>

//       {confirmPostOpen && (
//         <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">

//           <div className="bg-white rounded-2xl p-8 w-[420px] text-center shadow-xl">

//             <div className="text-xl font-bold mb-2">
//               โพสต์กิจกรรม ?
//             </div>

//             <div className="text-gray-500 mb-6">
//               คุณต้องการโพสต์กิจกรรมนี้ใช่หรือไม่
//             </div>

//             <div className="flex gap-3 justify-center">
//               <button style={{backgroundColor: "white"}}
//                 onClick={() => setConfirmPostOpen(false)}
//                 className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
//               >
//                 ยกเลิก
//               </button>

// <button style={{ backgroundColor: "rgba(252, 231, 243, 0.8)" }}
//   onClick={() => {
//     handlePost();
//     setConfirmPostOpen(false);
//   }}
// >
//   โพสต์
// </button>
//             </div>

//           </div>

//         </div>
//       )}

//     </div>
//   );
// }

// function SideLink({ to, icon, label, active }) {
//   return (
//     <Link
//       to={to}
//       className={[
//         "w-full flex items-center gap-3 rounded-xl px-3 py-2 transition",
//         active ? "bg-gray-50 font-semibold text-gray-900" : "hover:bg-gray-50",
//       ].join(" ")}
//     >
//       {icon}
//       <span>{label}</span>
//     </Link>
//   );
// }

// function SubLink({ to, label, active }) {
//   return (
//     <Link
//       to={to}
//       className={[
//         "block w-full text-left px-4 py-3 transition",
//         active ? "bg-pink-100 font-semibold" : "hover:bg-pink-100/70",
//       ].join(" ")}
//     >
//       {label}
//     </Link>
//   );
// }

// function Dropdown({ value, open, onToggle, options, onPick }) {
//   return (
//     <div className="relative">
//       <button
//         onClick={onToggle}
//         className="h-11 min-w-[170px] px-5 rounded-full bg-white border border-gray-200 shadow-[0_6px_14px_rgba(0,0,0,0.08)]
//                    flex items-center justify-between gap-3 hover:bg-gray-50"
//       >
//         <span className="text-gray-700">{value}</span>
//         <FaChevronDown className="text-gray-400 text-[12px]" />
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-[190px] rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
//           {options.map((opt) => (
//             <button
//               key={opt}
//               onClick={() => onPick(opt)}
//               className="w-full text-left px-4 py-3 hover:bg-gray-50"
//             >
//               {opt}
//             </button>
//           ))}
//         </div>
        
//       )}
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import SidebarNav from "../nav.jsx";
import Header from "../Header";
import { FaCog, FaEllipsisH } from "react-icons/fa";
import PostComposerModal from "../components/PostComposerModal.jsx";
import AttachmentGallery from "../components/AttachmentGallery.jsx";
import CommentThread from "../components/CommentThread.jsx";
import Avatar from "../components/Avatar.jsx";
import { getYoutubeEmbedUrl } from "../utils/media.js";

import Swal from "sweetalert2";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementFiles,
  getAnnouncementFiles,
  deleteAnnouncementFile,
  getAnnouncementComments,
  createAnnouncementComment,
  updateAnnouncementComment,
  deleteAnnouncementComment,
  getAnnouncementLikes,
  toggleAnnouncementLike,
} from "../callapi/callapi_user.jsx";
import { API_BASE_URL } from "../config/api.js";

// ⚠️ TODO: ทดไว้ก่อน รอทำหน้า login ค่อยเอา user_id จริงของอาจารย์มาแทน
const CURRENT_USER_ID = "2";

// ต้องตรงกับ base url ของ backend (multer เสิร์ฟไฟล์ผ่าน /uploads)
const API_BASE = API_BASE_URL;

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5 shrink-0"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function NewsPage() {

  const teacher = {
    name: "คุณครู สุพรรณี",
    avatar: null,
  };

  const [openPost, setOpenPost] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  const [bannerImage, setBannerImage] = useState(
    "https://main.kkw-info.com/img/head/head.png"
  );

  const [bannerColor, setBannerColor] = useState("#1e3a8a");
  const [openBannerSetting, setOpenBannerSetting] = useState(false);

  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({}); // { [postId]: { count, liked } }

  useEffect(() => {

    const fetchNews = async () => {
      try {

        const data = await getAnnouncements();
        console.log(data)
        const formatted = await Promise.all(
          data.map(async (n) => {

            const date = new Date(n.created_at);

            let files = [];
            try {
              const rawFiles = await getAnnouncementFiles(n.news_id);
              files = (rawFiles || []).map((f) => ({
                file_id: f.file_id,
                file_url: f.file_path,
                file_name: f.file_name,
                file_type: f.file_type
              }));
            } catch (err) {
              console.error("โหลดไฟล์แนบไม่สำเร็จ:", err);
            }

            let comments = [];
            try {
              const rawComments = await getAnnouncementComments(n.news_id);
              comments = rawComments.map((c) => ({
                id: c.comment_id,
                user_id: c.user_id,
                author: c.author_name,
                text: c.content,
                parent_comment_id: c.parent_comment_id || null,
                time: new Date(c.created_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }));
            } catch (err) {
              console.error("โหลดคอมเมนต์ไม่สำเร็จ:", err);
            }

            try {
              const likeData = await getAnnouncementLikes(n.news_id, CURRENT_USER_ID);
              setLikes((prev) => ({ ...prev, [n.news_id]: likeData }));
            } catch (err) {
              console.error("โหลดไลก์ไม่สำเร็จ:", err);
            }

            return {
              id: n.news_id,
              author: teacher.name,
              avatar: teacher.avatar,
              date: date.toLocaleDateString("th-TH"),
              time: date.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit"
              }),
              content: n.content,
              link_url: n.link_url,
              youtube_url: n.youtube_url,
              files,
              comments
            };
          })
        );

        setPosts(formatted);

      } catch (error) {
        console.error(error);
      }
    };

    fetchNews();

  }, []);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // ============ LIKE ============
  const handleToggleLike = async (postId) => {
    try {
      const result = await toggleAnnouncementLike(postId, CURRENT_USER_ID);
      setLikes((prev) => ({ ...prev, [postId]: result }));
    } catch (err) {
      console.error(err);
    }
  };

  // ============ SHARE ============
  const handleShare = async (postId) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "กิจกรรม", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("คัดลอกลิงก์แล้ว");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ============ COMMENT: CREATE (parentId = null คือคอมเมนต์หลัก, มีค่า = ตอบกลับ) ============
  const handleAddNewComment = async (postId, text, parentId) => {
    if (!text?.trim()) return;

    try {
      const result = await createAnnouncementComment({
        news_id: postId,
        user_id: CURRENT_USER_ID,
        content: text,
        parent_comment_id: parentId,
      });

      const newComment = {
        id: result.comment_id,
        user_id: CURRENT_USER_ID,
        author: teacher.name,
        text,
        parent_comment_id: parentId,
        time: getCurrentTime(),
      };

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, newComment] }
            : post
        )
      );
    } catch (err) {
      console.error(err);
      alert("ส่งความคิดเห็นไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  // ============ COMMENT: EDIT ============
  const saveEditComment = async (postId, commentId, text) => {
    if (!text?.trim()) return;

    try {
      await updateAnnouncementComment(commentId, {
        user_id: CURRENT_USER_ID,
        content: text,
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.map((c) =>
                  c.id === commentId ? { ...c, text } : c
                ),
              }
            : post
        )
      );
    } catch (err) {
      console.error(err);
      alert("แก้ไขความคิดเห็นไม่สำเร็จ");
    }
  };

  // ============ COMMENT: DELETE (ลบทั้งคอมเมนต์ตอบกลับที่อยู่ใต้มันด้วย) ============
  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("ต้องการลบความคิดเห็นนี้ใช่ไหม?")) return;

    try {
      await deleteAnnouncementComment(commentId, CURRENT_USER_ID);

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.filter(
                  (c) => c.id !== commentId && c.parent_comment_id !== commentId
                ),
              }
            : post
        )
      );
    } catch (err) {
      console.error(err);
      alert("ลบความคิดเห็นไม่สำเร็จ");
    }
  };

  const addPost = async (content) => {

    const result = await Swal.fire({
      title: "โพสต์ประกาศ?",
      text: "ต้องการเผยแพร่ประกาศนี้",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "โพสต์",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#16a34a"
    });

    if (!result.isConfirmed) return;

    try {

      // แยก attachments
      const youtube = content.attachments?.find(a => a.type === "youtube");
      const link = content.attachments?.find(a => a.type === "link");
      const newFileAttachments = content.attachments?.filter(a => a.type === "file" && a.file) || [];

      const data = {
        class_id: 1,
        title: "ประกาศ",
        content: content.content,
        youtube_url: youtube?.url || null,
        link_url: link?.url || null
      };

      const res = await createAnnouncement(data);

      // ถ้ามีไฟล์แนบ (ไฟล์จริงที่เพิ่งเลือกจากเครื่อง) อัปโหลดต่อจากนี้ โดยผูกกับ news_id ที่เพิ่งได้มา
      let files = [];
      if (newFileAttachments.length) {
        try {
          const uploadResult = await uploadAnnouncementFiles(res.news_id, newFileAttachments.map(a => a.file));
          files = uploadResult.files || [];
        } catch (uploadErr) {
          console.error(uploadErr);
          Swal.fire("โพสต์สำเร็จ", "แต่แนบไฟล์ไม่สำเร็จ ลองแก้ไขโพสต์แล้วแนบใหม่อีกครั้ง", "warning");
        }
      }

      const now = new Date();

      const newPost = {
        id: res.news_id,
        author: teacher.name,
        avatar: teacher.avatar,
        date: now.toLocaleDateString("th-TH"),
        time: getCurrentTime(),
        content: res.content,
        youtube_url: data.youtube_url,
        link_url: data.link_url,
        files,
        comments: []
      };

      setPosts((prev) => [newPost, ...prev]);

      Swal.fire("สำเร็จ", "โพสต์ถูกเผยแพร่แล้ว", "success");

    } catch (error) {

      console.error(error);

      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถโพสต์ได้", "error");

    }

  };

  const updatePost = async (content) => {

    const result = await Swal.fire({
      title: "บันทึกการแก้ไข?",
      text: "ต้องการอัปเดตโพสต์นี้",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#2563eb"
    });
  
    if (!result.isConfirmed) return;
  
    try {
  
      // แยก attachments
      const youtube = content.attachments?.find(a => a.type === "youtube");
      const link = content.attachments?.find(a => a.type === "link");
      const keptFileAttachments = content.attachments?.filter(a => a.type === "file" && a.url) || [];
      const newFileAttachments = content.attachments?.filter(a => a.type === "file" && a.file) || [];

      const data = {
        content: content.content,
        youtube_url: youtube?.url || null,
        link_url: link?.url || null
      };

      await updateAnnouncement(editingPost.id, data);

      // ไฟล์เดิมที่ผู้ใช้กดลบออกตอนแก้ไข ต้องลบที่ backend ด้วย
      for (const fileId of content.removedFileIds || []) {
        try {
          await deleteAnnouncementFile(fileId);
        } catch (deleteErr) {
          console.error(deleteErr);
        }
      }

      // ไฟล์ใหม่ (มี .file เป็น File object จริง) ต้องอัปโหลดแยก
      let uploadedFiles = [];
      if (newFileAttachments.length) {
        try {
          const uploadResult = await uploadAnnouncementFiles(editingPost.id, newFileAttachments.map(a => a.file));
          uploadedFiles = uploadResult.files || [];
        } catch (uploadErr) {
          console.error(uploadErr);
          Swal.fire("บันทึกสำเร็จ", "แต่แนบไฟล์ใหม่ไม่สำเร็จ ลองอีกครั้ง", "warning");
        }
      }

      // ไฟล์เดิมที่ไม่ได้ถูกลบ (เหลืออยู่ใน attachments แค่ .url) + ไฟล์ใหม่ที่เพิ่งอัปโหลด
      const keptFiles = keptFileAttachments.map(a => ({
        file_id: a.file_id,
        file_url: a.url,
        file_name: a.name
      }));
      const files = [...keptFiles, ...uploadedFiles];

      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? {
                ...p,
                content: data.content,
                youtube_url: data.youtube_url,
                link_url: data.link_url,
                files
              }
            : p
        )
      );
  
      setEditingPost(null);
  
      Swal.fire("สำเร็จ", "แก้ไขโพสต์แล้ว", "success");
  
    } catch (error) {
  
      console.error(error);
  
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถแก้ไขได้", "error");
  
    }
  
  };
  const deletePost = async (id) => {

    const result = await Swal.fire({
      title: "ต้องการลบโพสต์?",
      text: "โพสต์นี้จะถูกลบ",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6"
    });

    if (result.isConfirmed) {

      try {

        await deleteAnnouncement(id);

        setPosts((prev) => prev.filter((p) => p.id !== id));

        Swal.fire(
          "ลบสำเร็จ",
          "โพสต์ถูกลบแล้ว",
          "success"
        );

      } catch (error) {

        console.error(error);

        Swal.fire(
          "เกิดข้อผิดพลาด",
          "ไม่สามารถลบโพสต์ได้",
          "error"
        );

      }

    }

  };

  return (
    <div className="min-h-screen bg-[#ffffff] flex text-[15px] text-gray-800">
      <Header />

      <SidebarNav />

      <main className="flex-1 min-w-0 w-full px-6 md:px-8 pt-24 pb-10 bg-white">
        <div className="w-full">

          {/* Banner */}
          <section className="relative rounded-3xl overflow-hidden shadow-md ">

            <img
              src={bannerImage}
              className="w-full h-[200px] object-cover"
            />

            {/* overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/10" />

            {/* text */}
            <div className="absolute left-10 bottom-8 text-white">

              <h1 className="text-4xl font-bold tracking-tight">
                กิจกรรม
              </h1>

              <p className="text-sm opacity-90 mt-2">
                กิจกรรมโรงเรียนขอนแก่นวิทยายน 
              </p>

            </div>

            {/* setting icon */}
            <div
              onClick={() => setOpenBannerSetting(true)}
              className="
    absolute right-6 top-6
    backdrop-blur
    flex items-center justify-center
    cursor-pointer
    hover:scale-110
    transition
    "
            >
              <FaCog className="text-white text-xl drop-shadow-md  " />
            </div>

          </section>

          {/* Composer */}
          <section
            onClick={() => setOpenPost(true)}
            className="
  mt-8
  bg-white
  rounded-2xl
  shadow-sm
  border border-gray-200
  px-6 py-4
  flex items-center gap-4
  cursor-pointer
  hover:shadow-md
  transition
  "
          >

            <Avatar src={teacher.avatar} name={teacher.name} size={40} />

            <div className="
  flex-1
  bg-gray-100
  rounded-full
  px-5 py-3
  text-gray-500
  text-sm
  ">
              ประกาศบางสิ่งในชั้นเรียน...
            </div>

          </section>

          {/* Feed */}
          <div className="mt-10 space-y-6">

            {posts.map((post) => {
              const likeInfo = likes[post.id] || { count: 0, liked: false };

              return (

              <div
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition"
              >

                <div className="px-6 pt-6 pb-4 flex gap-4">

                  <Avatar src={post.avatar} name={post.author} size={40} />

                  <div className="flex-1">

                    <div className="flex justify-between items-start">

                      <div>
                        <div className="font-semibold text-gray-900">
                          {post.author}
                        </div>

                        <div className="text-[12px] text-gray-400 mt-[2px]">
                          {post.date} • {post.time}
                        </div>
                      </div>

                      <div className="relative">

                        <FaEllipsisH
                          size={16}
                          onClick={() =>
                            setOpenMenu(openMenu === post.id ? null : post.id)
                          }
                          className="
                          cursor-pointer
                          text-gray-400
                          hover:text-gray-700
                          hover:scale-110
                          transition
                          "
                        />

                        {openMenu === post.id && (

                          <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-100 rounded-xl shadow-md overflow-hidden">

                            <button style={{backgroundColor: "white"}}
                              onClick={() => {
                                setEditingPost(post);
                                setOpenPost(true);
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                            >
                              แก้ไขโพสต์
                            </button>

                            <button style={{backgroundColor: "white"}}
                              onClick={() => deletePost(post.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                            >
                              ลบโพสต์
                            </button>

                          </div>

                        )}

                      </div>

                    </div>

                    <div
                      className="mt-4 text-gray-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    {/* youtube */}
                    {post.youtube_url && (
                      <div className="mt-4">
                        <iframe
                          className="w-full h-[360px] rounded-xl"
                          src={getYoutubeEmbedUrl(post.youtube_url)}
                          title="YouTube video"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* link */}
                    {post.link_url && (
                      <div className="mt-3">
                        <a
                          href={post.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="
        inline-flex items-center gap-2
        text-blue-600 text-sm
        hover:underline
      "
                        >
                          🔗 {post.link_url}
                        </a>
                      </div>
                    )}

                    {/* ไฟล์แนบ (อัปโหลดจากเครื่อง) — รูปเลื่อนดูเป็นแถว กดเปิดเต็มจอเลื่อนดูทีละรูปได้ */}
                    <AttachmentGallery
                      files={post.files}
                      apiBase={API_BASE}
                      shareUrl={`${window.location.origin}${window.location.pathname}#post-${post.id}`}
                      caption={{
                        authorName: post.author,
                        authorAvatar: post.avatar,
                        timeLabel: `${post.date} • ${post.time}`,
                        html: post.content,
                      }}
                    />

                  </div>

                </div>

                {/* Action bar: Like / Comment / Share */}
                <div className="px-6 flex items-center border-t border-gray-100 py-3 text-[15px] text-gray-800">
                  <div className="w-6 mr-2 shrink-0" aria-hidden="true" />

                  <div className="flex items-center gap-5">
                    <button
                      style={{ backgroundColor: "white" }}
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 leading-none transition ${
                        likeInfo.liked ? "text-red-500" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <HeartIcon filled={likeInfo.liked} />
                      <span>{likeInfo.count}</span>
                    </button>

                    <button
                      style={{ backgroundColor: "white" }}
                      className="flex items-center gap-1.5 leading-none text-gray-500 hover:text-gray-800 transition"
                    >
                      <CommentIcon />
                      <span>{post.comments.length}</span>
                    </button>

                    <button
                      style={{ backgroundColor: "white" }}
                      onClick={() => handleShare(post.id)}
                      className="flex items-center gap-1.5 leading-none text-gray-500 hover:text-gray-800 transition"
                    >
                      <ShareIcon />
                    </button>
                  </div>
                </div>

                {/* Comments */}
                <div className="border-t border-gray-100 px-6 pb-5">

                  <CommentThread
                    postId={post.id}
                    comments={post.comments}
                    currentUserId={CURRENT_USER_ID}
                    currentUserAvatar={teacher.avatar}
                    currentUserName={teacher.name}
                    onAddComment={handleAddNewComment}
                    onEditComment={saveEditComment}
                    onDeleteComment={handleDeleteComment}
                  />

                </div>

              </div>

              );
            })}

          </div>

        </div>
      </main>

      {/* Banner Setting Modal */}
      {openBannerSetting && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl w-[420px] p-6 shadow-xl">

            <h2 className="text-lg font-semibold mb-4">
              ตั้งค่า Banner
            </h2>

            <div className="mb-5">
              <div className="text-sm mb-2 text-gray-600">
                เปลี่ยนรูป Banner
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setBannerImage(url);
                  }
                }}
              />
            </div>

            <div className="mb-6">
              <div className="text-sm mb-2 text-gray-600">
                เปลี่ยนสีพื้นหลัง
              </div>

              <input
                type="color"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setOpenBannerSetting(false)}
                className="px-4 py-2 text-gray-500 hover:text-black"
              >
                ยกเลิก
              </button>

              <button
                onClick={() => setOpenBannerSetting(false)}
                className="px-5 py-2 bg-blue-600 text-gray-600 rounded-lg hover:bg-blue-700"
              >
                บันทึก
              </button>

            </div>

          </div>

        </div>

      )}

      <PostComposerModal
        open={openPost}
        onClose={() => {
          setOpenPost(false);
          setEditingPost(null);
        }}
        initialData={editingPost}
        onSubmit={(content) => {
          if (editingPost) {
            updatePost(content);
          } else {
            addPost(content);
          }
        }}
      />

    </div>
  );
}




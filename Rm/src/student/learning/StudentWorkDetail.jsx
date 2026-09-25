import { useState } from "react";
import { useParams } from "react-router-dom";
import SidebarNav from "../../navstudent";
import Header from "../../Header";

export default function StudentWorkDetailPage() {
  const { id } = useParams();

  const work = {
    title: "การรู้จักและเข้าใจตนเอง",
    description:
      "ให้นักเรียนวิเคราะห์ตนเองในด้านบุคลิกภาพ ความถนัด และเป้าหมายในอนาคต พร้อมเขียนอธิบาย",
    postDate: "10 พฤษภาคม 2568",
    due: new Date("2025-05-15"),
  };

  const [files, setFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  // ===== STATUS =====
  const now = new Date();
  let status = "ยังไม่ได้ส่ง";
  let statusColor = "text-amber-500";

  if (submitted) {
    status = now > work.due ? "ส่งช้า" : "ส่งแล้ว";
    statusColor = now > work.due ? "text-red-500" : "text-emerald-500";
  }

  // ===== UPLOAD =====
  const handleUpload = (fileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      file: f,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // fake progress
    newFiles.forEach((fObj, index) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;

        setFiles((prev) =>
          prev.map((item, i) =>
            item === fObj ? { ...item, progress } : item
          )
        );

        if (progress >= 100) clearInterval(interval);
      }, 100);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length === 0) return alert("กรุณาแนบไฟล์ก่อน");
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <SidebarNav role="student" />

      <div className="flex-1">
        <Header title="รายละเอียดงาน" />

        <main className="max-w-5xl mx-auto px-6 pt-24 pb-10 space-y-6">

          {/* TITLE */}
          <div>
            <h1 className="text-[20px] font-semibold text-gray-900">
              {work.title}
            </h1>

            <div className="text-[13px] text-gray-400 mt-1">
              โพสต์เมื่อ {work.postDate} • ครบกำหนด{" "}
              {work.due.toLocaleDateString("th-TH")}
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <p className="text-gray-700 text-[14px] leading-relaxed">
              {work.description}
            </p>
          </div>

          {/* SUBMIT */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">

            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h2 className="text-[14px] font-semibold text-gray-800">
                งานของฉัน
              </h2>

              <span className={`text-[13px] font-medium ${statusColor}`}>
                {status}
              </span>
            </div>

            {/* DROP ZONE */}
            {!submitted && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="
                  w-full
                  border border-dashed border-gray-300
                  rounded-2xl
                  py-5
                  text-center
                  text-gray-500 text-[13px]
                  hover:bg-gray-50
                  transition
                "
              >
                ลากไฟล์มาวาง หรือ
                <label className="text-pink-500 ml-1 cursor-pointer">
                  เลือกไฟล์
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* FILE LIST */}
            <div className="space-y-3">
              {files.length === 0 && (
                <p className="text-[12px] text-gray-400">
                  ยังไม่มีไฟล์แนบ
                </p>
              )}

              {files.map((f, i) => (
                <div
                  key={i}
                  className="bg-gray-50 px-4 py-3 rounded-xl space-y-2"
                >
                  <div className="flex justify-between text-[13px]">
                    <span className="truncate">{f.file.name}</span>

                    {!submitted && (
                      <button
                        onClick={() => removeFile(i)}
                        className="text-red-400 text-[12px]"
                      >
                        ลบ
                      </button>
                    )}
                  </div>

                  {/* progress */}
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 transition-all"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* SUBMIT BTN */}
            {!submitted && (
              <button
                onClick={handleSubmit}
                className="
                  w-full
                  bg-pink-500
                  text-white
                  py-3
                  rounded-2xl
                  text-[14px]
                  font-medium
                  hover:bg-pink-600
                  transition
                "
              >
                ส่งงาน
              </button>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}

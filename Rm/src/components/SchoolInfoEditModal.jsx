import { useRef, useState } from "react";
import { FaTimes, FaTrash, FaImage } from "react-icons/fa";
import Swal from "sweetalert2";
import { updateSchoolInfo } from "../callapi/callapi_user.jsx";
import { resolveFileUrl } from "../utils/media.js";
import { API_BASE } from "../utils/feedShared.js";

const inputCls = "w-full h-11 rounded-xl border border-gray-200 px-3 text-[14.5px] outline-none focus:border-pink-400";
const labelCls = "text-[13.5px] text-gray-500 block mb-1.5";

// รายการค่าแบบหลายบรรทัด (เบอร์โทร/อีเมล) — เพิ่ม/ลบทีละบรรทัดได้ แพทเทิร์นเดียวกับตัวเลือกคำถามใน AssessmentCreate.jsx
function ListField({ label, values, onChange, placeholder }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex flex-col gap-2">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={v}
              onChange={(e) => onChange(values.map((x, xi) => (xi === i ? e.target.value : x)))}
              placeholder={placeholder}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, xi) => xi !== i))}
              disabled={values.length <= 1}
              className="w-9 h-9 shrink-0 rounded-lg hover:bg-red-50 disabled:opacity-30 text-red-500 flex items-center justify-center bg-transparent"
            >
              <FaTrash size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="self-start text-[13.5px] text-pink-600 hover:underline bg-transparent"
        >
          + เพิ่ม
        </button>
      </div>
    </div>
  );
}

export default function SchoolInfoEditModal({ info, onClose, onSaved }) {
  const [form, setForm] = useState({
    school_name_th: info.school_name_th || "",
    school_name_en: info.school_name_en || "",
    subtitle: info.subtitle || "",
    description: info.description || "",
    address: info.address || "",
    phones: info.phones?.length ? info.phones : [""],
    emails: info.emails?.length ? info.emails : [""],
    website_url: info.website_url || "",
    facebook_url: info.facebook_url || "",
    motto_pali: info.motto_pali || "",
    motto_translation: info.motto_translation || "",
    slogan: info.slogan || "",
    colors: info.colors?.length === 3 ? info.colors.map((c) => ({ name: c.name || "", image_url: c.image_url || null })) : [{ name: "ชมพู", image_url: null }, { name: "ฟ้า", image_url: null }, { name: "เหลือง", image_url: null }],
  });
  const [colorFiles, setColorFiles] = useState([null, null, null]); // ไฟล์รูปใหม่ที่เพิ่งเลือก (ยังไม่ได้อัปโหลด) ต่อช่อง
  const [saving, setSaving] = useState(false);
  const fileInputRefs = [useRef(null), useRef(null), useRef(null)];

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setColorName = (i) => (e) =>
    setForm((prev) => ({ ...prev, colors: prev.colors.map((c, ci) => (ci === i ? { ...c, name: e.target.value } : c)) }));

  const handlePickImage = (i, file) => {
    if (!file) return;
    setColorFiles((prev) => prev.map((f, fi) => (fi === i ? file : f)));
    setForm((prev) => ({ ...prev, colors: prev.colors.map((c, ci) => (ci === i ? { ...c, image_url: URL.createObjectURL(file) } : c)) }));
  };

  const handleSave = async () => {
    if (!form.school_name_th.trim()) {
      Swal.fire({ icon: "warning", title: "กรอกชื่อโรงเรียนก่อน" });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("school_name_th", form.school_name_th);
      fd.append("school_name_en", form.school_name_en);
      fd.append("subtitle", form.subtitle);
      fd.append("description", form.description);
      fd.append("address", form.address);
      fd.append("phones", JSON.stringify(form.phones.map((p) => p.trim()).filter(Boolean)));
      fd.append("emails", JSON.stringify(form.emails.map((e) => e.trim()).filter(Boolean)));
      fd.append("website_url", form.website_url);
      fd.append("facebook_url", form.facebook_url);
      fd.append("motto_pali", form.motto_pali);
      fd.append("motto_translation", form.motto_translation);
      fd.append("slogan", form.slogan);
      // image_url ที่เป็น blob: (รูปที่เพิ่งเลือกแต่ยังไม่อัปโหลด) ไม่ต้องส่งไป backend จะทับด้วยไฟล์ที่แนบเองอยู่แล้ว
      fd.append("colors", JSON.stringify(form.colors.map((c) => ({ name: c.name, image_url: c.image_url?.startsWith("blob:") ? null : c.image_url }))));
      colorFiles.forEach((file, i) => {
        if (file) fd.append(`color_image_${i}`, file);
      });

      const updated = await updateSchoolInfo(fd);
      onSaved(updated);
      Swal.fire({ icon: "success", title: "บันทึกแล้ว", timer: 1000, showConfirmButton: false });
      onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err?.response?.data?.message || "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[17px] font-semibold text-gray-900">แก้ไขข้อมูลโรงเรียน</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center bg-transparent text-gray-500">
            <FaTimes size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ชื่อโรงเรียน (ไทย)</label>
              <input value={form.school_name_th} onChange={set("school_name_th")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>ชื่อโรงเรียน (อังกฤษ)</label>
              <input value={form.school_name_en} onChange={set("school_name_en")} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>คำอธิบายสั้น (ใต้ชื่อโรงเรียน)</label>
            <input value={form.subtitle} onChange={set("subtitle")} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>เกี่ยวกับโรงเรียน</label>
            <textarea value={form.description} onChange={set("description")} rows={4} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14.5px] outline-none focus:border-pink-400 resize-none" />
          </div>

          <div>
            <label className={labelCls}>ที่อยู่</label>
            <textarea value={form.address} onChange={set("address")} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14.5px] outline-none focus:border-pink-400 resize-none" />
          </div>

          <ListField label="เบอร์โทรศัพท์" values={form.phones} onChange={(v) => setForm((p) => ({ ...p, phones: v }))} placeholder="043-237-788" />
          <ListField label="อีเมล" values={form.emails} onChange={(v) => setForm((p) => ({ ...p, emails: v }))} placeholder="sarabun.kkw@kkw.ac.th" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>เว็บไซต์</label>
              <input value={form.website_url} onChange={set("website_url")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Facebook</label>
              <input value={form.facebook_url} onChange={set("facebook_url")} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>คติพจน์ (บาลี)</label>
              <input value={form.motto_pali} onChange={set("motto_pali")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>คำแปลคติพจน์</label>
              <input value={form.motto_translation} onChange={set("motto_translation")} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>คำขวัญโรงเรียน</label>
            <input value={form.slogan} onChange={set("slogan")} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>สีประจำโรงเรียน</label>
            <div className="grid grid-cols-3 gap-3">
              {form.colors.map((c, i) => {
                const previewSrc = c.image_url?.startsWith("blob:") ? c.image_url : c.image_url ? resolveFileUrl(API_BASE, c.image_url) : null;
                return (
                  <div key={i} className="rounded-xl border border-gray-200 p-3 flex flex-col items-center gap-2">
                    <input
                      ref={fileInputRefs[i]}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePickImage(i, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs[i].current?.click()}
                      className="w-16 h-16 rounded-xl border border-dashed border-gray-300 hover:border-pink-400 overflow-hidden flex items-center justify-center bg-gray-50 text-gray-400"
                    >
                      {previewSrc ? (
                        <img src={previewSrc} alt={c.name || "สี"} className="w-full h-full object-cover" />
                      ) : (
                        <FaImage size={18} />
                      )}
                    </button>
                    {previewSrc && (
                      <button
                        type="button"
                        onClick={() => {
                          setColorFiles((prev) => prev.map((f, fi) => (fi === i ? null : f)));
                          setForm((prev) => ({ ...prev, colors: prev.colors.map((cc, ci) => (ci === i ? { ...cc, image_url: null } : cc)) }));
                        }}
                        className="text-[11.5px] text-red-500 hover:underline bg-transparent flex items-center gap-1"
                      >
                        <FaTrash size={9} /> ลบรูป
                      </button>
                    )}
                    <input value={c.name} onChange={setColorName(i)} placeholder="ชื่อสี" className="w-full h-9 rounded-lg border border-gray-200 px-2 text-[13.5px] text-center outline-none focus:border-pink-400" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 px-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[14.5px] text-gray-600">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-11 px-6 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[14.5px] font-semibold"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

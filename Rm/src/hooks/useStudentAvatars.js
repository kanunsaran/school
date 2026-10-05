import { useEffect, useState } from "react";
import { getStudentGeneralInfo } from "../callapi/callapi_user.jsx";

// รูปโปรไฟล์นักเรียน (อยู่ใน student_general_info.avatar_url) — แคชระดับแอป ดึงแต่ละคนครั้งเดียว
const cache = new Map(); // userId -> url | null
const pending = new Map();

const fetchAvatar = (id) => {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (!pending.has(id)) {
    pending.set(
      id,
      getStudentGeneralInfo(id)
        .then((info) => info?.avatar_url || null)
        .catch(() => null)
        .then((url) => {
          cache.set(id, url);
          pending.delete(id);
          return url;
        })
    );
  }
  return pending.get(id);
};

// คืน { [userId]: url } ของนักเรียนที่ส่งมา
export default function useStudentAvatars(userIds) {
  const key = [...new Set((userIds || []).map(String))].sort().join(",");
  const [map, setMap] = useState({});
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    let alive = true;
    Promise.all(ids.map((id) => fetchAvatar(id).then((url) => [id, url]))).then((entries) => {
      if (alive) setMap(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return map;
}

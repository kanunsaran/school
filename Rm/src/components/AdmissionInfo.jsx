import { useEffect, useMemo, useState } from "react";
import { sameUni, MYTCAS_HOME } from "../utils/goals.js";

// เกณฑ์รับเข้าจริงของหลักสูตรที่นักเรียนเลือก — ดึงจาก myTCAS (ทปอ.) ตอนเปิดดู จึงเป็นประกาศล่าสุดเสมอ
// ดัชนีหลักสูตร/ชื่อวิชาสร้างด้วย scripts/mytcas-links.mjs (ไม่ได้แต่งข้อมูลเอง — แสดงตามที่ myTCAS ประกาศ)

const S3 = "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas";
const ROUND = { 1: "รอบ 1 Portfolio", 2: "รอบ 2 Quota", 3: "รอบ 3 Admission", 4: "รอบ 4 Direct Admission" };

let dataPromise = null;
const loadData = () =>
  (dataPromise ||= Promise.all([import("../data/mytcas-programs.json"), import("../data/mytcas-score-labels.json")]).then(([p, l]) => ({
    index: p.default,
    labels: l.default.labels,
  })));
const roundsCache = new Map();
const loadRounds = (pid) => {
  if (!roundsCache.has(pid)) {
    roundsCache.set(
      pid,
      fetch(`${S3}/rounds/${pid}.json`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
    );
  }
  return roundsCache.get(pid).catch((e) => {
    roundsCache.delete(pid);
    throw e;
  });
};

// ข้อความจากประกาศมี HTML/&nbsp; ปนมา → ข้อความล้วน
const clean = (t) =>
  String(t || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const fmt = (v) => (Number.isInteger(Number(v)) ? String(Number(v)) : Number(v).toFixed(2));
const fmtGpa = (v) => Number(v).toFixed(2);
// ชื่อโครงการในประกาศมักขึ้นต้นด้วยชื่อคณะ/หลักสูตรซ้ำ → ตัดให้เหลือตั้งแต่คำว่า "โครงการ"
const projectName = (t) => {
  const s = clean(t);
  const i = s.indexOf("โครงการ");
  const out = i > 0 ? s.slice(i) : s;
  return out.length > 110 ? `${out.slice(0, 110)}…` : out;
};

// คะแนนขั้นต่ำที่ประกาศ (min_* และ score_conditions) → [{ label, value }]
const minimums = (r, labels) => {
  const out = [];
  const seen = new Set();
  const add = (key, value) => {
    if (seen.has(key) || key === "gpax" || key === "total_score" || !(Number(value) > 0)) return;
    seen.add(key);
    out.push({ label: labels[key]?.short || labels[key]?.label || key, value });
  };
  Object.entries(r).forEach(([k, v]) => k.startsWith("min_") && add(k.slice(4), v));
  Object.entries(r.score_conditions || {}).forEach(([k, v]) => k.startsWith("min_") && add(k.slice(4), v));
  return out;
};
// เงื่อนไขแบบ "มีคะแนนอย่างใดอย่างหนึ่ง" (เช่น IELTS / TOEFL)
const anyOf = (r, labels) => {
  const c = r.score_conditions;
  if (!c?.subject_names) return null;
  const names = String(c.subject_names).split(/\s+/);
  const mins = String(c.score_minimum || "").split(/\s+/);
  return names.map((n, i) => {
    const key = n.replace(/^min_/, "");
    return `${labels[key]?.short || key} ≥ ${mins[i] ?? "-"}`;
  });
};

function Round({ r, labels, gpax, defaultOpen }) {
  const weights = Object.entries(r.scores || {}).filter(([, v]) => Number(v) > 0);
  const mins = minimums(r, labels);
  const alt = anyOf(r, labels);
  const minGpax = Number(r.min_gpax) || Number(r.score_conditions?.min_gpax) || 0;
  const qualification = clean([r.description, r.condition].filter(Boolean).join("\n\n"));
  const folio = clean(r.folio?.criteria);
  const interview = r.interview_date && !/ไม่มี/.test(r.interview_date) ? r.interview_date.replace(/\s+/g, " ") : null;
  return (
    <details open={defaultOpen} className="rounded-lg border border-gray-100 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-[13.5px] text-gray-800">
        <span className="font-medium">{r.project_name_th ? projectName(r.project_name_th) : "รับสมัครทั่วไป"}</span>
        <span className="ml-1.5 text-pink-600 font-semibold">รับ {r.receive_student_number || "-"} คน</span>
      </summary>
      <div className="px-3 pb-3 space-y-1.5 text-[13px] text-gray-700 leading-6">
        <div className="flex flex-wrap gap-1.5">
          {minGpax > 0 && (
            <span className="rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5">
              GPAX ขั้นต่ำ {fmtGpa(minGpax)}
              {gpax != null && (
                <b className={`ml-1 ${gpax >= minGpax ? "text-emerald-600" : "text-rose-600"}`}>
                  {gpax >= minGpax ? `✓ ของคุณ ${fmtGpa(gpax)}` : `ของคุณ ${fmtGpa(gpax)} ยังต่ำกว่าเกณฑ์`}
                </b>
              )}
            </span>
          )}
          {Number(r.min_total_score) > 0 && <span className="rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5">คะแนนรวมขั้นต่ำ {fmt(r.min_total_score)}</span>}
          {interview && <span className="rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5">สัมภาษณ์ {interview}</span>}
        </div>
        {weights.length > 0 && (
          <div>
            <span className="text-gray-500">สัดส่วนคะแนน: </span>
            {weights.map(([k, v]) => `${labels[k]?.short || k} ${v}%`).join(" · ")}
          </div>
        )}
        {mins.length > 0 && (
          <div>
            <span className="text-gray-500">คะแนนขั้นต่ำรายวิชา: </span>
            {mins.map((m) => `${m.label} ≥ ${fmt(m.value)}`).join(" · ")}
          </div>
        )}
        {alt && (
          <div>
            <span className="text-gray-500">ต้องมีคะแนนอย่างใดอย่างหนึ่ง: </span>
            {alt.join(" หรือ ")}
          </div>
        )}
        {qualification && (
          <details>
            <summary className="cursor-pointer text-sky-700">คุณสมบัติผู้สมัคร (ตามประกาศ)</summary>
            <p className="mt-1 whitespace-pre-line text-[12.5px] text-gray-600">{qualification}</p>
          </details>
        )}
        {folio && (
          <details>
            <summary className="cursor-pointer text-sky-700">เกณฑ์ Portfolio (ตามประกาศ)</summary>
            <p className="mt-1 whitespace-pre-line text-[12.5px] text-gray-600">{folio}</p>
          </details>
        )}
        {r.link && /^https?:\/\//.test(r.link) && (
          <a href={r.link} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
            ประกาศของมหาวิทยาลัย ↗
          </a>
        )}
      </div>
    </details>
  );
}

export default function AdmissionInfo({ facultyName, university, gpax = null }) {
  const [data, setData] = useState(null);
  const [pid, setPid] = useState(null);
  const [rounds, setRounds] = useState({ status: "idle", list: [] });

  useEffect(() => {
    let alive = true;
    loadData().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);

  const { programs, uniCount, otherUnis } = useMemo(() => {
    if (!data) return { programs: [], uniCount: 0, otherUnis: [] };
    const all = data.index.faculties[facultyName] || [];
    const list = all
      .filter(([u]) => sameUni(data.index.universities[u], university))
      .map(([, id, name, type, campus]) => ({ id, name, type, campus }))
      // ภาษาไทยปกติก่อน
      .sort((a, b) => (a.type ? 1 : 0) - (b.type ? 1 : 0));
    const unis = [...new Set(all.map(([u]) => data.index.universities[u]))];
    return { programs: list, uniCount: unis.length, otherUnis: unis.filter((u) => !sameUni(u, university)) };
  }, [data, facultyName, university]);

  const selected = programs.find((p) => p.id === pid) || programs[0] || null;

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setRounds({ status: "loading", list: [] });
    loadRounds(selected.id)
      .then((list) => alive && setRounds({ status: "ok", list: Array.isArray(list) ? list : [] }))
      .catch(() => alive && setRounds({ status: "error", list: [] }));
    return () => {
      alive = false;
    };
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <p className="text-[13px] text-gray-400">กำลังโหลดข้อมูลหลักสูตร…</p>;

  const box = "rounded-xl border border-sky-100 bg-sky-50/40 px-3.5 py-3";
  if (!university) {
    return (
      <div className={box}>
        <div className="text-[13.5px] text-gray-700">
          เลือกมหาวิทยาลัยในเป้าหมาย เพื่อดูเกณฑ์รับเข้าจริงจาก myTCAS
          {uniCount > 0 && <span className="text-gray-500"> (ปีนี้มีหลักสูตรที่เกี่ยวข้องใน {uniCount} มหาวิทยาลัย)</span>}
        </div>
      </div>
    );
  }
  if (!selected) {
    return (
      <div className={box}>
        <div className="text-[13.5px] text-gray-700">
          ยังไม่พบหลักสูตร “{facultyName}” ของ {university} ในประกาศ myTCAS ปีนี้
        </div>
        {otherUnis.length > 0 && (
          <div className="mt-1 text-[13px] text-gray-600">
            มหาวิทยาลัยที่เปิดหลักสูตรที่เกี่ยวข้องในประกาศปีนี้ ({otherUnis.length} แห่ง): {otherUnis.slice(0, 8).join(", ")}
            {otherUnis.length > 8 && " และอื่น ๆ"}
          </div>
        )}
        <a href={MYTCAS_HOME} target="_blank" rel="noreferrer" className="text-[13px] text-sky-600 hover:underline">
          ค้นหาหลักสูตรใน myTCAS ↗
        </a>
      </div>
    );
  }

  const byRound = [1, 2, 3, 4].map((n) => ({ n, list: rounds.list.filter((r) => String(r.type).startsWith(`${n}_`)) }));
  const year = rounds.list[0]?.type?.split("_")[1];
  return (
    <div className={box}>
      <div className="text-[14px] font-semibold text-gray-800">เกณฑ์รับเข้าจริง — {university}</div>
      {programs.length > 1 ? (
        <select
          value={selected.id}
          onChange={(e) => setPid(e.target.value)}
          className="mt-1.5 w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-[13px] outline-none focus:border-pink-400"
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.type ? ` (${p.type})` : ""}
              {p.campus ? ` — ${p.campus}` : ""}
            </option>
          ))}
        </select>
      ) : (
        <div className="text-[13px] text-gray-600">
          {selected.name}
          {selected.type ? ` (${selected.type})` : ""}
          {selected.campus ? ` — ${selected.campus}` : ""}
        </div>
      )}

      {rounds.status === "loading" && <p className="mt-2 text-[13px] text-gray-400">กำลังโหลดเกณฑ์จาก myTCAS…</p>}
      {rounds.status === "error" && <p className="mt-2 text-[13px] text-rose-600">โหลดข้อมูลจาก myTCAS ไม่สำเร็จ ลองใหม่อีกครั้ง หรือเปิดดูในเว็บ myTCAS</p>}
      {rounds.status === "ok" && rounds.list.length === 0 && <p className="mt-2 text-[13px] text-gray-500">หลักสูตรนี้ยังไม่ประกาศเกณฑ์รับเข้าในปีนี้</p>}
      {rounds.status === "ok" && rounds.list.length > 0 && (
        <div className="mt-2 space-y-2.5">
          {byRound.map(({ n, list }) => (
            <div key={n}>
              <div className="text-[13px] font-semibold text-gray-700">
                {ROUND[n]}
                {list.length === 0 && <span className="font-normal text-gray-400"> — ยังไม่ประกาศ หรือไม่เปิดรับในรอบนี้</span>}
              </div>
              {list.length > 0 && (
                <div className="mt-1 space-y-1.5">
                  {list.map((r, i) => (
                    <Round key={r._id || i} r={r} labels={data.labels} gpax={gpax} defaultOpen={list.length === 1} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2.5 text-[12px] text-gray-500 leading-5">
        ที่มา: myTCAS (ทปอ.){year ? ` · TCAS ปีการศึกษา ${year}` : ""} · ดึงข้อมูลตอนเปิดดู — เกณฑ์อาจปรับระหว่างปี ตรวจประกาศฉบับเต็มของมหาวิทยาลัยก่อนสมัครทุกครั้ง ·{" "}
        <a href={`https://course.mytcas.com/programs/${selected.id}`} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
          ดูหลักสูตรนี้ใน myTCAS ↗
        </a>
      </p>
    </div>
  );
}

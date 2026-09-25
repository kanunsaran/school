// ================================================================
// MOCK DATA — หน้าข่าวสารและประกาศ (News Feed) แบบ Facebook-like
// ข้อมูลหลอกทั้งหมด ไว้ใช้ต่อ UI ก่อน ยังไม่เชื่อม backend จริง
// ================================================================

export const CATEGORY_META = {
  announcement: { label: "ประกาศ", badge: "bg-pink-50 text-pink-700 border-pink-200", dot: "bg-pink-500" },
  event: { label: "กิจกรรม", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  scholarship: { label: "ทุนการศึกษา", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  career: { label: "แนะแนวอาชีพ", badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  mental: { label: "สุขภาพจิต", badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  urgent: { label: "ประกาศด่วน", badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export const FEED_CATEGORIES = [
  { key: "all", label: "ทั้งหมด" },
  { key: "announcement", label: "ประกาศ" },
  { key: "event", label: "กิจกรรม" },
  { key: "scholarship", label: "ทุน" },
  { key: "career", label: "แนะแนวอาชีพ" },
  { key: "mental", label: "สุขภาพจิต" },
  { key: "urgent", label: "ด่วน" },
];

export const REACTIONS = [
  { key: "helpful", emoji: "👍", label: "มีประโยชน์" },
  { key: "love", emoji: "❤️", label: "ชอบ" },
  { key: "clap", emoji: "👏", label: "เยี่ยม" },
  { key: "celebrate", emoji: "🎉", label: "ยินดีด้วย" },
];

const teacher = { name: "ครูสุพรรณี ใจดี", role: "ครูแนะแนว", avatar: "https://i.pravatar.cc/80?u=teacher-suphannee" };
const teacher2 = { name: "ครูวิจิตรา วิชาญศรี", role: "ครูแนะแนว", avatar: "https://i.pravatar.cc/80?u=teacher-wichitra" };

export const mockPosts = [
  {
    post_id: 1,
    author: teacher,
    createdAt: "2026-07-07T09:00:00",
    pinned: true,
    category: "scholarship",
    title: "เปิดรับสมัครทุนการศึกษา ปีการศึกษา 2569",
    content:
      "นักเรียนที่สนใจสามารถสมัครได้ตั้งแต่วันนี้ถึงวันที่ 31 กรกฎาคม 2569 โดยกรอกใบสมัครตามแบบฟอร์มที่แนบมา แล้วนำมายื่นที่ห้องแนะแนวภายในเวลาที่กำหนด ทุนนี้เปิดรับนักเรียนชั้น ม.4-ม.6 ที่มีผลการเรียนดีและมีความประพฤติเรียบร้อย จำนวน 20 ทุน ทุนละ 5,000 บาท สอบถามรายละเอียดเพิ่มเติมได้ที่ห้องแนะแนวหรือครูที่ปรึกษาประจำชั้น",
    images: ["https://picsum.photos/seed/scholarship1/800/500"],
    attachments: [{ name: "ประกาศทุนการศึกษา.pdf", type: "pdf", url: "#" }],
    link: null,
    youtube: null,
    reactions: { helpful: 92, love: 24, clap: 10, celebrate: 2 },
    viewCount: 520,
    comments: [
      {
        comment_id: 101,
        user: { name: "สมชาย ใจกล้า", role: "นักเรียน", avatar: "https://i.pravatar.cc/80?u=student-101" },
        text: "ขอบคุณครับครู",
        time: "2026-07-07T09:30:00",
        replies: [
          {
            comment_id: 1011,
            user: teacher,
            text: "ยินดีค่ะ รีบสมัครกันนะคะ",
            time: "2026-07-07T09:40:00",
          },
        ],
      },
      {
        comment_id: 102,
        user: { name: "สมหญิง แสนดี", role: "นักเรียน", avatar: "https://i.pravatar.cc/80?u=student-102" },
        text: "ส่งใบสมัครวันไหนคะ",
        time: "2026-07-07T10:05:00",
        replies: [],
      },
    ],
  },
  {
    post_id: 2,
    author: teacher2,
    createdAt: "2026-07-06T14:20:00",
    pinned: false,
    category: "event",
    title: "กิจกรรมอบรม TCAS 69 เตรียมความพร้อมสอบเข้ามหาวิทยาลัย",
    content:
      "ขอเชิญนักเรียนชั้น ม.6 เข้าร่วมกิจกรรมอบรมเตรียมความพร้อมระบบ TCAS ปีการศึกษา 2569 วันที่ 12 กรกฎาคมนี้ ณ หอประชุมโรงเรียน เวลา 08.30-16.00 น. มีวิทยากรจากมหาวิทยาลัยชั้นนำมาให้ความรู้ ลงทะเบียนได้ที่ครูที่ปรึกษา",
    images: [],
    attachments: [],
    link: { title: "ระบบ TCAS69 - ทปอ.", url: "https://www.mytcas.com" },
    youtube: null,
    reactions: { helpful: 40, love: 12, clap: 5, celebrate: 3 },
    viewCount: 310,
    comments: [
      {
        comment_id: 103,
        user: { name: "กิตติ พูนสวัสดิ์", role: "นักเรียน", avatar: "https://i.pravatar.cc/80?u=student-103" },
        text: "ต้องลงทะเบียนล่วงหน้าไหมครับ",
        time: "2026-07-06T15:00:00",
        replies: [],
      },
    ],
  },
  {
    post_id: 3,
    author: teacher,
    createdAt: "2026-07-05T08:00:00",
    pinned: false,
    category: "mental",
    title: "รู้จักความเครียดในวัยเรียน และวิธีจัดการเบื้องต้น",
    content:
      "ช่วงใกล้สอบหลายคนอาจรู้สึกเครียดหรือกดดัน บทความนี้รวมวิธีจัดการความเครียดง่าย ๆ ที่ทำได้ทุกวัน ถ้าใครรู้สึกเครียดมากจนกระทบการใช้ชีวิต สามารถเข้ามาปรึกษาครูแนะแนวได้ทุกวันจันทร์-ศุกร์ เวลาพักเที่ยงและหลังเลิกเรียนค่ะ ไม่ต้องเกรงใจเลยนะคะ",
    images: ["https://picsum.photos/seed/mental1/800/500", "https://picsum.photos/seed/mental2/800/500"],
    attachments: [],
    link: null,
    youtube: "dQw4w9WgXcQ",
    reactions: { helpful: 65, love: 48, clap: 20, celebrate: 4 },
    viewCount: 480,
    comments: [],
  },
  {
    post_id: 4,
    author: teacher2,
    createdAt: "2026-07-04T11:15:00",
    pinned: false,
    category: "urgent",
    title: "แจ้งหยุดเรียนกรณีพิเศษ วันที่ 8 กรกฎาคม 2569",
    content:
      "เนื่องจากมีการปรับปรุงระบบไฟฟ้าภายในโรงเรียน ทางโรงเรียนจึงขอแจ้งหยุดเรียนในวันที่ 8 กรกฎาคม 2569 เป็นกรณีพิเศษ และจะกลับมาเปิดเรียนตามปกติในวันถัดไป ขออภัยในความไม่สะดวก",
    images: [],
    attachments: [{ name: "หนังสือแจ้งหยุดเรียน.pdf", type: "pdf", url: "#" }],
    link: null,
    youtube: null,
    reactions: { helpful: 30, love: 2, clap: 0, celebrate: 15 },
    viewCount: 610,
    comments: [
      {
        comment_id: 104,
        user: { name: "รินทร์ลดา พรหมศรี", role: "นักเรียน", avatar: "https://i.pravatar.cc/80?u=student-104" },
        text: "โห ดีใจจัง 🎉",
        time: "2026-07-04T11:20:00",
        replies: [],
      },
    ],
  },
  {
    post_id: 5,
    author: teacher,
    createdAt: "2026-07-02T13:00:00",
    pinned: false,
    category: "career",
    title: "แนะแนวสายอาชีพ: 10 อาชีพมาแรงในอีก 5 ปีข้างหน้า",
    content:
      "สรุปข้อมูลอาชีพที่ตลาดแรงงานต้องการมากขึ้นในอนาคต พร้อมสายการเรียนที่เกี่ยวข้อง เหมาะสำหรับนักเรียนที่กำลังตัดสินใจเลือกคณะ/สาขาที่จะเรียนต่อ อ่านฉบับเต็มได้ในไฟล์แนบ",
    images: [],
    attachments: [{ name: "แนะแนวอาชีพมาแรง.pdf", type: "pdf", url: "#" }],
    link: null,
    youtube: null,
    reactions: { helpful: 55, love: 10, clap: 8, celebrate: 1 },
    viewCount: 275,
    comments: [],
  },
];

export const mockUpcomingEvents = [
  { date: "2026-07-12", label: "อบรม TCAS 69" },
  { date: "2026-07-15", label: "ปิดรับสมัครทุนการศึกษา" },
  { date: "2026-07-20", label: "Open House มหาวิทยาลัย" },
  { date: "2026-07-25", label: "ค่ายแนะแนวอาชีพ" },
];

export const mockRecentAnnouncements = mockPosts
  .slice()
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .map((p) => ({ post_id: p.post_id, title: p.title }));

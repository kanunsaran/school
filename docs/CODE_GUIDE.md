# คู่มือโค้ดเว็บแนะแนว (สำหรับเตรียมสอบ)

> แผนที่ **เมนู → ไฟล์หน้าเว็บ → URL** แบบละเอียดอยู่ที่ [`Rm/src/README.md`](../Rm/src/README.md)
> ไฟล์นี้อธิบาย **ทุกไฟล์โค้ดที่เราเขียน** ว่าทำอะไร + ภาพรวมระบบ + สิ่งที่ควรรู้ก่อนสอบ

---

## 1. ภาพรวมระบบ (ตอบได้ในประโยคเดียว)

**React (หน้าเว็บ) → เรียก API ด้วย axios → Express (backend, Node.js) → ฐานข้อมูล MariaDB/MySQL**
ไฟล์ที่อัปโหลดเก็บในเซิร์ฟเวอร์ (`projectrmb/uploads/`) • ขึ้นเว็บจริงด้วย Docker + GitHub Actions

```
เบราว์เซอร์
   │  เปิดหน้าเว็บ (React สร้างด้วย Vite)              Rm/
   ▼
หน้าเว็บ (pages/…)  ── เรียกฟังก์ชันใน callapi_user.jsx ──►  HTTP  /api/…
                                                            │
                                         nginx (ใน Docker) ส่งต่อ /api → backend
                                                            ▼
backend Express  app.js → routes/xxx.routes.js → db.js (mysql2)     projectrmb/
                                                            ▼
                                                  ฐานข้อมูล project_rm (MariaDB)
```

| ส่วน | เทคโนโลยี | โฟลเดอร์ |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind CSS, react-router, axios, SweetAlert2, react-icons | `Rm/` |
| Backend | Node.js + Express 5, mysql2, JWT (jsonwebtoken), bcryptjs, multer (อัปโหลดไฟล์) | `projectrmb/` |
| ฐานข้อมูล | MariaDB 10.4 (เหมือน XAMPP) ชื่อ `project_rm` | `db/init/project_rm.sql` |
| AI ตรวจงาน | Cloudflare Workers AI (Llama 3.3 70B) หรือ Claude (เลือกด้วย `.env`) + ตัวตรวจตามเกณฑ์ (ไม่ใช้ AI) | `projectrmb/routes/ai_review.routes.js` |
| ขึ้นเว็บ | Docker Compose (db + backend + frontend/nginx) • push `main` → GitHub Actions deploy อัตโนมัติ | `docker-compose.yml`, `.github/workflows/deploy.yml` |

### การเข้าสู่ระบบ (คำถามยอดฮิต)
1. หน้า `Login.jsx` ส่งอีเมล+รหัสผ่าน → `POST /auth/login` (หรือ `POST /auth/google` ถ้ากดปุ่ม Google)
2. backend เช็กรหัสด้วย **bcrypt** (รหัสผ่านเก็บแบบเข้ารหัส ไม่เก็บตัวจริง) → สร้าง **JWT** อายุ 1 วัน → เก็บลงตาราง `tokens`
3. หน้าเว็บเก็บ token + role ใน `localStorage` (`utils/auth.js`) แล้วพาไปหน้าครู/นักเรียนตาม role
4. API ที่ต้องล็อกอิน ใช้ `middlewares/auth.js` → `authRequired` (เช็ก token + มีในตาราง tokens) และ `requireRole('teacher')`
5. หน้าเว็บที่ต้องล็อกอินห่อด้วย `components/RequireAuth.jsx`

### ตัวอย่างการไหลของข้อมูล: ครูให้คะแนนงาน
`WorkDetail.jsx` (กดบันทึกคะแนน) → `updateSendAssScore()` ใน `callapi_user.jsx` → `PUT /send_ass/:id` → `send_ass.routes.js` → `UPDATE send_ass SET score = ?` → นักเรียนเห็นใน `StudentWorkDetail.jsx`

---

## 2. Frontend — `Rm/`

### ไฟล์หลัก
| ไฟล์ | ทำอะไร |
|---|---|
| `src/main.jsx` | จุดเริ่มแอป + **รวมทุก URL (routes)** ว่า URL ไหนเปิดหน้าไหน, ครอบด้วย RequireAuth / GoogleOAuthProvider |
| `src/index.css`, `src/App.css` | สไตล์รวม + โหลด Tailwind |
| `src/config/api.js` | ที่อยู่ backend (`VITE_API_URL`, ค่าเริ่มต้น `http://localhost:3000`) + Google Client ID |
| `src/callapi/callapi_user.jsx` | **ฟังก์ชันเรียก backend ทั้งหมด** (~2,300 บรรทัด) เช่น `getAssignmentById`, `createSubmission`, `runAiReview` — หน้าเว็บไม่ยิง API เองตรงๆ (ยกเว้นบางหน้าใช้ fetch) |
| `index.html`, `vite.config.js`, `eslint.config.js`, `package.json` | ตั้งค่า Vite / lint / รายการไลบรารี |
| `Dockerfile`, `nginx.conf` | build หน้าเว็บแล้วเสิร์ฟด้วย nginx • nginx ส่ง `/api/*` ต่อให้ backend (จึงไม่ติด CORS บนเว็บจริง) |
| `public/` | รูปคงที่ (โลโก้, อิโมจิอาชีพ Twemoji, ฟอนต์ PDF) |

### `src/layout/` — ส่วนที่อยู่ทุกหน้า
| ไฟล์ | ทำอะไร |
|---|---|
| `Header.jsx` | แถบบน: โลโก้ ปุ่ม ☰ (จอเล็ก) กระดิ่งแจ้งเตือน รูปโปรไฟล์ (กดไปหน้าโปรไฟล์ตาม role) |
| `TeacherSidebar.jsx` | เมนูซ้ายของครู (รายการห้องที่ดูแลดึงจากฐานข้อมูล) |
| `StudentSidebar.jsx` | เมนูซ้ายของนักเรียน (รายการห้องที่เข้าร่วม) |

### `src/pages/` — หน้าเว็บ (ดูตาราง เมนู→ไฟล์ ใน `Rm/src/README.md`)
| โฟลเดอร์ | หน้าที่สำคัญ / สิ่งที่ควรรู้ |
|---|---|
| `login/Login.jsx` | ล็อกอินอีเมล+รหัสผ่าน และ Google • หลังล็อกอินโหลดหน้าใหม่ทั้งหน้า (ให้ทุกหน้าอ่าน user ใหม่) • ถ้ามาจากสแกน QR จะกลับไปเช็กชื่อต่อ |
| `teacher/01-home` | แดชบอร์ดครู: สรุปนักเรียน งานรอตรวจ นัดหมาย คาบสอนวันนี้ (นำเข้าตารางสอนจากรูปด้วย OCR ได้) |
| `teacher/02-calendar` | ปฏิทินนัดหมายครู: สร้าง/เลื่อน/ยกเลิกนัด ตอบรับคำขอนัดของนักเรียน ส่งอีเมลแจ้ง (Gmail ของครู) |
| `teacher/03-students` | รายชื่อนักเรียน + ดูข้อมูลรายคน + ส่งออก PDF แบบฟอร์ม • นำเข้ารายชื่อจาก Excel/CSV สร้างบัญชีให้อัตโนมัติ |
| `teacher/05-classrooms` | ห้องเรียน: แท็บข่าวสาร (ประกาศ+เปิดเช็กชื่อ QR) / งาน (สร้างงาน คำถาม บทความ, ตรวจงาน + **ผู้ช่วยตรวจงาน**) / นักเรียน / เช็กชื่อ |
| `teacher/06-assignment-overview` | ภาพรวมงานทุกห้อง ส่งแล้ว/ยังไม่ส่ง |
| `teacher/07-assessments` | แบบประเมิน: สร้างแบบประเมินเพิ่มเติม, ดูผล RIASEC รายคน + เขียนคำแนะนำ, สถิติ, ส่งออก PDF/Excel |
| `teacher/08-consultations` | กล่องคำขอปรึกษา แชทตอบนักเรียน เปลี่ยนสถานะ |
| `teacher/09-portfolio` | ดูแฟ้มผลงานนักเรียน ให้คำแนะนำ |
| `teacher/10-yc` | ชุมนุม YC (กระดานโพสต์อิท) ฝั่งครู ดูแล/ลบโพสต์ได้ |
| `teacher/profile` | โปรไฟล์ครู รูป ข้อมูลส่วนตัว เชื่อม Gmail |
| `student/01-home` | หน้าหลักนักเรียน: ห้องเรียน งานที่ต้องส่ง ข่าว ผลประเมิน เป้าหมาย นัดหมาย • กรอกรหัสเข้าห้อง • ถ้ายังไม่กรอกข้อมูลนักเรียนจะพาไปกรอกก่อน |
| `student/02-calendar` | ขอนัดครู ดู/ตอบรับนัด |
| `student/04-my-classroom` | ห้องเรียนของฉัน: ข่าวสาร + เช็กชื่อด้วยรหัส, งานของฉัน, ส่งงาน/ตอบคำถาม/อ่านบทความ, เพื่อนร่วมชั้น, หน้าเช็กชื่อจาก QR |
| `student/05-assessment` | แบบทดสอบ RIASEC 60 ข้อ → หน้าผล (รหัส 3 ตัว จุดเด่น สาขา อาชีพ ความสอดคล้องกับเป้าหมาย แนวทางเตรียมตัว myTCAS) |
| `student/06-portfolio` | อัปโหลดผลงาน (สร้างรูปปกจาก PDF/วิดีโอในเบราว์เซอร์) ขอคำแนะนำครู |
| `student/07-yc` | ชุมนุม YC ฝั่งนักเรียน โพสต์คำถามแบบโพสต์อิท |
| `student/08-goal` | ตั้งเป้าหมายคณะ/มหาวิทยาลัยได้หลายอันดับ, บันทึกเกรด/อัปโหลดใบผลการเรียน (OCR อ่านเกรดให้) |
| `student/09-consultations` | ส่งคำขอปรึกษา + แชทกับครู |
| `student/profile` | โปรไฟล์ เปลี่ยนรหัสผ่าน • แบบฟอร์มข้อมูลนักเรียน (ระเบียนสะสม) |
| `shared/activities` | ฟีดกิจกรรมโรงเรียน (ครูโพสต์ / นักเรียนอ่าน-คอมเมนต์-ไลก์), แกลเลอรีรูป, หน้าเกี่ยวกับโรงเรียน |
| `shared/classroom` | รายชื่อเพื่อนในห้อง (ใช้ทั้งแท็บของครูและนักเรียน) |
| `shared/yc` | หน้าโพสต์เดี่ยวใน YC พร้อมคอมเมนต์ |

### `src/components/` — ชิ้นส่วนที่ใช้หลายหน้า
| ไฟล์ | ทำอะไร |
|---|---|
| `RequireAuth.jsx` | กันหน้าเว็บ: ยังไม่ล็อกอิน → ไปหน้า login, role ไม่ตรง → กันเข้า |
| `AiReviewPanel.jsx` | แผง "ผู้ช่วยตรวจงาน" ในหน้าครูตรวจงาน: ปุ่มตรวจตามเกณฑ์ / ตรวจด้วย AI, แสดงผล 6 หัวข้อ, ปุ่มใส่คะแนน/ข้อเสนอแนะลงฟอร์ม (ไม่บันทึกเอง) |
| `CriteriaEditor.jsx` | ฟอร์มเกณฑ์ให้คะแนน (ชื่อเกณฑ์ คะแนน คำสำคัญ ต้องเจอกี่คำ) |
| `AdmissionInfo.jsx` | เกณฑ์รับเข้าแต่ละรอบจาก myTCAS (ดึงตอนเปิดดู) |
| `AppointmentCalendarGrid.jsx`, `AppointmentResponse.jsx`, `AppointmentReplyThread.jsx`, `PendingAppointmentsAlert.jsx` | ระบบนัดหมาย: ตารางปฏิทิน, ปุ่มยืนยัน/ปฏิเสธ+เสนอเวลาใหม่, ข้อความตอบกลับใต้นัด, แจ้งเตือนนัดที่รอตอบบนหน้าโฮม |
| `GmailConnect.jsx` | ปุ่มเชื่อมต่อ Gmail ของครู (ตอนนี้ไม่ได้แสดง — ปิดการส่งอีเมลแจ้งนัดไว้ก่อน) |
| `ChatMessages.jsx` | ฟองแชทคำขอปรึกษา |
| `FeedPostCard.jsx`, `FeedPostComposerModal.jsx`, `FeedPostSkeleton.jsx`, `PostComments.jsx`, `AttachmentGallery.jsx`, `ComposerIconButton.jsx` | ฟีดโพสต์: การ์ดโพสต์, หน้าต่างเขียนโพสต์+แนบไฟล์, โครงโหลด, คอมเมนต์, ดูรูปเต็มจอ |
| `PortfolioCard.jsx`, `PortfolioFilePreview.jsx`, `PortfolioWorkModal.jsx` | แฟ้มผลงาน: การ์ด, พรีวิวไฟล์, หน้าต่างเพิ่ม/ดูผลงาน |
| `NotificationBell.jsx` | กระดิ่งแจ้งเตือนมุมขวาบน |
| `ReportWizard.jsx`, `ExportMenu.jsx` | สร้างรายงานนักเรียนทีละขั้น, ปุ่มส่งออก PDF/Excel |
| `ScheduleImportModal.jsx` | นำเข้าตารางสอนจากรูป (OCR) |
| `SchoolInfoEditModal.jsx` | แก้ข้อมูลโรงเรียน (หน้าเกี่ยวกับ) |
| `ThaiCalendarField/Picker.jsx`, `ThaiDateField.jsx`, `ThaiTimeField/Picker.jsx` | ช่องเลือกวัน-เวลาแบบไทย (พ.ศ., "น.") |
| `Avatar.jsx`, `PageLoading.jsx`, `PromptModal.jsx`, `GradientPopup.jsx`, `ResponsiveSheet.jsx` | รูปโปรไฟล์วงกลม, สปินเนอร์โหลด, ป๊อปอัปกรอกข้อความ, ป๊อปอัปสวยๆ, แผงเด้งจากล่างบนมือถือ |

### `src/utils/` — ฟังก์ชันช่วย (ไม่มีหน้าตา)
| ไฟล์ | ทำอะไร |
|---|---|
| `auth.js` | เก็บ/อ่าน session (token, role, user_id) ใน localStorage, ออกจากระบบ, จัดการ token หมดอายุ |
| `riasecScoring.js` | **คิดคะแนน RIASEC**: 60 ข้อ ด้านละ 10 ข้อ ตอบ 1–5 → คะแนนด้านละ 10–50 → รหัส 3 ตัวสูงสุด (คะแนนเท่ากันเรียง R-I-A-S-E-C), วิเคราะห์ความสอดคล้องกับเป้าหมาย, สาขาที่ควรสำรวจ |
| `riasecSummary.js`, `riasecResults.js` | ประโยคสรุปความสนใจ, ดึงผลล่าสุดของนักเรียนฝั่งครู |
| `goals.js` | เป้าหมายการศึกษาต่อ (หลายอันดับ, ชื่อมหาวิทยาลัยเต็ม, ลิงก์ myTCAS) |
| `gradeOcr.js`, `scheduleOcr.js` | อ่านเกรดจากรูปใบผลการเรียน / อ่านตารางสอนจากรูป ด้วย Tesseract ในเบราว์เซอร์ |
| `criteriaFormat.js` | แปลงฟอร์มเกณฑ์ ↔ ข้อความที่ backend เก็บ |
| `notifications.js` | สร้างรายการแจ้งเตือน (งาน คำขอปรึกษา นัดหมาย) |
| `appointmentStatus.js`, `emailNotice.js`, `gmailCompose.js` | สถานะ/สีของนัด, ข้อความผลส่งอีเมล, ลิงก์เขียนอีเมลใน Gmail |
| `consultationStore.js`, `portfolioStore.js`, `assessmentStore.js`, `teachingScheduleStore.js` | ค่าคงที่/ตัวแปลงข้อมูลของแต่ละระบบ (ข้อมูลจริงอยู่ backend) |
| `feedCategories.js`, `feedShared.js`, `media.js`, `postTypeStyles.js`, `postit.js` | หมวดหมู่โพสต์, ฟอร์แมตวันที่ไทย, แปลง path ไฟล์/YouTube, สีประเภทโพสต์, สีโพสต์อิท YC |
| `reportPdf.js`, `reportExcel.js`, `studentReport.js`, `studentReportData.js`, `studentInfoPdf.js` | ส่งออกรายงาน PDF/Excel, รายงานรายบุคคล, PDF แบบฟอร์มข้อมูลนักเรียนตามแบบกระดาษโรงเรียน |
| `portfolioThumbnail.js` | สร้างรูปปกผลงานจากรูป/PDF/วิดีโอในเบราว์เซอร์ |
| `careerEmoji.js` | เลือกรูปอิโมจิให้อาชีพ (Twemoji) |
| `avatar.js`, `gradeLabel.js`, `breakpoints.js`, `reactSelectStyles.js`, `sidebarStore.js`, `adviceTopics.js` | ตัวอักษรย่อชื่อ, ชื่อห้อง "6/2", ขนาดจอ, สไตล์ dropdown, เปิด/ปิดเมนูบนมือถือ, ความยาวคำแนะนำ |

### `src/hooks/`
| ไฟล์ | ทำอะไร |
|---|---|
| `useMyRiasec.js` | ดึงผล RIASEC ล่าสุด + ประวัติของนักเรียนที่ล็อกอิน |
| `useCurrentUserProfile.js` | ชื่อ+รูปโปรไฟล์ของผู้ใช้ที่ล็อกอิน |
| `useStudentAvatars.js` | รูปโปรไฟล์นักเรียน (แคชไว้ ไม่ดึงซ้ำ) |

### `src/data/` — ข้อมูลคงที่
| ไฟล์ | ทำอะไร |
|---|---|
| `riasec.json` | ความหมาย 6 ด้าน, 120 รหัส → คณะ/อาชีพ/มหาวิทยาลัย (แปลงจาก Excel ของโรงเรียนด้วย `scripts/riasec-xlsx-to-json.cjs`) |
| `guidanceTexts.js` | ข้อความแนะแนวที่ระบบเขียน (กิจกรรม ทักษะ เหตุผล) — ให้ครูตรวจได้จุดเดียว |
| `mytcas-programs.json`, `mytcas-links.json`, `mytcas-score-labels.json`, `universities.json` | หลักสูตร/ลิงก์/ชื่อวิชาสอบ/มหาวิทยาลัยจาก myTCAS |
| `onet-faculties.json` | ความรู้ที่ใช้ของแต่ละสาขา (O*NET) |
| `data-sources.json` | แหล่งข้อมูล + วันที่ตรวจสอบ (แสดงท้ายหน้าผล) |
| `newsFeedMockData.js` | รายการหมวดหมู่โพสต์มาตรฐาน (ชื่อเดิมยังมีคำว่า mock แต่ที่ใช้จริงคือหมวดหมู่) |

---

## 3. Backend — `projectrmb/`

### ไฟล์หลัก
| ไฟล์ | ทำอะไร |
|---|---|
| `app.js` | จุดเริ่มเซิร์ฟเวอร์ Express: ตั้ง CORS, อ่าน JSON, เปิดโฟลเดอร์ `/uploads`, **ผูกทุก route** (`app.use('/xxx', router)`), พอร์ต 3000 |
| `db.js` | เชื่อมฐานข้อมูลด้วย `mysql2` (connection pool) ค่าจาก `.env` |
| `middlewares/auth.js` | `authRequired` (ตรวจ JWT + มีในตาราง tokens) และ `requireRole(role)` |
| `.env` / `.env.example` | ค่าลับ: DB, JWT_SECRET, SMTP, Google, **CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN**, ANTHROPIC_API_KEY (`.env` ไม่ขึ้น GitHub) |
| `Dockerfile`, `docker-compose.yml` | สร้าง image backend (node:20-alpine) |
| `uploads/` | ไฟล์ที่ผู้ใช้อัปโหลด (multer บันทึกที่นี่ เก็บ path ในฐานข้อมูล) |

### `routes/` — API (URL ขึ้นต้นตามที่ผูกใน app.js)
| URL | ไฟล์ | ทำอะไร / ตารางหลัก | หน้าเว็บที่ใช้ |
|---|---|---|---|
| `/auth` | `auth.routes.js` | สมัคร, ล็อกอิน (bcrypt+JWT), Google login, ออกจากระบบ, **นำเข้านักเรียน** • `users`, `tokens` | Login, ImportStudents |
| `/users` | `users.routes.js` | รายชื่อผู้ใช้/นักเรียน/ครู • `users` | หลายหน้า |
| `/studentinfo`, `/teacherinfo` | `studentinfo.routes.js`, `teacherinfo.routes.js` | แบบฟอร์มข้อมูลนักเรียน/ครู (JSON) + รูปโปรไฟล์ • `student_general_info`, `teacher_general_info` | StudentInfoForm, โปรไฟล์ |
| `/grades` | `grades.routes.js` | ห้องเรียน (ชื่อห้อง, ครูที่ปรึกษา, **รหัสเข้าห้อง 6 ตัว**) • `grade` | ห้องเรียน, sidebar |
| `/enroll` | `enroll.routes.js` | นักเรียนในห้อง + **`POST /enroll/join` เข้าห้องด้วยรหัส** • `enroll` | หน้าหลักนักเรียน |
| `/assignment` | `assignment.routes.js` | สร้าง/แก้/ลบ งาน-คำถาม + แนบไฟล์ (multer) + มอบหมายห้อง/รายคน • `assignment`, `assignment_files`, `score_assignment` | WorkCreate, QuestionCreate |
| `/assignment_classes` | `assignment_classes.routes.js` | งาน ↔ ห้อง • `assignment_classes` | งานของนักเรียน |
| `/send_ass` | `send_ass.routes.js` | **การส่งงาน**: ส่ง, แนบไฟล์, ให้คะแนน, ความเห็นครู, ใครส่ง/ยังไม่ส่ง • `send_ass`, `send_ass_files` | ส่งงาน/ตรวจงาน |
| `/submission-groups` | `submission_groups.routes.js` | กลุ่มส่งงาน (งานกลุ่ม) | WorkDetail |
| `/content` | `content.routes.js` | บทความ/สื่อการเรียนรู้ + ไฟล์ • `content` | ContentCreate/Detail |
| `/chapter` | `chapter.routes.js` | บทเรียน (หมวดของงาน) | WorkCreate |
| `/ai-review` | `ai_review.routes.js` | **ผู้ช่วยตรวจงาน**: เกณฑ์ (`ai_review_criteria`), ตรวจตามเกณฑ์ (`?mode=rules`), ตรวจด้วย AI (`?mode=ai` → Cloudflare/Claude), เก็บผล (`ai_reviews`) • ครูเท่านั้น | WorkDetail, QuestionDetail |
| `/attendance` | `attendance.routes.js` | เช็กชื่อ: รายชื่อ+สถานะรายวัน, เปลี่ยนสถานะ (ครูเท่านั้น), ประวัติ • `attendance`, `attendance_log` | Attendance |
| `/attendance-session` | `attendanceSession.routes.js` | เปิด/ปิดรอบเช็กชื่อ + **นักเรียนเช็กชื่อด้วยรหัส (เซิร์ฟเวอร์ตรวจรหัส ไม่ส่งรหัสให้นักเรียน)** | ข่าวสารห้องเรียน, /checkin |
| `/news` + `/comments` + `/likes` | `news.routes.js` ฯลฯ | ประกาศในห้องเรียน + คอมเมนต์ + ไลก์ | แท็บข่าวสาร |
| `/feed-posts` + `/feed-post-comments` + `/feed-post-likes` + `/feed-categories` | `feed_posts.routes.js` ฯลฯ | ฟีดกิจกรรมโรงเรียน + ไฟล์ + ปักหมุด + หมวดหมู่ | NewsFeed, แกลเลอรี |
| `/school-info` | `school_info.routes.js` | ข้อมูลโรงเรียน (หน้าเกี่ยวกับ) | About |
| `/user_type_result` | `user_type_result.routes.js` | **บันทึกผล RIASEC** (คะแนน 6 ด้าน JSON + รหัส 3 ตัว) | แบบทดสอบ, หน้าผล, ฝั่งครู |
| `/assessments` | `assessments.routes.js` | แบบประเมินที่ครูสร้างเพิ่ม: คำถาม ตัวเลือก ช่วงคะแนน | 07-assessments |
| `/assessment-advice` | `assessment_advice.routes.js` | คำแนะนำจากครูถึงนักเรียน (แสดงในหน้าผล) | AssessmentResults, หน้าผลนักเรียน |
| `/goal` | `goal.routes.js` | เป้าหมายการศึกษาต่อ (หลายอันดับ priority) • `goal` | StudentGoal |
| `/student-grades` | `student_grades.routes.js` | GPAX + ผลการเรียนรายภาค | StudentGoal |
| `/consultation` | `consultation.routes.js` | คำขอปรึกษา + ข้อความแชท + สถานะ | คำขอปรึกษา (ครู/นักเรียน) |
| `/appointment` | `appointment.routes.js` | นัดหมาย: สร้าง/แก้/ยกเลิก, ตอบรับ/ปฏิเสธ, ข้อความตอบกลับ, ส่งอีเมลแจ้ง | ปฏิทิน |
| `/mail-account` | `mail_account.routes.js` | เชื่อม Gmail ของครู (เก็บสิทธิ์แบบเข้ารหัส) | GmailConnect |
| `/teaching-schedule` | `teaching_schedule.routes.js` | ตารางสอนครู | แดชบอร์ดครู |
| `/teacher-notes` | `teacher_notes.routes.js` | บันทึกลับของครูเกี่ยวกับนักเรียน | รายชื่อนักเรียน |
| `/portfolio` | `portfolio.routes.js` | แฟ้มผลงาน + ไฟล์ + คำแนะนำครู | Portfolio (ครู/นักเรียน) |
| `/postit` + `/post_comment` + `/reaction` | `postit.routes.js` ฯลฯ | ชุมนุม YC: โพสต์อิท คอมเมนต์ ไลก์ | YC |
| `/types`, `/year` | `types.routes.js`, `year.routes.js` | ประเภท RIASEC, ปีการศึกษา (ข้อมูลอ้างอิง) | บางหน้า |

### `utils/` ฝั่ง backend
| ไฟล์ | ทำอะไร |
|---|---|
| `ruleReview.js` | **ตรวจงานตามเกณฑ์ (ไม่ใช้ AI)**: ตัดคำไทยด้วย `Intl.Segmenter`, หาคำสำคัญ, คิดคะแนนตามน้ำหนัก, คำผิดที่พบบ่อย |
| `appointmentMail.js`, `mailer.js`, `gmailSender.js` | อีเมลแจ้งนัด (+ไฟล์ .ics) ผ่าน SMTP หรือ Gmail ของครู |
| `tokenCrypto.js` | เข้ารหัส AES-256-GCM ก่อนเก็บสิทธิ์ Gmail ลงฐานข้อมูล |

---

## 4. ไฟล์ระดับโปรเจกต์
| ไฟล์ | ทำอะไร |
|---|---|
| `docker-compose.yml` | รัน 4 บริการ: `db` (MariaDB), `phpmyadmin` (เฉพาะ localhost), `backend`, `frontend` (+ `caddy` HTTPS ถ้าเปิด) |
| `.github/workflows/deploy.yml` | push `main` → build ทดสอบ → SSH เข้าเซิร์ฟเวอร์ → `git pull` → `docker compose build` → `up -d` |
| `Caddyfile` | HTTPS อัตโนมัติ (ถ้ามีโดเมน) |
| `db/init/project_rm.sql` | ไฟล์ฐานข้อมูลตั้งต้น (import ตอนสร้าง db ครั้งแรก) |
| `scripts/` | สคริปต์ช่วย: `riasec-xlsx-to-json.cjs` (Excel→riasec.json), `mytcas-*.mjs` (ดึงข้อมูล myTCAS), `riasec-*.test.mjs` (ทดสอบการคิดคะแนน), `sync-db-to-server.sh` (ส่งฐานข้อมูลขึ้นเซิร์ฟเวอร์ — **ทับข้อมูลบนเว็บจริง**) |

---

## 5. สิ่งที่ควรรู้ก่อนสอบ

### ฟีเจอร์เด่นที่มักถูกถาม + ตอบสั้นๆ
- **คิดคะแนน RIASEC ยังไง** → 60 ข้อ ด้านละ 10 ข้อ ตอบ 1–5 รวมได้ด้านละ 10–50 เอา 3 ด้านสูงสุดเป็นรหัส (คะแนนเท่ากันเรียงตามหกเหลี่ยม R-I-A-S-E-C) — `utils/riasecScoring.js`
- **ความสอดคล้องกับเป้าหมาย** → ไม่ใช่เปอร์เซ็นต์ ใช้ 3 เงื่อนไข: สาขาอยู่ในรายการแนะนำของรหัสไหม / ด้านหลักของสาขาอยู่ในอันดับ 1–3 ไหม / คุณลักษณะสาขาเชื่อมกับความสนใจไหม → สูง/ปานกลาง/ต่ำ
- **เช็กชื่อ QR ปลอดภัยยังไง** → รหัสอยู่ที่เซิร์ฟเวอร์ นักเรียนส่งรหัสไปตรวจ (`/attendance-session/checkin`) หน้าเว็บนักเรียนไม่ได้รับรหัส และเปลี่ยนสถานะได้เฉพาะครู
- **ผู้ช่วยตรวจงาน** → 2 แบบ: ตรวจตามเกณฑ์ (เทียบคำสำคัญ ฟรี ในเซิร์ฟเวอร์) และ AI (Cloudflare Workers AI โควตาฟรีวันละ ~40 งาน ไม่เอาข้อมูลไปฝึกโมเดล) • ปิดชื่อ/รหัสนักเรียนก่อนส่ง AI • กันคำสั่งแอบแฝงในงาน • **ครูเป็นคนบันทึกคะแนนเองเสมอ**
- **ทำไมไม่ใช้ Gemini ฟรี** → เงื่อนไข Gemini API ห้ามใช้กับเว็บที่ผู้ใช้อายุต่ำกว่า 18 และแบบฟรีเอาข้อมูลไปฝึก AI
- **อัปโหลดไฟล์** → `multer` บันทึกไฟล์ลง `uploads/` แล้วเก็บ path ในตาราง `*_files`
- **รหัสผ่าน** → เข้ารหัสด้วย bcrypt, ล็อกอินได้ JWT, ตรวจสิทธิ์ด้วย middleware
- **ลบข้อมูล** → ส่วนใหญ่เป็น soft delete (ใส่ `deleted_at` แทนการลบจริง)
- **OCR** → อ่านเกรด/ตารางสอนจากรูปด้วย Tesseract **ในเบราว์เซอร์** (รูปไม่ถูกส่งออกไปไหน) แล้วให้ผู้ใช้ตรวจแก้ก่อนบันทึก

### จุดอ่อนที่ควรรู้ไว้ (ถ้าถูกถาม ตอบตรงๆ ว่าเป็นงานต่อยอด)
- **API หลายตัวยังไม่บังคับล็อกอิน** เช่น `/send_ass`, `/enroll`, `/users`, `/portfolio`, `/feed-posts` — หน้าเว็บกันไว้แล้ว แต่ถ้ายิง API ตรงยังทำได้ (ควรเพิ่ม `authRequired`)
- **คำตอบที่พิมพ์ยาวได้ไม่เกิน 255 ตัวอักษร** (`send_ass.file_path` เป็น VARCHAR(255)) — ยาวกว่านั้นส่งไม่สำเร็จ
- **ตอนนักเรียนส่งงาน ไม่ได้บันทึกเวลาส่ง** (`send_ass.timestamp` ว่าง) — หน้าครูจึงไม่ขึ้น "ส่งเมื่อ"
- **AI** ตรวจได้แค่ข้อความ (รูปภาพไม่ส่ง) และคุณภาพเป็นระดับ "ผู้ช่วย" ต้องให้ครูทวน

### รันเอง / ขึ้นเว็บ
- รันในเครื่อง: เปิด MySQL ใน XAMPP → `cd projectrmb && npm run dev` → `cd Rm && npm run dev` → เปิด `http://localhost:5173`
- ขึ้นเว็บ: `git add …` → `git commit` → `git push origin main` → ดูสถานะที่ GitHub Actions (เขียว = ขึ้นแล้ว)

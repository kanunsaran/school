# แผนที่ไฟล์หน้าเว็บ (frontend)

แยกตาม **ผู้ใช้ → เมนูด้านซ้าย → เมนูย่อย/แท็บ** เลขหน้าโฟลเดอร์ = ลำดับเมนูบนเว็บ

```
src/
├── main.jsx                 ← รวม URL ทุกหน้า (ดูว่า URL ไหนเปิดไฟล์ไหน)
├── layout/                  ← ส่วนที่อยู่ทุกหน้า
│   ├── Header.jsx           แถบบน (โลโก้ กระดิ่ง รูปโปรไฟล์)
│   ├── TeacherSidebar.jsx   เมนูซ้ายของครู
│   └── StudentSidebar.jsx   เมนูซ้ายของนักเรียน
├── pages/
│   ├── login/Login.jsx      หน้าเข้าสู่ระบบ
│   ├── teacher/             ← ฝั่งครู
│   ├── student/             ← ฝั่งนักเรียน
│   └── shared/              ← หน้าที่ครูและนักเรียนใช้ร่วมกัน
├── components/              ชิ้นส่วนที่ใช้หลายหน้า (ปฏิทิน ป๊อปอัป การ์ดโพสต์ ผู้ช่วยตรวจงาน ฯลฯ)
├── callapi/callapi_user.jsx ฟังก์ชันเรียก backend ทั้งหมด
├── utils/  hooks/           ฟังก์ชันช่วย (คิดคะแนน RIASEC, ออกรายงาน PDF/Excel, แจ้งเตือน ฯลฯ)
├── data/                    ข้อมูลคงที่ (RIASEC, คณะ–อาชีพ, myTCAS)
└── config/api.js            ที่อยู่ backend
```

## ฝั่งครู — `pages/teacher/`

| เมนูบนเว็บ | โฟลเดอร์ / ไฟล์ | URL |
|---|---|---|
| หน้าหลัก | `01-home/TeacherDashboard.jsx` | `/TeacherDashboard` |
| ปฏิทิน | `02-calendar/TeacherCalendar.jsx` | `/TeacherCalendar` |
| จัดการนักเรียน › รายชื่อนักเรียน | `03-students/StudentList.jsx` | `/student` |
| จัดการนักเรียน › นำเข้ารายชื่อ | `03-students/ImportStudents.jsx` | `/ImportStudents` |
| กิจกรรม (โพสต์ / รูปภาพ / เกี่ยวกับ) | ใช้ร่วมกับนักเรียน → `shared/activities/` | `/newsfeed` `/image` `/about` |
| ห้องเรียนที่ดูแล (รายการห้อง) | `05-classrooms/ClassroomList.jsx` | `/classroom` |
| ห้องเรียน (กรอบห้อง + แถบแท็บ) | `05-classrooms/ClassroomShell.jsx`, `ClassroomTabRoutes.jsx` | `/classroom/:id` |
| › แท็บข่าวสาร | `05-classrooms/news/ClassroomNewsTab.jsx` | `/classroom/:id` |
| › แท็บงาน (รายการงาน) | `05-classrooms/work/ClassroomWork.jsx` | `/classroom/:id/work`, `/work` |
| › สร้างงาน / คำถาม / บทความ | `05-classrooms/work/WorkCreate.jsx`, `QuestionCreate.jsx`, `ContentCreate.jsx` | `/WorkCreate` `/QuestionCreate` `/ContentCreate` |
| › ตรวจงาน / ตรวจคำตอบ / ดูบทความ | `05-classrooms/work/WorkDetail.jsx`, `QuestionDetail.jsx`, `ContentDetail.jsx` | `/work/:id` `/QuestionDetail/:id` `/ContentDetail/:id` |
| › แท็บนักเรียน | ใช้ร่วมกับนักเรียน → `shared/classroom/StudentClassmates.jsx` | `/classroom/:id/students` |
| › แท็บเช็กชื่อ | `05-classrooms/attendance/Attendance.jsx` | `/classroom/:id/attendance` |
| ภาพรวมการมอบหมายงาน | `06-assignment-overview/AssignmentOverview.jsx` | `/AssignmentOverview` |
| แบบประเมิน › แบบประเมินทั้งหมด | `07-assessments/AssessmentList.jsx` | `/assessments` |
| แบบประเมิน › สร้าง/แก้ไขแบบประเมิน | `07-assessments/AssessmentCreate.jsx` | `/assessments/create` |
| แบบประเมิน › ผลการประเมิน | `07-assessments/AssessmentResults.jsx` | `/assessments/results` |
| แบบประเมิน › สถิติ | `07-assessments/AssessmentStats.jsx` | `/assessments/stats` |
| คำขอปรึกษา | `08-consultations/Consultations.jsx` | `/consultations` |
| แฟ้มสะสมผลงาน | `09-portfolio/Portfolio.jsx` | `/portfolio` |
| ชุมนุม (YC) | `10-yc/YCCommunity.jsx` (หน้าโพสต์เดี่ยว → `shared/yc/`) | `/yc` |
| โปรไฟล์ (กดรูปมุมขวาบน) | `profile/TeacherProfile.jsx` | `/TeacherProfile` |

## ฝั่งนักเรียน — `pages/student/`

| เมนูบนเว็บ | โฟลเดอร์ / ไฟล์ | URL |
|---|---|---|
| หน้าหลัก | `01-home/StudentDashboard.jsx` | `/` |
| ปฏิทินนัดหมาย | `02-calendar/StudentCalendar.jsx` | `/studentcalendar` |
| กิจกรรม (โพสต์ / รูปภาพ / เกี่ยวกับ) | ใช้ร่วมกับครู → `shared/activities/` | `/post` `/studentimage` `/about` |
| ห้องเรียนของฉัน (กรอบห้อง + แท็บ) | `04-my-classroom/StudentClassroomShell.jsx`, `StudentClassroomTabRoutes.jsx` | `/studentclassroom/:id` |
| › แท็บข่าวสาร (+ ช่องเช็กชื่อ) | `04-my-classroom/news/StudentClassroomNewsTab.jsx` | `/studentclassroom/:id` |
| › แท็บงานของฉัน | `04-my-classroom/work/Classwork.jsx` | `/studentclassroom/:id/work`, `/classwork` |
| › เปิดงาน / คำถาม / บทความ | `04-my-classroom/work/StudentWorkDetail.jsx`, `StudentQuestionDetail.jsx`, `StudentContentDetail.jsx` | `/studentworkdetail/:id` ฯลฯ |
| › แท็บเพื่อนร่วมชั้น | ใช้ร่วมกับครู → `shared/classroom/StudentClassmates.jsx` | `/studentclassroom/:id/classmates` |
| › เช็กชื่อด้วย QR Code | `04-my-classroom/attendance/AttendanceCheckin.jsx` | `/checkin` |
| แบบประเมิน › แนะนำก่อนทำ | `05-assessment/AptitudeIntro.jsx` | `/aptitudeIntro` |
| แบบประเมิน › ทำแบบทดสอบ 60 ข้อ | `05-assessment/AptitudeTest.jsx` | `/aptitudetest` |
| แบบประเมิน › หน้าผลการประเมิน | `05-assessment/AssessmentResult.jsx` | `/result` |
| แฟ้มสะสมผลงาน | `06-portfolio/StudentPortfolio.jsx` | `/StudentPortfolio` |
| ชุมนุม (YC) | `07-yc/StudentCommunity.jsx` (หน้าโพสต์เดี่ยว → `shared/yc/`) | `/studentsommunity` |
| เป้าหมายของนักเรียน | `08-goal/StudentGoal.jsx` | `/studentgoal` |
| คำขอปรึกษา | `09-consultations/StudentConsultations.jsx` | `/studentconsultations` |
| โปรไฟล์ (กดรูปมุมขวาบน) | `profile/StudentProfile.jsx` | `/profile` |
| › แบบฟอร์มข้อมูลนักเรียน | `profile/StudentInfoForm.jsx` | `/studentinfo` |

## ใช้ร่วมกัน — `pages/shared/`

| หน้า | ไฟล์ | ครูเปิดที่ | นักเรียนเปิดที่ |
|---|---|---|---|
| โพสต์กิจกรรม/ข่าวสาร | `activities/NewsFeed.jsx` | `/newsfeed` (โพสต์ได้) | `/post` (อ่าน/คอมเมนต์) |
| รูปภาพกิจกรรม | `activities/ImageGallery.jsx`, `ImagePostDetail.jsx` | `/image` | `/studentimage` |
| เกี่ยวกับโรงเรียน | `activities/About.jsx` | `/about` | `/about` |
| โพสต์เดี่ยวในชุมนุม YC | `yc/YCPostDetail.jsx` | `/yc/:id` | `/studentyc/:id` |
| รายชื่อเพื่อนในห้อง | `classroom/StudentClassmates.jsx` | แท็บนักเรียน | แท็บเพื่อนร่วมชั้น |

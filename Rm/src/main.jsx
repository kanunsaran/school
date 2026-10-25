import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from './config/api.js';
import './index.css';
import './App.css'; // Tailwind + Flowbite (เดิมโหลดผ่าน App.jsx ที่ไม่ได้ใช้แล้ว)
import RequireAuth from './components/RequireAuth.jsx';

import ClassworkPage from "./pages/teacher/05-classrooms/work/ClassroomWork.jsx";
import WorkDetailPage from "./pages/teacher/05-classrooms/work/WorkDetail.jsx";
import NewsFeedPage from "./pages/shared/activities/NewsFeed.jsx";
import AboutPage from "./pages/shared/activities/About.jsx";
import ClassroomListPage from "./pages/teacher/05-classrooms/ClassroomList.jsx";
import ClassroomShell from "./pages/teacher/05-classrooms/ClassroomShell.jsx";
import ClassroomNewsTab from "./pages/teacher/05-classrooms/news/ClassroomNewsTab.jsx";
import {
  ClassroomWorkTab,
  ClassroomStudentsTab,
  ClassroomAttendanceTab,
} from "./pages/teacher/05-classrooms/ClassroomTabRoutes.jsx";
import AssessmentListPage from "./pages/teacher/07-assessments/AssessmentList.jsx";
import AssessmentCreatePage from "./pages/teacher/07-assessments/AssessmentCreate.jsx";
import AssessmentResultsPage from "./pages/teacher/07-assessments/AssessmentResults.jsx";
import AssessmentStatsPage from "./pages/teacher/07-assessments/AssessmentStats.jsx";
import ConsultationsPage from "./pages/teacher/08-consultations/Consultations.jsx";
import PortfolioTeacherPage from "./pages/teacher/09-portfolio/Portfolio.jsx";
import StudentPortfolioPage from "./pages/student/06-portfolio/StudentPortfolio.jsx";
import StudentListPage from "./pages/teacher/03-students/StudentList.jsx";
import WorkCreatePage from "./pages/teacher/05-classrooms/work/WorkCreate.jsx";
import QuestionCreatePage from "./pages/teacher/05-classrooms/work/QuestionCreate.jsx";
import QuestionDetailPage from "./pages/teacher/05-classrooms/work/QuestionDetail.jsx";
import StudentQuestionDetailPage from "./pages/student/04-my-classroom/work/StudentQuestionDetail.jsx";
import ContentCreatePage from "./pages/teacher/05-classrooms/work/ContentCreate.jsx";
import ContentDetailPage from "./pages/teacher/05-classrooms/work/ContentDetail.jsx";
import StudentContentDetailPage from "./pages/student/04-my-classroom/work/StudentContentDetail.jsx";
import YCCommunityPage from "./pages/teacher/10-yc/YCCommunity.jsx";
import YCPostDetailPage from "./pages/shared/yc/YCPostDetail.jsx";
import LoginPage from "./pages/login/Login.jsx";
import ImagePage from "./pages/shared/activities/ImageGallery.jsx"
import ImagePostDetailPage from './pages/shared/activities/ImagePostDetail.jsx'


import Studentclassworkpage from './pages/student/04-my-classroom/work/Classwork.jsx';
import Studentworkdetailpage from './pages/student/04-my-classroom/work/StudentWorkDetail.jsx';
import StudentClassroomShell, { StudentClassroomRedirect } from './pages/student/04-my-classroom/StudentClassroomShell.jsx';
import StudentClassroomNewsTab from './pages/student/04-my-classroom/news/StudentClassroomNewsTab.jsx';
import { StudentClassroomWorkTab, StudentClassroomClassmatesTab } from './pages/student/04-my-classroom/StudentClassroomTabRoutes.jsx';

import AptitudeIntroPage from './pages/student/05-assessment/AptitudeIntro.jsx'
import AptitudeTestPage from './pages/student/05-assessment/AptitudeTest.jsx'
import ResultPage from './pages/student/05-assessment/AssessmentResult.jsx'
//แดชบอร์ดครู
import TeacherDashboardPage from "./pages/teacher/01-home/TeacherDashboard.jsx";
//นำเข้ารายชื่อนักเรียน
import ImportStudentsPage from "./pages/teacher/03-students/ImportStudents.jsx";
//ปฏิทินนัดหมาย
import TeacherCalendarPage from "./pages/teacher/02-calendar/TeacherCalendar.jsx";
import TeacherProfilePage from "./pages/teacher/profile/TeacherProfile.jsx";
import AssignmentOverviewPage from "./pages/teacher/06-assignment-overview/AssignmentOverview.jsx";


//yc
import StudentCommunityPage from './pages/student/07-yc/StudentCommunity.jsx'

//เป้าหมายของฉัน
import StudentGoalPage from './pages/student/08-goal/StudentGoal.jsx'
import StudentConsultationsPage from './pages/student/09-consultations/StudentConsultations.jsx'
import StudentDashboardPage from './pages/student/01-home/StudentDashboard.jsx'
import AttendanceCheckinPage from './pages/student/04-my-classroom/attendance/AttendanceCheckin.jsx'
import StudentInfoFormPage from './pages/student/profile/StudentInfoForm.jsx'
import StudentProfilePage from './pages/student/profile/StudentProfile.jsx'
import StudentCalendarPage from './pages/student/02-calendar/StudentCalendar.jsx'






const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth role="student">
        <StudentDashboardPage />
      </RequireAuth>
    ),
  },

  {
    path: "/classwork",
    element: (

      <Studentclassworkpage />

    ),

  },
  {
    path: "/studentworkdetail/:id",
    element: (

      <Studentworkdetailpage/>

    ),

  },
  {
    path: "/studentclassroom",
    element: <StudentClassroomRedirect/>,
  },
  {
    path: "/studentclassroom/:gradeId",
    element: <StudentClassroomShell/>,
    children: [
      { index: true, element: <StudentClassroomNewsTab/> },
      { path: "work", element: <StudentClassroomWorkTab/> },
      { path: "classmates", element: <StudentClassroomClassmatesTab/> },
    ],
  },
  {
    path: "/post",
    element: ( <>
     <NewsFeedPage studentMode/>

    </>


    )
  },
  
    {
    path: "/image",
    element: (<>

      <ImagePage />

    </>


    )
  },
   {
    path: "/image/:id",
    element: (<>

      <ImagePostDetailPage />

    </>


    )
  },
  {
    path: "/studentimage",
    element: (<>
      <ImagePage studentMode />
    </>)
  },
  {
    path: "/studentimage/:id",
    element: (<>
      <ImagePostDetailPage studentMode />
    </>)
  },

  
  {
    path: "/work",
    element: ( <>
     <ClassworkPage/>

    </>


    )
  },
  {
    path: "/work/:id",
    element: <WorkDetailPage/>
  },
  {
    path: "/newsfeed",
    element: <NewsFeedPage/>
  },
  {
    path: "/about",
    element: <AboutPage/>
  },
  {
    path: "/classroom",
    element: <ClassroomListPage/>
  },
  {
    path: "/classroom/:gradeId",
    element: <ClassroomShell/>,
    children: [
      { index: true, element: <ClassroomNewsTab/> },
      { path: "work", element: <ClassroomWorkTab/> },
      { path: "students", element: <ClassroomStudentsTab/> },
      { path: "attendance", element: <ClassroomAttendanceTab/> },
    ],
  },
  {
    path: "/assessments",
    element: <AssessmentListPage/>
  },
  {
    path: "/assessments/create",
    element: <AssessmentCreatePage/>
  },
  {
    path: "/assessments/:id/edit",
    element: <AssessmentCreatePage/>
  },
  {
    path: "/assessments/results",
    element: <AssessmentResultsPage/>
  },
  {
    path: "/assessments/stats",
    element: <AssessmentStatsPage/>
  },
  {
    path: "/consultations",
    element: <ConsultationsPage/>
  },
  {
    path: "/portfolio",
    element: <PortfolioTeacherPage/>
  },
  {
    path: "/StudentPortfolio",
    element: <StudentPortfolioPage/>
  },
  {
    path: "/WorkCreate",
    element: ( <>
     <WorkCreatePage/>

    </>


    )
  },
  {
    path: "/WorkCreate/:id",
    element: <WorkCreatePage/>
  },
   {
    path: "/QuestionCreate",
    element: ( <>
     <QuestionCreatePage/>

    </>


    )
  },
  {
    path: "/QuestionCreate/:id",
    element: <QuestionCreatePage/>
  },
  {
    path: "/QuestionDetail/:id",
    element: <QuestionDetailPage/>
  },
  {
    path: "/studentquestiondetail/:id",
    element: <StudentQuestionDetailPage/>
  },
  {
    path: "/ContentCreate",
    element: <ContentCreatePage/>
  },
  {
    path: "/ContentCreate/:id",
    element: <ContentCreatePage/>
  },
  {
    path: "/ContentDetail/:id",
    element: <ContentDetailPage/>
  },
  {
    path: "/studentcontentdetail/:id",
    element: <StudentContentDetailPage/>
  },

     {
    path: "/aptitudeIntro",
    element: (

      <AptitudeIntroPage/>

    ),

  },
  {
    path: "/aptitudetest",
    element: (

      <AptitudeTestPage/>

    ),

  },
  {
    path: "/result",
    element: (

      <ResultPage/>

    ),

  },

  {
    path: "/TeacherDashboard",
    element: (
      <RequireAuth role="teacher">
        <TeacherDashboardPage />
      </RequireAuth>
    )
  },
  {
    path: "/TeacherCalendar",
    element: (
      <RequireAuth role="teacher">
        <TeacherCalendarPage />
      </RequireAuth>
    )
  },
  {
    path: "/AssignmentOverview",
    element: (
      <RequireAuth role="teacher">
        <AssignmentOverviewPage />
      </RequireAuth>
    )
  },
  {
    path: "/ImportStudents",
    element: (
      <RequireAuth role="teacher">
        <ImportStudentsPage />
      </RequireAuth>
    )
  },
  {
    path: "/TeacherProfile",
    element: <TeacherProfilePage />,
  },

  // {
  //   path: "/YCCommunity",
  //   element: ( <>
  //    <YCCommunityPage/>
     
  //   </>
     

  //   ) 
  // },
  //  {
  //   path: "/YCPostDetail",
  //   element: ( <>
  //    <YCPostDetailPage/>
     
  //   </>
     

  //   ) 
  // },
  {
    path: "/yc",
    element: (
      <>
        <YCCommunityPage />
      </>
    )
  },
  {
    path: "/yc/:id",
    element: (
      <>
        <YCPostDetailPage />
      </>
    )
  },
  {
    path: "/studentyc/:id",
    element: (
      <>
        <YCPostDetailPage studentMode />
      </>
    )
  },

  {
    path: "/student",
    element: ( <>
     <StudentListPage/>
     
    </>
     

    ) 
  },

  {
  path: "/login",
  element: (

      <LoginPage />
    
  ),
},

{
    path: "/studentsommunity",
    element: (

      <StudentCommunityPage/>

    ),

  },

  {
    path: "/studentgoal",
    element: (

      <StudentGoalPage />

    ),

  },

  {
    path: "/studentinfo",
    element: (

      <StudentInfoFormPage />

    ),

  },

  {
    path: "/profile",
    element: <StudentProfilePage />,
  },

  {
    // เปิดจากการสแกน QR เช็กชื่อ — จัดการล็อกอินเอง (ยังไม่ล็อกอินจะพาไปเข้าสู่ระบบแล้วกลับมา)
    path: "/checkin",
    element: <AttendanceCheckinPage />,
  },
  {
    path: "/studentcalendar",
    element: (
      <RequireAuth role="student">
        <StudentCalendarPage />
      </RequireAuth>
    ),
  },

  {
    path: "/studentconsultations",
    element: (

      <StudentConsultationsPage />

    ),

  },

]);

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <RouterProvider router={router} />
  </GoogleOAuthProvider>
)

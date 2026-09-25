import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Index from './index.jsx';
import {Dash,Dash2} from './dashbord.jsx';
import Bam from './bam1';

import NewsPage from './learning/news.jsx';
import ClassworkPage from "./learning/work.jsx";
import WorkDetailPage from "./learning/WorkDetail.jsx";
import AttendancePage from "./learning/Attendance.jsx";
import NewsFeedPage from "./learning/NewsFeed.jsx";
import AboutPage from "./activity/about.jsx";
import ClassroomListPage from "./learning/ClassroomList.jsx";
import ClassroomShell from "./learning/ClassroomShell.jsx";
import ClassroomNewsTab from "./learning/ClassroomNewsTab.jsx";
import {
  ClassroomWorkTab,
  ClassroomStudentsTab,
  ClassroomAttendanceTab,
} from "./learning/ClassroomTabRoutes.jsx";
import AssessmentListPage from "./learning/AssessmentList.jsx";
import AssessmentCreatePage from "./learning/AssessmentCreate.jsx";
import AssessmentResultsPage from "./learning/AssessmentResults.jsx";
import AssessmentStatsPage from "./learning/AssessmentStats.jsx";
import ConsultationsPage from "./learning/Consultations.jsx";
import PortfolioTeacherPage from "./learning/Portfolio.jsx";
import StudentPortfolioPage from "./student/learning/StudentPortfolio.jsx";
import StudentListPage from "./learning/students.jsx";
import WorkCreatePage from "./learning/WorkCreate.jsx";
import QuestionCreatePage from "./learning/QuestionCreate.jsx";
import QuestionDetailPage from "./learning/QuestionDetail.jsx";
import StudentQuestionDetailPage from "./student/learning/StudentQuestionDetail.jsx";
import ContentCreatePage from "./learning/ContentCreate.jsx";
import ContentDetailPage from "./learning/ContentDetail.jsx";
import StudentContentDetailPage from "./student/learning/StudentContentDetail.jsx";
import YCCommunityPage from "./yc/yc1.jsx";
import YCPostDetailPage from "./yc/yc2.jsx";
import LoginPage from "./login.jsx";
import ImagePage from "./activity/image.jsx"
import ImagePostDetailPage from './activity/ImagePostDetail.jsx'
import TeacherStudentGoalPage from "./goals/TeacherStudentGoal.jsx.jsx";
import StudentNewsPage from './student/learning/StudentNews.jsx';


import Studentclassworkpage from './student/learning/Classwork.jsx';
import Studentworkdetailpage from './student/learning/StudentWorkDetail.jsx';
import Studentclassmatespage from './student/learning/StudentClassmates.jsx';
import StudentClassroomShell, { StudentClassroomRedirect } from './student/learning/StudentClassroomShell.jsx';
import StudentClassroomNewsTab from './student/learning/StudentClassroomNewsTab.jsx';
import { StudentClassroomWorkTab, StudentClassroomClassmatesTab } from './student/learning/StudentClassroomTabRoutes.jsx';

import AptitudeIntroPage from './student/ASS/AptitudeIntro.jsx'
import AptitudeTestPage from './student/ASS/aptitudeTest.jsx'
import ResultPage from './student/ASS/result.jsx'
//แดชบอร์ดครู
import TeacherDashboardPage from "./Teacher/TeacherDashboard.jsx";
//นำเข้ารายชื่อนักเรียน
import ImportStudentsPage from "./Teacher/ImportStudents.jsx";
//ปฏิทินนัดหมาย
import TeacherCalendarPage from "./Teacher/TeacherCalendar.jsx";
import TeacherProfilePage from "./Teacher/TeacherProfile.jsx";
import AssignmentOverviewPage from "./Teacher/AssignmentOverview.jsx";

import ScorePage from "./learning/score.jsx"

//yc
import StudentCommunityPage from './student/yc/StudentCommunity.jsx'

//เป้าหมายของฉัน
import StudentGoalPage from './student/StudentGoal.jsx'
import StudentConsultationsPage from './student/StudentConsultations.jsx'
import StudentDashboardPage from './student/StudentDashboard.jsx'
import StudentInfoFormPage from './student/StudentInfoForm.jsx'
import StudentProfilePage from './student/StudentProfile.jsx'



import SidebarNav from "./nav.jsx";



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
    path: "/Index",
    element: ( <>
     <Index/>
     <Index/>
    </>
     

    ) 
  },
  {
    path: "/bammm2",
    element: ( <>
     <Bam/>
     
    </>
     

    ) 
  },
    {
    path: "/StudentNews",
    element: (

      <StudentNewsPage />

    ),

  },
  {
    path: "/TeacherStudentGoal",
    element: (<>
      <TeacherStudentGoalPage />

    </>


    )
  },
  
  {
    path: "/nav",
    element: ( <>
     <SidebarNav/>
     
    </>
     

    ) 
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
    path: "/studentclassmates",
    element: (

      <Studentclassmatespage/>

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
    path: "/news",
    element: ( <>
     <NewsPage/>
     
    </>
     

    ) 
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
    path: "/attendance",
    element: <AttendancePage/>
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
    path: "/studentconsultations",
    element: (

      <StudentConsultationsPage />

    ),

  },

{
   path: "/score",
  element: (

      <ScorePage />
    
  ),
}

]);

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  //   <App />
  //   <Index/>
  //   <Dash/>
  //   <Dash2/>
  // </StrictMode>,
  <GoogleOAuthProvider clientId="959939148925-edrs5iq8sbum9m7ni0nmh7j8p89flgia.apps.googleusercontent.com">
    <RouterProvider router={router} />
  </GoogleOAuthProvider>
)

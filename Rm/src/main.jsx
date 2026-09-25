import { createBrowserRouter, Navigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.jsx';
import Index from './index.jsx';
import {Dash,Dash2} from './dashbord.jsx';
import Bam from './bam1';

import PostPage from './activity/post.jsx';
import NewsPage from './learning/news.jsx';
import ClassworkPage from "./learning/work.jsx";
import WorkDetailPage from "./learning/WorkDetail.jsx";
import AttendancePage from "./learning/Attendance.jsx";
import NewsFeedPage from "./learning/NewsFeed.jsx";
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

import AptitudeIntroPage from './student/ASS/AptitudeIntro.jsx'
import AptitudeTestPage from './student/ASS/aptitudeTest.jsx'
import ResultPage from './student/ASS/result.jsx'
//แดชบอร์ดครู
import TeacherDashboardPage from "./Teacher/TeacherDashboard.jsx";
//ปฏิทินนัดหมาย
import TeacherCalendarPage from "./Teacher/TeacherCalendar.jsx";

import ScorePage from "./learning/score.jsx"

//yc
import StudentCommunityPage from './student/yc/StudentCommunity.jsx'

//เป้าหมายของฉัน
import StudentGoalPage from './student/StudentGoal.jsx'



import SidebarNav from "./nav.jsx";



const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
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
    path: "/studentworkdetail",
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
    path: "/post",
    element: ( <>
     <PostPage/>
     
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
    path: "/QuestionCreate",
    element: ( <>
     <QuestionCreatePage/>
     
    </>
     

    ) 
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
    element: (<>
      <TeacherDashboardPage />

    </>


    )
  },
  {
    path: "/TeacherCalendar",
    element: (<>
      <TeacherCalendarPage />

    </>


    )
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

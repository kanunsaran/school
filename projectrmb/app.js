const express = require('express');
require('dotenv').config();
const path = require('path');
const axios = require('axios');
const cors = require('cors'); //

const app = express();

// ✅ 1. ย้ายมาไว้ตรงนี้ และตั้งค่าให้ถูกต้อง
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use('/uploads',express.static(path.join(__dirname,'uploads')))


const productRouter = require('./routes/products.routes');
const authRouter = require('./routes/auth.routes');
const announcementsRouter = require('./routes/announcements.routes');
const yearRouter = require('./routes/year.routes');
const assignmentRouter = require('./routes/assignment.routes');
const chapterRouter = require('./routes/chapter.routes');
const questionRouter = require('./routes/question.routes');
const typeRouter = require('./routes/type.routes');
const answerRouter = require('./routes/answer.routes');
const enrollRouter = require('./routes/enroll.routes');
const facultyRouter = require('./routes/faculty.routes');
const filesRouter = require('./routes/files.routes');
const file_assRouter = require('./routes/file_ass.routes');
const file_videosRouter = require('./routes/file_videos.routes');
const goalRouter = require('./routes/goal.routes');
const postitRouter = require('./routes/postit.routes');
const post_commentRouter = require('./routes/post_comment.routes');
const reactionRouter = require('./routes/reaction.routes');
const rolesRouter = require('./routes/roles.routes');
const send_assRouter = require('./routes/send_ass.routes');
const typesRouter = require('./routes/types.routes');
const newsRouter = require('./routes/news.routes');
const usersRouter = require('./routes/users.routes');
const user_type_resultRouter = require('./routes/user_type_result.routes');
const comments = require('./routes/comments.routes');
const likesRouter = require('./routes/likes.routes');
const announcementCommentsRouter = require('./routes/announcementcomments.routes');
const announcementLikesRouter = require('./routes/announcementlikes.routes');
const classSubjectRouter = require('./routes/class_subject.routes');
const gradesRouter = require('./routes/grades.routes');
const attendanceRouter = require('./routes/attendance.routes');
const attendanceSessionRouter = require('./routes/attendanceSession.routes');
const feedPostsRouter = require('./routes/feed_posts.routes');
const feedPostCommentsRouter = require('./routes/feedpostcomments.routes');
const feedPostLikesRouter = require('./routes/feedpostlikes.routes');
const portfolioRouter = require('./routes/portfolio.routes');
const submissionGroupsRouter = require('./routes/submission_groups.routes');
const assignmentClassesRouter = require('./routes/assignment_classes.routes');
const assessmentsRouter = require('./routes/assessments.routes');
const studentinfoRouter = require('./routes/studentinfo.routes');
const teacherinfoRouter = require('./routes/teacherinfo.routes');
const appointmentRouter = require('./routes/appointment.routes');
const contentRouter = require('./routes/content.routes');
const consultationRouter = require('./routes/consultation.routes');
const teachingScheduleRouter = require('./routes/teaching_schedule.routes');
const teacherNotesRouter = require('./routes/teacher_notes.routes');
const assessmentAdviceRouter = require('./routes/assessment_advice.routes');
const feedCategoriesRouter = require('./routes/feed_categories.routes');
const schoolInfoRouter = require('./routes/school_info.routes');

const scoreAssignmentRouter = require('./routes/score_assignment.routes');
const scoreUserRouter = require('./routes/score_user.routes');


app.get('/',(req,res)=>{
    res.status(200).json({
        message : "Hello node.js"
    })
})

app.use('/products',productRouter)
app.use('/auth',authRouter)
app.use('/announcements', announcementsRouter)
app.use('/year', yearRouter)
app.use('/assignment', assignmentRouter)
app.use('/chapter', chapterRouter)
app.use('/question', questionRouter)
app.use('/type', typeRouter)
app.use('/answer', answerRouter)
app.use('/enroll', enrollRouter)
app.use('/faculty', facultyRouter)
app.use('/files', filesRouter)
app.use('/file_ass', file_assRouter)
app.use('/file_videos', file_videosRouter)
app.use('/goal', goalRouter)
app.use('/postit', postitRouter)
app.use('/post_comment', post_commentRouter)
app.use('/reaction', reactionRouter)
app.use('/roles', rolesRouter)
app.use('/send_ass', send_assRouter)
app.use('/types', typesRouter)
app.use('/news', newsRouter)
app.use('/users', usersRouter)
app.use('/user_type_result', user_type_resultRouter)
app.use('/score-assignment', scoreAssignmentRouter);
app.use('/score-user', scoreUserRouter);
app.use('/comments', comments);
app.use('/likes', likesRouter);
app.use('/announcement-comments', announcementCommentsRouter);
app.use('/announcement-likes', announcementLikesRouter);
app.use('/class', classSubjectRouter);
app.use('/grades', gradesRouter);
app.use('/attendance', attendanceRouter);
app.use('/attendance-session', attendanceSessionRouter);
app.use('/feed-posts', feedPostsRouter);
app.use('/feed-post-comments', feedPostCommentsRouter);
app.use('/feed-post-likes', feedPostLikesRouter);
app.use('/portfolio', portfolioRouter);
app.use('/submission-groups', submissionGroupsRouter);
app.use('/assignment_classes', assignmentClassesRouter);
app.use('/assessments', assessmentsRouter);
app.use('/studentinfo', studentinfoRouter);
app.use('/teacherinfo', teacherinfoRouter);
app.use('/appointment', appointmentRouter);
app.use('/content', contentRouter);
app.use('/consultation', consultationRouter);
app.use('/teaching-schedule', teachingScheduleRouter);
app.use('/teacher-notes', teacherNotesRouter);
app.use('/assessment-advice', assessmentAdviceRouter);
app.use('/feed-categories', feedCategoriesRouter);
app.use('/school-info', schoolInfoRouter);
app.use('/uploads', express.static('uploads'));



// error
app.use((req,res)=>{
  res.status(404).json({
        message : "Route not found"
    })
})

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, ()=>{
    console.log(`API running at http://localhost:${PORT}`)
})

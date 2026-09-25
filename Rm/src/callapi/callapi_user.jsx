// let api = "http://127.0.0.1:8000";
let api = API_URL;
import { API_URL } from "../config.js";
import axios from "axios";

// import DatatableStrig from "../component/strig";
export async function GetLogin(email, password) {
  // console.log(id_strategic.data)
  try {
    const response = await axios.post(
      `${api}/api/login-admin`,
      { email, password },
      {
        headers: {
          "Content-Type": `application/json`, // ส่ง Token ผ่าน Header
        },
      }
    );

    // const json = await response.json();
    console.log("data : ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    // Swal.fire("Error", "ไม่สามารถดึงข้อมูลได้", "error");
    const message =
      error.response?.data?.message || "เกิดข้อผิดพลาดขณะส่งข้อมูล";

    throw message; // ส่ง Error ออกไปให้จัดการในที่เรียกใช้
  }
}

export async function getAnnouncements() {
  try {
    const response = await axios.get(`${api}/announcements`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;

  } catch (error) {
    console.error("Error getAnnouncements:", error);
    throw error;
  }
}



export async function getdatayc() {
    //   console.log(id_actionplan);

    try {
      // console.log("token : ", token);
      const response = await axios.get(
        `${api}/postit`,
      //   { id_year },
        {
          headers: {
          //   Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
          // const json = await response.json();
    console.log("data : ", response);
    return response;
  } catch (error) {
    console.error("Error fetching user data:", error);
    // Swal.fire("Error", "ไม่สามารถดึงข้อมูลได้", "error");
    throw error; // ส่ง Error ออกไปให้จัดการในที่เรียกใช้
  }
}

export async function createPostit({ content, category, user_id, color, tape }) {
  try {
    const response = await axios.post(
      `${api}/postit`,
      { content, category, user_user_id: user_id, color, tape },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createPostit:", error.response?.data || error);
    throw error;
  }
}

export async function updatePostit(postId, { content, category, color, tape, user_id }) {
  try {
    const response = await axios.put(
      `${api}/postit/${postId}`,
      { content, category, color, tape, user_user_id: user_id },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updatePostit:", error.response?.data || error);
    throw error;
  }
}

export async function deletePostit(postId, userId) {
  try {
    const response = await axios.delete(`${api}/postit/${postId}`, {
      params: { user_user_id: userId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deletePostit:", error.response?.data || error);
    throw error;
  }
}

// ⚠️ backend endpoint GET /files ไม่รองรับ query param chapter_id จริง (คืนไฟล์ทั้งหมดเสมอ) — กรองเอาเองฝั่ง frontend หลังเรียกเสร็จ
export async function getFilesByChapter(chapter_id) {
    try {
      const res = await axios.get(
        `${api}/files?chapter_id=${chapter_id}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error) {
      console.error("Error fetching files:", error);
      throw error;
    }
  }

export async function createChapterFile({ filename, filepath, chapter_chapter_id }) {
  try {
    const response = await axios.post(
      `${api}/files`,
      { filename, filepath, chapter_chapter_id },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createChapterFile:", error.response?.data || error);
    throw error;
  }
}

  


  export async function getSubmissionsByAssignment(ass_id) {
    try {
      const res = await axios.get(
        `${api}/send_ass?assignment_ass_id=${ass_id}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error) {
      console.error("Error fetching send_ass:", error);
      throw error;
    }
  }

  export async function getNotSubmitStudents(ass_id) {
    try {
      const res = await axios.get(
        `${api}/send_ass/not-submit/${ass_id}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error) {
      console.error("Error fetching not submit:", error);
      throw error;
    }
  }
  
// ================== ASSIGNMENT SUBMIT ==================

// คนที่ส่งแล้ว
export async function getSubmittedUsers(assId) {
  try {
    const response = await axios.get(
      `${api}/send_ass/submitted/${assId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error getSubmittedUsers:", error);
    throw error;
  }
}

// คนที่ยังไม่ส่ง
export async function getNotSubmittedUsers(assId) {
  try {
    const response = await axios.get(
      `${api}/send_ass/not-submit/${assId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error getNotSubmittedUsers:", error);
    throw error;
  }
}

// นับจำนวนคนที่ส่ง
export async function countSubmitted(assId) {
  try {
    const response = await axios.get(
      `${api}/send_ass/count/submitted/${assId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.total;
  } catch (error) {
    console.error("Error countSubmitted:", error);
    throw error;
  }
}

// นับจำนวนคนที่ยังไม่ส่ง
export async function countNotSubmitted(assId) {
  try {
    const response = await axios.get(
      `${api}/send_ass/count/not-submit/${assId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.total;
  } catch (error) {
    console.error("Error countNotSubmitted:", error);
    throw error;
  }
}

export async function updateSendAssScore(sendId, score) {
  try {
    const response = await axios.put(
      `${api}/send_ass/${sendId}`,
      { score },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updateSendAssScore:", error.response?.data || error);
    throw error;
  }
}

export async function getTeachers() {
  const res = await axios.get(`${api}/auth/teachers`);
  return res.data;
}

export async function getStudents() {
  const res = await axios.get(`${api}/auth/students`);
  return res.data;
}


// ================= FILE ASS (ไฟล์ใบงาน) =================

export async function getFileAssignmentById(id) {
  try {
    const response = await axios.get(`${api}/file_ass/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error file_ass by id:", error);
    throw error;
  }
}

// ================= FILES (เอกสารประกอบการเรียน) =================
export async function getFiles() {
  try {
    const response = await axios.get(`${api}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error files:", error);
    throw error;
  }
}

export async function getFileById(id) {
  try {
    const response = await axios.get(`${api}/files/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error file by id:", error);
    throw error;
  }
}

export async function createAnnouncement(data) {
  try {
    const response = await axios.post(`${api}/announcements`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;

  } catch (error) {
    console.error("Error createAnnouncement:", error);
    throw error;
  }
}


export async function loginUser(email, password) {
  try {
    const response = await axios.post(
      `${api}/login`,
      { email, password },   // ✅ ต้องเป็น email
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    localStorage.setItem("token", response.data.token);
    return response.data;

  } catch (error) {
    console.error("Error login:", error.response?.data || error);
    throw error;
  }
}
// ================= ANNOUNCEMENT UPDATE =================

export async function updateAnnouncement(id, data) {
  try {

    const response = await axios.put(
      `${api}/announcements/${id}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error updateAnnouncement:", error);
    throw error;
  }
}

// ================= ANNOUNCEMENT SOFT DELETE =================

export async function deleteAnnouncement(id) {
  try {

    const response = await axios.patch(
      `${api}/announcements/${id}/delete`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error deleteAnnouncement:", error);
    throw error;
  }
}

// ================= REACTIONS =================

// กด Like
export async function addReaction(type, postId) {
  try {
    const response = await axios.post(
      `${api}/api/reactions`,
      {
        type: type,
        postit_post_id: postId
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error addReaction:", error);
    throw error;
  }
}

// โหลด reaction ของโพสต์
export async function getReactions() {
  try {
    const response = await axios.get(
      `${api}/api/reactions`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error getReactions:", error);
    throw error;
  }
}
export async function countReaction(postId) {
  try {
    const response = await axios.get(
      `${api}/api/reactions/count/${postId}`
    );

    return response.data.total;

  } catch (error) {
    console.error("Error countReaction:", error);
    throw error;
  }
}
// ================= COMMENTS =================

export async function getComments() {
  const res = await axios.get(`${API_URL}/post_comment`);
  return res.data;
}

export async function addComment(comment_text, postId) {

  const token = localStorage.getItem("token");
  const user_user_id = "2"
  try {
    const response = await axios.post(
      `${api}/post_comment`,
      {
        comment_text: comment_text,
        postit_post_id: postId,
        user_user_id 
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error addComment:", error.response?.data || error);
    throw error;
  }
}

// ================= POSTIT LIKES (หน้า YC) =================

export async function getPostitLikeStatus(postId, userId) {
  try {
    const response = await axios.get(`${api}/reaction/like-status`, {
      params: { postit_post_id: postId, user_user_id: userId },
    });
    return response.data; // { count, liked }
  } catch (error) {
    console.error("Error getPostitLikeStatus:", error);
    throw error;
  }
}

export async function togglePostitLike(postId, userId) {
  try {
    const response = await axios.post(`${api}/reaction/toggle`, {
      type: "like",
      postit_post_id: postId,
      user_user_id: userId,
    });
    return response.data; // { count, liked }
  } catch (error) {
    console.error("Error togglePostitLike:", error.response?.data || error);
    throw error;
  }
}

export async function getAssignmentsByChapter(chapter_id) {
  try {
    const res = await axios.get(`${api}/chapter/chapter/${chapter_id}`, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data; // คืน array ของ assignment
  } catch (error) {
    console.error("Error getAssignmentsByChapter:", error);
    throw error;
  }
}

// ================= CHAPTERS =================
export async function getChapters() {
  try {
    const response = await axios.get(`${api}/chapter`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getChapters:", error);
    throw error;
  }
}

// ================= NEWS =================

export async function createNews(data) {
  console.log(data)
  try {
    const response = await axios.post(`${api}/news`, data, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error createNews:", error);
    throw error;
  }
}

export async function getNews() {
  try {
    const response = await axios.get(`${api}/news`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error getNews:", error);
    throw error;
  }
}

export async function updateNews(id, data) {
  try {

    const response = await axios.put(`${api}/news/${id}`, data, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error updateNews:", error);
    throw error;
  }
}

export async function deleteNews(id) {
  try {

    const response = await axios.delete(`${api}/news/${id}`, {}, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error deleteNews:", error);
    throw error;
  }
}

// อัปโหลดไฟล์แนบเข้ากับโพสต์ข่าว (news_id ต้องถูกสร้างไว้ก่อนแล้ว) รองรับหลายไฟล์พร้อมกัน
// ผลลัพธ์: { message, files: [{ file_id, file_url, file_name, file_type }] }
export async function uploadNewsFiles(newsId, files) {
  try {

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await axios.post(
      `${api}/news/${newsId}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error uploadNewsFiles:", error.response?.data || error);
    throw error;
  }
}

export async function getNewsFiles(newsId) {
  try {
    const response = await axios.get(`${api}/news/${newsId}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getNewsFiles:", error);
    throw error;
  }
}

export async function deleteNewsFile(fileId) {
  try {
    const response = await axios.delete(`${api}/news/files/${fileId}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteNewsFile:", error.response?.data || error);
    throw error;
  }
}

export async function getStudent() {
  try {
    const response = await axios.get(`${api}/users/student`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error getNews:", error);
    throw error;
  }
}

// ================= ENROLL (เชื่อมนักเรียน user_user_id เข้ากับ grade_idgrade + class_class_id) =================
export async function getEnrollments() {
  try {
    const response = await axios.get(`${api}/enroll`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error getEnrollments:", error);
    throw error;
  }
}

// ================= GRADES (ห้องเรียนจริง — grade_name/section/track + class_code สำหรับโค้ดเข้าห้อง) =================
export async function getClasses() {
  try {
    const response = await axios.get(`${api}/grades`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error getClasses:", error);
    throw error;
  }
}

export async function getTeacher() {
  try {
    const response = await axios.get(`${api}/users/teacher`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error getNews:", error);
    throw error;
  }
}

export async function getScoreUser() {
  try {
    const response = await axios.get(`${api}/score-user`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error getNews:", error);
    throw error;
  }
}

export async function getAssAll() {
  try {
    const response = await axios.get(`${api}/assignment`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;

  } catch (error) {
    console.error("Error getNews:", error);
    throw error;
  }
}

// การผูกงาน (assignment) กับห้องเรียน (grade) — คืน [{id, ass_id, grade_id}], กรองได้ด้วย ass_id หรือ grade_id
export async function getAssignmentClasses({ ass_id, grade_id } = {}) {
  try {
    const params = {};
    if (ass_id) params.ass_id = ass_id;
    if (grade_id) params.grade_id = grade_id;
    const response = await axios.get(`${api}/assignment_classes`, {
      headers: { "Content-Type": "application/json" },
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error getAssignmentClasses:", error);
    throw error;
  }
}

// ================= สรุปข้อมูลนักเรียนรายคน (นักเรียนของฉัน) =================

// เป้าหมายของนักเรียน — [{goal_id, goal_text, faculty_name, career_field, user_user_id}] กรองเองฝั่ง client ด้วย user_user_id
export async function getGoals() {
  try {
    const response = await axios.get(`${api}/goal`, { headers: { "Content-Type": "application/json" } });
    return response.data;
  } catch (error) {
    console.error("Error getGoals:", error);
    throw error;
  }
}

// ผลแบบทดสอบแนวทาง (Holland) — [{result_id, user_user_id, type_type_id, result_code, test_date, recommended_faculty_id}]
export async function getTypeResults() {
  try {
    const response = await axios.get(`${api}/user_type_result`, { headers: { "Content-Type": "application/json" } });
    return response.data;
  } catch (error) {
    console.error("Error getTypeResults:", error);
    throw error;
  }
}

// รายชื่อ-คำอธิบายกลุ่มบุคลิกภาพ (Holland types) — [{type_id, type_code, type_name, description}]
export async function getTypes() {
  try {
    // ใช้ /types (พหูพจน์) เพราะมีชุดข้อมูล RIASEC ครบ 6 กลุ่มจริง ส่วน /type (เอกพจน์) เป็นชุดเก่าที่ไม่ครบ
    const response = await axios.get(`${api}/types`, { headers: { "Content-Type": "application/json" } });
    return response.data;
  } catch (error) {
    console.error("Error getTypes:", error);
    throw error;
  }
}

// คณะ/มหาวิทยาลัยแนะนำ — [{faculty_id, faculty_name, university_name, Type_type_id}]
export async function getFaculties() {
  try {
    const response = await axios.get(`${api}/faculty`, { headers: { "Content-Type": "application/json" } });
    return response.data;
  } catch (error) {
    console.error("Error getFaculties:", error);
    throw error;
  }
}

// งานที่ส่งทั้งหมดของทุกคน (ไม่กรองฝั่ง backend) — ใช้คำนวณคะแนนเฉลี่ยรายคนฝั่ง client
export async function getAllSubmissions() {
  try {
    const response = await axios.get(`${api}/send_ass`, { headers: { "Content-Type": "application/json" } });
    return response.data;
  } catch (error) {
    console.error("Error getAllSubmissions:", error);
    throw error;
  }
}

// ================= ASSIGNMENT DETAIL (หน้ารายละเอียดงานของครู) =================

export async function getAssignmentById(assId) {
  try {
    const response = await axios.get(`${api}/assignment/${assId}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAssignmentById:", error);
    throw error;
  }
}

export async function getAssignmentFiles(assId) {
  try {
    const response = await axios.get(`${api}/assignment/${assId}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAssignmentFiles:", error);
    throw error;
  }
}

// ================= NEWS COMMENTS (newcomment table) =================

export async function getNewsComments(newsId) {
  try {
    const response = await axios.get(`${api}/comments`, {
      params: { news_id: newsId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getNewsComments:", error);
    throw error;
  }
}

export async function createNewComment({ news_id, user_id, content, parent_comment_id = null }) {
  try {
    const response = await axios.post(
      `${api}/comments/new`,
      { news_id, user_id, content, parent_comment_id },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error createNewComment:", error.response?.data || error);
    throw error;
  }
}

export async function updateComment(commentId, { user_id, content }) {
  try {
    const response = await axios.put(
      `${api}/comments/${commentId}`,
      { user_id, content },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updateComment:", error.response?.data || error);
    throw error;
  }
}

export async function deleteComment(commentId, user_id) {
  try {
    const response = await axios.delete(`${api}/comments/${commentId}`, {
      params: { user_id },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteComment:", error.response?.data || error);
    throw error;
  }
}

// ================= NEWS LIKES (news_likes table) =================

export async function getNewsLikes(newsId, userId) {
  try {
    const response = await axios.get(`${api}/likes`, {
      params: { news_id: newsId, user_id: userId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getNewsLikes:", error);
    throw error;
  }
}

export async function toggleNewsLike(newsId, userId) {
  try {
    const response = await axios.post(
      `${api}/likes/toggle`,
      { news_id: newsId, user_id: userId },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error toggleNewsLike:", error.response?.data || error);
    throw error;
  }
}

// ================= ANNOUNCEMENT FILES (หน้ากิจกรรม) =================
// รองรับหลายไฟล์พร้อมกัน ผลลัพธ์: { message, files: [{ file_id, file_url or file, file_name, file_type }] }
export async function uploadAnnouncementFiles(newsId, files) {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await axios.post(
      `${api}/announcements/${newsId}/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return response.data;
  } catch (error) {
    console.error("Error uploadAnnouncementFiles:", error.response?.data || error);
    throw error;
  }
}

export async function getAnnouncementFiles(newsId) {
  try {
    const response = await axios.get(`${api}/announcements/${newsId}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAnnouncementFiles:", error);
    throw error;
  }
}

export async function deleteAnnouncementFile(fileId) {
  try {
    const response = await axios.delete(`${api}/announcements/files/${fileId}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteAnnouncementFile:", error.response?.data || error);
    throw error;
  }
}

// ================= ANNOUNCEMENT COMMENTS (announcement_comments table — แยกจาก newcomment กันไอดีชนกับหน้า news) =================

export async function getAnnouncementComments(newsId) {
  try {
    const response = await axios.get(`${api}/announcement-comments`, {
      params: { news_id: newsId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAnnouncementComments:", error);
    throw error;
  }
}

export async function createAnnouncementComment({ news_id, user_id, content, parent_comment_id = null }) {
  try {
    const response = await axios.post(
      `${api}/announcement-comments/new`,
      { news_id, user_id, content, parent_comment_id },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createAnnouncementComment:", error.response?.data || error);
    throw error;
  }
}

export async function updateAnnouncementComment(commentId, { user_id, content }) {
  try {
    const response = await axios.put(
      `${api}/announcement-comments/${commentId}`,
      { user_id, content },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updateAnnouncementComment:", error.response?.data || error);
    throw error;
  }
}

export async function deleteAnnouncementComment(commentId, user_id) {
  try {
    const response = await axios.delete(`${api}/announcement-comments/${commentId}`, {
      params: { user_id },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteAnnouncementComment:", error.response?.data || error);
    throw error;
  }
}

// ================= ANNOUNCEMENT LIKES (announcement_likes table — แยกจาก news_likes กันไอดีชนกับหน้า news) =================

export async function getAnnouncementLikes(newsId, userId) {
  try {
    const response = await axios.get(`${api}/announcement-likes`, {
      params: { news_id: newsId, user_id: userId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAnnouncementLikes:", error);
    throw error;
  }
}

export async function toggleAnnouncementLike(newsId, userId) {
  try {
    const response = await axios.post(
      `${api}/announcement-likes/toggle`,
      { news_id: newsId, user_id: userId },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error toggleAnnouncementLike:", error.response?.data || error);
    throw error;
  }
}

// ================= ATTENDANCE (การเข้าเรียน) =================

export async function getAttendance(gradeId, date) {
  try {
    const response = await axios.get(`${api}/attendance`, {
      params: { grade_id: gradeId, date },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAttendance:", error);
    throw error;
  }
}

export async function updateAttendance(id, { status, checkin_time, note, teacher_name }) {
  try {
    const response = await axios.put(`${api}/attendance/${id}`, {
      status,
      checkin_time,
      note,
      teacher_name,
    });
    return response.data;
  } catch (error) {
    console.error("Error updateAttendance:", error);
    throw error;
  }
}

export async function bulkCheckinAttendance(gradeId, date, teacherName) {
  try {
    const response = await axios.post(`${api}/attendance/bulk-checkin`, {
      grade_id: gradeId,
      date,
      teacher_name: teacherName,
    });
    return response.data;
  } catch (error) {
    console.error("Error bulkCheckinAttendance:", error);
    throw error;
  }
}

export async function bulkSetAttendanceStatus(ids, status, teacherName) {
  try {
    const response = await axios.post(`${api}/attendance/bulk-status`, {
      ids,
      status,
      teacher_name: teacherName,
    });
    return response.data;
  } catch (error) {
    console.error("Error bulkSetAttendanceStatus:", error);
    throw error;
  }
}

export async function bulkNoteAttendance(ids, note) {
  try {
    const response = await axios.post(`${api}/attendance/bulk-note`, { ids, note });
    return response.data;
  } catch (error) {
    console.error("Error bulkNoteAttendance:", error);
    throw error;
  }
}

export async function getAttendanceHistory(gradeId, from, to) {
  try {
    const response = await axios.get(`${api}/attendance/history`, {
      params: { grade_id: gradeId, from, to },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAttendanceHistory:", error);
    throw error;
  }
}

export async function getAttendanceLog(gradeId, date) {
  try {
    const response = await axios.get(`${api}/attendance/log`, {
      params: { grade_id: gradeId, date },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAttendanceLog:", error);
    throw error;
  }
}

export async function getStudentAttendanceSummary(userId, gradeId) {
  try {
    const response = await axios.get(`${api}/attendance/student/${userId}`, {
      params: { grade_id: gradeId },
    });
    return response.data;
  } catch (error) {
    console.error("Error getStudentAttendanceSummary:", error);
    throw error;
  }
}

// ================= ATTENDANCE SESSION (เปิดเช็กชื่อ/QR) =================

export async function getActiveAttendanceSession(gradeId) {
  try {
    const response = await axios.get(`${api}/attendance-session/active`, {
      params: { grade_id: gradeId },
    });
    return response.data;
  } catch (error) {
    console.error("Error getActiveAttendanceSession:", error);
    throw error;
  }
}

export async function createAttendanceSession(data) {
  try {
    const response = await axios.post(`${api}/attendance-session`, data);
    return response.data;
  } catch (error) {
    console.error("Error createAttendanceSession:", error);
    throw error;
  }
}

export async function closeAttendanceSession(sessionId) {
  try {
    const response = await axios.put(`${api}/attendance-session/${sessionId}/close`);
    return response.data;
  } catch (error) {
    console.error("Error closeAttendanceSession:", error);
    throw error;
  }
}

// ================= Feed posts (หน้า /newsfeed — ข่าวสาร+กิจกรรม รวมหมวดหมู่เดียว) =================

// สร้างโพสต์ + อัปโหลดไฟล์แนบในคำขอเดียว (ต่างจาก news/announcement ที่แยก create แล้วค่อย upload)
// formData ต้อง append: author_id, title, content, category, event_date? (event เท่านั้น), link_url?, files (multiple)
export async function createFeedPost(formData) {
  try {
    const response = await axios.post(`${api}/feed-posts`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Error createFeedPost:", error.response?.data || error);
    throw error;
  }
}

export async function getFeedPosts() {
  try {
    const response = await axios.get(`${api}/feed-posts`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getFeedPosts:", error);
    throw error;
  }
}

export async function getFeedPostFiles(postId) {
  try {
    const response = await axios.get(`${api}/feed-posts/${postId}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getFeedPostFiles:", error);
    throw error;
  }
}

export async function updateFeedPost(id, data) {
  try {
    const response = await axios.put(`${api}/feed-posts/${id}`, data, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateFeedPost:", error.response?.data || error);
    throw error;
  }
}

export async function deleteFeedPost(id) {
  try {
    const response = await axios.delete(`${api}/feed-posts/${id}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteFeedPost:", error);
    throw error;
  }
}

export async function toggleFeedPostPin(id) {
  try {
    const response = await axios.patch(`${api}/feed-posts/${id}/pin`, {}, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error toggleFeedPostPin:", error.response?.data || error);
    throw error;
  }
}

export async function uploadFeedPostFiles(postId, files) {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await axios.post(`${api}/feed-posts/${postId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploadFeedPostFiles:", error.response?.data || error);
    throw error;
  }
}

export async function deleteFeedPostFile(fileId) {
  try {
    const response = await axios.delete(`${api}/feed-posts/files/${fileId}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteFeedPostFile:", error.response?.data || error);
    throw error;
  }
}

export async function getFeedPostComments(postId) {
  try {
    const response = await axios.get(`${api}/feed-post-comments`, {
      params: { post_id: postId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getFeedPostComments:", error);
    throw error;
  }
}

export async function createFeedPostComment({ post_id, user_id, content, parent_comment_id = null }) {
  try {
    const response = await axios.post(
      `${api}/feed-post-comments/new`,
      { post_id, user_id, content, parent_comment_id },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createFeedPostComment:", error.response?.data || error);
    throw error;
  }
}

export async function getFeedPostLikes(postId, userId) {
  try {
    const response = await axios.get(`${api}/feed-post-likes`, {
      params: { post_id: postId, user_id: userId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getFeedPostLikes:", error);
    throw error;
  }
}

export async function toggleFeedPostLike(postId, userId) {
  try {
    const response = await axios.post(
      `${api}/feed-post-likes/toggle`,
      { post_id: postId, user_id: userId },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error toggleFeedPostLike:", error.response?.data || error);
    throw error;
  }
}

// ================= PORTFOLIO (แฟ้มสะสมผลงานนักเรียน) =================
export async function getPortfolioWorks(params = {}) {
  try {
    const response = await axios.get(`${api}/portfolio`, {
      params,
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getPortfolioWorks:", error);
    throw error;
  }
}

export async function getPortfolioWorkFiles(workId) {
  try {
    const response = await axios.get(`${api}/portfolio/${workId}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getPortfolioWorkFiles:", error);
    throw error;
  }
}

export async function createPortfolioWork(payload) {
  try {
    const response = await axios.post(`${api}/portfolio`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error createPortfolioWork:", error.response?.data || error);
    throw error;
  }
}

export async function updatePortfolioWork(workId, payload) {
  try {
    const response = await axios.put(`${api}/portfolio/${workId}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error updatePortfolioWork:", error.response?.data || error);
    throw error;
  }
}

export async function reviewPortfolioWork(workId, { status, teacher_comment, reviewed_by }) {
  try {
    const response = await axios.patch(
      `${api}/portfolio/${workId}/review`,
      { status, teacher_comment, reviewed_by },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error reviewPortfolioWork:", error.response?.data || error);
    throw error;
  }
}

export async function deletePortfolioWork(workId) {
  try {
    const response = await axios.delete(`${api}/portfolio/${workId}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deletePortfolioWork:", error.response?.data || error);
    throw error;
  }
}

// อัปโหลดได้ทีละไฟล์เท่านั้น (backend: upload.single('file')) ต่างจาก /news/:id/upload ที่รับหลายไฟล์พร้อมกัน
export async function uploadPortfolioFile(workId, file, coverUrl) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (coverUrl) formData.append("cover_url", coverUrl);

    const response = await axios.post(`${api}/portfolio/${workId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploadPortfolioFile:", error.response?.data || error);
    throw error;
  }
}

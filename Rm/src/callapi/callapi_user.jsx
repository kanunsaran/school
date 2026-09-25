import axios from "axios";
import { getCurrentUser } from "../utils/auth.js";
import { API_BASE_URL } from "../config/api.js";

let api = API_BASE_URL;

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

// บันทึกความคิดเห็นครู + สถานะส่งกลับ (teacher_comment, is_released) ต่อการส่งงานหนึ่งครั้ง
export async function updateSubmissionComment(sendId, { teacher_comment, is_released }) {
  try {
    const response = await axios.patch(
      `${api}/send_ass/${sendId}/comment`,
      { teacher_comment, is_released },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updateSubmissionComment:", error.response?.data || error);
    throw error;
  }
}

// ไฟล์แนบของการส่งงานหนึ่งครั้ง (ส่งได้หลายไฟล์ต่อ 1 send_id)
export async function getSubmissionFiles(sendId) {
  try {
    const response = await axios.get(`${api}/send_ass/${sendId}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getSubmissionFiles:", error);
    throw error;
  }
}

// นักเรียนส่งงาน (สร้างแถว send_ass) — file_path เป็นค่าเดิมของระบบที่ endpoint บังคับให้ส่งมาไม่ว่าง
// ไฟล์จริงจะถูกอัปโหลดแยกต่อด้วย uploadSubmissionFiles ทันทีหลังจากนี้ (เก็บใน send_ass_files)
export async function createSubmission({ assignment_ass_id, user_user_id, file_path, group_id }) {
  try {
    const response = await axios.post(
      `${api}/send_ass`,
      { assignment_ass_id, user_user_id, file_path, group_id: group_id || null },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createSubmission:", error.response?.data || error);
    throw error;
  }
}

// อัปโหลดไฟล์แนบของการส่งงาน (หลายไฟล์ต่อ 1 send_id) — ผลลัพธ์: { message, files: [{file_id, file_url, file_name, file_type}] }
export async function uploadSubmissionFiles(sendId, files) {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const response = await axios.post(`${api}/send_ass/${sendId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploadSubmissionFiles:", error.response?.data || error);
    throw error;
  }
}

// ยกเลิกการส่งงาน (soft delete แถว send_ass)
export async function deleteSubmission(sendId) {
  try {
    const response = await axios.delete(`${api}/send_ass/${sendId}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteSubmission:", error.response?.data || error);
    throw error;
  }
}

// ================= SUBMISSION GROUPS (จัดกลุ่มนักเรียนสำหรับงานกลุ่ม) =================
export async function getSubmissionGroups(assId) {
  try {
    const response = await axios.get(`${api}/submission-groups`, {
      params: { assignment_ass_id: assId },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getSubmissionGroups:", error);
    throw error;
  }
}

export async function createSubmissionGroup({ assignment_ass_id, group_name, member_user_ids }) {
  try {
    const response = await axios.post(
      `${api}/submission-groups`,
      { assignment_ass_id, group_name, member_user_ids },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createSubmissionGroup:", error.response?.data || error);
    throw error;
  }
}

export async function updateSubmissionGroup(groupId, { group_name, member_user_ids }) {
  try {
    const response = await axios.put(
      `${api}/submission-groups/${groupId}`,
      { group_name, member_user_ids },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updateSubmissionGroup:", error.response?.data || error);
    throw error;
  }
}

export async function deleteSubmissionGroup(groupId) {
  try {
    const response = await axios.delete(`${api}/submission-groups/${groupId}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteSubmissionGroup:", error.response?.data || error);
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

// นำเข้ารายชื่อนักเรียนแบบหลายคนพร้อมกัน (หน้า /ImportStudents) — ⚠️ backend ยังไม่มี endpoint นี้จริง
// (ยืนยันแล้วว่าตอนนี้ /auth/students มีแค่ GET อย่างเดียว ไม่มีทางสร้างบัญชีผู้ใช้ผ่าน API เลย)
// ต้องขอให้ backend เพิ่ม route นี้ก่อนฟีเจอร์นำเข้าจะทำงานได้จริง
// แต่ละแถวใน students: { first_name, last_name, fullname, email, password, grade_id, seat_no }
// password ฝั่งหน้าเว็บคำนวณมาแล้ว = ข้อความก่อน @ ของอีเมล (ตามที่ครูระบุ เช่น 691-64888@kkw.ac.th -> 691-64888)
// backend ต้อง insert เข้า users + enrollment (grade_id, seat_no) จริง ให้นักเรียนล็อกอินได้ทันทีด้วย email/password นี้
// โดยไม่ต้องให้นักเรียนกรอกชื่อ-สกุล-ห้องเองอีกในหน้าโปรไฟล์ — ดูสเปกเต็มที่ขอไว้ใน src/Teacher/ImportStudents.jsx
export async function importStudents(students) {
  const res = await axios.post(
    `${api}/auth/students/import`,
    { students },
    { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
  );
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
  const res = await axios.get(`${api}/post_comment`);
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

export async function deleteYcComment(commentId) {
  const token = localStorage.getItem("token");
  try {
    const response = await axios.delete(`${api}/post_comment/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteYcComment:", error.response?.data || error);
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

// สร้างห้องเรียน/ระดับชั้นใหม่ — field ยืนยันตรงกับ schema จริงที่ GET /grades คืนมา (idgrade, grade_name, section, track, year_year_id, semester, teacher_user_id)
// ⚠️ ทดสอบแล้วพบว่า backend endpoint นี้มีอยู่จริง แต่ insert ไม่ผ่านเพราะคอลัมน์ idgrade ยังไม่ได้ตั้ง auto-increment (error: "Field 'idgrade' doesn't have a default value") — ต้องให้ backend แก้ตรงนี้ก่อนถึงจะสร้างได้จริง
export async function createClass({ grade_name, section, track, year_year_id, semester, teacher_user_id }) {
  try {
    const response = await axios.post(
      `${api}/grades`,
      { grade_name, section, track, year_year_id, semester, teacher_user_id },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createClass:", error.response?.data || error);
    throw error;
  }
}

// รายชื่อปีการศึกษาจริง (ใช้ทำ dropdown ตอนสร้างห้องเรียน — grades.year_year_id เป็น FK ไปตารางนี้)
export async function getAcademicYears() {
  try {
    const response = await axios.get(`${api}/year`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getAcademicYears:", error);
    throw error;
  }
}

// พิมพ์ปี พ.ศ. ใหม่ที่ยังไม่มีในรายการได้ (react-select creatable) — สร้างแถวจริงในตาราง years แล้วคืน year_id มาใช้ต่อ
export async function createAcademicYear(yearName) {
  try {
    const response = await axios.post(
      `${api}/year`,
      { year_name: yearName },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createAcademicYear:", error.response?.data || error);
    throw error;
  }
}

// ลบห้องเรียน (soft delete)
export async function deleteClass(idgrade) {
  try {
    const response = await axios.delete(`${api}/grades/${idgrade}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteClass:", error.response?.data || error);
    throw error;
  }
}

// นักเรียนกรอกรหัสเข้าชั้นเรียนที่ครูสร้างไว้ (grades.class_code) — สร้างแถว enroll จริง
export async function joinClassByCode(classCode, studentUserId) {
  try {
    const response = await axios.post(
      `${api}/enroll/join`,
      { class_code: classCode, user_user_id: studentUserId },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error joinClassByCode:", error.response?.data || error);
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

// แก้ไขข้อมูลบัญชีผู้ใช้ (คอลัมน์จริงในตาราง users — fullname/email/username/dob/student_code) ใช้ได้ทั้งครูและนักเรียน
export async function updateUser(userId, patch) {
  try {
    const response = await axios.put(`${api}/users/${userId}`, patch, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateUser:", error.response?.data || error);
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

// POST/PUT /goal ต้อง login จริงถึงจะใช้ได้ (ทดสอบแล้วได้ 401 โดยไม่มี token) ต้องแนบ Authorization: Bearer จาก session จริง
export async function createGoal({ user_user_id, goal_text, faculty_name, career_field }) {
  try {
    const response = await axios.post(
      `${api}/goal`,
      { user_user_id, goal_text, faculty_name, career_field },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createGoal:", error);
    throw error;
  }
}

export async function updateGoal(goalId, { goal_text, faculty_name, career_field }) {
  try {
    const response = await axios.put(
      `${api}/goal/${goalId}`,
      { goal_text, faculty_name, career_field },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updateGoal:", error);
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

// แก้ไข/ลบงานที่มอบหมายไว้ — payload เป็น FormData รูปแบบเดียวกับตอนสร้าง (multipart เผื่อแนบไฟล์เพิ่ม) ไม่ตั้ง Content-Type เอง ให้ axios ใส่ boundary ให้อัตโนมัติ
// ⚠️ ทดสอบจริงแล้ว (23 ส.ค. 69): backend ยังไม่มี route PUT/DELETE/PATCH /assignment/:id เลยสักตัว (มีแค่ GET) เรียกแล้ว 404 "Route not found" ทุกวิธี
// ต้องขอ backend เพิ่ม route ทั้งสองนี้ก่อนถึงจะแก้ไข/ลบงานได้จริง — ฝั่ง frontend (ปุ่มแก้ไข/ลบใน work.jsx + โหมดแก้ไขใน WorkCreate.jsx) เขียนพร้อมเรียกใช้รอไว้แล้ว
export async function updateAssignment(id, formData) {
  try {
    const response = await axios.put(`${api}/assignment/${id}`, formData, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateAssignment:", error.response?.data || error);
    throw error;
  }
}

export async function deleteAssignment(id) {
  try {
    const response = await axios.delete(`${api}/assignment/${id}`, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteAssignment:", error.response?.data || error);
    throw error;
  }
}

// ================= CONTENT (โพสต์ "เนื้อหา" — ตาราง content แยกจาก assignment) =================
// ⚠️ payload field ต่างจาก /assignment ตรงชื่อ: ใช้ "body" ไม่ใช่ "description" (ทดสอบยิงตรงกับ server แล้วยืนยัน 24 ส.ค. 69)

export async function getContents() {
  try {
    const response = await axios.get(`${api}/content`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getContents:", error);
    throw error;
  }
}

export async function getContentById(id) {
  try {
    const response = await axios.get(`${api}/content/${id}`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getContentById:", error);
    throw error;
  }
}

export async function getContentFiles(id) {
  try {
    const response = await axios.get(`${api}/content/${id}/files`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error getContentFiles:", error);
    throw error;
  }
}

export async function createContent(formData) {
  try {
    const response = await axios.post(`${api}/content`, formData, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error createContent:", error.response?.data || error);
    throw error;
  }
}

export async function updateContent(id, formData) {
  try {
    const response = await axios.put(`${api}/content/${id}`, formData, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateContent:", error.response?.data || error);
    throw error;
  }
}

export async function deleteContent(id) {
  try {
    const response = await axios.delete(`${api}/content/${id}`, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteContent:", error.response?.data || error);
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

export async function updateFeedPostComment(commentId, { user_id, content }) {
  try {
    const response = await axios.put(
      `${api}/feed-post-comments/${commentId}`,
      { user_id, content },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error updateFeedPostComment:", error.response?.data || error);
    throw error;
  }
}

export async function deleteFeedPostComment(commentId, user_id) {
  try {
    const response = await axios.delete(`${api}/feed-post-comments/${commentId}`, {
      params: { user_id },
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteFeedPostComment:", error.response?.data || error);
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

// endpoint นี้มีจริงแล้ว (ยืนยันจาก GET /studentinfo/1 คืน 200 พร้อมข้อมูลจริง) response: { student_user_id, form_data, avatar_url, created_at, updated_at }
// form_data เป็น object ซ้อน 7 กลุ่ม: personal/contact/address/family/health/education/interests (ดู mapping เต็มๆ ใน students.jsx GENERAL_INFO_SECTIONS
// และ toBackendSchema/fromBackendSchema ใน StudentInfoForm.jsx — คนละ shape กับฟอร์มยาวที่ StudentInfoForm.jsx เก็บ ต้องแปลงไปมาเอง)
export async function getStudentGeneralInfo(userId) {
  try {
    const response = await axios.get(`${api}/studentinfo/${userId}`, { headers: { "Content-Type": "application/json" } });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null; // ยังไม่เคยกรอกข้อมูล ไม่ถือเป็น error
    console.error("Error getStudentGeneralInfo:", error.response?.data || error);
    throw error;
  }
}

// upsert (สร้างครั้งแรก/แก้ไขซ้ำ) — formData ต้องเป็น shape จริงของ backend (personal/contact/address/family/health/education/interests)
// ไม่ใช่ state ดิบของฟอร์ม — แปลงผ่าน toBackendSchema() ใน StudentInfoForm.jsx ก่อนเรียกฟังก์ชันนี้เสมอ
export async function saveStudentGeneralInfo(userId, formData) {
  try {
    const response = await axios.put(
      `${api}/studentinfo/${userId}`,
      { form_data: formData },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error saveStudentGeneralInfo:", error.response?.data || error);
    throw error;
  }
}

// อัปโหลดรูปโปรไฟล์นักเรียน — คืน { avatar_url } เป็น path สัมพัทธ์ (เช่น /uploads/avatars/xxx.jpg) ต้องต่อ api เองตอนแสดงผล
export async function uploadStudentAvatar(userId, file) {
  try {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await axios.post(`${api}/studentinfo/${userId}/avatar`, formData);
    return response.data;
  } catch (error) {
    console.error("Error uploadStudentAvatar:", error.response?.data || error);
    throw error;
  }
}

// ================= ข้อมูลทั่วไปของครู (เหมือน studentinfo แต่แยกตาราง teacher_general_info) =================

export async function getTeacherGeneralInfo(userId) {
  try {
    const response = await axios.get(`${api}/teacherinfo/${userId}`, { headers: { "Content-Type": "application/json" } });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null; // ยังไม่เคยกรอกข้อมูล ไม่ถือเป็น error
    console.error("Error getTeacherGeneralInfo:", error.response?.data || error);
    throw error;
  }
}

export async function saveTeacherGeneralInfo(userId, formData) {
  try {
    const response = await axios.put(
      `${api}/teacherinfo/${userId}`,
      { form_data: formData },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.error("Error saveTeacherGeneralInfo:", error.response?.data || error);
    throw error;
  }
}

// อัปโหลดรูปโปรไฟล์ครู — คืน { avatar_url } เป็น path สัมพัทธ์ (เช่น /uploads/avatars/xxx.jpg) ต้องต่อ api เองตอนแสดงผล
export async function uploadTeacherAvatar(userId, file) {
  try {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await axios.post(`${api}/teacherinfo/${userId}/avatar`, formData);
    return response.data;
  } catch (error) {
    console.error("Error uploadTeacherAvatar:", error.response?.data || error);
    throw error;
  }
}

// ================= APPOINTMENT (นัดหมายครู-นักเรียน) — ยืนยันแล้วว่า backend มีจริง =================
// GET เปิดสาธารณะ, POST/PUT/DELETE/reply ต้อง login (แนบ Authorization: Bearer จาก session จริง)
// แต่ละแถวที่ได้จาก GET join teacher_name/student_name และแนบ replies: [{reply_id, user_user_id, author_name, content, created_at}] มาให้แล้ว
export async function getAppointments({ teacher_user_id, student_user_id } = {}) {
  try {
    const params = {};
    if (teacher_user_id) params.teacher_user_id = teacher_user_id;
    if (student_user_id) params.student_user_id = student_user_id;
    const response = await axios.get(`${api}/appointment`, { params });
    return response.data;
  } catch (error) {
    console.error("Error getAppointments:", error.response?.data || error);
    throw error;
  }
}

export async function createAppointment({ teacher_user_id, student_user_id, appointment_date, appointment_time, note }) {
  try {
    const response = await axios.post(
      `${api}/appointment`,
      { teacher_user_id, student_user_id, appointment_date, appointment_time, note },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createAppointment:", error.response?.data || error);
    throw error;
  }
}

export async function updateAppointment(id, patch) {
  try {
    const response = await axios.put(`${api}/appointment/${id}`, patch, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateAppointment:", error.response?.data || error);
    throw error;
  }
}

export async function cancelAppointment(id) {
  try {
    const response = await axios.delete(`${api}/appointment/${id}`, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error cancelAppointment:", error.response?.data || error);
    throw error;
  }
}

export async function replyAppointment(id, { user_user_id, content }) {
  try {
    const response = await axios.post(
      `${api}/appointment/${id}/reply`,
      { user_user_id, content },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error replyAppointment:", error.response?.data || error);
    throw error;
  }
}

// ================= CONSULTATION (คำขอปรึกษา ครู-นักเรียน) — mirror pattern จาก /appointment =================
// GET เปิดสาธารณะ, POST/PUT/reply ต้อง login (แนบ Authorization: Bearer จาก session จริง)
// แต่ละแถวที่ได้จาก GET join student_name มาให้แล้ว และแนบ messages: [{message_id, sender_user_id, sender_role, message_text, created_at}]
export async function getConsultationRequests({ teacher_user_id, student_user_id, status } = {}) {
  try {
    const params = {};
    if (teacher_user_id) params.teacher_user_id = teacher_user_id;
    if (student_user_id) params.student_user_id = student_user_id;
    if (status) params.status = status;
    const response = await axios.get(`${api}/consultation`, { params });
    return response.data;
  } catch (error) {
    console.error("Error getConsultationRequests:", error.response?.data || error);
    throw error;
  }
}

export async function createConsultationRequest({ student_user_id, category, subject, message }) {
  try {
    const response = await axios.post(
      `${api}/consultation`,
      { student_user_id, category, subject, message },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createConsultationRequest:", error.response?.data || error);
    throw error;
  }
}

export async function updateConsultationStatus(id, status) {
  try {
    const response = await axios.put(`${api}/consultation/${id}`, { status }, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateConsultationStatus:", error.response?.data || error);
    throw error;
  }
}

export async function replyToConsultation(id, { sender_user_id, sender_role, message_text }) {
  try {
    const response = await axios.post(
      `${api}/consultation/${id}/reply`,
      { sender_user_id, sender_role, message_text },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error replyToConsultation:", error.response?.data || error);
    throw error;
  }
}

// ================= TEACHING SCHEDULE (คาบสอนวันนี้ — แดชบอร์ดครู) =================
export async function getTeachingSchedule({ teacher_user_id }) {
  try {
    const response = await axios.get(`${api}/teaching-schedule`, { params: { teacher_user_id } });
    return response.data;
  } catch (error) {
    console.error("Error getTeachingSchedule:", error.response?.data || error);
    throw error;
  }
}

export async function addTeachingPeriod({ teacher_user_id, weekday, period, classroom, subject }) {
  try {
    const response = await axios.post(
      `${api}/teaching-schedule`,
      { teacher_user_id, weekday, period, classroom, subject },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error addTeachingPeriod:", error.response?.data || error);
    throw error;
  }
}

export async function removeTeachingPeriod(id) {
  try {
    const response = await axios.delete(`${api}/teaching-schedule/${id}`, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error removeTeachingPeriod:", error.response?.data || error);
    throw error;
  }
}

// ================= TEACHER NOTES (บันทึกลับของครูต่อนักเรียน) =================
export async function getTeacherNotes(studentUserId) {
  try {
    const response = await axios.get(`${api}/teacher-notes`, {
      params: { student_user_id: studentUserId },
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error getTeacherNotes:", error.response?.data || error);
    throw error;
  }
}

export async function addTeacherNote({ teacher_user_id, student_user_id, note_text }) {
  try {
    const response = await axios.post(
      `${api}/teacher-notes`,
      { teacher_user_id, student_user_id, note_text },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error addTeacherNote:", error.response?.data || error);
    throw error;
  }
}

export async function deleteTeacherNote(id) {
  try {
    const response = await axios.delete(`${api}/teacher-notes/${id}`, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteTeacherNote:", error.response?.data || error);
    throw error;
  }
}

// ================= ASSESSMENT ADVICE (คำแนะนำของครูต่อผลประเมิน — นักเรียนอ่านได้) =================
export async function getAssessmentAdvice(studentUserId) {
  try {
    const response = await axios.get(`${api}/assessment-advice`, { params: { student_user_id: studentUserId } });
    return response.data;
  } catch (error) {
    console.error("Error getAssessmentAdvice:", error.response?.data || error);
    throw error;
  }
}

export async function addAssessmentAdvice({ teacher_user_id, student_user_id, advice_text }) {
  try {
    const response = await axios.post(
      `${api}/assessment-advice`,
      { teacher_user_id, student_user_id, advice_text },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error addAssessmentAdvice:", error.response?.data || error);
    throw error;
  }
}

export async function deleteAssessmentAdvice(id) {
  try {
    const response = await axios.delete(`${api}/assessment-advice/${id}`, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleteAssessmentAdvice:", error.response?.data || error);
    throw error;
  }
}

// ================= FEED CATEGORIES (หมวดหมู่ข่าวที่ครูตั้งเอง) =================
export async function getFeedCategories() {
  try {
    const response = await axios.get(`${api}/feed-categories`);
    return response.data;
  } catch (error) {
    console.error("Error getFeedCategories:", error.response?.data || error);
    throw error;
  }
}

export async function createFeedCategory({ category_key, label, color_index, created_by_user_id }) {
  try {
    const response = await axios.post(
      `${api}/feed-categories`,
      { category_key, label, color_index, created_by_user_id },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCurrentUser()?.token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Error createFeedCategory:", error.response?.data || error);
    throw error;
  }
}

// ================= ASSESSMENTS (แบบประเมินหลายชุดที่ครูสร้างเอง) =================
export async function getAssessmentsList(params = {}) {
  try {
    const response = await axios.get(`${api}/assessments`, { params });
    return response.data;
  } catch (error) {
    console.error("Error getAssessmentsList:", error.response?.data || error);
    throw error;
  }
}

export async function getAssessmentById(id) {
  try {
    const response = await axios.get(`${api}/assessments/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getAssessmentById:", error.response?.data || error);
    throw error;
  }
}

export async function createAssessmentApi(payload) {
  try {
    const response = await axios.post(`${api}/assessments`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error createAssessmentApi:", error.response?.data || error);
    throw error;
  }
}

export async function updateAssessmentApi(id, payload) {
  try {
    const response = await axios.put(`${api}/assessments/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateAssessmentApi:", error.response?.data || error);
    throw error;
  }
}

export async function deleteAssessmentApi(id) {
  try {
    const response = await axios.delete(`${api}/assessments/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleteAssessmentApi:", error.response?.data || error);
    throw error;
  }
}

export async function duplicateAssessmentApi(id) {
  try {
    const response = await axios.post(`${api}/assessments/${id}/duplicate`);
    return response.data;
  } catch (error) {
    console.error("Error duplicateAssessmentApi:", error.response?.data || error);
    throw error;
  }
}

export async function getAssessmentResponses(id) {
  try {
    const response = await axios.get(`${api}/assessments/${id}/responses`);
    return response.data;
  } catch (error) {
    console.error("Error getAssessmentResponses:", error.response?.data || error);
    throw error;
  }
}

export async function submitAssessmentResponse(id, { user_user_id, answers }) {
  try {
    const response = await axios.post(`${api}/assessments/${id}/responses`, { user_user_id, answers }, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error submitAssessmentResponse:", error.response?.data || error);
    throw error;
  }
}

// ================= SCHOOL INFO (ข้อมูลโรงเรียนหน้า /about — นักเรียนดูอย่างเดียว ครูแก้ไขได้) =================
export async function getSchoolInfo() {
  try {
    const response = await axios.get(`${api}/school-info`);
    return response.data;
  } catch (error) {
    console.error("Error getSchoolInfo:", error.response?.data || error);
    throw error;
  }
}

export async function updateSchoolInfo(formData) {
  try {
    const response = await axios.put(`${api}/school-info`, formData, {
      headers: { Authorization: `Bearer ${getCurrentUser()?.token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error updateSchoolInfo:", error.response?.data || error);
    throw error;
  }
}

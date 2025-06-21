const express = require('express');
const { auth } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Class = require('../models/Class');
const Grade = require('../models/Grade');
const axios = require('axios');

const router = express.Router();

// Khởi tạo Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Thay bằng 'gemini-2.0-flash' nếu dùng

// Endpoint POST /api/chatbot
router.post('/', auth, async (req, res) => {
  try {
    const { question } = req.body;
    const { role } = req.user;

    // Kiểm tra quyền
    if (!['admin', 'lecturer'].includes(role)) {
      return res.status(403).json({ message: 'Quyền truy cập bị từ chối' });
    }

    // Kiểm tra câu hỏi
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ message: 'Câu hỏi không hợp lệ' });
    }

    // Gọi Gemini API
    const prompt = `
      Bạn là chatbot quản lý sinh viên, chỉ trả lời bằng tiếng Việt về thông tin sinh viên, lớp, môn học, điểm số. Không trả lời câu hỏi ngoài hệ thống. 
      Hỗ trợ xử lý tiếng Việt không dấu (VD: "Nguyen Van A" tương đương "Nguyễn Văn A").
      Phân tích câu hỏi sau và trả về JSON hợp lệ với các trường:
      - intent: Loại câu hỏi ('get_student_class', 'get_student_grade', 'get_class_info', 'count_students_by_name', 'export_data', 'view_student_detail', 'list_students_by_name', 'get_course_average', 'list_students_by_class', hoặc 'invalid').
      - entities: Đối tượng chứa thông tin chiết xuất (tenSV, tenMonHoc, tenLop, semester, name, type).
      - text: Câu trả lời bằng tiếng Việt tự nhiên.
      - suggestions: Mảng gợi ý [{ type, label, action, link? }], chỉ trả về nếu intent là 'export_data' hoặc 'view_student_detail'.
      Đảm bảo JSON hợp lệ, sử dụng dấu nháy kép ("), không chứa bình luận hoặc text ngoài JSON. Nếu câu hỏi không hợp lệ, trả về intent 'invalid' và text phù hợp.
      Ví dụ định dạng:
      {
        "intent": "get_student_class",
        "entities": { "tenSV": "Nguyễn Văn An" },
        "text": "Nguyễn Văn An học lớp K22CNPM-A.",
        "suggestions": []
      }
      Ví dụ xuất:
      {
        "intent": "export_data",
        "entities": { "type": "students" },
        "text": "Đang chuẩn bị xuất danh sách sinh viên.",
        "suggestions": [
          { "type": "export", "label": "Xuất Excel", "action": "export_students" }
        ]
      }
      Ví dụ xem chi tiết:
      {
        "intent": "view_student_detail",
        "entities": { "tenSV": "Nguyễn Văn An" },
        "text": "Nguyễn Văn An, lớp K22CNPM-A. Xem chi tiết tại: /students/SV001",
        "suggestions": [
          { "type": "detail", "label": "Xem chi tiết", "action": "view_student", "link": "/students/SV001" }
        ]
      }
      Ví dụ liệt kê:
      {
        "intent": "list_students_by_name",
        "entities": { "name": "An" },
        "text": "Danh sách sinh viên tên 'An': Nguyễn Văn An (SV001, K22CNPM-A), Hoàng Văn Ân (SV025, K23KTPM-A).",
        "suggestions": []
      }
      Ví dụ điểm trung bình:
      {
        "intent": "get_course_average",
        "entities": { "tenMonHoc": "Cơ sở dữ liệu" },
        "text": "Điểm trung bình môn Cơ sở dữ liệu là 7.0.",
        "suggestions": []
      }
      Ví dụ sinh viên trong lớp:
      {
        "intent": "list_students_by_class",
        "entities": { "tenLop": "K22CNPM-A" },
        "text": "Sinh viên trong lớp K22CNPM-A: Nguyễn Văn An (SV001).",
        "suggestions": []
      }
      Câu hỏi: "${question}"
    `;
    let attempts = 0;
    const maxAttempts = 3;
    let result;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (geminiError) {
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error('Không thể kết nối với Gemini API sau nhiều lần thử: ' + geminiError.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    let response;
    const rawText = result.response.text();
    console.log('Gemini raw response:', rawText); // Debug phản hồi thô

    // Kiểm tra JSON hợp lệ
    try {
      const sanitizedText = rawText.trim().replace(/^```json\n|\n```$/g, '');
      if (!sanitizedText.startsWith('{') && !sanitizedText.startsWith('[')) {
        throw new Error('Phản hồi không bắt đầu bằng JSON hợp lệ');
      }
      response = JSON.parse(sanitizedText);
    } catch (parseError) {
      console.error('Parse error:', parseError.message, 'Raw text:', rawText);
      return res.status(500).json({ message: 'Lỗi phân tích phản hồi từ Gemini: Phản hồi không đúng định dạng JSON' });
    }

    let text = response.text || 'Không hiểu câu hỏi. Vui lòng hỏi lại!';
    let suggestions = response.suggestions || [];

    // Xử lý intent và truy vấn MongoDB
    if (response.intent === 'get_student_class') {
      const { tenSV } = response.entities;
      const student = await Student.findOne({ tenSV }).lean();
      if (student) {
        text = `${tenSV} học lớp ${student.lop}.`;
        suggestions = [];
      } else {
        text = `Không tìm thấy sinh viên ${tenSV}.`;
        suggestions = [];
      }
    } else if (response.intent === 'get_student_grade') {
      const { tenSV, tenMonHoc, semester } = response.entities;
      const student = await Student.findOne({ tenSV }).lean();
      if (!student) {
        text = `Không tìm thấy sinh viên ${tenSV}.`;
        suggestions = [];
      } else {
        const course = await Course.findOne({ tenMonHoc }).lean();
        if (!course) {
          text = `Không tìm thấy môn học ${tenMonHoc}.`;
          suggestions = [];
        } else {
          const query = { maSV: student.maSV, maMonHoc: course.maMonHoc };
          if (semester) query.semester = semester;
          const grade = await Grade.findOne(query).sort({ semester: -1 }).lean();
          if (grade && grade.finalGrade !== null) {
            text = `Điểm ${tenMonHoc} của ${tenSV} là ${grade.finalGrade} (HK${grade.semester}).`;
            suggestions = [];
          } else {
            text = `Không tìm thấy điểm ${tenMonHoc} của ${tenSV}${semester ? ` trong ${semester}` : ''}.`;
            suggestions = [];
          }
        }
      }
    } else if (response.intent === 'get_class_info') {
      const { tenLop } = response.entities;
      const classData = await Class.findOne({ tenLop }).lean();
      if (classData) {
        text = `Lớp ${tenLop} có ${classData.soSinhVien} sinh viên.`;
        suggestions = [];
      } else {
        text = `Không tìm thấy lớp ${tenLop}.`;
        suggestions = [];
      }
    } else if (response.intent === 'count_students_by_name') {
      const { name } = response.entities;
      const count = await Student.countDocuments({ tenSV: { $regex: name, $options: 'i' } });
      text = `Có ${count} sinh viên có tên chứa '${name}'.`;
      suggestions = [];
    } else if (response.intent === 'export_data') {
      const { type } = response.entities;
      if (type === 'students') {
        text = 'Đang chuẩn bị xuất danh sách sinh viên.';
        suggestions = [{ type: 'export', label: 'Xuất Excel', action: 'export_students' }];
      } else if (type === 'grades') {
        text = 'Đang chuẩn bị xuất bảng điểm.';
        suggestions = [{ type: 'export', label: 'Xuất Excel', action: 'export_grades' }];
      } else if (type === 'classes') {
        text = 'Đang chuẩn bị xuất danh sách lớp.';
        suggestions = [{ type: 'export', label: 'Xuất Excel', action: 'export_classes' }];
      } else {
        text = 'Không xác định được loại dữ liệu cần xuất.';
        suggestions = [];
      }
    } else if (response.intent === 'view_student_detail') {
      const { tenSV } = response.entities;
      const student = await Student.findOne({ tenSV }).lean();
      if (student) {
        text = `${tenSV}, lớp ${student.lop}. Xem chi tiết tại: /students/${student.maSV}`;
        suggestions = [
          { type: 'detail', label: 'Xem chi tiết', action: 'view_student', link: `/students/${student.maSV}` },
        ];
      } else {
        text = `Không tìm thấy sinh viên ${tenSV}.`;
        suggestions = [];
      }
    } else if (response.intent === 'list_students_by_name') {
      const { name } = response.entities;
      const students = await Student.find({ tenSV: { $regex: name, $options: 'i' } }).lean();
      if (students.length > 0) {
        text = `Danh sách sinh viên tên '${name}': ${students.map(s => `${s.tenSV} (${s.maSV}, ${s.lop})`).join(', ')}.`;
        suggestions = [];
      } else {
        text = `Không tìm thấy sinh viên nào có tên chứa '${name}'.`;
        suggestions = [];
      }
    } else if (response.intent === 'get_course_average') {
      const { tenMonHoc } = response.entities;
      const course = await Course.findOne({ tenMonHoc }).lean();
      if (!course) {
        text = `Không tìm thấy môn học ${tenMonHoc}.`;
        suggestions = [];
      } else {
        try {
          const response = await axios.get('http://localhost:5000/api/grades/average-by-course', {
            headers: { Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}` },
          });
          const average = response.data.find(item => item.maMonHoc === course.maMonHoc)?.average || 0;
          text = `Điểm trung bình môn ${tenMonHoc} là ${average.toFixed(1)}.`;
          suggestions = [];
        } catch (error) {
          text = `Không thể tính điểm trung bình môn ${tenMonHoc}.`;
          suggestions = [];
        }
      }
    } else if (response.intent === 'list_students_by_class') {
      const { tenLop } = response.entities;
      const classData = await Class.findOne({ tenLop }).lean();
      if (!classData) {
        text = `Không tìm thấy lớp ${tenLop}.`;
        suggestions = [];
      } else {
        const students = await Student.find({ lop: tenLop }).lean();
        if (students.length > 0) {
          text = `Sinh viên trong lớp ${tenLop}: ${students.map(s => `${s.tenSV} (${s.maSV})`).join(', ')}.`;
          suggestions = [];
        } else {
          text = `Lớp ${tenLop} không có sinh viên nào.`;
          suggestions = [];
        }
      }
    } else {
      text = 'Vui lòng hỏi bằng tiếng Việt về sinh viên, lớp, hoặc điểm số.';
      suggestions = [];
    }

    res.json({ text, suggestions });
  } catch (error) {
    console.error('Chatbot error:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Lỗi khi xử lý câu hỏi' });
  }
});

module.exports = router;
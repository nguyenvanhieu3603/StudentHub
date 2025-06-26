const express = require('express');
const { auth } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const Course = require('../models/Course');
const Class = require('../models/Class');
const router = express.Router();

// Khởi tạo Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

router.post('/', auth, async (req, res) => {
  try {
    const { question } = req.body;
    const { role, maSV } = req.user;

    // Kiểm tra câu hỏi
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ message: 'Câu hỏi không hợp lệ' });
    }

    // Prompt Gemini để phân tích nhiều intent
    const prompt = `
      Bạn là chatbot quản lý sinh viên, trả lời bằng tiếng Việt với phong cách thân thiện như ChatGPT, sử dụng emoji khi phù hợp. 
      Hỗ trợ xử lý tiếng Việt không dấu (VD: "Nguyen Van A" tương đương "Nguyễn Văn A").
      Phân tích câu hỏi có thể chứa nhiều yêu cầu hoặc lời chào (VD: "Chào", "Tìm thông tin sinh viên có mã sinh viên là SV001").
      Nếu là lời chào (VD: "Chào", "Hi", "Hello"), trả về intent 'greet' với text "Chào bạn! Bạn đang cần hỗ trợ gì hôm nay? 😊".
      Nếu câu hỏi là 'Tôi không biết hỏi gì', 'Bạn có thể làm được những việc gì?', hoặc tương tự, trả về intent 'help' với text liệt kê các nhóm chức năng chính kèm icon.
      Nếu câu hỏi thiếu thông tin (VD: "Tìm thông tin sinh viên"), yêu cầu bổ sung mà không đưa gợi ý.
      Trả về JSON hợp lệ với các trường:
      - intents: Mảng các intent, mỗi intent có:
        - intent: Loại câu hỏi ('greet', 'help', 'view_student_detail', hoặc 'invalid')
        - entities: Đối tượng chứa thông tin chiết xuất (tenSV, maSV, tenMonHoc, tenLop, semester, maLop, diemGK, diemCK, diemCC, khoa, khoaHoc, tinChi)
        - text: Câu trả lời cho intent này, dùng emoji cho 'view_student_detail' (📛, 🆔, 🏫, 🎓, 📊, ⭐) và 'help' (📍, ✏️, 📊, 👥, 📈, 🎓, ⭐)
      - text: Câu trả lời tổng hợp bằng tiếng Việt tự nhiên
      Đảm bảo JSON hợp lệ, sử dụng dấu nháy kép ("), không chứa bình luận. Nếu câu hỏi không hợp lệ, trả về intent 'invalid'.
      Ví dụ lời chào:
      {
        "intents": [
          {
            "intent": "greet",
            "entities": {},
            "text": "Chào bạn! Bạn đang cần hỗ trợ gì hôm nay? 😊"
          }
        ],
        "text": "Chào bạn! Bạn đang cần hỗ trợ gì hôm nay? 😊"
      }
      Ví dụ help:
      {
        "intents": [
          {
            "intent": "help",
            "entities": {},
            "text": "Tôi có thể hỗ trợ bạn với các chức năng sau:\n📍 Tìm kiếm theo mã sinh viên, tên, lớp...\n✏️ Cập nhật thông tin sinh viên\n📊 Xem trạng thái học tập, điểm, tín chỉ tích lũy\n👥 Xem danh sách lớp\n📈 Xem báo cáo - thống kê\n🎓 Thống kê sinh viên theo khoa, lớp, trạng thái học tập\n⭐ Xem điểm trung bình"
          }
        ],
        "text": "Tôi có thể hỗ trợ bạn với các chức năng sau:\n📍 Tìm kiếm theo mã sinh viên, tên, lớp...\n✏️ Cập nhật thông tin sinh viên\n📊 Xem trạng thái học tập, điểm, tín chỉ tích lũy\n👥 Xem danh sách lớp\n📈 Xem báo cáo - thống kê\n🎓 Thống kê sinh viên theo khoa, lớp, trạng thái học tập\n⭐ Xem điểm trung bình"
      }
      Ví dụ tìm thông tin sinh viên:
      {
        "intents": [
          {
            "intent": "view_student_detail",
            "entities": { "maSV": "SV001" },
            "text": "Vui lòng cung cấp thông tin từ cơ sở dữ liệu"
          }
        ],
        "text": "Vui lòng cung cấp thông tin từ cơ sở dữ liệu"
      }
      Ví dụ thiếu thông tin:
      {
        "intents": [
          {
            "intent": "view_student_detail",
            "entities": {},
            "text": "Vui lòng cung cấp mã sinh viên hoặc tên sinh viên."
          }
        ],
        "text": "Vui lòng cung cấp mã sinh viên hoặc tên sinh viên."
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

    try {
      const sanitizedText = rawText.trim().replace(/^```json\n|\n```$/g, '');
      if (!sanitizedText.startsWith('{')) {
        throw new Error('Phản hồi không bắt đầu bằng JSON hợp lệ');
      }
      response = JSON.parse(sanitizedText);
    } catch (parseError) {
      console.error('Parse error:', parseError.message, 'Raw text:', rawText);
      return res.status(500).json({ message: 'Lỗi phân tích phản hồi từ Gemini: Phản hồi không đúng định dạng JSON' });
    }

    // Xử lý intent view_student_detail
    if (response.intents && response.intents[0].intent === 'view_student_detail') {
      const { maSV } = response.intents[0].entities;
      if (!maSV) {
        response.text = 'Vui lòng cung cấp mã sinh viên.';
      } else {
        // Truy vấn thông tin sinh viên
        const student = await Student.findOne({ maSV }).lean();
        if (!student) {
          response.text = `Không tìm thấy sinh viên với mã ${maSV}.`;
        } else {
          // Truy vấn điểm số
          const grades = await Grade.find({ maSV }).lean();
          // Truy vấn tất cả môn học liên quan
          const courseIds = grades.map(grade => grade.maMonHoc);
          const courses = await Course.find({ maMonHoc: { $in: courseIds } }).lean();
          // Tính tổng tín chỉ
          const totalCredits = grades.reduce((sum, grade) => {
            const course = courses.find(c => c.maMonHoc === grade.maMonHoc);
            return sum + (course ? course.tinChi : 0);
          }, 0);
          // Tính GPA
          const gpa = grades.length
            ? (grades.reduce((sum, grade) => sum + (grade.finalGrade || 0), 0) / grades.length).toFixed(2)
            : 'Chưa có điểm';
          // Truy vấn thông tin lớp
          const classInfo = await Class.findOne({ tenLop: student.lop }).lean();
          const className = classInfo ? classInfo.tenLop : student.lop;
          response.text = `📛 Họ và tên: ${student.tenSV}\n🆔 Mã sinh viên: ${student.maSV}\n🏫 Lớp: ${className}\n🎓 Khoa: ${student.khoa}\n📊 Tổng số tín chỉ tích lũy: ${totalCredits}\n⭐ Điểm trung bình tích lũy (GPA): ${gpa}`;
        }
      }
    }

    res.json({ text: response.text });
  } catch (error) {
    console.error('Chatbot error:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Lỗi khi xử lý câu hỏi' });
  }
});

module.exports = router;
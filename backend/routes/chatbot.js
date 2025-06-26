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
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

router.post('/', auth, async (req, res) => {
  try {
    const { question } = req.body;
    const { role, maSV } = req.user;

    // Kiểm tra câu hỏi
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ message: 'Câu hỏi không hợp lệ' });
    }

    // Prompt Gemini để phân tích nhiều intent, thêm intent 'help'
    const prompt = `
      Bạn là chatbot quản lý sinh viên, trả lời bằng tiếng Việt với phong cách thân thiện như ChatGPT, sử dụng emoji khi phù hợp. 
      Hỗ trợ xử lý tiếng Việt không dấu (VD: "Nguyen Van A" tương đương "Nguyễn Văn A").
      Phân tích câu hỏi có thể chứa nhiều yêu cầu hoặc lời chào (VD: "Chào", "Tìm thông tin sinh viên có mã sinh viên là SV001").
      Nếu là lời chào (VD: "Chào", "Hi", "Hello"), trả về intent 'greet' với text "Chào bạn! Bạn đang cần hỗ trợ gì hôm nay? 😊".
      Nếu câu hỏi là 'Tôi không biết hỏi gì', 'Bạn có thể làm được những việc gì?', hoặc tương tự, trả về intent 'help' với text liệt kê các nhóm chức năng chính kèm icon.
      Nếu câu hỏi thiếu thông tin (VD: "Tìm thông tin sinh viên"), yêu cầu bổ sung mà không đưa gợi ý.
      Trả về JSON hợp lệ với các trường:
      - intents: Mảng các intent, mỗi intent có:
        - intent: Loại câu hỏi ('greet', 'help', 'get_student_class', 'get_student_grade', 'get_class_info', 'count_students_by_name', 'export_data', 'view_student_detail', 'list_students_by_name', 'get_course_average', 'list_students_by_class', 'add_student', 'add_class', 'add_grade', 'get_class_size', hoặc 'invalid')
        - entities: Đối tượng chứa thông tin chiết xuất (tenSV, maSV, tenMonHoc, tenLop, semester, maLop, diemGK, diemCK, diemCC, khoa, khoaHoc, tinChi)
        - text: Câu trả lời cho intent này, dùng emoji cho 'view_student_detail' (📛, 🆔, 🏫, 🎓, 📈, 📊, ⭐) và 'help' (📍, ✏️, 📊, 👥, 📈, 🎓, ⭐)
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
            "text": "📛 Họ và tên: Nguyễn Văn An\n🆔 Mã sinh viên: SV001\n🏫 Lớp: K22CNPM-A\n🎓 Khoa: Y dược\n📈 Trạng thái học tập: Đang học\n📊 Tổng số tín chỉ tích lũy: 21\n⭐ Điểm trung bình tích lũy (GPA): 7.81"
          }
        ],
        "text": "📛 Họ và tên: Nguyễn Văn An\n🆔 Mã sinh viên: SV001\n🏫 Lớp: K22CNPM-A\n🎓 Khoa: Y dược\n📈 Trạng thái học tập: Đang học\n📊 Tổng số tín chỉ tích lũy: 21\n⭐ Điểm trung bình tích lũy (GPA): 7.81"
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
    console.log('Gemini raw response:', rawText);

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

    let text = response.text || 'Không hiểu câu hỏi. Vui lòng hỏi lại!';

    res.json({ text });
  } catch (error) {
    console.error('Chatbot error:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Lỗi khi xử lý câu hỏi' });
  }
});

module.exports = router;
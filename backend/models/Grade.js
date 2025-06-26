const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  maSV: { type: String, required: true, match: /^[A-Z0-9]{5,10}$/, index: true },
  maMonHoc: { type: String, required: true, match: /^[A-Z0-9]{5,10}$/, index: true },
  maLop: { type: String, required: true, match: /^[A-Z0-9]{5,10}$/, index: true },
  semester: { type: String, required: true, match: /^HK[1-3]-20[0-9]{2}$/, index: true },
  diemA: { type: Number, min: 0, max: 10, default: null },
  diemB: { type: Number, min: 0, max: 10, default: null },
  diemC: { type: Number, min: 0, max: 10, default: null },
  status: { type: Number, enum: [0, 1], default: 0 },
  finalGrade: { type: Number, min: 0, max: 10, default: null },
  letterGrade: { type: String, enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', null], default: null },
  verbalGrade: { type: String, enum: ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Kém', null], default: null },
  gradePoint: { type: Number, min: 0, max: 4, default: null },
  createdAt: { type: Date, default: Date.now },
});

gradeSchema.index({ maSV: 1, maMonHoc: 1, maLop: 1, semester: 1 });
gradeSchema.index({ maSV: 1 });
gradeSchema.index({ maSV: 1, semester: 1 });

module.exports = mongoose.model('Grade', gradeSchema);
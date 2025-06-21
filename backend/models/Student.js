const mongoose = require('mongoose');

/**
 * Schema for storing student information
 * @typedef {Object} Student
 */
const studentSchema = new mongoose.Schema({
  /**
   * Student ID (e.g., SV001)
   * @type {String}
   */
  maSV: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z0-9]{5,10}$/,
    index: true,
  },
  /**
   * Student name
   * @type {String}
   */
  tenSV: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },
  /**
   * Class name (e.g., CNTT01)
   * @type {String}
   */
  lop: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 3,
    maxlength: 50,
    index: true,
  },
  /**
   * Faculty (e.g., CNTT)
   * @type {String}
   */
  khoa: {
    type: String,
    required: true,
    trim: true,
    enum: ['CNTT', 'Kinh tế', 'Cơ khí', 'Điện tử', 'Xây dựng', 'Hóa học', 'Sinh học', 'Luật', 'Ngoại ngữ', 'Y dược'],
  },
  /**
   * Course year (e.g., 2023)
   * @type {Number}
   */
  khoaHoc: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100,
  },
  /**
   * Path to student image
   * @type {String}
   */
  image: {
    type: String,
    required: true,
    match: /^\/images_sv\/[A-Za-z0-9_.-]+\.(jpg|jpeg|png)$/,
    default: '/images_sv/default_student.jpg',
  },
  /**
   * Creation timestamp
   * @type {Date}
   */
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for frequent queries
studentSchema.index({ maSV: 1, lop: 1 });

module.exports = mongoose.model('Student', studentSchema);
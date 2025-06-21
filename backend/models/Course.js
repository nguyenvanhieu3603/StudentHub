const mongoose = require('mongoose');

/**
 * Schema for storing course information
 * @typedef {Object} Course
 */
const courseSchema = new mongoose.Schema({
  /**
   * Course ID (e.g., MH001)
   * @type {String}
   */
  maMonHoc: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z0-9]{5,10}$/,
    index: true,
  },
  /**
   * Course name
   * @type {String}
   */
  tenMonHoc: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  },
  /**
   * Number of credits (1-10)
   * @type {Number}
   */
  tinChi: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
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
courseSchema.index({ maMonHoc: 1 });

module.exports = mongoose.model('Course', courseSchema);
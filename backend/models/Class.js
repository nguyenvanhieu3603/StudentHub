const mongoose = require('mongoose');

/**
 * Schema for storing class information
 * @typedef {Object} Class
 */
const classSchema = new mongoose.Schema({
  /**
   * Class ID (e.g., LOP001)
   * @type {String}
   */
  maLop: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z0-9]{5,10}$/,
    index: true,
  },
  /**
   * Class name (e.g., CNTT01)
   * @type {String}
   */
  tenLop: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 3,
    maxlength: 50,
    index: true,
  },
  /**
   * Number of students in the class
   * @type {Number}
   */
  soSinhVien: {
    type: Number,
    default: 0,
    min: 0,
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
classSchema.index({ tenLop: 1 });

module.exports = mongoose.model('Class', classSchema);
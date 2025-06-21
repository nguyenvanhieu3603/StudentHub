const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Schema for storing user information
 * @typedef {Object} User
 */
const userSchema = new mongoose.Schema({
  /**
   * User's full name
   * @type {String}
   */
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },
  /**
   * User account (email or ID, e.g., lecturer001 or user@domain.com)
   * @type {String}
   */
  account: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$|^[A-Z0-9]{5,10}$/,
    index: true,
  },
  /**
   * Hashed password
   * @type {String}
   */
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  /**
   * Phone number
   * @type {String}
   */
  phone: {
    type: String,
    match: /^[0-9]{10,15}$/,
    default: null,
  },
  /**
   * Address
   * @type {String}
   */
  address: {
    type: String,
    trim: true,
    maxlength: 200,
    default: null,
  },
  /**
   * Gender (0: Unknown, 1: Male, 2: Female)
   * @type {Number}
   */
  sex: {
    type: Number,
    enum: [0, 1, 2],
    default: 0,
  },
  /**
   * Date of birth
   * @type {Date}
   */
  dateBirth: {
    type: Date,
    default: null,
  },
  /**
   * User role (admin or lecturer)
   * @type {String}
   */
  role: {
    type: String,
    enum: ['admin', 'lecturer'],
    default: 'lecturer',
  },
  /**
   * Account active status
   * @type {Boolean}
   */
  isActive: {
    type: Boolean,
    default: true,
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

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

/**
 * Compare input password with stored hash
 * @param {string} password - Plaintext password
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (err) {
    return false;
  }
};

// Index for frequent queries
userSchema.index({ account: 1 });

module.exports = mongoose.model('User', userSchema);
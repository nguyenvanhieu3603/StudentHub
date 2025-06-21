const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/file-upload');

/**
 * Upload a single image
 * @route POST /api/images/upload
 * @body {file} file - Image file
 * @body {string} maSV - Student ID (optional)
 */
router.post('/upload', auth, uploadSingle, async (req, res) => {
  try {
    res.json({ status: true, url: req.uploadedFile });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

/**
 * Upload multiple images
 * @route POST /api/images/uploads
 * @body {file[]} files - Array of image files
 * @body {string} maSV - Student ID (optional)
 */
router.post('/uploads', auth, (req, res, next) => uploadMultiple(req, res, next, 10), async (req, res) => {
  try {
    res.json({ status: true, urls: req.uploadedFiles });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

module.exports = router;
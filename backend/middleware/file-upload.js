const { processUploadedFile } = require('../utils/file-utils');
const path = require('path');

/**
 * Middleware to handle single file upload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function uploadSingle(req, res, next) {
  try {
    if (!req.files || !req.files.image) {
      req.uploadedFile = null;
      return next();
    }

    const uploadDir = path.join(__dirname, '../images_sv');
    const prefix = req.body.maSV || 'unknown';
    const imagePath = await processUploadedFile(req.files.image, prefix, uploadDir);

    req.uploadedFile = imagePath;
    next();
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
}

/**
 * Middleware to handle multiple file uploads
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @param {number} maxCount - Maximum number of files
 */
async function uploadMultiple(req, res, next, maxCount = 10) {
  try {
    if (!req.files || !req.files.images) {
      return res.status(400).json({ status: false, message: 'No files uploaded' });
    }

    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    if (files.length > maxCount) {
      throw new Error(`Maximum ${maxCount} files allowed`);
    }

    const uploadDir = path.join(__dirname, '../images_sv');
    const prefix = req.body.maSV || 'unknown';
    const imagePaths = await Promise.all(
      files.map(file => processUploadedFile(file, prefix, uploadDir))
    );

    req.uploadedFiles = imagePaths;
    next();
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
}

module.exports = { uploadSingle, uploadMultiple };
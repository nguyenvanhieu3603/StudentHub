const path = require('path');
const fs = require('fs').promises;

/**
 * Validate and process uploaded file
 * @param {Object} file - File object from express-fileupload
 * @param {string} prefix - Prefix for filename (e.g., student ID)
 * @param {string} uploadDir - Directory to save the file
 * @returns {Promise<string>} - Relative path to saved file
 * @throws {Error} - If file is invalid or processing fails
 */
async function processUploadedFile(file, prefix, uploadDir) {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  const validMimes = ['image/jpeg', 'image/png'];
  if (!validMimes.includes(file.mimetype)) {
    throw new Error('Only JPEG/PNG images are allowed');
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB');
  }

  // Create upload directory if not exists
  await fs.mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name).toLowerCase();
  const filename = `${prefix}_${Date.now()}${ext}`;
  const filePath = path.join(uploadDir, filename);

  // Save file
  await file.mv(filePath);
  return `/images_sv/${filename}`;
}

module.exports = { processUploadedFile };
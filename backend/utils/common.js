const Student = require('../models/Student');
const Class = require('../models/Class');
const xlsx = require('xlsx');

/**
 * Update soSinhVien for a given class
 * @param {string} tenLop - Class name
 * @returns {Promise<void>}
 */
async function updateSoSinhVien(tenLop) {
  const classData = await Class.findOne({ tenLop });
  if (classData) {
    const soSinhVien = await Student.countDocuments({ lop: tenLop });
    classData.soSinhVien = soSinhVien;
    await classData.save();
  }
}

/**
 * Process Excel file for import
 * @param {Buffer} fileData - Excel file buffer
 * @param {Object} headerMap - Mapping of expected headers
 * @param {Function} validateRow - Function to validate and transform row data
 * @returns {Object} { validItems, errors }
 */
async function processExcelFile(fileData, headerMap, validateRow) {
  const workbook = xlsx.read(fileData, { type: 'buffer', cellText: true, cellDates: false, raw: false });
  if (!workbook.SheetNames.length) {
    throw new Error('Excel file has no sheets');
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });

  if (!data.length) {
    throw new Error('Excel file is empty');
  }

  const headers = data[0].map(h => h ? h.toString().trim().toLowerCase() : '');
  const mappedHeaders = Object.keys(headerMap).reduce((acc, key) => {
    acc[key] = headers.findIndex(h => headerMap[key].includes(h));
    return acc;
  }, {});

  if (Object.values(mappedHeaders).includes(-1)) {
    throw new Error('Invalid or missing column headers');
  }

  const errors = [];
  const validItems = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;
    try {
      const item = await validateRow(row, mappedHeaders, rowNumber);
      if (item) validItems.push(item); // Chỉ thêm nếu item không null
    } catch (err) {
      errors.push(err.message);
    }
  }

  return { validItems, errors };
}

module.exports = { updateSoSinhVien, processExcelFile };
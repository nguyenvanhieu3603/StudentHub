const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');
const { processExcelFile, exportToExcel } = require('../utils/common');
const path = require('path');
const XLSX = require('xlsx');

router.post('/getlist', auth, async (req, res) => {
  const { maMonHoc, tenMonHoc, tinChi, sort, page = 1, limit = 10 } = req.body;
  try {
    const query = {};
    if (maMonHoc) query.maMonHoc = { $regex: maMonHoc, $options: 'i' };
    if (tenMonHoc) query.tenMonHoc = { $regex: tenMonHoc, $options: 'i' };
    if (tinChi) query.tinChi = parseInt(tinChi);

    const sortObj = sort ? { [sort.split(':')[0]]: parseInt(sort.split(':')[1] || 1) } : { maMonHoc: 1 };

    const courses = await Course.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit) || 1000) // Cho phép limit lớn
      .lean();
    const total = await Course.countDocuments(query);

    res.json({ courses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to fetch courses', error: err.message });
  }
});

router.post('/export', auth, async (req, res) => {
  const { maMonHoc, tenMonHoc, tinChi } = req.body;
  try {
    const query = {};
    if (maMonHoc) query.maMonHoc = { $regex: maMonHoc, $options: 'i' };
    if (tenMonHoc) query.tenMonHoc = { $regex: tenMonHoc, $options: 'i' };
    if (tinChi) query.tinChi = parseInt(tinChi);

    const courses = await Course.find(query).lean();

    const columns = [
      { key: 'maMonHoc', header: 'Mã Môn Học', width: 15 },
      { key: 'tenMonHoc', header: 'Tên Môn Học', width: 30 },
      { key: 'tinChi', header: 'Tín Chỉ', width: 10 },
    ];

    // Tạo worksheet data
    const worksheetData = courses.map(item =>
      columns.reduce((acc, col) => {
        acc[col.header] =
          item[col.key] !== undefined && item[col.key] !== null
            ? item[col.key].toString()
            : '';
        return acc;
      }, {})
    );

    // Tạo workbook và worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Đặt độ rộng cột
    const colWidths = columns.map(col => ({ wch: col.width || 10 }));
    worksheet['!cols'] = colWidths;

    // Tạo file Excel
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Gửi file trực tiếp
    res.setHeader('Content-Disposition', 'attachment; filename=courses_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(wbout);
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Failed to export courses', error: err.message });
  }
});

router.post('/insert', auth, async (req, res) => {
  const { maMonHoc, tenMonHoc, tinChi } = req.body;
  try {
    if (!maMonHoc || !tenMonHoc || !tinChi) {
      throw new Error('Missing required fields');
    }
    if (tinChi < 1 || tinChi > 10) {
      throw new Error('Credits must be between 1 and 10');
    }

    const existingCourse = await Course.findOne({ maMonHoc });
    if (existingCourse) {
      throw new Error('Course ID already exists');
    }

    const course = new Course({ maMonHoc, tenMonHoc, tinChi });
    const session = await Course.startSession();
    try {
      await session.withTransaction(async () => {
        await course.save({ session });
      });
      res.json({ status: true, message: 'Course added successfully' });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.post('/import', auth, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      throw new Error('No file uploaded');
    }

    const headerMap = {
      maMonHoc: ['mamonhoc', 'mã môn', 'mã môn học'],
      tenMonHoc: ['tenmonhoc', 'tên môn', 'tên môn học'],
      tinChi: ['tinchi', 'tín chỉ'],
    };

    const validateRow = async (row, headers, rowNumber) => {
      const maMonHoc = row[headers.maMonHoc]?.toString().trim() || '';
      const tenMonHoc = row[headers.tenMonHoc]?.toString().trim() || '';
      const tinChi = Number(row[headers.tinChi]) || 0;

      if (!maMonHoc || !tenMonHoc || !tinChi || isNaN(tinChi)) {
        throw new Error('Missing or invalid fields');
      }
      if (!/^[A-Z0-9]{5,10}$/.test(maMonHoc)) {
        throw new Error(`Invalid course ID format: ${maMonHoc}`);
      }
      if (tinChi < 1 || tinChi > 10) {
        throw new Error(`Invalid credits: ${tinChi}`);
      }

      const existingCourse = await Course.findOne({ maMonHoc });
      if (existingCourse) {
        throw new Error(`Course ID ${maMonHoc} already exists`);
      }

      return { maMonHoc, tenMonHoc, tinChi };
    };

    const { validItems: validCourses, errors } = await processExcelFile(req.files.file.data, headerMap, validateRow, { batchSize: 500 });

    if (!validCourses.length && !errors.length) {
      throw new Error('No valid courses found in Excel file');
    }

    if (!validCourses.length) {
      return res.status(400).json({ status: false, message: 'No valid courses to import', errors });
    }

    const session = await Course.startSession();
    try {
      await session.withTransaction(async () => {
        await Course.insertMany(validCourses, { session });
      });
      res.json({ status: true, message: `Imported ${validCourses.length} courses successfully` });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message, errors: [] });
  }
});

router.post('/update', auth, async (req, res) => {
  const { maMonHoc, tenMonHoc, tinChi } = req.body;
  try {
    if (!maMonHoc) {
      throw new Error('Course ID is required');
    }
    if (tinChi !== undefined && (tinChi < 1 || tinChi > 10)) {
      throw new Error('Credits must be between 1 and 10');
    }

    const course = await Course.findOne({ maMonHoc });
    if (!course) {
      throw new Error('Course not found');
    }

    course.tenMonHoc = tenMonHoc || course.tenMonHoc;
    course.tinChi = tinChi || course.tinChi;

    const session = await Course.startSession();
    try {
      await session.withTransaction(async () => {
        await course.save({ session });
      });
      res.json({ status: true, course });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.post('/delete', auth, async (req, res) => {
  const { maMonHoc } = req.body;
  try {
    if (!maMonHoc) {
      throw new Error('Course ID is required');
    }
    const course = await Course.findOne({ maMonHoc });
    if (!course) {
      throw new Error('Course not found');
    }

    const session = await Course.startSession();
    try {
      await session.withTransaction(async () => {
        await Course.deleteOne({ maMonHoc }, { session });
      });
      res.json({ status: true, message: 'Course deleted successfully' });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.post('/delete-many', auth, async (req, res) => {
  const { maMonHocs } = req.body;
  try {
    if (!Array.isArray(maMonHocs) || !maMonHocs.length) {
      throw new Error('Array of course IDs is required');
    }

    const courses = await Course.find({ maMonHoc: { $in: maMonHocs } });
    if (!courses.length) {
      throw new Error('No courses found');
    }

    const session = await Course.startSession();
    try {
      await session.withTransaction(async () => {
        await Course.deleteMany({ maMonHoc: { $in: maMonHocs } }, { session });
      });
      res.json({ status: true, message: `Deleted ${courses.length} courses successfully` });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

module.exports = router;
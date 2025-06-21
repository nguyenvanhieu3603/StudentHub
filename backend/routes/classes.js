const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Student = require('../models/Student');
const Grade = require('../models/Grade');
const { auth } = require('../middleware/auth');
const { updateSoSinhVien, processExcelFile, exportToExcel } = require('../utils/common');
const path = require('path');
const XLSX = require('xlsx');

router.post('/getlist', auth, async (req, res) => {
  const { maLop, tenLop, soSinhVien, sort, page = 1, limit = 10 } = req.body;
  try {
    const query = {};
    if (maLop) query.maLop = { $regex: maLop, $options: 'i' };
    if (tenLop) query.tenLop = { $regex: tenLop, $options: 'i' };
    if (soSinhVien) query.soSinhVien = parseInt(soSinhVien);

    const sortObj = sort ? { [sort.split(':')[0]]: parseInt(sort.split(':')[1] || 1) } : { maLop: 1 };

    const classes = await Class.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Class.countDocuments(query);

    const classesWithCount = await Promise.all(
      classes.map(async (cls) => ({
        ...cls,
        tenLop: cls.tenLop.toUpperCase(),
        soSinhVien: await Student.countDocuments({ lop: cls.tenLop }),
      }))
    );

    res.json({ classes: classesWithCount, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to fetch classes', error: err.message });
  }
});

router.post('/export', auth, async (req, res) => {
  const { maLop, tenLop, soSinhVien } = req.body;
  try {
    const query = {};
    if (maLop) query.maLop = { $regex: maLop, $options: 'i' };
    if (tenLop) query.tenLop = { $regex: tenLop, $options: 'i' };
    if (soSinhVien) query.soSinhVien = parseInt(soSinhVien);

    const classes = await Class.find(query).lean();
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => ({
        ...cls,
        tenLop: cls.tenLop.toUpperCase(),
        soSinhVien: await Student.countDocuments({ lop: cls.tenLop }),
      }))
    );

    const columns = [
      { key: 'maLop', header: 'Mã Lớp', width: 15 },
      { key: 'tenLop', header: 'Tên Lớp', width: 20 },
      { key: 'soSinhVien', header: 'Số Sinh Viên', width: 15 },
    ];

    // Tạo worksheet data
    const worksheetData = classesWithCount.map(item =>
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
    res.setHeader('Content-Disposition', 'attachment; filename=classes_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(wbout);
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to export classes', error: error.message });
  }
});

router.post('/insert', auth, async (req, res) => {
  const { maLop, tenLop } = req.body;
  try {
    if (!maLop || !tenLop) {
      throw new Error('Missing required fields');
    }
    if (!/^[A-Z0-9]{5,10}$/.test(maLop)) {
      throw new Error('Invalid class ID format');
    }

    const existingClass = await Class.findOne({ maLop });
    if (existingClass) {
      throw new Error('Class ID already exists');
    }

    const classData = new Class({ maLop, tenLop: tenLop.toUpperCase() });
    const session = await Class.startSession();
    try {
      await session.withTransaction(async () => {
        await classData.save({ session });
      });
      res.json({ status: true, message: 'Class added successfully' });
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
      maLop: ['malop', 'mã lớp'],
      tenLop: ['tenlop', 'tên lớp'],
    };

    const validateRow = async (row, headers, rowNumber) => {
      const maLop = row[headers.maLop.toString().trim() || ''];
      const tenLop = row[headers.tenLop]?.toString().trim() || '';

      if (!maLop || !tenLop) {
        throw new Error('Missing required fields');
      }
      if (!/^[A-Z0-9]{5,10}$/.test(maLop)) {
        throw new Error(`Invalid class ID format: ${maLop}`);
      }

      const existingClass = await Class.findOne({ maLop });
      if (existingClass) {
        throw new Error(`Class ID ${maLop} already exists`);
      }

      return { maLop, tenLop: tenLop.toUpperCase() };
    };

    const { validItems: validClasses, errors } = await processExcelFile(req.files.file.data, headerMap, validateRow, { batchSize: 500 });

    if (!validClasses.length && !errors.length) {
      throw new Error('No valid classes found in Excel file');
    }

    if (!validClasses.length) {
      return res.status(400).json({ status: false, message: 'No valid classes to import', errors });
    }

    const session = await Class.startSession();
    try {
      await session.withTransaction(async () => {
        await Class.insertMany(validClasses, { session });
      });
      res.json({ status: true, message: `Imported ${validClasses.length} classes successfully` });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message, errors: [] });
  }
});

router.post('/update', auth, async (req, res) => {
  const { maLop, tenLop } = req.body;
  try {
    if (!maLop) {
      throw new Error('Class ID is required');
    }

    const classData = await Class.findOne({ maLop });
    if (!classData) {
      throw new Error('Class not found');
    }

    const oldTenLop = classData.tenLop;
    classData.tenLop = tenLop ? tenLop.toUpperCase() : classData.tenLop;

    const session = await Class.startSession();
    try {
      await session.withTransaction(async () => {
        await classData.save({ session });
        if (tenLop && tenLop.toUpperCase() !== oldTenLop) {
          await Student.updateMany(
            { lop: oldTenLop },
            { $set: { lop: tenLop.toUpperCase() } },
            { session }
          );
        }
      });
      res.json({ status: true, classData });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.post('/update-so-sinh-vien', auth, async (req, res) => {
  const { tenLop } = req.body;
  try {
    if (!tenLop) {
      throw new Error('Class name is required');
    }

    await updateSoSinhVien(tenLop.toUpperCase());
    res.json({ status: true, message: 'Updated soSinhVien successfully' });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.post('/delete', auth, async (req, res) => {
  const { maLop } = req.body;
  try {
    if (!maLop) {
      throw new Error('Class ID is required');
    }

    const classData = await Class.findOne({ maLop });
    if (!classData) {
      throw new Error('Class not found');
    }

    const session = await Class.startSession();
    try {
      await session.withTransaction(async () => {
        await Class.deleteOne({ maLop }, { session });
        await Grade.deleteMany({ maLop }, { session });
      });
      res.json({ status: true, message: 'Class deleted successfully' });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.post('/delete-many', auth, async (req, res) => {
  const { maLops } = req.body;
  try {
    if (!Array.isArray(maLops) || !maLops.length) {
      throw new Error('Array of class IDs is required');
    }

    const classes = await Class.find({ maLop: { $in: maLops } });
    if (!classes.length) {
      throw new Error('No classes found');
    }

    const session = await Class.startSession();
    try {
      await session.withTransaction(async () => {
        await Class.deleteMany({ maLop: { $in: maLops } }, { session });
        await Grade.deleteMany({ maLop: { $in: maLops } }, { session });
      });
      res.json({ status: true, message: `Deleted ${classes.length} classes successfully` });
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.post('/loaddatalop', auth, async (req, res) => {
  try {
    const classes = await Class.find().lean();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to fetch classes', error: err.message });
  }
});

module.exports = router;
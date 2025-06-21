const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/file-upload');
const path = require('path');
const fs = require('fs').promises;
const XLSX = require('xlsx');
const { updateSoSinhVien, processExcelFile } = require('../utils/common');

router.get('/getlist', auth, async (req, res) => {
  const { maSV, tenSV, lop, khoa, khoaHoc, sort, page = 1, limit = 10 } = req.query;
  try {
    const query = {};
    if (maSV) query.maSV = { $regex: maSV, $options: 'i' };
    if (tenSV) query.tenSV = { $regex: tenSV, $options: 'i' };
    if (lop) query.lop = { $regex: lop, $options: 'i' };
    if (khoa) {
      try {
        const khoaArray = JSON.parse(khoa);
        if (Array.isArray(khoaArray) && khoaArray.length > 0) {
          query.khoa = { $in: khoaArray };
        } else if (typeof khoa === 'string' && khoa) {
          query.khoa = khoa;
        }
      } catch {
        if (typeof khoa === 'string' && khoa) {
          query.khoa = khoa;
        }
      }
    }
    if (khoaHoc) query.khoaHoc = parseInt(khoaHoc);

    const sortObj = sort ? { [sort.split(':')[0]]: parseInt(sort.split(':')[1] || 1) } : { maSV: 1 };

    const students = await Student.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Student.countDocuments(query);

    res.json({ students, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to fetch students', error: error.message });
  }
});

router.get('/export', auth, async (req, res) => {
  const { maSV, tenSV, lop, khoa, khoaHoc } = req.query;
  try {
    const query = {};
    if (maSV) query.maSV = { $regex: maSV, $options: 'i' };
    if (tenSV) query.tenSV = { $regex: tenSV, $options: 'i' };
    if (lop) query.lop = { $regex: lop, $options: 'i' };
    if (khoa) {
      try {
        const khoaArray = JSON.parse(khoa);
        if (Array.isArray(khoaArray) && khoaArray.length > 0) {
          query.khoa = { $in: khoaArray };
        } else if (typeof khoa === 'string' && khoa) {
          query.khoa = khoa;
        }
      } catch {
        if (typeof khoa === 'string' && khoa) {
          query.khoa = khoa;
        }
      }
    }
    if (khoaHoc) query.khoaHoc = parseInt(khoaHoc);

    const students = await Student.find(query).lean();

    const columns = [
      { key: 'maSV', header: 'Mã SV', width: 15 },
      { key: 'tenSV', header: 'Tên SV', width: 25 },
      { key: 'lop', header: 'Lớp', width: 15 },
      { key: 'khoa', header: 'Khoa', width: 20 },
      { key: 'khoaHoc', header: 'Khóa Học', width: 12 },
    ];

    // Tạo worksheet data
    const worksheetData = students.map(item =>
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
    res.setHeader('Content-Disposition', 'attachment; filename=students_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(wbout);
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to export students', error: error.message });
  }
});

router.post('/insert', [auth, uploadSingle], async (req, res) => {
  const { maSV, tenSV, lop, khoa, khoaHoc } = req.body;
  let imagePath = req.uploadedFile || '/images_sv/default_student.jpg';

  try {
    if (!maSV || !tenSV || !lop || !khoa || !khoaHoc) {
      throw new Error('Missing required fields');
    }

    const existingStudent = await Student.findOne({ maSV });
    if (existingStudent) {
      if (imagePath !== '/images_sv/default_student.jpg') {
        await fs.unlink(path.join(__dirname, '../', imagePath)).catch(error => console.error('Failed to delete file:', error));
      }
      throw new Error('Student ID already exists');
    }

    const classData = await Class.findOne({ tenLop: lop });
    if (!classData) {
      if (imagePath !== '/images_sv/default_student.jpg') {
        await fs.unlink(path.join(__dirname, '../', imagePath)).catch(error => console.error('Failed to delete file:', error));
      }
      throw new Error('Class not found');
    }

    const student = new Student({
      maSV,
      tenSV,
      lop,
      khoa,
      khoaHoc: parseInt(khoaHoc),
      image: imagePath,
    });

    await student.save();
    await updateSoSinhVien(lop);

    res.json({ status: true, message: 'Student added successfully' });
  } catch (error) {
    if (imagePath !== '/images_sv/default_student.jpg') {
      await fs.unlink(path.join(__dirname, '../', imagePath)).catch(error => console.error('Failed to delete file:', error));
    }
    res.status(400).json({ status: false, message: error.message });
  }
});

router.post('/import', auth, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      throw new Error('No file uploaded');
    }

    const validKhoa = ['CNTT', 'Kinh tế', 'Cơ khí', 'Điện tử', 'Xây dựng', 'Hóa học', 'Sinh học', 'Luật', 'Ngoại ngữ', 'Y dược'];
    const headerMap = {
      maSV: ['masv', 'mã sv', 'mã sinh viên'],
      tenSV: ['tensv', 'tên sv', 'tên sinh viên'],
      lop: ['lop', 'lớp'],
      khoa: ['khoa'],
      khoaHoc: ['khoahoc', 'khóa học', 'khóa'],
    };

    const validateRow = async (row, headers) => {
      const maSV = row[headers.maSV]?.toString().trim() || '';
      const tenSV = row[headers.tenSV]?.toString().trim() || '';
      const lop = row[headers.lop]?.toString().trim() || '';
      const khoa = row[headers.khoa]?.toString().trim() || '';
      const khoaHoc = row[headers.khoaHoc]?.toString().trim() || '';

      if (!maSV || !tenSV || !lop || !khoa || !khoaHoc) {
        throw new Error('Missing required fields');
      }
      if (!/^[A-Z0-9]{5,10}$/.test(maSV)) {
        throw new Error(`Invalid student ID format: ${maSV}`);
      }

      const [existingStudent, classData] = await Promise.all([
        Student.findOne({ maSV }),
        Class.findOne({ tenLop: lop }),
      ]);

      if (existingStudent) {
        throw new Error(`Student ID ${maSV} already exists`);
      }
      if (!classData) {
        throw new Error(`Class ${lop} not found`);
      }
      if (!validKhoa.includes(khoa)) {
        throw new Error(`Invalid khoa ${khoa}`);
      }
      if (!Number.isInteger(Number(khoaHoc))) {
        throw new Error(`Invalid khoaHoc ${khoaHoc}`);
      }

      return {
        maSV,
        tenSV,
        lop,
        khoa,
        khoaHoc: parseInt(khoaHoc),
        image: '/images_sv/default_student.jpg',
      };
    };

    const { validItems: validStudents, errors } = await processExcelFile(req.files.file.data, headerMap, validateRow, { batchSize: 500 });

    if (!validStudents.length && !errors.length) {
      throw new Error('No valid students found in Excel file');
    }

    if (!validStudents.length) {
      return res.status(400).json({ status: false, message: 'No valid students to import', errors });
    }

    await Student.insertMany(validStudents);
    const lopSet = new Set(validStudents.map(s => s.lop));
    await Promise.all([...lopSet].map(tenLop => updateSoSinhVien(tenLop)));

    res.json({ status: true, message: `Imported ${validStudents.length} students successfully` });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message, errors: [] });
  }
});

router.post('/update', [auth, uploadSingle], async (req, res) => {
  const { maSV, tenSV, lop, khoa, khoaHoc } = req.body;
  try {
    const student = await Student.findOne({ maSV });
    if (!student) {
      if (req.uploadedFile) {
        await fs.unlink(path.join(__dirname, '../', req.uploadedFile)).catch(error => console.error('Failed to delete file:', error));
      }
      throw new Error('Student not found');
    }

    const oldLop = student.lop;
    const oldImage = student.image;

    student.tenSV = tenSV || student.tenSV;
    student.lop = lop || student.lop;
    student.khoa = khoa || student.khoa;
    student.khoaHoc = khoaHoc ? parseInt(khoaHoc) : student.khoaHoc;
    if (req.uploadedFile) {
      student.image = req.uploadedFile;
      if (oldImage && oldImage !== '/images_sv/default_student.jpg') {
        await fs.unlink(path.join(__dirname, '../', oldImage)).catch(error => console.error('Failed to delete old image:', error));
      }
    }

    await student.save();
    if (lop && lop !== oldLop) {
      await Promise.all([
        updateSoSinhVien(oldLop),
        updateSoSinhVien(lop),
      ]);
    }

    res.json({ status: true, message: 'Student updated successfully' });
  } catch (error) {
    if (req.uploadedFile) {
      await fs.unlink(path.join(__dirname, '../', req.uploadedFile)).catch(error => console.error('Failed to delete file:', error));
    }
    res.status(400).json({ status: false, message: error.message });
  }
});

router.post('/delete', auth, async (req, res) => {
  const { maSV } = req.body;
  try {
    const student = await Student.findOne({ maSV });
    if (!student) {
      throw new Error('Student not found');
    }
    const lop = student.lop;
    const imagePath = student.image;

    await student.deleteOne();
    await updateSoSinhVien(lop);
    if (imagePath && imagePath !== '/images_sv/default_student.jpg') {
      await fs.unlink(path.join(__dirname, '../', imagePath)).catch(error => console.error('Failed to delete file:', error));
    }

    res.json({ status: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

router.post('/delete-many', auth, async (req, res) => {
  const { maSVs } = req.body;
  try {
    if (!Array.isArray(maSVs) || !maSVs.length) {
      throw new Error('Array of student IDs is required');
    }

    const students = await Student.find({ maSV: { $in: maSVs } });
    if (!students.length) {
      throw new Error('No students found');
    }

    const lopSet = new Set(students.map(s => s.lop));
    const imagePaths = students
      .map(s => s.image)
      .filter(img => img && img !== '/images_sv/default_student.jpg');

    await Student.deleteMany({ maSV: { $in: maSVs } });
    await Promise.all([...lopSet].map(tenLop => updateSoSinhVien(tenLop)));
    await Promise.all(
      imagePaths.map(img =>
        fs.unlink(path.join(__dirname, '../', img)).catch(error => console.error('Failed to delete file:', error))
      )
    );

    res.json({ status: true, message: `Deleted ${students.length} students successfully` });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

module.exports = router;
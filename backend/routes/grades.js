const express = require('express');
const router = express.Router();
const Grade = require('../models/Grade');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Course = require('../models/Course');
const { auth, restrictToAdmin } = require('../middleware/auth');
const { updateSoSinhVien, processExcelFile } = require('../utils/common');
const XLSX = require('xlsx');

const calculateGrade = (diemA, diemB, diemC, status) => {
  if (status === 1) return { finalGrade: 0, letterGrade: 'F' };
  if (diemA == null || diemB == null || diemC == null) return { finalGrade: null, letterGrade: null };
  const finalGrade = Number((diemA * 0.6 + diemB * 0.3 + diemC * 0.1).toFixed(1)); // Ép kiểu sang số
  const gradeNum = finalGrade;
  return {
    finalGrade,
    letterGrade: gradeNum >= 8.5 ? 'A' : gradeNum >= 7.0 ? 'B' : gradeNum >= 5.5 ? 'C' : gradeNum >= 4.0 ? 'D' : 'F',
  };
};

router.get('/average-by-course', auth, async (req, res) => {
  try {
    const grades = await Grade.aggregate([
      { $match: { status: 0, finalGrade: { $ne: null } } },
      { $group: { _id: '$maMonHoc', avgGrade: { $avg: '$finalGrade' } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: 'maMonHoc', as: 'course' } },
      { $unwind: '$course' },
      { $project: { maMonHoc: '$_id', tenMonHoc: '$course.tenMonHoc', avgGrade: { $round: ['$avgGrade', 2] } } },
      { $sort: { avgGrade: -1 } },
      { $limit: 5 },
    ]);
    res.json(grades);
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

router.post('/getlist', auth, async (req, res) => {
  const { maLop, maMonHoc, maSV, tenSV, semester, page = 1, limit = 10 } = req.body;
  try {
    const query = {};
    if (maLop) query.maLop = { $in: maLop.split(',') };
    if (maMonHoc) query.maMonHoc = { $in: maMonHoc.split(',') };
    if (maSV) query.maSV = { $regex: maSV, $options: 'i' };
    if (semester) query.semester = { $regex: semester, $options: 'i' };

    const grades = await Grade.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'students',
          let: { maSV: '$maSV' },
          pipeline: [{ $match: { $expr: { $eq: ['$maSV', '$$maSV'] }, ...(tenSV ? { tenSV: { $regex: tenSV, $options: 'i' } } : {}) } }],
          as: 'student',
        },
      },
      { $unwind: '$student' },
      { $lookup: { from: 'classes', localField: 'maLop', foreignField: 'maLop', as: 'class' } },
      { $unwind: '$class' },
      { $lookup: { from: 'courses', localField: 'maMonHoc', foreignField: 'maMonHoc', as: 'course' } },
      { $unwind: '$course' },
      {
        $project: {
          id: '$_id',
          maSV: 1,
          tenSV: '$student.tenSV',
          tenLop: '$class.tenLop',
          maMonHoc: 1,
          tenMonHoc: '$course.tenMonHoc',
          semester: 1,
          diemA: 1,
          diemB: 1,
          diemC: 1,
          status: 1,
          finalGrade: 1,
          letterGrade: 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
    ]);

    const total = await Grade.aggregate([
      { $match: query },
      { $lookup: { from: 'students', let: { maSV: '$maSV' }, pipeline: [{ $match: { $expr: { $eq: ['$maSV', '$$maSV'] }, ...(tenSV ? { tenSV: { $regex: tenSV, $options: 'i' } } : {}) } }], as: 'student' } },
      { $unwind: '$student' },
      { $count: 'total' },
    ]);

    res.json({ grades, total: total.length ? total[0].total : 0, page: Number(page), limit: Number(limit) });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

router.post('/export', auth, async (req, res) => {
  const { maLop, maMonHoc, maSV, tenSV, semester, page = 1, limit = 1000 } = req.body;
  try {
    const query = {};
    if (maLop) query.maLop = { $in: Array.isArray(maLop) ? maLop : maLop.split(',') };
    if (maMonHoc) query.maMonHoc = { $in: Array.isArray(maLop) ? maLop : maMonHoc.split(',') };
    if (maSV) query.maSV = { $regex: maSV, $options: 'i' };
    if (semester) query.semester = { $regex: semester, $options: 'i' };

    const grades = await Grade.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'students',
          let: { maSV: '$maSV' },
          pipeline: [{ $match: { $expr: { $eq: ['$maSV', '$$maSV'] }, ...(tenSV ? { tenSV: { $regex: tenSV, $options: 'i' } } : {}) } }],
          as: 'student',
        },
      },
      { $unwind: '$student' },
      { $lookup: { from: 'classes', localField: 'maLop', foreignField: 'maLop', as: 'class' } },
      { $unwind: '$class' },
      { $lookup: { from: 'courses', localField: 'maMonHoc', foreignField: 'maMonHoc', as: 'course' } },
      { $unwind: '$course' },
      {
        $project: {
          maSV: 1,
          tenSV: '$student.tenSV',
          tenLop: '$class.tenLop',
          maMonHoc: 1,
          tenMonHoc: '$course.tenMonHoc',
          semester: 1,
          diemA: 1,
          diemB: 1,
          diemC: 1,
          finalGrade: 1,
          letterGrade: 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
    ]);

    const columns = [
      { key: 'maSV', header: 'Mã SV', width: 15 },
      { key: 'tenSV', header: 'Tên SV', width: 25 },
      { key: 'tenLop', header: 'Lớp', width: 15 },
      { key: 'tenMonHoc', header: 'Môn học', width: 30 },
      { key: 'semester', header: 'Học kỳ', width: 12 },
      { key: 'diemA', header: 'Điểm A', width: 10 },
      { key: 'diemB', header: 'Điểm B', width: 10 },
      { key: 'diemC', header: 'Điểm C', width: 10 },
      { key: 'finalGrade', header: 'Điểm TB', width: 10 },
      { key: 'letterGrade', header: 'Xếp Loại', width: 10 },
    ];

    const worksheetData = grades.map(item =>
      columns.reduce((acc, col) => {
        acc[col.header] = item[col.key] != null ? item[col.key].toString() : '';
        return acc;
      }, {})
    );

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    worksheet['!cols'] = columns.map(col => ({ wch: col.width || 10 }));

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', 'attachment; filename=grades_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(wbout);
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

router.post('/getlistbymasv', auth, async (req, res) => {
  const { maSV, maMonHoc, semester, page = 1, limit = 10 } = req.body;
  try {
    if (!maSV) throw new Error('Student ID is required');
    const query = { maSV };
    if (maMonHoc) query.maMonHoc = maMonHoc;
    if (semester) query.semester = { $regex: semester, $options: 'i' };

    const grades = await Grade.aggregate([
      { $match: query },
      { $lookup: { from: 'courses', localField: 'maMonHoc', foreignField: 'maMonHoc', as: 'course' } },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          maSV: 1,
          maLop: 1,
          maMonHoc: 1,
          tenMonHoc: '$course.tenMonHoc',
          semester: 1,
          diemA: 1,
          diemB: 1,
          diemC: 1,
          status: 1,
          finalGrade: { $ifNull: ['$finalGrade', null] },
          letterGrade: { $ifNull: ['$letterGrade', null] },
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
    ]);

    const total = await Grade.countDocuments(query);
    res.json({
      grades: grades.map(grade => ({ ...grade, ...calculateGrade(grade.diemA, grade.diemB, grade.diemC, grade.status) })),
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (e) {
    res.status(400).json({ status: false, message: e.message });
  }
});

router.post('/insert', [auth, restrictToAdmin], async (req, res) => {
  const { maSV, maLop, maMonHoc, diemA, diemB, diemC, semester } = req.body;
  try {
    if (!maSV || !maLop || !maMonHoc || !semester) throw new Error('Missing required fields');
    if (!/^HK[1-3]-20[0-9]{2}$/.test(semester)) throw new Error('Invalid semester format');
    if ([diemA, diemB, diemC].some(d => d != null && (d < 0 || d > 10))) throw new Error('Grades must be between 0 and 10');

    const [student, classData, course, existingGrade] = await Promise.all([
      Student.findOne({ maSV }),
      Class.findOne({ maLop }),
      Course.findOne({ maMonHoc }),
      Grade.findOne({ maSV, maLop, maMonHoc, semester }),
    ]);

    if (!student) throw new Error('Student not found');
    if (!classData) throw new Error('Class not found');
    if (!course) throw new Error('Course not found');
    if (existingGrade) throw new Error('Grade already exists for this semester');

    const { finalGrade, letterGrade } = calculateGrade(diemA, diemB, diemC, 0);
    const grade = new Grade({ maSV, maLop, maMonHoc, semester, diemA, diemB, diemC, finalGrade, letterGrade, status: 0 });

    const session = await Grade.startSession();
    try {
      await session.withTransaction(async () => {
        await grade.save({ session });
        await updateSoSinhVien(classData.tenLop);
      });
      res.json({ status: true, message: 'Grade added successfully' });
    } finally {
      session.endSession();
    }
  } catch (e) {
    res.status(400).json({ status: false, message: e.message });
  }
});

router.post('/import', [auth, restrictToAdmin], async (req, res) => {
  try {
    if (!req.files || !req.files.file) throw new Error('No file uploaded');

    const headerMap = {
      maSV: ['masv', 'mã sv', 'mã sinh viên'],
      maLop: ['malop', 'mã lớp'],
      maMonHoc: ['mamonhoc', 'mã môn học'],
      semester: ['semester', 'học kỳ'],
      diemA: ['diema', 'điểm a'],
      diemB: ['diemb', 'điểm b'],
      diemC: ['diemc', 'điểm c'],
    };

    const validateRow = async (row, headers) => {
      const maSV = row[headers.maSV]?.toString().trim() || '';
      const maLop = row[headers.maLop]?.toString().trim() || '';
      const maMonHoc = row[headers.maMonHoc]?.toString().trim() || '';
      const semester = row[headers.semester]?.toString().trim() || '';
      const diemA = Number(row[headers.diemA]);
      const diemB = Number(row[headers.diemB]);
      const diemC = Number(row[headers.diemC]);

      if (!maSV || !maLop || !maMonHoc || !semester) throw new Error('Missing required fields');
      if (!/^HK[1-3]-20[0-9]{2}$/.test(semester)) throw new Error(`Invalid semester: ${semester}`);
      if (!/^[A-Z0-9]{5,10}$/.test(maSV)) throw new Error(`Invalid student ID: ${maSV}`);
      if (!/^[A-Z0-9]{5,10}$/.test(maLop)) throw new Error(`Invalid class ID: ${maLop}`);
      if (!/^[A-Z0-9]{5,10}$/.test(maMonHoc)) throw new Error(`Invalid course ID: ${maMonHoc}`);
      if ([diemA, diemB, diemC].some(d => d != null && (isNaN(d) || d < 0 || d > 10))) throw new Error('Grades must be between 0 and 10');

      const [student, classData, course, existingGrade] = await Promise.all([
        Student.findOne({ maSV }),
        Class.findOne({ maLop }),
        Course.findOne({ maMonHoc }),
        Grade.findOne({ maSV, maLop, maMonHoc, semester }),
      ]);

      if (!student) throw new Error(`Student ${maSV} not found`);
      if (!classData) throw new Error(`Class ${maLop} not found`);
      if (!course) throw new Error(`Course ${maMonHoc} not found`);
      if (existingGrade) throw new Error(`Grade for ${maSV} in ${maLop}, ${maMonHoc}, ${semester} exists`);

      const { finalGrade, letterGrade } = calculateGrade(diemA, diemB, diemC, 0);
      return { maSV, maLop, maMonHoc, semester, diemA: diemA || null, diemB: diemB || null, diemC: diemC || null, finalGrade, letterGrade, status: 0 };
    };

    const { validItems: validGrades, errors } = await processExcelFile(req.files.file.data, headerMap, validateRow, { batchSize: 1000 });

    if (!validGrades.length && !errors.length) throw new Error('No valid grades found');
    if (!validGrades.length) return res.status(400).json({ status: false, message: 'No valid grades to import', errors });

    const session = await Grade.startSession();
    try {
      await session.withTransaction(async () => {
        await Grade.insertMany(validGrades, { session });
        const lopSet = new Set(validGrades.map(g => g.maLop));
        await Promise.all([...lopSet].map(async maLop => {
          const classData = await Class.findOne({ maLop });
          if (classData) await updateSoSinhVien(classData.tenLop);
        }));
      });
      res.json({ status: true, message: `Imported ${validGrades.length} grades successfully` });
    } finally {
      session.endSession();
    }
  } catch (e) {
    res.status(400).json({ status: false, message: e.message, errors: [] });
  }
});

router.post('/update', [auth, restrictToAdmin], async (req, res) => {
  const gradesToUpdate = req.body;
  try {
    if (!Array.isArray(gradesToUpdate)) throw new Error('Grades must be an array');

    const session = await Grade.startSession();
    try {
      await session.withTransaction(async () => {
        for (const gradeData of gradesToUpdate) {
          const { id, diemA, diemB, diemC } = gradeData;
          const grade = await Grade.findById(id).session(session);
          if (!grade) throw new Error(`Grade ${id} not found`);
          if ([diemA, diemB, diemC].some(d => d != null && (d < 0 || d > 10))) throw new Error(`Invalid grade for ${grade.maSV}`);
          grade.diemA = diemA != null ? diemA : grade.diemA;
          grade.diemB = diemB != null ? diemB : grade.diemB;
          grade.diemC = diemC != null ? diemC : grade.diemC;
          const { finalGrade, letterGrade } = calculateGrade(grade.diemA, grade.diemB, grade.diemC, grade.status);
          grade.finalGrade = finalGrade;
          grade.letterGrade = letterGrade;
          await grade.save({ session });
        }
      });
      res.json({ status: true, message: 'Grades updated successfully' });
    } finally {
      session.endSession();
    }
  } catch (e) {
    res.status(400).json({ status: false, message: e.message });
  }
});

router.post('/delete', [auth, restrictToAdmin], async (req, res) => {
  const { id } = req.body;
  try {
    const grade = await Grade.findById(id);
    if (!grade) throw new Error('Grade not found');
    const classData = await Class.findOne({ maLop: grade.maLop });

    const session = await Grade.startSession();
    try {
      await session.withTransaction(async () => {
        await Grade.deleteOne({ _id: id }, { session });
        if (classData) await updateSoSinhVien(classData.tenLop);
      });
      res.json({ status: true, message: 'Grade deleted successfully' });
    } finally {
      session.endSession();
    }
  } catch (e) {
    res.status(400).json({ status: false, message: e.message });
  }
});

router.post('/gpa-by-semester', auth, async (req, res) => {
  const { maSV, semester } = req.body;
  try {
    if (!maSV) throw new Error('Student ID is required');
    const query = { maSV, status: 0, finalGrade: { $ne: null } };
    if (semester) query.semester = { $regex: semester, $options: 'i' };

    const grades = await Grade.find(query);
    if (!grades.length) return res.json({ gpa: 0, totalCredits: 0 });

    const courseIds = grades.map(g => g.maMonHoc);
    const courses = await Course.find({ maMonHoc: { $in: courseIds } });

    const totalCredits = courses.reduce((sum, c) => sum + c.tinChi, 0);
    const weightedSum = grades.reduce((sum, g) => {
      const course = courses.find(c => c.maMonHoc === g.maMonHoc);
      return sum + (Number(g.finalGrade) * (course ? course.tinChi : 0)); // Ép kiểu finalGrade sang số
    }, 0);

    const gpa = totalCredits ? (weightedSum / totalCredits).toFixed(2) : 0;
    res.json({ gpa, totalCredits });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

module.exports = router;
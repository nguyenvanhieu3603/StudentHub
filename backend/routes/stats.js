const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Course = require('../models/Course');
const Class = require('../models/Class');
const User = require('../models/User');
const Grade = require('../models/Grade');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [totalStudents, totalCourses, totalClasses, totalLecturers] = await Promise.all([
      Student.countDocuments(),
      Course.countDocuments(),
      Class.countDocuments(),
      User.countDocuments({ role: 'lecturer' }),
    ]);

    res.json({ totalStudents, totalCourses, totalClasses, totalLecturers });
  } catch (err) {
    console.error('Error in stats:', err);
    res.status(500).json({ status: false, message: 'Failed to fetch stats', error: err.message });
  }
});

router.get('/students-by-khoa', auth, async (req, res) => {
  try {
    const data = await Student.aggregate([
      { $group: { _id: '$khoa', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { khoa: '$_id', count: 1, _id: 0 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error('Error in students-by-khoa:', err);
    res.status(500).json({ status: false, message: 'Failed to fetch students by khoa', error: err.message });
  }
});

router.get('/top-students-by-gpa', auth, async (req, res) => {
  try {
    const data = await Grade.aggregate([
      { $match: { status: 0, finalGrade: { $ne: null } } },
      { $lookup: { from: 'courses', localField: 'maMonHoc', foreignField: 'maMonHoc', as: 'course' } },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$maSV',
          totalWeightedGrade: { $sum: { $multiply: ['$finalGrade', { $ifNull: ['$course.tinChi', 0] }] } },
          totalCredits: { $sum: { $ifNull: ['$course.tinChi', 0] } },
        },
      },
      {
        $match: { totalCredits: { $gt: 0 } }, // Loại bỏ sinh viên có totalCredits = 0
      },
      {
        $project: {
          maSV: '$_id',
          gpa: { $round: [{ $divide: ['$totalWeightedGrade', '$totalCredits'] }, 2] },
          _id: 0,
        },
      },
      { $lookup: { from: 'students', localField: 'maSV', foreignField: 'maSV', as: 'student' } },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          maSV: 1,
          tenSV: { $ifNull: ['$student.tenSV', 'Unknown'] },
          gpa: 1,
        },
      },
      { $sort: { gpa: -1 } },
      { $limit: 5 },
    ]);

    res.json(data);
  } catch (err) {
    console.error('Error in top-students-by-gpa:', err);
    res.status(500).json({ status: false, message: 'Failed to fetch top students by GPA', error: err.message });
  }
});

module.exports = router;
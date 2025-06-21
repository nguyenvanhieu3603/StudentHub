const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Course = require('../models/Course');
const Class = require('../models/Class');
const User = require('../models/User');
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
    res.status(500).json({ status: false, message: 'Failed to fetch stats', error: err.message });
  }
});

router.get('/students-by-khoa', auth, async (req, res) => {
  try {
    const data = await Student.aggregate([
      { $group: { _id: '$khoa', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, // Sắp xếp theo số lượng giảm dần
      { $limit: 5 }, // Giới hạn top 5
      { $project: { khoa: '$_id', count: 1, _id: 0 } },
    ]);

    res.json(data); // Trả về mảng [{ khoa, count }, ...]
  } catch (err) {
    res.status(500).json({ status: false, message: 'Failed to fetch students by khoa', error: err.message });
  }
});

module.exports = router;
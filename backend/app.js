require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const courseRoutes = require('./routes/courses');
const classRoutes = require('./routes/classes');
const gradeRoutes = require('./routes/grades');
const imageRoutes = require('./routes/images');
const statsRoutes = require('./routes/stats');
const chatbotRoutes = require('./routes/chatbot');

const app = express();

// Cấu hình multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/images_sv', express.static(path.join(__dirname, 'images_sv')));
app.use('/exports', express.static(path.join(__dirname, 'Exports')));

// Áp dụng multer cho route import grades
app.use('/api/grades', (req, res, next) => {
  if (req.path === '/import') {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
});
app.use('/api/grades', gradeRoutes);

app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use((error, req, res, next) => {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  res.status(status).json({
    status: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Connected to MongoDB');
    }
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Server running on port ${PORT}`);
  }
});

module.exports = { app };
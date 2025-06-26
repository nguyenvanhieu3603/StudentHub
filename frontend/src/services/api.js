import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (!(config.data instanceof FormData)) config.headers['Content-Type'] = 'application/json';
  return config;
});

export const login = data => api.post('/users/login', data);
export const register = data => api.post('/users/register', data);
export const getProfile = () => api.get('/users/profile');
export const updateUser = data => api.post('/users/update', data);
export const deleteUser = data => api.post('/users/delete', data);
export const getUsers = data => api.post('/users/getlist', data);
export const importUsers = data => api.post('/users/import', data);
export const exportUsers = data => api.post('/users/export', data);

export const getStudents = params => api.get('/students/getlist', { params });
export const insertStudent = data => api.post('/students/insert', data);
export const updateStudent = data => api.post('/students/update', data);
export const deleteStudent = data => api.post('/students/delete', data);
export const deleteManyStudents = data => api.post('/students/delete-many', data);
export const exportStudents = params => api.get('/students/export', { params });
export const importStudents = data => api.post('/students/import', data);

export const getCourses = data => api.post('/courses/getlist', data);
export const insertCourse = data => api.post('/courses/insert', data);
export const updateCourse = data => api.post('/courses/update', data);
export const deleteCourse = data => api.post('/courses/delete', data);
export const deleteManyCourses = data => api.post('/courses/delete-many', data);
export const exportCourses = data => api.post('/courses/export', data);
export const importCourses = data => api.post('/courses/import', data);

export const getClasses = data => api.post('/classes/getlist', data);
export const insertClass = data => api.post('/classes/insert', data);
export const updateClass = data => api.post('/classes/update', data);
export const deleteClass = data => api.post('/classes/delete', data);
export const deleteManyClasses = data => api.post('/classes/delete-many', data);
export const exportClasses = data => api.post('/classes/export', data);
export const importClasses = data => api.post('/classes/import', data);
export const loadDataLop = () => api.post('/classes/loaddatalop');

export const getGrades = data => api.post('/grades/getlist', data);
export const getGradesByMaSV = data => api.post('/grades/getlistbymasv', data);
export const insertGrade = data => api.post('/grades/insert', data);
export const updateGrade = data => api.post('/grades/update', data);
export const deleteGrade = data => api.post('/grades/delete', data);
export const exportGrades = data => api.post('/grades/export', data);
export const importGrades = data => api.post('/grades/import', data);
export const getAverageByCourse = () => api.get('/grades/average-by-course');
export const getGPABySemester = data => api.post('/grades/gpa-by-semester', data);
export const getTopStudentsByGPA = () => api.get('/stats/top-students-by-gpa');

export const uploadImage = data => api.post('/images/upload', data);
export const uploadImages = data => api.post('/images/uploads', data);

export const getStats = () => api.get('/stats');
export const getStudentsByKhoa = params => api.get('/stats/students-by-khoa', { params });

export const askChatbot = data => api.post('/chatbot', data);
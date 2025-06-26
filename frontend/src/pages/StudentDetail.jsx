import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getStudents, getGradesByMaSV, getCourses, getGPABySemester } from '../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function StudentDetail() {
  const { maSV } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [filter, setFilter] = useState({ maMonHoc: '', semester: '', chartSemester: '' });
  const [gpa, setGpa] = useState({ gpa: 0, totalCredits: 0 });

  // Định nghĩa danh sách học kỳ từ HK1-2021 đến HK3-2025
  const semesters = Array.from({ length: 5 }, (_, i) => 2021 + i).flatMap(year =>
    ['HK1', 'HK2', 'HK3'].map(sem => `${sem}-${year}`)
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsResponse, studentResponse, gradesResponse, gpaResponse] = await Promise.all([
          getCourses({ page: 1, limit: 1000 }), // Đảm bảo lấy tất cả môn học
          getStudents({ maSV }),
          getGradesByMaSV({ maSV, maMonHoc: '', semester: '', page: 1, limit: 1000 }),
          getGPABySemester({ maSV }) // Lấy GPA từ backend
        ]);

        // Kiểm tra và gán danh sách môn học
        const courses = subjectsResponse.data.courses || [];
        if (!courses.length) {
          console.error('No courses found in response');
        }
        setSubjects(courses);

        // Gán thông tin sinh viên
        if (studentResponse.data.students.length > 0) {
          setStudent(studentResponse.data.students[0]);
        } else {
          toast.error('Không tìm thấy sinh viên');
          navigate('/students');
          return;
        }

        // Xử lý điểm
        const allGrades = gradesResponse.data.grades || [];
        console.log('allGrades:', allGrades); // Debug

        // Lọc các điểm hợp lệ
        const validGrades = allGrades.filter(g => g.status === 0 && g.gradePoint != null);
        setGrades(validGrades.filter(g =>
          (!filter.maMonHoc || g.maMonHoc === filter.maMonHoc) &&
          (!filter.semester || g.semester === filter.semester)
        ));
        setPagination(prev => ({ ...prev, total: validGrades.length }));

        // Gán GPA và tổng tín chỉ từ API getGPABySemester
        setGpa({
          gpa: parseFloat(gpaResponse.data.gpa || 0).toFixed(2),
          totalCredits: gpaResponse.data.totalCredits || 0
        });

      } catch (error) {
        console.error('Fetch error:', error);
        toast.error('Không thể tải dữ liệu');
        navigate('/students');
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchData();
  }, [maSV, filter.maMonHoc, filter.semester, navigate]);

  // Tính GPA theo học kỳ cho biểu đồ
  const calculateGpaBySemester = () => {
    const filteredSemesters = filter.chartSemester ? [filter.chartSemester] : semesters;

    const gpaBySemester = filteredSemesters.map(semester => {
      const semesterGrades = grades.filter(
        g => g.semester === semester && g.status === 0 && g.gradePoint != null
      );
      if (semesterGrades.length === 0) return 0;

      const totalCredits = semesterGrades.reduce((sum, grade) => {
        const subject = subjects.find(s => s.maMonHoc === grade.maMonHoc);
        return sum + (subject ? subject.tinChi : 0);
      }, 0);

      const weightedSum = semesterGrades.reduce((sum, grade) => {
        const subject = subjects.find(s => s.maMonHoc === grade.maMonHoc);
        return sum + (grade.gradePoint * (subject ? subject.tinChi : 0));
      }, 0);

      return totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 0;
    });
    return gpaBySemester;
  };

  const handlePageChange = newPage => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleLimitChange = e => {
    setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }));
  };

  const chartData = {
    labels: filter.chartSemester ? [filter.chartSemester] : semesters,
    datasets: [{
      label: 'GPA',
      data: calculateGpaBySemester(),
      backgroundColor: '#4f46e5',
      borderColor: '#373737',
      borderWidth: 1
    }]
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        max: 4,
        title: { display: true, text: 'GPA (Hệ 4)' }
      },
      x: { title: { display: true, text: 'Học kỳ' } }
    },
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: filter.chartSemester ? `GPA Học Kỳ ${filter.chartSemester}` : 'GPA Theo Học Kỳ'
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter'] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Chi Tiết Sinh Viên</h1>
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-lg transform transition-all hover:shadow-xl mb-8">
        <img
          src={student.image ? `/images_sv${student.image.split('/images_sv')[1]}` : '/images_sv/default_student.jpg'}
          alt={student.tenSV}
          className="w-32 h-32 object-cover rounded-full mx-auto mb-6"
          onError={e => (e.target.src = '/images_sv/default_student.jpg')}
        />
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Mã SV:</span>
            <span className="text-gray-700">{student.maSV}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Tên SV:</span>
            <span className="text-gray-700">{student.tenSV}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Lớp:</span>
            <span className="text-gray-700">{student.lop}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Khoa:</span>
            <span className="text-gray-700">{student.khoa}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Khóa:</span>
            <span className="text-gray-700">{student.khoaHoc}</span>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => navigate(`/students?edit=${student.maSV}`)}
            className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400"
          >
            Chỉnh sửa
          </button>
          <button
            onClick={() => navigate('/students')}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 focus:ring-2 focus:ring-gray-200"
          >
            Quay lại
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-md max-w-4xl transform transition-all hover:shadow-xl mb-8">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6">Biểu Đồ GPA</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo học kỳ (biểu đồ)</label>
          <select
            value={filter.chartSemester}
            onChange={e => setFilter({ ...filter, chartSemester: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Tất cả học kỳ</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-md max-w-4xl transform transition-all hover:shadow-xl">
        <h2 className="text-2xl font-bold text-indigo-600 mb-6">Danh Sách Điểm</h2>
        <p className="text-gray-700 mb-4">
          GPA trung bình {filter.semester ? `học kỳ ${filter.semester}` : 'toàn bộ'}: <strong>{gpa.gpa}</strong> (Tổng tín chỉ: {gpa.totalCredits || 0})
        </p>
        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo môn học</label>
            <select
              value={filter.maMonHoc}
              onChange={e => setFilter({ ...filter, maMonHoc: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map(subject => (
                <option key={subject.maMonHoc} value={subject.maMonHoc}>{subject.tenMonHoc}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo học kỳ</label>
            <select
              value={filter.semester}
              onChange={e => setFilter({ ...filter, semester: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
        </div>
        {loadingGrades ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-400"></div>
          </div>
        ) : grades.length === 0 ? (
          <p className="text-center text-gray-500">Không có điểm nào</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-indigo-400 text-white">
                    <th className="p-3 text-left text-sm font-semibold">Mã Môn Học</th>
                    <th className="p-3 text-left text-sm font-semibold">Tên Môn Học</th>
                    <th className="p-3 text-left text-sm font-semibold">Học kỳ</th>
                    <th className="p-3 text-left text-sm font-semibold">Điểm A</th>
                    <th className="p-3 text-left text-sm font-semibold">Điểm B</th>
                    <th className="p-3 text-left text-sm font-semibold">Điểm C</th>
                    <th className="p-3 text-left text-sm font-semibold">Điểm TK</th>
                    <th className="p-3 text-left text-sm font-semibold">Xếp Loại</th>
                    <th className="p-3 text-left text-sm font-semibold">Xếp Loại Bằng Lời</th>
                    <th className="p-3 text-left text-sm font-semibold">Điểm Hệ 4</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit).map(grade => {
                    const subject = subjects.find(s => s.maMonHoc === grade.maMonHoc) || {};
                    return (
                      <tr key={`${grade.maSV}-${grade.maMonHoc}-${grade.semester}`} className="border-b hover:bg-indigo-50">
                        <td className="p-3">{grade.maMonHoc}</td>
                        <td className="p-3">{subject.tenMonHoc ?? '-'}</td>
                        <td className="p-3">{grade.semester ?? '-'}</td>
                        <td className="p-3">{grade.diemA ?? '-'}</td>
                        <td className="p-3">{grade.diemB ?? '-'}</td>
                        <td className="p-3">{grade.diemC ?? '-'}</td>
                        <td className="p-3">{grade.finalGrade ?? '-'}</td>
                        <td className="p-3">{grade.letterGrade ?? '-'}</td>
                        <td className="p-3">{grade.verbalGrade ?? '-'}</td>
                        <td className="p-3">{grade.gradePoint ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Hiển thị:</span>
                <select
                  value={pagination.limit}
                  onChange={handleLimitChange}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-gray-600">bản ghi/trang</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Trang {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === Math.ceil(pagination.total / pagination.limit)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
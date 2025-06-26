import { useState, useEffect } from 'react';
import { getStats, getStudentsByKhoa, getTopStudentsByGPA } from '../services/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalClasses: 0,
    totalLecturers: 0,
  });
  const [studentsByKhoa, setStudentsByKhoa] = useState([]);
  const [topStudentsByGPA, setTopStudentsByGPA] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, khoaResponse, gpaResponse] = await Promise.all([
          getStats(),
          getStudentsByKhoa(),
          getTopStudentsByGPA(),
        ]);
        setStats(statsResponse.data);
        setStudentsByKhoa(Array.isArray(khoaResponse.data) ? khoaResponse.data : []);
        setTopStudentsByGPA(Array.isArray(gpaResponse.data) ? gpaResponse.data : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setStudentsByKhoa([]);
        setTopStudentsByGPA([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Dữ liệu biểu đồ cột (Top 5 khoa theo số sinh viên)
  const barDataKhoa = {
    labels: studentsByKhoa.length > 0 ? studentsByKhoa.map(item => item.khoa) : ['Chưa có dữ liệu'],
    datasets: [
      {
        label: 'Số sinh viên',
        data: studentsByKhoa.length > 0 ? studentsByKhoa.map(item => item.count) : [0],
        backgroundColor: 'rgba(129, 140, 248, 0.5)',
        borderColor: 'rgba(129, 140, 248, 1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(99, 102, 241, 0.7)',
      },
    ],
  };

  // Dữ liệu biểu đồ cột (Top 5 sinh viên theo GPA)
  const barDataStudents = {
    labels: topStudentsByGPA.length > 0 ? topStudentsByGPA.map(item => item.tenSV) : ['Chưa có dữ liệu'],
    datasets: [
      {
        label: 'GPA',
        data: topStudentsByGPA.length > 0 ? topStudentsByGPA.map(item => item.gpa) : [0],
        backgroundColor: 'rgba(244, 114, 182, 0.5)',
        borderColor: 'rgba(244, 114, 182, 1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(219, 39, 119, 0.7)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { family: 'Inter', size: 14 } },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'Inter' },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Số lượng',
          font: { family: 'Inter', size: 14 },
        },
      },
    },
  };

  const gpaChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        title: {
          display: true,
          text: 'GPA',
          font: { family: 'Inter', size: 14 },
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Tổng Quan</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-400"></div>
        </div>
      ) : (
        <>
          {/* Thống kê */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Sinh viên', value: stats.totalStudents, icon: '🎓', color: 'bg-indigo-400' },
              { label: 'Môn học', value: stats.totalCourses, icon: '📚', color: 'bg-purple-400' },
              { label: 'Lớp học', value: stats.totalClasses, icon: '🏫', color: 'bg-blue-400' },
              { label: 'Giảng viên', value: stats.totalLecturers, icon: '👨‍🏫', color: 'bg-pink-400' },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-md flex items-center gap-4 transform transition-all hover:scale-105 hover:shadow-lg"
              >
                <div className={`${item.color} p-3 rounded-full`}>
                  <span className="text-white text-2xl">{item.icon}</span>
                </div>
                <div>
                  <h2 className="text-gray-500 text-lg font-medium">{item.label}</h2>
                  <p className="text-indigo-600 text-3xl font-bold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Biểu đồ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold text-indigo-600 mb-4">Top 5 khoa theo số sinh viên</h2>
              <div className="h-80">
                {studentsByKhoa.length > 0 ? (
                  <Bar data={barDataKhoa} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Chưa có dữ liệu sinh viên theo khoa
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold text-indigo-600 mb-4">Top 5 sinh viên theo GPA</h2>
              <div className="h-80">
                {topStudentsByGPA.length > 0 ? (
                  <Bar data={barDataStudents} options={gpaChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Chưa có dữ liệu GPA sinh viên
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
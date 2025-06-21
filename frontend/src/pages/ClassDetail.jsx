import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getClasses, getStudents, updateStudent, deleteStudent } from '../services/api';
import { Edit, Trash2 } from 'lucide-react';

export default function ClassDetail() {
  const { maLop } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [editStudent, setEditStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const editImageInputRef = useRef(null);
  const [classes, setClasses] = useState([]);
  const khoaList = ['CNTT', 'Kinh tế', 'Cơ khí', 'Điện tử', 'Xây dựng', 'Hóa học', 'Sinh học', 'Luật', 'Ngoại ngữ', 'Y dược'];

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await getClasses({});
        setClasses(response.data.classes);
      } catch (error) {
        toast.error(`Không thể tải danh sách lớp: ${error.response?.data?.message || error.message}`);
      }
    };
    fetchClasses();
    fetchClass();
  }, [maLop]);

  const fetchClass = async () => {
    try {
      const response = await getClasses({ maLop });
      if (response.data.classes.length > 0) {
        const cls = response.data.classes[0];
        setClassData(cls);
        fetchStudents(cls.tenLop);
      } else {
        toast.error('Không tìm thấy lớp học');
        navigate('/classes');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải thông tin lớp học');
      navigate('/classes');
    }
  };

  const fetchStudents = async (tenLop) => {
    try {
      const response = await getStudents({ lop: tenLop });
      setStudents(response.data.students);
    } catch (error) {
      toast.error(`Không thể tải danh sách sinh viên: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    const khoaHocNum = Number(editStudent.khoaHoc);
    if (isNaN(khoaHocNum) || !Number.isInteger(khoaHocNum) || khoaHocNum < 2000 || khoaHocNum > 2100) {
      toast.error('Khóa học phải là số nguyên từ 2000 đến 2100');
      return;
    }
    if (editStudent.image && !['image/jpeg', 'image/png'].includes(editStudent.image.type)) {
      toast.error('Vui lòng chọn file ảnh JPG hoặc PNG');
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(editStudent).forEach(([key, value]) => {
        if (value !== null) {
          formData.append(key, value);
        }
      });
      await updateStudent(formData);
      toast.success('Cập nhật sinh viên thành công');
      setShowEditModal(false);
      setEditStudent(null);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
      fetchStudents(classData.tenLop);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật sinh viên thất bại');
    }
  };

  const handleDelete = async (maSV) => {
    if (window.confirm('Bạn có chắc muốn xóa sinh viên này?')) {
      try {
        await deleteStudent({ maSV });
        toast.success('Xóa sinh viên thành công');
        fetchStudents(classData.tenLop);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Xóa sinh viên thất bại');
      }
    }
  };

  if (!classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter'] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Chi Tiết Lớp Học</h1>
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-lg transform transition-all hover:shadow-xl mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Mã Lớp:</span>
            <span className="text-gray-700">{classData.maLop}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Tên Lớp:</span>
            <span className="text-gray-700">{classData.tenLop}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-600">Số Sinh Viên:</span>
            <span className="text-gray-700">{classData.soSinhVien}</span>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => navigate('/classes', { state: { editClass: classData } })}
            className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400 transition-all duration-200"
          >
            Chỉnh sửa
          </button>
          <button
            onClick={() => navigate('/classes')}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
          >
            Quay lại
          </button>
        </div>
      </div>

      {/* Danh sách sinh viên */}
      <h2 className="text-2xl font-bold text-indigo-600 mb-4">Danh Sách Sinh Viên</h2>
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-indigo-400 text-white">
              <th className="p-3 text-left text-sm font-semibold">STT</th>
              <th className="p-3 text-left text-sm font-semibold">Mã SV</th>
              <th className="p-3 text-left text-sm font-semibold">Tên SV</th>
              <th className="p-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  Không có sinh viên nào trong lớp này
                </td>
              </tr>
            ) : (
              students.map((student, index) => (
                <tr
                  key={student.maSV}
                  className="border-b hover:bg-indigo-50 transition-all duration-200"
                >
                  <td className="p-3 text-left">{index + 1}</td>
                  <td className="p-3 text-left whitespace-nowrap">{student.maSV}</td>
                  <td className="p-3 text-left whitespace-nowrap">{student.tenSV}</td>
                  <td className="p-3 text-left flex gap-2">
                    <Link
                      to={`/students/${student.maSV}`}
                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      Chi tiết
                    </Link>
                    <button
                      onClick={() => {
                        setEditStudent({ ...student, image: null });
                        setShowEditModal(true);
                      }}
                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(student.maSV)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal chỉnh sửa sinh viên */}
      {showEditModal && editStudent && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Sửa Sinh Viên</h2>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã SV</label>
                <input
                  type="text"
                  value={editStudent.maSV}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên SV</label>
                <input
                  type="text"
                  value={editStudent.tenSV}
                  onChange={(e) => setEditStudent({ ...editStudent, tenSV: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên sinh viên"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                <select
                  value={editStudent.lop}
                  onChange={(e) => setEditStudent({ ...editStudent, lop: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  required
                >
                  <option value="">Chọn lớp</option>
                  {classes.map(cls => (
                    <option key={cls.maLop} value={cls.tenLop}>{cls.tenLop}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khoa</label>
                <select
                  value={editStudent.khoa}
                  onChange={(e) => setEditStudent({ ...editStudent, khoa: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  required
                >
                  <option value="">Chọn khoa</option>
                  {khoaList.map(khoa => (
                    <option key={khoa} value={khoa}>{khoa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khóa học</label>
                <input
                  type="number"
                  value={editStudent.khoaHoc}
                  onChange={(e) => setEditStudent({ ...editStudent, khoaHoc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập khóa học (VD: 2022)"
                  min="2000"
                  max="2100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh mới (JPG/PNG, nếu có)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  ref={editImageInputRef}
                  onChange={(e) => setEditStudent({ ...editStudent, image: e.target.files[0] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-1">Chọn file JPG hoặc PNG (tối đa 5MB)</p>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400 transition-all duration-200"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-red-300 text-white px-4 py-2 rounded-lg hover:bg-red-400 focus:ring-2 focus:ring-red-300 transition-all duration-200"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
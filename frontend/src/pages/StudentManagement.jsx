import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getStudents, insertStudent, updateStudent, deleteStudent, importStudents } from '../services/api';

import { File, Search, Plus, Download, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState({ maSV: '', tenSV: '', lop: '', khoa: [], khoaHoc: '' });
  const [newStudent, setNewStudent] = useState({ maSV: '', tenSV: '', lop: '', khoa: '', khoaHoc: '', image: null });
  const [editStudent, setEditStudent] = useState(null);
  const [initialEditStudent, setInitialEditStudent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [classes, setClasses] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const addImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);

  const khoaList = ['CNTT', 'Kinh tế', 'Cơ khí', 'Điện tử', 'Xây dựng', 'Hóa học', 'Sinh học', 'Luật', 'Ngoại ngữ', 'Y dược'];

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await axios.post('/api/classes/loaddatalop', {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setClasses(response.data);
      } catch (error) {
        toast.error(`Không thể tải danh sách lớp: ${error.response?.data?.message || error.message}`);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
    const editMaSV = searchParams.get('edit');
    if (editMaSV) {
      fetchStudentForEdit(editMaSV);
      setSearchParams({});
    }
  }, [pagination.page, pagination.limit, searchParams]);

  const fetchStudents = async (params = {}) => {
    try {
      const searchParams = { ...params, page: pagination.page, limit: pagination.limit };
      if (searchParams.khoa && Array.isArray(searchParams.khoa) && searchParams.khoa.length > 0) {
        searchParams.khoa = JSON.stringify(searchParams.khoa);
      }
      const response = await getStudents(searchParams);
      setStudents(response.data.students);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (error) {
      toast.error(`Không thể tải danh sách sinh viên: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchStudentForEdit = async (maSV) => {
    try {
      const response = await getStudents({ maSV });
      if (response.data.students.length > 0) {
        const studentData = { ...response.data.students[0], image: null };
        setEditStudent(studentData);
        setInitialEditStudent(studentData);
        setShowEditModal(true);
      } else {
        toast.error('Không tìm thấy sinh viên để sửa');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải thông tin sinh viên');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const khoaHocNum = Number(newStudent.khoaHoc);
    if (isNaN(khoaHocNum) || !Number.isInteger(khoaHocNum) || khoaHocNum < 2000 || khoaHocNum > 2100) {
      toast.error('Khóa học phải là số nguyên từ 2000 đến 2100');
      return;
    }
    if (newStudent.image && !['image/jpeg', 'image/png'].includes(newStudent.image.type)) {
      toast.error('Vui lòng chọn file ảnh JPG hoặc PNG');
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(newStudent).forEach(([key, value]) => {
        if (value !== null) {
          formData.append(key, value);
        }
      });
      await insertStudent(formData);
      toast.success('Thêm sinh viên thành công');
      setShowAddModal(false);
      setNewStudent({ maSV: '', tenSV: '', lop: '', khoa: '', khoaHoc: '', image: null });
      if (addImageInputRef.current) addImageInputRef.current.value = '';
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thêm sinh viên thất bại');
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
      setInitialEditStudent(null);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật sinh viên thất bại');
    }
  };

  const handleDelete = async (maSV) => {
    if (window.confirm('Bạn có chắc muốn xóa sinh viên này?')) {
      try {
        await deleteStudent({ maSV });
        toast.success('Xóa sinh viên thành công');
        fetchStudents();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Xóa sinh viên thất bại');
      }
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      await importStudents(formData);
      toast.success('Nhập Excel thành công');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Nhập Excel thất bại');
    }
  };

  const handleExport = async () => {
    try {
      toast.info('Đang xuất dữ liệu, vui lòng đợi...');
      const searchParams = { ...search };
      if (searchParams.khoa && Array.isArray(searchParams.khoa) && searchParams.khoa.length > 0) {
        searchParams.khoa = JSON.stringify(searchParams.khoa);
      }

      // Gọi endpoint /export và nhận file
      const response = await axios.get('/api/students/export', {
        params: searchParams,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob', // Nhận response dạng blob
      });

      // Tạo file từ blob
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'students_export.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Xuất Excel thành công');
    } catch (error) {
      console.error('Export error:', error.message, error.stack);
      toast.error(`Xuất Excel thất bại: ${error.message}`);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleLimitChange = (e) => {
    setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }));
  };

  const handleKhoaCheckboxChange = (khoa) => {
    setSearch(prev => {
      const newKhoa = prev.khoa.includes(khoa)
        ? prev.khoa.filter(k => k !== khoa)
        : [...prev.khoa, khoa];
      return { ...prev, khoa: newKhoa };
    });
  };

  const resetAddModal = () => {
    setNewStudent({ maSV: '', tenSV: '', lop: '', khoa: '', khoaHoc: '', image: null });
    if (addImageInputRef.current) addImageInputRef.current.value = '';
  };

  const resetEditModal = () => {
    if (initialEditStudent) {
      setEditStudent({ ...initialEditStudent, image: null });
      if (editImageInputRef.current) editImageInputRef.current.value = '';
    }
  };

  const resetSearchModal = () => {
    setSearch({ maSV: '', tenSV: '', lop: '', khoa: [], khoaHoc: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Quản Lý Sinh Viên</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-500 transition-all duration-200"
        >
          <Plus size={20} />
          Thêm sinh viên
        </button>
        <button
          onClick={() => setShowSearchModal(true)}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition-all duration-200"
        >
          <Search size={20} />
          Tìm kiếm
        </button>
        <label className="bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-blue-500 transition-all duration-200">
          <File size={20} />
          Nhập Excel
          <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
        </label>
        <button
          onClick={handleExport}
          className="bg-green-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-500 transition-all duration-200"
        >
          <Download size={20} />
          Xuất Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-indigo-400 text-white">
              <th className="p-3 text-left text-sm font-semibold">STT</th>
              <th className="p-3 text-left text-sm font-semibold">Mã SV</th>
              <th className="p-3 text-left text-sm font-semibold">Tên SV</th>
              <th className="p-3 text-left text-sm font-semibold">Lớp</th>
              <th className="p-3 text-left text-sm font-semibold">Khoa</th>
              <th className="p-3 text-left text-sm font-semibold">Khóa</th>
              <th className="p-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  Không có sinh viên nào
                </td>
              </tr>
            ) : (
              students.map((student, index) => (
                <tr
                  key={student.maSV}
                  className="border-b hover:bg-indigo-50 transition-all duration-200"
                >
                  <td className="p-3 text-left">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                  <td className="p-3 text-left whitespace-nowrap">{student.maSV}</td>
                  <td className="p-3 text-left whitespace-nowrap">{student.tenSV}</td>
                  <td className="p-3 text-left whitespace-nowrap">{student.lop}</td>
                  <td className="p-3 text-left whitespace-nowrap">{student.khoa}</td>
                  <td className="p-3 text-left whitespace-nowrap">{student.khoaHoc}</td>
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
                        setInitialEditStudent({ ...student, image: null });
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

      {showAddModal && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Thêm Sinh Viên</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã SV</label>
                <input
                  type="text"
                  value={newStudent.maSV}
                  onChange={(e) => setNewStudent({ ...newStudent, maSV: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập mã SV (5-10 ký tự chữ hoa/số)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên SV</label>
                <input
                  type="text"
                  value={newStudent.tenSV}
                  onChange={(e) => setNewStudent({ ...newStudent, tenSV: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên sinh viên"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                <select
                  value={newStudent.lop}
                  onChange={(e) => setNewStudent({ ...newStudent, lop: e.target.value })}
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
                  value={newStudent.khoa}
                  onChange={(e) => setNewStudent({ ...newStudent, khoa: e.target.value })}
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
                  value={newStudent.khoaHoc}
                  onChange={(e) => setNewStudent({ ...newStudent, khoaHoc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập khóa học (VD: 2022)"
                  min="2000"
                  max="2100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh (JPG/PNG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  ref={addImageInputRef}
                  onChange={(e) => setNewStudent({ ...newStudent, image: e.target.files[0] })}
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
                  onClick={resetAddModal}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-red-300 text-white px-4 py-2 rounded-lg hover:bg-red-400 focus:ring-2 focus:ring-red-300 transition-all duration-200"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  onClick={resetEditModal}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                >
                  Reset
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

      {showSearchModal && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Tìm Kiếm Sinh Viên</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã SV</label>
                <input
                  type="text"
                  value={search.maSV}
                  onChange={(e) => setSearch({ ...search, maSV: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập mã SV"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên SV</label>
                <input
                  type="text"
                  value={search.tenSV}
                  onChange={(e) => setSearch({ ...search, tenSV: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên SV"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                <select
                  value={search.lop}
                  onChange={(e) => setSearch({ ...search, lop: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                >
                  <option value="">Chọn lớp</option>
                  {classes.map(cls => (
                    <option key={cls.maLop} value={cls.tenLop}>{cls.tenLop}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khoa</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {khoaList.map(khoa => (
                    <label key={khoa} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={search.khoa.includes(khoa)}
                        onChange={() => handleKhoaCheckboxChange(khoa)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{khoa}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khóa học</label>
                <input
                  type="number"
                  value={search.khoaHoc}
                  onChange={(e) => setSearch({ ...search, khoaHoc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập khóa học"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    fetchStudents(search);
                    setShowSearchModal(false);
                  }}
                  className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400 transition-all duration-200"
                >
                  Tìm kiếm
                </button>
                <button
                  type="button"
                  onClick={resetSearchModal}
                  className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 focus:ring-2 focus:ring-gray-400 transition-all duration-200"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="flex-1 bg-red-300 text-white px-4 py-2 rounded-lg hover:bg-red-400 focus:ring-2 focus:ring-red-300 transition-all duration-200"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
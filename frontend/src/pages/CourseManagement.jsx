import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { getCourses, insertCourse, updateCourse, deleteCourse, importCourses } from '../services/api'

import { File, Search, Plus, Download, Edit, Trash2 } from 'lucide-react'
import axios from 'axios'

export default function CourseManagement() {
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState({ maMonHoc: '', tenMonHoc: '' })
  const [newCourse, setNewCourse] = useState({ maMonHoc: '', tenMonHoc: '', tinChi: '' })
  const [editCourse, setEditCourse] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    fetchCourses()
  }, [pagination.page, pagination.limit])

  const fetchCourses = async (params = {}) => {
    try {
      const response = await getCourses({ ...params, page: pagination.page, limit: pagination.limit })
      setCourses(response.data.courses)
      setPagination(prev => ({ ...prev, total: response.data.total }))
    } catch {
      toast.error('Không thể tải danh sách môn học')
    }
  }

  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!Number.isInteger(Number(newCourse.tinChi)) || Number(newCourse.tinChi) <= 0) {
      toast.error('Tín chỉ phải là số nguyên dương')
      return
    }
    try {
      await insertCourse(newCourse)
      toast.success('Thêm môn học thành công')
      setShowAddModal(false)
      setNewCourse({ maMonHoc: '', tenMonHoc: '', tinChi: '' })
      fetchCourses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thêm môn học thất bại')
    }
  }

  const handleEditCourse = async (e) => {
    e.preventDefault()
    if (!Number.isInteger(Number(editCourse.tinChi)) || Number(editCourse.tinChi) <= 0) {
      toast.error('Tín chỉ phải là số nguyên dương')
      return
    }
    try {
      await updateCourse(editCourse)
      toast.success('Cập nhật môn học thành công')
      setShowEditModal(false)
      setEditCourse(null)
      fetchCourses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật môn học thất bại')
    }
  }

  const handleDelete = async (maMonHoc) => {
    if (window.confirm('Bạn có chắc muốn xóa môn học này?')) {
      try {
        await deleteCourse({ maMonHoc })
        toast.success('Xóa môn học thành công')
        fetchCourses()
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa môn học thất bại')
      }
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      await importCourses(formData)
      toast.success('Nhập Excel thành công')
      fetchCourses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Nhập Excel thất bại')
    }
  }

  const handleExport = async () => {
    try {
      toast.info('Đang xuất dữ liệu, vui lòng đợi...');
      const searchParams = { ...search };

      // Gọi endpoint /export và nhận file
      const response = await axios.post('/api/courses/export', searchParams, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob', // Nhận response dạng blob
      });

      // Tạo file từ blob
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'courses_export.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Xuất Excel thành công');
    } catch (error) {
      console.error('Export error:', error.message, error.stack);
      toast.error(`Xuất Excel thất bại: ${error.message}`);
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.limit)) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }

  const handleLimitChange = (e) => {
    setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Quản Lý Môn Học</h1>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-500 transition-all duration-200"
        >
          <Plus size={20} />
          Thêm môn học
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

      {/* Courses Table */}
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-indigo-400 text-white">
              <th className="p-3 text-left text-sm font-semibold">STT</th>
              <th className="p-3 text-left text-sm font-semibold">Mã Môn Học</th>
              <th className="p-3 text-left text-sm font-semibold">Tên Môn Học</th>
              <th className="p-3 text-left text-sm font-semibold">Tín Chỉ</th>
              <th className="p-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Không có môn học nào
                </td>
              </tr>
            ) : (
              courses.map((course, index) => (
                <tr
                  key={course.maMonHoc}
                  className="border-b hover:bg-indigo-50 transition-all duration-200"
                >
                  <td className="p-3 text-left">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                  <td className="p-3 text-left whitespace-nowrap">{course.maMonHoc}</td>
                  <td className="p-3 text-left whitespace-nowrap">{course.tenMonHoc}</td>
                  <td className="p-3 text-left whitespace-nowrap">{course.tinChi}</td>
                  <td className="p-3 text-left flex gap-2">
                    <button
                      onClick={() => {
                        setEditCourse(course)
                        setShowEditModal(true)
                      }}
                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(course.maMonHoc)}
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

      {/* Pagination */}
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Thêm Môn Học</h2>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Môn Học</label>
                <input
                  type="text"
                  value={newCourse.maMonHoc}
                  onChange={(e) => setNewCourse({ ...newCourse, maMonHoc: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập mã môn học (VD: CT101)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Môn Học</label>
                <input
                  type="text"
                  value={newCourse.tenMonHoc}
                  onChange={(e) => setNewCourse({ ...newCourse, tenMonHoc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên môn học"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tín Chỉ</label>
                <input
                  type="number"
                  value={newCourse.tinChi}
                  onChange={(e) => setNewCourse({ ...newCourse, tinChi: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập số tín chỉ"
                  min="1"
                  required
                />
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

      {/* Edit Modal */}
      {showEditModal && editCourse && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Sửa Môn Học</h2>
            <form onSubmit={handleEditCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Môn Học</label>
                <input
                  type="text"
                  value={editCourse.maMonHoc}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Môn Học</label>
                <input
                  type="text"
                  value={editCourse.tenMonHoc}
                  onChange={(e) => setEditCourse({ ...editCourse, tenMonHoc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên môn học"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tín Chỉ</label>
                <input
                  type="number"
                  value={editCourse.tinChi}
                  onChange={(e) => setEditCourse({ ...editCourse, tinChi: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập số tín chỉ"
                  min="1"
                  required
                />
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

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Tìm Kiếm Môn Học</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Môn Học</label>
                <input
                  type="text"
                  value={search.maMonHoc}
                  onChange={(e) => setSearch({ ...search, maMonHoc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập mã môn học"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Môn Học</label>
                <input
                  type="text"
                  value={search.tenMonHoc}
                  onChange={(e) => setSearch({ ...search, tenMonHoc: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên môn học"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    fetchCourses(search)
                    setShowSearchModal(false)
                  }}
                  className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-400 transition-all duration-200"
                >
                  Tìm kiếm
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
  )
}
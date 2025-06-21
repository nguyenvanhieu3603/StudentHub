import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getClasses, insertClass, updateClass, deleteClass, importClasses } from '../services/api'

import { File, Search, Plus, Download, Edit, Trash2 } from 'lucide-react'
import axios from 'axios'

export default function ClassManagement() {
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState({ maLop: '', tenLop: '' })
  const [newClass, setNewClass] = useState({ maLop: '', tenLop: '' })
  const [editClass, setEditClass] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    fetchClasses()
  }, [pagination.page, pagination.limit])

  const fetchClasses = async () => {
    try {
      const params = {
        ...search,
        page: pagination.page,
        limit: pagination.limit,
      }
      const response = await getClasses(params)
      setClasses(response.data.classes)
      setPagination(prev => ({ ...prev, total: response.data.total }))
    } catch {
      toast.error('Không thể tải danh sách lớp học')
    }
  }

  const handleAddClass = async (e) => {
    e.preventDefault()
    try {
      await insertClass({ ...newClass, tenLop: newClass.tenLop.toUpperCase() })
      toast.success('Thêm lớp học thành công')
      setShowAddModal(false)
      setNewClass({ maLop: '', tenLop: '' })
      fetchClasses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thêm lớp học thất bại')
    }
  }

  const handleEditClass = async (e) => {
    e.preventDefault()
    try {
      await updateClass({ ...editClass, tenLop: editClass.tenLop.toUpperCase() })
      toast.success('Cập nhật lớp học thành công')
      setShowEditModal(false)
      setEditClass(null)
      fetchClasses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật lớp học thất bại')
    }
  }

  const handleDelete = async (maLop) => {
    if (window.confirm('Bạn có chắc muốn xóa lớp học này?')) {
      try {
        await deleteClass({ maLop })
        toast.success('Xóa lớp học thành công')
        fetchClasses()
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa lớp học thất bại')
      }
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      await importClasses(formData)
      toast.success('Nhập Excel thành công')
      fetchClasses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Nhập Excel thất bại')
    }
  }

  const handleExport = async () => {
    try {
      toast.info('Đang xuất dữ liệu, vui lòng đợi...');
      const searchParams = { ...search };

      // Gọi endpoint /export và nhận file
      const response = await axios.post('/api/classes/export', searchParams, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob', // Nhận response dạng blob
      });

      // Tạo file từ blob
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'classes_export.xlsx';
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
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Quản Lý Lớp Học</h1>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-500 transition-all duration-200"
        >
          <Plus size={20} />
          Thêm lớp học
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

      {/* Classes Table */}
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-indigo-400 text-white">
              <th className="p-3 text-left text-sm font-semibold w-1/12 min-w-[50px]">STT</th>
              <th className="p-3 text-left text-sm font-semibold w-2/12 min-w-[100px]">Mã Lớp</th>
              <th className="p-3 text-left text-sm font-semibold w-5/12 min-w-[200px]">Tên Lớp</th>
              <th className="p-3 text-left text-sm font-semibold w-2/12 min-w-[100px]">Số Sinh Viên</th>
              <th className="p-3 text-left text-sm font-semibold w-2/12 min-w-[150px]">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Không có lớp học nào
                </td>
              </tr>
            ) : (
              classes.map((cls, index) => (
                <tr
                  key={cls.maLop}
                  className="border-b hover:bg-indigo-50 transition-all duration-200"
                >
                  <td className="p-3 text-left">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                  <td className="p-3 text-left whitespace-nowrap">{cls.maLop}</td>
                  <td className="p-3 text-left whitespace-nowrap">{cls.tenLop}</td>
                  <td className="p-3 text-left whitespace-nowrap">{cls.soSinhVien}</td>
                  <td className="p-3 text-left flex gap-2">
                    <Link
                      to={`/classes/${cls.maLop}`}
                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      Chi tiết
                    </Link>
                    <button
                      onClick={() => {
                        setEditClass(cls)
                        setShowEditModal(true)
                      }}
                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(cls.maLop)}
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
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Thêm Lớp Học</h2>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Lớp</label>
                <input
                  type="text"
                  value={newClass.maLop}
                  onChange={(e) => setNewClass({ ...newClass, maLop: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập mã lớp (5-10 ký tự chữ hoa/số)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Lớp</label>
                <input
                  type="text"
                  value={newClass.tenLop}
                  onChange={(e) => setNewClass({ ...newClass, tenLop: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên lớp (VD: K22CNPM-A)"
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
      {showEditModal && editClass && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Sửa Lớp Học</h2>
            <form onSubmit={handleEditClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Lớp</label>
                <input
                  type="text"
                  value={editClass.maLop}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Lớp</label>
                <input
                  type="text"
                  value={editClass.tenLop}
                  onChange={(e) => setEditClass({ ...editClass, tenLop: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên lớp (VD: K22CNPM-A)"
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
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Tìm Kiếm Lớp Học</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Lớp</label>
                <input
                  type="text"
                  value={search.maLop}
                  onChange={(e) => setSearch({ ...search, maLop: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập mã lớp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Lớp</label>
                <input
                  type="text"
                  value={search.tenLop}
                  onChange={(e) => setSearch({ ...search, tenLop: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập tên lớp"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setPagination(prev => ({ ...prev, page: 1 }))
                    fetchClasses()
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
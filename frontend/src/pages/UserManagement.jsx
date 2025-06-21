import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { getUsers, register, updateUser, deleteUser } from '../services/api'
import { File, Search, Plus, Download, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState({ username: '', account: '' })
  const [newUser, setNewUser] = useState({ username: '', account: '', password: '', role: 'lecturer' })
  const [editUser, setEditUser] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async (params = {}) => {
    try {
      const response = await getUsers({ ...search, ...params })
      setUsers(response.data.users)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách người dùng')
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      await register(newUser)
      toast.success('Thêm người dùng thành công')
      setShowAddModal(false)
      setNewUser({ username: '', account: '', password: '', role: 'lecturer' })
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thêm người dùng thất bại')
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    try {
      await updateUser({ id: editUser.id, ...editUser })
      toast.success('Cập nhật người dùng thành công')
      setShowEditModal(false)
      setEditUser(null)
      setShowPassword(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật người dùng thất bại')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      try {
        await deleteUser({ id })
        toast.success('Xóa người dùng thành công')
        fetchUsers()
      } catch (err) {
        toast.error(err.response?.data?.message || 'Xóa người dùng thất bại')
      }
    }
  }

  // const handleImport = async (e) => {
  //   const file = e.target.files[0]
  //   if (!file) return
  //   try {
  //     const formData = new FormData()
  //     formData.append('file', file)
  //     await importUsers(formData)
  //     toast.success('Nhập Excel thành công')
  //     fetchUsers()
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || 'Nhập Excel thất bại')
  //   }
  // }

  // const handleExport = async () => {
  //   try {
  //     const response = await exportUsers(search)
  //     const columns = [
  //       { key: 'username', header: 'Username', width: 20 },
  //       { key: 'account', header: 'Email/ID', width: 25 },
  //       { key: 'role', header: 'Vai trò', width: 15 },
  //     ]
  //     exportToExcel(response.data.users, columns, 'users_export.xlsx')
  //     toast.success('Xuất Excel thành công')
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || 'Xuất Excel thất bại')
  //   }
  // }

  // Hàm ánh xạ role sang tiếng Việt
  const displayRole = (role) => {
    return role === 'lecturer' ? 'Giảng viên' : role === 'admin' ? 'Quản trị' : role
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Quản Lý Người Dùng</h1>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-500 transition-all duration-200"
        >
          <Plus size={20} />
          Thêm người dùng
        </button>
        <button
          onClick={() => setShowSearchModal(true)}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition-all duration-200"
        >
          <Search size={20} />
          Tìm kiếm
        </button>
        {/* <label className="bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-blue-500 transition-all duration-200">
          <File size={20} />
          Nhập Excel
          <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
        </label> */}
        {/* <button
          onClick={handleExport}
          className="bg-green-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-500 transition-all duration-200"
        >
          <Download size={20} />
          Xuất Excel
        </button> */}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-indigo-400 text-white">
              <th className="p-3 text-left text-sm font-semibold">STT</th>
              <th className="p-3 text-left text-sm font-semibold">Username</th>
              <th className="p-3 text-left text-sm font-semibold">Email/ID</th>
              <th className="p-3 text-left text-sm font-semibold">Vai trò</th>
              <th className="p-3 text-left text-sm font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Không có người dùng nào
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr
                  key={user.id}
                  className="border-b hover:bg-indigo-50 transition-all duration-200"
                >
                  <td className="p-3 text-left">{index + 1}</td>
                  <td className="p-3 text-left">{user.username}</td>
                  <td className="p-3 text-left">{user.account}</td>
                  <td className="p-3 text-left">{displayRole(user.role)}</td>
                  <td className="p-3 text-left flex gap-2">
                    <button
                      onClick={() => {
                        setEditUser(user)
                        setShowEditModal(true)
                      }}
                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Thêm Người Dùng</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email/ID</label>
                <input
                  type="text"
                  value={newUser.account}
                  onChange={(e) => setNewUser({ ...newUser, account: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập email hoặc ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                >
                  <option value="lecturer">Giảng viên</option>
                  <option value="admin">Quản trị</option>
                </select>
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
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-fade-in">
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Sửa Người Dùng</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email/ID</label>
                <input
                  type="text"
                  value={editUser.account}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={editUser.password || ''}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 pr-10"
                  placeholder="Nhập mật khẩu mới (nếu muốn thay đổi)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                >
                  <option value="lecturer">Giảng viên</option>
                  <option value="admin">Quản trị</option>
                </select>
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
                  onClick={() => {
                    setShowEditModal(false)
                    setShowPassword(false)
                  }}
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
            <h2 className="text-2xl font-bold text-indigo-600 mb-6">Tìm Kiếm Người Dùng</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={search.username}
                  onChange={(e) => setSearch({ ...search, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email/ID</label>
                <input
                  type="text"
                  value={search.account}
                  onChange={(e) => setSearch({ ...search, account: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                  placeholder="Nhập email hoặc ID"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    fetchUsers()
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
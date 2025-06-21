import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getGrades, insertGrade, updateGrade, deleteGrade, importGrades, exportGrades, loadDataLop, getCourses } from '../services/api';
import { Edit, Trash2, Search, Plus, Upload, Download } from 'lucide-react';
import Modal from 'react-modal';

Modal.setAppElement('#root');

export default function GradeManagement() {
  const [grades, setGrades] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [newGrade, setNewGrade] = useState({ maSV: '', maLop: '', maMonHoc: '', semester: '', diemGK: '', diemCK: '', diemCC: '' });
  const [editGrade, setEditGrade] = useState(null);
  const [initialEditGrade, setInitialEditGrade] = useState(null);
  const [search, setSearch] = useState({ maSV: '', tenSV: '', maLop: '', maMonHoc: '', semester: '' });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    fetchGrades();
  }, [pagination.page, pagination.limit]);

  const fetchClasses = async () => {
    try {
      const response = await loadDataLop();
      setClasses(response.data);
    } catch {
      toast.error('Không thể tải danh sách lớp');
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await getCourses({ limit: 1000 });
      setSubjects(response.data.courses);
    } catch {
      toast.error('Không thể tải danh sách môn học');
    }
  };

  const fetchGrades = async (params = {}) => {
    try {
      const searchParams = {
        maSV: params.maSV?.trim() || search.maSV,
        tenSV: params.tenSV?.trim() || search.tenSV,
        maLop: params.maLop || search.maLop,
        maMonHoc: params.maMonHoc || search.maMonHoc,
        semester: params.semester || search.semester,
        page: pagination.page,
        limit: pagination.limit,
      };
      const response = await getGrades(searchParams);
      setGrades(response.data.grades);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch {
      toast.error('Không thể tải danh sách điểm');
    }
  };

  const handleAdd = async () => {
    try {
      await insertGrade(newGrade);
      setNewGrade({ maSV: '', maLop: '', maMonHoc: '', semester: '', diemGK: '', diemCK: '', diemCC: '' });
      setShowAddModal(false);
      fetchGrades();
      toast.success('Thêm điểm thành công');
    } catch {
      toast.error('Không thể thêm điểm');
    }
  };

  const handleEdit = async () => {
    try {
      const updatedFields = {};
      ['diemGK', 'diemCK', 'diemCC'].forEach(field => {
        if (editGrade[field] !== initialEditGrade[field]) updatedFields[field] = editGrade[field];
      });
      if (Object.keys(updatedFields).length === 0) {
        setShowEditModal(false);
        return;
      }
      await updateGrade([{ id: editGrade.id, ...updatedFields }]);
      setShowEditModal(false);
      fetchGrades();
      toast.success('Cập nhật điểm thành công');
    } catch {
      toast.error('Không thể cập nhật điểm');
    }
  };

  const handleDelete = async id => {
    try {
      await deleteGrade({ id });
      fetchGrades();
      toast.success('Xóa điểm thành công');
    } catch {
      toast.error('Không thể xóa điểm');
    }
  };

  const handleImport = async () => {
    if (!file) return toast.error('Vui lòng chọn file');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await importGrades(formData);
      setFile(null);
      fetchGrades();
      toast.success('Nhập điểm thành công');
    } catch {
      toast.error('Không thể nhập điểm');
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportGrades(search);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'grades_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Không thể xuất điểm');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 p-8 ml-64 font-['Inter']">
      <h1 className="text-4xl font-bold text-indigo-600 mb-8">Quản Lý Điểm</h1>
      <div className="bg-white p-8 rounded-2xl shadow-md transform transition-all hover:shadow-xl">
        <div className="flex justify-between mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500"
          >
            <Plus size={18} /> Thêm
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              <Search size={18} /> Tìm kiếm
            </button>
            <label className="flex items-center gap-2 bg-green-400 text-white px-4 py-2 rounded-lg cursor-pointer">
              <Upload size={18} /> Nhập Excel
              <input type="file" accept=".xlsx" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </label>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500"
            >
              <Download size={18} /> Xuất Excel
            </button>
          </div>
        </div>
        {file && (
          <div className="mb-4 flex items-center gap-4">
            <span className="text-gray-700">{file.name}</span>
            <button onClick={handleImport} className="bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500">
              Xác nhận nhập
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-indigo-400 text-white">
                <th className="p-3 text-left text-sm font-semibold">STT</th>
                <th className="p-3 text-left text-sm font-semibold">Mã SV</th>
                <th className="p-3 text-left text-sm font-semibold">Tên SV</th>
                <th className="p-3 text-left text-sm font-semibold">Lớp</th>
                <th className="p-3 text-left text-sm font-semibold">Môn học</th>
                <th className="p-3 text-left text-sm font-semibold">Học kỳ</th>
                <th className="p-3 text-left text-sm font-semibold">Điểm A</th>
                <th className="p-3 text-left text-sm font-semibold">Điểm B</th>
                <th className="p-3 text-left text-sm font-semibold">Điểm C</th>
                <th className="p-3 text-left text-sm font-semibold">Điểm TB</th>
                <th className="p-3 text-left text-sm font-semibold">Xếp Loại</th>
                <th className="p-3 text-left text-sm font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {grades.length === 0 ? (
                <tr>
                  <td colSpan="12" className="p-4 text-center text-gray-500">
                    Không có điểm nào
                  </td>
                </tr>
              ) : (
                grades.map((grade, index) => (
                  <tr key={grade.id} className="border-b hover:bg-indigo-50">
                    <td className="p-3">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                    <td className="p-3">{grade.maSV}</td>
                    <td className="p-3">{grade.tenSV}</td>
                    <td className="p-3">{grade.tenLop}</td>
                    <td className="p-3">{grade.tenMonHoc}</td>
                    <td className="p-3">{grade.semester}</td>
                    <td className="p-3">{grade.diemCK}</td>
                    <td className="p-3">{grade.diemGK}</td>
                    <td className="p-3">{grade.diemCC}</td>
                    <td className="p-3">{grade.finalGrade}</td>
                    <td className="p-3">{grade.letterGrade}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => {
                          setEditGrade({ ...grade });
                          setInitialEditGrade({ ...grade });
                          setShowEditModal(true);
                        }}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(grade.id)} className="text-red-500 hover:text-red-700">
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
              onChange={e => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
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
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-100"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Trang {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === Math.ceil(pagination.total / pagination.limit)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
        className="bg-white p-8 rounded-2xl max-w-md mx-auto mt-20 shadow-xl"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <h2 className="text-2xl font-bold text-indigo-600 mb-6">Thêm Điểm</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã SV</label>
            <input
              type="text"
              value={newGrade.maSV}
              onChange={e => setNewGrade({ ...newGrade, maSV: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
            <select
              value={newGrade.maLop}
              onChange={e => setNewGrade({ ...newGrade, maLop: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              required
            >
              <option value="">Chọn lớp</option>
              {classes.map(cls => (
                <option key={cls.maLop} value={cls.maLop}>{cls.tenLop}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select
              value={newGrade.maMonHoc}
              onChange={e => setNewGrade({ ...newGrade, maMonHoc: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              required
            >
              <option value="">Chọn môn học</option>
              {subjects.map(subject => (
                <option key={subject.maMonHoc} value={subject.maMonHoc}>{subject.tenMonHoc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
            <select
              value={newGrade.semester}
              onChange={e => setNewGrade({ ...newGrade, semester: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              required
            >
              <option value="">Chọn học kỳ</option>
              {Array.from({ length: 5 }, (_, i) => 2021 + i).flatMap(year =>
                ['HK1', 'HK2', 'HK3'].map(sem => (
                  <option key={`${sem}-${year}`} value={`${sem}-${year}`}>{`${sem} ${year}`}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm A</label>
            <input
              type="number"
              value={newGrade.diemCK}
              onChange={e => setNewGrade({ ...newGrade, diemCK: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              min="0"
              max="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm B</label>
            <input
              type="number"
              value={newGrade.diemGK}
              onChange={e => setNewGrade({ ...newGrade, diemGK: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              min="0"
              max="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm C</label>
            <input
              type="number"
              value={newGrade.diemCC}
              onChange={e => setNewGrade({ ...newGrade, diemCC: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              min="0"
              max="10"
            />
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleAdd}
            className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500"
          >
            Thêm
          </button>
          <button
            onClick={() => setShowAddModal(false)}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Hủy
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
        className="bg-white p-8 rounded-2xl max-w-md mx-auto mt-20 shadow-xl"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <h2 className="text-2xl font-bold text-indigo-600 mb-6">Sửa Điểm</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã SV</label>
            <input
              type="text"
              value={editGrade?.maSV || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
            <select
              value={editGrade?.maLop || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            >
              <option value={editGrade?.maLop}>{editGrade?.tenLop}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select
              value={editGrade?.maMonHoc || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            >
              <option value={editGrade?.maMonHoc}>{editGrade?.tenMonHoc}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
            <select
              value={editGrade?.semester || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            >
              <option value={editGrade?.semester}>{editGrade?.semester}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm A</label>
            <input
              type="number"
              value={editGrade?.diemCK || ''}
              onChange={e => setEditGrade({ ...editGrade, diemCK: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              min="0"
              max="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm B</label>
            <input
              type="number"
              value={editGrade?.diemGK || ''}
              onChange={e => setEditGrade({ ...editGrade, diemGK: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              min="0"
              max="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm C</label>
            <input
              type="number"
              value={editGrade?.diemCC || ''}
              onChange={e => setEditGrade({ ...editGrade, diemCC: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
              min="0"
              max="10"
            />
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleEdit}
            className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500"
          >
            Cập nhật
          </button>
          <button
            onClick={() => setShowEditModal(false)}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Hủy
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showSearchModal}
        onRequestClose={() => setShowSearchModal(false)}
        className="bg-white p-8 rounded-2xl max-w-md mx-auto mt-20 shadow-xl"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <h2 className="text-2xl font-bold text-indigo-600 mb-6">Tìm Kiếm Điểm</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã SV</label>
            <input
              type="text"
              value={search.maSV}
              onChange={e => setSearch({ ...search, maSV: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên SV</label>
            <input
              type="text"
              value={search.tenSV}
              onChange={e => setSearch({ ...search, tenSV: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
            <select
              value={search.maLop}
              onChange={e => setSearch({ ...search, maLop: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Tất cả lớp</option>
              {classes.map(cls => (
                <option key={cls.maLop} value={cls.maLop}>{cls.tenLop}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select
              value={search.maMonHoc}
              onChange={e => setSearch({ ...search, maMonHoc: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map(subject => (
                <option key={subject.maMonHoc} value={subject.maMonHoc}>{subject.tenMonHoc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Học kỳ</label>
            <select
              value={search.semester}
              onChange={e => setSearch({ ...search, semester: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Tất cả học kỳ</option>
              {Array.from({ length: 5 }, (_, i) => 2021 + i).flatMap(year =>
                ['HK1', 'HK2', 'HK3'].map(sem => (
                  <option key={`${sem}-${year}`} value={`${sem}-${year}`}>{`${sem} ${year}`}</option>
                ))
              )}
            </select>
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => {
              setPagination(prev => ({ ...prev, page: 1 }));
              fetchGrades();
              setShowSearchModal(false);
            }}
            className="flex-1 bg-indigo-400 text-white px-4 py-2 rounded-lg hover:bg-indigo-500"
          >
            Tìm kiếm
          </button>
          <button
            onClick={() => setShowSearchModal(false)}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Hủy
          </button>
        </div>
      </Modal>
    </div>
  );
}
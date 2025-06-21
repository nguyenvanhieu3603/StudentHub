import { NavLink } from 'react-router-dom';
import { Home, Users, Book, Clipboard, FileText, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/users', icon: Users, label: 'Quản lý người dùng', adminOnly: true },
    { path: '/students', icon: Users, label: 'Quản lý sinh viên' },
    { path: '/classes', icon: Clipboard, label: 'Quản lý lớp học' },
    { path: '/courses', icon: Book, label: 'Quản lý môn học' },
    { path: '/grades', icon: FileText, label: 'Quản lý điểm' },
    { path: '/chatbot', icon: MessageSquare, label: 'Trợ Lý Chatbot', chatbotOnly: true },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-indigo-300 to-blue-400 text-white flex flex-col shadow-xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold font-['Inter'] tracking-tight">
          Student Hub
        </h2>
        <p className="text-sm text-indigo-100">Quản lý sinh viên</p>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1 p-4">
          {navItems.map(item => (
            (!item.adminOnly && !item.chatbotOnly) ||
            (item.adminOnly && user?.role === 'admin') ||
            (item.chatbotOnly && ['admin', 'lecturer'].includes(user?.role))) && (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-lg font-['Inter'] text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-800 shadow-sm'
                        : 'hover:bg-indigo-200 hover:text-indigo-900 hover:shadow-sm'
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              </li>
            )
          )}
        </ul>
      </nav>
      <div className="p-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full p-3 rounded-lg bg-red-300 text-white hover:bg-red-400 font-['Inter'] text-sm font-medium transition-all duration-200"
        >
          <LogOut size={20} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
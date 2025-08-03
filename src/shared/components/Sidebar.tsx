import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  const menuItems = [
    { path: '/', label: 'Trang chủ', icon: '🏠' },
    { path: '/quizzes', label: 'Danh sách Quiz', icon: '📝' },
    { path: '/favorites', label: 'Yêu thích', icon: '❤️' },
    { path: '/leaderboard', label: 'Bảng xếp hạng', icon: '🏆' },
    { path: '/profile', label: 'Hồ sơ', icon: '👤' },
  ];

  // Add role-specific menu items
  if (user?.role === 'admin') {
    menuItems.push({ path: '/creator', label: 'Tạo Quiz', icon: '➕' });
  }

  if (user?.role === 'admin') {
    menuItems.push({ path: '/admin', label: 'Quản trị', icon: '⚙️' });
  }

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 h-full">
      <nav className="mt-8">
        <div className="px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;


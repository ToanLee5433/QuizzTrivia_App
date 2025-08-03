import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  if (user?.role !== 'admin') {
    return null;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: '🏠',
      current: location.pathname === '/admin'
    },
    {
      name: 'Quản lý Quiz',
      href: '/admin/quiz-management',
      icon: '📝',
      current: location.pathname === '/admin/quiz-management'
    },
    {
      name: 'Quản lý danh mục',
      href: '/admin/categories',
      icon: '🏷️',
      current: location.pathname === '/admin/categories'
    },
    {
      name: 'Quản lý User',
      href: '/admin/users',
      icon: '👥',
      current: location.pathname === '/admin/users'
    },
    {
      name: 'Utilities',
      href: '/admin/utilities',
      icon: '�️',
      current: location.pathname === '/admin/utilities'
    },
    {
      name: 'Phân quyền',
      href: '/admin/roles',
      icon: '🔐',
      current: location.pathname === '/admin/roles'
    }
  ];

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0">
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <h1 className="text-white text-xl font-bold">Admin Panel</h1>
      </div>
      
      <nav className="mt-8">
        <div className="px-3 mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">
            Quản trị
          </p>
        </div>
        
        <div className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2 mx-3 text-sm font-medium rounded-md transition-colors ${
                item.current
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>
        
        <div className="mt-8 px-3">
          <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-4">
            Thao tác nhanh
          </p>
          <div className="space-y-2">
            <Link
              to="/creator"
              className="group flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
            >
              <span className="mr-3">✏️</span>
              Tạo Quiz
            </Link>
            <Link
              to="/dashboard"
              className="group flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
            >
              <span className="mr-3">🏠</span>
              Về Dashboard
            </Link>
          </div>
        </div>
      </nav>
      
      <div className="absolute bottom-0 w-full p-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-white text-sm font-medium">
                {user?.displayName || 'Admin'}
              </p>
              <p className="text-gray-400 text-xs">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;


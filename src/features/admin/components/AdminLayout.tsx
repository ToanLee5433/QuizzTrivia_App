import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { useTranslation } from 'react-i18next';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation();

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('admin.loginAsAdmin')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">🔧 {t('admin.sidebar.title')}</h1>
              </div>
              {title && (
                <div className="ml-4 pl-4 border-l border-gray-200">
                  <h2 className="text-lg font-medium text-gray-700">{title}</h2>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{t('welcome')}, {user?.displayName || user?.email}</span>
              <div className="relative h-10 w-10">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || user.email || 'User'}
                    className="h-10 w-10 rounded-full object-cover border-2 border-blue-500"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      const fallbackDiv = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallbackDiv) fallbackDiv.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-md ${user?.photoURL ? 'hidden' : ''}`}>
                  <span className="text-white text-sm font-bold">
                    {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;


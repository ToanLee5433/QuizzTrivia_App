import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { Loading } from '../../../shared/components/layout/Loading';

import { useTranslation } from 'react-i18next';
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'creator' | ('admin' | 'creator')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { t } = useTranslation();

  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  console.log('🛡️ ProtectedRoute check:', {
    hasUser: !!user,
    isLoading,
    userRole: user?.role,
    requiredRole,
    userEmail: user?.email
  });

  if (isLoading) {
    console.log('🛡️ ProtectedRoute: Showing loading...');
    return <Loading message="Đang xác thực..." />;
  }

  if (!user) {
    console.log('🛡️ ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = allowedRoles.includes(user.role as 'admin' | 'creator') || user.role === 'admin';
    
    if (!hasRequiredRole) {
      console.log('🛡️ ProtectedRoute: Role mismatch, showing unauthorized');
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t("messages.unauthorized")}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t("auth.creatorOrAdminRequired")}
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >{t("common.back")}
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  console.log('🛡️ ProtectedRoute: Access granted, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;

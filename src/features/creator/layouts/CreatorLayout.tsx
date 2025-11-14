import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../lib/store';
import { ROUTES } from '../../../config/routes';
import CreatorNav from '../components/CreatorNav';

/**
 * CreatorLayout - Layout wrapper for all creator routes
 * Handles authentication and role-based access control
 */
const CreatorLayout: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation();
  const location = useLocation();

  // Check if user is logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.loginRequired')}
          </h2>
          <p className="text-gray-600">{t('creator.loginMessage')}</p>
        </div>
      </div>
    );
  }

  // Check if user has creator or admin role
  if (user.role !== 'creator' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('messages.unauthorized')}
          </h2>
          <p className="text-gray-600">{t('creator.roleRequired')}</p>
        </div>
      </div>
    );
  }

  // Redirect from /creator to /creator/my
  if (location.pathname === ROUTES.CREATOR) {
    return <Navigate to={ROUTES.CREATOR_MY_QUIZZES} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <CreatorNav />
      
      {/* Content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default CreatorLayout;

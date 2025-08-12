import React from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../lib/store';
import { auth } from '../../../lib/firebase/config';
import { signOut } from 'firebase/auth';
import LanguageSwitcher from '../LanguageSwitcher';

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const { t } = useTranslation();
  
  // Don't show navigation for login/register pages
  const authPages = ['/login', '/register'];
  if (authPages.includes(location.pathname)) {
    return <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="light" />
      </div>
      {children}
    </div>;
  }
  
  // Don't show navigation if no user, but exclude landing page (it has its own LanguageSwitcher)
  const landingPages = ['/', '/landing', '/home'];
  if (!user && !landingPages.includes(location.pathname)) {
    return <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="light" />
      </div>
      {children}
    </div>;
  }
  
  // For landing pages when not authenticated, don't add extra LanguageSwitcher
  if (!user && landingPages.includes(location.pathname)) {
    return <div>{children}</div>;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple Navigation Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-600">Quiz App</h1>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">{t('nav.dashboard', 'Dashboard')}</Link>
                <Link to="/quizzes" className="text-gray-700 hover:text-blue-600">{t('nav.quizzes', 'Quiz')}</Link>
                <Link to="/favorites" className="text-gray-700 hover:text-yellow-500">{t('nav.favorites', 'Favorites')}</Link>
                <Link to="/leaderboard" className="text-gray-700 hover:text-green-600">{t('nav.leaderboard', 'Leaderboard')}</Link>
                {(user?.role === 'creator' || user?.role === 'admin') ? (
                  <Link to="/creator" className="text-gray-700 hover:text-blue-600">{t('nav.creator', 'Creator')}</Link>
                ) : null}
                {user?.role === 'admin' ? (
                  <Link to="/admin" className="text-gray-700 hover:text-blue-600">{t('nav.admin', 'Admin')}</Link>
                ) : null}
                <Link to="/profile" className="text-gray-700 hover:text-blue-600">{t('nav.profile', 'Profile')}</Link>
                <button onClick={handleLogout} className="text-red-600 hover:text-red-800">
                  {t('auth.logout', 'Logout')}
                </button>
              </nav>
              <LanguageSwitcher variant="header" />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

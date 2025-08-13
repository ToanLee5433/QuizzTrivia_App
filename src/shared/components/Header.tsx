import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../lib/store';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';
import { Menu, X, User, LogOut, Settings, Crown, Zap, Home, BookOpen, Heart, Trophy, UserCircle, Plus } from 'lucide-react';

interface HeaderProps {
  user?: any; // Replace with proper type
}

const Header: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    // This should be handled by the logout function from your auth store
    navigate('/login');
  };

  const navigationItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/quizzes', label: t('nav.quizzes'), icon: BookOpen },
    { path: '/favorites', label: t('nav.favorites'), icon: Heart },
    { path: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
    { path: '/profile', label: t('nav.profile'), icon: UserCircle },
  ];

  // Add role-specific items
  if (user?.role === 'creator' || user?.role === 'admin') {
    navigationItems.push({ path: '/creator', label: t('nav.creator'), icon: Plus });
  }

  if (user?.role === 'admin') {
    navigationItems.push({ path: '/admin', label: t('nav.admin'), icon: Settings });
  }

  return (
    <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-2xl sticky top-0 z-50 backdrop-blur-lg border-b border-white/10 animate-gradient">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-indigo-700/90 backdrop-blur-xl"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 group">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-2 ring-white/40 shadow-xl cursor-pointer hover:bg-white/30 hover:scale-110 hover:rotate-6 transition-all duration-500 group-hover:shadow-2xl"
                 onClick={() => navigate('/')}>
              <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-white drop-shadow-lg group-hover:text-yellow-200 transition-colors duration-300" />
            </div>
            <div className="cursor-pointer group-hover:scale-105 transition-transform duration-300" onClick={() => navigate('/')}>
              <h1 className="text-xl lg:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">
                Quiz Trivia
              </h1>
              <p className="text-blue-100/90 text-xs lg:text-sm hidden sm:block font-medium">
                {t('landing.hero.title', 'Thử thách kiến thức của bạn')} ✨
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden lg:flex items-center space-x-1 bg-white/10 backdrop-blur-md rounded-2xl px-2 py-1 border border-white/20 shadow-lg">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = window.location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center px-4 py-2.5 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                      isActive 
                        ? 'bg-white/30 text-white shadow-lg ring-2 ring-white/40' 
                        : 'text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-2 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <LanguageSwitcher variant="header" />

            {/* Notification Center */}
            {user && (
              <div className="hidden sm:block">
                <NotificationCenter />
              </div>
            )}

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/30 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 group"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center ring-2 ring-white/40 shadow-lg group-hover:ring-white/60 transition-all duration-300">
                    <User className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-white text-sm font-semibold truncate max-w-32 lg:max-w-none">
                      {user?.displayName || user?.email || 'User'}
                    </p>
                    {user?.role && (
                      <p className="text-blue-100/90 text-xs flex items-center font-medium">
                        {user.role === 'admin' && <Crown className="w-3 h-3 mr-1 text-yellow-300" />}
                        {user.role === 'admin' ? t('ui.admin', 'Quản trị viên') : 
                         user.role === 'creator' ? t('ui.creator', 'Người tạo') : t('ui.user', 'Người dùng')}
                      </p>
                    )}
                  </div>
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 py-3 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-gray-200/60">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-base">{user?.displayName || user?.email}</p>
                          <p className="text-sm text-gray-600">{user?.email}</p>
                        </div>
                      </div>
                      {user?.role && (
                        <div className="mt-3">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                            user.role === 'admin' ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' :
                            user.role === 'creator' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                            'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
                          }`}>
                            {user.role === 'admin' && <Crown className="w-3 h-3 mr-1.5" />}
                             {user.role === 'admin' ? t('ui.admin', 'Admin') : 
                             user.role === 'creator' ? t('ui.creator', 'Creator') : t('ui.user', 'User')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center px-5 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 hover:text-blue-700 group"
                      >
                        <UserCircle className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">{t('profile.myProfile', 'Hồ sơ cá nhân')}</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center px-5 py-3 text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200 hover:text-red-700 group"
                      >
                        <LogOut className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">{t('auth.logout', 'Đăng xuất')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            {user && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-2xl text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg"
              >
                {isMobileMenuOpen ? 
                  <X className="w-6 h-6 rotate-180 transition-transform duration-300" /> : 
                  <Menu className="w-6 h-6 transition-transform duration-300" />
                }
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/30 bg-white/10 backdrop-blur-md rounded-b-3xl mt-2 mx-4 shadow-xl animate-in slide-in-from-top-2 duration-300">
            <nav className="space-y-1 px-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = window.location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 group ${
                      isActive 
                        ? 'bg-white/30 text-white shadow-lg ring-2 ring-white/40' 
                        : 'text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-base">{item.label}</span>
                  </button>
                );
              })}
              <div className="pt-4 border-t border-white/20 sm:hidden">
                <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md">
                  <NotificationCenter />
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;


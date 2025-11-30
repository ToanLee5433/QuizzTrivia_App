import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../lib/store';
import { ROUTES } from '../../config/routes';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase/config';
import { logout } from '../../features/auth/store';
import { toast } from 'react-toastify';
import NotificationCenter from './NotificationCenter';
import LanguageSwitcher from './LanguageSwitcher';
import { LogOut, Settings, Crown, GraduationCap, Home, BookOpen, Heart, Trophy, UserCircle, Plus, ChevronDown, HardDrive } from 'lucide-react';
import { setUserOffline } from '../../utils/presenceUtils';

interface HeaderProps {
  user?: any;
}

const Header: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect with hide/show
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      
      // Determine if navbar should be visible
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 10;
      
      setVisible(isVisible);
      setScrolled(currentScrollPos > 10);
      setPrevScrollPos(currentScrollPos);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      // Set presence to offline BEFORE signing out
      if (auth.currentUser) {
        await setUserOffline(auth.currentUser.uid);
      }
      
      await signOut(auth);
      dispatch(logout());
      toast.success('Đăng xuất thành công!');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  const navigationItems = [
    { path: '/dashboard', label: t('nav.home'), icon: Home },
    { path: '/quizzes', label: t('nav.quizzes'), icon: BookOpen },
    { path: '/favorites', label: t('nav.favorites'), icon: Heart },
    { path: '/downloaded', label: t('nav.downloaded'), icon: HardDrive },
    { path: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
  ];

  if (user?.role === 'creator' || user?.role === 'admin') {
    navigationItems.push({ path: ROUTES.CREATOR, label: t('nav.creator'), icon: Plus });
  }

  if (user?.role === 'admin') {
    navigationItems.push({ path: '/admin', label: t('nav.admin'), icon: Settings });
  }

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          visible ? 'translate-y-0' : '-translate-y-full'
        } ${
          scrolled 
            ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50 dark:border-slate-700/50' 
            : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-xl'
        }`}
      >
        <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-18">
            {/* Logo & Brand - Compact */}
            <div 
              className="flex items-center space-x-2 cursor-pointer group z-50 flex-shrink-0"
              onClick={() => navigate('/')}
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ring-2 shadow-md transition-all duration-500 ${
                scrolled 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 ring-blue-200 dark:ring-blue-800 group-hover:ring-blue-300 dark:group-hover:ring-blue-700' 
                  : 'bg-white/20 backdrop-blur-md ring-white/40 group-hover:ring-white/60'
              } group-hover:scale-110 group-hover:rotate-6`}>
                <GraduationCap className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                  scrolled ? 'text-white' : 'text-white group-hover:text-yellow-200'
                }`} />
              </div>
              <div className="group-hover:scale-105 transition-transform duration-300 hidden sm:block">
                <h1 className={`text-base sm:text-lg lg:text-xl font-bold transition-all duration-300 leading-tight ${
                  scrolled 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' 
                    : 'text-white'
                }`}>
                  {t('appName')}
                </h1>
                <p className={`text-xs hidden lg:block transition-colors duration-300 ${
                  scrolled ? 'text-slate-600 dark:text-slate-400' : 'text-blue-100/90'
                }`}>
                  {t('landing.hero.title')} ✨
                </p>
              </div>
            </div>

            {/* Desktop Navigation - Compact icons only on medium screens */}
            {user && (
              <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center max-w-3xl mx-4">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  // For dashboard, exact match. For other routes, use startsWith to catch sub-routes
                  const isActive = item.path === '/dashboard' 
                    ? location.pathname === '/dashboard' || location.pathname === '/'
                    : location.pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center px-3 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                        scrolled
                          ? isActive
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                          : isActive
                            ? 'bg-white text-purple-700 shadow-md'
                            : 'text-white/90 hover:text-white hover:bg-white/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs xl:text-sm ml-1.5 hidden xl:inline whitespace-nowrap">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Right Section - Compact */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 z-50 flex-shrink-0">
              {/* Language Switcher - Compact */}
              <div className="hidden sm:block">
                <LanguageSwitcher variant="header" />
              </div>

              {/* Notification Center - Compact */}
              {user && (
                <div className="hidden sm:block">
                  <NotificationCenter />
                </div>
              )}

              {/* User Menu - Compact */}
              {user && (
                <div className="relative z-[100]" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`flex items-center space-x-2 rounded-xl px-2 sm:px-3 py-2 transition-all duration-300 shadow-md hover:scale-105 group ${
                      scrolled
                        ? 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                        : 'bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30'
                    }`}
                  >
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user?.displayName || 'User'}
                        className="w-8 h-8 rounded-full object-cover ring-2 shadow-sm transition-all duration-300 ring-white/40 group-hover:ring-white/60"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-2 shadow-sm transition-all duration-300 ${
                        scrolled
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 ring-blue-200 dark:ring-blue-800 group-hover:ring-blue-300 dark:group-hover:ring-blue-700'
                          : 'bg-white/30 ring-white/40 group-hover:ring-white/60'
                      }`}>
                        <span className="text-white font-semibold text-sm">
                          {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="hidden lg:block text-left">
                      <p className={`text-sm font-semibold truncate max-w-24 xl:max-w-32 transition-colors leading-tight ${
                        scrolled ? 'text-slate-900 dark:text-slate-100' : 'text-white'
                      }`}>
                        {user?.displayName || user?.email || 'User'}
                      </p>
                      {user?.role && (
                        <p className={`text-xs flex items-center font-medium ${
                          scrolled ? 'text-slate-600 dark:text-slate-400' : 'text-blue-100/90'
                        }`}>
                          {user.role === 'admin' && <Crown className="w-3 h-3 mr-1 text-yellow-500" />}
                          {user.role === 'admin' ? t('ui.admin') : 
                           user.role === 'creator' ? t('ui.creator') : t('ui.user')}
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`hidden lg:block w-3.5 h-3.5 transition-transform duration-300 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    } ${scrolled ? 'text-slate-600 dark:text-slate-400' : 'text-white/90'}`} />
                  </button>
                  {/* User Dropdown - Refined */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[200] animate-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {user?.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user?.displayName || 'User'}
                              className="w-11 h-11 rounded-lg object-cover ring-2 ring-white/50 shadow-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center ring-2 ring-white/50 shadow-md flex-shrink-0">
                              <span className="text-white font-bold text-lg">
                                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm truncate">{user?.displayName || user?.email}</p>
                            <p className="text-xs text-blue-100 truncate">{user?.email}</p>
                          </div>
                        </div>
                        {user?.role && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                              user.role === 'admin' ? 'bg-yellow-400 text-yellow-900' :
                              user.role === 'creator' ? 'bg-green-400 text-green-900' :
                              'bg-gray-400 text-gray-900'
                            }`}>
                              {user.role === 'admin' && <Crown className="w-3 h-3 mr-1" />}
                              {user.role === 'admin' ? t('ui.admin') : 
                               user.role === 'creator' ? t('ui.creator') : t('ui.user')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            navigate('/profile');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-all duration-200 group"
                        >
                          <UserCircle className="w-4 h-4 mr-2.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">{t('profile.myProfile')}</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/settings');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all duration-200 group"
                        >
                          <Settings className="w-4 h-4 mr-2.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">Cài đặt</span>
                        </button>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 group"
                        >
                          <LogOut className="w-4 h-4 mr-2.5 group-hover:scale-110 transition-transform" />
                          <span className="font-medium text-sm">{t('auth.logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Menu Button - Compact */}
              {user && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`lg:hidden p-2 rounded-lg transition-all duration-300 hover:scale-110 ${
                    scrolled
                      ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                      : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20'
                  }`}
                  aria-label="Toggle menu"
                >
                  <div className="relative w-5 h-5">
                    <span className={`absolute left-0 w-5 h-0.5 rounded-full transition-all duration-300 ${
                      scrolled ? 'bg-gray-700' : 'bg-white'
                    } ${isMobileMenuOpen ? 'top-2.5 rotate-45' : 'top-1'}`} />
                    <span className={`absolute left-0 top-2.5 w-5 h-0.5 rounded-full transition-all duration-300 ${
                      scrolled ? 'bg-gray-700' : 'bg-white'
                    } ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
                    <span className={`absolute left-0 w-5 h-0.5 rounded-full transition-all duration-300 ${
                      scrolled ? 'bg-gray-700' : 'bg-white'
                    } ${isMobileMenuOpen ? 'top-2.5 -rotate-45' : 'top-4'}`} />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Refined */}
      {user && isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-14 sm:top-16 left-0 right-0 bg-white shadow-2xl z-[70] lg:hidden animate-in slide-in-from-top-4 duration-300 max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="py-3 px-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                // For dashboard, exact match. For other routes, use startsWith to catch sub-routes
                const isActive = item.path === '/dashboard' 
                  ? location.pathname === '/dashboard' || location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 group ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
              
              {/* Mobile-only items */}
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="sm:hidden px-2 py-2">
                  <LanguageSwitcher variant="header" />
                </div>
                <div className="sm:hidden px-2 py-2">
                  <NotificationCenter />
                </div>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Spacer to prevent content jump */}
      <div className="h-14 sm:h-16 lg:h-18" />
    </>
  );
};

export default Header;


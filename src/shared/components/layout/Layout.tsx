import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '../../../lib/store';
import Header from '../Header';
import LanguageSwitcher from '../LanguageSwitcher';

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Pages where header should be hidden initially (quiz pages)
  const isQuizPage = location.pathname.startsWith('/quiz/') && !location.pathname.includes('/result');
  const isResultPage = location.pathname.includes('/quiz-result') || location.pathname.includes('/result');
  
  // Scroll-reveal header logic for quiz pages
  useEffect(() => {
    if (!isQuizPage) {
      setShowHeader(true);
      return;
    }
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling down past 100px OR when at top
      if (currentScrollY < 10) {
        setShowHeader(false); // Hide at top on quiz page
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(true); // Show when scrolling down
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true); // Show when scrolling up
      }
      
      setLastScrollY(currentScrollY);
    };
    
    // Initially hide header on quiz pages
    setShowHeader(false);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isQuizPage, lastScrollY]);
  
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
  
  // For quiz pages, render without Layout wrapper (quiz has its own layout)
  if (isQuizPage) {
    return <div className="min-h-screen">{children}</div>;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 transition-all duration-500">
      {/* Use the new modern Header component - with scroll-reveal on result pages */}
      <div className={`transition-transform duration-300 ${!showHeader && isResultPage ? '-translate-y-full' : 'translate-y-0'}`}>
        <Header />
      </div>
      
      {/* Main Content */}
      <main className={`px-4 sm:px-6 lg:px-8 py-6 ${isResultPage ? 'pt-2' : ''}`}>
        {children}
      </main>
    </div>
  );
};

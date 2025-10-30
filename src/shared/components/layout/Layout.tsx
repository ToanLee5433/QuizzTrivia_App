import React from 'react';
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Use the new modern Header component */}
      <Header />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

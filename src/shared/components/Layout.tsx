import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
// import Footer from './Footer';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children || <Outlet />}
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;

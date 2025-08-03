import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import Header from './Header';
import Sidebar from './Sidebar';
// import Footer from './Footer';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex flex-1">
        {user && <Sidebar />}
        <main className={`flex-1 p-6 ${user ? 'ml-64' : ''}`}>
          {children || <Outlet />}
        </main>
      </div>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;

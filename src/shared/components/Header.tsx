import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  user?: any; // Replace with proper type
}

const Header: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 
              className="text-xl font-bold text-blue-600 cursor-pointer"
              onClick={() => navigate('/')}
            >
              Quiz Trivia App
            </h1>
          </div>
          
          {/* Notification Center for logged in users */}
          {user && (
            <div className="flex items-center space-x-4">
              <NotificationCenter />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;


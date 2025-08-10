import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import { LandingPage } from '../pages/LandingPage';

const RoleBasedRedirect: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // If not authenticated, show landing page
  if (!isAuthenticated || !user) {
    return <LandingPage />;
  }

  // If authenticated, redirect based on role
  switch (user.role) {
    case 'admin':
      return <Navigate to="/dashboard" replace />; // Admin cũng vào dashboard chính
    case 'creator':
      return <Navigate to="/dashboard" replace />; // Creator cũng vào dashboard chính
    case 'user':
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect;

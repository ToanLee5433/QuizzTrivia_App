import React from 'react';
import AdminStats from '../components/AdminStats';

const AdminStatsTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Admin Stats Test Page
          </h1>
          <p className="text-gray-600">
            Testing the new modern admin statistics dashboard
          </p>
        </div>
        
        <AdminStats />
      </div>
    </div>
  );
};

export default AdminStatsTestPage;

import React from 'react';
import FeedbackForm from '../components/FeedbackForm';
import { useNavigate } from 'react-router-dom';

const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12">
      <FeedbackForm 
        onSuccess={handleSuccess}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};

export default FeedbackPage;

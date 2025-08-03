import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface Quiz {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: Date;
  questions: any[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  isPublic: boolean;
}

interface AdminQuizManagementProps {}

const AdminQuizManagement: React.FC<AdminQuizManagementProps> = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for testing
      const mockQuizzes: Quiz[] = [
        {
          id: '1',
          title: 'Sample Quiz 1',
          description: 'Test quiz 1',
          status: 'pending',
          createdBy: 'user1',
          createdAt: new Date(),
          questions: [],
          difficulty: 'easy',
          category: 'Math',
          isPublic: true,
        },
        {
          id: '2',
          title: 'Sample Quiz 2',
          description: 'Test quiz 2',
          status: 'approved',
          createdBy: 'user2',
          createdAt: new Date(),
          questions: [],
          difficulty: 'medium',
          category: 'Science',
          isPublic: false,
        },
      ];
      
      setQuizzes(mockQuizzes);
    } catch (err) {
      setError('Failed to load quizzes');
      toast.error('Error loading quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (quizId: string) => {
    try {
      // Mock approval
      setQuizzes(prev => 
        prev.map(quiz => 
          quiz.id === quizId ? { ...quiz, status: 'approved' as const } : quiz
        )
      );
      toast.success('Quiz approved successfully');
    } catch (err) {
      toast.error('Failed to approve quiz');
    }
  };

  const handleReject = async (quizId: string) => {
    try {
      // Mock rejection
      setQuizzes(prev => 
        prev.map(quiz => 
          quiz.id === quizId ? { ...quiz, status: 'rejected' as const } : quiz
        )
      );
      toast.success('Quiz rejected successfully');
    } catch (err) {
      toast.error('Failed to reject quiz');
    }
  };

  const handleDelete = async (quizId: string) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
        toast.success('Quiz deleted successfully');
      } catch (err) {
        toast.error('Failed to delete quiz');
      }
    }
  };

  const handlePreview = (quizId: string) => {
    // Mock preview
    toast.info(`Previewing quiz ${quizId}`);
  };

  const handleCreateNew = () => {
    navigate('/admin/quiz/create');
  };

  const handleEdit = (quizId: string) => {
    navigate(`/admin/quiz/edit/${quizId}`);
  };

  const filteredQuizzes = quizzes.filter(quiz => 
    filterStatus === 'all' || quiz.status === filterStatus
  );

  const getStatusCounts = () => {
    return {
      all: quizzes.length,
      pending: quizzes.filter(q => q.status === 'pending').length,
      approved: quizzes.filter(q => q.status === 'approved').length,
      rejected: quizzes.filter(q => q.status === 'rejected').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading quizzes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
          <p className="mt-2 text-gray-600">Manage and review quiz submissions</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filterStatus === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({statusCounts.pending})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filterStatus === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Approved ({statusCounts.approved})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filterStatus === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected ({statusCounts.rejected})
              </button>
            </div>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create New Quiz
            </button>
          </div>
        </div>

        {/* Quiz List */}
        <div className="space-y-4">
          {filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-500 text-lg">
                {filterStatus === 'all' 
                  ? 'No quizzes found' 
                  : `No ${filterStatus} quizzes found`
                }
              </div>
              <p className="text-gray-400 mt-2">
                {filterStatus === 'all' && 'Create your first quiz to get started'}
              </p>
            </div>
          ) : (
            filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{quiz.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          quiz.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : quiz.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{quiz.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>By: {quiz.createdBy}</span>
                      <span>•</span>
                      <span>Category: {quiz.category}</span>
                      <span>•</span>
                      <span>Difficulty: {quiz.difficulty}</span>
                      <span>•</span>
                      <span>Questions: {quiz.questions.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handlePreview(quiz.id)}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleEdit(quiz.id)}
                      className="px-3 py-1 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    {quiz.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(quiz.id)}
                          className="px-3 py-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(quiz.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminQuizManagement;

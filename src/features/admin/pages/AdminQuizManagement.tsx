import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { RootState } from '../../../lib/store';
import { 
  Search, 
  Eye, 
  Check, 
  X, 
  Trash2, 
  User,
  BookOpen,
  Clock,
  BarChart3,
  RotateCcw,
  Edit3
} from 'lucide-react';

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
  isPublished?: boolean;
}

const AdminQuizManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function để xử lý date từ Firestore
  const parseFirestoreDate = (dateValue: any): Date => {
    if (!dateValue) {
      return new Date();
    }
    
    // Nếu là Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    // Nếu là Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Nếu là string hoặc number
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Nếu là object có seconds (Firestore server timestamp)
    if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }
    
    // Fallback
    console.warn('Unknown date format:', dateValue);
    return new Date();
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading quizzes from Firestore...');
      const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log('📊 Firestore response:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.length
      });
      
      const loadedQuizzes: Quiz[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📝 Quiz data raw:', { 
          id: doc.id, 
          title: data.title, 
          status: data.status, 
          createdAt: data.createdAt,
          createdAtType: typeof data.createdAt 
        });
        
        try {
          loadedQuizzes.push({
            id: doc.id,
            title: data.title || 'Untitled Quiz',
            description: data.description || '',
            status: data.status || 'pending',
            createdBy: data.createdBy || 'unknown',
            createdAt: parseFirestoreDate(data.createdAt),
            questions: data.questions || [],
            difficulty: data.difficulty || 'easy',
            category: data.category || 'general',
            isPublic: data.isPublic || false,
            isPublished: data.isPublished || false
          });
        } catch (error) {
          console.error('Error parsing quiz:', doc.id, error);
          // Skip invalid quiz
        }
      });
      
      console.log('✅ Loaded quizzes:', loadedQuizzes.length);
      setQuizzes(loadedQuizzes);
      
      // Nếu không có quiz, hiển thị empty state
      if (loadedQuizzes.length === 0) {
        console.log('⚠️ No quizzes found, showing empty state');
        toast.info('Chưa có quiz nào trong hệ thống');
      }
      
    } catch (error) {
      console.error('❌ Error loading quizzes:', error);
      setError('Không thể tải danh sách quiz');
      toast.error('Không thể tải danh sách quiz: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (quizId: string) => {
    navigate(`/admin/edit-quiz/${quizId}`);
  };

  const handlePreview = (quiz: Quiz) => {
    setPreviewQuiz(quiz);
    setShowPreview(true);
  };

  const handleApprove = async (quizId: string) => {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        status: 'approved',
        isPublished: true,
        approvedAt: new Date(),
        approvedBy: user?.uid
      });
      
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === quizId 
          ? { ...quiz, status: 'approved' as const, isPublished: true }
          : quiz
      ));
      
      toast.success('Đã phê duyệt quiz thành công!');
    } catch (error) {
      console.error('Error approving quiz:', error);
      toast.error('Không thể duyệt quiz');
    }
  };

  const handleReject = async (quizId: string) => {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        status: 'rejected',
        isPublished: false,
        rejectedAt: new Date(),
        rejectedBy: user?.uid
      });
      
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === quizId 
          ? { ...quiz, status: 'rejected' as const, isPublished: false }
          : quiz
      ));
      
      toast.success('Đã từ chối quiz!');
    } catch (error) {
      console.error('Error rejecting quiz:', error);
      toast.error('Không thể từ chối quiz');
    }
  };

  const handleReopen = async (quizId: string) => {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        status: 'pending',
        isPublished: false,
        reopenedAt: new Date(),
        reopenedBy: user?.uid
      });
      
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === quizId 
          ? { ...quiz, status: 'pending' as const, isPublished: false }
          : quiz
      ));
      
      toast.success('Đã mở lại quiz để xem xét!');
    } catch (error) {
      console.error('Error reopening quiz:', error);
      toast.error('Không thể mở lại quiz');
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa quiz này không?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting quiz from database:', quizId);
      await deleteDoc(doc(db, 'quizzes', quizId));
      console.log('✅ Quiz deleted from database successfully');
      
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
      toast.success('Quiz đã được xóa khỏi database');
    } catch (error) {
      console.error('❌ Error deleting quiz:', error);
      toast.error('Không thể xóa quiz: ' + error);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesFilter = filterStatus === 'all' || quiz.status === filterStatus;
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusCounts = () => {
    return {
      all: quizzes.length,
      pending: quizzes.filter(q => q.status === 'pending').length,
      approved: quizzes.filter(q => q.status === 'approved').length,
      rejected: quizzes.filter(q => q.status === 'rejected').length
    };
  };

  const statusCounts = getStatusCounts();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Đã duyệt</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">❌ Từ chối</span>;
      default:
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">⏳ Chờ duyệt</span>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">🟢 Dễ</span>;
      case 'hard':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">🔴 Khó</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">🟡 Trung bình</span>;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⛔ Không có quyền truy cập</h1>
          <p className="text-gray-600">Bạn cần quyền admin để truy cập trang này.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Lỗi</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadQuizzes}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">{/* Modern Responsive Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-2 ring-white/30 shadow-lg">
                <BookOpen className="w-6 h-6 lg:w-7 lg:h-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-sm">Quản lý Quiz</h1>
                <p className="text-blue-100 text-sm lg:text-base mt-1">Duyệt và quản lý tất cả quiz trong hệ thống</p>
              </div>
            </div>
            
            {/* Actions & User Info */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              <button
                onClick={loadQuizzes}
                className="w-full sm:w-auto px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl"
                title="Làm mới danh sách"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="font-medium">Làm mới</span>
              </button>
              
              {/* User Badge */}
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 shadow-lg">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center ring-2 ring-white/30">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-white text-sm font-medium truncate max-w-32 lg:max-w-none">{user?.email}</span>
                  <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-full text-xs font-bold shadow-sm">
                    Admin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng Quiz</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chờ duyệt</p>
                <p className="text-2xl font-bold text-orange-600">{statusCounts.pending}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã duyệt</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã từ chối</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm quiz theo tiêu đề, mô tả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Chờ duyệt
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Đã duyệt
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'rejected'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>

        {/* Quiz List */}
        {filteredQuizzes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {searchTerm ? 'Không tìm thấy quiz phù hợp' : 'Chưa có quiz nào'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm 
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem thêm quiz.'
                : 'Hiện tại chưa có quiz nào trong hệ thống. Người tạo có thể tạo quiz từ trang Creator.'
              }
            </p>
            {!searchTerm && (
              <div className="flex justify-center">
                <button
                  onClick={() => window.open('/creator', '_blank')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Đi đến trang Creator
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{quiz.title}</h3>
                      {getStatusBadge(quiz.status)}
                      {getDifficultyBadge(quiz.difficulty)}
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">{quiz.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Danh mục:</span> {quiz.category}
                      </div>
                      <div>
                        <span className="font-medium">Số câu hỏi:</span> {quiz.questions.length}
                      </div>
                      <div>
                        <span className="font-medium">Tạo lúc:</span> {quiz.createdAt.toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions - 6 chức năng: View, Edit, Approve, Reject, Reopen, Delete */}
                  <div className="flex items-center gap-2 ml-6">
                    {/* 1. Xem trước (luôn hiển thị) */}
                    <button
                      onClick={() => handlePreview(quiz)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Xem trước chi tiết"
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                    {/* 2. Chỉnh sửa (luôn hiển thị) */}
                    <button
                      onClick={() => handleEdit(quiz.id)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Chỉnh sửa quiz"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    
                    {/* 3 & 4. Duyệt & Từ chối (chỉ hiển thị khi pending) */}
                    {quiz.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(quiz.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Phê duyệt quiz"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(quiz.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Từ chối quiz"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* 5. Mở lại (hiển thị khi đã duyệt hoặc từ chối) */}
                    {(quiz.status === 'approved' || quiz.status === 'rejected') && (
                      <button
                        onClick={() => handleReopen(quiz.id)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Mở lại để xem xét"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}
                    
                    {/* 6. Xóa (luôn hiển thị) */}
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa quiz vĩnh viễn"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Xem trước Quiz: {previewQuiz.title}</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Mô tả:</h3>
                  <p className="text-gray-600">{previewQuiz.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Danh mục:</span> {previewQuiz.category}
                  </div>
                  <div>
                    <span className="font-semibold">Độ khó:</span> {previewQuiz.difficulty}
                  </div>
                  <div>
                    <span className="font-semibold">Số câu hỏi:</span> {previewQuiz.questions.length}
                  </div>
                  <div>
                    <span className="font-semibold">Trạng thái:</span> {getStatusBadge(previewQuiz.status || 'pending')}
                  </div>
                </div>

                {previewQuiz.questions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">Câu hỏi:</h3>
                    <div className="space-y-4">
                      {previewQuiz.questions.map((question: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">{index + 1}. {question.text}</h4>
                          {question.answers && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {question.answers.map((answer: any, answerIndex: number) => (
                                <div 
                                  key={answerIndex} 
                                  className={`p-2 rounded ${answer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}
                                >
                                  {String.fromCharCode(65 + answerIndex)}. {answer.text}
                                  {answer.isCorrect && ' ✓'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizManagement;

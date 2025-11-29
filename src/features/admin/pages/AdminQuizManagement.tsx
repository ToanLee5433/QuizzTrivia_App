import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../config/routes';
import { 
  collection, 
  getDocs,
  getDoc,
  doc, 
  updateDoc, 
  query, 
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { RootState } from '../../../lib/store';
import { useNotifications } from '../../../hooks/useNotifications';
import { formatDate } from '../../../lib/utils/helpers';
import { removeQuiz } from '../../quiz/store';
import { deleteQuiz as deleteQuizApi } from '../../quiz/api/base';
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
  Edit3,
  AlertCircle,
  FileText,
  MoreVertical,
  Lock,
  Shield
} from 'lucide-react';
import SafeHTML from '../../../shared/components/ui/SafeHTML';
import QuizPreview from '../components/QuizPreview';


interface Quiz {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  authorName?: string; // Tên người tạo
  createdAt: Date;
  updatedAt?: Date;
  questions: any[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  isPublic: boolean;
  isPublished?: boolean;
  editRequests?: EditRequest[];
  learningResources?: any[]; // Tài liệu học tập
  duration?: number;
  tags?: string[];
  password?: string;
  havePassword?: string;
  visibility?: string;
}

interface EditRequest {
  id: string;
  requestedBy: string;
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
}

const AdminQuizManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifyQuizApproved, notifyQuizRejected, notifyEditRequestApproved, notifyEditRequestRejected } = useNotifications();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [activeTab, setActiveTab] = useState<'quizzes' | 'editRequests'>('quizzes');
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

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading quizzes from Firestore (excluding drafts)...');
      // 📝 Filter out drafts - Admin should only see pending/approved/rejected quizzes
      const q = query(
        collection(db, 'quizzes'),
        where('status', 'in', ['pending', 'approved', 'rejected']),
        orderBy('createdAt', 'desc')
      );
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
            updatedAt: data.updatedAt ? parseFirestoreDate(data.updatedAt) : undefined,
            questions: data.questions || [],
            difficulty: data.difficulty || 'easy',
            category: data.category || 'general',
            isPublic: data.isPublic || false,
            isPublished: data.isPublished || false,
            learningResources: data.learningResources || data.resources || [],
            duration: data.duration || data.timeLimit,
            tags: data.tags || [],
            password: data.password,
            havePassword: data.havePassword,
            visibility: data.visibility
          });
        } catch (error) {
          console.error('Error parsing quiz:', doc.id, error);
          // Skip invalid quiz
        }
      });
      
      console.log('✅ Loaded quizzes:', loadedQuizzes.length);
      
      // Fetch author names for all quizzes
      const uniqueUserIds = [...new Set(loadedQuizzes.map(q => q.createdBy).filter(Boolean))];
      const userNames: Record<string, string> = {};
      
      // Batch fetch user names
      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userNames[userId] = userData.displayName || userData.email?.split('@')[0] || userId;
            }
          } catch (err) {
            console.warn('Could not fetch user:', userId);
          }
        })
      );
      
      // Update quizzes with author names
      const quizzesWithAuthorNames = loadedQuizzes.map(q => ({
        ...q,
        authorName: userNames[q.createdBy] || q.createdBy
      }));
      
      setQuizzes(quizzesWithAuthorNames);
      
      // Nếu không có quiz, hiển thị empty state
      if (loadedQuizzes.length === 0) {
        console.log('⚠️ No quizzes found, showing empty state');
        toast.info(t('admin.quizManagement.empty.noQuizzesInSystem'));
      }
      
    } catch (error) {
      console.error('❌ Error loading quizzes:', error);
      setError(t('admin.quizManagement.errors.loadFailed'));
      toast.error(t('admin.quizManagement.errors.loadFailed') + ': ' + error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadEditRequests = useCallback(async () => {
    try {
      console.log('🔍 Loading edit requests...');
      
      // First approach: Try with simple query and client-side filtering/sorting
      const q = query(
        collection(db, 'editRequests'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      const loadedRequests: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedRequests.push({
          id: doc.id,
          ...data,
          requestedAt: parseFirestoreDate(data.requestedAt)
        });
      });
      
      // Sort by requestedAt descending on client side
      loadedRequests.sort((a, b) => {
        const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
        const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
        return bTime - aTime;
      });
      
      console.log('✅ Loaded edit requests:', loadedRequests.length);
      setEditRequests(loadedRequests);
      
    } catch (error) {
      console.error('❌ Error loading edit requests:', error);
      
      // Fallback: Load all edit requests and filter client-side
      try {
        console.log('🔄 Trying fallback approach...');
        const fallbackQ = query(collection(db, 'editRequests'));
        const fallbackSnapshot = await getDocs(fallbackQ);
        
        const allRequests: any[] = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'pending') {
            allRequests.push({
              id: doc.id,
              ...data,
              requestedAt: parseFirestoreDate(data.requestedAt)
            });
          }
        });
        
        // Sort by requestedAt descending
        allRequests.sort((a, b) => {
          const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
          const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
          return bTime - aTime;
        });
        
        console.log('✅ Fallback loaded edit requests:', allRequests.length);
        setEditRequests(allRequests);
        
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setEditRequests([]);
      }
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
    loadEditRequests();
  }, [loadQuizzes, loadEditRequests]);

  const handleEdit = (quizId: string) => {
    navigate(`/admin/edit-quiz/${quizId}`);
  };

  const handlePreview = (quiz: Quiz) => {
    setPreviewQuiz(quiz);
    setShowPreview(true);
  };

  const handleApprove = async (quizId: string) => {
    try {
      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz) return;

      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        status: 'approved',
        isPublished: true,
        approvedAt: Timestamp.now(),
        approvedBy: user?.uid,
        updatedAt: Timestamp.now()  // ✅ Update timestamp when approved
      });
      
      setQuizzes(prev => prev.map(q => 
        q.id === quizId 
          ? { ...q, status: 'approved' as const, isPublished: true }
          : q
      ));

      // Send notification to quiz creator
      if (quiz.createdBy) {
        await notifyQuizApproved(
          quiz.createdBy,
          quizId,
          quiz.title
        );
      }
      
      toast.success(t('admin.quizManagement.success.approved'));
    } catch (error) {
      console.error('Error approving quiz:', error);
      toast.error(t('admin.quizManagement.errors.approveFailed'));
    }
  };

  const handleReject = async (quizId: string) => {
    try {
      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz) return;

      const reason = prompt(t('admin.quizManagement.rejectReasonPrompt', 'Reason for rejection (optional):'));

      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        status: 'rejected',
        isPublished: false,
        rejectedAt: Timestamp.now(),
        rejectedBy: user?.uid,
        rejectionReason: reason || undefined,
        updatedAt: Timestamp.now()  // ✅ Update timestamp when rejected
      });
      
      setQuizzes(prev => prev.map(q => 
        q.id === quizId 
          ? { ...q, status: 'rejected' as const, isPublished: false }
          : q
      ));

      // Send notification to quiz creator
      if (quiz.createdBy) {
        await notifyQuizRejected(
          quiz.createdBy,
          quizId,
          quiz.title,
          reason || undefined
        );
      }
      
      toast.success(t('admin.quizManagement.success.rejected'));
    } catch (error) {
      console.error('Error rejecting quiz:', error);
      toast.error(t('admin.quizManagement.errors.rejectFailed'));
    }
  };

  const handleApproveEditRequest = async (requestId: string, quizId: string) => {
    try {
      const editRequest = editRequests.find(req => req.id === requestId);
      if (!editRequest) {
        toast.error(t('admin.editRequests.errors.notFound'));
        return;
      }

      // Update edit request status
      const requestRef = doc(db, 'editRequests', requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        reviewedBy: user?.uid,
        reviewedByName: user?.displayName || 'Admin',
        reviewedAt: new Date()
      });

      // GỠ QUIZ XUỐNG ĐỂ SỬA: Set quiz status to draft và allow edit
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        status: 'draft', // Gỡ quiz xuống draft để sửa
        isApproved: false, // Bỏ approved status
        canEdit: true, // Cho phép creator edit
        editRequestApproved: true,
        lastEditRequestApproved: new Date(),
        approvedBy: user?.uid,
        needsReApproval: true // Flag để biết quiz này cần được duyệt lại sau khi sửa
      });

      // Send notification using notification service
      await notifyEditRequestApproved(
        editRequest.requestedBy,
        quizId,
        editRequest.quizTitle
      );

      // Remove from edit requests list
      setEditRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast.success(t('admin.editRequests.success.approved', { 
        userName: editRequest.requestedByName || editRequest.requestedByEmail 
      }));
    } catch (error) {
      console.error('Error approving edit request:', error);
      toast.error(t('admin.editRequests.errors.approveFailed'));
    }
  };

  const handleRejectEditRequest = async (requestId: string) => {
    try {
      const editRequest = editRequests.find(req => req.id === requestId);
      if (!editRequest) {
        toast.error(t('admin.editRequests.errors.notFound'));
        return;
      }

      const reason = prompt(t('admin.editRequests.rejectReasonPrompt', 'Reason for rejection (optional):'));

      const requestRef = doc(db, 'editRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewedBy: user?.uid,
        reviewedByName: user?.displayName || 'Admin',
        reviewedAt: new Date(),
        rejectionReason: reason || undefined
      });

      // Send notification using notification service
      await notifyEditRequestRejected(
        editRequest.requestedBy,
        editRequest.quizId,
        editRequest.quizTitle,
        reason || undefined
      );

      // Remove from edit requests list
      setEditRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast.success(t('admin.editRequests.success.rejected', { 
        userName: editRequest.requestedByName || editRequest.requestedByEmail 
      }));
    } catch (error) {
      console.error('Error rejecting edit request:', error);
      toast.error(t('admin.editRequests.errors.rejectFailed'));
    }
  };

  const handleReopen = async (quizId: string) => {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        status: 'pending',
        isPublished: false,
        reopenedAt: Timestamp.now(),
        reopenedBy: user?.uid,
        updatedAt: Timestamp.now()  // ✅ Update timestamp when reopened
      });
      
      setQuizzes(prev => prev.map(quiz => 
        quiz.id === quizId 
          ? { ...quiz, status: 'pending' as const, isPublished: false }
          : quiz
      ));
      
      toast.success(t('admin.quizManagement.success.reopened'));
    } catch (error) {
      console.error('Error reopening quiz:', error);
      toast.error(t('admin.quizManagement.errors.reopenFailed'));
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!window.confirm(t('admin.quizManagement.confirmDelete'))) {
      return;
    }

    try {
      console.log('🗑️ Deleting quiz from database:', quizId);
      
      // Use proper deleteQuiz API that handles subcollections
      await deleteQuizApi(quizId);
      console.log('✅ Quiz deleted from database successfully');
      
      // Update local state
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
      
      // Also update Redux store
      dispatch(removeQuiz(quizId));
      
      toast.success(t('admin.quizManagement.success.deleted'));
    } catch (error) {
      console.error('❌ Error deleting quiz:', error);
      toast.error(t('admin.quizManagement.errors.deleteFailed') + ': ' + error);
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
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ {t('status.approved')}</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">❌ {t('status.rejected')}</span>;
      default:
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">⏳ {t('status.pending')}</span>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">🟢 {t('quiz.difficulty.easy')}</span>;
      case 'hard':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">🔴 {t('quiz.difficulty.hard')}</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">🟡 {t('quiz.difficulty.medium')}</span>;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⛔ {t('errors.unauthorized')}</h1>
          <p className="text-gray-600">{t('admin.loginAsAdmin')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loadingData')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ {t('error')}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadQuizzes}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Modern Responsive Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-2 ring-white/30 shadow-lg">
                <BookOpen className="w-6 h-6 lg:w-7 lg:h-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-sm">{t('admin.quizManagement.label')}</h1>
                <p className="text-blue-100 text-sm lg:text-base mt-1">{t('admin.quizManagement.description')}</p>
              </div>
            </div>
            
            {/* Actions & User Info */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              <button
                onClick={() => {loadQuizzes(); loadEditRequests();}}
                className="w-full sm:w-auto px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl"
                title="Làm mới danh sách"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="font-medium">{t('refresh')}</span>
              </button>
              
              {/* User Badge */}
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20 shadow-lg">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-white text-sm font-medium truncate max-w-32 lg:max-w-none">{user?.email}</span>
                  <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-full text-xs font-bold shadow-sm">
                    {t('admin.quizManagement.adminBadge')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('admin.quizManagement.cards.totalQuizzes')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('status.pending')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('status.approved')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('status.rejected')}</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'quizzes'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t('admin.quizManagement.tab.quizzes')}
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {quizzes.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('editRequests')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'editRequests'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t('admin.quizManagement.tab.editRequests')}
                <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                  {editRequests.length}
                </span>
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'quizzes' && (
          <>
        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('admin.quizManagement.searchPlaceholder')}
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
                {t('common.all')}
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {t('status.pending')}
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {t('status.approved')}
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'rejected'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {t('status.rejected')}
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
              {searchTerm ? t('admin.quizManagement.empty.noMatchTitle') : t('admin.quizManagement.empty.noQuizzesTitle')}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm 
                ? t('admin.quizManagement.empty.noMatchDesc')
                : t('admin.quizManagement.empty.noQuizzesDesc')
              }
            </p>
            {!searchTerm && (
              <div className="flex justify-center">
                <button
                  onClick={() => window.open(ROUTES.CREATOR, '_blank')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  {t('admin.quizManagement.empty.goToCreator')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredQuizzes.map((quiz) => {
              const hasPassword = quiz.havePassword === 'password' || quiz.visibility === 'password';
              
              return (
                <div key={quiz.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 overflow-hidden">
                  {/* Main Content - 2 Column Layout */}
                  <div className="flex flex-col lg:flex-row">
                    {/* Left Column (70%) - Quiz Information */}
                    <div className="flex-1 lg:w-[70%] p-4 sm:p-5">
                      {/* Header: Title + Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate mb-2">{quiz.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(quiz.status)}
                            {getDifficultyBadge(quiz.difficulty)}
                            {/* Password Protection Badge */}
                            {hasPassword && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                <Lock className="w-3 h-3" />
                                {t('quiz.myQuizzes.badge.password', 'Có mật khẩu')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Dropdown Menu for secondary actions */}
                        <div className="relative group">
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                            <button
                              onClick={() => handlePreview(quiz)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              {t('admin.quizManagement.tooltips.preview', 'Xem trước')}
                            </button>
                            <button
                              onClick={() => handleEdit(quiz.id)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              {t('admin.quizManagement.tooltips.edit', 'Chỉnh sửa')}
                            </button>
                            {(quiz.status === 'approved' || quiz.status === 'rejected') && (
                              <button
                                onClick={() => handleReopen(quiz.id)}
                                className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                              >
                                <RotateCcw className="w-4 h-4" />
                                {t('admin.quizManagement.tooltips.reopen', 'Mở lại duyệt')}
                              </button>
                            )}
                            <hr className="my-1 border-gray-200" />
                            <button
                              onClick={() => handleDelete(quiz.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('admin.quizManagement.tooltips.delete', 'Xóa quiz')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {quiz.description && (
                        <SafeHTML content={quiz.description} className="text-gray-600 mb-4 line-clamp-2 text-sm" />
                      )}

                      {/* Info Grid - 2x2 on mobile, 4 cols on desktop */}
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 text-sm">
                        {/* Creator */}
                        <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                          <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-xs text-blue-600 font-medium">{t('admin.preview.createdBy', 'Người tạo')}</div>
                            <div className="text-gray-900 font-semibold truncate text-xs sm:text-sm">{quiz.authorName || t('common.unknown')}</div>
                          </div>
                        </div>
                        
                        {/* Category */}
                        <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                          <BookOpen className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-xs text-purple-600 font-medium">{t('admin.quizManagement.table.category', 'Chủ đề')}</div>
                            <div className="text-gray-900 font-semibold truncate text-xs sm:text-sm">{quiz.category || t('common.unknown')}</div>
                          </div>
                        </div>
                        
                        {/* Questions Count */}
                        <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                          <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-xs text-green-600 font-medium">{t('quiz.questions', 'Câu hỏi')}</div>
                            <div className="text-gray-900 font-semibold text-xs sm:text-sm">{quiz.questions?.length || 0}</div>
                          </div>
                        </div>
                        
                        {/* Created Date */}
                        <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2">
                          <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-xs text-orange-600 font-medium">{t('admin.quizManagement.table.createdAt', 'Ngày tạo')}</div>
                            <div className="text-gray-900 font-semibold text-xs sm:text-sm">{quiz.createdAt?.toLocaleDateString('vi-VN')}</div>
                          </div>
                        </div>
                      </div>

                      {/* Extra Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap mt-3">
                        {/* Password info with actual password for admin */}
                        {hasPassword && quiz.password && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <Shield className="w-4 h-4 text-yellow-600" />
                            <span className="text-xs text-yellow-700">
                              {t('admin.preview.password', 'Mật khẩu')}: <code className="font-mono bg-yellow-100 px-1 rounded">{quiz.password}</code>
                            </span>
                          </div>
                        )}
                        
                        {/* Learning Resources Badge */}
                        {quiz.learningResources && quiz.learningResources.length > 0 && (
                          <>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-medium text-emerald-700">
                                {t('admin.quizManagement.learningResourcesCount', { count: quiz.learningResources.length })}
                              </span>
                            </div>
                            {quiz.learningResources.some((r: any) => r.required) && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                                ⚠️ {t('admin.quizManagement.hasRequiredResources')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Column (30%) - Actions Panel */}
                    <div className="lg:w-[30%] bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-5 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col justify-center">
                      {quiz.status === 'pending' ? (
                        /* Pending: Show large Approve/Reject buttons + quick actions */
                        <div className="space-y-2 sm:space-y-3">
                          <div className="text-center mb-1 sm:mb-2">
                            <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.quizManagement.pendingActions', 'Chờ xử lý')}
                            </span>
                          </div>
                          
                          {/* Main Actions: Approve & Reject */}
                          <button
                            onClick={() => handleApprove(quiz.id)}
                            className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                          >
                            <Check className="w-4 sm:w-5 h-4 sm:h-5" />
                            <span className="hidden sm:inline">{t('admin.quizManagement.actions.approve', 'Duyệt Quiz')}</span>
                            <span className="sm:hidden">{t('common.approve', 'Duyệt')}</span>
                          </button>
                          <button
                            onClick={() => handleReject(quiz.id)}
                            className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                          >
                            <X className="w-4 sm:w-5 h-4 sm:h-5" />
                            <span className="hidden sm:inline">{t('admin.quizManagement.actions.reject', 'Từ chối')}</span>
                            <span className="sm:hidden">{t('common.reject', 'Từ chối')}</span>
                          </button>
                          
                          {/* Secondary Actions Row */}
                          <div className="pt-2 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-1 sm:gap-2">
                              <button
                                onClick={() => handlePreview(quiz)}
                                className="py-1.5 sm:py-2 px-1 sm:px-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-gray-200 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs"
                                title={t('admin.quizManagement.tooltips.preview')}
                              >
                                <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                <span className="truncate">{t('common.view', 'Xem')}</span>
                              </button>
                              <button
                                onClick={() => handleEdit(quiz.id)}
                                className="py-1.5 sm:py-2 px-1 sm:px-2 bg-white hover:bg-purple-50 text-purple-600 rounded-lg transition-colors border border-gray-200 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs"
                                title={t('admin.quizManagement.tooltips.edit')}
                              >
                                <Edit3 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                <span className="truncate">{t('common.edit', 'Sửa')}</span>
                              </button>
                              <button
                                onClick={() => handleDelete(quiz.id)}
                                className="py-1.5 sm:py-2 px-1 sm:px-2 bg-white hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-gray-200 flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs"
                                title={t('admin.quizManagement.tooltips.delete')}
                              >
                                <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                <span className="truncate">{t('common.delete', 'Xóa')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Approved/Rejected: Show status info and quick actions */
                        <div className="text-center space-y-2 sm:space-y-3">
                          <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium text-xs sm:text-sm ${
                            quiz.status === 'approved' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {quiz.status === 'approved' ? (
                              <><Check className="w-4 sm:w-5 h-4 sm:h-5" /> {t('status.approved', 'Đã duyệt')}</>
                            ) : (
                              <><X className="w-4 sm:w-5 h-4 sm:h-5" /> {t('status.rejected', 'Đã từ chối')}</>
                            )}
                          </div>
                          
                          {/* Action buttons */}
                          <div className="grid grid-cols-2 gap-1 sm:gap-2">
                            <button
                              onClick={() => handlePreview(quiz)}
                              className="py-1.5 sm:py-2 px-2 sm:px-3 bg-white hover:bg-blue-50 text-blue-600 font-medium rounded-lg transition-colors border border-blue-200 flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
                            >
                              <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                              <span className="hidden sm:inline">{t('common.view', 'Xem')}</span>
                              <span className="sm:hidden">👁️</span>
                            </button>
                            <button
                              onClick={() => handleEdit(quiz.id)}
                              className="py-1.5 sm:py-2 px-2 sm:px-3 bg-white hover:bg-purple-50 text-purple-600 font-medium rounded-lg transition-colors border border-purple-200 flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
                            >
                              <Edit3 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                              <span className="hidden sm:inline">{t('common.edit', 'Sửa')}</span>
                              <span className="sm:hidden">✏️</span>
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 sm:gap-2">
                            <button
                              onClick={() => handleReopen(quiz.id)}
                              className="py-1.5 sm:py-2 px-2 sm:px-3 bg-white hover:bg-orange-50 text-orange-600 font-medium rounded-lg transition-colors border border-orange-200 flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
                            >
                              <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                              <span className="hidden sm:inline">{t('admin.quizManagement.actions.reopen', 'Mở lại')}</span>
                              <span className="sm:hidden">🔄</span>
                            </button>
                            <button
                              onClick={() => handleDelete(quiz.id)}
                              className="py-1.5 sm:py-2 px-2 sm:px-3 bg-white hover:bg-red-50 text-red-600 font-medium rounded-lg transition-colors border border-red-200 flex items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
                            >
                              <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                              <span className="hidden sm:inline">{t('common.delete', 'Xóa')}</span>
                              <span className="sm:hidden">🗑️</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}

        {activeTab === 'editRequests' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  {t('admin.quizManagement.editRequestsTitle', { count: editRequests.length })}
                </h3>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  {editRequests.length} {t('admin.editRequests.pendingCount', 'yêu cầu chờ xử lý')}
                </span>
              </div>
            </div>
            
            {editRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-700 font-medium mb-2">{t("admin.editRequests.emptyTitle")}</p>
                <p className="text-sm text-gray-400">{t("admin.editRequests.emptyDesc")}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {editRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 overflow-hidden">
                    {/* Main Content - 2 Column Layout like Quiz Cards */}
                    <div className="flex flex-col lg:flex-row">
                      {/* Left Column (70%) - Request Information */}
                      <div className="flex-1 lg:w-[70%] p-4 sm:p-5">
                        {/* Header: User Info + Status Badge */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg truncate">
                              {request.requestedByName || request.requestedByEmail || t('admin.quizManagement.unknownUser')}
                            </h4>
                            <p className="text-sm text-gray-500 truncate">
                              {request.requestedByEmail || request.requestedBy || t('admin.quizManagement.unknownEmail')}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold flex-shrink-0">
                            ⏳ {t("admin.editRequests.pending", "Chờ duyệt")}
                          </span>
                        </div>
                        
                        {/* Quiz Info Card */}
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                            <h5 className="font-semibold text-gray-900">
                              {request.quizTitle || t('admin.quizManagement.unknownQuiz')}
                            </h5>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-600 min-w-[80px]">{t('admin.quizManagement.requestReason')}:</span>
                              <span className="text-sm text-gray-800">{request.reason || t('admin.quizManagement.noReason')}</span>
                            </div>
                            {request.description && (
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-gray-600 min-w-[80px]">{t('admin.quizManagement.requestDetails')}:</span>
                                <span className="text-sm text-gray-700">{request.description}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Time Info */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{t('admin.editRequests.requestedAt', 'Yêu cầu lúc')}:</span>
                          <span className="font-medium text-gray-700">
                            {request.requestedAt ? formatDate(request.requestedAt, 'long') : t('admin.quizManagement.unknownTime')}
                          </span>
                        </div>
                      </div>

                      {/* Right Column (30%) - Actions Panel */}
                      <div className="lg:w-[30%] bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-5 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col justify-center">
                        <div className="space-y-3">
                          <div className="text-center mb-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('admin.editRequests.actionsTitle', 'Xử lý yêu cầu')}
                            </span>
                          </div>
                          
                          {/* Approve Button */}
                          <button
                            onClick={() => handleApproveEditRequest(request.id, request.quizId)}
                            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            title={t("admin.editRequests.approveTitle")}
                          >
                            <Check className="w-5 h-5" />
                            {t("admin.editRequests.approve", "Chấp nhận")}
                          </button>
                          
                          {/* Reject Button */}
                          <button
                            onClick={() => handleRejectEditRequest(request.id)}
                            className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            title={t("admin.editRequests.rejectTitle")}
                          >
                            <X className="w-5 h-5" />
                            {t("admin.editRequests.reject", "Từ chối")}
                          </button>
                          
                          {/* View Quiz Button */}
                          {request.quizId && (
                            <button
                              onClick={() => handleEdit(request.quizId)}
                              className="w-full py-2 px-3 bg-white hover:bg-blue-50 text-blue-600 font-medium rounded-lg transition-colors border border-blue-200 flex items-center justify-center gap-2 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              {t('admin.editRequests.viewQuiz', 'Xem Quiz')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Preview Modal - Using enhanced QuizPreview component */}
      <QuizPreview 
        quiz={previewQuiz} 
        isOpen={showPreview} 
        onClose={() => setShowPreview(false)} 
      />
    </div>
    </>
  );
};

export default AdminQuizManagement;

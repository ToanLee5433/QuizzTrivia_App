import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../../config/routes';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query, 
  orderBy,
  where,
  serverTimestamp
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
  Edit3,
  AlertCircle,
  FileText,
  Video,
  Image as ImageIcon,
  Music,
  Link as LinkIcon,
  Presentation
} from 'lucide-react';
import SafeHTML from '../../../shared/components/ui/SafeHTML';


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
  editRequests?: EditRequest[];
  learningResources?: any[]; // Tài liệu học tập
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
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      
      toast.success(t('admin.quizManagement.success.approved'));
    } catch (error) {
      console.error('Error approving quiz:', error);
      toast.error(t('admin.quizManagement.errors.approveFailed'));
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

      // Create notification for the creator
      await addDoc(collection(db, 'notifications'), {
        userId: editRequest.requestedBy,
        type: 'edit_request_approved',
        title: t('admin.editRequests.notifications.approvedTitle'),
        message: t('admin.editRequests.notifications.approvedMessage', { 
          quizTitle: editRequest.quizTitle 
        }),
        quizId: quizId,
        createdAt: serverTimestamp(),
        read: false
      });

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

      const requestRef = doc(db, 'editRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewedBy: user?.uid,
        reviewedByName: user?.displayName || 'Admin',
        reviewedAt: new Date()
      });

      // Create notification for the creator
      await addDoc(collection(db, 'notifications'), {
        userId: editRequest.requestedBy,
        type: 'edit_request_rejected', 
        title: t('admin.editRequests.notifications.rejectedTitle'),
        message: t('admin.editRequests.notifications.rejectedMessage', { 
          quizTitle: editRequest.quizTitle 
        }),
        quizId: editRequest.quizId,
        createdAt: serverTimestamp(),
        read: false
      });

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
        reopenedAt: new Date(),
        reopenedBy: user?.uid
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
      await deleteDoc(doc(db, 'quizzes', quizId));
      console.log('✅ Quiz deleted from database successfully');
      
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
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

  // Helper để lấy icon theo loại tài liệu
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      case 'slides': return <Presentation className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Helper để lấy màu badge theo loại tài liệu
  const getResourceBadgeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
      case 'image': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'audio': return 'bg-green-100 text-green-700 border-green-200';
      case 'link': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'slides': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
                    
                    <SafeHTML content={quiz.description} className="text-gray-600 mb-4 line-clamp-2" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">{t('admin.quizManagement.table.category')}:</span> {quiz.category}
                      </div>
                      <div>
                        <span className="font-medium">{t('quiz.questions')}:</span> {quiz.questions.length}
                      </div>
                      <div>
                        <span className="font-medium">{t('admin.quizManagement.table.createdAt')}:</span> {quiz.createdAt.toLocaleDateString()}
                      </div>
                    </div>

                    {/* Hiển thị số lượng tài liệu học tập */}
                    {quiz.learningResources && quiz.learningResources.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
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
                      </div>
                    )}
                  </div>
                  
                  {/* Actions - 6 chức năng: View, Edit, Approve, Reject, Reopen, Delete */}
                  <div className="flex items-center gap-2 ml-6">
                    {/* 1. Xem trước (luôn hiển thị) */}
                      <button
                      onClick={() => handlePreview(quiz)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('admin.quizManagement.tooltips.preview')}
                    >
                      <Eye className="w-5 h-5" />
                    </button>

                    {/* 2. Chỉnh sửa (luôn hiển thị) */}
                      <button
                      onClick={() => handleEdit(quiz.id)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={t('admin.quizManagement.tooltips.edit')}
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    
                    {/* 3 & 4. Duyệt & Từ chối (chỉ hiển thị khi pending) */}
                    {quiz.status === 'pending' && (
                      <>
                          <button
                          onClick={() => handleApprove(quiz.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('admin.quizManagement.tooltips.approve')}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                          <button
                          onClick={() => handleReject(quiz.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('admin.quizManagement.tooltips.reject')}
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
                          title={t('admin.quizManagement.tooltips.reopen')}
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}
                    
                    {/* 6. Xóa (luôn hiển thị) */}
                      <button
                      onClick={() => handleDelete(quiz.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('admin.quizManagement.tooltips.delete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
        )}

        {activeTab === 'editRequests' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                {t('admin.quizManagement.editRequestsTitle', { count: editRequests.length })}
              </h3>
            </div>
            
            {editRequests.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t("admin.editRequests.emptyTitle")}</p>
                <p className="text-sm text-gray-400">{t("admin.editRequests.emptyDesc")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {editRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {request.requestedByName || request.requestedByEmail || t('admin.quizManagement.unknownUser')}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {request.requestedByEmail || request.requestedBy || t('admin.quizManagement.unknownEmail')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 mb-3">
                          <h5 className="font-medium text-gray-900 mb-2">
                            📝 Quiz: {request.quizTitle || t('admin.quizManagement.unknownQuiz')}
                          </h5>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>{t('admin.quizManagement.requestReason')}:</strong> {request.reason || t('admin.quizManagement.noReason')}
                          </p>
                          {request.description && (
                            <p className="text-sm text-gray-600">
                              <strong>{t('admin.quizManagement.requestDetails')}:</strong> {request.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {request.requestedAt?.toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) || t('admin.quizManagement.unknownTime')}
                          </span>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">{t("admin.editRequests.pending")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-6">
                        <button
                          onClick={() => handleApproveEditRequest(request.id, request.quizId)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                          title={t("admin.editRequests.approveTitle")}
                        >
                          <Check className="w-4 h-4" />{t("admin.editRequests.approve")}
                        </button>
                        <button
                          onClick={() => handleRejectEditRequest(request.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
                          title={t("admin.editRequests.rejectTitle")}
                        >
                          <X className="w-4 h-4" />{t("admin.editRequests.reject")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Preview Modal */}
      {showPreview && previewQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('admin.preview.title')}: {previewQuiz.title}</h2>
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
                  <h3 className="font-semibold mb-2">{t('admin.preview.description')}:</h3>
                  <SafeHTML content={previewQuiz.description} className="text-gray-600" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">{t('admin.preview.category')}:</span> {previewQuiz.category}
                  </div>
                  <div>
                    <span className="font-semibold">{t('admin.preview.difficulty')}:</span> {previewQuiz.difficulty}
                  </div>
                  <div>
                    <span className="font-semibold">{t('admin.preview.questions')}:</span> {previewQuiz.questions.length}
                  </div>
                  <div>
                    <span className="font-semibold">{t('admin.preview.status')}:</span> {getStatusBadge(previewQuiz.status || 'pending')}
                  </div>
                </div>

                {/* Tài liệu học tập trong Preview */}
                {previewQuiz.learningResources && previewQuiz.learningResources.length > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-800">
                      <FileText className="w-5 h-5" />
                      📚 {t('admin.preview.learningResourcesTitle', { count: previewQuiz.learningResources.length })}
                    </h3>
                    <div className="space-y-2">
                      {previewQuiz.learningResources.map((resource: any, idx: number) => (
                        <div 
                          key={resource.id || idx} 
                          className="bg-white rounded-lg p-3 border border-emerald-100"
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon & Type Badge */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${getResourceBadgeColor(resource.type)}`}>
                              {getResourceIcon(resource.type)}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-gray-900 text-sm">{resource.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getResourceBadgeColor(resource.type)}`}>
                                  {resource.type.toUpperCase()}
                                </span>
                              </div>
                              
                              {resource.description && (
                                <SafeHTML content={resource.description} className="text-xs text-gray-600 mt-1 line-clamp-2" />
                              )}
                              
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                {resource.required && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                    ⚠️ {t('admin.quizManagement.requiredBadge')}
                                  </span>
                                )}
                                {resource.estimatedTime && (
                                  <span>⏱️ {t('admin.quizManagement.estimatedTime', { time: resource.estimatedTime })}</span>
                                )}
                                {resource.url && (
                                  <a 
                                    href={resource.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-xs"
                                  >
                                    🔗 {t('admin.quizManagement.viewResource')}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewQuiz.questions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">{t('admin.preview.questionList')}</h3>
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
    </>
  );
};

export default AdminQuizManagement;

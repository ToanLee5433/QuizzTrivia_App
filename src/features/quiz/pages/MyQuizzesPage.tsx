import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, getCountFromServer, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { 
  Edit, 
  Eye, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Plus,
  Send,
  MessageSquare,
  TrendingUp,
  Lock,
  Share2,
  BarChart3,
  FileText,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SafeHTML from '../../../shared/components/ui/SafeHTML';
import { Quiz as BaseQuiz } from '../types';
import { formatDate } from '../../../lib/utils/helpers';

type CreatorQuiz = Omit<BaseQuiz, 'havePassword'> & {
  havePassword?: 'public' | 'password';
  editRequests?: EditRequest[];
  plays?: number;
  avgRating?: number;
  isDraft?: boolean;
  views?: number;
  attempts?: number;
  completions?: number;
  averageScore?: number;
  stats?: {
    views?: number;
    attempts?: number;
    completions?: number;
    averageScore?: number;
    completionRate?: number;
    totalScore?: number;
    lastUpdated?: Date;
  };
};

interface EditRequest {
  id: string;
  quizId: string;
  requestedBy: string;
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

const MyQuizzesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  
  const [quizzes, setQuizzes] = useState<CreatorQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // New: Filter by quiz type
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<CreatorQuiz | null>(null);
  const [editReason, setEditReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  
  // 🔗 Share Link functionality
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);

  const loadMyQuizzes = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('createdBy', '==', user.uid)
      );
      
      const snapshot = await getDocs(quizzesQuery);
      const loadedQuizzes: CreatorQuiz[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Debug: Log password field values
        if (data.havePassword) {
          console.log('🔍 Quiz password field:', {
            id: docSnap.id,
            title: data.title,
            havePassword: data.havePassword,
            type: typeof data.havePassword
          });
        }
        
        // Load edit requests for this quiz
        const editRequestsQuery = query(
          collection(db, 'editRequests'),
          where('quizId', '==', docSnap.id)
        );
        const editRequestsSnapshot = await getDocs(editRequestsQuery);
        const editRequests = editRequestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date(),
          approvedAt: doc.data().approvedAt?.toDate()
        })) as EditRequest[];
        
        // ✅ FIXED: Use getCountFromServer to only count, not load all documents
        const resultsQuery = query(
          collection(db, 'quizResults'),
          where('quizId', '==', docSnap.id)
        );
        const resultsCountSnapshot = await getCountFromServer(resultsQuery);
        const completions = resultsCountSnapshot.data().count;
        
        // For average score, we need to sample some results (not all)
        const sampleQuery = query(
          collection(db, 'quizResults'),
          where('quizId', '==', docSnap.id),
          orderBy('completedAt', 'desc'),
          limit(100) // Sample 100 recent results for average
        );
        const sampleSnapshot = await getDocs(sampleQuery);
        const results = sampleSnapshot.docs.map(doc => doc.data());
        
        // Calculate average score, normalizing to 0-100 percentage
        // For multiplayer: use percentage field (0-100)
        // For single-player: use score field (already 0-100)
        const totalScore = results.reduce((sum, r) => {
          let score = 0;
          if (r.mode === 'multiplayer') {
            // Multiplayer has separate percentage field
            score = Number(r.percentage || 0);
          } else {
            // Single-player score is already percentage
            score = Number(r.score || 0);
          }
          // Validate score is a valid number between 0-100
          if (!isFinite(score) || isNaN(score)) score = 0;
          return sum + Math.min(100, Math.max(0, score));
        }, 0);
        const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
        const attempts = results.length;
        
        loadedQuizzes.push({
          id: docSnap.id,
          ...data,
          // Use calculated stats from quiz results
          views: data.stats?.views || data.views || 0,
          attempts: attempts,
          completions: completions,
          averageScore: averageScore,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
            ? data.createdAt.toDate() 
            : data.createdAt instanceof Date 
              ? data.createdAt 
              : new Date(),
          updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function'
            ? data.updatedAt.toDate()
            : data.updatedAt instanceof Date
              ? data.updatedAt
              : new Date(),
          editRequests
  } as CreatorQuiz);
      }
      
      // Sort in memory instead of using orderBy in query
      loadedQuizzes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setQuizzes(loadedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error(t('quiz.loadError'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (user) {
      loadMyQuizzes();
    }
  }, [user, loadMyQuizzes]);

  const handleEditRequest = async () => {
    if (!selectedQuiz || !editReason.trim()) {
      toast.error(t('quiz.editReasonRequired'));
      return;
    }

    setSubmittingRequest(true);
    try {
      await addDoc(collection(db, 'editRequests'), {
        quizId: selectedQuiz.id,
        requestedBy: user?.uid,
        requestedAt: serverTimestamp(),
        reason: editReason.trim(),
        status: 'pending'
      });

  toast.success(t('quiz.myQuizzes.editRequestSuccess'));
      setShowEditRequestModal(false);
      setEditReason('');
      setSelectedQuiz(null);
      loadMyQuizzes(); // Reload to get updated data
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast.error(t('quiz.editRequestError'));
    } finally {
      setSubmittingRequest(false);
    }
  };

  // 🔗 Copy quiz link to clipboard
  const handleCopyLink = async (quizId: string) => {
    const link = `${window.location.origin}/quiz/${quizId}/preview`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedQuizId(quizId);
  toast.success(t('quiz.myQuizzes.copyLinkSuccess'));
      setTimeout(() => setCopiedQuizId(null), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
  toast.error(t('quiz.myQuizzes.copyLinkError'));
    }
  };
  
  // 📤 Publish draft quiz (send to admin for approval)
  const handlePublishDraft = async (quiz: CreatorQuiz) => {
    // Validate quiz has questions
    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
  toast.error(t('quiz.myQuizzes.requireQuestion'));
      return;
    }
    
    // Validate each question has answers (for multiple choice)
    const invalidQuestions = quiz.questions.filter(q => {
      if (q.type === 'multiple' && (!q.answers || q.answers.length < 2)) {
        return true;
      }
  if (q.type === 'multiple' && !q.answers.some((a) => a.isCorrect)) {
        return true;
      }
      return false;
    });
    
    if (invalidQuestions.length > 0) {
  toast.error(t('quiz.myQuizzes.invalidQuestions', { count: invalidQuestions.length }));
      return;
    }
    
  if (window.confirm(t('quiz.myQuizzes.confirmPublish', { title: quiz.title }))) {
      try {
        const quizRef = doc(db, 'quizzes', quiz.id);
        await updateDoc(quizRef, {
          status: 'pending',
          isDraft: false,
          isPublished: true,
          updatedAt: serverTimestamp()
        });
        
  toast.success(t('quiz.myQuizzes.publishSuccess'));
        loadMyQuizzes(); // Reload to see updated status
      } catch (error) {
        console.error('Error publishing draft:', error);
  toast.error(t('quiz.myQuizzes.publishError'));
      }
    }
  };

  // 🔗 Copy quiz info (link + password if exists)
  const handleCopyQuizInfo = async (quiz: CreatorQuiz) => {
    const link = `${window.location.origin}/quiz/${quiz.id}/preview`;
    const textToCopy = quiz.havePassword === 'password' && quiz.password
  ? t('quiz.myQuizzes.copyInfoTemplateWithPassword', { title: quiz.title, link, password: quiz.password })
  : t('quiz.myQuizzes.copyInfoTemplate', { title: quiz.title, link });
    
    try {
      await navigator.clipboard.writeText(textToCopy);
  toast.success(t('quiz.myQuizzes.copyInfoSuccess'));
    } catch (error) {
      console.error('Failed to copy:', error);
  toast.error(t('quiz.myQuizzes.copyInfoError'));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    };

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
      draft: <AlertCircle className="w-3 h-3" />
    };

    const labels = {
      pending: t('status.pending'),
      approved: t('status.approved'), 
      rejected: t('status.rejected'),
      draft: t('quiz.statusFilter.draft')
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'general': t('category.general'),
      'science': t('category.science'),
      'history': t('category.history'),
      'sports': t('category.sports'),
      'technology': t('category.technology'),
      'entertainment': t('category.entertainment'),
      'politics': t('category.politics'),
      'art': t('category.art'),
      'music': t('category.music'),
      'literature': t('category.literature')
    };
    
    return categoryMap[category] || category;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const styles = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };

    const labels = {
      easy: `🟢 ${t('difficulty.easy')}`,
      medium: `🟡 ${t('difficulty.medium')}`,
      hard: `🔴 ${t('difficulty.hard')}`
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[difficulty as keyof typeof styles]}`}>
        {labels[difficulty as keyof typeof labels]}
      </span>
    );
  };

  const canEdit = (quiz: CreatorQuiz): { allowed: boolean; reason?: string } => {
    // Check if there's a pending edit request
    const pendingRequest = quiz.editRequests?.find(req => req.status === 'pending');
    if (pendingRequest) {
      return { allowed: false, reason: t('quiz.editRequest.pendingExists') };
    }

    // Check if quiz is approved and needs admin permission to edit
    if (quiz.status === 'approved') {
      return { allowed: false, reason: t('quiz.editRequest.needPermission') };
    }

    // Can edit if draft or rejected
    return { allowed: true };
  };

  const handleEditQuiz = (quiz: CreatorQuiz) => {
    const editPermission = canEdit(quiz);
    
    if (!editPermission.allowed) {
      if (quiz.status === 'approved') {
        setSelectedQuiz(quiz);
        setShowEditRequestModal(true);
      } else {
        toast.warning(editPermission.reason);
      }
    } else {
      navigate(`/quiz/${quiz.id}/edit`);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quiz.status === statusFilter;
    
    // New: Filter by quiz type (prefer quizType field, fallback to checking resources)
    const hasLearningMaterials = quiz.quizType === 'with-materials' || 
                                (quiz.quizType === undefined && quiz.resources && quiz.resources.length > 0);
    const matchesType = typeFilter === 'all' || 
                       (typeFilter === 'with-materials' && hasLearningMaterials) ||
                       (typeFilter === 'no-materials' && !hasLearningMaterials);
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatNumber = (value?: number) => (value ?? 0).toLocaleString();
  const totalWithMaterials = quizzes.filter(q => q.quizType === 'with-materials' || (q.quizType === undefined && q.resources && q.resources.length > 0)).length;
  const totalStandard = quizzes.filter(q => q.quizType === 'standard' || (!q.resources || q.resources.length === 0)).length;
  const totalApproved = quizzes.filter(q => q.status === 'approved').length;
  const totalPending = quizzes.filter(q => q.status === 'pending').length;
  const totalDraft = quizzes.filter(q => q.status === 'draft').length;
  const totalRejected = quizzes.filter(q => q.status === 'rejected').length;
  const approvedWithPasswordCount = quizzes.filter(q => q.status === 'approved' && q.havePassword === 'password').length;
  const totalViews = quizzes.reduce((sum, q) => sum + (q.views || 0), 0);
  const totalAttempts = quizzes.reduce((sum, q) => sum + (q.attempts || 0), 0);
  const totalCompletions = quizzes.reduce((sum, q) => sum + (q.completions || 0), 0);
  // Calculate average score only from quizzes that have attempts (at least 1 person has taken the quiz)
  const quizzesWithAttempts = quizzes.filter(q => (q.attempts || 0) > 0);
  const averageScore = quizzesWithAttempts.length > 0
    ? quizzesWithAttempts.reduce((sum, q) => {
        const score = Number(q.averageScore || 0);
        return sum + (isFinite(score) && !isNaN(score) ? Math.min(100, Math.max(0, score)) : 0);
      }, 0) / quizzesWithAttempts.length
    : 0;

  if (!user || (user.role !== 'creator' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('messages.unauthorized')}</h2>
          <p className="text-gray-600">{t('creator.roleRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('quiz.myQuizzes.title')}</h1>
            <p className="text-gray-600 mt-2">{t('quiz.myQuizzesDescription')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t("profile.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* New: Quiz Type Filter */}
            <div className="sm:w-56">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">
                  {t('emoji.books')} {t('quiz.typeFilter.all')}
                </option>
                <option value="with-materials">
                  {t('emoji.openBook')} {t('quiz.typeFilter.withMaterials')}
                </option>
                <option value="no-materials">
                  {t('emoji.pencil')} {t('quiz.typeFilter.noMaterials')}
                </option>
              </select>
            </div>
            
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t("quiz.statusFilter.all")}</option>
                <option value="draft">{t("quiz.statusFilter.draft")}</option>
                <option value="pending">{t("admin.quizManagement.filter.pending")}</option>
                <option value="approved">{t("admin.quizManagement.filter.approved")}</option>
                <option value="rejected">{t("status.rejected")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats with Quiz Type Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t("quiz.stats.totalQuizzes")}</p>
                <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('quiz.myQuizzes.stats.typeBreakdown', {
                    with: totalWithMaterials,
                    without: totalStandard
                  })}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t("admin.quizManagement.filter.approved")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalApproved)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('quiz.myQuizzes.stats.approvedWithPassword', { count: approvedWithPasswordCount })}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t("admin.quizManagement.filter.pending")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalPending)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">📝 {t("quiz.statusFilter.draft")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalDraft)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t("admin.quizManagement.filter.rejected")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalRejected)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t("quiz.stats.totalViews")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalViews)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t("quiz.stats.totalAttempts")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalAttempts)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t("complete")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalCompletions)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t('quiz.myQuizzes.stats.avgScoreLabel')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {t('quiz.myQuizzes.stats.averageScoreValue', { value: averageScore.toFixed(1) })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t("leaderboard.noQuizzes")}</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? t('quiz.noMatchFound')
                  : t('quiz.noQuizzesYet')
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/quiz/create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {t('quiz.createFirstQuiz')}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("quiz.title")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("quiz.categoryAndDifficulty")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("status.label")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.statistics")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.createdAt")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuizzes.map((quiz) => (
                    <tr key={quiz.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 mb-1">
                            {quiz.title}
                          </div>
                          {/* Quiz Type Badge - prefer quizType field, fallback to checking resources */}
                          {(quiz.quizType === 'with-materials' || (quiz.quizType === undefined && quiz.resources && quiz.resources.length > 0)) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                              {t('emoji.openBook')} {t('quiz.withMaterials')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                              {t('emoji.pencil')} {t('quiz.standardQuiz')}
                            </span>
                          )}
                          {/* 🔒 Password Badge */}
                          {quiz.havePassword === 'password' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                              <Lock className="w-3 h-3 mr-1" />
                              {t('quiz.myQuizzes.badge.password')}
                            </span>
                          )}
                          {/* Render rich-text description safely (support HTML without showing tags) */}
                          <SafeHTML
                            content={quiz.description}
                            className="text-sm text-gray-600 max-w-xs line-clamp-1 mt-1"
                            as="div"
                          />
                          <div className="text-xs text-gray-400 mt-1">
                            {quiz.questions?.length || 0} {t('quiz.questions')}
                            {quiz.resources && quiz.resources.length > 0 && (
                              <span className="ml-2">• {quiz.resources.length} {t('quiz.materials')}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900 font-medium">{getCategoryLabel(quiz.category)}</div>
                          {getDifficultyBadge(quiz.difficulty)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {getStatusBadge(quiz.status || 'draft')}
                          {quiz.editRequests && quiz.editRequests.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {quiz.editRequests.filter(req => req.status === 'pending').length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">{t("quiz.status.hasEditRequests")}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1">
                          <div>{t('quiz.myQuizzes.stats.views', { count: quiz.stats?.views ?? quiz.views ?? 0 })}</div>
                          <div>{t('quiz.myQuizzes.stats.attempts', { count: quiz.stats?.attempts ?? quiz.attempts ?? 0 })}</div>
                          <div>{t('quiz.myQuizzes.stats.completions', { count: quiz.stats?.completions ?? quiz.completions ?? 0 })}</div>
                          {(() => {
                            const score = quiz.stats?.averageScore ?? quiz.averageScore;
                            const numScore = Number(score);
                            return !isNaN(numScore) && isFinite(numScore) && (
                              <div>{t('quiz.myQuizzes.stats.averageScoreValue', { value: Math.min(100, Math.max(0, numScore)).toFixed(1) })}</div>
                            );
                          })()}
                          {typeof quiz.avgRating === 'number' && (
                            <div>{t('quiz.myQuizzes.stats.avgRating', { rating: quiz.avgRating.toFixed(1) })}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(quiz.createdAt, 'long')}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/quiz/${quiz.id}/preview`)}
                            className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title={t('quiz.myQuizzes.actions.preview')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* 🔗 Copy Link Button */}
                          {quiz.status !== 'draft' && (
                            <button
                              onClick={() => handleCopyLink(quiz.id)}
                              className={`p-1.5 rounded transition-colors ${
                                copiedQuizId === quiz.id
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50'
                              }`}
                              title={t('quiz.myQuizzes.actions.copyLinkTitle')}
                            >
                              {copiedQuizId === quiz.id ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          {/* 📊 Stats Button */}
                          {quiz.status === 'approved' && (
                            <button
                              onClick={() => navigate(`/quiz-stats/${quiz.id}`)}
                              className="text-purple-600 hover:text-purple-900 p-1.5 hover:bg-purple-50 rounded transition-colors"
                              title={t('quiz.myQuizzes.actions.viewStatsTitle')}
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* 🔗 Share with Info */}
                          {(quiz.status === 'approved' || quiz.status === 'pending') && (
                            <button
                              onClick={() => handleCopyQuizInfo(quiz)}
                              className="text-green-600 hover:text-green-900 p-1.5 hover:bg-green-50 rounded transition-colors"
                              title={t('quiz.myQuizzes.actions.copyInfoTitle')}
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleEditQuiz(quiz)}
                            className="text-orange-600 hover:text-orange-900 p-1.5 hover:bg-orange-50 rounded transition-colors"
                            title={t("edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {/* 📤 Publish Draft Button */}
                          {quiz.status === 'draft' && (
                            <button
                              onClick={() => handlePublishDraft(quiz)}
                              className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded transition-colors"
                              title={t('quiz.myQuizzes.actions.publishDraftTitle')}
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          
                          {quiz.status === 'draft' && (
                            <button
                              onClick={() => {
                                // Handle delete
                                if (window.confirm(t('quiz.myQuizzes.actions.deleteDraftConfirm', { title: quiz.title }))) {
                                  // Delete logic here
                                  toast.info(t('quiz.myQuizzes.actions.deleteDraftInfo'));
                                }
                              }}
                              className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded transition-colors"
                              title={t("action.clear")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Request Modal */}
        {showEditRequestModal && selectedQuiz && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('quiz.editRequest.title')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('nav.quiz')}: {selectedQuiz.title}
                </p>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('quiz.editRequest.reason')} *
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder={t('quiz.editRequest.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    {t('emoji.warning')} {t('quiz.editRequest.warning')}
                  </p>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditRequestModal(false);
                    setEditReason('');
                    setSelectedQuiz(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >{t("common.cancel")}
                </button>
                <button
                  onClick={handleEditRequest}
                  disabled={!editReason.trim() || submittingRequest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submittingRequest ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t('quiz.editRequest.submit')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQuizzesPage;

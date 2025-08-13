import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: any[];
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  createdBy: string;
  isPublished: boolean;
  views?: number;
  attempts?: number;
  completions?: number;
  averageScore?: number;
  plays?: number;
  avgRating?: number;
  editRequests?: EditRequest[];
}

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
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [editReason, setEditReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    if (user) {
      loadMyQuizzes();
    }
  }, [user]);

  const loadMyQuizzes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('createdBy', '==', user.uid)
      );
      
      const snapshot = await getDocs(quizzesQuery);
      const loadedQuizzes: Quiz[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
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
        
        loadedQuizzes.push({
          id: docSnap.id,
          ...data,
          // Ensure stats are included
          views: data.stats?.views || data.views || 0,
          attempts: data.stats?.attempts || data.attempts || 0,
          completions: data.stats?.completions || data.completions || 0,
          averageScore: data.stats?.averageScore || data.averageScore || 0,
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
        } as Quiz);
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
  };

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

      toast.success('Yêu cầu chỉnh sửa đã được gửi, chờ admin phê duyệt');
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
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Bị từ chối',
      draft: 'Bản nháp'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    const styles = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };

    const labels = {
      easy: '🟢 Dễ',
      medium: '🟡 Trung bình',
      hard: '🔴 Khó'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[difficulty as keyof typeof styles]}`}>
        {labels[difficulty as keyof typeof labels]}
      </span>
    );
  };

  const canEdit = (quiz: Quiz): { allowed: boolean; reason?: string } => {
    // Check if there's a pending edit request
    const pendingRequest = quiz.editRequests?.find(req => req.status === 'pending');
    if (pendingRequest) {
      return { allowed: false, reason: 'Có yêu cầu chỉnh sửa đang chờ duyệt' };
    }

    // Check if quiz is approved and needs admin permission to edit
    if (quiz.status === 'approved') {
      return { allowed: false, reason: 'Quiz đã được duyệt, cần xin phép admin để chỉnh sửa' };
    }

    // Can edit if draft or rejected
    return { allowed: true };
  };

  const handleEditQuiz = (quiz: Quiz) => {
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
    
    return matchesSearch && matchesStatus;
  });

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
            <h1 className="text-3xl font-bold text-gray-900">{t("quiz.myQuizzes")}</h1>
            <p className="text-gray-600 mt-2">Quản lý và theo dõi quiz bạn đã tạo</p>
          </div>
          
          <button
            onClick={() => navigate('/creator')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />{t("createQuiz.title")}
          </button>
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
            
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="draft">Bản nháp</option>
                <option value="pending">{t("admin.quizManagement.filter.pending")}</option>
                <option value="approved">{t("admin.quizManagement.filter.approved")}</option>
                <option value="rejected">{t("status.rejected")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Tổng quiz</p>
                <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
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
                  {quizzes.filter(q => q.status === 'approved').length}
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
                  {quizzes.filter(q => q.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Tổng lượt xem</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quizzes.reduce((sum, q) => sum + (q.views || 0), 0)}
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
                <p className="text-sm text-gray-600">Tổng lượt thử</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quizzes.reduce((sum, q) => sum + (q.attempts || 0), 0)}
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
                  {quizzes.reduce((sum, q) => sum + (q.completions || 0), 0)}
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
                  ? 'Không tìm thấy quiz phù hợp với bộ lọc'
                  : 'Bạn chưa tạo quiz nào. Hãy tạo quiz đầu tiên!'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/creator')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Tạo Quiz Đầu Tiên
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.editRequests.quiz")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Danh mục & Độ khó
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.preview.status")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.statistics")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.quizManagement.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuizzes.map((quiz) => (
                    <tr key={quiz.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {quiz.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {quiz.description}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {quiz.questions?.length || 0} câu hỏi
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">{quiz.category}</div>
                          {getDifficultyBadge(quiz.difficulty)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {getStatusBadge(quiz.status)}
                          {quiz.editRequests && quiz.editRequests.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {quiz.editRequests.filter(req => req.status === 'pending').length > 0 && (
                                <span className="text-yellow-600">Có yêu cầu chỉnh sửa</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1">
                          <div>👁️ {quiz.views || 0} lượt xem</div>
                          <div>🎯 {quiz.attempts || 0} lượt thử</div>
                          <div>✅ {quiz.completions || 0} hoàn thành</div>
                          {quiz.averageScore !== undefined && (
                            <div>📊 {quiz.averageScore}% điểm TB</div>
                          )}
                          {quiz.avgRating && (
                            <div>⭐ {quiz.avgRating.toFixed(1)}/5</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {quiz.createdAt.toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/quiz/${quiz.id}/preview`)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Xem trước"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleEditQuiz(quiz)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title={t("edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {quiz.status === 'draft' && (
                            <button
                              onClick={() => {
                                // Handle delete
                                if (window.confirm('Bạn có chắc muốn xóa quiz này?')) {
                                  // Delete logic here
                                }
                              }}
                              className="text-red-600 hover:text-red-900 p-1"
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
                  Yêu cầu chỉnh sửa quiz
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Quiz: {selectedQuiz.title}
                </p>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lý do chỉnh sửa *
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Vui lòng mô tả lý do bạn muốn chỉnh sửa quiz này..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Quiz đã được duyệt. Yêu cầu chỉnh sửa sẽ được gửi tới admin để xét duyệt. 
                    Sau khi được phép chỉnh sửa, bạn cần gửi lại để admin duyệt nội dung mới.
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
                  Gửi yêu cầu
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

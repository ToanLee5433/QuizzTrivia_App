import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Search, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  Bug,
  Lightbulb
} from 'lucide-react';
import { Feedback, FeedbackStats, FeedbackStatus, FeedbackPriority } from '../types';
import { getAllFeedbacks, getFeedbackStats } from '../services/feedbackService';
import { toast } from 'react-toastify';
import FeedbackDetailModal from '../components/FeedbackDetailModal';

const AdminFeedbackManagement: React.FC = () => {
  const { t } = useTranslation(['feedback', 'common']);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<FeedbackPriority | 'all'>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackData, statsData] = await Promise.all([
        getAllFeedbacks(),
        getFeedbackStats()
      ]);
      setFeedbacks(feedbackData);
      setStats(statsData);
    } catch (error) {
      toast.error(t('feedback:errors.loadFailed'));
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailModal(true);
  };

  const handleUpdateSuccess = () => {
    loadData();
    setShowDetailModal(false);
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = 
      feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.userEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || feedback.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Status badge
  const getStatusBadge = (status: FeedbackStatus) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      'in-progress': { icon: RefreshCw, color: 'bg-blue-100 text-blue-800' },
      resolved: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      closed: { icon: XCircle, color: 'bg-gray-100 text-gray-800' }
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {t(`feedback:status.${status === 'in-progress' ? 'inProgress' : status}`)}
      </span>
    );
  };

  // Priority badge
  const getPriorityBadge = (priority: FeedbackPriority) => {
    const configs = {
      low: { color: 'bg-gray-100 text-gray-700' },
      medium: { color: 'bg-blue-100 text-blue-700' },
      high: { color: 'bg-orange-100 text-orange-700' },
      critical: { color: 'bg-red-100 text-red-700' }
    };

    const config = configs[priority];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {t(`feedback:priority.${priority}`)}
      </span>
    );
  };

  // Type icon
  const getTypeIcon = (type: string) => {
    const icons = {
      bug: <Bug className="w-4 h-4 text-red-600" />,
      feature: <Lightbulb className="w-4 h-4 text-blue-600" />,
      improvement: <TrendingUp className="w-4 h-4 text-green-600" />,
      other: <MessageSquare className="w-4 h-4 text-gray-600" />
    };
    return icons[type as keyof typeof icons] || icons.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('feedback:management.title')}
          </h1>
          <p className="text-gray-600">
            {t('feedback:management.subtitle')}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('feedback:stats.total')}</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('feedback:stats.pending')}</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('feedback:stats.inProgress')}</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <RefreshCw className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('feedback:stats.resolved')}</p>
                  <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('feedback:management.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">{t('feedback:management.allStatuses')}</option>
                <option value="pending">{t('feedback:status.pending')}</option>
                <option value="in-progress">{t('feedback:status.inProgress')}</option>
                <option value="resolved">{t('feedback:status.resolved')}</option>
                <option value="closed">{t('feedback:status.closed')}</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as FeedbackPriority | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">{t('feedback:management.allPriorities')}</option>
                <option value="low">{t('feedback:priority.low')}</option>
                <option value="medium">{t('feedback:priority.medium')}</option>
                <option value="high">{t('feedback:priority.high')}</option>
                <option value="critical">{t('feedback:priority.critical')}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              {t('feedback:management.showing', { count: filteredFeedbacks.length, total: feedbacks.length })}
            </span>
            <button
              onClick={loadData}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
            >
              <RefreshCw className="w-4 h-4" />
              {t('common:refresh')}
            </button>
          </div>
        </div>

        {/* Feedbacks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.user')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.subject')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.type')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.priority')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.status')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.date')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">{t('feedback:management.noFeedback')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredFeedbacks.map((feedback) => (
                    <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                            {feedback.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {feedback.userName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {feedback.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 line-clamp-2">
                          {feedback.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(feedback.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(feedback.priority)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(feedback.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetail(feedback)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          {t('feedback:actions.view')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setShowDetailModal(false)}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default AdminFeedbackManagement;

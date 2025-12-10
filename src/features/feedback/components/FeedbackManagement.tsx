import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Search,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Activity,
  Eye
} from 'lucide-react';
import { getAllFeedbacks } from '../services/feedbackService';
import { Feedback, FeedbackStatus, FeedbackPriority } from '../types';
import { toast } from 'react-toastify';
import FeedbackDetailModal from './FeedbackDetailModal';

const FeedbackManagement: React.FC = () => {
  const { t } = useTranslation(['feedback', 'common']);
  
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    closed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<FeedbackPriority | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const feedbacksData = await getAllFeedbacks();
      setFeedbacks(feedbacksData);
      
      // Calculate stats manually
      const statsData = {
        total: feedbacksData.length,
        pending: feedbacksData.filter((f: Feedback) => f.status === 'pending').length,
        inProgress: feedbacksData.filter((f: Feedback) => f.status === 'in-progress').length,
        resolved: feedbacksData.filter((f: Feedback) => f.status === 'resolved').length,
        closed: feedbacksData.filter((f: Feedback) => f.status === 'closed').length
      };
      setStats(statsData);
    } catch (error) {
      toast.error(t('feedback:errors.loadFailed'));
      console.error('Error loading feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailModal(true);
  };

  const handleModalClose = () => {
    setShowDetailModal(false);
    setSelectedFeedback(null);
    loadData();
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = 
      feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || feedback.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: FeedbackStatus) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: t('feedback:status.pending')
      },
      'in-progress': { 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Activity,
        label: t('feedback:status.inProgress')
      },
      resolved: { 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        label: t('feedback:status.resolved')
      },
      closed: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle,
        label: t('feedback:status.closed')
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: FeedbackPriority) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-700', label: t('feedback:priority.low') },
      medium: { color: 'bg-blue-100 text-blue-700', label: t('feedback:priority.medium') },
      high: { color: 'bg-orange-100 text-orange-700', label: t('feedback:priority.high') },
      critical: { color: 'bg-red-100 text-red-700', label: t('feedback:priority.critical') }
    };

    const config = priorityConfig[priority];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { emoji: string, label: string }> = {
      bug: { emoji: '🐛', label: t('feedback:type.bug') },
      feature: { emoji: '✨', label: t('feedback:type.feature') },
      improvement: { emoji: '🚀', label: t('feedback:type.improvement') },
      other: { emoji: '💬', label: t('feedback:type.other') }
    };

    const config = typeConfig[type] || typeConfig.other;

    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('feedback:management.title')}
          </h1>
          <p className="text-gray-600">
            {t('feedback:management.subtitle')}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('feedback:stats.total')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('feedback:stats.pending')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('feedback:stats.inProgress')}</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('feedback:stats.resolved')}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('feedback:filters.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">{t('feedback:filters.allStatus')}</option>
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
                <option value="all">{t('feedback:filters.allPriority')}</option>
                <option value="low">{t('feedback:priority.low')}</option>
                <option value="medium">{t('feedback:priority.medium')}</option>
                <option value="high">{t('feedback:priority.high')}</option>
                <option value="critical">{t('feedback:priority.critical')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedbacks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.subject')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.priority')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('feedback:table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">{t('feedback:noFeedbacks')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredFeedbacks.map((feedback) => (
                    <tr key={feedback.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {feedback.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {feedback.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {feedback.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(feedback.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(feedback.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(feedback.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewDetail(feedback)}
                          className="text-purple-600 hover:text-purple-900 font-medium flex items-center gap-1"
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
          onClose={handleModalClose}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};

export default FeedbackManagement;

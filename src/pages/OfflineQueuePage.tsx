import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { RefreshCw, Trash2, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

const OfflineQueuePage: React.FC = () => {
  const { t } = useTranslation();
  const {
    isOnline,
    pendingActions,
    pendingCount,
    mediaCount,
    retryFailedAction,
    deleteFailedAction,
    refreshQueue
  } = useOfflineQueue();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const actionTypeLabels: Record<string, string> = {
    'create_quiz': t('offlineQueue.actions.createQuiz', 'Create Quiz'),
    'update_quiz': t('offlineQueue.actions.updateQuiz', 'Update Quiz'),
    'delete_quiz': t('offlineQueue.actions.deleteQuiz', 'Delete Quiz'),
    'create_card': t('offlineQueue.actions.createCard', 'Create Flashcard'),
    'update_card': t('offlineQueue.actions.updateCard', 'Update Flashcard'),
    'delete_card': t('offlineQueue.actions.deleteCard', 'Delete Flashcard'),
    'update_progress': t('offlineQueue.actions.updateProgress', 'Update Progress'),
    'upload_media': t('offlineQueue.actions.uploadMedia', 'Upload Media')
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshQueue();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRetry = async (id: number) => {
    try {
      await retryFailedAction(id);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('offlineQueue.confirmDelete', 'Are you sure you want to delete this action?'))) {
      try {
        await deleteFailedAction(id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'synced':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('offlineQueue.time.justNow', 'Just now');
    if (diffMins < 60) return t('offlineQueue.time.minutesAgo', '{{count}} minutes ago', { count: diffMins });
    if (diffHours < 24) return t('offlineQueue.time.hoursAgo', '{{count}} hours ago', { count: diffHours });
    return t('offlineQueue.time.daysAgo', '{{count}} days ago', { count: diffDays });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('offlineQueue.title', 'Offline Queue')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('offlineQueue.description', 'Manage your pending offline actions and uploads')}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('offlineQueue.refresh', 'Refresh')}
            </button>
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isOnline 
                  ? t('offlineQueue.status.online', 'You are online')
                  : t('offlineQueue.status.offline', 'You are offline')
                }
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t('offlineQueue.stats.pending', 'Pending')}: <span className="font-bold">{pendingCount}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t('offlineQueue.stats.media', 'Media')}: <span className="font-bold">{mediaCount}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t('offlineQueue.stats.total', 'Total')}: <span className="font-bold">{pendingActions.length}</span>
            </div>
          </div>
        </div>

        {/* Actions List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          {pendingActions.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('offlineQueue.empty.title', 'All Clear!')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('offlineQueue.empty.description', 'No pending actions in the queue')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(action.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-grow">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {actionTypeLabels[action.type] || action.type}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatTimestamp(action.createdAt)}
                          </p>
                          {action.lastError && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                              {action.lastError}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-medium
                            ${action.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                            ${action.status === 'syncing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                            ${action.status === 'synced' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                            ${action.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                          `}>
                            {action.status}
                          </span>

                          {action.status === 'failed' && action.id && (
                            <>
                              <button
                                onClick={() => handleRetry(action.id!)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                title={t('offlineQueue.actions.retry', 'Retry')}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(action.id!)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                title={t('offlineQueue.actions.delete', 'Delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      {action.retries > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {t('offlineQueue.retries', 'Retries')}: {action.retries}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineQueuePage;

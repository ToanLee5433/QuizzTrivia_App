/**
 * 📱 Downloaded Quizzes Page
 * ===========================
 * Trang hiển thị tất cả Quiz đã tải offline
 * - Danh sách quiz với thumbnail
 * - Storage management (dung lượng, xóa quiz)
 * - Play quiz offline
 * - Download new quiz
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import type { RootState } from '../lib/store';
import {
  downloadManager,
  type DownloadedQuiz,
  type StorageInfo,
} from '../features/offline/DownloadManager';
import { OfflineImage } from '../components/common/OfflineImage';
import { toast } from 'react-toastify';
import SafeHTML from '../shared/components/ui/SafeHTML';

// ============================================================================
// UTILS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DownloadedQuizzesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 🔐 SECURITY: Get current user ID from Redux
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.uid;

  const [quizzes, setQuizzes] = useState<DownloadedQuiz[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [updatesAvailable, setUpdatesAvailable] = useState<Set<string>>(new Set()); // 🔥 Track quizzes with updates
  const [evictionWarning, setEvictionWarning] = useState(false); // 🔥 NEW: Eviction detected

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // 🔥 Check for eviction on mount (Safari issue)
  useEffect(() => {
    const checkEviction = async () => {
      if (!userId) return;
      const status = await downloadManager.checkEvictionStatus(userId);
      if (status.evicted) {
        setEvictionWarning(true);
        toast.warning(
          t('downloadedQuizzes.evictionWarning', { 
            expected: status.expectedCount, 
            actual: status.actualCount 
          }),
          { autoClose: false }
        );
      }
    };
    checkEviction();
  }, [userId, t]);

  // 🔥 Check for updates when online
  useEffect(() => {
    const checkUpdates = async () => {
      if (!navigator.onLine || quizzes.length === 0 || !userId) return;

      console.log('[DownloadedQuizzesPage] Checking for updates...');
      const updates = new Set<string>();

      for (const quiz of quizzes) {
        const result = await downloadManager.checkForUpdate(quiz.id, userId);
        if (result.hasUpdate) {
          updates.add(quiz.id);
        }
      }

      setUpdatesAvailable(updates);

      if (updates.size > 0) {
        toast.info(t('downloadedQuizzes.updatesAvailable', { count: updates.size }), { autoClose: 5000 });
      }
    };

    checkUpdates();
  }, [quizzes, userId, t]);

  const loadData = async () => {
    if (!userId) {
      console.error('No userId available');
      return;
    }
    
    setIsLoading(true);
    try {
      const [quizzesData, storage] = await Promise.all([
        downloadManager.getDownloadedQuizzes(userId),
        downloadManager.getStorageInfo(userId),
      ]);

      setQuizzes(quizzesData);
      setStorageInfo(storage);
    } catch (error) {
      console.error('Failed to load downloaded quizzes:', error);
      toast.error(t('downloadedQuizzes.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Delete quiz
  const handleDelete = async () => {
    if (!selectedQuiz || !userId) return;

    try {
      const success = await downloadManager.deleteDownloadedQuiz(selectedQuiz, userId);

      if (success) {
        toast.success(t('downloadedQuizzes.deleteSuccess'));
        await loadData();
      } else {
        toast.error(t('downloadedQuizzes.deleteError'));
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t('downloadedQuizzes.deleteFailed'));
    } finally {
      setShowDeleteConfirm(false);
      setSelectedQuiz(null);
    }
  };

  // Clear all
  const handleClearAll = async () => {
    if (!userId) return;
    
    try {
      const count = await downloadManager.clearAllDownloads(userId);
      toast.success(t('downloadedQuizzes.clearedCount', { count }));
      await loadData();
    } catch (error) {
      console.error('Clear all failed:', error);
      toast.error(t('downloadedQuizzes.clearError'));
    } finally {
      setShowClearAllConfirm(false);
    }
  };

  // Play quiz - go to preview first
  const handlePlay = (quizId: string) => {
    navigate(`/quiz/${quizId}/preview?offline=true`);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('downloadedQuizzes.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 🔥 Eviction Warning Banner */}
        {evictionWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  {t('downloadedQuizzes.evictionTitle')}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {t('downloadedQuizzes.evictionMessage')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📥 {t('downloadedQuizzes.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('downloadedQuizzes.subtitle')}
          </p>
        </div>

        {/* Storage Info */}
        {storageInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('downloadedQuizzes.storageTitle')}
              </h2>
              {quizzes.length > 0 && (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  {t('downloadedQuizzes.clearAll')}
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    storageInfo.percentUsed >= 80
                      ? 'bg-red-500'
                      : storageInfo.percentUsed >= 50
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageInfo.percentUsed, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {t('downloadedQuizzes.usedStorage')}: {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}
              </span>
              <span>{storageInfo.percentUsed.toFixed(1)}%</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                <p className="text-gray-500 dark:text-gray-400 mb-1">{t('downloadedQuizzes.quizzesDownloaded')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {storageInfo.downloadedQuizzes}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                <p className="text-gray-500 dark:text-gray-400 mb-1">{t('downloadedQuizzes.availableStorage')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatBytes(storageInfo.available)}
                </p>
              </div>
            </div>

            {/* 🔥 Storage Notice */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('downloadedQuizzes.storageNotice')}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Quiz List */}
        {quizzes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('downloadedQuizzes.noQuizzes')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('downloadedQuizzes.noQuizzesHint')}
            </p>
            <button
              onClick={() => navigate('/quizzes')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              {t('downloadedQuizzes.exploreQuizzes')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {quizzes.map((quiz) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Cover Image */}
                  <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                    {quiz.coverImage ? (
                      <OfflineImage
                        src={quiz.coverImage}
                        alt={quiz.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="h-16 w-16 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Offline Badge */}
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                      ✓ {t('downloadedQuizzes.offlineBadge')}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {quiz.title}
                    </h3>

                    {quiz.description && (
                      <SafeHTML 
                        content={quiz.description} 
                        className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2"
                        plainText
                      />
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path
                            fillRule="evenodd"
                            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {quiz.questions?.length || 0} {t('downloadedQuizzes.questions')}
                      </span>

                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {formatBytes(quiz.size)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                      {t('downloadedQuizzes.downloadedAt')}: {formatDate(quiz.downloadedAt)}
                    </p>

                    {/* 🔥 Update Available Badge */}
                    {updatesAvailable.has(quiz.id) && (
                      <div className="mb-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start gap-2">
                        <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">{t('downloadedQuizzes.updateAvailable')}</p>
                          <button
                            onClick={async () => {
                              if (!userId) {
                                toast.error(t('downloadedQuizzes.loginRequired'));
                                return;
                              }
                              toast.info(t('downloadedQuizzes.updating'));
                              const result = await downloadManager.updateDownloadedQuiz(quiz.id, userId);
                              if (result.success) {
                                toast.success(t('downloadedQuizzes.updateSuccess'));
                                await loadData();
                                setUpdatesAvailable((prev) => {
                                  const newSet = new Set(prev);
                                  newSet.delete(quiz.id);
                                  return newSet;
                                });
                              } else {
                                toast.error(result.error || t('downloadedQuizzes.updateFailed'));
                              }
                            }}
                            className="text-yellow-700 dark:text-yellow-400 underline hover:no-underline"
                          >
                            {t('downloadedQuizzes.updateNow')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlay(quiz.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                      >
                        {t('downloadedQuizzes.playNow')}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedQuiz(quiz.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 p-2 rounded-lg transition-colors"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Delete Confirm Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('downloadedQuizzes.deleteConfirmTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('downloadedQuizzes.deleteConfirmMessage')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {t('downloadedQuizzes.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    {t('downloadedQuizzes.delete')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear All Confirm Dialog */}
        <AnimatePresence>
          {showClearAllConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowClearAllConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('downloadedQuizzes.clearAllConfirmTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('downloadedQuizzes.clearAllConfirmMessage', { 
                    count: quizzes.length, 
                    size: formatBytes(storageInfo?.used || 0) 
                  })}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearAllConfirm(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {t('downloadedQuizzes.cancel')}
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    {t('downloadedQuizzes.deleteAll')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DownloadedQuizzesPage;

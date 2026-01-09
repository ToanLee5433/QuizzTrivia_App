/**
 * 🔨 Build Vector Index - Admin Page
 * 
 * Admin tool to rebuild vector index via Cloud Function
 * Secure: Uses Firebase Cloud Functions with proper authentication
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, PlayCircle, CheckCircle, XCircle, Loader, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { RootState } from '../../../lib/store';
import { getFunctions, httpsCallable, HttpsCallableOptions } from 'firebase/functions';
import app from '../../../lib/firebase/config';

const functions = getFunctions(app, 'us-central1');
// Extended timeout for long-running index operations (10 minutes)
const longTimeoutOptions: HttpsCallableOptions = { timeout: 600000 };

interface IndexStats {
  exists: boolean;
  version?: string;
  totalChunks?: number;
  uniqueQuizzes?: number;
  sources?: Record<string, number>;
  createdAt?: string;
  message?: string;
}

interface RebuildResult {
  success: boolean;
  message: string;
  stats?: {
    totalChunks: number;
    processedQuizzes: number;
    failedQuizzes: number;
    durationMs: number;
  };
}

interface BuildStatus {
  status: 'idle' | 'loading' | 'building' | 'success' | 'error';
  message: string;
  stats?: RebuildResult['stats'];
  error?: string;
}

export function BuildIndexPage() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({
    status: 'idle',
    message: t('admin.buildIndex.ready'),
  });
  const [indexStats, setIndexStats] = useState<IndexStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load index stats on mount
  useEffect(() => {
    if (user?.role === 'admin') {
      loadIndexStats();
    }
  }, [user]);

  const loadIndexStats = async () => {
    setLoadingStats(true);
    try {
      const getStats = httpsCallable<unknown, IndexStats>(functions, 'getIndexStats');
      const result = await getStats({});
      setIndexStats(result.data);
    } catch (error) {
      console.error('Failed to load index stats:', error);
      setIndexStats({ exists: false, message: 'Không thể tải thống kê' });
    } finally {
      setLoadingStats(false);
    }
  };

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Access Denied
                </h2>
                <p className="text-red-700 dark:text-red-300 mt-1">
                  Bạn cần đăng nhập với tài khoản admin để truy cập trang này.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleRebuildIndex = async () => {
    setBuildStatus({
      status: 'building',
      message: 'Đang rebuild vector index từ Cloud Function...',
    });

    try {
      const rebuildIndex = httpsCallable<unknown, RebuildResult>(functions, 'rebuildFullIndex', longTimeoutOptions);
      const result = await rebuildIndex({});
      
      if (result.data.success) {
        setBuildStatus({
          status: 'success',
          message: result.data.message,
          stats: result.data.stats,
        });
        // Reload stats
        await loadIndexStats();
      } else {
        throw new Error(result.data.message);
      }
      
    } catch (error) {
      console.error('❌ Error rebuilding index:', error);
      setBuildStatus({
        status: 'error',
        message: 'Lỗi khi rebuild index',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                RAG Vector Index Manager
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Quản lý vector index cho AI Learning Assistant
              </p>
            </div>
          </div>
        </div>

        {/* Current Index Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Index Statistics
            </h2>
            <button
              onClick={loadIndexStats}
              disabled={loadingStats}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : indexStats ? (
            indexStats.exists ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {indexStats.totalChunks}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Chunks</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {indexStats.uniqueQuizzes}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Quizzes Indexed</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    v{indexStats.version}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Version</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {indexStats.createdAt ? new Date(indexStats.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Last Updated</div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Index chưa được tạo</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Nhấn "Rebuild Index" để tạo index từ các quiz đã approved.
                </p>
              </div>
            )
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
              Không thể tải thống kê index
            </div>
          )}
        </div>

        {/* Rebuild Button */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Rebuild Index
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Rebuild toàn bộ index từ tất cả các quiz đã được approve. Quá trình này có thể mất vài phút tùy thuộc vào số lượng quiz.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRebuildIndex}
            disabled={buildStatus.status === 'building'}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            {buildStatus.status === 'building' ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Đang rebuild... (có thể mất vài phút)
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                Rebuild Full Index
              </>
            )}
          </motion.button>
        </div>

        {/* Status Card */}
        {(buildStatus.status === 'success' || buildStatus.status === 'error') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Kết quả
            </h2>

            <div className="flex items-start gap-3">
              {buildStatus.status === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {buildStatus.message}
                </p>
                {buildStatus.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {buildStatus.error}
                  </p>
                )}
              </div>
            </div>

            {/* Success Details */}
            {buildStatus.status === 'success' && buildStatus.stats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
              >
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  📊 Build Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Chunks:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {buildStatus.stats.totalChunks}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Quizzes Processed:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {buildStatus.stats.processedQuizzes}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Failed:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {buildStatus.stats.failedQuizzes}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {(buildStatus.stats.durationMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ✅ Index đã được lưu vào Firebase Storage
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    🤖 AI Learning Assistant đã sẵn sàng sử dụng!
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📝 {t('admin.buildIndex.instructions')}
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
            <li>{t('admin.buildIndex.step1')}</li>
            <li>{t('admin.buildIndex.step2')}</li>
            <li>{t('admin.buildIndex.step3')}</li>
            <li>{t('admin.buildIndex.step4')}</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              💡 {t('admin.buildIndex.notes')}
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>{t('admin.buildIndex.note1')}</li>
              <li>{t('admin.buildIndex.note2')}</li>
              <li>{t('admin.buildIndex.note3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BuildIndexPage;

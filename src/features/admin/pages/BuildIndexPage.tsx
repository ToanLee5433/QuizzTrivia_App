/**
 * 🔨 Build Vector Index - Admin Page
 * 
 * Admin tool to build vector index from browser
 * Uses current user's Firebase Auth for permissions
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, PlayCircle, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../lib/store';
import { buildIndex } from '../../../lib/genkit/indexing';
import type { VectorIndex } from '../../../lib/genkit/types';

interface BuildStatus {
  status: 'idle' | 'building' | 'success' | 'error';
  message: string;
  index?: VectorIndex;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export function BuildIndexPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({
    status: 'idle',
    message: 'Sẵn sàng build vector index',
  });

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

  const handleBuildIndex = async () => {
    setBuildStatus({
      status: 'building',
      message: 'Đang build vector index...',
      startTime: Date.now(),
    });

    try {
      // Build index using current user's auth
      const index = await buildIndex();

      // Save to localStorage first
      localStorage.setItem('vector-index', JSON.stringify(index));
      console.log('✅ Index saved to localStorage');
      
      // Save to Firestore for Cloud Functions
      try {
        // Remove undefined values to avoid Firestore errors
        const sanitizedIndex = JSON.parse(JSON.stringify(index));
        
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../../../lib/firebase/config');
        await setDoc(doc(db, 'system', 'vector-index'), sanitizedIndex);
        
        console.log('✅ Index saved to Firestore successfully');
      } catch (firestoreError) {
        console.error('❌ Failed to save to Firestore:', firestoreError);
        throw new Error(
          `Lỗi khi lưu vào Firestore: ${
            firestoreError instanceof Error ? firestoreError.message : 'Unknown error'
          }. Vui lòng kiểm tra:\n` +
          '1. Bạn đã đăng nhập với tài khoản admin?\n' +
          '2. Firestore rules đã được deploy?\n' +
          '3. Tài khoản có role = "admin" trong Firestore?'
        );
      }

      setBuildStatus({
        status: 'success',
        message: 'Build thành công!',
        index,
        endTime: Date.now(),
        startTime: buildStatus.startTime,
      });
      
    } catch (error) {
      console.error('❌ Error building index:', error);
      setBuildStatus({
        status: 'error',
        message: 'Lỗi khi build index',
        error: error instanceof Error ? error.message : String(error),
        endTime: Date.now(),
        startTime: buildStatus.startTime,
      });
    }
  };

  const getDuration = () => {
    if (buildStatus.startTime && buildStatus.endTime) {
      return ((buildStatus.endTime - buildStatus.startTime) / 1000).toFixed(2);
    }
    return null;
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
                Build Vector Index
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tạo vector index từ quiz data cho RAG Chatbot
              </p>
            </div>
          </div>
        </div>

        {/* Build Button */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBuildIndex}
            disabled={buildStatus.status === 'building'}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            {buildStatus.status === 'building' ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Đang build...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                Build Vector Index
              </>
            )}
          </motion.button>
        </div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Status
          </h2>

          <div className="space-y-4">
            {/* Status Message */}
            <div className="flex items-start gap-3">
              {buildStatus.status === 'idle' && (
                <Database className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
              )}
              {buildStatus.status === 'building' && (
                <Loader className="w-6 h-6 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
              )}
              {buildStatus.status === 'success' && (
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              {buildStatus.status === 'error' && (
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
            {buildStatus.status === 'success' && buildStatus.index && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2"
              >
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  📊 Index Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Chunks:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {buildStatus.index.totalChunks}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Quiz Chunks:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {buildStatus.index.sources.quiz || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">PDF Chunks:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {buildStatus.index.sources.pdf || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Build Time:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {getDuration()}s
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ✅ Index đã được lưu vào localStorage và Firestore
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    📂 Firestore: system/vector-index
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    🤖 AI chatbot có thể sử dụng ngay!
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📝 Hướng dẫn
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
            <li>Click "Build Vector Index" để bắt đầu</li>
            <li>Chờ hệ thống extract quiz data và generate embeddings</li>
            <li>Index sẽ được lưu vào localStorage</li>
            <li>Sử dụng index này để test RAG chatbot</li>
            <li>Trong production, deploy Cloud Function để build index tự động</li>
          </ol>
        </div>

        {/* Next Steps */}
        {buildStatus.status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6"
          >
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              🎉 Next Steps
            </h3>
            <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-2 list-disc list-inside">
              <li>Test RAG chatbot với vector index vừa build</li>
              <li>Deploy Cloud Functions: <code className="bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">firebase deploy --only functions:askRAG</code></li>
              <li>Update ChatbotModal để connect với backend</li>
              <li>Test end-to-end với real questions</li>
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default BuildIndexPage;

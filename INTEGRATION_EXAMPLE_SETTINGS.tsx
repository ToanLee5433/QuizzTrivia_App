/**
 * 🔧 SettingsPage.tsx - Manual Cleanup Button Integration
 * =========================================================
 * Thêm nút dọn dẹp thủ công cho người dùng
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { downloadManager } from '../features/offline/DownloadManager';
import { toast } from 'react-toastify';
import { FaTrash, FaSpinner, FaCheckCircle } from 'react-icons/fa';

interface StorageStats {
  totalQuizzes: number;
  totalMediaFiles: number;
  estimatedSize: string;
  lastCleanup: string;
}

function SettingsPage() {
  const { user } = useAuth();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  // ============================================================================
  // 📊 GET STORAGE STATISTICS
  // ============================================================================
  const loadStorageStats = async () => {
    if (!user?.uid) return;

    try {
      // Get all user's quizzes
      const quizzes = await downloadManager.getDownloadedQuizzes(user.uid);
      
      // Estimate storage size (rough estimate)
      const estimatedSize = Math.round(quizzes.length * 25); // ~25MB per quiz
      
      // Get last cleanup timestamp
      const lastCleanup = parseInt(localStorage.getItem('last_media_cleanup') || '0', 10);
      const lastCleanupDate = lastCleanup 
        ? new Date(lastCleanup).toLocaleDateString('vi-VN')
        : 'Chưa dọn dẹp';
      
      setStorageStats({
        totalQuizzes: quizzes.length,
        totalMediaFiles: quizzes.reduce((sum, q) => sum + (q.mediaUrls?.length || 0), 0),
        estimatedSize: `${estimatedSize} MB`,
        lastCleanup: lastCleanupDate
      });
    } catch (error) {
      console.error('[SettingsPage] Failed to load storage stats:', error);
    }
  };

  // Load stats on mount
  React.useEffect(() => {
    loadStorageStats();
  }, [user]);

  // ============================================================================
  // 🧹 MANUAL CLEANUP HANDLER
  // ============================================================================
  const handleManualCleanup = async () => {
    if (!user?.uid) {
      toast.error('Vui lòng đăng nhập để dọn dẹp dữ liệu');
      return;
    }

    setIsCleaningUp(true);

    try {
      console.log('[SettingsPage] Starting manual cleanup...');
      
      // Run orphaned media cleanup
      const deletedCount = await downloadManager.cleanupOrphanedMedia(user.uid);
      
      // Save cleanup timestamp
      localStorage.setItem('last_media_cleanup', Date.now().toString());
      
      // Reload stats
      await loadStorageStats();
      
      // Show success message
      if (deletedCount > 0) {
        toast.success(
          `✅ Đã dọn dẹp ${deletedCount} file media không sử dụng`,
          { autoClose: 5000 }
        );
      } else {
        toast.info(
          '✅ Không có file media nào cần dọn dẹp',
          { autoClose: 3000 }
        );
      }
      
      console.log(`[SettingsPage] ✅ Cleanup complete: ${deletedCount} files deleted`);
    } catch (error) {
      console.error('[SettingsPage] Cleanup failed:', error);
      
      toast.error(
        '❌ Lỗi khi dọn dẹp dữ liệu. Vui lòng thử lại.',
        { autoClose: 5000 }
      );
    } finally {
      setIsCleaningUp(false);
    }
  };

  // ============================================================================
  // 🗑️ CLEAR ALL OFFLINE DATA (Nuclear option)
  // ============================================================================
  const handleClearAllData = async () => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      '⚠️ XÓA TẤT CẢ DỮ LIỆU OFFLINE?\n\n' +
      'Thao tác này sẽ xóa:\n' +
      '• Tất cả bài quiz đã tải xuống\n' +
      '• Tất cả hình ảnh và media\n' +
      '• Các thao tác chưa đồng bộ\n\n' +
      'Không thể hoàn tác!'
    );

    if (!confirmed) return;

    setIsCleaningUp(true);

    try {
      // Delete all quizzes (also deletes media)
      const quizzes = await downloadManager.getDownloadedQuizzes(user.uid);
      
      for (const quiz of quizzes) {
        await downloadManager.deleteDownloadedQuiz(quiz.id, user.uid);
      }
      
      // Clear cleanup timestamp
      localStorage.removeItem('last_media_cleanup');
      
      // Reload stats
      await loadStorageStats();
      
      toast.success(
        '✅ Đã xóa toàn bộ dữ liệu offline',
        { autoClose: 5000 }
      );
    } catch (error) {
      console.error('[SettingsPage] Failed to clear all data:', error);
      
      toast.error(
        '❌ Lỗi khi xóa dữ liệu. Vui lòng thử lại.',
        { autoClose: 5000 }
      );
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Cài đặt</h1>

        {/* ============================================================================
            📊 STORAGE STATISTICS CARD
            ============================================================================ */}
        <div className="card bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">💾</span>
            Quản lý bộ nhớ offline
          </h2>

          {storageStats ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="stat">
                <div className="text-gray-600 text-sm">Bài quiz đã tải</div>
                <div className="text-2xl font-bold">{storageStats.totalQuizzes}</div>
              </div>
              
              <div className="stat">
                <div className="text-gray-600 text-sm">File media</div>
                <div className="text-2xl font-bold">{storageStats.totalMediaFiles}</div>
              </div>
              
              <div className="stat">
                <div className="text-gray-600 text-sm">Dung lượng ước tính</div>
                <div className="text-2xl font-bold">{storageStats.estimatedSize}</div>
              </div>
              
              <div className="stat">
                <div className="text-gray-600 text-sm">Dọn dẹp lần cuối</div>
                <div className="text-lg font-semibold">{storageStats.lastCleanup}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 mb-6">Đang tải thông tin...</div>
          )}

          {/* ============================================================================
              🧹 CLEANUP BUTTONS
              ============================================================================ */}
          <div className="flex gap-4">
            {/* Manual cleanup button */}
            <button
              onClick={handleManualCleanup}
              disabled={isCleaningUp || !user}
              className="btn btn-primary flex items-center justify-center px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCleaningUp ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Đang dọn dẹp...
                </>
              ) : (
                <>
                  <FaCheckCircle className="mr-2" />
                  Dọn dẹp file không dùng
                </>
              )}
            </button>

            {/* Nuclear option */}
            <button
              onClick={handleClearAllData}
              disabled={isCleaningUp || !user}
              className="btn btn-danger flex items-center justify-center px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTrash className="mr-2" />
              Xóa toàn bộ dữ liệu
            </button>
          </div>

          {/* ============================================================================
              ℹ️ HELP TEXT
              ============================================================================ */}
          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-2">
              <strong>Dọn dẹp file không dùng:</strong> Xóa các file media của bài quiz đã bị xóa
            </p>
            <p>
              <strong>Xóa toàn bộ dữ liệu:</strong> Xóa tất cả bài quiz và media đã tải xuống
            </p>
          </div>
        </div>

        {/* Other settings sections... */}
      </div>
    </div>
  );
}

export default SettingsPage;

/**
 * 📝 INTEGRATION CHECKLIST
 * =========================
 * 
 * ✅ 1. Storage statistics dashboard
 * ✅ 2. Manual cleanup button with loading state
 * ✅ 3. Clear all data button (nuclear option)
 * ✅ 4. Toast notifications for user feedback
 * ✅ 5. Confirmation dialog for destructive actions
 * 
 * 🎨 STYLING NOTES:
 * - Uses Tailwind CSS classes
 * - Responsive grid layout
 * - Disabled states for buttons
 * - Loading spinner animation
 * 
 * 🔜 OPTIONAL ENHANCEMENTS:
 * - Add "Auto cleanup" toggle switch
 * - Show storage quota progress bar
 * - Add "Force sync now" button
 * - Display sync queue length
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

interface QuickActionsProps {
  onRefreshData: () => void;
  stats: {
    totalUsers: number;
    totalQuizzes: number;
    completedQuizzes: number;
    totalCreators: number;
  };
}

const QuickActions: React.FC<QuickActionsProps> = ({ onRefreshData, stats }) => {
  const [loading, setLoading] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    targetRole: 'all' as 'all' | 'user' | 'creator'
  });
  const [showBanner, setShowBanner] = useState(false);
  const [bannerData, setBannerData] = useState<{message:string,type:string}|null>(null);

  const { t } = useTranslation();

  // 1. Tạo thông báo hệ thống
  const createSystemNotification = async () => {
    if (!notificationData.message.trim()) {
      toast.error(t('admin.quickActions.toasts.enterMessage'));
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'system_notifications'), {
        message: notificationData.message,
        type: notificationData.type,
        createdAt: new Date(),
        isActive: true,
        targetRole: notificationData.targetRole
      });
      
      // Reset form
      setNotificationData({
        message: '',
        type: 'info',
        targetRole: 'all'
      });
      setShowNotificationModal(false);
      setBannerData({ message: notificationData.message, type: notificationData.type });
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 5000);
      
      toast.success(t('admin.quickActions.toasts.createSuccess'));
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error(t('admin.quickActions.toasts.createError'));
    } finally {
      setLoading(false);
    }
  };

  const openNotificationModal = () => {
    setShowNotificationModal(true);
  };

  // 2. Backup dữ liệu
  const backupData = async () => {
    // ⚠️ WARNING: Limited backup
    if (!confirm('⚠️ Backup will only include recent data (max 1000 items per collection). Continue?')) return;
    
    setLoading(true);
    try {
      const collections = ['users', 'quizzes', 'categories', 'quiz_results'];
      const backup: any = {};
      
      for (const collectionName of collections) {
        // ✅ FIXED: Added limit
        const limitedQuery = query(collection(db, collectionName), limit(1000));
        const snapshot = await getDocs(limitedQuery);
        backup[collectionName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Tạo file backup
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quiz-app-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      toast.success(t('admin.quickActions.toasts.backupSuccess'));
    } catch (error) {
      toast.error(t('admin.quickActions.toasts.backupError'));
    } finally {
      setLoading(false);
    }
  };

  // 3. Xóa thông báo hệ thống
  const deleteNotifications = async () => {
    if (!confirm(t('admin.quickActions.toasts.confirmDeleteAll'))) return;
    
    setLoading(true);
    try {
      // ✅ FIXED: Only delete active notifications with limit
      const notificationsQuery = query(
        collection(db, 'system_notifications'),
        where('isActive', '==', true),
        limit(500)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const deletePromises = notificationsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isActive: false })
      );
      
      await Promise.all(deletePromises);
      toast.success(t('admin.quickActions.toasts.deleteSuccess'));
      onRefreshData();
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error(t('admin.quickActions.toasts.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  // 4. Dọn dẹp dữ liệu đã xóa
  const cleanupDeletedData = async () => {
    if (!confirm(t('admin.quickActions.toasts.confirmCleanup'))) return;
    setLoading(true);
    try {
      // ✅ OPTIMIZED: Chỉ query docs có deleted=true, không load all
      const quizzesSnapshot = await getDocs(query(
        collection(db, 'quizzes'),
        where('deleted', '==', true),
        limit(50)
      ));
      const deletedQuizzes = quizzesSnapshot.docs;
      const quizDeletePromises = deletedQuizzes.map(q => updateDoc(doc(db, 'quizzes', q.id), { isPurged: true }));

      // ✅ OPTIMIZED: Chỉ query users có deleted=true
      const usersSnapshot = await getDocs(query(
        collection(db, 'users'),
        where('deleted', '==', true),
        limit(50)
      ));
      const deletedUsers = usersSnapshot.docs.filter(doc => doc.data().deleted === true);
      const userDeletePromises = deletedUsers.map(u => updateDoc(doc(db, 'users', u.id), { isPurged: true }));

      await Promise.all([...quizDeletePromises, ...userDeletePromises]);
      toast.success(t('admin.quickActions.toasts.cleanupSuccess'));
      onRefreshData();
    } catch (error) {
      toast.error(t('admin.quickActions.toasts.cleanupError'));
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    // Updated actions as requested
    {
      icon: '📢',
      title: t('admin.quickActions.items.notify.title'),
      description: t('admin.quickActions.items.notify.desc'),
      action: openNotificationModal,
      color: 'blue'
    },
    {
      icon: '❌',
      title: t('admin.quickActions.items.deleteNotifications.title'),
      description: t('admin.quickActions.items.deleteNotifications.desc'),
      action: deleteNotifications,
      color: 'red'
    },
    {
      icon: '🗂️',
      title: t('admin.quickActions.items.backup.title'),
      description: t('admin.quickActions.items.backup.desc'),
      action: backupData,
      color: 'green'
    },
    {
      icon: '🗑️',
      title: t('admin.quickActions.items.cleanup.title'),
      description: t('admin.quickActions.items.cleanup.desc'),
      action: cleanupDeletedData,
      color: 'orange'
    }
  ];

  // Banner notification UI
  useEffect(() => {
    if (showBanner && bannerData) {
      document.body.classList.add('overflow-x-hidden');
    } else {
      document.body.classList.remove('overflow-x-hidden');
    }
  }, [showBanner, bannerData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow relative">
      {/* Banner notification */}
      {showBanner && bannerData && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 rounded-full shadow-lg flex items-center gap-4 animate-slide-in
          ${bannerData.type === 'info' ? 'bg-blue-500 text-white' : ''}
          ${bannerData.type === 'success' ? 'bg-green-500 text-white' : ''}
          ${bannerData.type === 'warning' ? 'bg-yellow-400 text-gray-900' : ''}
          ${bannerData.type === 'error' ? 'bg-red-500 text-white' : ''}
        `} style={{ minWidth: 320, maxWidth: '90vw' }}>
          <span className="font-semibold text-lg truncate flex-1">{bannerData.message}</span>
          <button onClick={()=>setShowBanner(false)} className="ml-4 text-xl font-bold focus:outline-none">×</button>
        </div>
      )}
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="text-2xl mr-2">⚡</span>
        {t('admin.quickActions.title')}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            disabled={loading}
            className={`p-4 border-2 rounded-lg transition-all duration-200 text-left
              border-${action.color}-200 hover:border-${action.color}-500 hover:bg-${action.color}-50
              ${loading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            <div className="text-3xl mb-2">{action.icon}</div>
            <div className="font-medium mb-1">{action.title}</div>
            <div className="text-sm text-gray-600">{action.description}</div>
          </button>
        ))}
      </div>

      {/* Thống kê nhanh hiển thị */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">📊 {t('admin.quickActions.systemStatus')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">{t('admin.quickActions.stats.users')}</div>
            <div className="font-bold text-blue-600">{stats.totalUsers}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('admin.quickActions.stats.totalQuizzes')}</div>
            <div className="font-bold text-yellow-600">{stats.totalQuizzes}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('admin.quickActions.stats.completions')}</div>
            <div className="font-bold text-green-600">{stats.completedQuizzes}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('admin.quickActions.stats.creators')}</div>
            <div className="font-bold text-purple-600">{stats.totalCreators}</div>
          </div>
        </div>
      </div>

      {/* Modal gửi thông báo */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">{t('admin.quickActions.modal.title')}</h2>
            
            <div className="space-y-4">
              {/* Nội dung thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.quickActions.modal.contentLabel')}
                </label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('admin.quickActions.modal.contentPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Loại thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.quickActions.modal.typeLabel')}
                </label>
                <select
                  value={notificationData.type}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="info">{t('admin.quickActions.modal.type.info')}</option>
                  <option value="warning">{t('admin.quickActions.modal.type.warning')}</option>
                  <option value="success">{t('admin.quickActions.modal.type.success')}</option>
                  <option value="error">{t('admin.quickActions.modal.type.error')}</option>
                </select>
              </div>

              {/* Đối tượng nhận thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.quickActions.modal.targetLabel')}
                </label>
                <select
                  value={notificationData.targetRole}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, targetRole: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('admin.quickActions.modal.target.all')}</option>
                  <option value="user">{t('admin.quickActions.modal.target.user')}</option>
                  <option value="creator">{t('admin.quickActions.modal.target.creator')}</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={createSystemNotification}
                  disabled={loading || !notificationData.message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('admin.quickActions.modal.sending') : t('admin.quickActions.modal.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActions;

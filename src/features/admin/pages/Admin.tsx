import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../lib/store';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

const Admin: React.FC = () => {
  const { t } = useTranslation();
  // State cho thống kê
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalUsers: 0,
    completedQuizzes: 0,
    totalCreators: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log(' [Admin] Fetching stats with getCountFromServer...');
        
        // OPTIMIZED: Load toàn bộ users để đếm creators chính xác
        // Lý do: Nếu dùng limit(200), có thể bỏ sót creators nằm ngoài 200 users đầu
        const [quizzesCount, allUsersCount, quizResultsSnap, allUsersSnap] = await Promise.all([
          getCountFromServer(query(collection(db, 'quizzes'), where('status', '==', 'approved'))),
          getCountFromServer(collection(db, 'users')), // Đếm TẤT CẢ users
          getDocs(query(collection(db, 'quizResults'), orderBy('completedAt', 'desc'), limit(100))),
          getDocs(collection(db, 'users')) // FIXED: Load ALL users để đếm creators chính xác
        ]);

        const totalQuizzes = quizzesCount.data().count;
        const totalUsers = allUsersCount.data().count;
        
        console.log(' [Admin] Total users (count):', totalUsers);
        console.log(' [Admin] Total quizzes (approved):', totalQuizzes);

        // Đếm creators từ TOÀN BỘ users (chính xác 100%)
        const users = allUsersSnap.docs.map(doc => doc.data() as any);
        const activeUsers = users.filter(u => u?.isActive !== false && u?.isDeleted !== true);
        const totalCreators = activeUsers.filter(u => u?.role === 'creator' || u?.role === 'admin').length;
        
        console.log(' [Admin] Total users loaded:', users.length);
        console.log(' [Admin] Active users:', activeUsers.length, 'Creators:', totalCreators);

        // Đếm số quiz đã hoàn thành từ quizResults collection
        const completedQuizzes = quizResultsSnap.docs.filter(doc => {
          const data = doc.data();
          return data.completed === true || data.score !== undefined;
        }).length;

        setStats({
          totalQuizzes,
          totalUsers,
          completedQuizzes,
          totalCreators,
        });
      } catch (_) {
        // silent
      }
    };
    fetchStats();
  }, []);
  const { user } = useSelector((state: RootState) => state.auth);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationData, setNotificationData] = useState({
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    targetRole: 'all' as 'all' | 'user' | 'creator'
  });

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
      
      toast.success(t('admin.quickActions.toasts.createSuccess'));
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error(t('admin.quickActions.toasts.createError'));
    } finally {
      setLoading(false);
    }
  };

  // Backup dữ liệu
  const handleBackup = async () => {
    // ⚠️ WARNING: This will fetch limited data for backup
    if (!confirm('⚠️ Backup will only include recent data (limited to 1000 items per collection). Continue?')) return;
    
    setLoading(true);
    try {
      const collections = ['users', 'quizzes', 'categories', 'quiz_results'];
      const backup: any = {};
      
      for (const collectionName of collections) {
        // ✅ FIXED: Added limit to prevent fetching entire collections
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

  // Xóa thông báo hệ thống
  const deleteNotifications = async () => {
    if (!confirm(t('admin.quickActions.toasts.confirmDeleteAll'))) return;
    
    setLoading(true);
    try {
      // ✅ FIXED: Only delete active notifications, limited to 500
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
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error(t('admin.quickActions.toasts.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  // Dọn dẹp dữ liệu đã xóa
  const cleanupDeletedData = async () => {
    if (!confirm(t('admin.quickActions.toasts.confirmCleanup'))) return;
    setLoading(true);
    try {
      // ✅ FIXED: Query only deleted items with limit
      const deletedQuizzesQuery = query(
        collection(db, 'quizzes'),
        where('deleted', '==', true),
        limit(500)
      );
      const quizzesSnapshot = await getDocs(deletedQuizzesQuery);
      const quizDeletePromises = quizzesSnapshot.docs.map(q => 
        updateDoc(doc(db, 'quizzes', q.id), { isPurged: true })
      );

      const deletedUsersQuery = query(
        collection(db, 'users'),
        where('deleted', '==', true),
        limit(500)
      );
      const usersSnapshot = await getDocs(deletedUsersQuery);
      const userDeletePromises = usersSnapshot.docs.map(u => 
        updateDoc(doc(db, 'users', u.id), { isPurged: true })
      );

      await Promise.all([...quizDeletePromises, ...userDeletePromises]);
      toast.success(t('admin.quickActions.toasts.cleanupSuccess'));
    } catch (error) {
      toast.error(t('admin.quickActions.toasts.cleanupError'));
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('admin.loginAsAdmin')}</p>
      </div>
    );
  }

  return (
    <AdminLayout title={t("admin.sidebar.nav.dashboard")}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('admin.greeting')}</h1>
        <p className="text-blue-100">{t('admin.dashboardSubtitle')}</p>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">{t('dashboard.totalQuizzes')}</h3>
              <div className="text-xl md:text-3xl font-bold text-blue-600">{stats.totalQuizzes}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">{t('dashboard.totalUsers')}</h3>
              <div className="text-xl md:text-3xl font-bold text-green-600">{stats.totalUsers}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">{t('dashboard.completedQuizzes')}</h3>
              <div className="text-xl md:text-3xl font-bold text-purple-600">{stats.completedQuizzes}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">✏️</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">{t('dashboard.totalCreators')}</h3>
              <div className="text-xl md:text-3xl font-bold text-orange-600">{stats.totalCreators}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Management Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">{t('admin.tabs.quizManagement')}</h3>
          <div className="space-y-2">
            <Link 
              to="/admin/quiz-management" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              ◆ {t('admin.tabs.quizManagement')}
            </Link>
            <Link 
              to="/admin/categories" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              📂 {t('admin.tabs.categoryManagement')}
            </Link>
            <Link 
              to="/admin/quiz-stats" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              📊 {t('admin.stats.quizActivity')}
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">{t('admin.tabs.userManagement')}</h3>
          <div className="space-y-2">
            <Link 
              to="/admin/users" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              👥 {t('admin.tabs.users')}
            </Link>
            <Link 
              to="/admin/roles" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              🔐 {t('admin.roles')}
            </Link>
          </div>
        </div>
      </div>
      
      {/* Quick Actions - Enhanced Design */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center">
            <span className="bg-blue-100 p-2 rounded-lg mr-3">⚡</span>
              {t('admin.quickActions.title')}
          </h2>
          <span className="text-sm text-gray-500">{t('admin.quickActions.important')}</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <button 
            onClick={() => setShowNotificationModal(true)}
            className="group bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">📢</span>
              <span className="text-sm font-medium">{t('admin.quickActions.items.notify.title')}</span>
            </div>
          </button>
          
          <button 
            onClick={deleteNotifications}
            className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">❌</span>
              <span className="text-sm font-medium">{t('admin.quickActions.items.deleteNotifications.title')}</span>
            </div>
          </button>
          
          <button 
            onClick={handleBackup}
            className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">💾</span>
              <span className="text-sm font-medium">{t('admin.quickActions.items.backup.title')}</span>
            </div>
          </button>
          
          <button 
            onClick={cleanupDeletedData}
            className="group bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">🗑️</span>
              <span className="text-sm font-medium">{t('admin.quickActions.items.cleanup.title')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Modal gửi thông báo - Responsive */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md mx-4">
            <h2 className="text-lg md:text-xl font-semibold mb-4">{t('admin.quickActions.modal.title')}</h2>
            
            <div className="space-y-4">
              {/* Nội dung thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.quickActions.modal.contentLabel')}</label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('admin.quickActions.modal.contentPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  rows={4}
                />
              </div>

              {/* Loại thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.quickActions.modal.typeLabel')}</label>
                <select
                  value={notificationData.type}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                >
                  <option value="info">{t('admin.quickActions.modal.type.info')}</option>
                  <option value="warning">{t('admin.quickActions.modal.type.warning')}</option>
                  <option value="success">{t('admin.quickActions.modal.type.success')}</option>
                  <option value="error">{t('admin.quickActions.modal.type.error')}</option>
                </select>
              </div>

              {/* Đối tượng nhận thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.quickActions.modal.targetLabel')}</label>
                <select
                  value={notificationData.targetRole}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, targetRole: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                >
                  <option value="all">{t('admin.quickActions.modal.target.all')}</option>
                  <option value="user">{t('admin.quickActions.modal.target.user')}</option>
                  <option value="creator">{t('admin.quickActions.modal.target.creator')}</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm md:text-base"
                  disabled={loading}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={createSystemNotification}
                  disabled={loading || !notificationData.message.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {loading ? t('admin.quickActions.modal.sending') : t('admin.quickActions.modal.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Admin;
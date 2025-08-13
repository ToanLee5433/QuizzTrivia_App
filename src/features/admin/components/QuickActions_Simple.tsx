import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

interface QuickActionsProps {
  onRefreshData: () => void;
  stats: {
    totalUsers: number;
    pendingQuizzes: number;
    approvedQuizzes: number;
    totalCategories: number;
  };
}

// Đổi tên component
const QuickActionsSimple: React.FC<QuickActionsProps> = ({ stats }) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    targetRole: 'all' as 'all' | 'user' | 'creator'
  });

  // 1. Tạo thông báo hệ thống
  const createSystemNotification = async () => {
    if (!notificationData.message.trim()) {
      toast.error(t('admin.quickActions.toasts.enterMessage', 'Please enter notification content!'));
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
      
      toast.success(t('admin.quickActions.toasts.createSuccess', 'Notification created successfully!'));
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error(t('admin.quickActions.toasts.createError', 'Error creating notification!'));
    } finally {
      setLoading(false);
    }
  };

  const openNotificationModal = () => {
    console.log('🚀 Opening notification modal...');
    setShowNotificationModal(true);
    console.log('📊 Modal state should be:', true);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
        <span className="mr-2">⚡</span>
        {t('admin.quickActions.title', 'Quick actions')}
      </h3>
      
      {/* Nút gửi thông báo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={openNotificationModal}
          disabled={loading}
          className="p-4 border-2 border-blue-200 rounded-lg transition-all duration-200 text-left hover:border-blue-500 hover:bg-blue-50"
        >
          <div className="text-3xl mb-2">📢</div>
          <div className="font-medium mb-1">{t('admin.quickActions.items.notify.title', 'Send notification')}</div>
          <div className="text-sm text-gray-600">{t('admin.quickActions.items.notify.desc', 'Send notification to all users')}</div>
        </button>

        {/* Nút test modal */}
        <button
          onClick={() => {
            console.log('🧪 Test button clicked');
            setShowNotificationModal(true);
            console.log('🧪 Modal should be open now');
          }}
          className="p-4 border-2 border-red-200 rounded-lg transition-all duration-200 text-left hover:border-red-500 hover:bg-red-50"
        >
          <div className="text-3xl mb-2">🧪</div>
          <div className="font-medium mb-1">{t('admin.quickActions.testModal', 'Test Modal')}</div>
          <div className="text-sm text-gray-600">{t('admin.quickActions.testModalDesc', 'Open modal (Debug)')}</div>
        </button>

        {/* Placeholder */}
        <div className="p-4 border-2 border-gray-200 rounded-lg text-left bg-gray-50">
          <div className="text-3xl mb-2">🚧</div>
          <div className="font-medium mb-1">{t('admin.quickActions.inDevelopment', 'In development')}</div>
          <div className="text-sm text-gray-600">{t('admin.quickActions.moreSoon', 'More features coming soon')}</div>
        </div>
      </div>

      {/* Thống kê nhanh hiển thị */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">📊 {t('admin.quickActions.systemStatus', 'System status')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">{t('admin.quickActions.stats.users', 'Users')}</div>
            <div className="font-bold text-blue-600">{stats.totalUsers}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('status.pending', 'Pending')}</div>
            <div className="font-bold text-yellow-600">{stats.pendingQuizzes}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('status.approved', 'Approved')}</div>
            <div className="font-bold text-green-600">{stats.approvedQuizzes}</div>
          </div>
          <div>
            <div className="text-gray-600">{t('admin.tabs.categories', 'Categories')}</div>
            <div className="font-bold text-purple-600">{stats.totalCategories}</div>
          </div>
        </div>
      </div>

      {/* Debug info */}
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="font-medium mb-2 text-red-800">🧪 {t('admin.quickActions.debugPanel', 'Debug Panel')}</h4>
        <p className="text-sm text-red-600 mb-2">
          {t('admin.quickActions.modalState', 'Modal state')}: {showNotificationModal ? 'OPEN' : 'CLOSED'}
        </p>
        <p className="text-sm text-red-600">
          {t('admin.quickActions.debugHint', 'Press F12 to open Developer Tools and check Console log')}
        </p>
      </div>

      {/* Modal gửi thông báo */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">{t('admin.quickActions.modal.title', 'Send system notification')}</h2>
            
            <div className="space-y-4">
              {/* Nội dung thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.quickActions.modal.contentLabel', 'Notification content')}</label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('admin.quickActions.modal.contentPlaceholder', 'Enter notification content...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Loại thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.quickActions.modal.typeLabel', 'Notification type')}</label>
                <select
                  value={notificationData.type}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="info">{t('admin.quickActions.modal.type.info', 'Info (Blue)')}</option>
                  <option value="warning">{t('admin.quickActions.modal.type.warning', 'Warning (Yellow)')}</option>
                  <option value="success">{t('admin.quickActions.modal.type.success', 'Success (Green)')}</option>
                  <option value="error">{t('admin.quickActions.modal.type.error', 'Error (Red)')}</option>
                </select>
              </div>

              {/* Đối tượng nhận thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.quickActions.modal.targetLabel', 'Target audience')}</label>
                <select
                  value={notificationData.targetRole}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, targetRole: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('admin.quickActions.modal.target.all', 'All users')}</option>
                  <option value="user">{t('admin.quickActions.modal.target.user', 'Users only')}</option>
                  <option value="creator">{t('admin.quickActions.modal.target.creator', 'Creators only')}</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    console.log('🚪 Closing modal...');
                    setShowNotificationModal(false);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  onClick={createSystemNotification}
                  disabled={loading || !notificationData.message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('admin.quickActions.modal.sending', 'Sending...') : t('admin.quickActions.modal.send', 'Send notification')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActionsSimple;

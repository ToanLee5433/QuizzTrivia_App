import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
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

  // 1. Tạo thông báo hệ thống
  const createSystemNotification = async () => {
    if (!notificationData.message.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo!');
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
      
      toast.success('Thông báo đã được tạo thành công!');
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Có lỗi xảy ra khi tạo thông báo!');
    } finally {
      setLoading(false);
    }
  };

  const openNotificationModal = () => {
    setShowNotificationModal(true);
  };

  // 2. Backup dữ liệu
  const backupData = async () => {
    setLoading(true);
    try {
      const collections = ['users', 'quizzes', 'categories', 'quiz_results'];
      const backup: any = {};
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
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
      
      toast.success('Backup dữ liệu thành công!');
    } catch (error) {
      toast.error('Lỗi khi backup dữ liệu!');
    } finally {
      setLoading(false);
    }
  };

  // 3. Xóa thông báo hệ thống
  const deleteNotifications = async () => {
    if (!confirm('Bạn có chắc muốn xóa tất cả thông báo đang hiển thị?')) return;
    
    setLoading(true);
    try {
      // Lấy tất cả thông báo đang active
      const notificationsSnapshot = await getDocs(collection(db, 'system_notifications'));
      const deletePromises = notificationsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isActive: false })
      );
      
      await Promise.all(deletePromises);
      toast.success('Đã tắt tất cả thông báo!');
      onRefreshData();
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Lỗi khi xóa thông báo!');
    } finally {
      setLoading(false);
    }
  };

  // 4. Dọn dẹp dữ liệu đã xóa
  const cleanupDeletedData = async () => {
    if (!confirm('Bạn có chắc muốn dọn dẹp dữ liệu đã xoá (quiz, user)?')) return;
    setLoading(true);
    try {
      // Xóa quiz đã bị đánh dấu deleted=true
      const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
      const deletedQuizzes = quizzesSnapshot.docs.filter(doc => doc.data().deleted === true);
      const quizDeletePromises = deletedQuizzes.map(q => updateDoc(doc(db, 'quizzes', q.id), { isPurged: true }));

      // Xóa user đã bị đánh dấu deleted=true
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const deletedUsers = usersSnapshot.docs.filter(doc => doc.data().deleted === true);
      const userDeletePromises = deletedUsers.map(u => updateDoc(doc(db, 'users', u.id), { isPurged: true }));

      await Promise.all([...quizDeletePromises, ...userDeletePromises]);
      toast.success('Đã dọn dẹp dữ liệu xoá!');
      onRefreshData();
    } catch (error) {
      toast.error('Lỗi khi dọn dẹp dữ liệu xoá!');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    // Updated actions as requested
    {
      icon: '📢',
      title: 'Gửi thông báo',
      description: 'Gửi thông báo đến tất cả người dùng',
      action: openNotificationModal,
      color: 'blue'
    },
    {
      icon: '❌',
      title: 'Xóa thông báo',
      description: 'Tắt tất cả thông báo đang hiển thị',
      action: deleteNotifications,
      color: 'red'
    },
    {
      icon: '�',
      title: 'Backup dữ liệu',
      description: 'Sao lưu toàn bộ dữ liệu hệ thống',
      action: backupData,
      color: 'green'
    },
    {
      icon: '🗑️',
      title: 'Dọn dẹp dữ liệu xoá',
      description: 'Xóa quiz và user đã bị đánh dấu xoá',
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
        Thao tác nhanh (Đã cập nhật)
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
        <h4 className="font-medium mb-2">📊 Tình trạng hệ thống</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Người dùng</div>
            <div className="font-bold text-blue-600">{stats.totalUsers}</div>
          </div>
          <div>
            <div className="text-gray-600">Chờ duyệt</div>
            <div className="font-bold text-yellow-600">{stats.pendingQuizzes}</div>
          </div>
          <div>
            <div className="text-gray-600">Đã duyệt</div>
            <div className="font-bold text-green-600">{stats.approvedQuizzes}</div>
          </div>
          <div>
            <div className="text-gray-600">Danh mục</div>
            <div className="font-bold text-purple-600">{stats.totalCategories}</div>
          </div>
        </div>
      </div>

      {/* Modal gửi thông báo */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Gửi thông báo hệ thống</h2>
            
            <div className="space-y-4">
              {/* Nội dung thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung thông báo
                </label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Nhập nội dung thông báo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              {/* Loại thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại thông báo
                </label>
                <select
                  value={notificationData.type}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="info">Thông tin (Xanh)</option>
                  <option value="warning">Cảnh báo (Vàng)</option>
                  <option value="success">Thành công (Xanh lá)</option>
                  <option value="error">Lỗi (Đỏ)</option>
                </select>
              </div>

              {/* Đối tượng nhận thông báo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đối tượng nhận
                </label>
                <select
                  value={notificationData.targetRole}
                  onChange={(e) => setNotificationData(prev => ({ ...prev, targetRole: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="user">Chỉ User</option>
                  <option value="creator">Chỉ Creator</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  onClick={createSystemNotification}
                  disabled={loading || !notificationData.message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang gửi...' : 'Gửi thông báo'}
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

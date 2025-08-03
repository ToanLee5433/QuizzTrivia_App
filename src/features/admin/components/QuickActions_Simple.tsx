import React, { useState } from 'react';
import { toast } from 'react-toastify';
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    targetRole: 'all' as 'all' | 'user' | 'creator'
  });

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
      
      toast.success('Đã gửi thông báo hệ thống!');
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Lỗi khi gửi thông báo!');
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
        Thao tác nhanh
      </h3>
      
      {/* Nút gửi thông báo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={openNotificationModal}
          disabled={loading}
          className="p-4 border-2 border-blue-200 rounded-lg transition-all duration-200 text-left hover:border-blue-500 hover:bg-blue-50"
        >
          <div className="text-3xl mb-2">📢</div>
          <div className="font-medium mb-1">Gửi thông báo</div>
          <div className="text-sm text-gray-600">Gửi thông báo đến tất cả người dùng</div>
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
          <div className="font-medium mb-1">Test Modal</div>
          <div className="text-sm text-gray-600">Test mở modal (Debug)</div>
        </button>

        {/* Placeholder */}
        <div className="p-4 border-2 border-gray-200 rounded-lg text-left bg-gray-50">
          <div className="text-3xl mb-2">🚧</div>
          <div className="font-medium mb-1">Đang phát triển</div>
          <div className="text-sm text-gray-600">Các tính năng khác sẽ sớm có</div>
        </div>
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

      {/* Debug info */}
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="font-medium mb-2 text-red-800">🧪 Debug Panel</h4>
        <p className="text-sm text-red-600 mb-2">
          Modal state: {showNotificationModal ? 'OPEN' : 'CLOSED'}
        </p>
        <p className="text-sm text-red-600">
          Nhấn F12 để mở Developer Tools và xem Console log
        </p>
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
                  onClick={() => {
                    console.log('🚪 Closing modal...');
                    setShowNotificationModal(false);
                  }}
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

export default QuickActionsSimple;

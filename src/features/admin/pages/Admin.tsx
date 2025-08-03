import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../../lib/store';
import AdminLayout from '../components/AdminLayout';
import { toast } from 'react-toastify';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

const Admin: React.FC = () => {
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
        // Lấy tất cả quiz
        const quizzesSnap = await getDocs(collection(db, 'quizzes'));
        const quizzes = quizzesSnap.docs.map(doc => doc.data());
        // Chỉ lấy quiz đã được duyệt (status === 'approved')
        const approvedQuizzes = quizzes.filter(q => q.status === 'approved');
        const totalQuizzes = approvedQuizzes.length;
        const completedQuizzes = approvedQuizzes.filter(q => q.completed === true || q.status === 'completed').length;
        const totalCreators = approvedQuizzes
          .map(q => q.creatorId)
          .filter((v, i, a) => v && a.indexOf(v) === i).length;

        // Lấy tổng số user
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => doc.data());
        const totalUsers = users.length;

        setStats({
          totalQuizzes,
          totalUsers,
          completedQuizzes,
          totalCreators,
        });
      } catch (err) {
        // Có thể toast lỗi nếu muốn
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

  // Backup dữ liệu
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

  // Xóa thông báo hệ thống
  const deleteNotifications = async () => {
    if (!confirm('Bạn có chắc muốn xóa tất cả thông báo đang hiển thị?')) return;
    
    setLoading(true);
    try {
      const notificationsSnapshot = await getDocs(collection(db, 'system_notifications'));
      const deletePromises = notificationsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isActive: false })
      );
      
      await Promise.all(deletePromises);
      toast.success('Đã tắt tất cả thông báo!');
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Lỗi khi xóa thông báo!');
    } finally {
      setLoading(false);
    }
  };

  // Dọn dẹp dữ liệu đã xóa
  const cleanupDeletedData = async () => {
    if (!confirm('Bạn có chắc muốn dọn dẹp dữ liệu đã xoá (quiz, user)?')) return;
    setLoading(true);
    try {
      const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
      const deletedQuizzes = quizzesSnapshot.docs.filter(doc => doc.data().deleted === true);
      const quizDeletePromises = deletedQuizzes.map(q => updateDoc(doc(db, 'quizzes', q.id), { isPurged: true }));

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const deletedUsers = usersSnapshot.docs.filter(doc => doc.data().deleted === true);
      const userDeletePromises = deletedUsers.map(u => updateDoc(doc(db, 'users', u.id), { isPurged: true }));

      await Promise.all([...quizDeletePromises, ...userDeletePromises]);
      toast.success('Đã dọn dẹp dữ liệu xoá!');
    } catch (error) {
      toast.error('Lỗi khi dọn dẹp dữ liệu xoá!');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Chào mừng đến với Admin Dashboard</h1>
        <p className="text-blue-100">Quản lý toàn bộ hệ thống Quiz một cách hiệu quả</p>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">Tổng số Quiz</h3>
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
              <h3 className="text-sm md:text-base font-semibold text-gray-900">Người dùng</h3>
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
              <h3 className="text-sm md:text-base font-semibold text-gray-900">Quiz hoàn thành</h3>
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
              <h3 className="text-sm md:text-base font-semibold text-gray-900">Người tạo</h3>
              <div className="text-xl md:text-3xl font-bold text-orange-600">{stats.totalCreators}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Management Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Quản lý Quiz</h3>
          <div className="space-y-2">
            <Link 
              to="/admin/quiz-management" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              📝 Duyệt Quiz
            </Link>
            <Link 
              to="/admin/categories" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              📂 Quản lý danh mục
            </Link>
            <Link 
              to="/admin/quiz-stats" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              📊 Thống kê Quiz
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Quản lý người dùng</h3>
          <div className="space-y-2">
            <Link 
              to="/admin/users" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              👥 Danh sách người dùng
            </Link>
            <Link 
              to="/admin/roles" 
              className="w-full text-left p-2 md:p-3 hover:bg-gray-50 rounded border block text-sm md:text-base"
            >
              🔐 Phân quyền người dùng
            </Link>
          </div>
        </div>
      </div>
      
      {/* Quick Actions - Enhanced Design */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center">
            <span className="bg-blue-100 p-2 rounded-lg mr-3">⚡</span>
            Thao tác nhanh
          </h2>
          <span className="text-sm text-gray-500">Các chức năng quan trọng</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <button 
            onClick={() => setShowNotificationModal(true)}
            className="group bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">📢</span>
              <span className="text-sm font-medium">Gửi thông báo</span>
            </div>
          </button>
          
          <button 
            onClick={deleteNotifications}
            className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">❌</span>
              <span className="text-sm font-medium">Xóa thông báo</span>
            </div>
          </button>
          
          <button 
            onClick={backupData}
            className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">💾</span>
              <span className="text-sm font-medium">Backup dữ liệu</span>
            </div>
          </button>
          
          <button 
            onClick={cleanupDeletedData}
            className="group bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            disabled={loading}
          >
            <div className="flex flex-col items-center space-y-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">🗑️</span>
              <span className="text-sm font-medium">Dọn dẹp dữ liệu</span>
            </div>
          </button>
        </div>
      </div>

      {/* Modal gửi thông báo - Responsive */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md mx-4">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Gửi thông báo hệ thống</h2>
            
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="user">Chỉ User</option>
                  <option value="creator">Chỉ Creator</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm md:text-base"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  onClick={createSystemNotification}
                  disabled={loading || !notificationData.message.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {loading ? 'Đang gửi...' : 'Gửi thông báo'}
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
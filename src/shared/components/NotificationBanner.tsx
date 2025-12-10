import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: any;
  targetRole?: 'all' | 'user' | 'creator' | 'admin';
  isActive: boolean;
}

const NotificationBanner: React.FC = () => {
  const { t } = useTranslation();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);

  // Sửa lại useEffect để xử lý lỗi đúng cách
  useEffect(() => {
    // Hàm này được khai báo trong useEffect để tránh vấn đề với React Hooks
    const loadActiveNotification = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const notificationsRef = collection(db, 'system_notifications');
        
        const q = query(
          notificationsRef,
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setNotification(null);
          setLoading(false);
          return;
        }

        let activeNotification = null;
        snapshot.forEach(doc => {
          const data = doc.data() as Notification;
          data.id = doc.id;
          if (
            data.targetRole === 'all' || 
            !data.targetRole || 
            data.targetRole === user.role
          ) {
            activeNotification = data;
          }
        });

        setNotification(activeNotification);
      } catch (err) {
        console.error('Error loading notifications:', err);
        setError(t('notifications.error'));
      } finally {
        setLoading(false);
      }
    };

    loadActiveNotification().catch(console.error);
  }, [user]);

  // Không hiển thị gì nếu đang tải hoặc không có thông báo
  if (loading || !notification) return null;

  // Nếu có lỗi, có thể hiển thị một thông báo lỗi hoặc không hiển thị gì
  if (error) {
    console.error('NotificationBanner error:', error);
    return null;
  }

  // Xác định màu sắc dựa trên loại thông báo
  const getBgColor = () => {
    switch (notification.type) {
      case 'info': return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'error': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  // Thêm hàm getButtonColor
  const getButtonColor = () => {
    switch (notification?.type) {
      case 'info': return 'text-blue-800 hover:text-blue-600';
      case 'warning': return 'text-yellow-800 hover:text-yellow-600';
      case 'success': return 'text-green-800 hover:text-green-600';
      case 'error': return 'text-red-800 hover:text-red-600';
      default: return 'text-gray-800 hover:text-gray-600';
    }
  };

  // Sửa lại nút đóng để sử dụng màu chữ phù hợp
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-4 border-l-4 ${getBgColor()} w-full shadow-md`}>
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <p className="font-medium">{notification.message}</p>
        <button 
          onClick={() => setNotification(null)}
          className={`ml-4 font-bold text-xl ${getButtonColor()} hover:scale-110 transition-transform`}
          aria-label={t('common.dong_thong_bao')}
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default NotificationBanner;

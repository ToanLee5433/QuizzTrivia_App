import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../lib/store';
import { notificationService, NotificationData } from '../../services/notificationService';
import { toast } from 'react-toastify';

const NotificationCenter: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load real notifications from Firebase
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        const unread = newNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      await notificationService.markAllAsRead(user.uid);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationAction = (notification: NotificationData) => {
    if (!notification.action) return;

    if (notification.action.type === 'navigate' && notification.action.path) {
      navigate(notification.action.path);
      setIsOpen(false);
    } else if (notification.action.type === 'external' && notification.action.url) {
      window.open(notification.action.url, '_blank');
    }

    // Mark as read when action is clicked
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const getNotificationTypeColor = (type: NotificationData['type']) => {
    switch (type) {
      case 'achievement': return 'text-yellow-600';
      case 'quiz': return 'text-blue-600';
      case 'social': return 'text-pink-600';
      case 'system': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (!user) return null;

  return (
    <div className="relative z-[9999]">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-all duration-300 hover:scale-110"
        aria-label="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[10000] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔔</span>
              <h3 className="text-lg font-bold text-white">{t("notifications.title")}</h3>
              {unreadCount > 0 && (
                <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-white hover:text-blue-100 font-medium transition-colors px-3 py-1 rounded-lg hover:bg-white/20"
                  title={t("notifications.markAllRead")}
                >
                  ✓ {t("notifications.markAllRead")}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-blue-100 transition-colors p-1"
                aria-label="Close"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="text-4xl mb-3">🔔</div>
                <p>{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    if (notification.action) {
                      handleNotificationAction(notification);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    {notification.icon && (
                      <div className={`flex-shrink-0 mt-1 text-lg ${getNotificationTypeColor(notification.type)}`}>
                        {notification.icon}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            notification.type === 'achievement' ? 'bg-yellow-100 text-yellow-700' :
                            notification.type === 'quiz' ? 'bg-blue-100 text-blue-700' :
                            notification.type === 'social' ? 'bg-pink-100 text-pink-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {notification.type}
                          </span>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {new Intl.DateTimeFormat('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }).format(notification.timestamp)}
                        </p>
                        
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                              title={t('notifications.markRead', 'Mark read')}
                            >
                              <span dangerouslySetInnerHTML={{ __html: '&#10003; ' + t('notifications.markRead', 'Mark read') }} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 transition-colors"
                            title={t("action.clear")}
                          >
                            <span dangerouslySetInnerHTML={{ __html: '&times; ' + t("action.clear") }} />
                          </button>
                        </div>
                      </div>
                      
                      {notification.action && (
                        <div 
                          className="mt-2 inline-flex items-center text-sm bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-3 py-1.5 rounded-full hover:from-blue-200 hover:to-indigo-200 transition-all font-medium cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationAction(notification);
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: notification.action.label + ' &rarr;' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                {t('notifications.viewAll', 'View all notifications')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;

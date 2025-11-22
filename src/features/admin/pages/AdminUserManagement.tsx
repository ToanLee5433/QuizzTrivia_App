import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase/config';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import AdminLayout from '../components/AdminLayout';
import Modal from '../../../shared/components/ui/Modal';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'creator' | 'admin';
  createdAt: any;
  isActive: boolean;
  lastLogin?: any;
}

interface PresenceStatus {
  state: 'online' | 'offline' | 'idle';
  lastChanged: number;
}

const AdminUserManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation('common'); // ✅ FIXED: Specify namespace
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'user' | 'creator' | 'admin'>('all');
  const [presenceData, setPresenceData] = useState<Record<string, PresenceStatus>>({});
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: null | 'deleteUser' | 'toggleUserStatus' | 'roleChange';
    payload?: any;
    message?: string;
  }>({ open: false, type: null });

  useEffect(() => {
    fetchUsers();
    // Sync current admin's Firebase Auth metadata to Firestore
    syncCurrentUserMetadata();
  }, []);

  // Sync Firebase Auth metadata to Firestore for current admin user
  const syncCurrentUserMetadata = async () => {
    if (!auth.currentUser) return;
    
    try {
      const currentUser = auth.currentUser;
      const metadata = currentUser.metadata;
      
      // If creationTime exists in Auth metadata, sync to Firestore
      if (metadata.creationTime) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          authCreatedAt: metadata.creationTime, // Store Firebase Auth creation time
          lastSynced: new Date().toISOString()
        });
        console.log('✅ Synced Firebase Auth metadata to Firestore for current user');
      }
    } catch (error) {
      console.error('Error syncing metadata:', error);
    }
  };

  // Lắng nghe presence status realtime từ Firebase RTDB
  useEffect(() => {
    if (users.length === 0) return;

    const rtdb = getDatabase();
    const unsubscribers: (() => void)[] = [];

    users.forEach(userData => {
      const statusRef = ref(rtdb, `status/${userData.id}`);
      const unsubscribe = onValue(statusRef, (snapshot) => {
        const status = snapshot.val();
        
        console.log(`[Presence] Update for ${userData.id}:`, status);
        
        // Update presence data
        setPresenceData(prev => {
          if (status) {
            return {
              ...prev,
              [userData.id]: status
            };
          } else {
            // If status is null/deleted, remove from presence data
            console.log(`[Presence] Removing ${userData.id} from presence data`);
            const newData = { ...prev };
            delete newData[userData.id];
            return newData;
          }
        });
      });
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [users]);

  const fetchUsers = async () => {
    try {
      console.log('🔍 [AdminUserManagement] Fetching ALL users...');
      
      // Load ALL users for admin management
      const usersQuery = collection(db, 'users');
      const querySnapshot = await getDocs(usersQuery);
      
      console.log('📊 [AdminUserManagement] Total docs from Firestore:', querySnapshot.docs.length);
      
      const allUsersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📋 [AdminUserManagement] All users data:', allUsersData.map(u => ({ 
        id: u.id, 
        email: (u as any).email, 
        isDeleted: (u as any).isDeleted 
      })));
      
      // Filter out deleted users
      let usersData = allUsersData.filter((user: any) => !user.isDeleted) as User[];
      
      // ✅ NEW: Lấy authCreatedAt từ Firebase Auth cho current user
      const authInstance = getAuth();
      if (authInstance.currentUser) {
        usersData = usersData.map(userData => {
          // Nếu là current user, thêm authCreatedAt từ Firebase Auth metadata
          if (userData.id === authInstance.currentUser?.uid) {
            return {
              ...userData,
              authCreatedAt: authInstance.currentUser?.metadata.creationTime || null
            };
          }
          return userData;
        });
      }
      
      console.log('✅ [AdminUserManagement] Active users (after filter):', usersData.length);
      console.log('📋 [AdminUserManagement] Active users list:', usersData.map(u => ({ 
        id: u.id, 
        email: u.email,
        role: u.role,
        authCreatedAt: (u as any).authCreatedAt
      })));
      
      setUsers(usersData);
    } catch (error) {
      console.error('❌ [AdminUserManagement] Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'creator' | 'admin') => {
    if (userId === user?.uid && newRole !== 'admin') {
      toast.error(t('admin.users.cannotChangeSelfRole'));
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(t('admin.roleUpdateSuccess'));
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.uid) {
      toast.error(t('admin.users.cannotDeactivateSelf'));
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
      toast.success(t('admin.userStatusUpdateSuccess', {action: t(!currentStatus ? 'admin.activated' : 'admin.deactivated')}));
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.uid) {
      toast.error(t('admin.users.cannotDeleteSelf'));
      return;
    }
    setLoading(true);
    try {
      // Instead of deleting, mark user as deleted and inactive
      await updateDoc(doc(db, 'users', userId), {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user?.uid
      });
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(t('admin.userDeleteSuccess'));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('admin.userDeleteError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('admin.loginAsAdmin')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title={`👥 ${t('admin.userManagement')}`}>
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {[
            { key: 'all', label: t('tat_ca'), count: users.length },
            { key: 'admin', label: t('ui.admin'), count: users.filter(u => u.role === 'admin').length },
            { key: 'creator', label: t('ui.creator'), count: users.filter(u => u.role === 'creator').length },
            { key: 'user', label: t('ui.user'), count: users.filter(u => u.role === 'user').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('admin.userManagementCards.totalUsers')}</h3>
          <p className="text-3xl font-bold text-blue-600">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('admin.userManagementCards.onlineUsers')}</h3>
          <p className="text-3xl font-bold text-green-600">
            {Object.values(presenceData).filter(p => p.state === 'online').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('admin.userManagementCards.creators')}</h3>
          <p className="text-3xl font-bold text-purple-600">
            {users.filter(u => u.role === 'creator').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('admin.userManagementCards.administrators')}</h3>
          <p className="text-3xl font-bold text-red-600">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('ui.user')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('ui.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status.label')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(userData => (
              <tr key={userData.id} className={userData.id === user?.uid ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {userData.photoURL ? (
                        <img 
                          src={userData.photoURL} 
                          alt={userData.displayName || userData.email}
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${userData.photoURL ? 'hidden' : ''}`}>
                        <span className="text-sm font-bold text-white">
                          {userData.displayName?.charAt(0)?.toUpperCase() || userData.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {userData.displayName || t('profile.displayName')}
                        {userData.id === user?.uid && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            ({t('you')})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{userData.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={userData.role}
                    onChange={(e) => setConfirmModal({ open: true, type: 'roleChange', payload: { userId: userData.id, newRole: e.target.value }, message: t('users.confirmRoleChange', { role: e.target.value }) })}
                    disabled={userData.id === user?.uid}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="user">{t('ui.user')}</option>
                    <option value="creator">{t('ui.creator')}</option>
                    <option value="admin">{t('ui.admin')}</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    // Nếu tài khoản bị khóa
                    if (userData.isActive === false) {
                      return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          🔒 {t('accountStatus.blocked')}
                        </span>
                      );
                    }

                    // Lấy presence status từ Firebase RTDB
                    const presence = presenceData[userData.id];
                    
                    if (!presence) {
                      return (
                        <span className="text-xs text-gray-400">
                          {t('presence.neverActive')}
                        </span>
                      );
                    }

                    const now = Date.now();
                    const lastChanged = presence.lastChanged || 0;
                    const diffMinutes = Math.floor((now - lastChanged) / (1000 * 60));

                    // Hiển thị theo state
                    if (presence.state === 'online') {
                      return (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-green-600 font-semibold">
                            {t('presence.online')}
                          </span>
                        </div>
                      );
                    }

                    if (presence.state === 'idle') {
                      return (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-xs text-yellow-600">
                            {t('presence.idle')}
                          </span>
                        </div>
                      );
                    }

                    // Offline - hiển thị thời gian
                    if (diffMinutes < 1) {
                      return (
                        <span className="text-xs text-gray-500">
                          {t('presence.justNow')}
                        </span>
                      );
                    } else if (diffMinutes < 60) {
                      return (
                        <span className="text-xs text-gray-500">
                          {t('presence.minutesAgo', { minutes: diffMinutes })}
                        </span>
                      );
                    } else if (diffMinutes < 1440) {
                      return (
                        <span className="text-xs text-gray-500">
                          {t('presence.hoursAgo', { hours: Math.floor(diffMinutes / 60) })}
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-xs text-gray-500">
                          {t('presence.daysAgo', { days: Math.floor(diffMinutes / 1440) })}
                        </span>
                      );
                    }
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(() => {
                    // Priority 1: Firebase Auth metadata (most accurate)
                    const authCreatedAt = (userData as any).authCreatedAt;
                    if (authCreatedAt) {
                      try {
                        return new Date(authCreatedAt).toLocaleDateString('vi-VN');
                      } catch (error) {
                        console.error('Error parsing authCreatedAt:', error);
                      }
                    }

                    // Priority 2: Firestore createdAt
                    if (!userData.createdAt) {
                      return (
                        <span className="text-gray-400 italic">
                          {t('notAvailable')}
                        </span>
                      );
                    }
                    
                    try {
                      // Handle Firestore Timestamp
                      if (userData.createdAt?.toDate) {
                        return userData.createdAt.toDate().toLocaleDateString('vi-VN');
                      }
                      
                      // Handle ISO string
                      if (typeof userData.createdAt === 'string') {
                        return new Date(userData.createdAt).toLocaleDateString('vi-VN');
                      }
                      
                      // Handle milliseconds timestamp
                      if (typeof userData.createdAt === 'number') {
                        return new Date(userData.createdAt).toLocaleDateString('vi-VN');
                      }
                      
                      return (
                        <span className="text-gray-400 italic">
                          {t('notAvailable')}
                        </span>
                      );
                    } catch (error) {
                      console.error('Error parsing createdAt:', error);
                      return (
                        <span className="text-gray-400 italic">
                          {t('notAvailable')}
                        </span>
                      );
                    }
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {userData.id !== user?.uid && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ open: true, type: 'toggleUserStatus', payload: { userId: userData.id, currentStatus: userData.isActive !== false }, message: userData.isActive !== false ? t('users.confirmDeactivate') : t('users.confirmActivate') })}
                          className={`px-3 py-1 rounded text-xs ${userData.isActive !== false ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                          disabled={loading}
                        >
                          {userData.isActive !== false ? t('action.deactivate') : t('action.activate')}
                        </button>
                        <button
                          onClick={() => setConfirmModal({ open: true, type: 'deleteUser', payload: { userId: userData.id }, message: t('users.confirmDelete') })}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                          disabled={loading}
                        >
                          {t('delete')}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal xác nhận thao tác */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, type: null })}
        title={t('action.confirm')}
      >
        <div className="mb-4">{confirmModal.message}</div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setConfirmModal({ open: false, type: null })}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            disabled={loading}
          >
            {t('cancel')}
          </button>
          <button
            onClick={async () => {
              if (confirmModal.type === 'deleteUser') await handleDeleteUser(confirmModal.payload.userId);
              if (confirmModal.type === 'toggleUserStatus') await handleStatusToggle(confirmModal.payload.userId, confirmModal.payload.currentStatus);
              if (confirmModal.type === 'roleChange') await handleRoleChange(confirmModal.payload.userId, confirmModal.payload.newRole);
              setConfirmModal({ open: false, type: null });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            disabled={loading}
          >
            {t('action.confirm')}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminUserManagement;


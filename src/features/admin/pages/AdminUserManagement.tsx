import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import AdminLayout from '../components/AdminLayout';
import Modal from '../../../shared/components/ui/Modal';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'creator' | 'admin';
  createdAt: any;
  isActive: boolean;
  lastLogin?: any;
}

const AdminUserManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'user' | 'creator' | 'admin'>('all');
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: null | 'deleteUser' | 'toggleUserStatus' | 'roleChange';
    payload?: any;
    message?: string;
  }>({ open: false, type: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'creator' | 'admin') => {
    if (userId === user?.uid && newRole !== 'admin') {
      toast.error('Bạn không thể thay đổi quyền của chính mình!');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Đã cập nhật quyền người dùng!');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.uid) {
      toast.error('Bạn không thể khóa tài khoản của chính mình!');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
      toast.success(`Đã ${!currentStatus ? 'kích hoạt' : 'khóa'} tài khoản!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.uid) {
      toast.error('Bạn không thể xóa tài khoản của chính mình!');
      return;
    }
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Đã xóa người dùng!');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Có lỗi xảy ra khi xóa người dùng!');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
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
    <AdminLayout title="👥 Quản lý người dùng">
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {[
            { key: 'all', label: 'Tất cả', count: users.length },
            { key: 'admin', label: 'Admin', count: users.filter(u => u.role === 'admin').length },
            { key: 'creator', label: 'Creator', count: users.filter(u => u.role === 'creator').length },
            { key: 'user', label: 'User', count: users.filter(u => u.role === 'user').length }
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
          <h3 className="text-lg font-semibold text-gray-900">Tổng người dùng</h3>
          <p className="text-3xl font-bold text-blue-600">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">Đang hoạt động</h3>
          <p className="text-3xl font-bold text-green-600">
            {users.filter(u => u.isActive !== false).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">Creator</h3>
          <p className="text-3xl font-bold text-purple-600">
            {users.filter(u => u.role === 'creator').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900">Admin</h3>
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
                Người dùng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vai trò
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày tạo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(userData => (
              <tr key={userData.id} className={userData.id === user?.uid ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {userData.displayName?.charAt(0) || userData.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {userData.displayName || 'Chưa có tên'}
                        {userData.id === user?.uid && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            (Bạn)
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
                    onChange={(e) => setConfirmModal({ open: true, type: 'roleChange', payload: { userId: userData.id, newRole: e.target.value }, message: `Bạn có chắc chắn muốn đổi quyền cho người dùng này thành ${e.target.value}?` })}
                    disabled={userData.id === user?.uid}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="user">User</option>
                    <option value="creator">Creator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.isActive !== false 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userData.isActive !== false ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {userData.id !== user?.uid && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ open: true, type: 'toggleUserStatus', payload: { userId: userData.id, currentStatus: userData.isActive !== false }, message: userData.isActive !== false ? 'Bạn có chắc chắn muốn khóa tài khoản này?' : 'Bạn có chắc chắn muốn kích hoạt tài khoản này?' })}
                          className={`px-3 py-1 rounded text-xs ${userData.isActive !== false ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                          disabled={loading}
                        >
                          {userData.isActive !== false ? 'Khóa' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => setConfirmModal({ open: true, type: 'deleteUser', payload: { userId: userData.id }, message: 'Bạn có chắc chắn muốn xóa người dùng này?' })}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                          disabled={loading}
                        >
                          Xóa
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
        title="Xác nhận thao tác"
      >
        <div className="mb-4">{confirmModal.message}</div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setConfirmModal({ open: false, type: null })}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            disabled={loading}
          >
            Hủy
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
            Xác nhận
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminUserManagement;


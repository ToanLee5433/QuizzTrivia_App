import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../lib/store';
import { logout } from '../../auth/store';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase/config';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  orderBy
} from 'firebase/firestore';
import Modal from '../../../shared/components/ui/Modal';
import QuickActions from '../components/QuickActions';
import AdminStats from '../components/AdminStats';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: any;
  isActive: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  category: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  quizCount: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  // States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingQuizzes: 0,
    approvedQuizzes: 0,
    totalCategories: 0
  });

  // Function to calculate and update stats from actual data
  const updateStatsFromData = (users: User[], quizzes: Quiz[], categories: Category[]) => {
    const pending = quizzes.filter(q => q.status === 'pending').length;
    const approved = quizzes.filter(q => q.status === 'approved').length;
    
    setStats({
      totalUsers: users.length,
      pendingQuizzes: pending,
      approvedQuizzes: approved,
      totalCategories: categories.length
    });
    
    console.log('📊 Stats updated:', {
      totalUsers: users.length,
      pendingQuizzes: pending,
      approvedQuizzes: approved,
      totalCategories: categories.length
    });
  };

  // New category form
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [showAddCategory, setShowAddCategory] = useState(false);

  // State cho modal xác nhận
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: null | 'deleteUser' | 'deleteQuiz' | 'deleteCategory' | 'toggleUserStatus';
    payload?: any;
    message?: string;
  }>({ open: false, type: null });

  // State for last update time
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Data loading functions that return data instead of updating state
  const loadUsersData = async (): Promise<User[]> => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      console.log('Loaded users:', usersData.length);
      return usersData;
    } catch (error) {
      console.error('Error loading users:', error);
      return []; // Return empty array on error
    }
  };

  const loadQuizzesData = async (): Promise<Quiz[]> => {
    try {
      const quizzesQuery = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(quizzesQuery);
      const quizzesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Quiz));
      console.log('Loaded quizzes:', quizzesData.length);
      return quizzesData;
    } catch (error) {
      console.error('Error loading quizzes:', error);
      return []; // Return empty array on error
    }
  };

  const loadCategoriesData = async (): Promise<Category[]> => {
    try {
      const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
      const snapshot = await getDocs(categoriesQuery);
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      console.log('Loaded categories:', categoriesData.length);
      return categoriesData;
    } catch (error) {
      console.error('Error loading categories:', error);
      return []; // Return empty array on error
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data concurrently
      const [usersData, quizzesData, categoriesData] = await Promise.all([
        loadUsersData(),
        loadQuizzesData(),
        loadCategoriesData()
      ]);
      
      // Update state with actual data
      setUsers(usersData);
      setQuizzes(quizzesData);
      setCategories(categoriesData);
      
      // Update stats from actual data
      updateStatsFromData(usersData, quizzesData, categoriesData);
      
      setLastUpdate(new Date());
      console.log('Data refreshed at:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Có lỗi khi tải dữ liệu!');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(logout());
      // Clear all cached data
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await loadData();
      toast.success('Đã cập nhật role thành công!');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Có lỗi xảy ra khi cập nhật role!');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
      await loadData();
      toast.success(`Đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái!');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userId));
      await loadData();
      toast.success('Đã xóa người dùng thành công!');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Có lỗi xảy ra khi xóa người dùng!');
    } finally {
      setLoading(false);
    }
  };

  const approveQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'quizzes', quizId), { status: 'approved' });
      await loadData();
      toast.success('Đã phê duyệt quiz thành công!');
    } catch (error) {
      console.error('Error approving quiz:', error);
      toast.error('Có lỗi xảy ra khi phê duyệt quiz!');
    } finally {
      setLoading(false);
    }
  };

  const rejectQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'quizzes', quizId), { status: 'rejected' });
      await loadData();
      toast.success('Đã từ chối quiz!');
    } catch (error) {
      console.error('Error rejecting quiz:', error);
      toast.error('Có lỗi xảy ra khi từ chối quiz!');
    } finally {
      setLoading(false);
    }
  };

  const reopenQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'quizzes', quizId), { status: 'pending' });
      await loadData();
      toast.success('Đã mở lại quiz để xem xét!');
    } catch (error) {
      console.error('Error reopening quiz:', error);
      toast.error('Có lỗi xảy ra khi mở lại quiz!');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'quizzes', quizId));
      await loadData();
      toast.success('Đã xóa quiz thành công!');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Có lỗi xảy ra khi xóa quiz!');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục!');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategory.name,
        description: newCategory.description,
        createdAt: new Date()
      });
      
      setNewCategory({ name: '', description: '' });
      setShowAddCategory(false);
      await loadData();
      toast.success('Đã thêm danh mục thành công!');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Có lỗi xảy ra khi thêm danh mục!');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      await loadData();
      toast.success('Đã xóa danh mục thành công!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Có lỗi xảy ra khi xóa danh mục!');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    console.log('Rendering dashboard with stats:', stats);
    return (
      <div className="space-y-6">
        {/* Alert thông báo */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <h3 className="font-semibold text-green-800">Bạn đang xem phần Thống kê & Tổng quan</h3>
              <p className="text-green-700 text-sm">Đây là trang chứa biểu đồ và thống kê nâng cao mà bạn vừa thêm</p>
            </div>
          </div>
        </div>

        {/* Advanced Stats */}
        <AdminStats 
          key={lastUpdate?.getTime() || 'initial'} // Force re-render when data updates
        />
        
        {/* Quick Actions */}
        <QuickActions 
          onRefreshData={loadData}
          stats={stats}
        />
      </div>
    );
  };

  const renderUsers = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Quản lý người dùng</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Người dùng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {user.displayName || 'Chưa có tên'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive !== false ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setConfirmModal({ open: true, type: 'toggleUserStatus', payload: { userId: user.id, currentStatus: user.isActive !== false }, message: user.isActive !== false ? 'Bạn có chắc chắn muốn khóa tài khoản này?' : 'Bạn có chắc chắn muốn mở khóa tài khoản này?' })}
                    className={`px-3 py-1 rounded text-xs ${user.isActive !== false ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                  >
                    {user.isActive !== false ? 'Khóa' : 'Mở khóa'}
                  </button>
                  
                  {user.email !== 'admin123@gmail.com' && (
                    <button
                      onClick={() => setConfirmModal({ open: true, type: 'deleteUser', payload: { userId: user.id }, message: 'Bạn có chắc chắn muốn xóa người dùng này?' })}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderQuizzes = () => (
    <div className="space-y-6" data-testid="quiz-review-system">
      {/* Alert thông báo */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">📝</span>
          <div>
            <h3 className="font-semibold text-yellow-800">Bạn đang xem phần Quản lý Quiz</h3>
            <p className="text-yellow-700 text-sm">Đây là trang quản lý danh sách quiz (không phải thống kê)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Quản lý Quiz</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiêu đề
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {quiz.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {quiz.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      quiz.status === 'approved' ? 'bg-green-100 text-green-800' :
                      quiz.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {quiz.status === 'approved' ? 'Đã duyệt' :
                       quiz.status === 'pending' ? 'Chờ duyệt' : 'Bị từ chối'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {quiz.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveQuiz(quiz.id)}
                          className="px-3 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => rejectQuiz(quiz.id)}
                          className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded text-xs hover:bg-yellow-200"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    
                    {quiz.status === 'rejected' && (
                      <button
                        onClick={() => reopenQuiz(quiz.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200"
                      >
                        Mở lại
                      </button>
                    )}
                    
                    <button
                      onClick={() => setConfirmModal({ open: true, type: 'deleteQuiz', payload: { quizId: quiz.id }, message: 'Bạn có chắc chắn muốn xóa quiz này?' })}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6">
      {/* Add Category Button */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Quản lý danh mục</h3>
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Thêm danh mục
          </button>
        </div>

        {/* Add Category Form */}
        {showAddCategory && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Tên danh mục"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Mô tả"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="mt-4 space-x-2">
              <button
                onClick={addCategory}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Lưu
              </button>
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory({ name: '', description: '' });
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng Quiz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {category.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {category.quizCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setConfirmModal({ open: true, type: 'deleteCategory', payload: { categoryId: category.id }, message: 'Bạn có chắc chắn muốn xóa danh mục này?' })}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">{/* Notice Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-bold">Để xem thống kê biểu đồ</h3>
                <p className="text-blue-100 text-sm">
                  Nhấn vào tab "📊 Tổng quan" bên dưới hoặc 
                  <a href="/admin/quiz-stats" className="underline font-bold ml-1 hover:text-white">
                    ➤ Xem trang thống kê riêng
                  </a>
                </p>
              </div>
            </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Tab hiện tại: <span className="font-bold text-white">{activeTab}</span></p>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <a
                href="/admin/quiz-stats"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2"
                title="Xem trang thống kê riêng với biểu đồ"
              >
                <span>📊</span>
                <span>Thống kê riêng</span>
              </a>
              <button
                onClick={() => {
                  console.log('Force switching to dashboard');
                  setActiveTab('dashboard');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
                title="Force chuyển về tab Tổng quan"
              >
                <span>📊</span>
                <span>Tổng quan</span>
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
                title="Cập nhật dữ liệu"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Làm mới</span>
              </button>
              {lastUpdate && (
                <div className="text-xs text-gray-500">
                  Cập nhật: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
              <div className="text-sm text-gray-600">
                Xin chào, <span className="font-semibold text-red-600">{user?.displayName || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Debug Panel */}
          <div className="bg-blue-100 p-2 text-xs text-blue-800 border-b">
            🔧 Debug: activeTab = "{activeTab}" | Tất cả tabs: dashboard, users, quizzes, categories
          </div>
          
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
              { id: 'users', label: 'Người dùng', icon: '👥' },
              { id: 'quizzes', label: 'Quiz', icon: '📝' },
              { id: 'categories', label: 'Danh mục', icon: '📂' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  console.log('Clicking tab:', tab.id);
                  setActiveTab(tab.id);
                }}
                className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } ${tab.id === 'dashboard' ? 'ring-2 ring-blue-300' : ''}`}
                title={`Chuyển đến tab ${tab.label}`}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                <span className="font-semibold">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-900">
              {activeTab === 'dashboard' && '📊 Tổng quan & Thống kê'}
              {activeTab === 'users' && '👥 Quản lý Người dùng'}
              {activeTab === 'quizzes' && '📝 Quản lý Quiz'}
              {activeTab === 'categories' && '📂 Quản lý Danh mục'}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                Tab hiện tại: {activeTab}
              </span>
              {activeTab !== 'dashboard' && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700"
                >
                  Về Tổng quan
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <>
            {console.log('Current active tab:', activeTab)}
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'quizzes' && renderQuizzes()}
            {activeTab === 'categories' && renderCategories()}
          </>
        )}
      </main>

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
              if (confirmModal.type === 'deleteUser') await deleteUser(confirmModal.payload.userId);
              if (confirmModal.type === 'deleteQuiz') await deleteQuiz(confirmModal.payload.quizId);
              if (confirmModal.type === 'deleteCategory') await deleteCategory(confirmModal.payload.categoryId);
              if (confirmModal.type === 'toggleUserStatus') await toggleUserStatus(confirmModal.payload.userId, confirmModal.payload.currentStatus);
              setConfirmModal({ open: false, type: null });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            disabled={loading}
          >
            Xác nhận
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;


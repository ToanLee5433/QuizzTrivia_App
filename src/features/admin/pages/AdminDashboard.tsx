import React, { useState, useEffect } from 'react';
// import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
// import { RootState } from '../../../lib/store';
// import { logout } from '../../auth/store';
// import { signOut } from 'firebase/auth';
import { db } from '../../../lib/firebase/config';
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
  role: 'user' | 'admin' | 'creator';
  createdAt: any;
  isActive: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'published';
  createdAt: any;
  category: string;
  learningResources?: any[]; // Tài liệu học tập
}

interface Category {
  id: string;
  name: string;
  description: string;
  quizCount: number;
}

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  // const navigate = useNavigate();
  // const { user } = useSelector((state: RootState) => state.auth);
  // const dispatch = useDispatch();
  
  // States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Function to calculate and update stats from actual data
  const updateStatsFromData = (users: User[], quizzes: Quiz[]) => {
    // Count ALL users (including admins for admin dashboard)
    const totalUsers = users.length;
    
    // Count ALL quizzes regardless of status
    const totalQuizzes = quizzes.length;
    
    // Count quizzes by status for meaningful metrics
    const approvedQuizzes = quizzes.filter(q => q.status === 'approved').length;
    const publishedQuizzes = quizzes.filter(q => q.status === 'published').length;
    const pendingQuizzes = quizzes.filter(q => q.status === 'pending').length;
    const completedQuizzes = approvedQuizzes + publishedQuizzes; // Available for users
    
    // Calculate creators more accurately
    const creatorRoleUsers = users.filter(u => u.role === 'creator').length;
    const quizCreatorIds = new Set(quizzes.map(q => q.createdBy).filter(Boolean));
    const totalCreators = Math.max(creatorRoleUsers, quizCreatorIds.size);
    
    const newStats = {
      totalUsers: totalUsers,
      totalQuizzes: totalQuizzes,
      completedQuizzes: completedQuizzes,
      totalCreators: totalCreators
    };
    
    setStats(newStats);
    
    console.log('📊 DETAILED Stats calculation:', {
      totalUsersInDB: users.length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      creatorUsers: users.filter(u => u.role === 'creator').length,
      normalUsers: users.filter(u => u.role === 'user').length,
      totalQuizzesInDB: quizzes.length,
      approvedQuizzes: approvedQuizzes,
      publishedQuizzes: publishedQuizzes,
      pendingQuizzes: pendingQuizzes,
      creatorRoleUsers: creatorRoleUsers,
      quizCreatorIds: quizCreatorIds.size,
      finalStats: newStats
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
      updateStatsFromData(usersData, quizzesData);
      
      setLastUpdate(new Date());
      console.log('Data refreshed at:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('admin.dataLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await loadData();
      toast.success(t('admin.roleUpdateSuccess'));
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(t('admin.roleUpdateError'));
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
      await loadData();
      toast.success(t('admin.userStatusUpdateSuccess', {action: !currentStatus ? t('admin.activated') : t('admin.deactivated')}));
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error(t('admin.statusUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userId));
      await loadData();
      toast.success(t('admin.userDeleteSuccess'));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('admin.userDeleteError'));
    } finally {
      setLoading(false);
    }
  };

  const approveQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'quizzes', quizId), { status: 'approved' });
      await loadData();
      toast.success(t('admin.quizApproved'));
    } catch (error) {
      console.error('Error approving quiz:', error);
      toast.error(t('admin.quizApprovalError'));
    } finally {
      setLoading(false);
    }
  };

  const rejectQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'quizzes', quizId), { status: 'rejected' });
      await loadData();
      toast.success(t('admin.quizRejected'));
    } catch (error) {
      console.error('Error rejecting quiz:', error);
      toast.error(t('admin.quizRejectionError'));
    } finally {
      setLoading(false);
    }
  };

  const reopenQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'quizzes', quizId), { status: 'pending' });
      await loadData();
      toast.success(t('admin.quizReopened'));
    } catch (error) {
      console.error('Error reopening quiz:', error);
      toast.error(t('admin.quizReopenError'));
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'quizzes', quizId));
      await loadData();
      toast.success(t('quiz.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error(t('quiz.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error(t('admin.categories.enterName'));
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
      toast.success(t('admin.categories.addSuccess'));
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(t('admin.categories.addError'));
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      await loadData();
      toast.success(t('admin.categories.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t('admin.categories.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    console.log('Rendering dashboard with stats:', stats);
    return (
      <div className="space-y-6">
        {/* Alert */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <h3 className="font-semibold text-green-800">{t('admin.viewingStatsSection')}</h3>
              <p className="text-green-700 text-sm">{t('admin.advancedStatsDescription')}</p>
            </div>
          </div>
        </div>

        {/* Advanced Stats synced with real data */}
        <AdminStats key={lastUpdate?.getTime() || 'initial'} />
        
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
        <h3 className="text-lg font-semibold">{t('admin.userManagement')}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.tabs.users")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("auth.email")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.preview.status")}
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
                    <option value="admin">{t("admin.quizManagement.adminBadge")}</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive !== false ? t('admin.userStatus.active') : t('admin.userStatus.blocked')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setConfirmModal({ open: true, type: 'toggleUserStatus', payload: { userId: user.id, currentStatus: user.isActive !== false }, message: user.isActive !== false ? t('admin.confirmations.lockUser') : t('admin.confirmations.unlockUser') })}
                    className={`px-3 py-1 rounded text-xs ${user.isActive !== false ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                  >
                    {user.isActive !== false ? t('admin.userStatus.lockButton') : t('admin.userStatus.unlockButton')}
                  </button>
                  
                  {user.email !== 'admin123@gmail.com' && (
                    <button
                      onClick={() => setConfirmModal({ open: true, type: 'deleteUser', payload: { userId: user.id }, message: t('admin.confirmations.deleteUser') })}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                    >{t("action.clear")}
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
        {/* Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">📝</span>
          <div>
            <h3 className="font-semibold text-yellow-800">{t('admin.quizManagement.label')}</h3>
            <p className="text-yellow-700 text-sm">{t('admin.tabs.quizzes')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{t('admin.quizManagement.label')}</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.quizManagement.table.title')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quiz.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('status.pending')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('action.action')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div>
                      <div className="font-medium">{quiz.title}</div>
                      {quiz.learningResources && quiz.learningResources.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 rounded">
                            📚 {quiz.learningResources.length} tài liệu
                          </span>
                          {quiz.learningResources.some((r: any) => r.required) && (
                            <span className="text-red-600">⚠️</span>
                          )}
                        </div>
                      )}
                    </div>
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
                       {quiz.status === 'approved' ? t('status.approved') :
                        quiz.status === 'pending' ? t('status.pending') : t('status.rejected')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {quiz.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveQuiz(quiz.id)}
                          className="px-3 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200"
                        >
                          {t('action.approve')}
                        </button>
                        <button
                          onClick={() => rejectQuiz(quiz.id)}
                          className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded text-xs hover:bg-yellow-200"
                        >
                          {t('action.reject')}
                        </button>
                      </>
                    )}
                    
                    {quiz.status === 'rejected' && (
                      <button
                        onClick={() => reopenQuiz(quiz.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200"
                      >
                         {t('admin.quizManagement.tooltips.reopen')}
                      </button>
                    )}
                    
                    <button
                       onClick={() => setConfirmModal({ open: true, type: 'deleteQuiz', payload: { quizId: quiz.id }, message: t('quiz.confirmDelete') })}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                    >
                      {t('delete')}
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
          <h3 className="text-lg font-semibold">{t('admin.categoryManagement')}</h3>
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('categories.add')}
          </button>
        </div>

        {/* Add Category Form */}
        {showAddCategory && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder={t('categories.name')}
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder={t('categories.description')}
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
                {t('save')}
              </button>
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory({ name: '', description: '' });
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {t('cancel')}
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
                  {t('categories.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('categories.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('categories.quizCount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('action.action')}
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
                       onClick={() => setConfirmModal({ open: true, type: 'deleteCategory', payload: { categoryId: category.id }, message: t('categories.confirmDelete') })}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                    >
                      {t('delete')}
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

  /*
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/admin/login');
    } catch (err)      console.error("Logout failed", err);
    }
  };
  */

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">{/* Notice Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-bold">{t('admin.dashboard.viewStatsChart')}</h3>
                <p className="text-blue-100 text-sm">
                  {t('admin.dashboard.clickOverviewTab')}{' '}
                  <a href="/admin/quiz-stats" className="underline font-bold ml-1 hover:text-white">
                    ➤ {t('admin.dashboard.viewSeparateStatsPage')}
                  </a>
                </p>
              </div>
            </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">{t('admin.currentTab')}: <span className="font-bold text-white">{activeTab}</span></p>
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
                title={t('admin.dashboard.viewSeparateStatsPageTitle')}
              >
                <span>📊</span>
                <span>{t('admin.dashboard.separateStats')}</span>
              </a>
              <button
                onClick={() => {
                  console.log('Force switching to dashboard');
                  setActiveTab('dashboard');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
                title={t('admin.dashboard.forceOverviewTab')}
              >
                <span>📊</span>
                <span>{t("admin.tabs.overview")}</span>
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
                <span>{t("refresh")}</span>
              </button>
              {lastUpdate && (
                <div className="text-xs text-gray-500">
                  Cập nhật: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
              <div className="text-sm text-gray-600">
                {t('admin.greeting')}
              </div>
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
              { id: 'dashboard', label: t('admin.tabs.overview'), icon: '📊' },
              { id: 'users', label: t('admin.tabs.users'), icon: '👥' },
              { id: 'quizzes', label: t('admin.tabs.quizzes'), icon: '📝' },
              { id: 'categories', label: t('admin.tabs.categories'), icon: '📂' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
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
              {activeTab === 'dashboard' && `📊 ${t('admin.tabs.overviewStats')}`}
              {activeTab === 'users' && `👥 ${t('admin.tabs.userManagement')}`}
              {activeTab === 'quizzes' && `📝 ${t('admin.tabs.quizManagement')}`}
              {activeTab === 'categories' && `📂 ${t('admin.tabs.categoryManagement')}`}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                {t('admin.currentTab')}
              </span>
              {activeTab !== 'dashboard' && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700"
                >
                  {t('admin.backToOverview')}
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
              if (confirmModal.type === 'deleteUser') await deleteUser(confirmModal.payload.userId);
              if (confirmModal.type === 'deleteQuiz') await deleteQuiz(confirmModal.payload.quizId);
              if (confirmModal.type === 'deleteCategory') await deleteCategory(confirmModal.payload.categoryId);
              if (confirmModal.type === 'toggleUserStatus') await toggleUserStatus(confirmModal.payload.userId, confirmModal.payload.currentStatus);
              setConfirmModal({ open: false, type: null });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            disabled={loading}
          >
            {t('action.confirm')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;


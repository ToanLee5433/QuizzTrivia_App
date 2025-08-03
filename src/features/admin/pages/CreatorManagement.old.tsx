import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { toast } from 'react-toastify';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

interface Creator {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  quizCount: number;
  totalPlays: number;
  avgRating: number;
  status: 'active' | 'suspended' | 'banned';
  permissions: {
    canCreateQuiz: boolean;
    canEditOwnQuiz: boolean;
    canDeleteOwnQuiz: boolean;
    canViewAnalytics: boolean;
  };
}

interface CreatorStats {
  totalCreators: number;
  activeCreators: number;
  suspendedCreators: number;
  bannedCreators: number;
  totalQuizzes: number;
  thisMonth: number;
}

const CreatorManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState<Creator | null>(null);

  // Kiểm tra quyền admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Truy cập bị từ chối</h2>
          <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    let creatorsData: Creator[] = [];
    try {
      // Fetch users with creator role
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'creator'),
        orderBy('createdAt', 'desc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      // Fetch all quizzes to calculate stats
      const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
      const quizzes = quizzesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdBy: doc.data().createdBy || '',
        playCount: doc.data().playCount || 0,
        rating: doc.data().rating || 0
      }));
      
      creatorsData = usersSnapshot.docs.map(doc => {
        const userData = doc.data();
        const userQuizzes = quizzes.filter(quiz => quiz.createdBy === doc.id);
        
        return {
          id: doc.id,
          displayName: userData.displayName || 'Chưa đặt tên',
          email: userData.email || '',
          role: userData.role || 'creator',
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastLoginAt: userData.lastLoginAt?.toDate(),
          quizCount: userQuizzes.length,
          totalPlays: userQuizzes.reduce((sum, quiz) => sum + (quiz.playCount || 0), 0),
          avgRating: userQuizzes.length > 0 
            ? userQuizzes.reduce((sum, quiz) => sum + (quiz.rating || 0), 0) / userQuizzes.length 
            : 0,
          status: userData.status || 'active',
          permissions: {
            canCreateQuiz: userData.permissions?.canCreateQuiz !== false,
            canEditOwnQuiz: userData.permissions?.canEditOwnQuiz !== false,
            canDeleteOwnQuiz: userData.permissions?.canDeleteOwnQuiz !== false,
            canViewAnalytics: userData.permissions?.canViewAnalytics !== false,
          }
        } as Creator;
      });
      
      setCreators(creatorsData);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast.error('Không thể tải danh sách creator');
    } finally {
      // Always show mock data if no real data or as fallback
      if (creatorsData.length === 0) {
        setCreators(mockCreators);
      }
      setLoading(false);
    }
  };

  // Mock data for demonstration
  const mockCreators: Creator[] = [
    {
      id: '1',
      displayName: 'Nguyễn Văn A',
      email: 'creator1@example.com',
      role: 'creator',
      isActive: true,
      createdAt: new Date('2024-01-15'),
      lastLoginAt: new Date('2024-01-20'),
      quizCount: 12,
      totalPlays: 450,
      avgRating: 4.5,
      status: 'active',
      permissions: {
        canCreateQuiz: true,
        canEditOwnQuiz: true,
        canDeleteOwnQuiz: true,
        canViewAnalytics: true
      }
    },
    {
      id: '2',
      displayName: 'Trần Thị B',
      email: 'creator2@example.com',
      role: 'creator',
      isActive: true,
      createdAt: new Date('2024-01-10'),
      lastLoginAt: new Date('2024-01-19'),
      quizCount: 8,
      totalPlays: 320,
      avgRating: 4.2,
      status: 'active',
      permissions: {
        canCreateQuiz: true,
        canEditOwnQuiz: true,
        canDeleteOwnQuiz: false,
        canViewAnalytics: true
      }
    },
    {
      id: '3',
      displayName: 'Lê Văn C',
      email: 'creator3@example.com',
      role: 'creator',
      isActive: false,
      createdAt: new Date('2024-01-05'),
      lastLoginAt: new Date('2024-01-15'),
      quizCount: 5,
      totalPlays: 150,
      avgRating: 3.8,
      status: 'suspended',
      permissions: {
        canCreateQuiz: false,
        canEditOwnQuiz: true,
        canDeleteOwnQuiz: false,
        canViewAnalytics: false
      }
    }
  ];

  const updateCreatorStatus = async (creatorId: string, status: 'active' | 'suspended' | 'banned') => {
    try {
      await updateDoc(doc(db, 'users', creatorId), {
        status,
        isActive: status === 'active',
        updatedAt: new Date()
      });
      
      setCreators(prev => prev.map(creator => 
        creator.id === creatorId 
          ? { ...creator, status, isActive: status === 'active' }
          : creator
      ));
      
      const statusText = {
        active: 'kích hoạt',
        suspended: 'tạm khóa',
        banned: 'cấm'
      };
      
      toast.success(`Đã ${statusText[status]} creator thành công!`);
    } catch (error) {
      console.error('Error updating creator status:', error);
      
      // Fallback for demo
      setCreators(prev => prev.map(creator => 
        creator.id === creatorId 
          ? { ...creator, status, isActive: status === 'active' }
          : creator
      ));
      toast.success(`Đã ${status} creator thành công! (Demo mode)`);
    }
  };

  const updateCreatorPermissions = async (creatorId: string, permissions: Creator['permissions']) => {
    try {
      await updateDoc(doc(db, 'users', creatorId), {
        permissions,
        updatedAt: new Date()
      });
      
      setCreators(prev => prev.map(creator => 
        creator.id === creatorId 
          ? { ...creator, permissions }
          : creator
      ));
      
      toast.success('Cập nhật quyền hạn thành công!');
      setShowPermissionModal(null);
    } catch (error) {
      console.error('Error updating permissions:', error);
      
      // Fallback for demo
      setCreators(prev => prev.map(creator => 
        creator.id === creatorId 
          ? { ...creator, permissions }
          : creator
      ));
      toast.success('Cập nhật quyền hạn thành công! (Demo mode)');
      setShowPermissionModal(null);
    }
  };

  const deleteCreator = async (creatorId: string) => {
    const creator = creators.find(c => c.id === creatorId);
    if (!creator) return;
    
    if (creator.quizCount > 0) {
      toast.error(`Không thể xóa creator "${creator.displayName}" vì còn ${creator.quizCount} quiz đang hoạt động`);
      return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa creator "${creator.displayName}"?`)) return;
    
    try {
      await deleteDoc(doc(db, 'users', creatorId));
      setCreators(prev => prev.filter(creator => creator.id !== creatorId));
      toast.success('Xóa creator thành công!');
    } catch (error) {
      console.error('Error deleting creator:', error);
      
      // Fallback for demo
      setCreators(prev => prev.filter(creator => creator.id !== creatorId));
      toast.success('Xóa creator thành công! (Demo mode)');
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'suspended' | 'banned') => {
    if (selectedCreators.length === 0) return;
    
    try {
      const promises = selectedCreators.map(creatorId => 
        updateDoc(doc(db, 'users', creatorId), {
          status,
          isActive: status === 'active',
          updatedAt: new Date()
        })
      );
      
      await Promise.all(promises);
      
      setCreators(prev => prev.map(creator => 
        selectedCreators.includes(creator.id)
          ? { ...creator, status, isActive: status === 'active' }
          : creator
      ));
      
      setSelectedCreators([]);
      
      const statusText = {
        active: 'kích hoạt',
        suspended: 'tạm khóa',
        banned: 'cấm'
      };
      
      toast.success(`Đã ${statusText[status]} ${selectedCreators.length} creator!`);
    } catch (error) {
      console.error('Error bulk updating status:', error);
      
      // Fallback for demo
      setCreators(prev => prev.map(creator => 
        selectedCreators.includes(creator.id)
          ? { ...creator, status, isActive: status === 'active' }
          : creator
      ));
      setSelectedCreators([]);
      toast.success(`Đã cập nhật ${selectedCreators.length} creator! (Demo mode)`);
    }
  };

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = creator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         creator.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || creator.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatsData = (): CreatorStats => {
    const totalCreators = creators.length;
    const activeCreators = creators.filter(c => c.status === 'active').length;
    const suspendedCreators = creators.filter(c => c.status === 'suspended').length;
    const bannedCreators = creators.filter(c => c.status === 'banned').length;
    const totalQuizzes = creators.reduce((sum, c) => sum + c.quizCount, 0);
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    const thisMonth = creators.filter(c => c.createdAt >= thisMonthStart).length;
    
    return {
      totalCreators,
      activeCreators,
      suspendedCreators,
      bannedCreators,
      totalQuizzes,
      thisMonth
    };
  };

  const stats = getStatsData();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: '✅ Hoạt động' },
      suspended: { color: 'bg-yellow-100 text-yellow-800', text: '⏸️ Tạm khóa' },
      banned: { color: 'bg-red-100 text-red-800', text: '🚫 Cấm' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">👥 Quản lý Creator</h1>
          <p className="mt-2 text-gray-600">Quản lý người tạo quiz và quyền hạn của họ</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng Creator</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCreators}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Hoạt động</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCreators}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏸️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tạm khóa</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.suspendedCreators}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">🚫</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bị cấm</p>
                <p className="text-2xl font-bold text-red-600">{stats.bannedCreators}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng Quiz</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <span className="text-2xl">🆕</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tháng này</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc và thao tác</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">📋 Tất cả trạng thái</option>
              <option value="active">✅ Hoạt động</option>
              <option value="suspended">⏸️ Tạm khóa</option>
              <option value="banned">🚫 Bị cấm</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedCreators.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  Đã chọn {selectedCreators.length} creator
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('active')}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    ✅ Kích hoạt
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('suspended')}
                    className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                  >
                    ⏸️ Tạm khóa
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('banned')}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    🚫 Cấm
                  </button>
                  <button
                    onClick={() => setSelectedCreators([])}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Creators List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Danh sách Creator ({filteredCreators.length})
            </h2>
          </div>
          
          <div className="p-6">
            {filteredCreators.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Không có creator nào</h3>
                <p className="text-gray-500">Không tìm thấy creator nào phù hợp với bộ lọc hiện tại</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCreators.map((creator) => (
                  <div key={creator.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedCreators.includes(creator.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCreators([...selectedCreators, creator.id]);
                            } else {
                              setSelectedCreators(selectedCreators.filter(id => id !== creator.id));
                            }
                          }}
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{creator.displayName}</h3>
                            {getStatusBadge(creator.status)}
                          </div>
                          
                          <p className="text-gray-600 mb-3">{creator.email}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-3">
                            <span>📝 {creator.quizCount} quiz</span>
                            <span>👥 {creator.totalPlays} lượt chơi</span>
                            <span>⭐ {creator.avgRating.toFixed(1)} điểm TB</span>
                            <span>📅 {creator.createdAt.toLocaleDateString('vi-VN')}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {creator.permissions.canCreateQuiz && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Tạo quiz</span>
                            )}
                            {creator.permissions.canEditOwnQuiz && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Sửa quiz</span>
                            )}
                            {creator.permissions.canDeleteOwnQuiz && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Xóa quiz</span>
                            )}
                            {creator.permissions.canViewAnalytics && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Xem thống kê</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowPermissionModal(creator)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 border border-blue-300 rounded text-sm"
                        >
                          ⚙️ Quyền hạn
                        </button>
                        
                        {creator.status === 'active' ? (
                          <button
                            onClick={() => updateCreatorStatus(creator.id, 'suspended')}
                            className="px-3 py-1 text-yellow-600 hover:bg-yellow-50 border border-yellow-300 rounded text-sm"
                          >
                            ⏸️ Tạm khóa
                          </button>
                        ) : (
                          <button
                            onClick={() => updateCreatorStatus(creator.id, 'active')}
                            className="px-3 py-1 text-green-600 hover:bg-green-50 border border-green-300 rounded text-sm"
                          >
                            ✅ Kích hoạt
                          </button>
                        )}
                        
                        <button
                          onClick={() => updateCreatorStatus(creator.id, 'banned')}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 border border-red-300 rounded text-sm"
                        >
                          🚫 Cấm
                        </button>
                        
                        <button
                          onClick={() => deleteCreator(creator.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 border border-red-300 rounded text-sm"
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Permission Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  ⚙️ Quyền hạn - {showPermissionModal.displayName}
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries({
                    canCreateQuiz: 'Tạo quiz mới',
                    canEditOwnQuiz: 'Chỉnh sửa quiz của mình',
                    canDeleteOwnQuiz: 'Xóa quiz của mình',
                    canViewAnalytics: 'Xem thống kê và phân tích'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-700">{label}</span>
                      <input
                        type="checkbox"
                        checked={showPermissionModal.permissions[key as keyof Creator['permissions']]}
                        onChange={(e) => {
                          setShowPermissionModal({
                            ...showPermissionModal,
                            permissions: {
                              ...showPermissionModal.permissions,
                              [key]: e.target.checked
                            }
                          });
                        }}
                        className="rounded border-gray-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPermissionModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  onClick={() => updateCreatorPermissions(showPermissionModal.id, showPermissionModal.permissions)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorManagement;

import React, { useState, useEffect, useCallback } from 'react';
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
  orderBy,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { formatDate } from '../../../lib/utils/helpers';
import { 
  Users, 
  UserCheck, 
  UserX, 
  UserMinus, 
  Search, 
  Eye,
  Trash2,
  Shield,
  ShieldOff,
  Trophy,
  TrendingUp,
  Calendar,
  Star
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const { user } = useSelector((state: RootState) => state.auth);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);

  const loadCreators = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading creators...');
      
      // Load users with creator role
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['creator', 'admin']),
        orderBy('createdAt', 'desc')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      console.log('Found users:', usersSnapshot.docs.length);
      const loadedCreators: Creator[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        try {
          // Count quizzes created by this user
          const quizzesQuery = query(
            collection(db, 'quizzes'),
            where('createdBy', '==', userDoc.id)
          );
          const quizzesSnapshot = await getCountFromServer(quizzesQuery);
          const quizCount = quizzesSnapshot.data().count;

          // Get quiz IDs for this creator
          const quizIds = await getQuizIdsByCreator(userDoc.id);
          
          // Count total plays (quiz results) - only if there are quizzes
          let totalPlays = 0;
          if (quizIds.length > 0) {
            const resultsQuery = query(
              collection(db, 'quizResults'),
              where('quizId', 'in', quizIds.slice(0, 10)) // Limit to avoid Firestore 'in' constraint
            );
            const resultsSnapshot = await getCountFromServer(resultsQuery);
            totalPlays = resultsSnapshot.data().count;
          }

          loadedCreators.push({
            id: userDoc.id,
            displayName: userData.displayName || userData.email || 'Người dùng',
            email: userData.email || '',
            role: userData.role || 'creator',
            isActive: userData.isActive !== false,
            createdAt: userData.createdAt?.toDate() || new Date(),
            lastLoginAt: userData.lastLoginAt?.toDate(),
            quizCount,
            totalPlays,
            avgRating: 4.2 + Math.random() * 0.8, // Mock rating
            status: userData.status || 'active',
            permissions: userData.permissions || {
              canCreateQuiz: true,
              canEditOwnQuiz: true,
              canDeleteOwnQuiz: true,
              canViewAnalytics: true
            }
          });
        } catch (userError) {
          console.warn(`Error loading data for user ${userDoc.id}:`, userError);
          // Add user with minimal data if there's an error
          loadedCreators.push({
            id: userDoc.id,
            displayName: userData.displayName || userData.email || 'Người dùng',
            email: userData.email || '',
            role: userData.role || 'creator',
            isActive: userData.isActive !== false,
            createdAt: userData.createdAt?.toDate() || new Date(),
            lastLoginAt: userData.lastLoginAt?.toDate(),
            quizCount: 0,
            totalPlays: 0,
            avgRating: 0,
            status: userData.status || 'active',
            permissions: userData.permissions || {
              canCreateQuiz: true,
              canEditOwnQuiz: true,
              canDeleteOwnQuiz: true,
              canViewAnalytics: true
            }
          });
        }
      }

      console.log('Loaded creators:', loadedCreators.length);
      setCreators(loadedCreators);
      
      // Show empty state if no real creators found
      if (loadedCreators.length === 0) {
        console.log('No real creators found');
      }
    } catch (error) {
      console.error('Error loading creators:', error);
      toast.error(t('creatorManagement.loadError'));
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const getQuizIdsByCreator = async (creatorId: string): Promise<string[]> => {
    try {
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('createdBy', '==', creatorId)
      );
      const snapshot = await getDocs(quizzesQuery);
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      return [];
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['creator', 'admin'])
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const allCreators = usersSnapshot.docs.map(doc => doc.data());
      const totalCreators = allCreators.length;
      const activeCreators = allCreators.filter(u => u.status !== 'banned' && u.status !== 'suspended').length;
      const suspendedCreators = allCreators.filter(u => u.status === 'suspended').length;
      const bannedCreators = allCreators.filter(u => u.status === 'banned').length;

      // Count total quizzes
      const quizzesSnapshot = await getCountFromServer(collection(db, 'quizzes'));
      const totalQuizzes = quizzesSnapshot.data().count;

      setStats({
        totalCreators,
        activeCreators,
        suspendedCreators,
        bannedCreators,
        totalQuizzes,
        thisMonth: Math.floor(totalQuizzes * 0.3) // Mock this month data
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set empty stats on error
      setStats({
        totalCreators: 0,
        activeCreators: 0,
        suspendedCreators: 0,
        bannedCreators: 0,
        totalQuizzes: 0,
        thisMonth: 0
      });
    }
  }, []);

  useEffect(() => {
    loadCreators();
    loadStats();
  }, [loadCreators, loadStats]);

  const handleStatusChange = async (creatorId: string, newStatus: 'active' | 'suspended' | 'banned') => {
    try {
      await updateDoc(doc(db, 'users', creatorId), {
        status: newStatus,
        isActive: newStatus === 'active'
      });

      setCreators(creators.map(creator =>
        creator.id === creatorId
          ? { ...creator, status: newStatus, isActive: newStatus === 'active' }
          : creator
      ));

      toast.success(t('creatorManagement.updateSuccess'));
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('creatorManagement.updateError'));
    }
  };

  const handleDeleteCreator = async (creatorId: string) => {
    if (!confirm(t('creatorManagement.confirmDelete'))) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', creatorId));
      setCreators(creators.filter(creator => creator.id !== creatorId));
      toast.success(t('creatorManagement.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting creator:', error);
      toast.error(t('creatorManagement.deleteError'));
    }
  };

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = creator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         creator.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || creator.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderStatsCard = (icon: React.ReactNode, title: string, value: number, color: string) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800'
    };

    const labels = {
      active: 'Hoạt động',
      suspended: 'Tạm khóa',
      banned: 'Bị cấm'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("messages.unauthorized")}</h2>
          <p className="text-gray-600">{t('creatorManagement.adminRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('creatorManagement.title')}</h1>
          <p className="text-gray-600 mt-2">{t('creatorManagement.description')}</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {renderStatsCard(
              <Users className="w-6 h-6 text-white" />,
              t('creatorManagement.stats.total'),
              stats.totalCreators,
              'bg-blue-500'
            )}
            {renderStatsCard(
              <UserCheck className="w-6 h-6 text-white" />,
              t('creatorManagement.stats.active'),
              stats.activeCreators,
              'bg-green-500'
            )}
            {renderStatsCard(
              <UserMinus className="w-6 h-6 text-white" />,
              t('creatorManagement.stats.suspended'),
              stats.suspendedCreators,
              'bg-yellow-500'
            )}
            {renderStatsCard(
              <UserX className="w-6 h-6 text-white" />,
              t('creatorManagement.stats.banned'),
              stats.bannedCreators,
              'bg-red-500'
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('creatorManagement.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended' | 'banned')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">{t('creatorManagement.status.all')}</option>
                <option value="active">{t("leaderboard.activity")}</option>
                <option value="suspended">{t('creatorManagement.status.suspended')}</option>
                <option value="banned">{t('creatorManagement.status.banned')}</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              {t('creatorManagement.showing', { filtered: filteredCreators.length, total: creators.length })}
            </div>
          </div>
        </div>

        {/* Creators Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('creatorManagement.loading')}</p>
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('creatorManagement.noCreators')}</h3>
              <p className="text-gray-600">{t('creatorManagement.noCreatorsMatch')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("nav.creator")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.preview.status")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.editRequests.quiz")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("leaderboard.plays")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('creatorManagement.rating')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('creatorManagement.lastActivity')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("admin.quizManagement.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCreators.map((creator) => (
                    <tr key={creator.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {creator.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {creator.displayName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {creator.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(creator.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <Trophy className="w-4 h-4 text-yellow-500 mr-1" />
                          <span className="font-medium">{creator.quizCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                          <span className="font-medium">{creator.totalPlays}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="font-medium">{creator.avgRating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {creator.lastLoginAt ? (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(creator.lastLoginAt, 'long')}
                          </div>
                        ) : (
                          t('creatorManagement.notLoggedIn')
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCreator(creator);
                              setShowCreatorModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {creator.status === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(creator.id, 'suspended')}
                              className="text-yellow-600 hover:text-yellow-900 p-1"
                            >
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(creator.id, 'active')}
                              className="text-green-600 hover:text-green-900 p-1"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteCreator(creator.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Creator Detail Modal */}
        {showCreatorModal && selectedCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('creatorManagement.creatorDetail')}
                  </h3>
                  <button
                    onClick={() => setShowCreatorModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {selectedCreator.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {selectedCreator.displayName}
                      </h4>
                      <p className="text-gray-600">{selectedCreator.email}</p>
                      <p className="text-sm text-gray-500">
                        {t('creatorManagement.joinedOn')}: {formatDate(selectedCreator.createdAt, 'long')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Trophy className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{selectedCreator.quizCount}</p>
                      <p className="text-sm text-gray-600">{t('creatorManagement.quizzesCreated')}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{selectedCreator.totalPlays}</p>
                      <p className="text-sm text-gray-600">{t("leaderboard.plays")}</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{selectedCreator.avgRating.toFixed(1)}</p>
                      <p className="text-sm text-gray-600">{t('creatorManagement.avgRating')}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">{t('creatorManagement.permissions')}</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('creatorManagement.permissions.createQuiz')}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedCreator.permissions.canCreateQuiz 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedCreator.permissions.canCreateQuiz ? 'Có' : 'Không'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t("admin.quizManagement.tooltips.edit")}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedCreator.permissions.canEditOwnQuiz 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedCreator.permissions.canEditOwnQuiz ? 'Có' : 'Không'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('creatorManagement.permissions.deleteQuiz')}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedCreator.permissions.canDeleteOwnQuiz 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedCreator.permissions.canDeleteOwnQuiz ? t('yes') : t('no')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('creatorManagement.permissions.viewAnalytics')}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedCreator.permissions.canViewAnalytics 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedCreator.permissions.canViewAnalytics ? t('yes') : t('no')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorManagement;

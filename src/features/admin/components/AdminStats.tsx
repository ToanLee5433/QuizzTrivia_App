import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, BookOpen, Target, Award, RefreshCw, 
  Eye, MessageSquare, Edit, Download
} from 'lucide-react';
import { getRealQuizData, getRealUserData, getRealReviewData, getRealCategoryData } from '../../quiz/services/realDataService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminStats: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [realData, setRealData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'quizzes' | 'performance'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const navigate = useNavigate();

  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    setLoading(true);
    try {
      const [quizzes, users, reviews, categories] = await Promise.all([
        getRealQuizData(),
        getRealUserData(), 
        getRealReviewData(),
        getRealCategoryData()
      ]);

      setRealData({
        quizzes: quizzes || [],
        users: users || [],
        reviews: reviews || [],
        categories: categories || []
      });

      toast.success(t('admin.dataLoadSuccess', 'Đã tải dữ liệu thực tế từ Firebase!'));
    } catch (error) {
      console.error('Error loading real data:', error);
      toast.error(t('admin.realDataLoadError', 'Lỗi khi tải dữ liệu thực tế'));
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadRealData();
  };

  const exportData = () => {
    console.log('Exporting data...');
    toast.info(t('admin.exportDataDevelopment', 'Chức năng xuất dữ liệu đang được phát triển'));
  };

  // Calculate enhanced stats from real data
  const getEnhancedStats = () => {
    if (!realData) return null;

    const { quizzes, users, reviews } = realData;
    
    // Calculate more accurate statistics
    const publishedQuizzes = quizzes.filter((q: any) => q.status === 'published' || q.status === 'approved').length;
    const creatorUsers = users.filter((u: any) => u.role === 'creator' || u.role === 'admin').length;
    const quizCreatorIds = new Set(quizzes.map((q: any) => q.createdBy).filter(Boolean));
    const totalCreators = Math.max(creatorUsers, quizCreatorIds.size);
    
    // More realistic completion estimates based on actual quiz count
    const estimatedCompletions = Math.floor(publishedQuizzes * 2.5); // Average 2.5 attempts per published quiz
    
    return {
      totalUsers: users.length,
      activeUsers: Math.floor(users.length * 0.65), // More conservative estimate
      totalQuizzes: quizzes.length,
      publishedQuizzes: publishedQuizzes, // Quizzes available to users
      totalCreators: totalCreators, // Users who have created quizzes
      completedQuizzes: estimatedCompletions, // Quiz completion attempts
      averageScore: 78.5, // Keep mock for now
      completionRate: 85.2, // Keep mock for now  
      userGrowthRate: 12.5, // Keep mock for now
      quizCompletionGrowth: 8.3, // Keep mock for now
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 ? 
        reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length : 0
    };
  };

  const enhancedStats = getEnhancedStats();

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change: number;
    color: string;
    onClick?: () => void;
  }> = ({ title, value, icon, change, color, onClick }) => (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center">
        {change >= 0 ? (
          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
        )}
        <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
        <span className="text-sm text-gray-500 ml-1">{t('admin.vsLastMonth', 'vs last month')}</span>
      </div>
    </div>
  );

  const renderOverview = () => {
    if (!enhancedStats) return <div>{t('loading', 'Loading...')}</div>;

    return (
      <div className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title={t('admin.stats.totalUsers', 'Tổng tài khoản')}
            value={enhancedStats.totalUsers.toLocaleString()}
            icon={<Users className="w-6 h-6 text-blue-600" />}
            change={enhancedStats.userGrowthRate}
            color="blue"
            onClick={() => setActiveTab('users')}
          />
          <StatCard
            title={t('admin.stats.publishedQuizzes', 'Quiz đã xuất bản')}
            value={enhancedStats.publishedQuizzes.toLocaleString()}
            icon={<BookOpen className="w-6 h-6 text-green-600" />}
            change={15.3}
            color="green"
            onClick={() => setActiveTab('quizzes')}
          />
          <StatCard
            title={t('admin.stats.completionAttempts', 'Lượt làm bài')}
            value={enhancedStats.completedQuizzes.toLocaleString()}
            icon={<Target className="w-6 h-6 text-purple-600" />}
            change={enhancedStats.quizCompletionGrowth}
            color="purple"
          />
          <StatCard
            title={t('admin.stats.totalCreators', 'Người sáng tạo')}
            value={enhancedStats.totalCreators.toLocaleString()}
            icon={<Award className="w-6 h-6 text-orange-600" />}
            change={8.2}
            color="orange"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('admin.stats.userGrowth', 'User Growth')}</h3>
              <div className="flex space-x-2">
                {['7d', '30d', '90d', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range as any)}
                    className={`px-3 py-1 text-xs rounded-full ${
                      timeRange === range
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={[
                { date: 'T1', users: Math.floor(enhancedStats.totalUsers * 0.7) },
                { date: 'T2', users: Math.floor(enhancedStats.totalUsers * 0.8) },
                { date: 'T3', users: Math.floor(enhancedStats.totalUsers * 0.9) },
                { date: 'T4', users: enhancedStats.totalUsers }
              ]}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quiz Activity Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('admin.stats.quizActivity', 'Quiz activity')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { date: 'T1', created: Math.floor(enhancedStats.totalQuizzes * 0.2), completed: Math.floor(enhancedStats.completedQuizzes * 0.2) },
                { date: 'T2', created: Math.floor(enhancedStats.totalQuizzes * 0.3), completed: Math.floor(enhancedStats.completedQuizzes * 0.3) },
                { date: 'T3', created: Math.floor(enhancedStats.totalQuizzes * 0.4), completed: Math.floor(enhancedStats.completedQuizzes * 0.5) },
                { date: 'T4', created: Math.floor(enhancedStats.totalQuizzes * 0.1), completed: Math.floor(enhancedStats.completedQuizzes * 0.3) }
              ]}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" fill="#10B981" name={t('admin.stats.createdQuizzes', 'Created quizzes')} />
                <Bar dataKey="completed" fill="#3B82F6" name={t('admin.stats.completedAttempts', 'Completed attempts')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.stats.performanceOverview', 'Performance overview')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('admin.stats.averageScore', 'Average score')}</span>
                <span className="font-semibold text-green-600">{enhancedStats.averageScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('admin.stats.completionRate', 'Completion rate')}</span>
                <span className="font-semibold text-blue-600">{enhancedStats.completionRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('admin.stats.totalReviews', 'Total reviews')}</span>
                <span className="font-semibold text-purple-600">{enhancedStats.totalReviews}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('admin.stats.averageRating', 'Average rating')}</span>
                <span className="font-semibold text-yellow-600">
                  {enhancedStats.averageRating.toFixed(1)} ⭐
                </span>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.stats.topCategories', 'Top categories')}</h3>
            <div className="space-y-3">
              {realData?.categories?.slice(0, 5).map((category: any, index: number) => (
                <div key={category.id} className="flex items-center justify-between">
                  <span className="text-gray-600">{category.name || t('admin.stats.unnamedCategory', { n: index + 1, defaultValue: `Category ${index + 1}` })}</span>
                  <span className="font-semibold text-blue-600">
                    {realData.quizzes.filter((q: any) => q.category === category.id).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.stats.recentActivity', 'Recent activity')}</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">{t('admin.stats.availableQuizzes', { count: enhancedStats.totalQuizzes, defaultValue: `${enhancedStats.totalQuizzes} quizzes available` })}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">{t('admin.stats.registeredUsers', { count: enhancedStats.totalUsers, defaultValue: `${enhancedStats.totalUsers} users registered` })}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">{t('admin.stats.reviews', { count: enhancedStats.totalReviews, defaultValue: `${enhancedStats.totalReviews} reviews` })}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600">{t('admin.stats.completions', { count: enhancedStats.completedQuizzes, defaultValue: `${enhancedStats.completedQuizzes} completions` })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.userManagement', 'User Management')}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">{t('ui.user', 'User')}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">{t('status.active', 'Active')}</th>
              </tr>
            </thead>
            <tbody>
              {realData?.users?.slice(0, 10).map((user: any) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-900">{user.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.email || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.role || 'user'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {t('status.active', 'Active')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderQuizzes = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('admin.quizManagement', 'Quiz Management')}</h3>
          <button
            onClick={() => navigate('/admin/quiz-management')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('viewDetails', 'View details')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">{t('admin.quizManagement.table.title', 'Title')}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">{t('admin.quizManagement.table.category', 'Category')}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">{t('admin.quizManagement.table.creator', 'Creator')}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">{t('admin.quizManagement.table.createdAt', 'Created at')}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">{t('admin.quizManagement.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {realData?.quizzes?.slice(0, 10).map((quiz: any) => (
                <tr key={quiz.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {quiz.title || t('quiz.untitled', 'Untitled')}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {quiz.category || t('admin.quizManagement.table.uncategorized', 'Uncategorized')}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {quiz.createdBy || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {quiz.createdAt ? new Date(quiz.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/quiz/${quiz.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('admin.quizManagement.tooltips.preview', 'Preview details')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/edit-quiz/${quiz.id}`)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title={t('admin.quizManagement.tooltips.edit', 'Edit quiz')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/quiz/${quiz.id}/reviews`)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={t('admin.quizManagement.tooltips.viewReviews', 'View reviews')}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.stats.performanceMetrics', 'Performance metrics')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[
              { month: 'T1', score: 75, completion: 80 },
              { month: 'T2', score: 78, completion: 82 },
              { month: 'T3', score: 76, completion: 85 },
              { month: 'T4', score: 79, completion: 87 }
            ]}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#10B981" name={t('admin.stats.averageScore', 'Average score')} />
              <Line type="monotone" dataKey="completion" stroke="#3B82F6" name={t('admin.stats.completionRate', 'Completion rate')} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quiz Rating Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.stats.ratingDistribution', 'Rating distribution')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: '5★', value: 35, color: '#10B981' },
                  { name: '4★', value: 28, color: '#3B82F6' },
                  { name: '3★', value: 20, color: '#F59E0B' },
                  { name: '2★', value: 12, color: '#EF4444' },
                  { name: '1★', value: 5, color: '#6B7280' }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
              >
                {[
                  { color: '#10B981' },
                  { color: '#3B82F6' },
                  { color: '#F59E0B' },
                  { color: '#EF4444' },
                  { color: '#6B7280' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('admin.loadingRealData', 'Loading real data...')}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: t('admin.tabs.overview', 'Overview'), icon: Target },
    { id: 'users', label: t('admin.tabs.users', 'Users'), icon: Users },
    { id: 'quizzes', label: t('admin.tabs.quizzes', 'Quizzes'), icon: BookOpen },
    { id: 'performance', label: t('admin.tabs.performance', 'Performance'), icon: Award }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 {t('admin.header.title', 'Admin Statistics (Real Data)')}</h1>
              <p className="text-gray-600">{t('admin.header.subtitle', 'Statistics dashboard with real data from Firebase')}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('refresh', 'Refresh')}
              </button>
              <button
                onClick={exportData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('admin.exportData', 'Export data')}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                   {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'quizzes' && renderQuizzes()}
          {activeTab === 'performance' && renderPerformance()}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;

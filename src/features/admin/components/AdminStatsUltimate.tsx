import React, { useState, useEffect } from 'react';
import { 
  BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, BookOpen, Target, RefreshCw, 
  Eye, MessageSquare, Edit, Download, Search, Plus,
  Star, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { getRealQuizData, getRealUserData, getRealReviewData, getRealCategoryData } from '../../quiz/services/realDataService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminStatsUltimate: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [realData, setRealData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'quizzes' | 'analytics' | 'reviews'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
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

      toast.success(`🎉 Loaded: ${users?.length || 0} users, ${quizzes?.length || 0} quizzes, ${reviews?.length || 0} reviews!`);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('❌ Failed to load data from Firebase');
    } finally {
      setLoading(false);
    }
  };

  // Calculate enhanced stats
  const getEnhancedStats = () => {
    if (!realData) return null;

    const { quizzes, users, reviews } = realData;
    
    const approvedQuizzes = quizzes.filter((q: any) => q.status === 'approved' || !q.status).length;
    const pendingQuizzes = quizzes.filter((q: any) => q.status === 'pending').length;
    const rejectedQuizzes = quizzes.filter((q: any) => q.status === 'rejected').length;
    
    const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Calculate growth trends (mock data for now)
    const userGrowth = calculateGrowthRate();
    const quizGrowth = calculateGrowthRate();
    const reviewGrowth = calculateGrowthRate();

    return {
      totalUsers: users.length,
      activeUsers: Math.floor(users.length * 0.75),
      totalQuizzes: quizzes.length,
      approvedQuizzes,
      pendingQuizzes,
      rejectedQuizzes,
      totalReviews: reviews.length,
      averageRating,
      userGrowth,
      quizGrowth,
      reviewGrowth,
      completionRate: 87.5,
      popularCategories: calculatePopularCategories(quizzes),
      recentActivity: calculateRecentActivity()
    };
  };

  const calculateGrowthRate = () => {
    // Mock growth calculation - in real app, compare with previous period
    return Math.floor(Math.random() * 30) + 5;
  };

  const calculatePopularCategories = (quizzes: any[]) => {
    const categoryMap = new Map();
    quizzes.forEach(quiz => {
      const cat = quiz.category || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    
    return Array.from(categoryMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        count,
        color: getColorByIndex(index)
      }));
  };

  const calculateRecentActivity = () => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
        quizzes: Math.floor(Math.random() * 10) + 1,
        reviews: Math.floor(Math.random() * 25) + 5,
        users: Math.floor(Math.random() * 15) + 3
      };
    });
    return last7Days;
  };

  const getColorByIndex = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  const filteredQuizzes = realData?.quizzes?.filter((quiz: any) => {
    const matchesSearch = !searchTerm || 
      quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      quiz.status === filterStatus || 
      (filterStatus === 'approved' && !quiz.status);
    
    return matchesSearch && matchesFilter;
  }) || [];

  const stats = getEnhancedStats();

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change: number;
    color: string;
    onClick?: () => void;
  }> = ({ title, value, icon, change, color, onClick }) => (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br from-${color}-400 to-${color}-600`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 text-white' })}
        </div>
      </div>
      <div className="mt-4 flex items-center">
        {change >= 0 ? (
          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
        )}
        <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
        <span className="text-sm text-gray-500 ml-2">vs last month</span>
      </div>
    </div>
  );

  const renderOverview = () => {
    if (!stats) return null;

    return (
      <div className="space-y-8">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users />}
            change={stats.userGrowth}
            color="blue"
            onClick={() => setActiveTab('users')}
          />
          <StatCard
            title="Active Quizzes"
            value={stats.totalQuizzes}
            icon={<BookOpen />}
            change={stats.quizGrowth}
            color="purple"
            onClick={() => setActiveTab('quizzes')}
          />
          <StatCard
            title="Total Reviews"
            value={stats.totalReviews}
            icon={<MessageSquare />}
            change={stats.reviewGrowth}
            color="green"
            onClick={() => setActiveTab('reviews')}
          />
          <StatCard
            title="Avg Rating"
            value={`${stats.averageRating.toFixed(1)}/5`}
            icon={<Star />}
            change={12}
            color="yellow"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
              <div className="flex space-x-2">
                {['7d', '30d', '90d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range as any)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      timeRange === range
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.recentActivity}>
                <defs>
                  <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="quizzes" stroke="#3B82F6" fillOpacity={1} fill="url(#colorQuizzes)" name="New Quizzes" />
                <Area type="monotone" dataKey="reviews" stroke="#10B981" fillOpacity={1} fill="url(#colorReviews)" name="New Reviews" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Popular Categories</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.popularCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {stats.popularCategories.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Approved Quizzes</p>
                <p className="text-3xl font-bold">{stats.approvedQuizzes}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pending Review</p>
                <p className="text-3xl font-bold">{stats.pendingQuizzes}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-400 to-red-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Completion Rate</p>
                <p className="text-3xl font-bold">{stats.completionRate}%</p>
              </div>
              <Target className="w-8 h-8 text-red-200" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuizzes = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search quizzes by title, description, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => navigate('/admin/quiz-management')}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Quiz
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredQuizzes.length} of {realData?.quizzes?.length || 0} quizzes
        </div>
      </div>

      {/* Quiz List */}
      <div className="space-y-4">
        {filteredQuizzes.map((quiz: any) => (
          <div key={quiz.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      {quiz.title || 'Untitled Quiz'}
                    </h4>
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {quiz.description || 'No description provided'}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        ID: {quiz.id.slice(0, 8)}...
                      </span>
                      
                      {quiz.category && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                          {quiz.category}
                        </span>
                      )}
                      
                      {quiz.difficulty && (
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          quiz.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {quiz.difficulty}
                        </span>
                      )}
                      
                      <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${
                        quiz.status === 'approved' || !quiz.status ? 'bg-green-100 text-green-800' :
                        quiz.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {quiz.status === 'approved' || !quiz.status ? (
                          <><CheckCircle className="w-3 h-3" /> Approved</>
                        ) : quiz.status === 'pending' ? (
                          <><Clock className="w-3 h-3" /> Pending</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Rejected</>
                        )}
                      </span>
                      
                      {quiz.questions && (
                        <span className="text-xs text-gray-500">
                          {quiz.questions.length} questions
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Created: {quiz.createdAt ? new Date(quiz.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      {quiz.createdBy && ` • By: ${quiz.createdBy}`}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  title="View Quiz"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                  title="Edit Quiz"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate(`/quiz/${quiz.id}/reviews`)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                  title="View Reviews"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-xl text-gray-600">Loading amazing dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'quizzes', label: 'Quizzes', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                🚀 Ultimate Admin Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Real-time analytics and management for your quiz platform
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadRealData}
                disabled={loading}
                className="flex items-center px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => toast.info('Export feature coming soon!')}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-2xl p-2 shadow-sm border border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
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
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'quizzes' && renderQuizzes()}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-600">User management features coming soon...</p>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <BarChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">Detailed analytics coming soon...</p>
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Review Management</h3>
              <p className="text-gray-600">Review management features coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStatsUltimate;

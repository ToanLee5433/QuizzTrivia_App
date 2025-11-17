import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { ROUTES } from '../../../config/routes';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  Award, 
  BarChart3,
  PieChart,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Lock,
  BookOpen,
  Brain,
  Star,
  Trophy,
  Activity
} from 'lucide-react';
/* 
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);
*/

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  questions: any[];
  createdBy: string;
  createdAt: any;
  status: string;
  havePassword?: 'public' | 'password';
  quizType?: 'with-materials' | 'standard';
  imageUrl?: string;
  views?: number;
  attempts?: number;
  completions?: number;
  averageScore?: number;
}

interface QuizResult {
  id: string;
  userId: string;
  userName?: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: any;
  answers: any[];
}

interface Stats {
  totalViews: number;
  totalAttempts: number;
  totalCompletions: number;
  completionRate: number;
  averageScore: number;
  averageTimeSpent: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  recentResults: QuizResult[];
  scoreDistribution: { range: string; count: number }[];
  dailyAttempts: { date: string; count: number }[];
  questionStats: { questionId: string; correctRate: number; question: string }[];
  topPerformers: { userName: string; score: number; date: string; photoURL?: string }[];
}

const QuizDetailedStats: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'all'>('30days');

  const fetchQuizAndStats = useCallback(async () => {
    if (!id || !user) return;
    
    setLoading(true);
    try {
      // Fetch quiz
      const quizDoc = await getDoc(doc(db, 'quizzes', id));
      if (!quizDoc.exists()) {
        throw new Error('Quiz not found');
      }
      
      const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
      
      // Check if user owns this quiz
      if (quizData.createdBy !== user.uid) {
        throw new Error('Unauthorized');
      }
      
      setQuiz(quizData);

      // Fetch results - with fallback if index is still building
      let results: QuizResult[] = [];
      
      try {
        let resultsQuery;
        
        if (timeRange !== 'all') {
          const days = timeRange === '7days' ? 7 : 30;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          
          resultsQuery = query(
            collection(db, 'quizResults'),
            where('quizId', '==', id),
            where('completedAt', '>=', startDate),
            orderBy('completedAt', 'desc')
          );
        } else {
          resultsQuery = query(
            collection(db, 'quizResults'),
            where('quizId', '==', id),
            orderBy('completedAt', 'desc')
          );
        }

        const resultsSnapshot = await getDocs(resultsQuery);
        results = resultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as QuizResult[];
        
      } catch (indexError: any) {
        // If index is still building, fall back to fetching all results and filtering client-side
        console.warn('Index still building, using fallback query:', indexError.message);
        
        const fallbackQuery = query(
          collection(db, 'quizResults'),
          where('quizId', '==', id)
        );
        
        const resultsSnapshot = await getDocs(fallbackQuery);
        let allResults = resultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as QuizResult[];
        
        // Filter by time range client-side
        if (timeRange !== 'all') {
          const days = timeRange === '7days' ? 7 : 30;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          
          allResults = allResults.filter(result => 
            result.completedAt && new Date(result.completedAt) >= startDate
          );
        }
        
        // Sort client-side
        results = allResults.sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return dateB - dateA;
        });
      }

      // Calculate stats
      const calculatedStats = await calculateStats(results, quizData);
      setStats(calculatedStats);
      
    } catch (error) {
      console.error('Error fetching quiz stats:', error);
      navigate(ROUTES.CREATOR_MY_QUIZZES);
    } finally {
      setLoading(false);
    }
  }, [id, user, timeRange, navigate]);
  // calculateStats is a stable function defined below, doesn't need to be in dependencies

  useEffect(() => {
    if (id && user) {
      fetchQuizAndStats();
    }
  }, [id, user, timeRange, fetchQuizAndStats]);

  const calculateStats = async (results: QuizResult[], quizData: Quiz): Promise<Stats> => {
    // Default score ranges
    const defaultScoreDistribution = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 }
    ];

    // Default daily attempts (last 30 days)
    const defaultDailyAttempts: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      defaultDailyAttempts.push({ date: dateStr, count: 0 });
    }

    if (results.length === 0) {
      return {
        totalViews: quizData.views || 0,
        totalAttempts: 0,
        totalCompletions: 0,
        completionRate: 0,
        averageScore: 0,
        averageTimeSpent: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        recentResults: [],
        scoreDistribution: defaultScoreDistribution,
        dailyAttempts: defaultDailyAttempts,
        questionStats: [],
        topPerformers: []
      };
    }

    const totalAttempts = results.length;
    const completedResults = results.filter(r => r.score !== undefined);
    const totalCompletions = completedResults.length;
    
    const scores = completedResults.map(r => (r.score / r.totalQuestions) * 100);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length || 0;
    const highestScore = Math.max(...scores, 0);
    const lowestScore = Math.min(...scores, 100);
    
    const passRate = (scores.filter(s => s >= 60).length / scores.length) * 100 || 0;
    
    const timeSpents = completedResults.map(r => r.timeSpent || 0).filter(t => t > 0);
    const averageTimeSpent = timeSpents.reduce((a, b) => a + b, 0) / timeSpents.length || 0;

    // Score distribution
    const scoreRanges = [
      { range: '0-20%', min: 0, max: 20 },
      { range: '21-40%', min: 21, max: 40 },
      { range: '41-60%', min: 41, max: 60 },
      { range: '61-80%', min: 61, max: 80 },
      { range: '81-100%', min: 81, max: 100 }
    ];
    
    const scoreDistribution = scoreRanges.map(range => ({
      range: range.range,
      count: scores.filter(s => s >= range.min && s <= range.max).length
    }));

    // Daily attempts (last 7 or 30 days)
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    const dailyAttempts: { date: string; count: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      
      const count = results.filter(r => {
        const resultDate = r.completedAt?.toDate ? r.completedAt.toDate() : new Date(r.completedAt);
        return resultDate.toDateString() === date.toDateString();
      }).length;
      
      dailyAttempts.push({ date: dateStr, count });
    }

    // Question stats
    const questionStats = quizData.questions.map((q, index) => {
      const questionId = q.id || `q${index}`;
      const answersForQuestion = results.flatMap(r => 
        r.answers?.filter((a: any) => a.questionId === questionId) || []
      );
      
      const correctCount = answersForQuestion.filter((a: any) => a.isCorrect).length;
      const correctRate = answersForQuestion.length > 0 
        ? (correctCount / answersForQuestion.length) * 100 
        : 0;
      
      return {
        questionId,
        question: q.text || 'Untitled Question',
        correctRate: Math.round(correctRate)
      };
    }).sort((a, b) => a.correctRate - b.correctRate);

    // Top performers - fetch user photos
    const topPerformersData = await Promise.all(
      completedResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(async (r) => {
          let photoURL = '';
          if (r.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', r.userId));
              if (userDoc.exists()) {
                photoURL = userDoc.data().photoURL || '';
              }
            } catch (err) {
              console.error('Error fetching user photo:', err);
            }
          }
          return {
            userName: r.userName || 'Anonymous',
            score: Math.round((r.score / r.totalQuestions) * 100),
            date: r.completedAt?.toDate ? r.completedAt.toDate().toLocaleDateString('vi-VN') : 'N/A',
            photoURL
          };
        })
    );

    return {
      totalViews: quizData.views || 0,
      totalAttempts,
      totalCompletions,
      completionRate: (totalCompletions / totalAttempts) * 100 || 0,
      averageScore: Math.round(averageScore),
      averageTimeSpent: Math.round(averageTimeSpent),
      highestScore: Math.round(highestScore),
      lowestScore: Math.round(lowestScore),
      passRate: Math.round(passRate),
      recentResults: results.slice(0, 20),
      scoreDistribution,
      dailyAttempts,
      questionStats,
      topPerformers: topPerformersData
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = () => {
    // TODO: Implement export to CSV/Excel
    alert('Tính năng xuất báo cáo đang được phát triển');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  if (!quiz || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy quiz</p>
          <button
            onClick={() => navigate(ROUTES.CREATOR_MY_QUIZZES)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // Chart data (commented - using tables instead)
  /*
  const lineChartData = {
    labels: stats.dailyAttempts.map(d => d.date),
    datasets: [
      {
        label: 'Lượt làm bài',
        data: stats.dailyAttempts.map(d => d.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const scoreDistributionData = {
    labels: stats.scoreDistribution.map(d => d.range),
    datasets: [
      {
        label: 'Số học viên',
        data: stats.scoreDistribution.map(d => d.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(249, 115, 22)',
          'rgb(234, 179, 8)',
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2
      }
    ]
  };

  const questionDifficultyData = {
    labels: stats.questionStats.slice(0, 10).map(q => `Câu ${stats.questionStats.indexOf(q) + 1}`),
    datasets: [
      {
        label: 'Tỷ lệ đúng (%)',
        data: stats.questionStats.slice(0, 10).map(q => q.correctRate),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 2
      }
    ]
  };
  */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(ROUTES.CREATOR_MY_QUIZZES)}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Quay lại My Quizzes</span>
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
                  {quiz.havePassword === 'password' && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      Password
                    </span>
                  )}
                  {quiz.quizType === 'with-materials' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      With Materials
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{quiz.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg font-medium">
                    📚 {quiz.category}
                  </span>
                  <span className={`px-3 py-1 rounded-lg font-medium ${
                    quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {quiz.difficulty === 'easy' ? '⭐ Dễ' : quiz.difficulty === 'medium' ? '⭐⭐ Trung bình' : '⭐⭐⭐ Khó'}
                  </span>
                  <span className="text-gray-600">
                    <Brain className="w-4 h-4 inline mr-1" />
                    {quiz.questions.length} câu hỏi
                  </span>
                </div>
              </div>
              {quiz.imageUrl && (
                <img
                  src={quiz.imageUrl}
                  alt={quiz.title}
                  className="w-32 h-32 rounded-xl object-cover ml-6"
                />
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate(`/quiz-preview/${quiz.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Eye className="w-4 h-4" />
                Xem Quiz
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </button>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="all">Tất cả thời gian</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Views */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Eye className="w-8 h-8 opacity-80" />
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.totalViews.toLocaleString()}</h3>
            <p className="text-blue-100 text-sm font-medium">Lượt xem</p>
          </div>

          {/* Total Attempts */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.totalAttempts.toLocaleString()}</h3>
            <p className="text-purple-100 text-sm font-medium">Lượt làm bài</p>
          </div>

          {/* Completion Rate */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 opacity-80" />
              <Target className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.completionRate.toFixed(1)}%</h3>
            <p className="text-green-100 text-sm font-medium">Tỷ lệ hoàn thành</p>
          </div>

          {/* Average Score */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 opacity-80" />
              <Star className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.averageScore}%</h3>
            <p className="text-orange-100 text-sm font-medium">Điểm trung bình</p>
          </div>

          {/* Pass Rate */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 opacity-80" />
              <CheckCircle className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.passRate}%</h3>
            <p className="text-teal-100 text-sm font-medium">Tỷ lệ đạt (≥60%)</p>
          </div>

          {/* Highest Score */}
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <Star className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.highestScore}%</h3>
            <p className="text-pink-100 text-sm font-medium">Điểm cao nhất</p>
          </div>

          {/* Average Time */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 opacity-80" />
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatTime(stats.averageTimeSpent)}</h3>
            <p className="text-indigo-100 text-sm font-medium">Thời gian TB</p>
          </div>

          {/* Completions */}
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 opacity-80" />
              <CheckCircle className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.totalCompletions.toLocaleString()}</h3>
            <p className="text-cyan-100 text-sm font-medium">Hoàn thành</p>
          </div>
        </div>

        {/* Stats Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Attempts Bar Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Xu hướng làm bài theo ngày
            </h3>
            <div className="space-y-3">
              {stats.dailyAttempts.map((day, index) => {
                const maxCount = Math.max(...stats.dailyAttempts.map(d => d.count), 1);
                const widthPercent = day.count > 0 ? Math.max((day.count / maxCount) * 100, 10) : 0;
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-16">{day.date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end px-3 text-white text-sm font-semibold transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {day.count > 0 && day.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Distribution */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-purple-600" />
              Phân bố điểm số
            </h3>
            <div className="space-y-4">
              {stats.scoreDistribution.map((range, index) => {
                const colors = [
                  { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100' },
                  { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100' },
                  { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-100' },
                  { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-100' },
                  { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100' }
                ];
                const color = colors[index];
                const percentage = stats.totalCompletions > 0 ? (range.count / stats.totalCompletions * 100).toFixed(1) : 0;
                const maxCount = Math.max(...stats.scoreDistribution.map(r => r.count), 1);
                const widthPercent = range.count > 0 ? Math.max((range.count / maxCount) * 100, 15) : 0;
                
                return (
                  <div key={range.range} className="flex items-center gap-3">
                    <span className={`text-sm font-medium w-20 px-3 py-1 rounded-lg ${color.light} ${color.text}`}>
                      {range.range}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-10 overflow-hidden">
                      <div 
                        className={`${color.bg} h-full flex items-center justify-between px-4 text-white text-sm font-semibold transition-all duration-500`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span>{range.count} HV</span>
                        <span>{percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Analysis Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Question Difficulty Analysis */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-green-600" />
              Độ khó câu hỏi (Top 10 khó nhất)
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.questionStats.length > 0 ? (
                stats.questionStats.slice(0, 10).map((q, index) => (
                  <div key={q.questionId} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-gray-700 font-medium flex-1 pr-4">
                        <span className="text-blue-600 font-bold">Câu {index + 1}:</span> {q.question}
                      </p>
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                        q.correctRate >= 80 ? 'bg-green-100 text-green-700' :
                        q.correctRate >= 60 ? 'bg-blue-100 text-blue-700' :
                        q.correctRate >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {q.correctRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          q.correctRate >= 80 ? 'bg-green-500' :
                          q.correctRate >= 60 ? 'bg-blue-500' :
                          q.correctRate >= 40 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${q.correctRate}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Chưa có dữ liệu phân tích câu hỏi</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              Top 10 học viên xuất sắc
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.topPerformers.length > 0 ? (
                stats.topPerformers.map((performer, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-blue-500'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </div>
                      {performer.photoURL ? (
                        <img 
                          src={performer.photoURL} 
                          alt={performer.userName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-yellow-300"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {performer.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{performer.userName}</p>
                        <p className="text-sm text-gray-600">{performer.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{performer.score}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Chưa có dữ liệu</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Results Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            20 kết quả gần nhất
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Học viên</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Điểm</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Đúng/Tổng</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Thời gian</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ngày làm</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentResults.length > 0 ? (
                  stats.recentResults.map((result, index) => {
                    const scorePercent = Math.round((result.score / result.totalQuestions) * 100);
                    const passed = scorePercent >= 60;
                    
                    return (
                      <tr key={result.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          {result.userName || 'Anonymous'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            scorePercent >= 80 ? 'bg-green-100 text-green-700' :
                            scorePercent >= 60 ? 'bg-blue-100 text-blue-700' :
                            scorePercent >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {scorePercent}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                          {result.correctAnswers}/{result.totalQuestions}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                          {formatTime(result.timeSpent || 0)}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                          {result.completedAt?.toDate ? result.completedAt.toDate().toLocaleString('vi-VN') : 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {passed ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Đạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              Chưa đạt
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Chưa có kết quả nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizDetailedStats;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../../lib/store';
import QuizCard, { QuizCardSkeleton } from '../components/QuizCard';
import QuizStats from '../components/QuizStats';
import { Quiz } from '../types';
import { fetchQuizzes } from '../store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const QuizList: React.FC<{ quizzes?: Quiz[]; title?: string }> = ({ quizzes: propQuizzes, title }) => {
  // Always call hooks at the top - Fix React Hooks rules
  const { t } = useTranslation();
  const translate = useCallback(
    (key: string, fallback: string, options?: Record<string, unknown>): string => {
      const value = t(key, options as any);
      if (typeof value === 'string') {
        return value === key ? fallback : value;
      }
      return fallback;
    },
    [t]
  );

  const resultsFoundLabel = useMemo(
    () => translate('quiz.resultsFound', 'Đã tìm thấy'),
    [translate]
  );

  const itemLabel = useMemo(
    () => translate('quiz.itemLabel', 'quiz'),
    [translate]
  );

  const searchPlaceholder = useMemo(
    () => translate('quiz.searchPlaceholder', '🔍 Tìm kiếm quiz, danh mục, thẻ...'),
    [translate]
  );

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const storeQuizzes = useSelector((state: RootState) => state.quiz.quizzes);
  const loading = useSelector((state: RootState) => state.quiz.loading || state.quiz.isLoading);
  const error = useSelector((state: RootState) => state.quiz.error);
  const user = useSelector((state: RootState) => state.auth.user);

  // Use propQuizzes if provided, otherwise use store quizzes
  const quizzes = propQuizzes || storeQuizzes;

  const quizHasResources = useCallback(
    (quiz: Quiz) => Array.isArray(quiz.resources) && quiz.resources.length > 0,
    []
  );

  const approvedQuizzes = useMemo(
    () => quizzes.filter(q => q.status === 'approved'),
    [quizzes]
  );

  // Show specific error message for Firestore connection issues
  const showFirestoreError = error && (
    error.includes('ad blocker') || 
    error.includes('ERR_BLOCKED_BY_CLIENT') ||
    error.includes('Không thể kết nối Firestore')
  );

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const fetchData = async () => {
      if (!propQuizzes && quizzes.length === 0 && !loading) {
        try {
          await dispatch(fetchQuizzes({})).unwrap();
        } catch (err) {
          console.error('Quiz fetch error:', err);
          if (err instanceof Error) {
            console.error('Error message:', err.message);
            const errorWithCode = err as { code?: string };
            if (errorWithCode.code) {
              console.error('Error code:', errorWithCode.code);
            }
          } else if (typeof err === 'object' && err !== null && 'code' in err) {
            const errorWithCode = err as { code?: string };
            if (errorWithCode.code) {
              console.error('Error code:', errorWithCode.code);
            }
          }

          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, delay);
          } else {
            toast.error(translate('messages.serverError', 'Không thể kết nối đến server. Vui lòng thử lại sau.'));
          }
        }
      }
    };

    fetchData();
  }, [dispatch, propQuizzes, quizzes.length, loading, retryCount, translate]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, popular, difficulty
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // grid, list
  const [showCompleted, setShowCompleted] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [resourceFilter, setResourceFilter] = useState<'all' | 'with-resources' | 'no-resources'>('all'); // 🆕 Filter for resources

  const handleQuizStart = (quiz: Quiz) => {
    navigate(`/quiz/${quiz.id}`);
  };
  
  const categories = Array.from(new Set(quizzes.map(q => q.category)));
  const difficulties = Array.from(new Set(quizzes.map(q => q.difficulty)));
  const difficultyOrder: Record<Quiz['difficulty'], number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };
  const difficultyOptionFallback = useCallback((level: Quiz['difficulty']) => {
    switch (level) {
      case 'easy':
        return '😊 Dễ';
      case 'medium':
        return '😐 Trung bình';
      case 'hard':
        return '😤 Khó';
      default:
        return level;
    }
  }, []);
  
  // Chỉ hiển thị quiz đã được duyệt - CẢ PUBLIC VÀ PASSWORD ĐỀU HIỂN THỊ 🔒
  let filtered = approvedQuizzes.filter(q => {
    const hasResources = quizHasResources(q);

    return (
      (category === 'all' || q.category === category) &&
      (difficulty === 'all' || q.difficulty === difficulty) &&
      (showCompleted || !q.isCompleted) &&
      q.title.toLowerCase().includes(search.toLowerCase()) &&
      (resourceFilter === 'all' ||
        (resourceFilter === 'with-resources' && hasResources) ||
        (resourceFilter === 'no-resources' && !hasResources))
    );
  });

  // Sorting logic
  filtered = filtered.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'oldest':
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case 'popular':
        return (b.totalPlayers || 0) - (a.totalPlayers || 0);
      case 'difficulty': {
        return (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2);
      }
      default:
        return 0;
    }
  });

  // Retry connection handler
  const handleRetry = () => {
    setRetryCount(0);
    dispatch(fetchQuizzes({}));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">
              {error}
            </div>
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              {t('quiz.retryConnection')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-center items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">{t('quiz.loadingData')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{title || t('quiz.discoverTitle')}</h1>
              <p className="text-gray-600 text-lg">{t('quiz.discoverDescription')}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showStats ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                </svg>
                {showStats
                  ? translate('quiz.hideStats', 'Ẩn thống kê')
                  : translate('quiz.showStats', 'Hiện thống kê')}
              </button>
              {/* Multiplayer Button - Nổi bật */}
              <button 
                onClick={() => navigate('/multiplayer')}
                className="group relative flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white px-5 py-2.5 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 3C4.13 3 1 6.13 1 10c0 2.38 1.19 4.47 3 5.74V21l6-3h2c3.87 0 7-3.13 7-7s-3.13-7-7-7H8zm13 0v6l3 3-3 3v6l-5.5-4.5L18 13l3-3-3-3V1l3 2z"/>
                </svg>
                <span className="relative z-10">🎮 {t('quiz.playWithFriends')}</span>
                <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">{t('quiz.hotBadge')}</span>
              </button>
              {(user?.role === 'creator' || user?.role === 'admin') && (
                <button 
                  onClick={() => navigate('/creator')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('quiz.createNew')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && quizzes.length > 0 && (
          <QuizStats quizzes={quizzes} />
        )}

        {/* Enhanced Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          {/* 🆕 Resource Filter Tabs */}
          <div className="flex items-center gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setResourceFilter('all')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                resourceFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📚 {translate('quiz.resourceFilter.all', 'Tất cả Quiz')} ({approvedQuizzes.length})
            </button>
            <button
              onClick={() => setResourceFilter('with-resources')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                resourceFilter === 'with-resources'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">📖</span>
              {translate('quiz.resourceFilter.withResources', 'Có tài liệu học tập')} ({approvedQuizzes.filter(quizHasResources).length})
            </button>
            <button
              onClick={() => setResourceFilter('no-resources')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                resourceFilter === 'no-resources'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">⚡</span>
              {translate('quiz.resourceFilter.noResources', 'Làm trực tiếp')} ({approvedQuizzes.filter(q => !quizHasResources(q)).length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Enhanced Search */}
            <div className="lg:col-span-2 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Category Filter */}
            <select 
              className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              value={category} 
              onChange={e => setCategory(e.target.value)}
            >
              <option value="all">{translate('quiz.filters.allCategoriesOption', '🏷️ Tất cả danh mục')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            {/* Difficulty Filter */}
            <select 
              className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              value={difficulty} 
              onChange={e => setDifficulty(e.target.value)}
            >
              <option value="all">{translate('quiz.filters.allDifficultiesOption', '📊 Tất cả độ khó')}</option>
              {difficulties.map(d => (
                <option key={d} value={d}>
                  {translate(`quiz.difficultyOptions.${d}`, difficultyOptionFallback(d))}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              {/* Sort Options */}
              <select 
                className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="newest">🆕 {t('quiz.sort.newest')}</option>
                <option value="oldest">📅 {t('quiz.sort.oldest')}</option>
                <option value="popular">🔥 {t('quiz.sort.popular')}</option>
                <option value="difficulty">📈 {t('quiz.sort.byDifficulty')}</option>
              </select>

              {/* Show Completed Toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={e => setShowCompleted(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t('quiz.showCompleted')}
              </label>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('quiz.viewMode.label')}:</span>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title={t('quiz.viewMode.grid')}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title={t('quiz.viewMode.list')}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 text-sm text-gray-600">
            {resultsFoundLabel} <span className="font-semibold text-blue-600">{filtered.length}</span> {itemLabel}
            {search && (
              <span>
                {' '}
                {translate('quiz.resultsSummary.searchTerm', 'cho "{{term}}"', { term: search })}
              </span>
            )}
            {category !== 'all' && (
              <span>
                {' '}
                {translate('quiz.resultsSummary.category', 'trong danh mục "{{category}}"', { category })}
              </span>
            )}
            {difficulty !== 'all' && (
              <span>
                {' '}
                {translate('quiz.resultsSummary.difficulty', 'với độ khó "{{difficulty}}"', { difficulty })}
              </span>
            )}
          </div>
        </div>

        {/* Quiz Grid/List */}
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
          : "space-y-4"
        }>
          {loading ? (
            Array.from({length: 8}).map((_,i) => <QuizCardSkeleton key={i} />)
          ) : showFirestoreError ? (
            <div className="col-span-full bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <div className="text-red-600 text-xl font-semibold mb-3">🚫 {t('quiz.errors.connection')}</div>
              <div className="text-red-700 mb-6">{error}</div>
              <div className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                <div className="mb-3"><strong>{t('quiz.errors.troubleshoot')}:</strong></div>
                <div className="space-y-1">
                  <div>{t('1TatAdBlockerChoLocalhost5174')}</div>
                  <div>{t('2ThemGoogleapiscomVaoWhitelist')}</div>
                  <div>{t('3ThuCheDoIncognitoprivate')}</div>
                  <div>{t('4KiemTraFirewallantivirus')}</div>
                </div>
              </div>
              <button 
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium" 
                onClick={() => dispatch(fetchQuizzes({}))}
              >
                🔄 {t('quiz.retryConnection')}
              </button>
            </div>
          ) : error ? (
            <div className="col-span-full text-center">
              <div className="bg-red-50 border border-red-200 rounded-xl p-8">
                <div className="text-red-600 text-lg font-medium mb-4">❌ {t('quiz.errors.generic')}</div>
                <div className="text-red-700 mb-6">{error}</div>
                <button 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" 
                  onClick={() => dispatch(fetchQuizzes({}))}
                >
                  🔄 {t('quiz.retryConnection')}
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-12">
                <svg className='w-16 h-16 mx-auto text-gray-300 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9.75 17L9 21m6-4l.75 4M4 4v16c0 1.104.896 2 2 2h12a2 2 0 002-2V4M4 4l8 8m0 0l8-8' />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">{t('quiz.noResults.title')}</h3>
                <p className="text-gray-600 mb-6">{t('quiz.noResults.description')}</p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => {
                      setSearch('');
                      setCategory('all');
                      setDifficulty('all');
                    }}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    🔄 {t('quiz.clearFilters')}
                  </button>
                  {(user?.role === 'creator' || user?.role === 'admin') && (
                    <button 
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" 
                      onClick={()=>navigate('/creator')}
                    >
                      ➕ {t('quiz.createNew')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            filtered.map(quiz => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                viewMode={viewMode}
                onStartQuiz={handleQuizStart}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizList;



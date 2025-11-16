import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../lib/store';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase/config';
import QuizCard, { QuizCardSkeleton } from '../../quiz/components/QuizCard';
import { Quiz } from '../../quiz/types';
import { 
  Gamepad2, 
  Users, 
  Zap, 
  Trophy, 
  ArrowLeft, 
  AlertCircle
} from 'lucide-react';

const MultiplayerLobby: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      // Wait for auth to be ready if needed
      if (!auth.currentUser) {
        await new Promise<void>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((authUser) => {
            if (authUser) {
              unsubscribe();
              resolve();
            }
          });
          // Timeout after 5 seconds
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 5000);
        });
      }
      
      // Fetch ONLY APPROVED quizzes with status filter
      const allQuizzesRef = query(
        collection(db, 'quizzes'),
        where('status', '==', 'approved')
      );
      const allSnapshot = await getDocs(allQuizzesRef);
      
      const allQuizData = allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Quiz));
      
      // Filter quizzes - Chỉ cần 1 câu hỏi trở lên (đã approved từ query)
      const validQuizzes = allQuizData.filter(quiz => {
        const hasQuestions = quiz.questions && quiz.questions.length >= 1;
        return hasQuestions;
      });
      
      setQuizzes(validQuizzes);
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
      setFetchError(error.message || 'Không thể tải danh sách quiz');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchQuizzes();
  }, [user, navigate, fetchQuizzes]);

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === 'all' || quiz.category === categoryFilter;
    
    return matchesSearch && matchesDifficulty && matchesCategory;
  });

  const handleQuizSelect = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    // Tự động scroll đến nút bắt đầu
    setTimeout(() => {
      const startButton = document.getElementById('multiplayer-start-button');
      startButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleStartMultiplayer = () => {
    if (selectedQuiz) {
      navigate('/multiplayer/game', { state: { selectedQuiz } });
    }
  };

  const categories = Array.from(new Set(quizzes.map(q => q.category).filter(Boolean)));
  const difficulties = Array.from(new Set(quizzes.map(q => q.difficulty)));

  // Stats for potential future use
  // const stats = {
  //   total: filteredQuizzes.length,
  //   easy: filteredQuizzes.filter(q => q.difficulty === 'easy').length,
  //   medium: filteredQuizzes.filter(q => q.difficulty === 'medium').length,
  //   hard: filteredQuizzes.filter(q => q.difficulty === 'hard').length,
  // };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section - Giống QuizList */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/quizzes')}
                className="group flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-all duration-300 hover:gap-3"
              >
                <ArrowLeft className="w-5 h-5 group-hover:animate-bounce-x" />
                <span className="font-medium">Quay lại</span>
              </button>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Gamepad2 className="w-10 h-10 text-purple-600" />
                Multiplayer - Chơi với bạn bè
              </h1>
              <p className="text-gray-600 text-lg">Chọn quiz và tạo phòng để cạnh tranh trực tiếp!</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {fetchError && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-6 mb-6 shadow-lg animate-shake">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">Lỗi tải dữ liệu</h3>
                <p className="text-sm text-red-700 mb-3">{fetchError}</p>
                <button
                  onClick={fetchQuizzes}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Features Banner - Giống QuizList */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">{t('multiplayer.lobby.realtimeCompetition')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{t('multiplayer.lobby.realtimeCompetitionDesc')}</p>
          </div>
          
          <div className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">{t('multiplayer.lobby.privateRooms')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{t('multiplayer.lobby.privateRoomsDesc')}</p>
          </div>
          
          <div className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">{t('multiplayer.lobby.liveLeaderboard')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{t('multiplayer.lobby.liveLeaderboardDesc')}</p>
          </div>
        </div>

        {/* Enhanced Filter Section - Giống QuizList */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Enhanced Search */}
            <div className="lg:col-span-2 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('placeholders.searchQuiz')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
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
              className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">🏷️ {t('filters.allCategories')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            {/* Difficulty Filter */}
            <select 
              className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
              value={difficultyFilter} 
              onChange={e => setDifficultyFilter(e.target.value)}
            >
              <option value="all">📊 {t('filters.allDifficulties')}</option>
              {difficulties.map(d => <option key={d} value={d}>
                {d === 'easy' ? '😊 Dễ' : d === 'medium' ? '😐 Trung bình' : '😤 Khó'}
              </option>)}
            </select>
          </div>

          {/* Advanced Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('filters.display')}:</span>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    title={t('filters.grid')}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    title={t('filters.list')}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Tìm thấy <span className="font-semibold text-purple-600">{filteredQuizzes.length}</span> quiz
            {searchTerm && <span> cho "{searchTerm}"</span>}
            {categoryFilter !== 'all' && <span> trong danh mục "{categoryFilter}"</span>}
            {difficultyFilter !== 'all' && <span> với độ khó "{difficultyFilter}"</span>}
          </div>
        </div>

        {/* Quiz Grid/List - Giống QuizList sử dụng QuizCard */}
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
          : "space-y-4"
        }>
          {loading ? (
            Array.from({length: 8}).map((_,i) => <QuizCardSkeleton key={i} />)
          ) : filteredQuizzes.length === 0 ? (
            <div className="col-span-full text-center">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-12">
                <Gamepad2 className='w-16 h-16 mx-auto text-gray-300 mb-4' />
                <h3 className="text-xl font-medium text-gray-900 mb-2">{t('multiplayer.lobby.noQuizzesFound')}</h3>
                <p className="text-gray-600 mb-6">{t('multiplayer.lobby.noQuizzesFoundDesc')}</p>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setDifficultyFilter('all');
                  }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🔄 {t('filters.clearFilters')}
                </button>
              </div>
            </div>
          ) : (
            filteredQuizzes.map(quiz => (
              <div 
                key={quiz.id}
                onClick={() => handleQuizSelect(quiz)}
                className={`cursor-pointer transition-all ${
                  selectedQuiz?.id === quiz.id 
                    ? 'ring-4 ring-purple-500 ring-offset-2' 
                    : ''
                }`}
              >
                <QuizCard 
                  quiz={quiz} 
                  viewMode={viewMode}
                  onStartQuiz={() => handleQuizSelect(quiz)}
                />
                {selectedQuiz?.id === quiz.id && (
                  <div className="absolute top-4 left-4 z-30">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Start Button - Fixed at bottom khi đã chọn quiz */}
        {selectedQuiz && (
          <div id="multiplayer-start-button" className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50 animate-slide-up">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{selectedQuiz.title}</div>
                  <div className="text-sm text-gray-600">
                    {t('multiplayer.questionsCount', { count: selectedQuiz.questions.length })} • {selectedQuiz.difficulty === 'easy' ? t('quiz.difficulty.easy') : selectedQuiz.difficulty === 'medium' ? t('quiz.difficulty.medium') : t('quiz.difficulty.hard')}
                  </div>
                </div>
              </div>
              <button
                onClick={handleStartMultiplayer}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white px-8 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold"
              >
                <Gamepad2 className="w-5 h-5" />
                {t('multiplayer.lobby.startMultiplayer')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerLobby;

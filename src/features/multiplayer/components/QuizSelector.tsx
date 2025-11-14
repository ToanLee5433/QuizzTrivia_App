import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { Search, BookOpen, Clock, Loader2 } from 'lucide-react';
import { logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';

interface QuizSelectorProps {
  onSelectQuiz: (quiz: any) => void;
  onBack: () => void;
}

const QuizSelector: React.FC<QuizSelectorProps> = ({ onSelectQuiz, onBack }) => {
  const { t } = useTranslation();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        logger.debug('[QuizSelector] Starting to fetch quizzes...', {
          userId: auth.currentUser?.uid,
          isAuthenticated: !!auth.currentUser
        });
        
        // Wait for auth to be ready
        if (!auth.currentUser) {
          logger.warn('[QuizSelector] Waiting for authentication...');
          // Wait for auth state to initialize
          const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
              logger.success('[QuizSelector] Auth ready', { userId: user.uid });
              unsubscribe();
              // Retry fetch after auth is ready
              fetchQuizzesData();
            } else {
              logger.error('[QuizSelector] User not authenticated after waiting!');
              setLoading(false);
              unsubscribe();
            }
          });
          return;
        }
        
        await fetchQuizzesData();
      } catch (error) {
        logger.error('[QuizSelector] Error in main fetch', error);
        setLoading(false);
      }
    };

    const fetchQuizzesData = async () => {
      try {
        setLoading(true);
        const quizzesRef = query(
          collection(db, 'quizzes'),
          where('status', '==', 'approved')
        );
        
        logger.debug('[QuizSelector] Fetching APPROVED quizzes...', { userId: auth.currentUser?.uid });
        
        // Fetch ONLY APPROVED quizzes (can be accessed by users)
        const snapshot = await getDocs(quizzesRef);
        
        logger.debug('[QuizSelector] Total approved quizzes found', { count: snapshot.size });
        
        if (snapshot.empty) {
          logger.warn('[QuizSelector] No approved quizzes found in database!');
          setQuizzes([]);
          return;
        }
        
        const quizzesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          };
        });
        
        logger.debug('[QuizSelector] Total quizzes loaded', { count: quizzesData.length });
        
        // Filter quizzes that have questions array with length > 0
        const validQuizzes = quizzesData.filter((quiz: any) => {
          const isValid = Array.isArray(quiz.questions) && quiz.questions.length > 0;
          if (!isValid) {
            logger.debug(`[QuizSelector] Quiz "${quiz.title}" (${quiz.id}) INVALID - no questions`);
          }
          return isValid;
        });
        
        logger.success('[QuizSelector] Valid quizzes for multiplayer', { 
          count: validQuizzes.length 
        });
        
        // Set debug info
        setDebugInfo({
          totalFromDb: quizzesData.length,
          validQuizzes: validQuizzes.length,
          authUser: auth.currentUser?.uid,
          timestamp: new Date().toISOString()
        });
        
        setQuizzes(validQuizzes);
      } catch (error: any) {
        logger.error('[QuizSelector] Error fetching quizzes', {
          name: error.name,
          message: error.message,
          code: error.code
        });
      } finally {
        setLoading(false);
        logger.debug('[QuizSelector] Fetch completed');
      }
    };

    fetchQuizzes();
  }, []);

  const categories = [
    { value: 'all', label: 'Tất cả' },
    { value: 'programming', label: 'Lập trình' },
    { value: 'math', label: 'Toán học' },
    { value: 'science', label: 'Khoa học' },
    { value: 'history', label: 'Lịch sử' },
    { value: 'language', label: 'Ngôn ngữ' },
    { value: 'general', label: 'Tổng hợp' },
  ];

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || quiz.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return difficulty;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  🎮 Chọn Quiz để chơi Multiplayer
                </h1>
                <p className="text-purple-200">
                  Chọn một quiz để tạo phòng hoặc tham gia chơi với bạn bè
                </p>
              </div>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                ← Quay lại
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('placeholders.searchQuizzes')}
                  className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-gray-800">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quiz Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
                <p className="text-white">Đang tải danh sách quiz...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Debug Info Panel */}
              {debugInfo && (
                <div className="bg-yellow-500/20 backdrop-blur-md rounded-lg border border-yellow-500/40 p-4 mb-6">
                  <h3 className="text-white font-bold mb-2">🔍 Debug Information:</h3>
                  <div className="text-sm text-yellow-100 space-y-1">
                    <p>✅ Auth User: {debugInfo.authUser}</p>
                    <p>📊 Total Quizzes in DB: {debugInfo.totalFromDb}</p>
                    <p>✅ Valid Quizzes (with questions): {debugInfo.validQuizzes}</p>
                    <p>⏰ Last Fetch: {new Date(debugInfo.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              )}
              
              {filteredQuizzes.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12 text-center">
                  <BookOpen className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {quizzes.length === 0 ? 'Chưa có quiz nào' : 'Không tìm thấy quiz'}
                  </h3>
                  <p className="text-purple-200 mb-4">
                    {quizzes.length === 0 
                      ? 'Hiện tại chưa có quiz nào được duyệt. Vui lòng quay lại sau hoặc tạo quiz mới!'
                      : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                    }
                  </p>
                  {quizzes.length === 0 && (
                    <button
                      onClick={onBack}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all"
                    >
                      ← Quay lại
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => onSelectQuiz(quiz)}
                  className="group bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden transform hover:scale-105"
                >
                  {/* Quiz Image */}
                  {quiz.imageUrl ? (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={quiz.imageUrl}
                        alt={quiz.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/50" />
                    </div>
                  )}

                  {/* Quiz Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-200 transition-colors">
                      {quiz.title}
                    </h3>
                    
                    {quiz.description && (
                      <p className="text-purple-200 text-sm mb-4 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-purple-200 mb-4">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{quiz.questions?.length || 0} câu</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{quiz.duration || 15} phút</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                        {getDifficultyLabel(quiz.difficulty)}
                      </span>
                      {quiz.category && (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-600">
                          {categories.find(c => c.value === quiz.category)?.label || quiz.category}
                        </span>
                      )}
                      {quiz.quizType && (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-600">
                          {quiz.quizType === 'with-materials' ? '📚 Có tài liệu' : '⚡ Nhanh'}
                        </span>
                      )}
                    </div>

                    {/* Play Button */}
                    <button className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105">
                      🎮 Chọn Quiz này
                    </button>
                  </div>
                </div>
              ))}
                </div>
              )}
            </>
          )}

          {/* Results Count */}
          {!loading && filteredQuizzes.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-purple-200">
                Hiển thị {filteredQuizzes.length} quiz
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizSelector;

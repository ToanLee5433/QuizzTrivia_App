import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Search,
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  Plus,
  ChevronRight,
  Sparkles,
  Flame,
  Target,
  Zap,
  LogIn,
  Lock
} from 'lucide-react';
import { modernMultiplayerService, ModernQuiz } from '../services/modernMultiplayerService';
import ModernCreateRoomModal from './ModernCreateRoomModal';
import ModernQuizPasswordModal from './ModernQuizPasswordModal';
import { useDebounce } from '../utils/useDebounce';

interface ModernQuizSelectorProps {
  onRoomCreated: (roomId: string) => void;
  onJoinRoom?: () => void;
}

const ModernQuizSelector: React.FC<ModernQuizSelectorProps> = ({
  onRoomCreated,
  onJoinRoom
}) => {
  const { t } = useTranslation('multiplayer');
  const [quizzes, setQuizzes] = useState<ModernQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [categories, setCategories] = useState<string[]>(['all']);
  const [difficulties, setDifficulties] = useState<string[]>(['all']);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<ModernQuiz | null>(null);

  // Debounce search term to prevent excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized filtered quizzes to prevent unnecessary recalculations
  const filteredQuizzes = useMemo(() => {
    let filtered = quizzes;

    // Filter by search term
    if (debouncedSearchTerm.trim()) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        quiz.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(quiz => quiz.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(quiz => quiz.difficulty === selectedDifficulty);
    }

    return filtered;
  }, [quizzes, debouncedSearchTerm, selectedCategory, selectedDifficulty]);

  // Memoized callback functions
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleDifficultyChange = useCallback((difficulty: string) => {
    setSelectedDifficulty(difficulty);
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const fetchedQuizzes = await modernMultiplayerService.getAvailableQuizzes();
      setQuizzes(fetchedQuizzes);
      
      // Extract unique categories and difficulties
      const uniqueCategories = ['all', ...new Set(fetchedQuizzes.map(q => q.category))];
      const uniqueDifficulties = ['all', ...new Set(fetchedQuizzes.map(q => q.difficulty))];
      setCategories(uniqueCategories);
      setDifficulties(uniqueDifficulties);
    } catch (error) {
      console.error('❌ Failed to load quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return <Target className="w-4 h-4" />;
      case 'Medium': return <Zap className="w-4 h-4" />;
      case 'Hard': return <Flame className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const handleQuizClick = (quiz: ModernQuiz) => {
    setSelectedQuiz(quiz);
    
    // Check if quiz is password protected
    if (quiz.isPrivate && quiz.password) {
      setShowPasswordModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handlePasswordVerified = () => {
    setShowPasswordModal(false);
    setShowCreateModal(true);
  };

  const handleRoomCreated = (roomId: string) => {
    onRoomCreated(roomId);
    setShowCreateModal(false);
    setSelectedQuiz(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Section with Blue Gradient Background */}
      <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-12 xl:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-center space-y-3 sm:space-y-4 lg:space-y-6 xl:space-y-8"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-white/30"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            <span className="text-white font-semibold text-sm sm:text-base">{t('chooseBattle')}</span>
          </motion.div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            {t('selectQuiz')}
          </h1>
          <p className="text-blue-100 text-base sm:text-lg lg:text-xl max-w-2xl lg:max-w-3xl mx-auto">
            {t('challengeFriends')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 lg:gap-6 pt-4">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center space-x-2 sm:space-x-3 bg-white text-blue-600 px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all border-2 border-white w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              <span className="text-sm sm:text-base">{t('createRoom')}</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </motion.button>
            
            {onJoinRoom && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onJoinRoom}
                className="flex items-center justify-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-md text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all border-2 border-white/30 hover:bg-white/20 w-full sm:w-auto"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                <span className="text-sm sm:text-base">{t('joinRoom')}</span>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Body Section with Light Background */}
      <div className="flex-1 bg-gray-50 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-12">
        <div className="w-full space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search') + ' ' + t('quizzes').toLowerCase() + '...'}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-9 sm:pl-12 pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-300 rounded-lg sm:rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-sm sm:text-base"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-50 border border-gray-300 rounded-lg sm:rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer font-medium text-sm sm:text-base"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-white">
                    {category === 'all' ? t('allCategories') : category}
                  </option>
                ))}
              </select>

              {/* Difficulty Filter */}
              <select
                value={selectedDifficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-50 border border-gray-300 rounded-lg sm:rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer font-medium text-sm sm:text-base"
              >
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty} className="bg-gray-800">
                {difficulty === 'all' ? t('allDifficulties') : difficulty}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Quiz Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            <AnimatePresence>
              {isLoading ? (
                // Loading Skeletons
                Array.from({ length: 6 }).map((_, index) => (
                  <motion.div
                    key={`skeleton-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200"
                  >
                    <div className="animate-pulse space-y-3 sm:space-y-4">
                      <div className="h-24 sm:h-32 bg-gray-200 rounded-lg sm:rounded-xl"></div>
                      <div className="h-5 sm:h-6 bg-gray-200 rounded-lg w-3/4"></div>
                      <div className="h-3 sm:h-4 bg-gray-200 rounded-lg w-1/2"></div>
                      <div className="h-3 sm:h-4 bg-gray-200 rounded-lg w-full"></div>
                    </div>
                  </motion.div>
                ))
              ) : (
            filteredQuizzes.map((quiz, index) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.03, 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                }}
                className="bg-gradient-to-br from-white via-blue-50/30 to-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-200/50 border border-blue-100/50 cursor-pointer group hover:shadow-2xl hover:shadow-blue-300/40 transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-400/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                onClick={() => handleQuizClick(quiz)}
              >
                {/* Quiz Header */}
                <div className="relative z-10 flex items-start justify-between mb-4 sm:mb-5">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent mb-3 group-hover:from-blue-600 group-hover:via-blue-700 group-hover:to-blue-600 transition-all duration-300 line-clamp-2 leading-tight">
                      {quiz.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                      {quiz.description}
                    </p>
                  </div>
                  {quiz.thumbnail && (
                    <div className="relative ml-4 flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl sm:rounded-2xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                      <img
                        src={quiz.thumbnail}
                        alt={quiz.title}
                        className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                      />
                    </div>
                  )}
                </div>

                {/* Quiz Stats */}
                <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-5 p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50">
                  <div className="flex items-center justify-between w-full sm:justify-start sm:space-x-3 sm:space-x-4 md:space-x-6">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                      <div className="p-1 sm:p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-300">
                        <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold">{quiz.questionCount} {t('questions')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                      <div className="p-1 sm:p-1.5 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors duration-300">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold">{quiz.timeLimit}s</span>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                      <div className="p-1 sm:p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors duration-300">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold">2-8 {t('players')}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-1 sm:gap-2">
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-300">
                      {quiz.category}
                    </span>
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold shadow-lg transition-all duration-300 ${getDifficultyColor(quiz.difficulty)}`}>
                      {getDifficultyIcon(quiz.difficulty)}
                      <span className="ml-1">{quiz.difficulty}</span>
                    </span>
                    {quiz.isPrivate && (
                      <span className="inline-flex items-center px-2 py-1 sm:py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25 group-hover:shadow-xl group-hover:shadow-red-500/40 transition-all duration-300">
                        <Lock className="w-3 h-3 mr-1" />
                        {t('privateRoom')}
                      </span>
                    )}
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 rounded-lg sm:rounded-xl shadow-lg shadow-blue-600/30 group-hover:shadow-xl group-hover:shadow-blue-600/50 transition-all duration-300 flex-shrink-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg sm:rounded-xl blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <Play className="relative w-3 h-3 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform duration-300" />
                  </motion.div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

          {/* No Results */}
          <AnimatePresence>
            {!isLoading && filteredQuizzes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center py-12 sm:py-16"
              >
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                  {t('noQuizzesFound')}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
                  {t('tryDifferentFilters')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <ModernCreateRoomModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedQuiz(null);
            }}
            selectedQuiz={selectedQuiz}
            onRoomCreated={handleRoomCreated}
          />
        )}
      </AnimatePresence>

      {/* Password Modal */}
      <ModernQuizPasswordModal
        isOpen={showPasswordModal}
        quizTitle={selectedQuiz?.title || ''}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedQuiz(null);
        }}
        onPasswordVerified={handlePasswordVerified}
      />
    </div>
  );
};

export default ModernQuizSelector;

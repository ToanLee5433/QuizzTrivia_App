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
  onRoomCreated: (roomId: string, roomCode?: string) => void;
  onJoinRoom?: () => void;
  createRoomButtonRef?: React.RefObject<HTMLButtonElement>;
  joinRoomButtonRef?: React.RefObject<HTMLButtonElement>;
}

const ModernQuizSelector: React.FC<ModernQuizSelectorProps> = ({
  onRoomCreated,
  onJoinRoom,
  createRoomButtonRef,
  joinRoomButtonRef
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
      // ✅ Only load metadata, not questions (saves reads)
      const fetchedQuizzes = await modernMultiplayerService.getAvailableQuizzesMetadata();
      setQuizzes(fetchedQuizzes);
      
      // Extract unique categories and difficulties
      const uniqueCategories = ['all', ...new Set(fetchedQuizzes.map((q: any) => q.category))];
      const uniqueDifficulties = ['all', ...new Set(fetchedQuizzes.map((q: any) => q.difficulty))];
      setCategories(uniqueCategories as string[]);
      setDifficulties(uniqueDifficulties as string[]);
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

  const handleRoomCreated = (roomId: string, roomCode?: string) => {
    onRoomCreated(roomId, roomCode);
    setShowCreateModal(false);
    setSelectedQuiz(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Section with Blue Gradient Background */}
      <header 
        className="bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-12 xl:py-16"
        role="banner"
      >
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
            role="status"
            aria-live="polite"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" aria-hidden="true" />
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
              ref={createRoomButtonRef}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center space-x-2 sm:space-x-3 bg-white text-blue-700 px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all border-2 border-blue-100 w-full sm:w-auto hover:bg-blue-50"
              aria-label={t('createRoom')}
              tabIndex={0}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-700" />
              <span className="text-sm sm:text-base">{t('createRoom')}</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-700" />
            </motion.button>
            
            {onJoinRoom && (
              <motion.button
                ref={joinRoomButtonRef}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onJoinRoom}
                className="flex items-center justify-center space-x-2 sm:space-x-3 bg-blue-600 text-white px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all border-2 border-blue-500 hover:bg-blue-700 w-full sm:w-auto"
                aria-label={t('joinRoom')}
                tabIndex={0}
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                <span className="text-sm sm:text-base">{t('joinRoom')}</span>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </motion.button>
            )}
          </div>
        </motion.div>
      </header>

      {/* Body Section with Light Background */}
      <main className="flex-1 bg-gray-50 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-12">
        <div className="w-full space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Search and Filters */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200"
            aria-labelledby="search-filters-heading"
          >
            <h2 id="search-filters-heading" className="sr-only">Search and filter quizzes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('search') + ' ' + t('quizzes').toLowerCase() + '...'}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Search quizzes"
                  aria-describedby="search-description"
                />
                <span id="search-description" className="sr-only">
                  Type to search for quizzes by title or description
                </span>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-white border-2 border-gray-400 rounded-lg sm:rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 appearance-none cursor-pointer font-medium text-sm sm:text-base hover:border-gray-500"
                aria-label="Filter by category"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-white text-gray-900">
                    {category === 'all' ? t('allCategories') : category}
                  </option>
                ))}
              </select>

              {/* Difficulty Filter */}
              <select
                value={selectedDifficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-white border-2 border-gray-400 rounded-lg sm:rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 appearance-none cursor-pointer font-medium text-sm sm:text-base hover:border-gray-500"
                aria-label="Filter by difficulty"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty} className="bg-white text-gray-900">
                    {difficulty === 'all' ? t('allDifficulties') : t(difficulty)}
                  </option>
                ))}
              </select>
            </div>
          </motion.section>

      {/* Quiz Grid */}
          <section 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6"
            aria-labelledby="quiz-list-heading"
          >
            <h2 id="quiz-list-heading" className="sr-only">Available quizzes</h2>
            <AnimatePresence>
              {isLoading ? (
                // Enhanced Loading Skeletons
                Array.from({ length: 6 }).map((_, index) => (
                  <motion.div
                    key={`skeleton-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-gradient-to-br from-white via-blue-50/30 to-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-200/50 border border-blue-100/50"
                    role="status"
                    aria-label="Loading quiz"
                  >
                    <div className="space-y-3 sm:space-y-4">
                      {/* Quiz thumbnail skeleton */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Title skeleton */}
                          <div className="h-6 sm:h-7 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-3 animate-pulse"></div>
                          {/* Description skeleton */}
                          <div className="space-y-2">
                            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full animate-pulse"></div>
                            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-4/5 animate-pulse"></div>
                            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/5 animate-pulse"></div>
                          </div>
                        </div>
                        {/* Image skeleton */}
                        <div className="ml-4 w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl sm:rounded-2xl animate-pulse flex-shrink-0"></div>
                      </div>
                      
                      {/* Stats skeleton */}
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl sm:rounded-2xl border border-blue-200/70">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg animate-pulse"></div>
                            <div className="h-3 w-12 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-green-200 to-green-300 rounded-lg animate-pulse"></div>
                            <div className="h-3 w-8 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-purple-200 to-purple-300 rounded-lg animate-pulse"></div>
                            <div className="h-3 w-16 bg-gradient-to-r from-gray-300 to-gray-400 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tags skeleton */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="h-6 w-20 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-pulse"></div>
                          <div className="h-6 w-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                filteredQuizzes.map((quiz, index) => (
                  <motion.article
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
                    role="button"
                    tabIndex={0}
                    aria-label={`Select quiz: ${quiz.title}. ${quiz.description}. Difficulty: ${quiz.difficulty}. Questions: ${quiz.questionCount}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleQuizClick(quiz);
                      }
                    }}
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
                <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-5 p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl sm:rounded-2xl border border-blue-200/70">
                  <div className="flex items-center justify-between w-full sm:justify-start sm:space-x-3 sm:space-x-4 md:space-x-6">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                      <div className="p-1 sm:p-1.5 bg-blue-200 rounded-lg group-hover:bg-blue-300 transition-colors duration-300">
                        <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-800" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold">{quiz.questionCount} {t('questions')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-800 group-hover:text-green-700 transition-colors duration-300">
                      <div className="p-1 sm:p-1.5 bg-green-200 rounded-lg group-hover:bg-green-300 transition-colors duration-300">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-800" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold">{quiz.timeLimit}s</span>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-gray-800 group-hover:text-purple-700 transition-colors duration-300">
                      <div className="p-1 sm:p-1.5 bg-purple-200 rounded-lg group-hover:bg-purple-300 transition-colors duration-300">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-purple-800" />
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
              </motion.article>
                ))
              )}
            </AnimatePresence>
          </section>

          {/* Enhanced Empty State */}
          <AnimatePresence>
            {!isLoading && filteredQuizzes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="text-center py-16 sm:py-24"
                role="status"
                aria-live="polite"
              >
                <div className="max-w-md mx-auto space-y-6">
                  {/* Empty state icon with animation */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="relative"
                  >
                    <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-blue-100 shadow-lg">
                      <motion.div
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                      >
                        <Search className="w-10 h-10 sm:w-14 sm:h-14 text-blue-400" />
                      </motion.div>
                    </div>
                    {/* Floating elements */}
                    <motion.div
                      animate={{ 
                        y: [0, -10, 0],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-blue-200 rounded-full"
                    />
                    <motion.div
                      animate={{ 
                        y: [0, 10, 0],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: 1
                      }}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-cyan-200 rounded-full"
                    />
                  </motion.div>

                  {/* Empty state content */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="space-y-4"
                  >
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {t('noQuizzesFound')}
                    </h3>
                    <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
                      {t('tryDifferentFilters')}
                    </p>
                    
                    {/* Action suggestions */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                      <p className="text-sm text-gray-700 font-medium mb-3">Try these suggestions:</p>
                      <ul className="text-sm text-gray-600 space-y-2 text-left">
                        <li className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <span>Clear all filters to see all available quizzes</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <span>Try different search terms or categories</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <span>Check your spelling or use broader terms</span>
                        </li>
                      </ul>
                    </div>

                    {/* Clear filters button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setSelectedDifficulty('all');
                      }}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <span>Clear All Filters</span>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <ModernCreateRoomModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedQuiz(null);
            }}
            quizzes={quizzes}
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

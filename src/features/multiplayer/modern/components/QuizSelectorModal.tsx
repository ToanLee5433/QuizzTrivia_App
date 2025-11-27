import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X,
  Search,
  BookOpen,
  Clock,
  Loader2,
  CheckCircle,
  Users,
  Trophy,
  Filter
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../firebase/config';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionCount?: number;
  questions?: any[];
  timeLimit?: number;
  thumbnail?: string;
  createdBy?: string;
  playCount?: number;
}

interface QuizSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuiz: (quiz: Quiz) => void;
  currentQuizId?: string;
}

const QuizSelectorModal: React.FC<QuizSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectQuiz,
  currentQuizId
}) => {
  const { t } = useTranslation('multiplayer');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Helper function to strip HTML tags from text
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  };

  // Fetch quizzes
  useEffect(() => {
    if (!isOpen) return;

    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const quizzesRef = query(
          collection(db, 'quizzes'),
          where('status', '==', 'approved')
        );

        const snapshot = await getDocs(quizzesRef);
        const quizzesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Quiz',
            description: data.description,
            category: data.category,
            difficulty: data.difficulty,
            questionCount: data.questions?.length || data.questionCount || 0,
            questions: data.questions,
            timeLimit: data.timeLimit || 30,
            thumbnail: data.thumbnail,
            createdBy: data.createdBy,
            playCount: data.playCount || 0
          } as Quiz;
        });

        // Filter quizzes with questions
        const validQuizzes = quizzesData.filter(
          quiz => (quiz.questionCount || 0) > 0 || (quiz.questions && quiz.questions.length > 0)
        );

        setQuizzes(validQuizzes);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [isOpen]);

  // Filter quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const matchesSearch = 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || quiz.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || quiz.difficulty === selectedDifficulty;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [quizzes, searchTerm, selectedCategory, selectedDifficulty]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(quizzes.map(q => q.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [quizzes]);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return t('easy');
      case 'medium': return t('medium');
      case 'hard': return t('hard');
      default: return t('medium');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">{t('changeQuiz')}</h2>
                <p className="text-purple-100 text-sm">{t('selectQuizForGame', 'Chọn quiz cho trò chơi')}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Search & Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('searchQuiz', 'Tìm kiếm quiz...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Difficulty Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">{t('allDifficulties')}</option>
                  <option value="easy">{t('easy')}</option>
                  <option value="medium">{t('medium')}</option>
                  <option value="hard">{t('hard')}</option>
                </select>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">{t('allCategories')}</option>
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quiz List */}
          <div className="overflow-y-auto max-h-[calc(85vh-220px)] p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                <p className="text-gray-500">{t('loading')}</p>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500">{t('noQuizzesFound')}</p>
                <p className="text-gray-400 text-sm">{t('adjustFilters')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuizzes.map((quiz) => (
                  <motion.div
                    key={quiz.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectQuiz(quiz)}
                    className={`relative p-4 bg-white border-2 rounded-xl cursor-pointer transition-all ${
                      currentQuizId === quiz.id
                        ? 'border-purple-500 bg-purple-50 shadow-lg'
                        : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    {/* Current Quiz Badge */}
                    {currentQuizId === quiz.id && (
                      <div className="absolute -top-2 -right-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{t('current', 'Hiện tại')}</span>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                        {quiz.thumbnail ? (
                          <img src={quiz.thumbnail} alt={quiz.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <BookOpen className="w-8 h-8 text-purple-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{quiz.title}</h3>
                        {quiz.description && (
                          <p className="text-gray-500 text-sm line-clamp-2 mt-1">{stripHtmlTags(quiz.description)}</p>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                            {getDifficultyLabel(quiz.difficulty)}
                          </span>
                          <span className="flex items-center text-gray-500 text-xs">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {quiz.questionCount || quiz.questions?.length || 0} {t('questions')}
                          </span>
                          <span className="flex items-center text-gray-500 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {quiz.timeLimit || 30}{t('seconds', 's')}
                          </span>
                          {(quiz.playCount || 0) > 0 && (
                            <span className="flex items-center text-gray-500 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {quiz.playCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-center text-gray-500 text-sm">
              {t('quizCount', '{{count}} quiz khả dụng', { count: filteredQuizzes.length })}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuizSelectorModal;

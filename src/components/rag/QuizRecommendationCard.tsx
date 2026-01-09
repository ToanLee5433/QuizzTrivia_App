/**
 * 🎯 Quiz Recommendation Card Component
 * 
 * Beautiful card showing quiz recommendations with image, stats, and direct link
 * v4.2: Added viewCount and averageScore display
 */

import { motion } from 'framer-motion';
import { Star, Users, ArrowRight, BookOpen, Lock, Eye, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { QuizRecommendation } from '../../lib/genkit/types';

interface QuizRecommendationCardProps {
  quiz: QuizRecommendation;
  index: number;
  onNavigate?: () => void;
  compact?: boolean;
}

export function QuizRecommendationCard({ quiz, index, onNavigate, compact = false }: QuizRecommendationCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '😊 Dễ';
      case 'medium':
        return '🤔 Trung bình';
      case 'hard':
        return '🔥 Khó';
      default:
        return '📝 Quiz';
    }
  };

  // Strip HTML tags from description (fallback if backend didn't clean)
  const cleanDescription = (text?: string) => {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
  };

  const handleClick = () => {
    onNavigate?.();
    navigate(`/quiz/${quiz.quizId}/preview`);
  };

  const description = cleanDescription(quiz.description);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer shadow-md hover:shadow-2xl hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300"
      onClick={handleClick}
    >
      <div className={`flex gap-3 ${compact ? 'p-2.5' : 'p-4'}`}>
        {/* Quiz Image/Icon */}
        <div className={`flex-shrink-0 ${compact ? 'w-14 h-14' : 'w-24 h-24'} rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 shadow-lg`}>
          {quiz.imageUrl ? (
            <img
              src={quiz.imageUrl}
              alt={quiz.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to gradient background if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500">
              <BookOpen className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} text-white drop-shadow-lg`} />
            </div>
          )}
        </div>

        {/* Quiz Info */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-xs line-clamp-1' : 'text-base line-clamp-2'} mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors`}>
            {quiz.title}
          </h4>

          {/* Description - cleaned (hide in compact mode) */}
          {!compact && description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {description}
            </p>
          )}

          {/* Stats Row - Always show difficulty */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Difficulty - Always visible */}
            <span className={`px-1.5 py-0.5 rounded-full border ${compact ? 'text-[10px]' : 'text-xs'} font-semibold ${getDifficultyColor(quiz.difficulty)}`}>
              {compact ? quiz.difficulty?.charAt(0).toUpperCase() : getDifficultyLabel(quiz.difficulty)}
            </span>

            {/* Password Protected Badge */}
            {quiz.hasPassword && (
              <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 ${compact ? 'text-[10px]' : 'text-xs'} font-semibold`}>
                <Lock className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                {!compact && 'Có mật khẩu'}
              </span>
            )}

            {/* Question Count - Show if > 0 */}
            {quiz.questionCount && quiz.questionCount > 0 && (
              <span className={`flex items-center gap-0.5 ${compact ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400`}>
                <BookOpen className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                {quiz.questionCount}{compact ? '' : ' câu'}
              </span>
            )}
          </div>

          {/* Stats Grid - View, Attempts, Score, Rating (hide in compact) */}
          {!compact && (
            <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {/* View Count - Lượt xem */}
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" title="Lượt xem">
              <Eye className="w-3 h-3" />
              <span>{quiz.viewCount || 0}</span>
            </span>

            {/* Total Attempts - Lượt làm */}
            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400" title={t('rag.totalAttempts')}>
              <Users className="w-3 h-3" />
              <span>{quiz.totalAttempts || 0}</span>
            </span>

            {/* Average Score - Điểm TB */}
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title={t('rag.averageScore')}>
              <Trophy className="w-3 h-3" />
              <span>{quiz.averageScore ? `${Math.round(quiz.averageScore)}%` : '-'}</span>
            </span>

            {/* Average Rating - Đánh giá */}
            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400" title={t('rag.averageRating')}>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{quiz.averageRating && quiz.averageRating > 0 ? quiz.averageRating.toFixed(1) : '-'}</span>
            </span>
          </div>
          )}
        </div>

        {/* Arrow Icon */}
        <div className="flex-shrink-0 flex items-center">
          <motion.div
            whileHover={{ x: 5 }}
            className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
          >
            <ArrowRight className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-white`} />
          </motion.div>
        </div>
      </div>

      {/* Bottom Badge (hide in compact) */}
      {!compact && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-t-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-800 dark:text-purple-200 font-semibold flex items-center gap-1">
              📂 {quiz.category}
            </span>
            <span className="text-blue-800 dark:text-blue-200 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              {t('chatbot.quizRecommendation.startQuiz')}
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

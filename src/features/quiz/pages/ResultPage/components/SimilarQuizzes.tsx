import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { QuizRecommendationCard } from '../../../../../components/rag/QuizRecommendationCard';
import { useTranslation } from 'react-i18next';
import type { QuizRecommendation } from '../../../../../lib/genkit/types';

interface SimilarQuizzesProps {
  quizzes: QuizRecommendation[];
  isLoading: boolean;
}

export const SimilarQuizzes: React.FC<SimilarQuizzesProps> = ({ quizzes, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <div className="text-gray-600 dark:text-gray-400">
            {t('result.finding_similar_quizzes', 'Finding similar quizzes...')}
          </div>
        </div>
      </div>
    );
  }

  if (!quizzes || quizzes.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('result.similar_quizzes', 'Similar Quizzes')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('result.similar_quizzes_subtitle', 'Continue practicing with these quizzes')}
          </p>
        </div>
      </div>

      {/* Quiz Cards Grid */}
      <div className="grid gap-4">
        {quizzes.map((quiz: QuizRecommendation, index: number) => (
          <QuizRecommendationCard
            key={quiz.quizId}
            quiz={quiz}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
};

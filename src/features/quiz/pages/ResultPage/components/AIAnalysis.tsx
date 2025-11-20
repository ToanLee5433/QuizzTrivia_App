import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Target, Lightbulb, BookOpen, ChevronRight } from 'lucide-react';
import { QuizAnalysis } from '../../../../../services/quizAnalysisService';
import { useTranslation } from 'react-i18next';

interface AIAnalysisProps {
  analysis: QuizAnalysis | null;
  isLoading: boolean;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ analysis, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl shadow-lg p-8 mb-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
            🤖 {t('result.ai_analyzing', 'AI đang phân tích kết quả của bạn...')}
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const levelConfig = {
    excellent: {
      icon: '🏆',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-300 dark:border-yellow-700'
    },
    good: {
      icon: '🌟',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-300 dark:border-green-700'
    },
    average: {
      icon: '📚',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-300 dark:border-blue-700'
    },
    'needs-improvement': {
      icon: '💪',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-300 dark:border-orange-700'
    }
  };

  const config = levelConfig[analysis.performanceLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl shadow-lg p-8 mb-8 border-2 border-purple-200 dark:border-purple-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('result.ai_analysis', 'Phân tích AI')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('result.ai_provided_by', 'Được cung cấp bởi Gemini AI')}
            </p>
          </div>
        </div>
        
        <div className={`px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 ${config.bgColor} ${config.borderColor} border-2`}>
          <span className="text-2xl">{config.icon}</span>
          <span className={config.color}>
            {analysis.performanceLevel === 'excellent' && t('result.performance_excellent', 'Xuất sắc')}
            {analysis.performanceLevel === 'good' && t('result.performance_good', 'Tốt')}
            {analysis.performanceLevel === 'average' && t('result.performance_average', 'Khá')}
            {analysis.performanceLevel === 'needs-improvement' && t('result.performance_needs_improvement', 'Cần cải thiện')}
          </span>
        </div>
      </div>

      {/* Overall Feedback */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
          {analysis.overallFeedback}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        {analysis.strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('result.strengths', 'Điểm mạnh')}
              </h3>
            </div>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{strength}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Weaknesses */}
        {analysis.weaknesses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-200 dark:border-orange-800"
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('result.areas_to_improve', 'Điểm cần cải thiện')}
              </h3>
            </div>
            <ul className="space-y-2">
              {analysis.weaknesses.map((weakness, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <span className="text-orange-500 mt-1">→</span>
                  <span>{weakness}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Study Tips */}
      {analysis.studyTips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-6 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('result.study_tips', 'Lời khuyên học tập')}
            </h3>
          </div>
          <ul className="space-y-3">
            {analysis.studyTips.map((tip, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
              >
                <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300 flex-1">{tip}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Focus Areas */}
        {analysis.focusAreas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('result.focus_areas', 'Khu vực tập trung')}
              </h3>
            </div>
            <ul className="space-y-2">
              {analysis.focusAreas.map((area, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 p-2 bg-purple-50 dark:bg-purple-900/20 rounded"
                >
                  <ChevronRight className="w-4 h-4 text-purple-500" />
                  <span>{area}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Next Steps */}
        {analysis.nextSteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-indigo-200 dark:border-indigo-800"
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('result.next_steps', 'Bước tiếp theo')}
              </h3>
            </div>
            <ul className="space-y-2">
              {analysis.nextSteps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-start space-x-3 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors cursor-default"
                >
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {index + 1}.
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 flex-1">{step}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-purple-200 dark:border-purple-800 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          💡 {t('result.ai_disclaimer', 'Phân tích này được tạo bởi AI và mang tính chất tham khảo')}
        </p>
      </div>
    </motion.div>
  );
};

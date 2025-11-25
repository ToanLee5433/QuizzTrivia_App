import React from 'react';
import { useTranslation } from 'react-i18next';
import { Quiz } from '../types';
import SafeHTML from '../../../shared/components/ui/SafeHTML';

interface QuizPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Partial<Quiz>;
  onProceedToPublish: () => void;
}

export const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onProceedToPublish
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const questionCount = quiz.questions?.length || 0;
  const hasResources = (quiz as any).resources && (quiz as any).resources.length > 0;
  const estimatedTime = questionCount * 1.5; // 1.5 phút/câu

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <h2 className="text-2xl font-bold flex items-center gap-2">
                👁️ {t('quiz.preview.title') || 'Preview Quiz'}
              </h2>
              <p className="text-indigo-100 mt-1">
                {t('quiz.preview.subtitle') || 'Review before publishing'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              {t('quiz.previewPage.closeButton')}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Quiz Header */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {quiz.title || t('quiz.untitled')}
            </h3>
            {quiz.description ? (
              <SafeHTML content={quiz.description} className="text-gray-600 leading-relaxed" />
            ) : (
              <p className="text-gray-600 leading-relaxed">{t('quiz.noDescription')}</p>
            )}
          </div>

          {/* Quiz Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">{t('quiz.questions') || 'Questions'}</p>
              <p className="text-2xl font-bold text-blue-900">{questionCount}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 mb-1">{t('buildOverview.difficulty') || 'Difficulty'}</p>
              <p className="text-lg font-bold text-purple-900">
                {quiz.difficulty === 'easy' ? `🟢 ${t('quiz.difficulty.easy')}` :
                 quiz.difficulty === 'medium' ? `🟡 ${t('quiz.difficulty.medium')}` :
                 quiz.difficulty === 'hard' ? `🔴 ${t('quiz.difficulty.hard')}` : '❓'}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 mb-1">{t('quiz.timeLimit') || 'Time Limit'}</p>
              <p className="text-lg font-bold text-green-900">
                {(quiz as any).timeLimit ? `${(quiz as any).timeLimit} min` : '∞ Unlimited'}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-600 mb-1">{t('quiz.estimatedTime') || 'Est. Time'}</p>
              <p className="text-lg font-bold text-orange-900">~{estimatedTime} {t('quiz.previewPage.estimatedTimeUnit')}</p>
            </div>
          </div>

          {/* Quiz Settings */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <h4 className="font-semibold text-gray-900 mb-3">
              ⚙️ {t('quiz.settings') || 'Settings'}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={(quiz as any).visibility === 'public' ? 'text-green-600' : 'text-orange-600'}>
                  {(quiz as any).visibility === 'public' ? '🌐 Public' : '🔒 Password Protected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700">
                  {quiz.category || t('quiz.noCategory')}
                </span>
              </div>
              {hasResources && (
                <div className="flex items-center gap-2 text-blue-600">
                  📚 {t('quiz.hasResources') || 'Has Learning Materials'}
                </div>
              )}
              {(quiz as any).showResults && (
                <div className="flex items-center gap-2 text-green-600">
                  ✅ {t('quiz.showResults') || 'Show Results'}
                </div>
              )}
            </div>
          </div>

          {/* Questions Preview */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              📝 {t('quiz.questionsPreview') || 'Questions Preview'}
              <span className="text-sm font-normal text-gray-500">
                ({questionCount} {t('quiz.total') || 'total'})
              </span>
            </h4>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {quiz.questions && quiz.questions.length > 0 ? (
                quiz.questions.slice(0, 5).map((q: any, index: number) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-2">{q.question}</p>
                        <div className="space-y-1">
                          {q.options.map((opt: string, optIndex: number) => (
                            <div
                              key={optIndex}
                              className={`text-sm px-3 py-1.5 rounded ${
                                optIndex === q.correctAnswer
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              {opt}
                              {optIndex === q.correctAnswer && ' ✓'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('quiz.noQuestions') || 'No questions added yet'}
                </div>
              )}

              {questionCount > 5 && (
                <p className="text-center text-sm text-gray-500 py-2">
                  ... {t('quiz.andMore', { count: questionCount - 5 }) || `and ${questionCount - 5} more questions`}
                </p>
              )}
            </div>
          </div>

          {/* Validation Warnings */}
          {questionCount < 3 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <p className="text-yellow-800 flex items-center gap-2">
                ⚠️ <span className="font-medium">
                  {t('quiz.validation.minQuestions') || 'Recommended: At least 3 questions for a good quiz'}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← {t('common.back') || 'Back to Edit'}
          </button>
          <button
            onClick={onProceedToPublish}
            disabled={questionCount === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {t('quiz.preview.proceedPublish') || 'Proceed to Publish'} →
          </button>
        </div>
      </div>
    </div>
  );
};

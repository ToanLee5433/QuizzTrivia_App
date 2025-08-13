import React from 'react';
import { Quiz, Question } from '../../quiz/types';
import RichTextViewer from '../../../shared/components/ui/RichTextViewer';
import { useTranslation } from 'react-i18next';

interface QuizPreviewProps {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
}

// Modal component với khả năng cuộn tốt hơn
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
};

const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, isOpen, onClose }) => {
  const { t } = useTranslation();
  // Guard clause to prevent null quiz errors
  if (!quiz) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header - Sticky */}
      <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-200 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
            <RichTextViewer content={quiz.description || ''} className="text-gray-600 mt-2" />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quiz Info - Sticky */}
      <div className="sticky top-[120px] bg-gray-50 p-6 border-b border-gray-200 z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{quiz.questions.length}</div>
            <div className="text-sm text-gray-600">{t('quiz.questions')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{quiz.duration}</div>
            <div className="text-sm text-gray-600">{t('minutes')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{quiz.difficulty}</div>
            <div className="text-sm text-gray-600">{t('quiz.difficulty')}</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              quiz.status === 'approved' ? 'text-green-600' : 
              quiz.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {quiz.status === 'approved' ? t('status.approved') : 
               quiz.status === 'rejected' ? t('status.rejected') : t('status.pending')}
            </div>
            <div className="text-sm text-gray-600">{t('status.label')}</div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-6 text-gray-900">{t('admin.preview.questionList')}</h3>
        
        <div className="space-y-6">
          {quiz.questions.map((question: Question, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-semibold text-gray-900 text-lg">
                  {t('quiz.question')} {index + 1}: {question.text}
                </h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  question.type === 'multiple' ? 'bg-blue-100 text-blue-800' :
                  question.type === 'checkbox' ? 'bg-green-100 text-green-800' :
                  question.type === 'boolean' ? 'bg-purple-100 text-purple-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {question.type === 'multiple' ? t('quiz.questionTypes.multiple') :
                   question.type === 'checkbox' ? t('quiz.questionTypes.checkbox') :
                   question.type === 'boolean' ? t('quiz.questionTypes.boolean') :
                   question.type === 'short_answer' ? t('quiz.questionTypes.short_answer') :
                   t('quiz.questionTypes.image')}
                </span>
              </div>

              {/* Answers */}
              <div className="space-y-3">
                {question.type === 'short_answer' ? (
                    <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                    <div className="flex items-center">
                        <span className="font-medium text-green-800">{t('quiz.correctAnswer')}: </span>
                      <span className="ml-2 text-green-700 font-semibold">{question.correctAnswer}</span>
                      <span className="ml-2 text-green-600 text-xl">✓</span>
                    </div>
                  </div>
                ) : (
                  question.answers?.map((answer: any, answerIndex: number) => (
                    <div
                      key={answerIndex}
                      className={`p-4 rounded-lg border-2 ${
                        answer.isCorrect
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {String.fromCharCode(65 + answerIndex)}. {answer.text}
                        </span>
                        {answer.isCorrect && (
                          <span className="text-green-600 text-xl">✓</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Question Details */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    <span className="font-medium">{t('common.points')}: </span>
                    <span className="text-blue-600 font-semibold">{question.points}</span>
                  </span>
                  {question.explanation && (
                    <span className="text-gray-600">
                      <span className="font-medium">{t('quiz.explanation')}: </span>
                      <span className="text-gray-700">{question.explanation}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 pb-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {t('quiz.questions')}: <span className="font-semibold">{quiz.questions.length}</span> - 
              <span className="font-semibold ml-1">{t('quiz.points', {points: quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0),
                defaultValue: `Points: ${quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0)}`})}</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QuizPreview;

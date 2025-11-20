import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Quiz } from '../../../types';
import { ResultState } from '../types';
import Button from '../../../../../shared/components/ui/Button';
import SafeHTML from '../../../../../shared/components/ui/SafeHTML';


interface AnswerReviewProps {
  quiz: Quiz;
  result: ResultState;
}

export const AnswerReview: React.FC<AnswerReviewProps> = ({ quiz, result }) => {
  const { t } = useTranslation();
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('result.review_answers', 'Review Answers')}</h2>
        <Button
          variant="outline"
          onClick={() => setShowAnswers(!showAnswers)}
        >
          {showAnswers ? t('result.hide', 'Hide') : t('result.show', 'Show')} {t('result.detailed_review', 'Detailed Review')}
        </Button>
      </div>

      {showAnswers && (
        <div className="space-y-6">
          {quiz.questions.map((question, index) => {
            const userAnswerValue = result.answers[question.id];
            
            // Logic để xác định đáp án đúng sai dựa trên loại câu hỏi
            let isCorrect = false;
            let userAnswerText = '';
            
            switch (question.type) {
              case 'boolean':
              case 'multiple':
              case 'image': {
                const userAnswer = question.answers.find(a => a.id === userAnswerValue);
                isCorrect = userAnswer?.isCorrect || false;
                userAnswerText = userAnswer?.text || t('result.not_answered', 'Chưa trả lời');
                break;
              }
              case 'short_answer': {
                // Import checkShortAnswer function hoặc tính toán tại đây
                const normalizeAnswer = (answer: string) => 
                  answer.trim().toLowerCase().replace(/\s+/g, ' ');
                
                const normalizedUserAnswer = normalizeAnswer(userAnswerValue || '');
                
                if (question.correctAnswer && normalizeAnswer(question.correctAnswer) === normalizedUserAnswer) {
                  isCorrect = true;
                } else if (question.acceptedAnswers) {
                  isCorrect = question.acceptedAnswers.some(accepted => 
                    normalizeAnswer(accepted) === normalizedUserAnswer
                  );
                }
                userAnswerText = userAnswerValue || t('result.not_answered', 'Chưa trả lời');
                break;
              }
              case 'checkbox': {
                const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id).sort();
                const userIds = Array.isArray(userAnswerValue) ? [...userAnswerValue].sort() : [];
                isCorrect = JSON.stringify(correctIds) === JSON.stringify(userIds);
                const selectedAnswers = question.answers.filter(a => userIds.includes(a.id));
                userAnswerText = selectedAnswers.length > 0 
                  ? selectedAnswers.map(a => a.text).join(', ')
                  : t('result.not_answered', 'Chưa trả lời');
                break;
              }
            }

            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {index + 1}. {question.text}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isCorrect ? `✓ ${t('result.correct_label', 'Correct')}` : `✗ ${t('result.incorrect', 'Incorrect')}`}
                  </span>
                </div>

                {/* Hiển thị câu trả lời của user */}
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="font-medium text-blue-800">{t('result.your_answer', 'Câu trả lời của bạn')}: </span>
                  <span className="text-blue-700">{userAnswerText}</span>
                </div>
                
                {/* Hiển thị đáp án cho multiple choice, image và boolean */}
                {(question.type === 'multiple' || question.type === 'image' || question.type === 'boolean') && (
                  <div className="space-y-2">
                    {question.answers.map(answer => (
                      <div
                        key={answer.id}
                        className={`p-3 rounded-lg border ${
                          answer.isCorrect 
                            ? 'border-green-300 bg-green-50' 
                            : answer.id === userAnswerValue 
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="font-medium mr-3">
                            {String.fromCharCode(65 + question.answers.indexOf(answer))}.
                          </span>
                          <span>{answer.text}</span>
                          {answer.isCorrect && (
                            <span className="ml-auto text-green-600 font-medium">
                              ✓ {t('result.correct_answer', 'Correct Answer')}
                            </span>
                          )}
                          {answer.id === userAnswerValue && !answer.isCorrect && (
                            <span className="ml-auto text-red-600 font-medium">
                              {t('result.your_answer_label', 'Your Answer')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Hiển thị đáp án cho checkbox */}
                {question.type === 'checkbox' && (
                  <div className="space-y-2">
                    {question.answers.map(answer => {
                      const userSelectedIds: string[] = Array.isArray(userAnswerValue) ? userAnswerValue : [];
                      const isUserSelected = userSelectedIds.includes(answer.id);
                      
                      return (
                        <div
                          key={answer.id}
                          className={`p-3 rounded-lg border ${
                            answer.isCorrect 
                              ? 'border-green-300 bg-green-50' 
                              : isUserSelected 
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium mr-3">
                              {String.fromCharCode(65 + question.answers.indexOf(answer))}.
                            </span>
                            <span>{answer.text}</span>
                            {answer.isCorrect && (
                              <span className="ml-auto text-green-600 font-medium">
                                ✓ {t('result.should_select', 'Should Select')}
                              </span>
                            )}
                            {isUserSelected && !answer.isCorrect && (
                              <span className="ml-auto text-red-600 font-medium">
                                {t('result.wrong_selection', 'Wrong Selection')}
                              </span>
                            )}
                            {isUserSelected && answer.isCorrect && (
                              <span className="ml-auto text-green-600 font-medium">
                                ✓ {t('result.correct_selection', 'Correct Selection')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hiển thị đáp án cho short answer */}
                {question.type === 'short_answer' && (
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="font-medium text-green-800">{t('result.correct_answer_short', 'Đáp án đúng')}: </span>
                      <span className="text-green-700">
                        {question.correctAnswer}
                        {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
                          <span className="text-sm"> ({t('result.or_accepted', 'hoặc')}: {question.acceptedAnswers.join(', ')})</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                
                {question.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-medium text-blue-800">{t('result.explanation', 'Explanation')}: </span>
                    <SafeHTML content={question.explanation} className="text-blue-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

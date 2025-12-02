import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Quiz } from '../../../types';
import { ResultState } from '../types';
import Button from '../../../../../shared/components/ui/Button';
import SafeHTML from '../../../../../shared/components/ui/SafeHTML';
import { VideoPlayer } from '../../../../../shared/components/ui/VideoPlayer';
import { TrimmedAudio } from '../../../../../shared/components/ui/TrimmedAudio';


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
            let userAnswerValue = result.answers[question.id];
            
            // ✅ Parse JSON string if needed (for matching, ordering, fill_blanks)
            if (typeof userAnswerValue === 'string' && (question.type === 'matching' || question.type === 'ordering' || question.type === 'fill_blanks')) {
              try {
                userAnswerValue = JSON.parse(userAnswerValue);
              } catch (e) {
                console.warn(`Failed to parse answer for question ${question.id}:`, e);
              }
            }
            
            console.log(`🔍 Question ${index + 1} (${question.type}):`, {
              questionId: question.id,
              userAnswerValue,
              type: typeof userAnswerValue,
              isArray: Array.isArray(userAnswerValue)
            });
            
            // Logic để xác định đáp án đúng sai dựa trên loại câu hỏi
            let isCorrect = false;
            let userAnswerText = '';
            
            switch (question.type) {
              case 'boolean':
              case 'multiple':
              case 'multimedia':
              case 'image':
              case 'audio':
              case 'video':
              case 'rich_content': {
                const userAnswer = question.answers.find(a => a.id === userAnswerValue);
                isCorrect = userAnswer?.isCorrect || false;
                userAnswerText = userAnswer?.text || t('result.not_answered', 'Not answered');
                break;
              }
              case 'short_answer': {
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
                userAnswerText = userAnswerValue || t('result.not_answered', 'Not answered');
                break;
              }
              case 'checkbox': {
                const correctIds = question.answers.filter(a => a.isCorrect).map(a => a.id).sort();
                const userIds = Array.isArray(userAnswerValue) ? [...userAnswerValue].sort() : [];
                isCorrect = JSON.stringify(correctIds) === JSON.stringify(userIds);
                const selectedAnswers = question.answers.filter(a => userIds.includes(a.id));
                userAnswerText = selectedAnswers.length > 0 
                  ? selectedAnswers.map(a => a.text).join(', ')
                  : t('result.not_answered', 'Not answered');
                break;
              }
              case 'ordering': {
                const items = question.orderingItems || [];
                const userOrder = Array.isArray(userAnswerValue) ? userAnswerValue : [];
                const correctOrder = [...items].sort((a, b) => a.correctOrder - b.correctOrder).map(item => item.id);
                isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
                
                console.log('🔍 Ordering check:', { userOrder, correctOrder, isCorrect });
                
                if (userOrder.length > 0) {
                  userAnswerText = userOrder.map((id, idx) => {
                    const item = items.find(i => i.id === id);
                    return `${idx + 1}. ${item?.text || id}`;
                  }).join(' → ');
                } else {
                  userAnswerText = t('result.not_answered', 'Not answered');
                }
                break;
              }
              case 'matching': {
                const pairs = question.matchingPairs || [];
                const userMatches = typeof userAnswerValue === 'object' && !Array.isArray(userAnswerValue) ? userAnswerValue as Record<string, string> : {};
                let correctCount = 0;
                pairs.forEach(pair => {
                  if (userMatches[pair.left] === pair.right) correctCount++;
                });
                isCorrect = correctCount === pairs.length;
                
                console.log('🔍 Matching check:', { userMatches, pairs, correctCount, isCorrect });
                
                if (Object.keys(userMatches).length > 0) {
                  userAnswerText = Object.entries(userMatches).map(([left, right]) => `${left} ↔ ${right}`).join(', ');
                } else {
                  userAnswerText = t('result.not_answered', 'Not answered');
                }
                break;
              }
              case 'fill_blanks': {
                const blanks = question.blanks || [];
                const userAnswers = typeof userAnswerValue === 'object' && !Array.isArray(userAnswerValue) ? userAnswerValue as Record<string, string> : {};
                let correctCount = 0;
                blanks.forEach(blank => {
                  const userAns = (userAnswers[blank.id] || '').trim().toLowerCase();
                  const correctAns = blank.correctAnswer.trim().toLowerCase();
                  if (blank.caseSensitive ? userAnswers[blank.id] === blank.correctAnswer : userAns === correctAns) {
                    correctCount++;
                  } else if (blank.acceptedAnswers) {
                    const isAccepted = blank.acceptedAnswers.some(accepted => 
                      blank.caseSensitive ? userAnswers[blank.id] === accepted : userAns === accepted.trim().toLowerCase()
                    );
                    if (isAccepted) correctCount++;
                  }
                });
                isCorrect = correctCount === blanks.length;
                userAnswerText = Object.keys(userAnswers).length > 0
                  ? Object.values(userAnswers).filter(v => v).join(', ')
                  : t('result.not_answered', 'Not answered');
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
                  <span className="font-medium text-blue-800">{t('result.your_answer', 'Your answer')}: </span>
                  <span className="text-blue-700">{userAnswerText}</span>
                </div>
                
                {/* Hiển thị đáp án cho multiple choice, image, boolean và multimedia */}
                {(question.type === 'multiple' || question.type === 'image' || question.type === 'boolean' || question.type === 'multimedia') && (
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
                        <div className="flex items-center gap-3">
                          <span className="font-medium">
                            {String.fromCharCode(65 + question.answers.indexOf(answer))}.
                          </span>
                          <div className="flex-1 flex flex-col gap-2">
                            {answer.imageUrl && (
                              <img src={answer.imageUrl} alt={answer.text || 'Answer'} className="w-16 h-16 object-cover rounded" />
                            )}
                            {answer.audioUrl && (
                              <TrimmedAudio 
                                url={answer.audioUrl} 
                                trimSettings={answer.mediaTrim}
                                className="w-full max-w-xs"
                              />
                            )}
                            {answer.videoUrl && (
                              <VideoPlayer 
                                url={answer.videoUrl} 
                                trimSettings={answer.mediaTrim}
                                className="w-full max-w-xs rounded-lg" 
                                style={{ maxHeight: '120px' }}
                              />
                            )}
                            <span>{answer.text}</span>
                          </div>
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
                            <div className="flex-1 flex flex-col gap-2">
                              {answer.imageUrl && (
                                <img src={answer.imageUrl} alt={answer.text || 'Answer'} className="w-16 h-16 object-cover rounded" />
                              )}
                              {answer.audioUrl && (
                                <TrimmedAudio 
                                  url={answer.audioUrl} 
                                  trimSettings={answer.mediaTrim}
                                  className="w-full max-w-xs"
                                />
                              )}
                              {answer.videoUrl && (
                                <VideoPlayer 
                                  url={answer.videoUrl} 
                                  trimSettings={answer.mediaTrim}
                                  className="w-full max-w-xs rounded-lg" 
                                  style={{ maxHeight: '120px' }}
                                />
                              )}
                              <span>{answer.text}</span>
                            </div>
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
                      <span className="font-medium text-green-800">{t('result.correct_answer_short', 'Correct answer')}: </span>
                      <span className="text-green-700">
                        {question.correctAnswer}
                        {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
                          <span className="text-sm"> ({t('result.or_accepted', 'or')}: {question.acceptedAnswers.join(', ')})</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Hiển thị đáp án cho ordering */}
                {question.type === 'ordering' && (
                  <div className="space-y-3">
                    {/* User's order */}
                    {Array.isArray(userAnswerValue) && userAnswerValue.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="font-medium text-blue-800">{t('result.your_order', 'Thứ tự bạn chọn')}: </span>
                        <div className="mt-2 space-y-1">
                          {userAnswerValue.map((id: string, idx: number) => {
                            const item = (question.orderingItems || []).find(i => i.id === id);
                            const correctOrder = [...(question.orderingItems || [])].sort((a, b) => a.correctOrder - b.correctOrder);
                            const isCorrectPosition = correctOrder[idx]?.id === id;
                            return (
                              <div key={id} className={`flex items-center gap-2 ${isCorrectPosition ? 'text-green-700' : 'text-red-700'}`}>
                                <span className="font-bold">{idx + 1}.</span>
                                <div className="flex items-center gap-2">
                                  {item?.imageUrl && (
                                    <img src={item.imageUrl} alt={item.text || 'Item'} className="w-12 h-12 object-cover rounded" />
                                  )}
                                  <span>{item?.text || id}</span>
                                </div>
                                {isCorrectPosition && <span className="ml-auto text-green-600">✓</span>}
                                {!isCorrectPosition && <span className="ml-auto text-red-600">✗</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Correct order */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="font-medium text-green-800">{t('result.correct_order', 'Thứ tự đúng')}: </span>
                      <div className="mt-2 space-y-1">
                        {[...(question.orderingItems || [])]
                          .sort((a, b) => a.correctOrder - b.correctOrder)
                          .map((item, idx) => (
                            <div key={item.id} className="text-green-700 flex items-center gap-2">
                              <span className="font-bold">{idx + 1}.</span>
                              <div className="flex items-center gap-2">
                                {item.imageUrl && (
                                  <img src={item.imageUrl} alt={item.text || 'Item'} className="w-12 h-12 object-cover rounded" />
                                )}
                                <span>{item.text}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hiển thị đáp án cho matching */}
                {question.type === 'matching' && (
                  <div className="space-y-3">
                    {/* User's matches */}
                    {typeof userAnswerValue === 'object' && !Array.isArray(userAnswerValue) && Object.keys(userAnswerValue).length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="font-medium text-blue-800">{t('result.your_matches', 'Các cặp bạn ghép')}: </span>
                        <div className="mt-2 space-y-1">
                          {Object.entries(userAnswerValue as Record<string, string>).map(([left, right]) => {
                            const correctPair = (question.matchingPairs || []).find(p => p.left === left);
                            const isCorrect = correctPair?.right === right;
                            return (
                              <div key={left} className={`flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                <span className="font-medium">{left}</span>
                                <span className="mx-1">↔</span>
                                <div className="flex items-center gap-2">
                                  {correctPair?.rightImageUrl && (
                                    <img src={correctPair.rightImageUrl} alt={right} className="w-12 h-12 object-cover rounded" />
                                  )}
                                  <span>{right}</span>
                                </div>
                                {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                {!isCorrect && correctPair && (
                                  <span className="ml-auto text-red-600 text-sm">
                                    ✗ (Đúng: {correctPair.right})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Correct matches */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="font-medium text-green-800">{t('result.correct_matches', 'Các cặp đúng')}: </span>
                      <div className="mt-2 space-y-1">
                        {(question.matchingPairs || []).map((pair) => (
                          <div key={pair.id} className="flex items-center gap-2 text-green-700">
                            <span className="font-medium">{pair.left}</span>
                            <span className="mx-1">↔</span>
                            <div className="flex items-center gap-2">
                              {pair.rightImageUrl && (
                                <img src={pair.rightImageUrl} alt={pair.right} className="w-12 h-12 object-cover rounded" />
                              )}
                              <span>{pair.right}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hiển thị đáp án cho fill_blanks */}
                {question.type === 'fill_blanks' && (
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="font-medium text-green-800">{t('result.correct_answers', 'Đáp án đúng')}: </span>
                      <div className="mt-2 space-y-1">
                        {(question.blanks || []).map((blank, idx) => {
                          const userAnswers = typeof userAnswerValue === 'object' && !Array.isArray(userAnswerValue) ? userAnswerValue as Record<string, string> : {};
                          const userAns = userAnswers[blank.id] || '';
                          const isCorrect = blank.caseSensitive 
                            ? userAns === blank.correctAnswer
                            : userAns.trim().toLowerCase() === blank.correctAnswer.trim().toLowerCase();
                          
                          return (
                            <div key={blank.id} className="text-green-700">
                              {t('result.blank', 'Chỗ trống')} {idx + 1}: <strong>{blank.correctAnswer}</strong>
                              {blank.acceptedAnswers && blank.acceptedAnswers.length > 0 && (
                                <span className="text-sm"> ({t('result.or_accepted', 'or')}: {blank.acceptedAnswers.join(', ')})</span>
                              )}
                              {userAns && (
                                <span className={`ml-2 text-sm ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  ({t('result.you_answered', 'Bạn trả lời')}: {userAns})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {question.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-medium text-blue-800">{t('result.explanation', 'Explanation')}: </span>
                    <SafeHTML content={question.explanation} className="text-blue-700" />
                    
                    {/* 🆕 Explanation Media */}
                    {(question.explanationImageUrl || question.explanationAudioUrl || question.explanationVideoUrl) && (
                      <div className="mt-3 space-y-3">
                        {question.explanationImageUrl && (
                          <div className="rounded-lg overflow-hidden">
                            <img 
                              src={question.explanationImageUrl} 
                              alt="Explanation" 
                              className="max-w-full h-auto max-h-48 object-contain rounded-lg border border-blue-200"
                            />
                          </div>
                        )}
                        {question.explanationAudioUrl && (
                          <TrimmedAudio
                            url={question.explanationAudioUrl}
                            trimSettings={question.explanationMediaTrim}
                            className="w-full"
                          />
                        )}
                        {question.explanationVideoUrl && (
                          <div className="rounded-lg overflow-hidden">
                            <VideoPlayer
                              url={question.explanationVideoUrl}
                              trimSettings={question.explanationMediaTrim}
                              className="max-h-48"
                            />
                          </div>
                        )}
                      </div>
                    )}
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

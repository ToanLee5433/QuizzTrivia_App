import React, { useMemo } from 'react';
import Button from '../../../../../shared/components/ui/Button';
import { Question, Answer } from '../types';
import { generateId } from '../utils';
import { Trash2, Check, X as XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
interface QuestionEditorProps {
  question: Question;
  onChange: (q: Question) => void;
  onDelete: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, onChange, onDelete }) => {
  const { t } = useTranslation();

  
  // Xử lý thay đổi loại câu hỏi
  const handleTypeChange = (newType: Question['type']) => {
    let newAnswers: Answer[] = [];
    const newQuestion = { ...question, type: newType };
    
    switch (newType) {
      case 'multiple':
        // Trắc nghiệm: tạo 4 đáp án mặc định
        newAnswers = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: '',
          isCorrect: i === 0,
        }));
        break;
      case 'boolean':
        // Đúng/Sai: tạo 2 đáp án với isCorrect logic
        newAnswers = [
          { id: generateId(), text: t('createQuiz.questions.booleanTrueDefault'), isCorrect: true },
          { id: generateId(), text: t('createQuiz.questions.booleanFalseDefault'), isCorrect: false }
        ];
        break;
      case 'short_answer':
        // Điền từ: không cần answers array, dùng correctAnswer và acceptedAnswers
        newAnswers = [];
        newQuestion.correctAnswer = '';
        newQuestion.acceptedAnswers = [];
        break;
      case 'image':
        // Chọn ảnh: tạo 4 đáp án có imageUrl
        newAnswers = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: t('createQuiz.questions.defaultImageLabel', { index: i + 1 }),
          isCorrect: i === 0,
          imageUrl: '',
        }));
        break;
      case 'audio':
        // Câu hỏi nghe: audio URL + 4 đáp án trắc nghiệm
        newAnswers = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: '',
          isCorrect: i === 0,
        }));
        newQuestion.audioUrl = '';
        break;
      case 'ordering':
        // Sắp xếp: tạo 4 items mặc định
        newAnswers = [];
        newQuestion.orderingItems = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: '',
          correctOrder: i + 1,
        }));
        break;
      case 'matching':
        // Ghép cặp: tạo 4 cặp mặc định
        newAnswers = [];
        newQuestion.matchingPairs = Array.from({ length: 4 }, () => ({
          id: generateId(),
          left: '',
          right: '',
        }));
        break;
      case 'fill_blanks':
        // Điền nhiều chỗ trống: text với blanks
        newAnswers = [];
        newQuestion.textWithBlanks = '';
        newQuestion.blanks = [];
        break;
    }
    
    onChange({ ...newQuestion, answers: newAnswers });
  };

  const handleAnswerChange = (idx: number, field: keyof Answer, value: string | boolean | undefined) => {
    const newAnswers = question.answers.map((a, i) =>
      i === idx ? { ...a, [field]: value } : a
    );
    onChange({ ...question, answers: newAnswers });
  };

  const handleAddAnswer = () => {
    if (question.type === 'multiple' || question.type === 'image' || question.type === 'audio') {
      const newAnswer: Answer = {
        id: generateId(),
        text:
          question.type === 'image'
            ? t('createQuiz.questions.defaultImageLabel', { index: question.answers.length + 1 })
            : '',
        isCorrect: false,
        ...(question.type === 'image' && { imageUrl: '' }),
      };
      onChange({
        ...question,
        answers: [...question.answers, newAnswer],
      });
    }
  };

  const handleRemoveAnswer = (idx: number) => {
    if (question.type === 'boolean') return; // Boolean không dùng answers array
    if ((question.type === 'multiple' || question.type === 'image' || question.type === 'audio') && question.answers.length <= 2) return; // Tối thiểu 2 đáp án
    
    onChange({
      ...question,
      answers: question.answers.filter((_, i) => i !== idx),
    });
  };

  const handleSetCorrect = (idx: number) => {
    onChange({
      ...question,
      answers: question.answers.map((a, i) => ({ ...a, isCorrect: i === idx })),
    });
  };

  // Xử lý điền từ
  const handleCorrectAnswerChange = (value: string) => {
    // Tự động tạo acceptedAnswers từ correctAnswer
    const accepted = [
      value, // Nguyên văn
      value.toLowerCase(), // Chữ thường
      value.toUpperCase(), // Chữ hoa
      value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(), // Capitalize
    ].filter((v, i, arr) => arr.indexOf(v) === i && v.trim() !== ''); // Loại bỏ trùng lặp và rỗng
    
    onChange({
      ...question,
      correctAnswer: value,
      acceptedAnswers: accepted,
    });
  };

  const addAcceptedAnswer = () => {
    const newAnswer = window.prompt(t('createQuiz.questions.acceptedAnswerPrompt'));
    if (newAnswer && newAnswer.trim()) {
      onChange({
        ...question,
        acceptedAnswers: [...(question.acceptedAnswers || []), newAnswer.trim()],
      });
    }
  };

  const removeAcceptedAnswer = (idx: number) => {
    onChange({
      ...question,
      acceptedAnswers: question.acceptedAnswers?.filter((_, i) => i !== idx) || [],
    });
  };

  const booleanLabels = useMemo(
    () => ({
      true: t('createQuiz.questions.booleanTrueLabel'),
      false: t('createQuiz.questions.booleanFalseLabel'),
    }),
    [t]
  );

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">
      {/* Header câu hỏi */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border p-2 rounded"
          placeholder={t('placeholders.questionContent')}
          value={question.text}
          onChange={e => onChange({ ...question, text: e.target.value })}
        />
        <select
          className="border p-2 rounded min-w-[120px]"
          value={question.type}
          onChange={e => handleTypeChange(e.target.value as Question['type'])}
        >
          <option value="multiple">{t('quizCreation.multipleChoice')}</option>
          <option value="boolean">{t('quizCreation.trueFalse')}</option>
          <option value="short_answer">{t('quizCreation.fillBlank')}</option>
          <option value="image">{t('quizCreation.imageChoice')}</option>
          <option value="audio">{t('quizCreation.audioQuestion')}</option>
          <option value="ordering">{t('quizCreation.orderingQuestion')}</option>
          <option value="matching">{t('quizCreation.matchingQuestion')}</option>
          <option value="fill_blanks">{t('quizCreation.fillBlanksQuestion')}</option>
        </select>
        <input
          type="number"
          className="w-20 border p-2 rounded"
          min={1}
          max={100}
          value={question.points}
          onChange={e => onChange({ ...question, points: parseInt(e.target.value) || 1 })}
          placeholder={t("profile.sort.score")}
        />
        <Button variant="outline" onClick={onDelete} className="text-red-600 border-red-300">{t("action.clear")}</Button>
      </div>

      {/* Nội dung theo từng dạng */}
      {question.type === 'multiple' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">{t('quizCreation.multipleChoiceAnswers')}</h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">{t('quizCreation.addAnswer')}</Button>
          </div>
          {question.answers.map((a, idx) => (
            <div key={a.id} className="flex gap-2 items-center bg-white p-2 rounded border">
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{String.fromCharCode(65 + idx)}</span>
              <input
                className="flex-1 border p-2 rounded"
                placeholder={t('createQuiz.questions.answerPlaceholder', { label: String.fromCharCode(65 + idx) })}
                value={a.text}
                onChange={e => handleAnswerChange(idx, 'text', e.target.value)}
              />
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={a.isCorrect}
                  onChange={() => handleSetCorrect(idx)}
                />
                <span className="text-sm">{t("common.correct")}</span>
              </label>
              {question.answers.length > 2 && (
                <Button 
                  variant="outline" 
                  onClick={() => handleRemoveAnswer(idx)} 
                  className="text-red-600 border-red-300 px-2"
                  aria-label={t('createQuiz.questions.removeAnswer')}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {question.type === 'boolean' && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">{t('quizCreation.trueFalseQuestion')}</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">{t('quizCreation.selectCorrectAnswer')}</p>
            <div className="space-y-2">
              {question.answers.map((answer, idx) => (
                <label key={answer.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`boolean-${question.id}`}
                    checked={answer.isCorrect}
                    onChange={() => handleSetCorrect(idx)}
                    className="w-4 h-4"
                  />
                  <span
                    className={`flex items-center gap-2 font-medium ${
                      idx === 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {idx === 0 ? (
                      <Check className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <XIcon className="w-4 h-4" aria-hidden="true" />
                    )}
                    {answer.text || booleanLabels[idx === 0 ? 'true' : 'false']}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {question.type === 'short_answer' && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">{t('quizCreation.fillBlankQuestion')}</h4>
          <div className="bg-white p-3 rounded border space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('quizCreation.correctAnswer')}</label>
              <input
                className="w-full border p-2 rounded"
                placeholder={t('placeholders.enterCorrectAnswer')}
                value={question.correctAnswer || ''}
                onChange={e => handleCorrectAnswerChange(e.target.value)}
              />
            </div>
            
            {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('quizCreation.acceptedVariations')}</label>
                <div className="space-y-1">
                  {question.acceptedAnswers.map((answer, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="flex-1 bg-gray-50 p-2 rounded text-sm">{answer}</span>
                      <Button 
                        variant="outline" 
                        onClick={() => removeAcceptedAnswer(idx)}
                        className="text-red-600 border-red-300 px-2 text-xs"
                        aria-label={t('createQuiz.questions.removeAcceptedAnswer')}
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button onClick={addAcceptedAnswer} variant="outline" size="sm">
              {t('quizCreation.addVariation')}
            </Button>
          </div>
        </div>
      )}

      {question.type === 'image' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">{t('quizCreation.imageAnswers')}</h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">{t('quizCreation.addImage')}</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {question.answers.map((a, idx) => (
              <div key={a.id} className="bg-white p-3 rounded border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{String.fromCharCode(65 + idx)}</span>
                  {question.answers.length > 2 && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleRemoveAnswer(idx)}
                      className="text-red-600 border-red-300 px-2 text-xs"
                      aria-label={t('createQuiz.questions.removeAnswer')}
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder={t('placeholders.imageDescription')}
                  value={a.text}
                  onChange={e => handleAnswerChange(idx, 'text', e.target.value)}
                />
                
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder={t('placeholders.imageUrlOptional')}
                  value={a.imageUrl || ''}
                  onChange={e => handleAnswerChange(idx, 'imageUrl', e.target.value)}
                />
                
                {a.imageUrl && (
                  <div className="relative">
                    <img 
                      src={a.imageUrl} 
                      alt={a.text}
                      className="w-full h-20 object-cover rounded border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={a.isCorrect}
                    onChange={() => handleSetCorrect(idx)}
                  />
                  <span className="text-sm font-medium text-green-600">{t('quizCreation.correctAnswerLabel')}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Question */}
      {question.type === 'audio' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border space-y-2">
            <h4 className="font-medium text-gray-700">{t('quizCreation.audioFile')}</h4>
            <input
              className="w-full border p-2 rounded text-sm"
              placeholder={t('placeholders.audioUrl')}
              value={question.audioUrl || ''}
              onChange={e => onChange({ ...question, audioUrl: e.target.value })}
            />
            {question.audioUrl && (
              <audio controls className="w-full mt-2">
                <source src={question.audioUrl} />
                {t('quizCreation.audioNotSupported')}
              </audio>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">{t('quizCreation.multipleChoiceAnswers')}</h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">{t('quizCreation.addAnswer')}</Button>
          </div>
          {question.answers.map((a, idx) => (
            <div key={a.id} className="flex gap-2 items-center bg-white p-2 rounded border">
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{String.fromCharCode(65 + idx)}</span>
              <input
                className="flex-1 border p-2 rounded"
                placeholder={t('createQuiz.questions.answerPlaceholder', { label: String.fromCharCode(65 + idx) })}
                value={a.text}
                onChange={e => handleAnswerChange(idx, 'text', e.target.value)}
              />
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={a.isCorrect}
                  onChange={() => handleSetCorrect(idx)}
                />
                <span className="text-sm">{t("common.correct")}</span>
              </label>
              {question.answers.length > 2 && (
                <Button 
                  variant="outline" 
                  onClick={() => handleRemoveAnswer(idx)} 
                  className="text-red-600 border-red-300 px-2"
                  aria-label={t('createQuiz.questions.removeAnswer')}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ordering Question */}
      {question.type === 'ordering' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">{t('quizCreation.orderingItems')}</h4>
            <Button 
              onClick={() => {
                const newItem = {
                  id: generateId(),
                  text: '',
                  correctOrder: (question.orderingItems?.length || 0) + 1,
                };
                onChange({
                  ...question,
                  orderingItems: [...(question.orderingItems || []), newItem],
                });
              }}
              variant="outline" 
              size="sm"
            >
              {t('quizCreation.addItem')}
            </Button>
          </div>
          {question.orderingItems?.map((item, idx) => (
            <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded border">
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{idx + 1}</span>
              <input
                className="flex-1 border p-2 rounded"
                placeholder={t('placeholders.orderingItemText', { number: idx + 1 })}
                value={item.text}
                onChange={e => {
                  const newItems = [...(question.orderingItems || [])];
                  newItems[idx] = { ...item, text: e.target.value };
                  onChange({ ...question, orderingItems: newItems });
                }}
              />
              <input
                className="w-24 border p-2 rounded text-sm"
                placeholder={t('placeholders.imageUrlOptional')}
                value={item.imageUrl || ''}
                onChange={e => {
                  const newItems = [...(question.orderingItems || [])];
                  newItems[idx] = { ...item, imageUrl: e.target.value };
                  onChange({ ...question, orderingItems: newItems });
                }}
              />
              {(question.orderingItems?.length || 0) > 2 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const newItems = question.orderingItems?.filter((_, i) => i !== idx) || [];
                    // Cập nhật lại correctOrder sau khi xóa
                    newItems.forEach((item, i) => {
                      item.correctOrder = i + 1;
                    });
                    onChange({ ...question, orderingItems: newItems });
                  }}
                  className="text-red-600 border-red-300 px-2"
                  aria-label={t('createQuiz.questions.removeItem')}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          <p className="text-sm text-gray-500">{t('quizCreation.orderingHint')}</p>
        </div>
      )}

      {/* Matching Question */}
      {question.type === 'matching' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">{t('quizCreation.matchingPairs')}</h4>
            <Button 
              onClick={() => {
                const newPair = {
                  id: generateId(),
                  left: '',
                  right: '',
                };
                onChange({
                  ...question,
                  matchingPairs: [...(question.matchingPairs || []), newPair],
                });
              }}
              variant="outline" 
              size="sm"
            >
              {t('quizCreation.addPair')}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="font-medium text-sm text-gray-600">{t('quizCreation.leftColumn')}</div>
            <div className="font-medium text-sm text-gray-600">{t('quizCreation.rightColumn')}</div>
          </div>
          {question.matchingPairs?.map((pair, idx) => (
            <div key={pair.id} className="grid grid-cols-2 gap-3 items-start bg-white p-3 rounded border">
              <div className="space-y-2">
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder={t('placeholders.leftItemText', { number: idx + 1 })}
                  value={pair.left}
                  onChange={e => {
                    const newPairs = [...(question.matchingPairs || [])];
                    newPairs[idx] = { ...pair, left: e.target.value };
                    onChange({ ...question, matchingPairs: newPairs });
                  }}
                />
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder={t('placeholders.imageUrlOptional')}
                  value={pair.leftImageUrl || ''}
                  onChange={e => {
                    const newPairs = [...(question.matchingPairs || [])];
                    newPairs[idx] = { ...pair, leftImageUrl: e.target.value };
                    onChange({ ...question, matchingPairs: newPairs });
                  }}
                />
              </div>
              <div className="space-y-2">
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder={t('placeholders.rightItemText', { number: idx + 1 })}
                  value={pair.right}
                  onChange={e => {
                    const newPairs = [...(question.matchingPairs || [])];
                    newPairs[idx] = { ...pair, right: e.target.value };
                    onChange({ ...question, matchingPairs: newPairs });
                  }}
                />
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder={t('placeholders.imageUrlOptional')}
                  value={pair.rightImageUrl || ''}
                  onChange={e => {
                    const newPairs = [...(question.matchingPairs || [])];
                    newPairs[idx] = { ...pair, rightImageUrl: e.target.value };
                    onChange({ ...question, matchingPairs: newPairs });
                  }}
                />
                {(question.matchingPairs?.length || 0) > 2 && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const newPairs = question.matchingPairs?.filter((_, i) => i !== idx) || [];
                      onChange({ ...question, matchingPairs: newPairs });
                    }}
                    className="text-red-600 border-red-300 w-full text-xs"
                    aria-label={t('createQuiz.questions.removePair')}
                  >
                    <Trash2 className="w-3 h-3 mr-1" aria-hidden="true" />
                    {t('quizCreation.removePair')}
                  </Button>
                )}
              </div>
            </div>
          ))}
          <p className="text-sm text-gray-500">{t('quizCreation.matchingHint')}</p>
        </div>
      )}

      {/* Fill Blanks Question */}
      {question.type === 'fill_blanks' && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">{t('quizCreation.fillBlanksText')}</h4>
          <div className="bg-white p-3 rounded border space-y-2">
            <textarea
              className="w-full border p-2 rounded"
              placeholder={t('placeholders.textWithBlanks')}
              rows={4}
              value={question.textWithBlanks || ''}
              onChange={e => onChange({ ...question, textWithBlanks: e.target.value })}
            />
            <p className="text-xs text-gray-500">{t('quizCreation.fillBlanksHint')}</p>
            <Button
              onClick={() => {
                const text = question.textWithBlanks || '';
                const regex = /\{\{(.*?)\}\}/g;
                const matches = [...text.matchAll(regex)];
                
                const newBlanks = matches.map((match, idx) => ({
                  id: generateId(),
                  position: idx + 1,
                  correctAnswer: match[1].trim(),
                  acceptedAnswers: [match[1].trim()],
                  caseSensitive: false,
                }));
                
                onChange({ ...question, blanks: newBlanks });
              }}
              variant="outline"
              size="sm"
            >
              {t('quizCreation.parseBlanks')}
            </Button>
          </div>
          
          {question.blanks && question.blanks.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-gray-700">{t('quizCreation.detectedBlanks')}</h5>
              {question.blanks.map((blank, idx) => (
                <div key={blank.id} className="bg-gray-50 p-3 rounded border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('quizCreation.blankNumber', { number: blank.position })}</span>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={blank.caseSensitive}
                        onChange={e => {
                          const newBlanks = [...(question.blanks || [])];
                          newBlanks[idx] = { ...blank, caseSensitive: e.target.checked };
                          onChange({ ...question, blanks: newBlanks });
                        }}
                      />
                      {t('quizCreation.caseSensitive')}
                    </label>
                  </div>
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder={t('placeholders.correctAnswer')}
                    value={blank.correctAnswer}
                    onChange={e => {
                      const newBlanks = [...(question.blanks || [])];
                      newBlanks[idx] = { ...blank, correctAnswer: e.target.value };
                      onChange({ ...question, blanks: newBlanks });
                    }}
                  />
                  {blank.acceptedAnswers && blank.acceptedAnswers.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600">{t('quizCreation.acceptedVariations')}</label>
                      {blank.acceptedAnswers.map((answer, aIdx) => (
                        <div key={aIdx} className="flex gap-2 items-center">
                          <input
                            className="flex-1 border p-1 rounded text-xs bg-white"
                            value={answer}
                            onChange={e => {
                              const newBlanks = [...(question.blanks || [])];
                              const newAccepted = [...(blank.acceptedAnswers || [])];
                              newAccepted[aIdx] = e.target.value;
                              newBlanks[idx] = { ...blank, acceptedAnswers: newAccepted };
                              onChange({ ...question, blanks: newBlanks });
                            }}
                          />
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              const newBlanks = [...(question.blanks || [])];
                              const newAccepted = blank.acceptedAnswers?.filter((_, i) => i !== aIdx) || [];
                              newBlanks[idx] = { ...blank, acceptedAnswers: newAccepted };
                              onChange({ ...question, blanks: newBlanks });
                            }}
                            className="text-red-600 border-red-300 px-1 text-xs"
                            aria-label={t('createQuiz.questions.removeAcceptedAnswer')}
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        onClick={() => {
                          const newBlanks = [...(question.blanks || [])];
                          const newAccepted = [...(blank.acceptedAnswers || []), ''];
                          newBlanks[idx] = { ...blank, acceptedAnswers: newAccepted };
                          onChange({ ...question, blanks: newBlanks });
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {t('quizCreation.addVariation')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Giải thích */}
      <div className="mt-4">
        <textarea
          className="w-full border p-2 rounded"
          placeholder={t('placeholders.answerExplanation')}
          rows={2}
          value={question.explanation || ''}
          onChange={e => onChange({ ...question, explanation: e.target.value })}
        />
      </div>
    </div>
  );
};

export default QuestionEditor;

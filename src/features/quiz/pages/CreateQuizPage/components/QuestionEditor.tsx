import React, { useMemo } from 'react';
import Button from '../../../../../shared/components/ui/Button';
import { Question, Answer } from '../types';
import { generateId } from '../utils';
import { Trash2, Check, X as XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MediaUploader } from '../../../components/MediaUploader';
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
      case 'checkbox':
        // Chọn nhiều đáp án: tạo 4 đáp án, có thể chọn nhiều đáp án đúng
        newAnswers = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: '',
          isCorrect: i === 0, // Default first answer is correct
        }));
        break;
      case 'short_answer':
        // Điền từ: không cần answers array, dùng correctAnswer và acceptedAnswers
        newAnswers = [];
        newQuestion.correctAnswer = '';
        newQuestion.acceptedAnswers = [];
        break;
      case 'image':
        // Câu hỏi hình ảnh: câu hỏi có thể có ảnh + đáp án có thể có ảnh
        newAnswers = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: t('createQuiz.questions.defaultImageLabel', { index: i + 1 }),
          isCorrect: i === 0,
          imageUrl: '',
        }));
        newQuestion.imageUrl = ''; // Thêm imageUrl cho câu hỏi
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
      case 'video':
        // Câu hỏi video: video URL + 4 đáp án trắc nghiệm
        newAnswers = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: '',
          isCorrect: i === 0,
        }));
        newQuestion.videoUrl = '';
        break;
      case 'multimedia':
        // 🆕 Câu hỏi đa phương tiện: Câu hỏi và đáp án có thể có image/audio/video
        newAnswers = Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          text: '',
          isCorrect: i === 0,
        }));
        // Initialize với undefined để không hiển thị uploader mặc định
        newQuestion.imageUrl = undefined;
        newQuestion.audioUrl = undefined;
        newQuestion.videoUrl = undefined;
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

  const handleAnswerChange = (idx: number, field: string, value: string | boolean | undefined) => {
    const newAnswers = question.answers.map((a, i) =>
      i === idx ? { ...a, [field]: value } : a
    );
    onChange({ ...question, answers: newAnswers });
  };

  // 🎬 Handle answer with mediaTrim for audio/video
  const handleAnswerWithTrim = (idx: number, updates: Partial<Answer>) => {
    const newAnswers = question.answers.map((a, i) =>
      i === idx ? { ...a, ...updates } : a
    );
    onChange({ ...question, answers: newAnswers });
  };

  const handleAddAnswer = () => {
    if (question.type === 'multiple' || question.type === 'checkbox' || question.type === 'image' || question.type === 'audio' || question.type === 'video' || question.type === 'multimedia') {
      const newAnswer: Answer = {
        id: generateId(),
        text:
          question.type === 'image' || question.type === 'multimedia'
            ? t('createQuiz.questions.defaultImageLabel', { index: question.answers.length + 1 })
            : '',
        isCorrect: false,
        ...(question.type === 'image' && { imageUrl: '' }),
        ...(question.type === 'multimedia' && { imageUrl: '', audioUrl: '', videoUrl: '' }),
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
          <option value="short_answer">{t('quizCreation.fillInBlank')}</option>
          <option value="checkbox">{t('quizCreation.multipleAnswers')}</option>
          <option value="multimedia">{t('quizCreation.multimediaQuestion', 'Đa phương tiện')}</option>
          <option value="ordering">{t('quizCreation.orderingQuestion')}</option>
          <option value="matching">{t('quizCreation.matchingQuestion')}</option>
          <option value="fill_blanks">{t('quizCreation.essayQuestion')}</option>
        </select>
        <input
          type="number"
          className={`w-20 border p-2 rounded ${
            question.points && (question.points < 1 || question.points > 100)
              ? 'border-red-500'
              : 'border-gray-300'
          }`}
          min={1}
          max={100}
          value={question.points || ''}
          onChange={e => {
            const val = e.target.value;
            if (val === '') {
              onChange({ ...question, points: '' as any });
            } else {
              const num = parseInt(val);
              if (!isNaN(num)) {
                onChange({ ...question, points: num });
              }
            }
          }}
          placeholder={t("profile.sort.score")}
          title={question.points && (question.points < 1 || question.points > 100) ? '⚠️ Points must be 1-100' : ''}
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

      {/* Checkbox (Multiple Answers) Question */}
      {question.type === 'checkbox' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">{t('quizCreation.multipleAnswersLabel')}</h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">{t('quizCreation.addAnswer')}</Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('quizCreation.multipleAnswersHint')}</p>
          {question.answers.map((a, idx) => (
            <div key={a.id} className="flex gap-2 items-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{String.fromCharCode(65 + idx)}</span>
              <input
                className="flex-1 border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder={t('createQuiz.questions.answerPlaceholder', { label: String.fromCharCode(65 + idx) })}
                value={a.text}
                onChange={e => handleAnswerChange(idx, 'text', e.target.value)}
              />
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={a.isCorrect}
                  onChange={e => handleAnswerChange(idx, 'isCorrect', e.target.checked)}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('common.correct')}</span>
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
                    <div key={`accepted-${idx}-${answer}`} className="flex gap-2 items-center">
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
          {/* Upload ảnh cho câu hỏi */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
              🖼️ {t('quizCreation.questionImage', 'Ảnh câu hỏi (tùy chọn)')}
            </h4>
            <MediaUploader
              type="image"
              currentUrl={question.imageUrl}
              onUploadComplete={(url) => onChange({ ...question, imageUrl: url })}
              onRemove={() => onChange({ ...question, imageUrl: '' })}
              maxSizeMB={5}
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 {t('quizCreation.questionImageHint', 'Thêm ảnh minh họa cho câu hỏi của bạn')}
            </p>
          </div>

          {/* Upload ảnh cho các đáp án */}
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">{t('quizCreation.imageAnswers', 'Đáp án (có thể có ảnh)')}</h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">{t('quizCreation.addImage', 'Thêm đáp án')}</Button>
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
                  placeholder={t('placeholders.imageDescription', 'Mô tả đáp án')}
                  value={a.text}
                  onChange={e => handleAnswerChange(idx, 'text', e.target.value)}
                />
                
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">
                    📷 {t('quizCreation.answerImage', 'Ảnh đáp án (tùy chọn)')}
                  </label>
                  <MediaUploader
                    type="image"
                    currentUrl={a.imageUrl}
                    onUploadComplete={(url) => handleAnswerChange(idx, 'imageUrl', url)}
                    onRemove={() => handleAnswerChange(idx, 'imageUrl', '')}
                    maxSizeMB={5}
                  />
                </div>
                
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
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <MediaUploader
              type="audio"
              currentUrl={question.audioUrl}
              onUploadComplete={(url) => onChange({ ...question, audioUrl: url })}
              onRemove={() => onChange({ ...question, audioUrl: '', mediaTrim: undefined })}
              onTrimChange={(trim) => onChange({ ...question, mediaTrim: trim || undefined })}
              trimSettings={question.mediaTrim}
              label={t('quizCreation.audioFile')}
              maxSizeMB={10}
            />
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

      {/* Video Question */}
      {question.type === 'video' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <MediaUploader
              type="video"
              currentUrl={question.videoUrl}
              onUploadComplete={(url) => onChange({ ...question, videoUrl: url })}
              onRemove={() => onChange({ ...question, videoUrl: '', mediaTrim: undefined })}
              onTrimChange={(trim) => onChange({ ...question, mediaTrim: trim || undefined })}
              trimSettings={question.mediaTrim}
              label={t('quizCreation.videoFile')}
              maxSizeMB={100}
            />
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

      {/* 🆕 Multimedia Question */}
      {question.type === 'multimedia' && (
        <div className="space-y-4">
          {/* Question Media Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-3">
              {t('quizCreation.questionMedia', 'Phương tiện câu hỏi (tùy chọn)')}
            </h4>
            
            {/* Media Type Selector */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`q-media-${question.id}`}
                  checked={question.imageUrl === undefined && question.audioUrl === undefined && question.videoUrl === undefined}
                  onChange={() => onChange({ ...question, imageUrl: undefined, audioUrl: undefined, videoUrl: undefined })}
                />
                <span className="text-sm">{t('quizCreation.mediaTypes.text', 'Text')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`q-media-${question.id}`}
                  checked={question.imageUrl !== undefined && question.imageUrl !== null}
                  onChange={() => onChange({ ...question, imageUrl: '', audioUrl: undefined, videoUrl: undefined })}
                />
                <span className="text-sm">{t('quizCreation.mediaTypes.image', 'Hình ảnh')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`q-media-${question.id}`}
                  checked={question.audioUrl !== undefined && question.audioUrl !== null}
                  onChange={() => onChange({ ...question, imageUrl: undefined, audioUrl: '', videoUrl: undefined })}
                />
                <span className="text-sm">{t('quizCreation.mediaTypes.audio', 'Âm thanh')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`q-media-${question.id}`}
                  checked={question.videoUrl !== undefined && question.videoUrl !== null}
                  onChange={() => onChange({ ...question, imageUrl: undefined, audioUrl: undefined, videoUrl: '' })}
                />
                <span className="text-sm">{t('quizCreation.mediaTypes.video', 'Video')}</span>
              </label>
            </div>

            {/* Upload Components - Only show when media type is selected */}
            {question.imageUrl !== undefined && question.imageUrl !== null && !question.audioUrl && !question.videoUrl && (
              <MediaUploader
                type="image"
                currentUrl={question.imageUrl}
                onUploadComplete={(url) => onChange({ ...question, imageUrl: url })}
                onRemove={() => onChange({ ...question, imageUrl: '' })}
                maxSizeMB={5}
              />
            )}
            {question.audioUrl !== undefined && question.audioUrl !== null && !question.imageUrl && !question.videoUrl && (
              <MediaUploader
                type="audio"
                currentUrl={question.audioUrl}
                onUploadComplete={(url) => onChange({ ...question, audioUrl: url, mediaTrim: undefined })}
                onRemove={() => onChange({ ...question, audioUrl: '', mediaTrim: undefined })}
                onTrimChange={(trim) => onChange({ ...question, mediaTrim: trim || undefined })}
                trimSettings={question.mediaTrim}
                maxSizeMB={10}
              />
            )}
            {question.videoUrl !== undefined && question.videoUrl !== null && !question.imageUrl && !question.audioUrl && (
              <MediaUploader
                type="video"
                currentUrl={question.videoUrl}
                onUploadComplete={(url) => {
                  // Clear mediaTrim when URL changes (new video = no trim)
                  onChange({ ...question, videoUrl: url, mediaTrim: undefined });
                }}
                onRemove={() => onChange({ ...question, videoUrl: '', mediaTrim: undefined })}
                onTrimChange={(trim) => {
                  onChange({ ...question, mediaTrim: trim || undefined });
                }}
                trimSettings={question.mediaTrim}
                maxSizeMB={100}
              />
            )}
          </div>

          {/* Answers Section */}
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">
              {t('quizCreation.multimediaAnswers', 'Đáp án (có thể có phương tiện)')}
            </h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">
              {t('quizCreation.addAnswer')}
            </Button>
          </div>

          <div className="space-y-3">
            {question.answers.map((a, idx) => (
              <div key={a.id} className="bg-white p-4 rounded-lg border-2 border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono bg-purple-100 px-3 py-1 rounded-full font-bold text-purple-700">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {question.answers.length > 2 && (
                    <Button 
                      variant="outline" 
                      onClick={() => handleRemoveAnswer(idx)} 
                      className="text-red-600 border-red-300 px-2 py-1"
                      size="sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* Answer Text */}
                <input
                  className="w-full border p-2 rounded"
                  placeholder={t('createQuiz.questions.answerPlaceholder', { label: String.fromCharCode(65 + idx) })}
                  value={a.text}
                  onChange={e => handleAnswerChange(idx, 'text', e.target.value)}
                />

                {/* Answer Media Type Selector */}
                <div className="flex gap-2 text-xs flex-wrap">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`a-media-${a.id}`}
                      checked={a.imageUrl === undefined && a.audioUrl === undefined && a.videoUrl === undefined}
                      onChange={() => {
                        const updatedAnswer = {
                          ...a,
                          imageUrl: undefined,
                          audioUrl: undefined,
                          videoUrl: undefined
                        };
                        const newAnswers = question.answers.map((ans, i) => 
                          i === idx ? updatedAnswer : ans
                        );
                        onChange({ ...question, answers: newAnswers });
                      }}
                    />
                    <span>{t('quizCreation.mediaTypes.text', 'Text')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`a-media-${a.id}`}
                      checked={a.imageUrl !== undefined && a.imageUrl !== null}
                      onChange={() => {
                        const updatedAnswer = {
                          ...a,
                          imageUrl: '',
                          audioUrl: undefined,
                          videoUrl: undefined
                        };
                        const newAnswers = question.answers.map((ans, i) => 
                          i === idx ? updatedAnswer : ans
                        );
                        onChange({ ...question, answers: newAnswers });
                      }}
                    />
                    <span>{t('quizCreation.mediaTypes.image', 'Image')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`a-media-${a.id}`}
                      checked={a.audioUrl !== undefined && a.audioUrl !== null}
                      onChange={() => {
                        const updatedAnswer = {
                          ...a,
                          imageUrl: undefined,
                          audioUrl: '',
                          videoUrl: undefined
                        };
                        const newAnswers = question.answers.map((ans, i) => 
                          i === idx ? updatedAnswer : ans
                        );
                        onChange({ ...question, answers: newAnswers });
                      }}
                    />
                    <span>{t('quizCreation.mediaTypes.audio', 'Audio')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`a-media-${a.id}`}
                      checked={a.videoUrl !== undefined && a.videoUrl !== null}
                      onChange={() => {
                        const updatedAnswer = {
                          ...a,
                          imageUrl: undefined,
                          audioUrl: undefined,
                          videoUrl: ''
                        };
                        const newAnswers = question.answers.map((ans, i) => 
                          i === idx ? updatedAnswer : ans
                        );
                        onChange({ ...question, answers: newAnswers });
                      }}
                    />
                    <span>{t('quizCreation.mediaTypes.video', 'Video')}</span>
                  </label>
                </div>

                {/* Media Uploader for Answer - Only show when media type is selected */}
                {a.imageUrl !== undefined && a.imageUrl !== null && !a.audioUrl && !a.videoUrl && (
                  <MediaUploader
                    type="image"
                    currentUrl={a.imageUrl}
                    onUploadComplete={(url) => handleAnswerChange(idx, 'imageUrl', url)}
                    onRemove={() => handleAnswerChange(idx, 'imageUrl', '')}
                    maxSizeMB={5}
                  />
                )}
                {a.audioUrl !== undefined && a.audioUrl !== null && !a.imageUrl && !a.videoUrl && (
                  <MediaUploader
                    type="audio"
                    currentUrl={a.audioUrl}
                    onUploadComplete={(url) => handleAnswerWithTrim(idx, { audioUrl: url })}
                    onRemove={() => handleAnswerWithTrim(idx, { audioUrl: '', mediaTrim: undefined })}
                    onTrimChange={(trim) => handleAnswerWithTrim(idx, { mediaTrim: trim || undefined })}
                    trimSettings={a.mediaTrim}
                    maxSizeMB={10}
                  />
                )}
                {a.videoUrl !== undefined && a.videoUrl !== null && !a.imageUrl && !a.audioUrl && (
                  <MediaUploader
                    type="video"
                    currentUrl={a.videoUrl}
                    onUploadComplete={(url) => handleAnswerWithTrim(idx, { videoUrl: url })}
                    onRemove={() => handleAnswerWithTrim(idx, { videoUrl: '', mediaTrim: undefined })}
                    onTrimChange={(trim) => handleAnswerWithTrim(idx, { mediaTrim: trim || undefined })}
                    trimSettings={a.mediaTrim}
                    maxSizeMB={50}
                  />
                )}

                {/* Correct Answer Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={a.isCorrect}
                    onChange={() => handleSetCorrect(idx)}
                  />
                  <span className="text-sm font-medium text-green-600">
                    ✓ {t('quizCreation.correctAnswerLabel')}
                  </span>
                </label>
              </div>
            ))}
          </div>
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
          {(Array.isArray(question.matchingPairs) ? question.matchingPairs : [])?.map((pair, idx) => (
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
                        <div key={`blank-${idx}-accepted-${aIdx}-${answer}`} className="flex gap-2 items-center">
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

      {/* Giải thích với Media Support */}
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('placeholders.answerExplanation')}
        </label>
        <textarea
          className="w-full border p-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          placeholder={t('placeholders.answerExplanation')}
          rows={2}
          value={question.explanation || ''}
          onChange={e => onChange({ ...question, explanation: e.target.value })}
        />
        
        {/* Media cho Explanation */}
        <div className="border border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-3 bg-gray-50 dark:bg-slate-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t('createQuiz.questions.explanationMedia', 'Thêm media cho giải thích (tùy chọn)')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Explanation Image */}
            <div>
              <MediaUploader
                type="image"
                currentUrl={question.explanationImageUrl || ''}
                onUploadComplete={(url: string) => onChange({ ...question, explanationImageUrl: url || undefined })}
                onRemove={() => onChange({ ...question, explanationImageUrl: undefined })}
                label={t('createQuiz.questions.explanationImage', 'Ảnh giải thích')}
              />
            </div>
            
            {/* Explanation Audio */}
            <div>
              <MediaUploader
                type="audio"
                currentUrl={question.explanationAudioUrl || ''}
                onUploadComplete={(url: string) => onChange({ ...question, explanationAudioUrl: url || undefined })}
                onRemove={() => onChange({ ...question, explanationAudioUrl: undefined, explanationMediaTrim: undefined })}
                onTrimChange={(trim) => onChange({ 
                  ...question, 
                  explanationMediaTrim: trim || undefined 
                })}
                trimSettings={question.explanationMediaTrim}
                label={t('createQuiz.questions.explanationAudio', 'Audio giải thích')}
              />
            </div>
            
            {/* Explanation Video */}
            <div>
              <MediaUploader
                type="video"
                currentUrl={question.explanationVideoUrl || ''}
                onUploadComplete={(url: string) => onChange({ ...question, explanationVideoUrl: url || undefined })}
                onRemove={() => onChange({ ...question, explanationVideoUrl: undefined, explanationMediaTrim: undefined })}
                onTrimChange={(trim) => onChange({ 
                  ...question, 
                  explanationMediaTrim: trim || undefined 
                })}
                trimSettings={question.explanationMediaTrim}
                label={t('createQuiz.questions.explanationVideo', 'Video giải thích')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditor;

import React from 'react';
import { Question, AnswerValue } from '../../../types';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import { VideoPlayer } from '../../../../../shared/components/ui/VideoPlayer';
import { TrimmedAudio } from '../../../../../shared/components/ui/TrimmedAudio';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Feedback state for practice mode
export interface FeedbackState {
  isAnswered: boolean;
  isCorrect: boolean | null;
  correctAnswer: string | string[] | Record<string, string> | null;
  showExplanation: boolean;
}

interface QuestionRendererProps {
  question: Question;
  questionNumber: number;
  value: AnswerValue;
  onChange: (answer: AnswerValue) => void;
  // Practice mode props
  feedback?: FeedbackState;
  disabled?: boolean; // Disable input after answering (for instant feedback)
  onCheckAnswer?: () => void; // Callback to check answer (for Enter key support)
  isPracticeMode?: boolean; // Whether in practice mode (for auto-play explanation video)
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  questionNumber,
  value,
  onChange,
  feedback,
  disabled = false,
  onCheckAnswer,
  isPracticeMode = false,
}) => {
  const { t } = useTranslation();
  
  // Hooks for matching question - must be at top level
  const [selectedLeft, setSelectedLeft] = React.useState<string | null>(null);
  
  // Hooks for ordering question - must be at top level
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Memoize shuffled right items for matching - only shuffle once, not on every render
  const shuffledRightItems = React.useMemo(() => {
    if (question.type === 'matching' && question.matchingPairs) {
      return [...question.matchingPairs].map(p => p.right).sort(() => Math.random() - 0.5);
    }
    return [];
  }, [question.type, question.matchingPairs]);

  const imageLoadError = t('quiz.questionRenderer.imageLoadError', 'Không thể tải ảnh');
  const noImageText = t('quiz.questionRenderer.noImage', 'Chưa có ảnh');
  const checkboxHint = t('quiz.questionRenderer.checkboxHint', '💡 Bạn có thể chọn nhiều đáp án cho câu hỏi này.');

  const getImageFallbackLabel = (displayIndex: number) =>
    t('quiz.questionRenderer.imageFallback', {
      defaultValue: `Ảnh ${displayIndex}`,
      index: displayIndex
    });

  const getOptionAltLabel = (letter: string) =>
    t('quiz.questionRenderer.optionAlt', {
      defaultValue: `Option ${letter}`,
      letter
    });

  const singleAnswerValue = typeof value === 'string' ? value : '';

  // Helper to determine answer state with feedback
  const getAnswerState = (answerId: string) => {
    const isSelected = singleAnswerValue === answerId;
    const isCorrectAnswer = feedback?.correctAnswer === answerId || 
      (Array.isArray(feedback?.correctAnswer) && feedback.correctAnswer.includes(answerId));
    const showFeedback = feedback?.isAnswered && feedback.isCorrect !== null;
    
    return {
      isSelected,
      isCorrectAnswer,
      showFeedback,
      // Visual states
      isCorrectAndSelected: showFeedback && isSelected && isCorrectAnswer,
      isWrongAndSelected: showFeedback && isSelected && !isCorrectAnswer,
      isCorrectNotSelected: showFeedback && !isSelected && isCorrectAnswer,
    };
  };

  // Get border/background classes based on feedback state
  const getOptionClasses = (answerId: string) => {
    const state = getAnswerState(answerId);
    
    if (state.isCorrectAndSelected) {
      return 'border-green-500 bg-green-50/50 shadow-md ring-2 ring-green-200';
    }
    if (state.isWrongAndSelected) {
      return 'border-red-500 bg-red-50/50 shadow-md ring-2 ring-red-200';
    }
    if (state.isCorrectNotSelected) {
      return 'border-green-400 bg-green-50/30 shadow-sm';
    }
    if (state.isSelected) {
      return 'border-blue-500 bg-blue-50/50 shadow-md';
    }
    return 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm';
  };

  // Get badge classes based on feedback state
  const getBadgeClasses = (answerId: string) => {
    const state = getAnswerState(answerId);
    
    if (state.isCorrectAndSelected || state.isCorrectNotSelected) {
      return 'bg-green-500 text-white';
    }
    if (state.isWrongAndSelected) {
      return 'bg-red-500 text-white';
    }
    if (state.isSelected) {
      return 'bg-blue-500 text-white';
    }
    return 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600';
  };

  const renderMultipleChoice = () => (
    <div className="space-y-4">
      {question.answers.map((answer, index) => {
        const state = getAnswerState(answer.id);
        const letter = String.fromCharCode(65 + index);
        return (
          <button
            key={answer.id}
            onClick={() => !disabled && onChange(answer.id)}
            disabled={disabled}
            className={`group relative w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 ${getOptionClasses(answer.id)} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center space-x-4">
              {/* Letter Badge */}
              <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold transition-colors ${getBadgeClasses(answer.id)}`}>
                {letter}
              </div>

              <div className="flex-1">
                <span
                  className={`text-lg leading-relaxed transition-colors ${
                    state.isSelected ? 'text-gray-900 font-medium' : 'text-gray-700 group-hover:text-gray-900'
                  }`}
                  dangerouslySetInnerHTML={{ __html: answer.text || '' }}
                />
              </div>

              {/* Selection/Feedback Indicator */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                state.isCorrectAndSelected || state.isCorrectNotSelected
                  ? 'border-green-500 bg-green-500'
                  : state.isWrongAndSelected
                    ? 'border-red-500 bg-red-500'
                    : state.isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 group-hover:border-blue-300'
              }`}>
                {(state.isCorrectAndSelected || state.isCorrectNotSelected) && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {state.isWrongAndSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {state.isSelected && !state.showFeedback && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderBoolean = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {question.answers.map((answer, index) => {
        const isSelected = singleAnswerValue === answer.id;
        const isTrue = answer.text === t('quiz.boolean.true');
        const letter = String.fromCharCode(65 + index);
        
        return (
          <button
            key={answer.id}
            onClick={() => onChange(answer.id)}
            className={`group relative p-8 text-center rounded-2xl border-2 transition-all duration-200 ${
              isSelected
                ? isTrue
                  ? 'border-green-500 bg-green-50/50 shadow-md'
                  : 'border-red-500 bg-red-50/50 shadow-md'
                : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className={`w-16 h-16 flex items-center justify-center rounded-full text-2xl font-bold transition-colors ${
                 isSelected
                  ? isTrue ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
              }`}>
                {isTrue ? 'T' : 'F'}
              </div>
              
              <div className="space-y-1">
                <span
                  className={`text-xl font-semibold block ${
                    isSelected
                      ? isTrue ? 'text-green-700' : 'text-red-700'
                      : 'text-gray-700 group-hover:text-gray-900'
                  }`}
                  dangerouslySetInnerHTML={{ __html: answer.text || '' }}
                />
                <span className="text-sm text-gray-400 font-medium">Option {letter}</span>
              </div>
            </div>
            
            {isSelected && (
              <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${
                isTrue ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderShortAnswer = () => {
    // Handle Enter key to check answer
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onCheckAnswer && !disabled) {
        e.preventDefault();
        onCheckAnswer();
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium">{t('quiz.questionRenderer.shortAnswerHint', '💡 Nhập đáp án. Nhấn Enter để kiểm tra.')}</p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={t('quiz.enterAnswer', 'Nhập câu trả lời của bạn...')}
              className={`w-full p-3 sm:p-4 border-2 rounded-xl focus:ring-4 focus:outline-none text-base sm:text-lg transition-all ${
                disabled
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 bg-white'
              }`}
            />
            {typeof value === 'string' && value && !disabled && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderImageQuestion = () => (
    <div className="space-y-6">
      {/* Hiển thị ảnh câu hỏi nếu có */}
      {question.imageUrl && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-blue-900">
              {t('quiz.questionImage', '🖼️ Ảnh minh họa câu hỏi')}
            </span>
          </div>
          <div className="w-full max-h-96 rounded-xl overflow-hidden bg-white shadow-md">
            <img
              src={question.imageUrl}
              alt="Question illustration"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Các đáp án */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {question.answers.map((answer, index) => {
        const isSelected = singleAnswerValue === answer.id;
        const letter = String.fromCharCode(65 + index);
        return (
          <button
            key={answer.id}
            onClick={() => onChange(answer.id)}
            className={`group relative p-4 rounded-2xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-blue-500 bg-blue-50/50 shadow-md'
                : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm'
            }`}
          >
            {answer.imageUrl ? (
              <div className="w-full h-48 mb-4 rounded-xl overflow-hidden bg-gray-100 relative group-hover:shadow-inner transition-shadow">
                <img
                  src={answer.imageUrl}
                  alt={answer.text || getOptionAltLabel(letter)}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                  <div className="text-center">
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">{imageLoadError}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-40 mb-4 rounded-xl bg-gray-50 flex items-center justify-center border border-dashed border-gray-200">
                <span className="text-gray-400 text-sm font-medium">{noImageText}</span>
              </div>
            )}

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-3">
                 <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                }`}>
                  {letter}
                </div>
                <span className={`font-medium text-lg ${
                  isSelected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {answer.text || getImageFallbackLabel(index + 1)}
                </span>
              </div>
              
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 group-hover:border-blue-300'
              }`}>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}
      </div>
    </div>
  );

  const renderCheckbox = () => {
    const currentValues = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium inline-block mb-2">
          {checkboxHint}
        </div>
        {question.answers.map((answer, index) => {
          const isSelected = currentValues.includes(answer.id);
          const letter = String.fromCharCode(65 + index);
          return (
            <button
              key={answer.id}
              onClick={() => {
                const newValue = isSelected
                  ? currentValues.filter(id => id !== answer.id)
                  : [...currentValues, answer.id];
                onChange(newValue);
              }}
              className={`group relative w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 shadow-md'
                  : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-4">
                 {/* Letter Badge */}
                <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold transition-colors ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                }`}>
                  {letter}
                </div>

                <div className="flex-1">
                  <span
                    className={`text-lg leading-relaxed transition-colors ${
                      isSelected ? 'text-gray-900 font-medium' : 'text-gray-700 group-hover:text-gray-900'
                    }`}
                    dangerouslySetInnerHTML={{ __html: answer.text || '' }}
                  />
                </div>

                 {/* Checkbox Indicator */}
                <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 group-hover:border-blue-300'
                }`}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderRichContent = () => (
    <div className="space-y-4">
      {question.richText && (
        <div className="prose max-w-none bg-gray-50 p-6 rounded-xl" dangerouslySetInnerHTML={{ __html: question.richText }} />
      )}
      {renderMultipleChoice()}
    </div>
  );

  const renderAudioQuestion = () => (
    <div className="space-y-6">
      {question.audioUrl && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">{t('quiz.questionRenderer.audioHint', '🎧 Nghe audio và trả lời câu hỏi:')}</p>
          </div>
          <TrimmedAudio 
            url={question.audioUrl} 
            className="w-full"
            trimSettings={question.mediaTrim}
            nativeControls={false}
          />
        </div>
      )}
      {renderMultipleChoice()}
    </div>
  );

  const renderVideoQuestion = () => (
    <div className="space-y-6">
      {question.videoUrl && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">{t('quiz.questionRenderer.videoHint', '🎬 Xem video và trả lời câu hỏi:')}</p>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <VideoPlayer 
                url={question.videoUrl} 
                className="w-full rounded-lg"
                trimSettings={question.mediaTrim}
                autoPlay={true}
                muted={false}
              />
            </div>
          </div>
        </div>
      )}
      {renderMultipleChoice()}
    </div>
  );

  // Sortable Item Component for Ordering
  const SortableOrderingItem: React.FC<{
    id: string;
    item: any;
    index: number;
  }> = ({ id, item, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center space-x-4 p-4 bg-white border-2 border-gray-200 rounded-xl transition-all ${
          isDragging ? 'opacity-50 shadow-lg' : ''
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
          {index + 1}
        </div>
        <div className="flex-1 text-lg">{item.text}</div>
        {item.imageUrl && (
          <img 
            src={item.imageUrl} 
            alt={item.text} 
            className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
          />
        )}
      </div>
    );
  };

  const renderOrdering = () => {
    const items = question.orderingItems || [];
    
    if (items.length === 0) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-medium">
            {t('quiz.questionRenderer.noOrderingItems', 'Câu hỏi không có các mục để sắp xếp')}
          </p>
        </div>
      );
    }
    
    const currentOrder = Array.isArray(value) ? value : items.map(item => item.id);

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = currentOrder.indexOf(active.id as string);
        const newIndex = currentOrder.indexOf(over.id as string);
        const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
        onChange(newOrder);
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 text-blue-800 px-5 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-2 mb-2">
          <GripVertical className="w-5 h-5" />
          <span>{t('quiz.questionRenderer.orderingHint', '💡 Kéo thả để sắp xếp các mục theo thứ tự đúng.')}</span>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentOrder}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {currentOrder.map((itemId: string, index: number) => {
                const item = items.find(i => i.id === itemId);
                if (!item) return null;
                
                return (
                  <SortableOrderingItem
                    key={item.id}
                    id={item.id}
                    item={item}
                    index={index}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  };

  const renderMatching = () => {
    const pairs = question.matchingPairs || [];
    
    if (pairs.length === 0) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-medium">
            {t('quiz.questionRenderer.noMatchingPairs', 'Câu hỏi không có các cặp để ghép')}
          </p>
        </div>
      );
    }
    
    const currentMatches = typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, string> : {};
    
    const handleLeftClick = (leftValue: string) => {
      setSelectedLeft(leftValue);
    };
    
    const handleRightClick = (rightValue: string) => {
      if (selectedLeft) {
        const newMatches = { ...currentMatches, [selectedLeft]: rightValue };
        onChange(newMatches as AnswerValue);
        setSelectedLeft(null);
      }
    };
    
    const getMatchedLeft = (rightValue: string) => {
      return Object.entries(currentMatches).find(([_, v]) => v === rightValue)?.[0];
    };
    
    return (
      <div className="space-y-6">
        {/* Modern Hint with Gradient */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-lg">{t('quiz.questionRenderer.matchingTitle', 'Nối các cặp')}</div>
              <div className="text-sm text-white/90">{t('quiz.questionRenderer.matchingHint', 'Chọn 1 ô bên trái, sau đó chọn 1 ô bên phải để ghép cặp')}</div>
            </div>
          </div>
        </div>

        {/* Modern Two Column Layout */}
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h4 className="font-bold text-gray-900 text-lg">{t('quiz.questionRenderer.leftColumn', 'Cột trái')}</h4>
            </div>
            {pairs.map((pair, index) => {
              const isSelected = selectedLeft === pair.left;
              const isMatched = currentMatches[pair.left];
              
              return (
                <button
                  key={pair.id}
                  onClick={() => handleLeftClick(pair.left)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 shadow-lg ring-4 ring-purple-200'
                      : isMatched
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      isSelected
                        ? 'bg-purple-500 text-white'
                        : isMatched
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 text-left font-medium text-gray-900">
                      {pair.leftImageUrl ? (
                        <img src={pair.leftImageUrl} alt={pair.left} className="w-full h-auto object-contain rounded-lg" style={{ maxHeight: '120px' }} />
                      ) : (
                        pair.left
                      )}
                    </div>
                    {isMatched && (
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h4 className="font-bold text-gray-900 text-lg">{t('quiz.questionRenderer.rightColumn', 'Cột phải')}</h4>
            </div>
            {shuffledRightItems.map((rightValue: string, index: number) => {
              const matchedLeft = getMatchedLeft(rightValue);
              const isMatched = !!matchedLeft;
              
              return (
                <button
                  key={index}
                  onClick={() => handleRightClick(rightValue)}
                  disabled={!selectedLeft || isMatched}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                    isMatched
                      ? 'border-green-500 bg-green-50 cursor-not-allowed'
                      : selectedLeft
                      ? 'border-purple-300 bg-purple-50 hover:border-purple-500 hover:shadow-lg cursor-pointer'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      isMatched
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="flex-1 text-left font-medium text-gray-900">
                      {pairs.find(p => p.right === rightValue)?.rightImageUrl ? (
                        <img src={pairs.find(p => p.right === rightValue)!.rightImageUrl} alt={rightValue} className="w-full h-auto object-contain rounded-lg" style={{ maxHeight: '120px' }} />
                      ) : (
                        rightValue
                      )}
                    </div>
                    {isMatched && (
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Indicator */}
        {Object.keys(currentMatches).length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {t('quiz.questionRenderer.matchingProgress', 'Tiến độ:')}
              </span>
              <span className="text-sm font-bold text-blue-600">
                {Object.keys(currentMatches).length} / {pairs.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500"
                style={{ width: `${(Object.keys(currentMatches).length / pairs.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFillBlanks = () => {
    const blanks = question.blanks || [];
    const textWithBlanks = question.textWithBlanks || '';
    const currentAnswers = typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, string> : {};
    
    // Handle Enter key to check answer
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onCheckAnswer && !disabled) {
        e.preventDefault();
        onCheckAnswer();
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-2">
          <span>💡</span>
          <span>{t('quiz.questionRenderer.fillBlanksHint', 'Điền vào chỗ trống. Nhấn Enter để kiểm tra.')}</span>
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 text-base sm:text-lg leading-relaxed">
          {textWithBlanks.split(/\{blank\}/).map((text, index) => (
            <React.Fragment key={index}>
              {text}
              {index < blanks.length && (
                <input
                  type="text"
                  value={currentAnswers[blanks[index].id] || ''}
                  onChange={(e) => {
                    const newAnswers = { ...currentAnswers, [blanks[index].id]: e.target.value };
                    onChange(newAnswers as AnswerValue);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  className={`inline-block mx-1 sm:mx-2 px-2 sm:px-3 py-0.5 sm:py-1 border-b-2 focus:outline-none min-w-[80px] sm:min-w-[120px] text-center text-sm sm:text-base ${
                    disabled 
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                      : 'border-blue-500 focus:border-blue-700 bg-blue-50'
                  }`}
                  placeholder="___"
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderMultimedia = () => {
    // Render multimedia question with flexible media types
    const singleAnswerValue = typeof value === 'string' ? value : '';
    
    return (
      <div className="space-y-6">
        {/* Question Media */}
        {(question.imageUrl || question.audioUrl || question.videoUrl) && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200 shadow-sm space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-lg">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                {t('quiz.questionMedia', 'Phương tiện câu hỏi')}
              </span>
            </div>
            {question.imageUrl && (
              <div className="w-full rounded-xl overflow-hidden bg-white shadow-md">
                <img src={question.imageUrl} alt="Question" className="w-full object-contain" style={{ maxHeight: '400px' }} />
              </div>
            )}
            {question.audioUrl && (
              <TrimmedAudio 
                url={question.audioUrl} 
                className="w-full"
                trimSettings={question.mediaTrim}
                nativeControls={false}
              />
            )}
            {question.videoUrl && (
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <VideoPlayer 
                    url={question.videoUrl} 
                    className="w-full rounded-xl shadow-md" 
                    style={{ maxHeight: '400px' }}
                    trimSettings={question.mediaTrim}
                    autoPlay={true}
                    muted={false}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Answers - Use single column when any answer has video for better viewing */}
        <div className={`grid gap-3 ${question.answers.some(a => a.videoUrl) ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {question.answers.map((answer, index) => {
            const isSelected = singleAnswerValue === answer.id;
            const letter = String.fromCharCode(65 + index);
            const hasVideo = !!answer.videoUrl;
            
            return (
              <button
                key={answer.id}
                onClick={() => onChange(answer.id)}
                className={`group p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                {/* Answer Label - Always on top */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${
                    isSelected ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {letter}
                  </div>
                  <span className="font-medium text-base flex-1">{answer.text}</span>
                  <div className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Answer Media - Below label */}
                {answer.imageUrl && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                    <img src={answer.imageUrl} alt={answer.text} className="w-full h-full object-contain" />
                  </div>
                )}
                {answer.audioUrl && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <TrimmedAudio 
                      url={answer.audioUrl} 
                      trimSettings={answer.mediaTrim}
                      className="w-full"
                    />
                  </div>
                )}
                {hasVideo && answer.videoUrl && (
                  <div className="mt-2 w-full aspect-video rounded-lg overflow-hidden bg-black" onClick={(e) => e.stopPropagation()}>
                    <VideoPlayer 
                      url={answer.videoUrl} 
                      trimSettings={answer.mediaTrim}
                      className="w-full h-full" 
                      autoPlay={false}
                      muted={true}
                      controls={true}
                      showTrimBadge={false}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuestion = () => {
    switch (question.type) {
      case 'multiple':
        return renderMultipleChoice();
      case 'boolean':
        return renderBoolean();
      case 'short_answer':
        return renderShortAnswer();
      case 'multimedia':
        return renderMultimedia();
      case 'image':
        return renderImageQuestion();
      case 'checkbox':
        return renderCheckbox();
      case 'rich_content':
        return renderRichContent();
      case 'audio':
        return renderAudioQuestion();
      case 'video':
        return renderVideoQuestion();
      case 'ordering':
        return renderOrdering();
      case 'matching':
        return renderMatching();
      case 'fill_blanks':
        return renderFillBlanks();
      default:
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-yellow-800 font-medium">
              {t('quiz.unsupportedType', 'Loại câu hỏi không được hỗ trợ')}: {question.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold tracking-wide uppercase">
            {t('quiz.question')} {questionNumber}
          </span>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-500">
              {question.points} {t('common.points')}
            </span>
             <span className="h-4 w-px bg-gray-300"></span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md uppercase tracking-wide">
              {question.type === 'multiple' && t('quiz.questionTypes.multiple')}
              {question.type === 'boolean' && t('quiz.questionTypes.boolean')}
              {question.type === 'short_answer' && t('quiz.questionTypes.short_answer')}
              {question.type === 'image' && t('quiz.questionTypes.image')}
              {question.type === 'checkbox' && t('quiz.questionTypes.checkbox')}
              {question.type === 'rich_content' && t('quiz.questionTypes.rich_content', 'Rich Content')}
              {question.type === 'audio' && t('quiz.questionTypes.audio', 'Audio')}
              {question.type === 'video' && t('quiz.questionTypes.video', 'Video')}
              {question.type === 'ordering' && t('quiz.questionTypes.ordering', 'Ordering')}
              {question.type === 'matching' && t('quiz.questionTypes.matching', 'Matching')}
              {question.type === 'fill_blanks' && t('quiz.questionTypes.fill_blanks', 'Fill Blanks')}
            </span>
          </div>
        </div>
        {/* Render tiêu đề câu hỏi KHÔNG tự bọc <p> */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          {typeof question.text === 'string' ? question.text.replace(/^<p>|<\/p>$/g, '') : ''}
        </h2>
      </div>
      
      {renderQuestion()}
      
      {/* Feedback Banner - Practice Mode */}
      {feedback?.isAnswered && feedback.isCorrect !== null && (
        <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 animate-fadeIn ${
          feedback.isCorrect 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {feedback.isCorrect ? (
            <>
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-green-800">{t('quiz.feedback.correct', 'Chính xác!')}</p>
                <p className="text-sm text-green-700">{t('quiz.feedback.correctDesc', 'Bạn đã chọn đúng đáp án.')}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-red-800">{t('quiz.feedback.incorrect', 'Chưa đúng!')}</p>
                <p className="text-sm text-red-700">{t('quiz.feedback.incorrectDesc', 'Đáp án đúng đã được đánh dấu màu xanh.')}</p>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Explanation - Practice Mode */}
      {feedback?.showExplanation && question.explanation && (
        <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-xl animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-blue-800 mb-1">{t('quiz.feedback.explanation', 'Giải thích')}</p>
              <p className="text-blue-700" dangerouslySetInnerHTML={{ __html: question.explanation }} />
              
              {/* 🆕 Explanation Media */}
              {(question.explanationImageUrl || question.explanationAudioUrl || question.explanationVideoUrl) && (
                <div className="mt-3 space-y-3">
                  {/* Explanation Image */}
                  {question.explanationImageUrl && (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={question.explanationImageUrl} 
                        alt="Explanation" 
                        className="max-w-full h-auto max-h-64 object-contain rounded-lg border border-blue-200"
                      />
                    </div>
                  )}
                  
                  {/* Explanation Audio - with trim support */}
                  {question.explanationAudioUrl && (
                    <TrimmedAudio
                      url={question.explanationAudioUrl}
                      trimSettings={question.explanationMediaTrim}
                      className="w-full"
                    />
                  )}
                  
                  {/* Explanation Video - with trim support, auto-play in practice mode */}
                  {question.explanationVideoUrl && (
                    <div className="rounded-lg overflow-hidden">
                      <VideoPlayer
                        url={question.explanationVideoUrl}
                        trimSettings={question.explanationMediaTrim}
                        className="max-h-64"
                        autoPlay={isPracticeMode}
                        muted={false}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionRenderer;

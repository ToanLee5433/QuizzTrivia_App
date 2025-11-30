/**
 * 🎯 QUESTION RENDERER FOR MULTIPLAYER
 * Renders all question types with modern UI
 * Supports power-ups effects (fifty-fifty, reveal answer)
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Question, OrderingItem, Answer } from '../../../../quiz/types';
import { PowerUpType } from '../../types/game.types';
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

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  activePowerUps?: PowerUpType[];
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  activePowerUps = [],
}) => {
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);

  // Apply fifty-fifty power-up
  const fiftyFiftyApplied = activePowerUps.includes('fifty_fifty');
  const availableAnswers = useMemo(() => {
    if (fiftyFiftyApplied && (question.type === 'multiple' || question.type === 'boolean')) {
      const correct = question.answers.filter(a => a.isCorrect);
      const incorrect = question.answers.filter(a => !a.isCorrect);
      // Show correct answer(s) + half of incorrect
      const halfIncorrect = incorrect.slice(0, Math.ceil(incorrect.length / 2));
      return [...correct, ...halfIncorrect].sort((a, b) => 
        question.answers.indexOf(a) - question.answers.indexOf(b)
      );
    }
    return question.answers;
  }, [question, fiftyFiftyApplied]);

  // Apply reveal answer power-up
  React.useEffect(() => {
    if (activePowerUps.includes('reveal_answer')) {
      const correctAnswer = question.answers.find(a => a.isCorrect);
      if (correctAnswer) {
        setRevealedAnswer(correctAnswer.id);
        // Hide after 3 seconds
        setTimeout(() => setRevealedAnswer(null), 3000);
      }
    }
  }, [activePowerUps, question.answers]);

  // ============= RENDER BY TYPE =============

  switch (question.type) {
    case 'multiple':
    case 'boolean':
      return <MultipleChoiceRenderer 
        question={question}
        answers={availableAnswers}
        value={value}
        onChange={onChange}
        disabled={disabled}
        revealedAnswer={revealedAnswer}
      />;

    case 'checkbox':
      return <CheckboxRenderer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />;

    case 'short_answer':
      return <ShortAnswerRenderer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />;

    case 'ordering':
      return <OrderingRenderer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />;

    case 'matching':
      return <MatchingRenderer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />;

    case 'fill_blanks':
      return <FillBlanksRenderer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />;

    default:
      return <div className="text-white">Unsupported question type: {question.type}</div>;
  }
};

// ============= MULTIPLE CHOICE & BOOLEAN =============
interface MultipleChoiceRendererProps {
  question: Question;
  answers: Answer[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  revealedAnswer: string | null;
}

const MultipleChoiceRenderer: React.FC<MultipleChoiceRendererProps> = ({
  answers,
  value,
  onChange,
  disabled,
  revealedAnswer,
}) => {
  return (
    <div className="space-y-3">
      {answers.map((answer: Answer, index: number) => {
        const isSelected = value === answer.id;
        const isRevealed = revealedAnswer === answer.id;
        const letter = String.fromCharCode(65 + index);

        return (
          <motion.button
            key={answer.id}
            onClick={() => !disabled && onChange(answer.id)}
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.02, x: 4 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            className={`group relative w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                : isRevealed
                ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20 animate-pulse'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <div className="flex items-center space-x-4">
              {/* Letter Badge */}
              <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : isRevealed
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white/70 group-hover:bg-white/20'
              }`}>
                {letter}
              </div>

              {/* Answer Text */}
              <div className="flex-1">
                <p className={`text-lg leading-relaxed transition-colors ${
                  isSelected || isRevealed ? 'text-white font-medium' : 'text-white/90'
                }`}>
                  {answer.text}
                </p>
                
                {/* Answer Image if exists */}
                {answer.imageUrl && (
                  <img
                    src={answer.imageUrl}
                    alt={answer.text}
                    className="mt-3 w-full rounded-lg max-h-48 object-cover"
                  />
                )}
              </div>

              {/* Selection Indicator */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : isRevealed
                  ? 'border-green-500 bg-green-500'
                  : 'border-white/30 group-hover:border-white/50'
              }`}>
                {(isSelected || isRevealed) && (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                )}
              </div>
            </div>

            {isRevealed && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                Đáp án đúng!
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

// ============= CHECKBOX =============
interface CheckboxRendererProps {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}

const CheckboxRenderer: React.FC<CheckboxRendererProps> = ({
  question,
  value,
  onChange,
  disabled,
}) => {
  const { t } = useTranslation('multiplayer');
  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];
  
  const handleToggle = (answerId: string) => {
    if (disabled) return;
    
    const newValue = safeValue.includes(answerId)
      ? safeValue.filter(id => id !== answerId)
      : [...safeValue, answerId];
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-blue-300 mb-4 flex items-center space-x-2">
        <span className="px-2 py-1 bg-blue-500/20 rounded-lg">💡</span>
        <span>{t('question.multipleAnswersHint')}</span>
      </p>
      
      {question.answers.map((answer, index) => {
        const isSelected = safeValue.includes(answer.id);
        const letter = String.fromCharCode(65 + index);

        return (
          <motion.button
            key={answer.id}
            onClick={() => handleToggle(answer.id)}
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.02, x: 4 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            className={`group relative w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <div className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 group-hover:bg-white/20'
              }`}>
                {letter}
              </div>

              <div className="flex-1">
                <p className={`text-lg leading-relaxed transition-colors ${
                  isSelected ? 'text-white font-medium' : 'text-white/90'
                }`}>
                  {answer.text}
                </p>
              </div>

              {/* Checkbox */}
              <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-white/30 group-hover:border-white/50'
              }`}>
                {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

// ============= SHORT ANSWER =============
interface ShortAnswerRendererProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const ShortAnswerRenderer: React.FC<ShortAnswerRendererProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const { t } = useTranslation('multiplayer');
  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
        <p className="text-sm text-blue-300 flex items-center space-x-2">
          <span className="px-2 py-1 bg-blue-500/20 rounded-lg">✏️</span>
          <span>{t('question.enterAnswerBelow')}</span>
        </p>
      </div>
      
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={t('question.answerPlaceholder')}
        className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:bg-white/15 transition-all text-lg disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
};

// ============= ORDERING =============
interface OrderingRendererProps {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}

const OrderingRenderer: React.FC<OrderingRendererProps> = ({
  question,
  value = [],
  onChange,
  disabled,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize value with shuffled items
  React.useEffect(() => {
    if (!value.length && question.orderingItems) {
      const shuffled = [...question.orderingItems]
        .map(item => item.id)
        .sort(() => Math.random() - 0.5);
      onChange(shuffled);
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = value.indexOf(active.id as string);
      const newIndex = value.indexOf(over.id as string);
      onChange(arrayMove(value, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
        <p className="text-sm text-purple-300 flex items-center space-x-2">
          <span className="px-2 py-1 bg-purple-500/20 rounded-lg">🔄</span>
          <span>Kéo thả để sắp xếp các mục theo thứ tự đúng</span>
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={value} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {value.map((itemId, index) => {
              const item = question.orderingItems?.find(i => i.id === itemId);
              if (!item) return null;
              
              return (
                <SortableItem
                  key={itemId}
                  id={itemId}
                  index={index}
                  item={item}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

interface SortableItemProps {
  id: string;
  index: number;
  item: OrderingItem;
  disabled: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, index, item, disabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center space-x-4 p-5 rounded-2xl border-2 transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-500/20 shadow-xl z-10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-move'}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold">
          {index + 1}
        </div>
        <GripVertical className="w-5 h-5 text-white/50" />
      </div>
      
      <p className="flex-1 text-lg text-white">{item.text}</p>
      
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.text}
          className="w-16 h-16 rounded-lg object-cover"
        />
      )}
    </div>
  );
};

// ============= MATCHING =============
interface MatchingRendererProps {
  question: Question;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled: boolean;
}

const MatchingRenderer: React.FC<MatchingRendererProps> = ({
  question,
  value = {},
  onChange,
  disabled,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  
  const shuffledRightItems = useMemo(() => {
    if (!question.matchingPairs) return [];
    return [...question.matchingPairs]
      .map(p => ({ id: p.id, right: p.right, rightImageUrl: p.rightImageUrl }))
      .sort(() => Math.random() - 0.5);
  }, [question.matchingPairs]);

  const handleLeftClick = (pairId: string) => {
    if (disabled) return;
    setSelectedLeft(pairId);
  };

  const handleRightClick = (_pairId: string, rightValue: string) => {
    if (disabled || !selectedLeft) return;
    
    onChange({
      ...value,
      [selectedLeft]: rightValue,
    });
    setSelectedLeft(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
        <p className="text-sm text-green-300 flex items-center space-x-2">
          <span className="px-2 py-1 bg-green-500/20 rounded-lg">🔗</span>
          <span>Chọn mục bên trái, sau đó chọn mục tương ứng bên phải để ghép cặp</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
          {question.matchingPairs?.map((pair) => {
            const isSelected = selectedLeft === pair.id;
            const isMatched = !!value[pair.id];

            return (
              <button
                key={pair.id}
                onClick={() => handleLeftClick(pair.id)}
                disabled={disabled}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/20'
                    : isMatched
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <p className="text-white">{pair.left}</p>
                {pair.leftImageUrl && (
                  <img
                    src={pair.leftImageUrl}
                    alt={pair.left}
                    className="mt-2 w-full rounded-lg max-h-24 object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {shuffledRightItems.map((item) => {
            const matchedPairId = Object.keys(value).find(key => value[key] === item.right);
            const isMatched = !!matchedPairId;

            return (
              <button
                key={item.id}
                onClick={() => handleRightClick(item.id, item.right)}
                disabled={disabled || !selectedLeft}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  isMatched
                    ? 'border-green-500 bg-green-500/10'
                    : selectedLeft
                    ? 'border-white/20 bg-white/10 hover:border-blue-300'
                    : 'border-white/10 bg-white/5'
                } ${disabled || !selectedLeft ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <p className="text-white">{item.right}</p>
                {item.rightImageUrl && (
                  <img
                    src={item.rightImageUrl}
                    alt={item.right}
                    className="mt-2 w-full rounded-lg max-h-24 object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matched Pairs Display */}
      {Object.keys(value).length > 0 && (
        <div className="mt-4 p-4 bg-white/5 rounded-xl">
          <p className="text-sm text-white/70 mb-2">Các cặp đã ghép:</p>
          {Object.entries(value).map(([, rightValue], index) => {
            const pairs = question.matchingPairs || [];
            const pair = pairs[index];
            if (!pair) return null;
            
            return (
              <div key={index} className="text-sm text-green-400 flex items-center space-x-2">
                <span>{pair.left}</span>
                <span>→</span>
                <span>{rightValue}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============= FILL BLANKS =============
interface FillBlanksRendererProps {
  question: Question;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled: boolean;
}

const FillBlanksRenderer: React.FC<FillBlanksRendererProps> = ({
  question,
  value = {},
  onChange,
  disabled,
}) => {
  const { t } = useTranslation('multiplayer');
  const handleBlankChange = (blankId: string, text: string) => {
    onChange({
      ...value,
      [blankId]: text,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
        <p className="text-sm text-yellow-300 flex items-center space-x-2">
          <span className="px-2 py-1 bg-yellow-500/20 rounded-lg">📝</span>
          <span>{t('question.fillBlanks')}</span>
        </p>
      </div>

      {question.blanks?.map((blank, index) => (
        <div key={blank.id} className="space-y-2">
          <label className="block text-white/70 text-sm">
            {t('question.blankLabel', { index: index + 1 })}
          </label>
          <input
            type="text"
            value={value[blank.id] || ''}
            onChange={(e) => handleBlankChange(blank.id, e.target.value)}
            disabled={disabled}
            placeholder={t('question.answerPlaceholder')}
            className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      ))}
    </div>
  );
};

export default QuestionRenderer;

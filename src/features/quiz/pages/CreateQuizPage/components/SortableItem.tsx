import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { SortableItemProps } from '../types';
import QuestionEditor from './QuestionEditor';
import { useTranslation } from 'react-i18next';

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  index,
  question,
  onUpdate,
  onDelete,
  moveQuestion,
  totalQuestions,
}) => {
  const { t } = useTranslation();
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
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Drag handle and Move buttons */}
      <div className="absolute -left-16 top-4 flex flex-col gap-1">
        <div
          {...attributes}
          {...listeners}
          className="p-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          title={t('createQuiz.questions.dragToReorder')}
        >
          <GripVertical className="w-4 h-4" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => moveQuestion(index, index - 1)}
          disabled={index === 0}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          title={t('createQuiz.questions.moveUp')}
        >
          <ChevronUp className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => moveQuestion(index, index + 1)}
          disabled={index === totalQuestions - 1}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          title={t('createQuiz.questions.moveDown')}
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <QuestionEditor
        question={question}
        onChange={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
};

export default SortableItem;

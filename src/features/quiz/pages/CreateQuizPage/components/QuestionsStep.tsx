import React, { useMemo, useState } from 'react';
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
} from '@dnd-kit/sortable';
import { Sparkles } from 'lucide-react';
import Button from '../../../../../shared/components/ui/Button';
import { QuizFormData, Question } from '../types';
import SortableItem from './SortableItem';
import QuizBulkImport from './QuizBulkImport';
import { AdvancedAIGenerator } from './AdvancedAIGenerator';
import { useTranslation } from 'react-i18next';

interface QuestionsStepProps {
  quiz: QuizFormData;
  setQuiz: React.Dispatch<React.SetStateAction<QuizFormData>>;
  addQuestion: () => void;
  updateQuestion: (idx: number, question: Question) => void;
  deleteQuestion: (idx: number) => void;
  moveQuestion: (fromIndex: number, toIndex: number) => void;
}

const QuestionsStep: React.FC<QuestionsStepProps> = ({
  quiz,
  setQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  moveQuestion,
}) => {
  const { t } = useTranslation();
  const [showGeminiAI, setShowGeminiAI] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = quiz.questions.findIndex((_, idx) => idx.toString() === active.id);
      const newIndex = quiz.questions.findIndex((_, idx) => idx.toString() === over?.id);

      setQuiz(prev => ({
        ...prev,
        questions: arrayMove(prev.questions, oldIndex, newIndex)
      }));
    }
  };

  const handleBulkImport = (questions: Question[]) => {
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, ...questions]
    }));
  };

  const handleAIQuestionsGenerated = (questions: Question[]) => {
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, ...questions]
    }));
    setShowGeminiAI(false);
  };

  const aiButtonContent = useMemo(
    () => ({
      iconLabel: t('createQuiz.questions.aiButtonIconLabel'),
      text: t('createQuiz.questions.aiButtonText')
    }),
    [t]
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{t('createQuiz.questions.title')}</h2>
        <div className="flex space-x-3">
          <Button onClick={addQuestion} className="bg-blue-600 hover:bg-blue-700 text-white">
            {t('createQuiz.questions.addQuestion')}
          </Button>
          <QuizBulkImport onQuestionsImported={handleBulkImport} />
          <Button
            onClick={() => setShowGeminiAI(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {aiButtonContent.iconLabel} {aiButtonContent.text}
            </span>
          </Button>
        </div>
      </div>
      {quiz.questions.length === 0 && (
        <div className="text-gray-500">{t('createQuiz.questions.emptyState')}</div>
      )}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={quiz.questions.map((_, idx) => idx.toString())}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {quiz.questions.map((q, idx) => (
              <SortableItem
                key={q.id}
                id={idx.toString()}
                index={idx}
                question={q}
                onUpdate={(q2) => updateQuestion(idx, q2)}
                onDelete={() => deleteQuestion(idx)}
                moveQuestion={moveQuestion}
                totalQuestions={quiz.questions.length}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Advanced AI Generator Modal */}
      <AdvancedAIGenerator
        isOpen={showGeminiAI}
        onClose={() => setShowGeminiAI(false)}
        onQuestionsGenerated={handleAIQuestionsGenerated}
      />
    </div>
  );
};

export default QuestionsStep;

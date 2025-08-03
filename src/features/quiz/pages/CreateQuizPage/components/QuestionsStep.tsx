import React, { useState } from 'react';
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
import { QuizFormData } from '../types';
import { Question } from '../types';
import SortableItem from './SortableItem';
import QuizBulkImport from './QuizBulkImport';
import AdvancedFileUpload from './AdvancedFileUpload';
import { ModernAIQuestionGenerator } from './ModernAIQuestionGenerator';

interface QuestionsStepProps {
  quiz: QuizFormData;
  setQuiz: React.Dispatch<React.SetStateAction<QuizFormData>>;
  addQuestion: () => void;
  updateQuestion: (idx: number, question: any) => void;
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
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
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
    setShowAIGenerator(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Danh sách câu hỏi</h2>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowAIGenerator(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo bằng AI</span>
          </Button>
          <QuizBulkImport onQuestionsImported={handleBulkImport} />
          <AdvancedFileUpload onQuestionsImported={handleBulkImport} />
          <Button onClick={addQuestion}>+ Thêm câu hỏi</Button>
        </div>
      </div>
      {quiz.questions.length === 0 && <div className="text-gray-500">Chưa có câu hỏi nào.</div>}
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

      {/* AI Question Generator Modal */}
      {showAIGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-auto m-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Tạo câu hỏi bằng AI</h3>
              <button
                onClick={() => setShowAIGenerator(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ModernAIQuestionGenerator
                content={`${quiz.title} - ${quiz.description}`}
                onQuestionsGenerated={handleAIQuestionsGenerated}
                isOpen={showAIGenerator}
                onClose={() => setShowAIGenerator(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsStep;

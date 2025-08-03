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
import { ModernGeminiAIGenerator } from '../../../components/ModernGeminiAIGenerator';

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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Danh sách câu hỏi</h2>
        <div className="flex space-x-3">
          <Button onClick={addQuestion} className="bg-blue-600 hover:bg-blue-700 text-white">
            + Thêm câu hỏi
          </Button>
          <QuizBulkImport onQuestionsImported={handleBulkImport} />
          <Button
            onClick={() => setShowGeminiAI(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>🤖 Gemini AI</span>
          </Button>
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

      {/* Gemini AI Generator Modal */}
      {showGeminiAI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">🤖 Gemini AI Generator</h3>
              <button
                onClick={() => setShowGeminiAI(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl font-bold transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ModernGeminiAIGenerator
                onQuestionsGenerated={handleAIQuestionsGenerated}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsStep;

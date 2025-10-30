import React, { useState } from 'react';
import { Question } from '../types';
import { 
  Plus, Trash2, Edit3, Check, X, ArrowUp, ArrowDown, 
  Lightbulb, Target, Type, List
} from 'lucide-react';
import SafeHTML from '../../../shared/components/ui/SafeHTML';


interface QuestionEditorProps {
  question: Question;
  index: number;
  isEditing: boolean;
  onEdit: (questionId: string) => void;
  onUpdate: (questionId: string, updates: Partial<Question>) => void;
  onDelete: (questionId: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  totalQuestions: number;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onMove,
  totalQuestions
}) => {
  const [localQuestion, setLocalQuestion] = useState<Question>(question);

  const handleSave = () => {
    onUpdate(question.id, localQuestion);
    onEdit('');
  };

  const handleCancel = () => {
    setLocalQuestion(question);
    onEdit('');
  };

  const addAnswer = () => {
    if (localQuestion.answers.length < 6) {
      const newAnswer = {
        id: `a_${Date.now()}`,
        text: '',
        isCorrect: false
      };
      setLocalQuestion({
        ...localQuestion,
        answers: [...localQuestion.answers, newAnswer]
      });
    }
  };

  const updateAnswer = (answerId: string, updates: Partial<{ text: string; isCorrect: boolean }>) => {
    setLocalQuestion({
      ...localQuestion,
      answers: localQuestion.answers.map(a => 
        a.id === answerId ? { ...a, ...updates } : a
      )
    });
  };

  const deleteAnswer = (answerId: string) => {
    if (localQuestion.answers.length > 2) {
      setLocalQuestion({
        ...localQuestion,
        answers: localQuestion.answers.filter(a => a.id !== answerId)
      });
    }
  };

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 transition-all duration-300 shadow-sm hover:shadow-lg ${
      isEditing 
        ? 'border-blue-300 shadow-blue-100' 
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {/* Question Number */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {index + 1}
            </div>
            {question.type === 'multiple' && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <List className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Move Controls */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onMove(index, 'up')}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
              title="Move up"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMove(index, 'down')}
              disabled={index === totalQuestions - 1}
              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
              title="Move down"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* Question Type Badge */}
          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {question.type === 'multiple' ? '🔢 Multiple Choice' : 
             question.type === 'boolean' ? '✓✗ True/False' : 
             question.type === 'checkbox' ? '☑️ Checkbox' :
             question.type === 'short_answer' ? '📝 Short Answer' :
             '🖼️ Image Choice'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(question.id)}
                className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors shadow-sm"
                title="Edit question"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDelete(question.id)}
                className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors shadow-sm"
                title="Delete question"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Type className="w-4 h-4" />
                Question Text *
              </label>
              <textarea
                value={localQuestion.text}
                onChange={(e) => setLocalQuestion({ ...localQuestion, text: e.target.value })}
                placeholder="Enter your question here..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={3}
              />
            </div>

            {/* Question Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <List className="w-4 h-4" />
                  Question Type
                </label>
                <select
                  value={localQuestion.type}
                  onChange={(e) => setLocalQuestion({ ...localQuestion, type: e.target.value as any })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="multiple">Multiple Choice</option>
                  <option value="boolean">True/False</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="image">Image Choice</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Target className="w-4 h-4" />
                  Points
                </label>
                <input
                  type="number"
                  value={localQuestion.points}
                  onChange={(e) => setLocalQuestion({ ...localQuestion, points: parseInt(e.target.value) || 10 })}
                  min="1"
                  max="100"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Difficulty</label>
                <select
                  value={localQuestion.difficulty || 'medium'}
                  onChange={(e) => setLocalQuestion({ ...localQuestion, difficulty: e.target.value as any })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                </select>
              </div>
            </div>

            {/* Answers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <List className="w-4 h-4" />
                  Answer Options *
                </label>
                <button
                  onClick={addAnswer}
                  disabled={localQuestion.answers.length >= 6}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add Answer
                </button>
              </div>
              
              <div className="space-y-3">
                {localQuestion.answers.map((answer, answerIndex) => (
                  <div key={answer.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 font-semibold shadow-sm">
                      {String.fromCharCode(65 + answerIndex)}
                    </div>
                    <input
                      type="text"
                      value={answer.text}
                      onChange={(e) => updateAnswer(answer.id, { text: e.target.value })}
                      placeholder={`Answer ${String.fromCharCode(65 + answerIndex)}`}
                      className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={answer.isCorrect}
                        onChange={(e) => updateAnswer(answer.id, { isCorrect: e.target.checked })}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-green-700">Correct</span>
                    </label>
                    {localQuestion.answers.length > 2 && (
                      <button
                        onClick={() => deleteAnswer(answer.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Lightbulb className="w-4 h-4" />
                Explanation (Optional)
              </label>
              <textarea
                value={localQuestion.explanation || ''}
                onChange={(e) => setLocalQuestion({ ...localQuestion, explanation: e.target.value })}
                placeholder="Explain why this is the correct answer..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Question Display */}
            <h4 className="text-xl font-bold text-gray-900 leading-relaxed">
              {question.text || '❓ Untitled Question'}
            </h4>
            
            {/* Answers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.answers.map((answer, answerIndex) => (
                <div key={answer.id} className={`p-4 rounded-xl border-2 transition-all ${
                  answer.isCorrect 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      answer.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + answerIndex)}
                    </div>
                    <span className="flex-1 font-medium">
                      {answer.text || 'Empty answer'}
                    </span>
                    {answer.isCorrect && <Check className="w-5 h-5 text-green-600" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Question Info */}
            <div className="flex items-center gap-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <strong>{question.points}</strong> points
              </span>
              <span className="flex items-center gap-1">
                <Type className="w-4 h-4" />
                {question.type}
              </span>
              <span className="flex items-center gap-1">
                📊 {question.difficulty || 'medium'}
              </span>
              {question.explanation && (
                <span className="flex items-center gap-1">
                  <Lightbulb className="w-4 h-4" />
                  Has explanation
                </span>
              )}
            </div>

            {/* Explanation Preview */}
            {question.explanation && (
              <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-400">
                <h5 className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  Explanation
                </h5>
                <SafeHTML content={question.explanation} className="text-blue-700" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

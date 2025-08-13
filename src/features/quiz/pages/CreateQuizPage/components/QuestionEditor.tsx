import React from 'react';
import Button from '../../../../../shared/components/ui/Button';
import { Question, Answer } from '../types';
import { generateId } from '../utils';

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
    let newQuestion = { ...question, type: newType };
    
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
          { id: generateId(), text: 'Đúng', isCorrect: true },
          { id: generateId(), text: 'Sai', isCorrect: false }
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
          text: `Ảnh ${i + 1}`,
          isCorrect: i === 0,
          imageUrl: '',
        }));
        break;
    }
    
    onChange({ ...newQuestion, answers: newAnswers });
  };

  const handleAnswerChange = (idx: number, field: keyof Answer, value: any) => {
    const newAnswers = question.answers.map((a, i) =>
      i === idx ? { ...a, [field]: value } : a
    );
    onChange({ ...question, answers: newAnswers });
  };

  const handleAddAnswer = () => {
    if (question.type === 'multiple' || question.type === 'image') {
      const newAnswer: Answer = {
        id: generateId(),
        text: question.type === 'image' ? `Ảnh ${question.answers.length + 1}` : '',
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
    if ((question.type === 'multiple' || question.type === 'image') && question.answers.length <= 2) return; // Tối thiểu 2 đáp án
    
    onChange({
      ...question,
      answers: question.answers.filter((_, i) => i !== idx),
    });
  };

  const handleSetCorrect = (idx: number) => {
    if (question.type === 'boolean') {
      // Với Boolean: nếu chọn "Đúng" (idx=0) thì đáp án đúng là true, ngược lại false  
      onChange({
        ...question,
        answers: question.answers.map((a, i) => ({ 
          ...a, 
          isCorrect: i === 0 ? idx === 0 : idx === 1 
        })),
      });
    } else {
      // Với Multiple Choice: chỉ có 1 đáp án đúng
      onChange({
        ...question,
        answers: question.answers.map((a, i) => ({ ...a, isCorrect: i === idx })),
      });
    }
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
    const newAnswer = prompt('Nhập từ đồng nghĩa hoặc cách viết khác:');
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

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">
      {/* Header câu hỏi */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border p-2 rounded"
          placeholder="Nội dung câu hỏi"
          value={question.text}
          onChange={e => onChange({ ...question, text: e.target.value })}
        />
        <select
          className="border p-2 rounded min-w-[120px]"
          value={question.type}
          onChange={e => handleTypeChange(e.target.value as Question['type'])}
        >
          <option value="multiple">Trắc nghiệm</option>
          <option value="boolean">Đúng/Sai</option>
          <option value="short_answer">Điền từ</option>
          <option value="image">Chọn ảnh</option>
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
            <h4 className="font-medium text-gray-700">Đáp án trắc nghiệm</h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">+ Thêm đáp án</Button>
          </div>
          {question.answers.map((a, idx) => (
            <div key={a.id} className="flex gap-2 items-center bg-white p-2 rounded border">
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{String.fromCharCode(65 + idx)}</span>
              <input
                className="flex-1 border p-2 rounded"
                placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
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
                >
                  X
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {question.type === 'boolean' && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Câu hỏi Đúng/Sai</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">Chọn đáp án đúng cho câu hỏi này:</p>
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
                  <span className={`font-medium ${
                    answer.text === 'Đúng' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {answer.text === 'Đúng' ? '✓' : '✗'} {answer.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {question.type === 'short_answer' && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Câu hỏi điền từ</h4>
          <div className="bg-white p-3 rounded border space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Đáp án chính xác:</label>
              <input
                className="w-full border p-2 rounded"
                placeholder="Nhập đáp án chính xác..."
                value={question.correctAnswer || ''}
                onChange={e => handleCorrectAnswerChange(e.target.value)}
              />
            </div>
            
            {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Các cách viết được chấp nhận:</label>
                <div className="space-y-1">
                  {question.acceptedAnswers.map((answer, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="flex-1 bg-gray-50 p-2 rounded text-sm">{answer}</span>
                      <Button 
                        variant="outline" 
                        onClick={() => removeAcceptedAnswer(idx)}
                        className="text-red-600 border-red-300 px-2 text-xs"
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button onClick={addAcceptedAnswer} variant="outline" size="sm">
              + Thêm cách viết khác
            </Button>
          </div>
        </div>
      )}

      {question.type === 'image' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-700">Chọn ảnh đáp án</h4>
            <Button onClick={handleAddAnswer} variant="outline" size="sm">+ Thêm ảnh</Button>
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
                    >
                      X
                    </Button>
                  )}
                </div>
                
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Mô tả ảnh (tùy chọn)"
                  value={a.text}
                  onChange={e => handleAnswerChange(idx, 'text', e.target.value)}
                />
                
                <input
                  className="w-full border p-2 rounded text-sm"
                  placeholder="URL ảnh"
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
                  <span className="text-sm font-medium text-green-600">Đáp án đúng</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Giải thích */}
      <div className="mt-4">
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Giải thích đáp án (tùy chọn)"
          rows={2}
          value={question.explanation || ''}
          onChange={e => onChange({ ...question, explanation: e.target.value })}
        />
      </div>
    </div>
  );
};

export default QuestionEditor;

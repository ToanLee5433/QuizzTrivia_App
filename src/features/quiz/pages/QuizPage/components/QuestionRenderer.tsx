import React from 'react';
import { useTranslation } from 'react-i18next';
import { Question } from '../../../types';

interface QuestionRendererProps {
  question: Question;
  questionNumber: number;
  value: any;
  onChange: (answer: any) => void;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  questionNumber,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const renderMultipleChoice = () => (
    <div className="space-y-3">
      {question.answers.map((answer, index) => (
        <button
          key={answer.id}
          onClick={() => onChange(answer.id)}
          className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
            value === answer.id
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full border-2 ${
              value === answer.id
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}>
              {value === answer.id && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
            <span className="font-medium mr-3">
              {String.fromCharCode(65 + index)}.
            </span>
            <span 
              className="flex-1"
              dangerouslySetInnerHTML={{ __html: answer.text || '' }}
            />
          </div>
        </button>
      ))}
    </div>
  );

  const renderBoolean = () => (
    <div className="space-y-3">
      {question.answers.map((answer, index) => (
        <button
          key={answer.id}
          onClick={() => onChange(answer.id)}
          className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
            value === answer.id
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full border-2 ${
              value === answer.id
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}>
              {value === answer.id && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
            <span className="font-medium mr-3">
              {String.fromCharCode(65 + index)}.
            </span>
            <span 
              className={`flex-1 font-medium ${answer.text === 'Đúng' ? 'text-green-600' : 'text-red-600'}`}
              dangerouslySetInnerHTML={{ __html: answer.text || '' }}
            />
          </div>
        </button>
      ))}
    </div>
  );

  const renderShortAnswer = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700 mb-3">
          💡 Nhập đáp án vào ô bên dưới:
        </p>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('quiz.enterAnswer', 'Nhập câu trả lời của bạn...')}
          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
        />
      </div>
    </div>
  );

  const renderImageQuestion = () => (
    <div className="grid grid-cols-2 gap-4">
      {question.answers.map((answer, index) => (
        <button
          key={answer.id}
          onClick={() => onChange(answer.id)}
          className={`relative p-4 rounded-lg border-2 transition-all ${
            value === answer.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {/* Ảnh */}
          {answer.imageUrl ? (
            <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
              <img 
                src={answer.imageUrl} 
                alt={answer.text || `Option ${String.fromCharCode(65 + index)}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-sm">Không thể tải ảnh</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-32 mb-3 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Chưa có ảnh</span>
            </div>
          )}
          
          {/* Label và Radio */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              {String.fromCharCode(65 + index)}. {answer.text || `Ảnh ${index + 1}`}
            </span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              value === answer.id
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}>
              {value === answer.id && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderCheckbox = () => (
    <div className="space-y-3">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-700">
          💡 Bạn có thể chọn nhiều đáp án cho câu hỏi này.
        </p>
      </div>
      {question.answers.map((answer, index) => {
        const isSelected = Array.isArray(value) && value.includes(answer.id);
        return (
          <button
            key={answer.id}
            onClick={() => {
              const currentValue = Array.isArray(value) ? value : [];
              const newValue = isSelected
                ? currentValue.filter(id => id !== answer.id)
                : [...currentValue, answer.id];
              onChange(newValue);
            }}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded border-2 ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {isSelected && (
                  <div className="text-white text-xs flex items-center justify-center h-full">
                    ✓
                  </div>
                )}
              </div>
              <span className="font-medium mr-3">
                {String.fromCharCode(65 + index)}.
              </span>
              <span 
                className="flex-1"
                dangerouslySetInnerHTML={{ __html: answer.text || '' }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderQuestion = () => {
    switch (question.type) {
      case 'multiple':
        return renderMultipleChoice();
      case 'boolean':
        return renderBoolean();
      case 'short_answer':
        return renderShortAnswer();
      case 'image':
        return renderImageQuestion();
      case 'checkbox':
        return renderCheckbox();
      default:
        return <div>Loại câu hỏi không được hỗ trợ</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-blue-600">
            Câu hỏi {questionNumber} / {question.points} điểm
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {question.type === 'multiple' && 'Trắc nghiệm'}
            {question.type === 'boolean' && 'Đúng/Sai'}
            {question.type === 'short_answer' && 'Điền từ'}
            {question.type === 'image' && 'Hình ảnh'}
            {question.type === 'checkbox' && 'Nhiều lựa chọn'}
          </span>
        </div>
        <h2 
          className="text-xl font-semibold text-gray-800 mb-6"
          dangerouslySetInnerHTML={{ __html: question.text || '' }}
        />
      </div>
      
      {renderQuestion()}
    </div>
  );
};

export default QuestionRenderer;

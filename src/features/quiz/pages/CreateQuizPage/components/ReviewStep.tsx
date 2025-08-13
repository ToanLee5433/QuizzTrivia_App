import React from 'react';
import { QuizFormData } from '../types';

import { useTranslation } from 'react-i18next';
interface ReviewStepProps {
  quiz: QuizFormData;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ quiz }) => {
  const { t } = useTranslation();

  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-800 mb-2">{t("createQuiz.steps.info")}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Tiêu đề:</strong> {quiz.title}</div>
          <div><strong>Danh mục:</strong> {quiz.category}</div>
          <div><strong>Độ khó:</strong> {quiz.difficulty}</div>
          <div><strong>Thời gian:</strong> {quiz.duration} phút</div>
          <div><strong>Số câu hỏi:</strong> {quiz.questions.length}</div>
          <div><strong>Tổng điểm:</strong> {totalPoints}</div>
        </div>
        {quiz.description && (
          <div className="mt-2">
            <strong>Mô tả:</strong> {quiz.description}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-800">Danh sách câu hỏi</h3>
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">
                Câu {idx + 1}: {q.text}
              </h4>
              <div className="text-sm text-gray-500">
                {q.type} • {q.points} điểm
              </div>
            </div>
            
            {q.type === 'short_answer' ? (
              <div className="text-sm text-gray-600">
                <strong>Đáp án:</strong> {q.correctAnswer}
                {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                  <div>
                    <strong>Các cách viết khác:</strong> {q.acceptedAnswers.slice(1).join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {q.answers.map((a, aidx) => (
                  <div 
                    key={a.id} 
                    className={`text-sm p-2 rounded ${
                      a.isCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                    }`}
                  >
                    {String.fromCharCode(65 + aidx)}. {a.text}
                    {a.isCorrect && ' ✓'}
                    {q.type === 'image' && a.imageUrl && (
                      <img 
                        src={a.imageUrl} 
                        alt={a.text}
                        className="w-16 h-16 object-cover rounded ml-2 inline-block"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {q.explanation && (
              <div className="mt-2 text-sm text-gray-600">
                <strong>Giải thích:</strong> {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewStep;

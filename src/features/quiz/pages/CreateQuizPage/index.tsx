import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../lib/store';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';
import { toast } from 'react-toastify';
import Button from '../../../../shared/components/ui/Button';

import { QuizFormData, Question } from './types';
import { defaultQuiz, steps } from './constants';
import { generateId } from './utils';
import QuizInfoStep from './components/QuizInfoStep';
import QuestionsStep from './components/QuestionsStep';
import ReviewStep from './components/ReviewStep';

const CreateQuizPage: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [quiz, setQuiz] = useState<QuizFormData>(defaultQuiz);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Thêm câu hỏi mới
  const addQuestion = () => {
    setQuiz(q => ({
      ...q,
      questions: [
        ...q.questions,
        {
          id: generateId(),
          text: '',
          type: 'multiple',
          answers: [
            { id: generateId(), text: '', isCorrect: true },
            { id: generateId(), text: '', isCorrect: false },
            { id: generateId(), text: '', isCorrect: false },
            { id: generateId(), text: '', isCorrect: false },
          ],
          points: 1,
          correctAnswer: '',
          acceptedAnswers: [],
        },
      ],
    }));
  };

  // Sửa câu hỏi
  const updateQuestion = (idx: number, q: Question) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((item, i) => i === idx ? q : item),
    }));
  };

  // Xóa câu hỏi
  const deleteQuestion = (idx: number) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  // Di chuyển câu hỏi
  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= quiz.questions.length) return;
    
    setQuiz(prev => {
      const newQuestions = [...prev.questions];
      const [moved] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, moved);
      return { ...prev, questions: newQuestions };
    });
  };

  // Validate từng step
  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0:
        return !!(quiz.title && quiz.description && quiz.category && quiz.difficulty);
      case 1:
        return quiz.questions.length > 0 && quiz.questions.every(q => {
          // Kiểm tra text câu hỏi
          if (!q.text) return false;
          
          // Kiểm tra theo từng loại câu hỏi
          switch (q.type) {
            case 'short_answer':
              return !!q.correctAnswer;
            case 'boolean':
            case 'multiple':
            case 'image':
              return q.answers.some(a => a.isCorrect) && q.answers.every(a => a.text);
            default:
              return false;
          }
        });
      case 2:
        return true;
      default:
        return false;
    }
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để tạo quiz');
      return;
    }

    if (!validateStep(1)) {
      toast.error('Vui lòng hoàn thành tất cả thông tin quiz');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'quizzes'), {
        ...quiz,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublished: true,
        tags: [],
        status: 'pending', // Đặt trạng thái chờ duyệt
      });

      toast.success('Tạo quiz thành công! Quiz đang chờ admin duyệt.');
      setQuiz(defaultQuiz);
      setStep(0);
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Có lỗi xảy ra khi tạo quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
      toast.error('Vui lòng hoàn thành thông tin trước khi tiếp tục');
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tạo Quiz Mới</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((stepName, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx <= step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <span className={`ml-2 text-sm ${
                  idx <= step ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {stepName}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    idx < step ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Step content */}
          {step === 0 && <QuizInfoStep quiz={quiz} setQuiz={setQuiz} />}
          {step === 1 && (
            <QuestionsStep
              quiz={quiz}
              setQuiz={setQuiz}
              addQuestion={addQuestion}
              updateQuestion={updateQuestion}
              deleteQuestion={deleteQuestion}
              moveQuestion={moveQuestion}
            />
          )}
          {step === 2 && <ReviewStep quiz={quiz} />}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={prevStep}
              disabled={step === 0}
              variant="outline"
            >
              ← Quay lại
            </Button>

            <div className="flex gap-3">
              {step === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !validateStep(step)}
                  loading={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  🚀 Xuất bản Quiz
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!validateStep(step)}
                >
                  Tiếp tục →
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuizPage;

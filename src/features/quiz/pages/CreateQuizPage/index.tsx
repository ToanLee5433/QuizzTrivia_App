import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import ResourcesStep from './components/ResourcesStep'; // 🆕
import ReviewStep from './components/ReviewStep';

const CreateQuizPage: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [quiz, setQuiz] = useState<QuizFormData>(defaultQuiz);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Kiểm tra quyền truy cập
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.loginRequired')}</h2>
          <p className="text-gray-600">{t('createQuiz.loginRequired')}</p>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'creator' && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('messages.unauthorized')}</h2>
          <p className="text-gray-600">{t('creator.roleRequired')}</p>
        </div>
      </div>
    );
  }

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
      case 0: // Info step
        return !!(quiz.title && quiz.description && quiz.category && quiz.difficulty);
      case 1: // Resources step - BẮT BUỘC có ít nhất 1 tài liệu
        return !!(quiz.resources && quiz.resources.length > 0);
      case 2: // Questions step
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
      case 3: // Review step
        return true;
      default:
        return false;
    }
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error(t('createQuiz.loginRequired'));
      return;
    }

    if (!validateStep(1)) {
      toast.error(t('createQuiz.completeAllInfo'));
      return;
    }

    setSubmitting(true);
    try {
      // Deep clean function để loại bỏ tất cả undefined values
      const cleanValue = (value: any): any => {
        if (value === undefined || value === null) {
          return null;
        }
        if (Array.isArray(value)) {
          return value.map(cleanValue);
        }
        if (typeof value === 'object' && value !== null) {
          const cleaned: any = {};
          Object.keys(value).forEach(key => {
            const cleanedVal = cleanValue(value[key]);
            if (cleanedVal !== undefined) {
              cleaned[key] = cleanedVal;
            }
          });
          return cleaned;
        }
        return value;
      };

      // Clean up undefined values - Firestore doesn't accept undefined
      const cleanQuizData = cleanValue({
        title: quiz.title || '',
        description: quiz.description || '',
        category: quiz.category || 'general',
        difficulty: quiz.difficulty || 'easy',
        duration: quiz.duration || 15,
        questions: (quiz.questions || []).map(q => ({
          id: q.id || '',
          text: q.text || '',
          type: q.type || 'multiple',
          answers: (q.answers || []).map(a => ({
            id: a.id || '',
            text: a.text || '',
            isCorrect: a.isCorrect !== undefined ? a.isCorrect : false
          })),
          explanation: q.explanation || '',
          points: q.points !== undefined ? q.points : 1,
          imageUrl: q.imageUrl || null,
          correctAnswer: q.correctAnswer || null,
          acceptedAnswers: q.acceptedAnswers || []
        })),
        resources: (quiz.resources || []).map(r => ({
          id: r.id || '',
          type: r.type || 'video',
          title: r.title || '',
          description: r.description || '',
          url: r.url || '',
          required: r.required !== undefined ? r.required : false,
          threshold: r.threshold || {},
          learningOutcomes: r.learningOutcomes || [],
          order: r.order !== undefined ? r.order : 0,
          thumbnailUrl: r.thumbnailUrl || null,
          whyWatch: r.whyWatch || null,
          estimatedTime: r.estimatedTime || null,
          createdAt: r.createdAt || new Date(),
          updatedAt: r.updatedAt || new Date()
        })),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublished: true,
        tags: quiz.tags || [],
        imageUrl: quiz.imageUrl || null,
        isPublic: quiz.isPublic !== undefined ? quiz.isPublic : false,
        allowRetake: quiz.allowRetake !== undefined ? quiz.allowRetake : true,
        status: 'pending'
      });

      console.log('🔍 Clean quiz data:', cleanQuizData);

      await addDoc(collection(db, 'quizzes'), cleanQuizData);

      toast.success(t('createQuiz.createSuccess'));
      setQuiz(defaultQuiz);
      setStep(0);
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error(t('createQuiz.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
      toast.error(t('createQuiz.completeInfoFirst'));
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('createQuiz.title')}</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((_, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx <= step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <span className={`ml-2 text-sm ${
                  idx <= step ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {steps[idx]}
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
            <ResourcesStep
              resources={quiz.resources || []}
              onResourcesChange={(resources) => setQuiz(prev => ({ ...prev, resources }))}
            />
          )}
          {step === 2 && (
            <QuestionsStep
              quiz={quiz}
              setQuiz={setQuiz}
              addQuestion={addQuestion}
              updateQuestion={updateQuestion}
              deleteQuestion={deleteQuestion}
              moveQuestion={moveQuestion}
            />
          )}
          {step === 3 && <ReviewStep quiz={quiz} />}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={prevStep}
              disabled={step === 0}
              variant="outline"
            >
              ← {t('createQuiz.back')}
            </Button>

            <div className="flex gap-3">
              {step === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !validateStep(step)}
                  loading={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  🚀 {t('createQuiz.publish')}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!validateStep(step)}
                >
                  {t('createQuiz.continue')} →
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

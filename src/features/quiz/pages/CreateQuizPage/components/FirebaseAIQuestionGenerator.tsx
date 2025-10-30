import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Brain,
  Sparkles,
  Globe,
  Settings,
  Lightbulb
} from 'lucide-react';
import { toast } from 'react-toastify';
import { FirebaseAIService, QuestionGenerationOptions } from '../../../services/firebaseAIService';
import { Question } from '../types';
import { Question as GlobalQuestion } from '../../../types';

import { useTranslation } from 'react-i18next';
import SafeHTML from '../../../../../shared/components/ui/SafeHTML';

// Helper function to convert GlobalQuestion to local Question
const convertToLocalQuestion = (globalQuestion: GlobalQuestion): Question => {
  return {
    id: globalQuestion.id,
    text: globalQuestion.text,
    type: globalQuestion.type === 'checkbox' ? 'multiple' : globalQuestion.type as 'boolean' | 'multiple' | 'short_answer' | 'image',
    answers: globalQuestion.answers || [],
    points: globalQuestion.points || 1,
    correctAnswer: globalQuestion.explanation || '',
    acceptedAnswers: []
  };
};

interface FirebaseAIQuestionGeneratorProps {
  content: string;
  onQuestionsGenerated: (questions: Question[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseAIQuestionGenerator: React.FC<FirebaseAIQuestionGeneratorProps> = ({
  content,
  onQuestionsGenerated,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'config' | 'generate' | 'review'>('config');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [options, setOptions] = useState<QuestionGenerationOptions>({
    content: content,
    numQuestions: 5,
    difficulty: 'mixed',
    language: 'vi',
    questionTypes: ['multiple']
  });

  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    setOptions(prev => ({ ...prev, content }));
  }, [content]);

  useEffect(() => {
    if (isOpen) {
      checkFirebaseAI();
    }
  }, [isOpen]);

  const checkFirebaseAI = async () => {
    setTestingConnection(true);
    try {
      const isAvailable = await FirebaseAIService.checkAvailability();
      setConnectionStatus({
        success: isAvailable,
        message: isAvailable ? 'Firebase AI đã sẵn sàng' : 'Firebase AI chưa khả dụng'
      });
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: 'Không thể kết nối Firebase AI'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error('Vui lòng cung cấp nội dung để tạo câu hỏi');
      return;
    }

    setGenerating(true);
    setStep('generate');

    try {
      const questions = await FirebaseAIService.generateQuestions(
        {
          model: 'gemini-pro',
          temperature: 0.7,
          maxTokens: 2000
        },
        {
          ...options,
          customPrompt: customPrompt || undefined
        }
      );

      if (questions.length === 0) {
        throw new Error('Không tạo được câu hỏi nào');
      }

      setGeneratedQuestions(questions.map(convertToLocalQuestion));
      setStep('review');
      toast.success(`✅ Đã tạo ${questions.length} câu hỏi thành công!`);

    } catch (error) {
      console.error('Generate questions error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo câu hỏi';
      toast.error(errorMessage);
      setStep('config');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseQuestions = () => {
    onQuestionsGenerated(generatedQuestions);
    onClose();
    setStep('config');
    setGeneratedQuestions([]);
  };

  const handleRegenerateQuestion = async (index: number) => {
    try {
      const singleQuestion = await FirebaseAIService.generateQuestions(
        { model: 'gemini-pro', temperature: 0.8 },
        { ...options, numQuestions: 1 }
      );

      if (singleQuestion.length > 0) {
        const newQuestions = [...generatedQuestions];
        newQuestions[index] = convertToLocalQuestion(singleQuestion[0]);
        setGeneratedQuestions(newQuestions);
        toast.success('Đã tạo lại câu hỏi');
      }
    } catch (error) {
      toast.error('Không thể tạo lại câu hỏi');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Firebase AI Generator</h2>
                <p className="text-purple-100">{t('ai.description')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Connection Status */}
          {testingConnection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-blue-800">{t('ai.testingConnection')}</span>
              </div>
            </div>
          )}

          {connectionStatus && (
            <div className={`border rounded-lg p-4 mb-6 ${
              connectionStatus.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {connectionStatus.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={connectionStatus.success ? 'text-green-800' : 'text-red-800'}>
                  {connectionStatus.message}
                </span>
              </div>
            </div>
          )}

          {/* Configuration Step */}
          {step === 'config' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{t('ai.configuration')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số lượng câu hỏi
                    </label>
                    <select
                      value={options.numQuestions}
                      onChange={(e) => setOptions(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={3}>3 {t('quiz.questions')}</option>
                      <option value={5}>5 {t('quiz.questions')}</option>
                      <option value={10}>10 {t('quiz.questions')}</option>
                      <option value={15}>15 {t('quiz.questions')}</option>
                      <option value={20}>20 {t('quiz.questions')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.preview.difficulty")}
                    </label>
                    <select
                      value={options.difficulty}
                      onChange={(e) => setOptions(prev => ({ ...prev, difficulty: e.target.value as any }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="easy">{t("difficulty.easy")}</option>
                      <option value="medium">{t("difficulty.medium")}</option>
                      <option value="hard">{t("difficulty.hard")}</option>
                      <option value="mixed">Trộn lẫn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngôn ngữ
                    </label>
                    <select
                      value={options.language}
                      onChange={(e) => setOptions(prev => ({ ...prev, language: e.target.value as any }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại câu hỏi
                    </label>
                    <select
                      value={options.questionTypes?.[0] || 'multiple'}
                      onChange={(e) => setOptions(prev => ({ ...prev, questionTypes: [e.target.value as any] }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="multiple">Trắc nghiệm</option>
                      <option value="true-false">Đúng/Sai</option>
                      <option value="fill-in-blank">Điền từ</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt tùy chỉnh (tùy chọn)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập prompt tùy chỉnh để điều chỉnh cách AI tạo câu hỏi..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >{t("common.cancel")}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !connectionStatus?.success}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Tạo câu hỏi</span>
                </button>
              </div>
            </div>
          )}

          {/* Generating Step */}
          {step === 'generate' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Đang tạo câu hỏi...</h3>
              <p className="text-gray-600">Firebase AI đang phân tích nội dung và tạo câu hỏi phù hợp</p>
              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 text-blue-800">
                  <Globe className="w-5 h-5" />
                  <span>Sử dụng Vertex AI/Gemini Pro</span>
                </div>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Xem trước câu hỏi ({generatedQuestions.length})
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setStep('config')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cấu hình lại
                  </button>
                  <button
                    onClick={handleUseQuestions}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Sử dụng câu hỏi</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {generatedQuestions.map((question, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-900">Câu {index + 1}</h4>
                      <button
                        onClick={() => handleRegenerateQuestion(index)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>Tạo lại</span>
                      </button>
                    </div>
                    <p className="text-gray-800 mb-3">{question.text}</p>
                    <div className="space-y-2">
                      {question.answers.map((answer, answerIndex) => (
                        <div
                          key={answerIndex}
                          className={`p-2 rounded ${
                            answer.isCorrect 
                              ? 'bg-green-100 border border-green-300' 
                              : 'bg-white border border-gray-300'
                          }`}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + answerIndex)}.
                          </span>
                          {answer.text}
                          {answer.isCorrect && (
                            <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />
                          )}
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                        <span className="text-sm font-medium text-blue-800">Giải thích: </span>
                        <SafeHTML content={question.explanation} className="text-sm text-blue-700" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirebaseAIQuestionGenerator;

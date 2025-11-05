/**
 * Simplified AI Question Generator
 * Only uses Firebase Cloud Functions with Google Generative AI
 */

import React, { useState } from 'react';
import { 
  Bot, 
  Zap, 
  Loader2, 
  Brain,
  Sparkles,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { simpleAIService, SimpleAIConfig } from '../../../services/simpleAIService';
import { Question } from '../types';

interface SimpleAIGeneratorProps {
  content: string;
  onQuestionsGenerated: (questions: Question[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SimpleAIGenerator: React.FC<SimpleAIGeneratorProps> = ({
  content,
  onQuestionsGenerated,
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<SimpleAIConfig>({
    numQuestions: 5,
    difficulty: 'medium',
    language: 'vi',
    temperature: 0.7
  });
  
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<'config' | 'review'>('config');

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung trước khi tạo câu hỏi');
      return;
    }

    setGenerating(true);
    try {
      const result = await simpleAIService.generateQuestions(content, config);

      if (result.error) {
        toast.error(`Lỗi: ${result.error}`);
        return;
      }

      if (result.questions.length === 0) {
        toast.error('Không thể tạo câu hỏi từ nội dung này');
        return;
      }

      setGeneratedQuestions(result.questions);
      setStep('review');
      toast.success(`✨ Đã tạo ${result.questions.length} câu hỏi!`);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tạo câu hỏi');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyQuestions = () => {
    onQuestionsGenerated(generatedQuestions);
    toast.success(`Đã thêm ${generatedQuestions.length} câu hỏi vào quiz!`);
    onClose();
  };

  const handleRemoveQuestion = (questionId: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Question Generator</h2>
                <p className="text-white/80 text-sm">Powered by Google Generative AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <XCircle className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'config' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Sử dụng AI miễn phí
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Firebase Cloud Functions với Google Gemini 2.0 Flash - Tạo câu hỏi chất lượng cao từ nội dung của bạn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Number of Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Số lượng câu hỏi
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.numQuestions}
                    onChange={(e) => setConfig(prev => ({ ...prev, numQuestions: parseInt(e.target.value) || 5 }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Độ khó
                  </label>
                  <select
                    value={config.difficulty}
                    onChange={(e) => setConfig(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="easy">😊 Dễ</option>
                    <option value="medium">🤔 Trung bình</option>
                    <option value="hard">🔥 Khó</option>
                    <option value="mixed">🎯 Đa dạng</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ngôn ngữ
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="vi">🇻🇳 Tiếng Việt</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Creativity (Temperature): {config.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Chính xác</span>
                    <span>Sáng tạo</span>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nội dung ({content.length} ký tự)
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {content.substring(0, 500)}{content.length > 500 ? '...' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Đã tạo {generatedQuestions.length} câu hỏi
                </h3>
                <button
                  onClick={() => setStep('config')}
                  className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
                >
                  ← Tạo lại
                </button>
              </div>

              {generatedQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-medium mb-2">
                          {question.text}
                        </p>
                        <div className="space-y-1">
                          {question.answers.map((answer, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 text-sm p-2 rounded ${
                                answer.isCorrect
                                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {answer.isCorrect && <CheckCircle className="w-4 h-4" />}
                              <span>{answer.text}</span>
                            </div>
                          ))}
                        </div>
                        {question.explanation && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                            💡 {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(question.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 ml-2"
                      title="Xóa câu hỏi này"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Hủy
            </button>

            {step === 'config' && (
              <button
                onClick={handleGenerate}
                disabled={generating || !content.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Tạo câu hỏi
                  </>
                )}
              </button>
            )}

            {step === 'review' && (
              <button
                onClick={handleApplyQuestions}
                disabled={generatedQuestions.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                Thêm {generatedQuestions.length} câu hỏi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAIGenerator;

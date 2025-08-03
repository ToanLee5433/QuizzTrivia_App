import React, { useState } from 'react';
import { geminiAIService, GeminiAIConfig, GeminiQuestion } from '../services/geminiAIServiceBackup';
import { Question, Answer } from '../pages/CreateQuizPage/types';

interface Props {
  onQuestionsGenerated: (questions: Question[]) => void;
}

export const GeminiAIQuestionGenerator: React.FC<Props> = ({ onQuestionsGenerated }) => {
  const [config, setConfig] = useState<GeminiAIConfig>({
    topic: '',
    count: 5,
    difficulty: 'medium',
    questionTypes: ['multiple'],
    language: 'vi'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await geminiAIService.testConnection();
      setTestStatus(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    } catch (err) {
      setTestStatus(`❌ Lỗi: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  };

  const convertGeminiToAppQuestion = (geminiQ: GeminiQuestion, index: number): Question => {
    const answers: Answer[] = geminiQ.answers.map((answerText, answerIndex) => ({
      id: `${index}-${answerIndex}`,
      text: answerText,
      isCorrect: answerIndex === geminiQ.correctAnswer
    }));

    return {
      id: `gemini-${index}-${Date.now()}`,
      text: geminiQ.question,
      type: geminiQ.type === 'multiple' ? 'multiple' : 
            geminiQ.type === 'boolean' ? 'boolean' : 'short_answer',
      answers,
      explanation: geminiQ.explanation,
      points: geminiQ.difficulty === 'easy' ? 1 : geminiQ.difficulty === 'medium' ? 2 : 3
    };
  };

  const handleGenerate = async () => {
    if (!config.topic.trim()) {
      setError('Vui lòng nhập chủ đề cho câu hỏi');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const geminiQuestions = await geminiAIService.generateQuestions(config);
      const appQuestions = geminiQuestions.map(convertGeminiToAppQuestion);
      onQuestionsGenerated(appQuestions);
      
      setTestStatus(`✅ Đã tạo thành công ${appQuestions.length} câu hỏi!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(errorMessage);
      setTestStatus(`❌ ${errorMessage}`);
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          🤖 Gemini AI - Tạo câu hỏi (MIỄN PHÍ)
        </h3>
        <button
          onClick={handleTestConnection}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test kết nối
        </button>
      </div>

      {testStatus && (
        <div className={`mb-4 p-3 rounded ${
          testStatus.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {testStatus}
        </div>
      )}

      <div className="space-y-4">
        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chủ đề câu hỏi *
          </label>
          <input
            type="text"
            value={config.topic}
            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
            placeholder="VD: Lịch sử Việt Nam, Toán học lớp 12, JavaScript..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số lượng câu hỏi
            </label>
            <select
              value={config.count}
              onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 câu</option>
              <option value={10}>10 câu</option>
              <option value={15}>15 câu (tối đa miễn phí)</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Độ khó
            </label>
            <select
              value={config.difficulty}
              onChange={(e) => setConfig({ ...config, difficulty: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Question Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại câu hỏi
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.questionTypes.includes('multiple')}
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...config.questionTypes, 'multiple' as const]
                      : config.questionTypes.filter(t => t !== 'multiple');
                    setConfig({ ...config, questionTypes: types });
                  }}
                  className="mr-2"
                />
                Trắc nghiệm
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.questionTypes.includes('boolean')}
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...config.questionTypes, 'boolean' as const]
                      : config.questionTypes.filter(t => t !== 'boolean');
                    setConfig({ ...config, questionTypes: types });
                  }}
                  className="mr-2"
                />
                Đúng/Sai
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.questionTypes.includes('short_answer')}
                  onChange={(e) => {
                    const types = e.target.checked 
                      ? [...config.questionTypes, 'short_answer' as const]
                      : config.questionTypes.filter(t => t !== 'short_answer');
                    setConfig({ ...config, questionTypes: types });
                  }}
                  className="mr-2"
                />
                Điền chỗ trống
              </label>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngôn ngữ
            </label>
            <select
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading || config.questionTypes.length === 0}
          className={`w-full py-3 px-4 rounded-md font-medium ${
            isLoading || config.questionTypes.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Đang tạo câu hỏi...
            </div>
          ) : (
            `🚀 Tạo ${config.count} câu hỏi ${config.language === 'vi' ? 'Tiếng Việt' : 'English'}`
          )}
        </button>

        <div className="text-xs text-gray-500 text-center">
          💡 Sử dụng Gemini AI miễn phí - Tối đa 15 câu hỏi/lần
        </div>
      </div>
    </div>
  );
};

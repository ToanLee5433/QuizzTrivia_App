import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Brain,
  Sparkles,
  Globe,
  Shield,
  Cpu,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-toastify';
import { aiQuestionService, AIConfig, AIProvider } from '../../../services/aiQuestionService';
import { Question } from '../types';

interface ModernAIQuestionGeneratorProps {
  content: string;
  onQuestionsGenerated: (questions: Question[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ModernAIQuestionGenerator: React.FC<ModernAIQuestionGeneratorProps> = ({
  content,
  onQuestionsGenerated,
  isOpen,
  onClose
}) => {
  const [step, setStep] = useState<'provider' | 'config' | 'generate' | 'review'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  const providers = aiQuestionService.providers;

  useEffect(() => {
    if (selectedProvider) {
      const defaultConfig = aiQuestionService.createDefaultConfig(selectedProvider.id);
      setConfig(defaultConfig);
    }
  }, [selectedProvider]);

  const handleProviderSelect = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setStep('config');
    setConnectionStatus(null);
  };

  const handleTestConnection = async () => {
    if (!config) return;
    
    setTestingConnection(true);
    const result = await aiQuestionService.testConnection(config);
    setConnectionStatus(result);
    setTestingConnection(false);
    
    if (result.success) {
      toast.success('Kết nối AI thành công!');
    } else {
      toast.error(`Lỗi kết nối: ${result.message}`);
    }
  };

  const handleGenerate = async () => {
    if (!config) return;

    setGenerating(true);
    try {
      const result = await aiQuestionService.generateQuestions({
        content,
        config
      });

      if (result.error) {
        toast.error(`Lỗi tạo câu hỏi: ${result.error}`);
        return;
      }

      setGeneratedQuestions(result.questions);
      setStep('review');
      toast.success(`Đã tạo ${result.questions.length} câu hỏi!`);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tạo câu hỏi');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptQuestions = () => {
    onQuestionsGenerated(generatedQuestions);
    onClose();
    toast.success('Đã thêm câu hỏi vào quiz!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Question Generator</h2>
                <p className="text-blue-100">Tạo câu hỏi thông minh với AI</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mt-4">
            {['provider', 'config', 'generate', 'review'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-white text-purple-600' : 
                  ['provider', 'config', 'generate', 'review'].indexOf(step) > i ? 'bg-green-400 text-white' : 
                  'bg-white bg-opacity-30 text-white'
                }`}>
                  {['provider', 'config', 'generate', 'review'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 3 && <div className="w-8 h-1 bg-white bg-opacity-30 mx-2"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'provider' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Chọn AI Provider</h3>
                <p className="text-gray-600">Lựa chọn nhà cung cấp AI phù hợp với nhu cầu của bạn</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider: AIProvider) => (
                  <div
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider)}
                    className="border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`p-2 rounded-lg ${
                            provider.id === 'openai' ? 'bg-green-100 text-green-600' :
                            provider.id === 'claude' ? 'bg-orange-100 text-orange-600' :
                            provider.id === 'gemini' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {provider.id === 'openai' ? <Brain className="w-5 h-5" /> :
                             provider.id === 'claude' ? <Shield className="w-5 h-5" /> :
                             provider.id === 'gemini' ? <Globe className="w-5 h-5" /> :
                             <Cpu className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                            {provider.free && (
                              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                Miễn phí
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">{provider.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {provider.models.slice(0, 2).map((model: string) => (
                            <span key={model} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              {model}
                            </span>
                          ))}
                          {provider.models.length > 2 && (
                            <span className="text-gray-500 text-xs">+{provider.models.length - 2} more</span>
                          )}
                        </div>
                      </div>
                      <Sparkles className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'config' && config && selectedProvider && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Cấu hình AI</h3>
                <p className="text-gray-600">Tùy chỉnh cách AI tạo câu hỏi cho bạn</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* API Configuration */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">API Configuration</h4>
                  
                  {selectedProvider.requiresApiKey && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={config.apiKey || ''}
                          onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập API key..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <select
                      value={config.model}
                      onChange={(e) => setConfig({...config, model: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {selectedProvider.models.map((model: string) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature: {config.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Conservative</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  {/* Test Connection */}
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection || (selectedProvider.requiresApiKey && !config.apiKey)}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {testingConnection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {connectionStatus && (
                    <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                      connectionStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {connectionStatus.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{connectionStatus.message}</span>
                    </div>
                  )}
                </div>

                {/* Question Configuration */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Question Settings</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số câu hỏi: {config.maxQuestions}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={config.maxQuestions}
                      onChange={(e) => setConfig({...config, maxQuestions: parseInt(e.target.value)})}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Độ khó</label>
                    <select
                      value={config.difficulty}
                      onChange={(e) => setConfig({...config, difficulty: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                      <option value="mixed">Đa dạng</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại câu hỏi</label>
                    <div className="space-y-2">
                      {[
                        { id: 'multiple', label: 'Trắc nghiệm nhiều lựa chọn' },
                        { id: 'boolean', label: 'Đúng/Sai' },
                        { id: 'short_answer', label: 'Trả lời ngắn' }
                      ].map(type => (
                        <label key={type.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={config.questionTypes.includes(type.id as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfig({
                                  ...config,
                                  questionTypes: [...config.questionTypes, type.id as any]
                                });
                              } else {
                                setConfig({
                                  ...config,
                                  questionTypes: config.questionTypes.filter((t: any) => t !== type.id)
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ</label>
                    <select
                      value={config.language}
                      onChange={(e) => setConfig({...config, language: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t">
                <button
                  onClick={() => setStep('provider')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Quay lại
                </button>
                <button
                  onClick={() => setStep('generate')}
                  disabled={selectedProvider.requiresApiKey && !config.apiKey}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          )}

          {step === 'generate' && (
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Tạo câu hỏi với AI</h3>
                <p className="text-gray-600">Sẵn sàng tạo câu hỏi từ nội dung của bạn</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <h4 className="font-medium text-gray-900 mb-2">Nội dung nguồn:</h4>
                <p className="text-sm text-gray-600">{content.substring(0, 500)}...</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Cấu hình đã chọn:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Provider: {selectedProvider?.name}</p>
                  <p>• Model: {config?.model}</p>
                  <p>• Số câu hỏi: {config?.maxQuestions}</p>
                  <p>• Độ khó: {config?.difficulty}</p>
                  <p>• Loại: {config?.questionTypes.join(', ')}</p>
                </div>
              </div>

              {generating ? (
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  <p className="text-gray-600">AI đang tạo câu hỏi cho bạn...</p>
                </div>
              ) : (
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep('config')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="px-8 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo câu hỏi</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'review' && generatedQuestions.length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Review câu hỏi đã tạo</h3>
                <p className="text-gray-600">Kiểm tra và chỉnh sửa trước khi thêm vào quiz</p>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {generatedQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Câu {index + 1}</h4>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {question.type}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{question.text}</p>
                    {question.answers && (
                      <div className="space-y-1">
                        {question.answers.map((answer, aIndex) => (
                          <div
                            key={answer.id}
                            className={`flex items-center space-x-2 p-2 rounded ${
                              answer.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}
                          >
                            <span className="font-medium">
                              {String.fromCharCode(65 + aIndex)}.
                            </span>
                            <span>{answer.text}</span>
                            {answer.isCorrect && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-6 border-t">
                <button
                  onClick={() => setStep('generate')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Tạo lại
                </button>
                <button
                  onClick={handleAcceptQuestions}
                  className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Thêm vào Quiz ({generatedQuestions.length} câu)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

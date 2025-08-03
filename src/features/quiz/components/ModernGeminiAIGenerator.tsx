import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, Sparkles, X, Loader } from 'lucide-react';
import { geminiAIService, GeminiAIConfig, GeminiQuestion } from '../services/geminiAIServiceBackup';
import { Question, Answer } from '../pages/CreateQuizPage/types';

interface Props {
  onQuestionsGenerated: (questions: Question[]) => void;
}

type InputMode = 'text' | 'file' | 'image';

export const ModernGeminiAIGenerator: React.FC<Props> = ({ onQuestionsGenerated }) => {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<GeminiAIConfig>({
    topic: '',
    count: 10,
    difficulty: 'medium',
    questionTypes: ['multiple'],
    language: 'vi'
  });

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

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (file.type.includes('pdf')) {
          // Với PDF sẽ cần thư viện đặc biệt, tạm thời dùng tên file
          resolve(`[PDF Content] ${file.name} - Vui lòng nhập nội dung thủ công hoặc sử dụng OCR`);
        } else {
          resolve(result);
        }
      };
      
      reader.onerror = () => reject(new Error('Không thể đọc file'));
      
      if (file.type.includes('text') || file.type.includes('json')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError(null);

    try {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setContent(`[Hình ảnh được tải lên: ${file.name}] - AI sẽ phân tích và tạo câu hỏi dựa trên nội dung hình ảnh này.`);
      } else {
        const fileContent = await readFileContent(file);
        setContent(fileContent);
      }
      setSuccess(`✅ Đã tải lên: ${file.name}`);
    } catch (err) {
      setError(`Lỗi đọc file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleGenerate = async () => {
    if (!content.trim() && !uploadedFile) {
      setError('Vui lòng nhập nội dung hoặc tải lên file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let geminiQuestions: GeminiQuestion[];
      
      if (uploadedFile?.type.startsWith('image/') && previewUrl) {
        // Xử lý hình ảnh với Gemini Vision
        const aiConfig: GeminiAIConfig = {
          ...config,
          topic: content || 'Nội dung từ hình ảnh'
        };
        geminiQuestions = await geminiAIService.generateQuestionsFromImage(aiConfig, previewUrl);
      } else {
        // Xử lý text thông thường
        let prompt = content;
        
        if (uploadedFile && !uploadedFile.type.startsWith('image/')) {
          prompt = `Dựa trên nội dung file "${uploadedFile.name}":\n\n${content}`;
        }

        const aiConfig: GeminiAIConfig = {
          ...config,
          topic: prompt || 'Nội dung được cung cấp'
        };
        geminiQuestions = await geminiAIService.generateQuestions(aiConfig);
      }

      const appQuestions = geminiQuestions.map(convertGeminiToAppQuestion);
      
      onQuestionsGenerated(appQuestions);
      setSuccess(`🎉 Đã tạo thành công ${appQuestions.length} câu hỏi từ ${uploadedFile ? `file "${uploadedFile.name}"` : 'nội dung văn bản'}!`);
      
      // Reset form
      setContent('');
      setUploadedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(errorMessage);
    }

    setIsLoading(false);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setContent('');
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl shadow-xl">
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Gemini AI Generator
            </h2>
            <p className="text-gray-600">Tạo câu hỏi thông minh từ văn bản, file và hình ảnh</p>
          </div>
        </div>
      </div>

      {/* Input Mode Selection */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-white rounded-xl p-2 shadow-lg">
          <button
            onClick={() => setInputMode('text')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
              inputMode === 'text' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Văn bản</span>
          </button>
          <button
            onClick={() => setInputMode('file')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
              inputMode === 'file' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>File</span>
          </button>
          <button
            onClick={() => setInputMode('image')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
              inputMode === 'image' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Image className="w-5 h-5" />
            <span>Hình ảnh</span>
          </button>
        </div>
      </div>

      {/* Content Input Area */}
      <div className="mb-8">
        {inputMode === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📝 Nhập nội dung để tạo câu hỏi
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ví dụ: Lịch sử Việt Nam từ năm 1945 đến 1975, các sự kiện quan trọng..."
              className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>
        )}

        {inputMode === 'file' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📄 Tải lên file (PDF, DOCX, TXT)
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click để chọn file hoặc kéo thả vào đây</p>
              <p className="text-sm text-gray-400 mt-2">Hỗ trợ: PDF, DOCX, TXT (Tối đa 10MB)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {inputMode === 'image' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🖼️ Tải lên hình ảnh
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
              onClick={() => imageInputRef.current?.click()}
            >
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Click để chọn ảnh hoặc kéo thả vào đây</p>
              <p className="text-sm text-gray-400 mt-2">Hỗ trợ: JPG, PNG, GIF (Tối đa 5MB)</p>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* File Preview */}
        {uploadedFile && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {uploadedFile.type.startsWith('image/') ? (
                  <Image className="w-6 h-6 text-purple-600" />
                ) : (
                  <FileText className="w-6 h-6 text-purple-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {previewUrl && (
              <div className="mt-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Số lượng câu hỏi
          </label>
          <select
            value={config.count}
            onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
          >
            <option value={5}>5 câu</option>
            <option value={10}>10 câu</option>
            <option value={15}>15 câu</option>
            <option value={20}>20 câu</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Độ khó
          </label>
          <select
            value={config.difficulty}
            onChange={(e) => setConfig({ ...config, difficulty: e.target.value as any })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
        </div>
      </div>

      {/* Question Types */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Loại câu hỏi
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'multiple', label: '📝 Trắc nghiệm', icon: '🔘' },
            { value: 'boolean', label: '✅ Đúng/Sai', icon: '☑️' },
            { value: 'short_answer', label: '✍️ Điền chỗ trống', icon: '📝' }
          ].map(type => (
            <label key={type.value} className="flex items-center p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={config.questionTypes.includes(type.value as any)}
                onChange={(e) => {
                  const types = e.target.checked 
                    ? [...config.questionTypes, type.value as any]
                    : config.questionTypes.filter(t => t !== type.value);
                  setConfig({ ...config, questionTypes: types });
                }}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                config.questionTypes.includes(type.value as any)
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'border-gray-300'
              }`}>
                {config.questionTypes.includes(type.value as any) && '✓'}
              </div>
              <span className="text-sm font-medium">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
          {success}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || config.questionTypes.length === 0 || (!content.trim() && !uploadedFile)}
        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
          isLoading || config.questionTypes.length === 0 || (!content.trim() && !uploadedFile)
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-3">
            <Loader className="w-6 h-6 animate-spin" />
            <span>🤖 AI đang tạo câu hỏi...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="w-6 h-6" />
            <span>🚀 Tạo {config.count} câu hỏi với AI</span>
          </div>
        )}
      </button>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>🤖 Powered by Google Gemini AI • ⚡ Thông minh • 🎯 Chính xác</p>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { geminiAI } from '../services/geminiAI';
import { FileProcessor } from '../services/fileProcessor';
import { AI_CONFIG } from '../config/constants';
import { Sparkles, Wand2, CheckCircle, XCircle, RefreshCw, Upload, File, Image, FileText } from 'lucide-react';

interface Question {
  text: string;
  answers: Array<{
    text: string;
    isCorrect: boolean;
  }>;
}

interface AIGeneratorProps {
  onQuestionsGenerated: (questions: Question[]) => void;
}

const ClientSideAIGenerator: React.FC<AIGeneratorProps> = ({ onQuestionsGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [formData, setFormData] = useState({
    topic: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    numQuestions: 5,
    useFileContent: false
  });

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const result = await geminiAI.testConnection();
      if (result.success) {
        setConnectionStatus('connected');
        toast.success('✅ Kết nối AI thành công!');
      } else {
        setConnectionStatus('failed');
        toast.error('❌ Không thể kết nối đến AI: ' + result.message);
      }
    } catch (error) {
      setConnectionStatus('failed');
      toast.error('❌ Lỗi kết nối AI');
    } finally {
      setIsTesting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        toast.error('API key không được cấu hình');
        return;
      }

      const fileProcessor = new FileProcessor(apiKey);
      const result = await fileProcessor.processFile(file);
      
      if (result.content && !result.error) {
        setUploadedFile(file);
        setFileContent(result.content);
        setFormData(prev => ({ 
          ...prev, 
          topic: result.content?.substring(0, 100) + '...' || prev.topic,
          useFileContent: true 
        }));
        toast.success(`Đã xử lý file ${file.name} thành công!`);
      } else {
        toast.error(result.error || 'Không thể xử lý file này');
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast.error('Lỗi khi xử lý file');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setFileContent('');
    setFormData(prev => ({ ...prev, useFileContent: false }));
  };

  const generateQuestions = async () => {
    const topicToUse = formData.useFileContent && fileContent 
      ? `Dựa trên nội dung file đã tải lên: ${fileContent}. Tạo câu hỏi về: ${formData.topic}`
      : formData.topic;

    if (!topicToUse.trim()) {
      toast.error('Vui lòng nhập chủ đề hoặc tải lên file!');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await geminiAI.generateQuestions(
        topicToUse,
        formData.difficulty,
        formData.numQuestions
      );

      if (result.success && result.questions) {
        onQuestionsGenerated(result.questions);
        toast.success(`✅ ${result.message}`);
        
        // Reset form
        setFormData({
          topic: '',
          difficulty: 'easy',
          numQuestions: 5,
          useFileContent: false
        });
        
        // Reset file state
        setUploadedFile(null);
        setFileContent('');
      } else {
        toast.error('❌ ' + result.error);
      }
    } catch (error) {
      console.error('Generate questions error:', error);
      toast.error('❌ Có lỗi xảy ra khi tạo câu hỏi');
    } finally {
      setIsGenerating(false);
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢 Dễ';
      case 'medium': return '🟡 Trung bình';
      case 'hard': return '🔴 Khó';
      default: return difficulty;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Sparkles className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">🤖 AI Generator (Client-side)</h3>
            <p className="text-sm text-gray-600">Tạo câu hỏi tự động bằng Google Gemini AI</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getConnectionIcon()}
          <button
            onClick={testConnection}
            disabled={isTesting}
            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            {isTesting ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Test kết nối
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📚 Chủ đề
          </label>
          <input
            type="text"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="VD: JavaScript, Lịch sử Việt Nam, Toán học..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* File Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 transition-colors">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  📎 Tải lên file để AI phân tích
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Hỗ trợ: Ảnh (JPG, PNG), PDF, Word (DOC, DOCX), Text (TXT)
                </span>
                <span className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <Upload className="w-4 h-4 mr-2" />
                  Chọn file
                </span>
              </label>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
              />
            </div>
          </div>

          {/* Display uploaded file */}
          {uploadedFile && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {uploadedFile.type.startsWith('image/') ? (
                    <Image className="w-5 h-5 text-green-600" />
                  ) : uploadedFile.type === 'application/pdf' ? (
                    <FileText className="w-5 h-5 text-red-600" />
                  ) : uploadedFile.type.includes('document') || uploadedFile.type.includes('word') ? (
                    <File className="w-5 h-5 text-blue-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-green-800">{uploadedFile.name}</p>
                    <p className="text-xs text-green-600">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB - Đã xử lý thành công
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeUploadedFile}
                  className="text-green-600 hover:text-green-800"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessingFile && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm text-blue-700">Đang xử lý file...</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Difficulty Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Độ khó
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="easy">🟢 Dễ</option>
              <option value="medium">🟡 Trung bình</option>
              <option value="hard">🔴 Khó</option>
            </select>
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔢 Số câu hỏi
            </label>
            <select
              value={formData.numQuestions}
              onChange={(e) => setFormData({ ...formData, numQuestions: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={3}>3 câu</option>
              <option value={5}>5 câu</option>
              <option value={10}>10 câu</option>
              <option value={15}>15 câu</option>
              <option value={20}>20 câu</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateQuestions}
          disabled={isGenerating || (!formData.topic.trim() && !fileContent)}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Đang tạo câu hỏi...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Tạo {formData.numQuestions} câu hỏi {getDifficultyLabel(formData.difficulty)}
              {formData.useFileContent && ' từ file'}
            </>
          )}
        </button>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Thông tin:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Sử dụng Google Gemini AI miễn phí</li>
            <li>• Không cần Firebase Functions</li>
            <li>• Chạy trực tiếp trên trình duyệt</li>
            <li>• <strong>Mới:</strong> Hỗ trợ đọc file ảnh, PDF, Word, Text</li>
            <li>• Free tier: {AI_CONFIG.maxRequestsPerMinute} requests/phút</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClientSideAIGenerator;

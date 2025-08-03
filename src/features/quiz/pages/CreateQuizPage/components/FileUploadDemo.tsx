import React from 'react';
import AdvancedFileUpload from './AdvancedFileUpload';
import { Question } from '../types';

const FileUploadDemo: React.FC = () => {
  const handleQuestionsImported = (questions: Question[]) => {
    console.log('🎯 Demo: Imported questions:', questions);
    alert(`Demo: Đã import ${questions.length} câu hỏi từ AI!`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🚀 Advanced File Upload Demo
          </h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Tính năng hỗ trợ:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">🖼️ Hình ảnh (OCR)</h3>
                <p className="text-blue-600 text-sm">
                  .jpg, .png, .gif, .bmp, .webp
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">📄 Tài liệu</h3>
                <p className="text-green-600 text-sm">
                  .pdf, .doc, .docx, .txt, .rtf
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">📊 Bảng tính</h3>
                <p className="text-purple-600 text-sm">
                  .csv, .xlsx, .xls
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🤖 AI Providers:
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="font-semibold text-gray-800">OpenAI</div>
                <div className="text-sm text-gray-600">GPT-3.5/4</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="font-semibold text-gray-800">Claude</div>
                <div className="text-sm text-gray-600">Anthropic</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="font-semibold text-gray-800">Gemini</div>
                <div className="text-sm text-gray-600">Google</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="font-semibold text-gray-800">Local AI</div>
                <div className="text-sm text-gray-600">Ollama</div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📋 Workflow:
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <span className="text-gray-700">Upload File</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <span className="text-gray-700">Preview Content</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <span className="text-gray-700">AI Generate</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 mx-4"></div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
                <span className="text-gray-700">Review & Import</span>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Thử nghiệm tính năng:
            </h3>
            <AdvancedFileUpload onQuestionsImported={handleQuestionsImported} />
          </div>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Lưu ý quan trọng:</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• Cần API key để sử dụng AI providers (OpenAI, Claude, Gemini)</li>
              <li>• Local AI cần cài đặt Ollama trước</li>
              <li>• File size tối đa: 50MB</li>
              <li>• OCR hoạt động tốt nhất với hình ảnh rõ nét, text dễ đọc</li>
              <li>• AI-generated questions nên được review trước khi sử dụng</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadDemo;

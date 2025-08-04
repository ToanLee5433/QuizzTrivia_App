import React from 'react';
import ClientSideAIGenerator from '../components/ClientSideAIGenerator';

const TestAIPage: React.FC = () => {
  const handleQuestionsGenerated = (questions: any[]) => {
    console.log('✅ Questions generated:', questions);
    alert(`Đã tạo thành công ${questions.length} câu hỏi! Kiểm tra console để xem chi tiết.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🧪 Test AI Generator (Client-side)
          </h1>
          <p className="text-lg text-gray-600">
            Test tính năng tạo câu hỏi bằng Google Gemini AI miễn phí
          </p>
        </div>

        <div className="space-y-6">
          {/* AI Generator */}
          <ClientSideAIGenerator onQuestionsGenerated={handleQuestionsGenerated} />

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-bold text-green-600 mb-4">✅ Ưu điểm</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Miễn phí:</strong> Sử dụng Google Gemini API free tier</li>
                <li>• <strong>Không cần server:</strong> Chạy trực tiếp trên browser</li>
                <li>• <strong>Không cần Firebase Functions:</strong> Tiết kiệm chi phí</li>
                <li>• <strong>Real-time:</strong> Phản hồi nhanh</li>
                <li>• <strong>60 requests/phút:</strong> Giới hạn khá cao</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-bold text-orange-600 mb-4">⚠️ Lưu ý</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>API Key exposed:</strong> Có thể thấy trong client</li>
                <li>• <strong>Rate limiting:</strong> 60 requests/phút</li>
                <li>• <strong>Network dependency:</strong> Cần kết nối internet</li>
                <li>• <strong>CORS:</strong> Có thể gặp vấn đề CORS</li>
                <li>• <strong>Client-side only:</strong> Không chạy được offline</li>
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-4">📖 Hướng dẫn sử dụng</h3>
            <ol className="space-y-2 text-sm text-blue-700">
              <li><strong>1.</strong> Nhấn "Test kết nối" để kiểm tra API</li>
              <li><strong>2.</strong> Nhập chủ đề bạn muốn tạo câu hỏi</li>
              <li><strong>3.</strong> Chọn độ khó và số câu hỏi</li>
              <li><strong>4.</strong> Nhấn "Tạo câu hỏi" và đợi kết quả</li>
              <li><strong>5.</strong> Kiểm tra console để xem JSON response</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAIPage;

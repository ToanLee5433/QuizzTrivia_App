import React from 'react';
import RichTextViewer from '../../../../../shared/components/ui/RichTextViewer';
import { QuizFormData } from '../types';
import { FileText, Video, Image as ImageIcon, Music, Link as LinkIcon, Presentation, Clock, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

import { useTranslation } from 'react-i18next';
interface ReviewStepProps {
  quiz: QuizFormData;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ quiz }) => {
  const { t } = useTranslation();

  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
  const stripHtml = (value?: string) => (value || '').replace(/<\/?p>/gi, '').replace(/<[^>]*>/g, '').trim();

  // Helper để lấy icon theo loại tài liệu
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      case 'slides': return <Presentation className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Helper để lấy màu badge theo loại tài liệu
  const getResourceBadgeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
      case 'image': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'audio': return 'bg-green-100 text-green-700 border-green-200';
      case 'link': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'slides': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quiz Info Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-blue-900 mb-4 text-xl flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6" />
          {t("createQuiz.steps.info")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">📝 Tiêu đề:</strong> 
            <p className="text-gray-900 mt-1">{stripHtml(quiz.title)}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">📂 Danh mục:</strong> 
            <p className="text-gray-900 mt-1">{quiz.category}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">⚡ Độ khó:</strong> 
            <p className="text-gray-900 mt-1 capitalize">{quiz.difficulty}</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">⏱️ Thời gian:</strong> 
            <p className="text-gray-900 mt-1">{quiz.duration} phút</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">❓ Số câu hỏi:</strong> 
            <p className="text-gray-900 mt-1">{quiz.questions.length} câu</p>
          </div>
          <div className="bg-white/80 p-3 rounded-lg">
            <strong className="text-gray-700">🎯 Tổng điểm:</strong> 
            <p className="text-gray-900 mt-1">{totalPoints} điểm</p>
          </div>
        </div>
        {quiz.description && (
          <div className="mt-4 bg-white/80 p-4 rounded-lg">
            <strong className="text-gray-700">📄 Mô tả:</strong> 
            <div className="mt-2 text-gray-900">
              <RichTextViewer content={quiz.description} />
            </div>
          </div>
        )}
      </div>

      {/* Learning Resources Section */}
      {quiz.resources && quiz.resources.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-emerald-900 text-xl flex items-center gap-2">
              <FileText className="w-6 h-6" />
              📚 Tài liệu học tập
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm font-bold">
                {quiz.resources.length} tài liệu
              </span>
              {quiz.resources.some((r: any) => r.required) && (
                <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Có tài liệu bắt buộc
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {quiz.resources.map((resource: any, idx: number) => (
              <div 
                key={resource.id || idx} 
                className="bg-white rounded-xl p-4 border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon & Number */}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl border-2 ${getResourceBadgeColor(resource.type)}`}>
                      {getResourceIcon(resource.type)}
                    </div>
                    <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-gray-900 text-lg leading-tight">{resource.title}</h4>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 flex-shrink-0 ${getResourceBadgeColor(resource.type)}`}>
                        {resource.type.toUpperCase()}
                      </span>
                    </div>
                    
                    {resource.description && (
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{resource.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {resource.required && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-bold border-2 border-red-300">
                          <AlertCircle className="w-4 h-4" />
                          BẮT BUỘC
                        </span>
                      )}
                      {resource.estimatedTime && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-200">
                          <Clock className="w-4 h-4" />
                          {resource.estimatedTime} phút
                        </span>
                      )}
                      {resource.url && (
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-sm hover:shadow-md"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Xem tài liệu
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Warning for Required Resources */}
          {quiz.resources.some((r: any) => r.required) && (
            <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <p className="text-sm text-amber-900 font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>Lưu ý: Quiz này có {quiz.resources.filter((r: any) => r.required).length} tài liệu <strong>BẮT BUỘC</strong> học viên phải xem trước khi làm bài!</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Questions List Section */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 text-xl mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-gray-700" />
          Danh sách câu hỏi ({quiz.questions.length} câu)
        </h3>
        <div className="space-y-4">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white font-bold rounded-lg flex-shrink-0">
                  {idx + 1}
                </span>
                <h4 className="font-bold text-gray-900 text-base leading-tight">
                  {q.text}
                </h4>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">
                  {q.type}
                </span>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200">
                  {q.points} điểm
                </span>
              </div>
            </div>
            
            {q.type === 'short_answer' ? (
              <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <strong className="text-blue-900">✅ Đáp án:</strong> <span className="font-semibold">{q.correctAnswer}</span>
                {q.acceptedAnswers && q.acceptedAnswers.length > 1 && (
                  <div className="mt-1">
                    <strong className="text-blue-900">📝 Các cách viết khác:</strong> {q.acceptedAnswers.slice(1).join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {q.answers.map((a, aidx) => (
                  <div 
                    key={a.id} 
                    className={`text-sm p-3 rounded-lg font-medium transition-colors ${
                      a.isCorrect 
                        ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold ${
                        a.isCorrect ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'
                      }`}>
                        {String.fromCharCode(65 + aidx)}
                      </span>
                      <span>{a.text}</span>
                      {a.isCorrect && <span className="ml-auto text-green-600 font-bold">✓ ĐÚNG</span>}
                    </div>
                    {q.type === 'image' && a.imageUrl && (
                      <img 
                        src={a.imageUrl} 
                        alt={a.text}
                        className="w-20 h-20 object-cover rounded-lg mt-2 border-2 border-white shadow-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {q.explanation && (
              <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
                <strong className="text-amber-900 text-sm">💡 Giải thích:</strong>
                <p className="text-sm text-amber-800 mt-1">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;

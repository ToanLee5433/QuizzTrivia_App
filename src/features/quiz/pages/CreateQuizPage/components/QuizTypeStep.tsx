import React from 'react';
import { BookOpen, Zap, GraduationCap, Target, Clock, TrendingUp } from 'lucide-react';

interface QuizTypeStepProps {
  selectedType?: 'with-materials' | 'standard';
  onTypeSelect: (type: 'with-materials' | 'standard') => void;
}

const QuizTypeStep: React.FC<QuizTypeStepProps> = ({ selectedType, onTypeSelect }) => {

  const quizTypes = [
    {
      id: 'with-materials' as const,
      icon: BookOpen,
      title: 'Quiz với Tài Liệu Học',
      subtitle: 'Learn → Test Flow',
      description: 'Học viên sẽ học tài liệu trước khi làm quiz. Phù hợp cho nội dung giáo dục chuyên sâu.',
      gradient: 'from-purple-500 via-pink-500 to-red-500',
      features: [
        { icon: GraduationCap, text: 'Tài liệu học tập đa dạng (Video, PDF, Slides)' },
        { icon: Target, text: 'Theo dõi tiến độ học chi tiết' },
        { icon: TrendingUp, text: 'Tỷ lệ hoàn thành cao hơn 45%' },
      ],
      badge: 'Recommended',
      badgeColor: 'bg-purple-500',
    },
    {
      id: 'standard' as const,
      icon: Zap,
      title: 'Quiz Trực Tiếp',
      subtitle: 'Quick Test Flow',
      description: 'Học viên làm quiz ngay lập tức. Phù hợp cho bài kiểm tra nhanh, đánh giá kiến thức.',
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      features: [
        { icon: Clock, text: 'Truy cập nhanh chóng, không chờ đợi' },
        { icon: Zap, text: 'Trải nghiệm gọn nhẹ, tập trung' },
        { icon: Target, text: 'Đánh giá kiến thức tức thì' },
      ],
      badge: 'Fast',
      badgeColor: 'bg-blue-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          🎯 Chọn Loại Quiz
        </h2>
        <p className="text-base leading-7 text-gray-600 max-w-2xl mx-auto">
          Chọn loại quiz phù hợp với mục tiêu của bạn. Bạn có thể thay đổi sau này.
        </p>
      </div>

      {/* Quiz Type Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {quizTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <button
              key={type.id}
              onClick={() => onTypeSelect(type.id)}
              className={`
                relative group text-left p-6 rounded-2xl border-2 transition-all duration-300
                ${isSelected
                  ? 'border-transparent shadow-2xl scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-[1.01]'
                }
              `}
            >
              {/* Background Gradient */}
              <div
                className={`
                  absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
                  bg-gradient-to-br ${type.gradient}
                  ${isSelected ? 'opacity-10' : 'group-hover:opacity-5'}
                `}
              />

              {/* Selected Border Gradient */}
              {isSelected && (
                <div
                  className={`
                    absolute inset-0 rounded-2xl bg-gradient-to-br ${type.gradient}
                    -z-10
                  `}
                />
              )}

              <div className="relative space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        bg-gradient-to-br ${type.gradient} text-white
                        shadow-lg transform transition-transform duration-300
                        ${isSelected ? 'scale-110 rotate-6' : 'group-hover:scale-105'}
                      `}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {type.title}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {type.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Badge */}
                  <span
                    className={`
                      ${type.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full
                      transform transition-transform duration-300
                      ${isSelected ? 'scale-110' : 'group-hover:scale-105'}
                    `}
                  >
                    {type.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm leading-6 text-gray-600">
                  {type.description}
                </p>

                {/* Features */}
                <div className="space-y-2 pt-2">
                  {type.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <FeatureIcon
                          className={`
                            w-4 h-4 flex-shrink-0
                            ${isSelected ? 'text-purple-600' : 'text-gray-400'}
                          `}
                        />
                        <span className="text-sm text-gray-700">{feature.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="pt-3 flex items-center gap-2 text-purple-600 font-semibold">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                    <span className="text-sm">✓ Đã chọn</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">💡</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-gray-900">Mẹo chọn loại quiz phù hợp</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Quiz với Tài Liệu:</strong> Dùng khi bạn muốn dạy kiến thức mới, training nhân viên, hoặc khóa học online</li>
                <li>• <strong>Quiz Trực Tiếp:</strong> Dùng cho bài kiểm tra nhanh, đánh giá kiến thức sẵn có, hoặc game giải trí</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {selectedType && (
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 pt-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {selectedType === 'with-materials' ? '78%' : '92%'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Hoàn thành</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {selectedType === 'with-materials' ? '4.8★' : '4.5★'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Đánh giá</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">
              {selectedType === 'with-materials' ? '25m' : '8m'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Thời gian TB</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTypeStep;

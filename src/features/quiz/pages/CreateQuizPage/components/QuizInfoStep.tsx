import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuizFormData } from '../types';
import { categories, difficulties } from '../constants';
import RichTextEditor from '../../../../../shared/components/ui/RichTextEditor';
import RichTextViewer from '../../../../../shared/components/ui/RichTextViewer';
import ImageUploader from '../../../../../components/ImageUploader';
import { BookOpen, Clock, Tag, Star, FileText, ImageIcon, Globe, Lock } from 'lucide-react';

interface QuizInfoStepProps {
  quiz: QuizFormData;
  setQuiz: React.Dispatch<React.SetStateAction<QuizFormData>>;
}

const QuizInfoStep: React.FC<QuizInfoStepProps> = ({ quiz, setQuiz }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t('createQuiz.info.basicInfo')}</h2>
        <p className="text-gray-600">{t('createQuiz.info.fillInfo')}</p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText className="w-4 h-4" />
            {t('createQuiz.info.titleLabel')}
          </label>
          <input
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
            placeholder={t('createQuiz.info.titlePlaceholder')}
            value={quiz.title}
            onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText className="w-4 h-4" />
            {t('createQuiz.info.descriptionLabel')}
          </label>
          <RichTextEditor
            value={quiz.description}
            onChange={(value: string) => setQuiz(q => ({ ...q, description: value }))}
            placeholder={t('createQuiz.info.descriptionPlaceholder')}
            height={200}
          />
        </div>

        {/* Category & Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Tag className="w-4 h-4" />
              {t('createQuiz.info.categoryLabel')}
            </label>
            <select
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={quiz.category}
              onChange={e => setQuiz(q => ({ ...q, category: e.target.value }))}
            >
              <option value="">{t('createQuiz.info.categoryPlaceholder')}</option>
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Star className="w-4 h-4" />
              {t('createQuiz.info.difficultyLabel')}
            </label>
            <select
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={quiz.difficulty}
              onChange={e => setQuiz(q => ({ ...q, difficulty: e.target.value }))}
            >
              <option value="">{t('createQuiz.info.difficultyPlaceholder')}</option>
              {difficulties.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration only */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock className="w-4 h-4" />
            {t('createQuiz.info.durationLabel')}
          </label>
          <input
            type="number"
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            min={5}
            max={120}
            value={quiz.duration}
            onChange={e => setQuiz(q => ({ ...q, duration: parseInt(e.target.value) || 15 }))}
            placeholder="15"
          />
          <p className="text-sm text-gray-500">Từ 5 đến 120 phút</p>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Tag className="w-4 h-4" />
            Tags (tùy chọn)
          </label>
          <input
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Nhập tags, cách nhau bằng dấu phẩy..."
            value={quiz.tags?.join(', ') || ''}
            onChange={e => setQuiz(q => ({ 
              ...q, 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
            }))}
          />
          <p className="text-sm text-gray-500">Ví dụ: javascript, react, frontend</p>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <ImageIcon className="w-4 h-4" />
            Ảnh bìa Quiz
          </label>
          
          {/* Tab chọn Upload hoặc URL */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                const uploadMode = document.getElementById('upload-mode');
                const urlMode = document.getElementById('url-mode');
                if (uploadMode && urlMode) {
                  uploadMode.classList.remove('hidden');
                  urlMode.classList.add('hidden');
                }
              }}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              📤 Upload ảnh
            </button>
            <button
              type="button"
              onClick={() => {
                const uploadMode = document.getElementById('upload-mode');
                const urlMode = document.getElementById('url-mode');
                if (uploadMode && urlMode) {
                  uploadMode.classList.add('hidden');
                  urlMode.classList.remove('hidden');
                }
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              🔗 Nhập URL
            </button>
          </div>

          {/* Upload Mode */}
          <div id="upload-mode">
            <ImageUploader
              onUploadSuccess={(result) => {
                if (result.success && result.originalUrl) {
                  setQuiz(q => ({ ...q, imageUrl: result.originalUrl! }));
                }
              }}
              onUploadError={(error) => {
                console.error('Upload error:', error);
              }}
              options={{
                folder: 'covers',
                maxSizeKB: 3072, // 3MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
                generateThumbnails: true
              }}
              previewUrl={quiz.imageUrl || undefined}
              label=""
              showThumbnails={false}
              compressBeforeUpload={true}
              instantUpload={true}
              ultraFast={true}
            />
          </div>

          {/* URL Mode */}
          <div id="url-mode" className="hidden">
            <input
              type="url"
              value={quiz.imageUrl || ''}
              onChange={(e) => setQuiz(q => ({ ...q, imageUrl: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {quiz.imageUrl && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <img 
                  src={quiz.imageUrl} 
                  alt="Cover preview" 
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL';
                  }}
                />
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            💡 Ảnh bìa giúp quiz thu hút hơn. Upload siêu nhanh 1-3s hoặc dùng URL!
          </p>
        </div>

        {/* Privacy Settings - Public/Private */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Globe className="w-4 h-4" />
            Quyền riêng tư
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Public Option */}
            <button
              type="button"
              onClick={() => setQuiz(q => ({ ...q, isPublic: true }))}
              className={`relative p-4 border-2 rounded-xl transition-all ${
                quiz.isPublic === true
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  quiz.isPublic === true ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <Globe className={`w-5 h-5 ${
                    quiz.isPublic === true ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className={`font-semibold mb-1 ${
                    quiz.isPublic === true ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    🌍 Public (Công khai)
                  </h4>
                  <p className="text-sm text-gray-600">
                    Mọi người đều có thể tìm kiếm và làm quiz này
                  </p>
                </div>
                {quiz.isPublic === true && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>

            {/* Private Option */}
            <button
              type="button"
              onClick={() => setQuiz(q => ({ ...q, isPublic: false }))}
              className={`relative p-4 border-2 rounded-xl transition-all ${
                quiz.isPublic === false
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-purple-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  quiz.isPublic === false ? 'bg-purple-500' : 'bg-gray-200'
                }`}>
                  <Lock className={`w-5 h-5 ${
                    quiz.isPublic === false ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className={`font-semibold mb-1 ${
                    quiz.isPublic === false ? 'text-purple-900' : 'text-gray-900'
                  }`}>
                    🔒 Private (Riêng tư)
                  </h4>
                  <p className="text-sm text-gray-600">
                    Chỉ bạn và người có link mới truy cập được
                  </p>
                </div>
                {quiz.isPublic === false && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Info message */}
          <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
            quiz.isPublic === true 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-purple-50 border border-purple-200'
          }`}>
            <div className="mt-0.5">
              {quiz.isPublic === true ? '🌍' : '🔒'}
            </div>
            <p className={quiz.isPublic === true ? 'text-blue-800' : 'text-purple-800'}>
              {quiz.isPublic === true 
                ? 'Quiz công khai sẽ xuất hiện trong danh sách tìm kiếm và trang chủ, giúp nhiều người tham gia hơn.'
                : 'Quiz riêng tư chỉ những người có link trực tiếp mới có thể truy cập. Thích hợp cho quiz nội bộ hoặc chia sẻ với nhóm nhỏ.'
              }
            </p>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Star className="w-4 h-4" />
            Cài đặt bổ sung
          </label>
          
          <div className="space-y-2">
            {/* Allow Retake */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="allowRetake"
                checked={quiz.allowRetake !== false}
                onChange={(e) => setQuiz(q => ({ ...q, allowRetake: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="allowRetake" className="flex-1 cursor-pointer">
                <div className="font-medium text-gray-900">🔄 Cho phép làm lại</div>
                <p className="text-sm text-gray-600 mt-0.5">
                  Học viên có thể làm quiz nhiều lần để cải thiện điểm
                </p>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">📋 {t('createQuiz.info.preview')}</h3>
        <div className="space-y-2 text-sm">
          <p><strong>{t('quiz.title')}:</strong> {quiz.title || t('createQuiz.info.noTitle')}</p>
          <div>
            <strong>{t('quiz.description')}:</strong>{' '}
            {quiz.description ? (
              <RichTextViewer content={quiz.description} />
            ) : (
              <span>{t('createQuiz.info.noDescription')}</span>
            )}
          </div>
          <p><strong>{t('quiz.category')}:</strong> {quiz.category || t('createQuiz.info.noCategory')}</p>
          <p><strong>{t('quiz.difficulty')}:</strong> {quiz.difficulty || t('createQuiz.info.noDifficulty')}</p>
          <p><strong>{t('quiz.duration')}:</strong> {quiz.duration} {t('minutes')}</p>
          <p>
            <strong>Quyền riêng tư:</strong>{' '}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
              quiz.isPublic === true 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              {quiz.isPublic === true ? (
                <>🌍 Công khai</>
              ) : (
                <>🔒 Riêng tư</>
              )}
            </span>
          </p>
          <p>
            <strong>Làm lại:</strong>{' '}
            {quiz.allowRetake !== false ? '✅ Cho phép' : '❌ Không cho phép'}
          </p>
          {quiz.tags && quiz.tags.length > 0 && (
            <p><strong>Tags:</strong> {quiz.tags.join(', ')}</p>
          )}
          {quiz.imageUrl && (
            <div className="mt-3">
              <p><strong>{t('createQuiz.info.previewImage')}</strong></p>
              <img src={quiz.imageUrl} alt="Preview" className="mt-2 w-32 h-20 object-cover rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizInfoStep;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuizFormData } from '../types';
import { categories, difficulties } from '../constants';
import RichTextEditor from '../../../../../shared/components/ui/RichTextEditor';
import RichTextViewer from '../../../../../shared/components/ui/RichTextViewer';
import ImageUploader from '../../../../../components/ImageUploader';
import { BookOpen, Clock, Tag, Star, FileText, ImageIcon, Lock, Key } from 'lucide-react';

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
          <p className="text-sm text-gray-500">{t('quizCreation.from5to120minutes')}</p>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Tag className="w-4 h-4" />
            {t('quizCreation.tagsOptional')}
          </label>
          <input
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder={t('placeholders.enterTags')}
            value={quiz.tags?.join(', ') || ''}
            onChange={e => setQuiz(q => ({ 
              ...q, 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
            }))}
          />
          <p className="text-sm text-gray-500">{t('quizCreation.tagsExample')}</p>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <ImageIcon className="w-4 h-4" />
            {t('quizCreation.coverImage')}
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
              {t('quizCreation.uploadImage')}
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
              {t('quizCreation.enterUrl')}
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
              placeholder={t('placeholders.imageUrl')}
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
            {t('quizCreation.coverImageHint')}
          </p>
        </div>

        {/* Password Protection */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Lock className="w-4 h-4" />
            {t('quizCreation.quizSecurity')}
          </label>
          
          {/* Have Password Checkbox */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
            <input
              type="checkbox"
              id="havePassword"
              checked={quiz.havePassword === 'password'}
              onChange={(e) => {
                setQuiz(q => ({
                  ...q,
                  havePassword: e.target.checked ? 'password' : 'public',
                  password: e.target.checked ? q.password : ''
                }));
              }}
              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <label htmlFor="havePassword" className="flex-1 cursor-pointer">
              <div className="font-semibold text-purple-900 flex items-center gap-2">
                {t('quizCreation.requirePassword')}
              </div>
              <p className="text-sm text-purple-700 mt-1">
                {t('quizCreation.quizVisibleNeedPassword')}
              </p>
            </label>
          </div>

          {/* Password Input - Show when checkbox is checked */}
          {quiz.havePassword === 'password' && (
            <div className="ml-4 space-y-2 animate-in fade-in duration-300">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Key className="w-4 h-4" />
                {t('quizCreation.passwordRequired')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={quiz.password || ''}
                  onChange={(e) => setQuiz(q => ({ ...q, password: e.target.value }))}
                  placeholder={t('placeholders.minPasswordLength')}
                  minLength={6}
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    quiz.password && quiz.password.length >= 6
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {quiz.password && quiz.password.length >= 6 ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              {quiz.password && quiz.password.length < 6 && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full" />
                  Mật khẩu phải có ít nhất 6 ký tự
                </p>
              )}
              <p className="text-xs text-gray-600">
                💡 Chia sẻ mật khẩu này với người cần làm quiz
              </p>
            </div>
          )}
        </div>

        {/* Additional Settings */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Star className="w-4 h-4" />
            {t('quizCreation.additionalSettings')}
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
            <strong>{t('quizCreation.privacy')}</strong>{' '}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
              quiz.isPublic === true 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              {quiz.isPublic === true ? (
                <>
                {t('quizCreation.public')}
              </>
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

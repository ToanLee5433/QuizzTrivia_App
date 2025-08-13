import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuizFormData } from '../types';
import { categories, difficulties } from '../constants';
import RichTextEditor from '../../../../../shared/components/ui/RichTextEditor';
import RichTextViewer from '../../../../../shared/components/ui/RichTextViewer';
import { BookOpen, Clock, Tag, Star, FileText } from 'lucide-react';

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

        {/* Image URL */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText className="w-4 h-4" />
            {t('createQuiz.info.imageLabel')}
          </label>
          <input
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder={t('createQuiz.info.imagePlaceholder')}
            value={quiz.imageUrl || ''}
            onChange={e => setQuiz(q => ({ ...q, imageUrl: e.target.value }))}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">📋 {t('createQuiz.info.preview')}</h3>
        <div className="space-y-2 text-sm">
          <p><strong>{t('quiz.title')}:</strong> {quiz.title || t('createQuiz.info.noTitle')}</p>
          <div><strong>{t('quiz.description')}:</strong> <RichTextViewer content={quiz.description || t('createQuiz.info.noDescription')} /></div>
          <p><strong>{t('quiz.category')}:</strong> {quiz.category || t('createQuiz.info.noCategory')}</p>
          <p><strong>{t('quiz.difficulty')}:</strong> {quiz.difficulty || t('createQuiz.info.noDifficulty')}</p>
          <p><strong>{t('quiz.duration')}:</strong> {quiz.duration} {t('minutes')}</p>
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

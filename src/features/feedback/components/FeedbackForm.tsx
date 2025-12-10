import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FeedbackType } from '../types';
import { createFeedback } from '../services/feedbackService';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

interface FeedbackFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess, onCancel } = {}) => {
  const { t } = useTranslation(['feedback', 'common']);
  
  // Safe selector with fallback
  const user = useSelector((state: RootState) => state?.auth?.user ?? null);
  
  const [formData, setFormData] = useState({
    type: 'improvement' as FeedbackType,
    subject: '',
    description: '',
    richDescription: ''
  });
  
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quill modules configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  }), []);

  const feedbackTypes = useMemo(() => [
    { value: 'bug', label: `🐛 ${t('types.bug')}`, color: 'text-red-600' },
    { value: 'feature', label: `✨ ${t('types.feature')}`, color: 'text-blue-600' },
    { value: 'improvement', label: `🚀 ${t('types.improvement')}`, color: 'text-green-600' },
    { value: 'question', label: `❓ ${t('types.question')}`, color: 'text-yellow-600' },
    { value: 'other', label: `💬 ${t('types.other')}`, color: 'text-gray-600' }
  ], [t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file size (max 5MB per file)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('feedback:errors.fileTooLarge', { filename: file.name }));
        return false;
      }
      return true;
    });

    // Limit to 5 screenshots
    const newFiles = [...screenshots, ...validFiles].slice(0, 5);
    setScreenshots(newFiles);

    // Create preview URLs
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(newPreviewUrls);
  };

  const removeScreenshot = (index: number) => {
    const newFiles = screenshots.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    // Revoke old URL
    URL.revokeObjectURL(previewUrls[index]);
    
    setScreenshots(newFiles);
    setPreviewUrls(newUrls);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = t('feedback:errors.subjectRequired');
    } else if (formData.subject.length < 10) {
      newErrors.subject = t('feedback:errors.subjectMinLength');
    }

    if (!formData.description.trim() && !formData.richDescription.trim()) {
      newErrors.description = t('feedback:errors.descriptionRequired');
    } else if (formData.description.length < 20 && !formData.richDescription) {
      newErrors.description = t('feedback:errors.descriptionMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!user) {
      toast.error(t('feedback:errors.loginRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      await createFeedback(
        user.uid,
        user.email || '',
        user.displayName || 'Người dùng',
        {
          ...formData,
          screenshots
        }
      );

      toast.success(t('feedback:success.submitted'));
      
      // Reset form
      setFormData({
        type: 'improvement',
        subject: '',
        description: '',
        richDescription: ''
      });
      setScreenshots([]);
      setPreviewUrls([]);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(t('feedback:errors.submitFailed'));
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('feedback:form.title')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('feedback:subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('feedback:form.type')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {feedbackTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value as FeedbackType })}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-center
                    ${formData.type === type.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className={`text-lg font-medium ${type.color}`}>
                    {type.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              {t('feedback:form.subject')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className={`
                w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                ${errors.subject ? 'border-red-500' : 'border-gray-300'}
              `}
              placeholder={t('feedback:form.subjectPlaceholder')}
              maxLength={200}
            />
            {errors.subject && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {errors.subject}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {formData.subject.length}/200 {t('common:characters')}
            </div>
          </div>

          {/* Description (Plain Text) */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              {t('feedback:form.description')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={`
                w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                ${errors.description ? 'border-red-500' : 'border-gray-300'}
              `}
              placeholder={t('feedback:form.descriptionPlaceholder')}
              maxLength={1000}
            />
            {errors.description && (
              <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {errors.description}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {formData.description.length}/1000 {t('common:characters')}
            </div>
          </div>

          {/* Rich Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('feedback:form.richDescription')}
            </label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <ReactQuill
                theme="snow"
                value={formData.richDescription}
                onChange={(value) => setFormData({ ...formData, richDescription: value })}
                modules={quillModules}
                placeholder={t('feedback:form.richDescriptionPlaceholder')}
                className="bg-white"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('feedback:form.richDescriptionHelp')}
            </p>
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('feedback:form.screenshots')}
            </label>
            
            {/* Preview Images */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {screenshots.length < 5 && (
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                <ImageIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('feedback:form.uploadScreenshots')} ({screenshots.length}/5)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">{t('feedback:form.infoTitle')}</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>{t('feedback:form.infoItem1')}</li>
                  <li>{t('feedback:form.infoItem2')}</li>
                  <li>{t('feedback:form.infoItem3')}</li>
                  <li>{t('feedback:form.infoItem4')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                {t('common:cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('feedback:form.submitting')}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t('feedback:form.submit')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;

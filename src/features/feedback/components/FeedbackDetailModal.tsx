import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Clock, 
  User, 
  Mail,
  Calendar,
  Image as ImageIcon,
  Send,
  CheckCircle
} from 'lucide-react';
import { Feedback, FeedbackStatus, FeedbackPriority } from '../types';
import { updateFeedback } from '../services/feedbackService';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import DOMPurify from 'dompurify';

interface FeedbackDetailModalProps {
  feedback: Feedback;
  onClose: () => void;
  onUpdate: () => void;
}

const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  feedback,
  onClose,
  onUpdate
}) => {
  const { t } = useTranslation(['feedback', 'common']);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [status, setStatus] = useState<FeedbackStatus>(feedback.status);
  const [priority, setPriority] = useState<FeedbackPriority>(feedback.priority);
  const [adminResponse, setAdminResponse] = useState(feedback.adminResponse || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await updateFeedback(feedback.id, user.uid, user.displayName || 'Admin', {
        status,
        priority,
        adminResponse: adminResponse.trim() || undefined
      });

      toast.success(t('feedback:success.updated'));
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(t('feedback:errors.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600">
            <h3 className="text-xl font-bold text-white">
              {t('feedback:detail.title')}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* User Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('feedback:detail.user')}</p>
                    <p className="text-sm font-medium text-gray-900">{feedback.userName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Mail className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('feedback:detail.email')}</p>
                    <p className="text-sm font-medium text-gray-900">{feedback.userEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('feedback:detail.createdAt')}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(feedback.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Clock className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('feedback:detail.updatedAt')}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(feedback.updatedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('feedback:detail.subject')}
              </label>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900 font-medium">{feedback.subject}</p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('feedback:detail.description')}
              </label>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{feedback.description}</p>
              </div>
            </div>

            {/* Rich Description */}
            {feedback.richDescription && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('feedback:detail.detailedDescription')}
                </label>
                <div 
                  className="p-4 bg-gray-50 rounded-lg prose max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(feedback.richDescription) 
                  }}
                />
              </div>
            )}

            {/* Screenshots */}
            {feedback.screenshots && feedback.screenshots.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  {t('feedback:detail.screenshots')} ({feedback.screenshots.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {feedback.screenshots.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative group"
                    >
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                          {t('common:viewFull')}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Controls */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {t('feedback:detail.adminSection')}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('feedback:detail.status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="pending">{t('feedback:status.pending')}</option>
                    <option value="in-progress">{t('feedback:status.inProgress')}</option>
                    <option value="resolved">{t('feedback:status.resolved')}</option>
                    <option value="closed">{t('feedback:status.closed')}</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('feedback:detail.priority')}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="low">{t('feedback:priority.low')}</option>
                    <option value="medium">{t('feedback:priority.medium')}</option>
                    <option value="high">{t('feedback:priority.high')}</option>
                    <option value="critical">{t('feedback:priority.critical')}</option>
                  </select>
                </div>
              </div>

              {/* Admin Response */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('feedback:detail.adminResponse')}
                </label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={t('feedback:detail.responsePlaceholder')}
                />
              </div>

              {/* Previous Response */}
              {feedback.adminResponse && feedback.adminResponseBy && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        {t('feedback:detail.previousResponse')}
                      </p>
                      <p className="text-sm text-blue-700 mb-2">{feedback.adminResponse}</p>
                      <p className="text-xs text-blue-600">
                        {t('feedback:detail.respondedBy', { 
                          name: feedback.adminResponseBy,
                          date: feedback.adminResponseAt ? new Date(feedback.adminResponseAt).toLocaleString('vi-VN') : ''
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={isSubmitting}
            >
              {t('common:cancel')}
            </button>
            <button
              onClick={handleUpdate}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common:saving')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('common:save')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDetailModal;

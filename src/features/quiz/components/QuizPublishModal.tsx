import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface QuizPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (settings: PublishSettings) => Promise<void>;
  quizTitle: string;
  currentStatus: 'draft' | 'pending' | 'approved' | 'rejected';
}

export interface PublishSettings {
  visibility: 'public' | 'password';
  requireReview: boolean;
  password?: string;
  schedulePublish?: boolean;
  publishDate?: string;
  notifyUsers?: boolean;
}

export const QuizPublishModal: React.FC<QuizPublishModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  quizTitle,
  currentStatus
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PublishSettings>({
    visibility: 'public',
    requireReview: true,
    schedulePublish: false,
    notifyUsers: false
  });

  const handlePublish = async () => {
    try {
      setLoading(true);
      await onPublish(settings);
      onClose();
    } catch (error) {
      console.error('Error publishing quiz:', error);
      alert(t('quiz.publish.error') || 'Failed to publish quiz');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white rounded-t-2xl">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🚀 {t('quiz.publish.title') || 'Publish Quiz'}
          </h2>
          <p className="text-blue-100 mt-1">{quizTitle}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">
              {t('quiz.publish.currentStatus') || 'Current Status'}:
            </p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              currentStatus === 'draft' ? 'bg-gray-100 text-gray-800' :
              currentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              currentStatus === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {currentStatus === 'draft' ? '📝 Draft' :
               currentStatus === 'pending' ? '⏳ Pending Review' :
               currentStatus === 'approved' ? '✅ Approved' :
               '❌ Rejected'}
            </span>
          </div>

          {/* Visibility Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quiz.publish.visibility') || 'Visibility'}
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                style={{ borderColor: settings.visibility === 'public' ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={settings.visibility === 'public'}
                  onChange={(e) => setSettings({ ...settings, visibility: e.target.value as 'public' | 'password' })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">
                    🌐 {t('quiz.visibility.public') || 'Public'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('quiz.visibility.publicDesc') || 'Anyone can access this quiz'}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors"
                style={{ borderColor: settings.visibility === 'password' ? '#8b5cf6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="visibility"
                  value="password"
                  checked={settings.visibility === 'password'}
                  onChange={(e) => setSettings({ ...settings, visibility: e.target.value as 'public' | 'password' })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    🔒 {t('quiz.visibility.password') || 'Password Protected'}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    {t('quiz.visibility.passwordDesc') || 'Requires password to access'}
                  </p>
                  {settings.visibility === 'password' && (
                    <input
                      type="password"
                      placeholder={t('quiz.password.enter') || 'Enter password...'}
                      value={settings.password || ''}
                      onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Review Requirement */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireReview}
                onChange={(e) => setSettings({ ...settings, requireReview: e.target.checked })}
                className="mt-1"
              />
              <div>
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <p className="font-medium text-blue-900">
                  👨‍💼 {t('quiz.publish.requireReview') || 'Submit for Admin Review'}
                </p>
                <p className="text-sm text-blue-700">
                  {t('quiz.publish.requireReviewDesc') || 'Quiz will be reviewed by admin before going live'}
                </p>
              </div>
            </label>
          </div>

          {/* Schedule Publishing */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={settings.schedulePublish || false}
                onChange={(e) => setSettings({ ...settings, schedulePublish: e.target.checked })}
              />
              <span className="font-medium text-gray-700">
                📅 {t('quiz.publish.schedule') || 'Schedule Publishing'}
              </span>
            </label>

            {settings.schedulePublish && (
              <input
                type="datetime-local"
                value={settings.publishDate || ''}
                onChange={(e) => setSettings({ ...settings, publishDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
          </div>

          {/* Notify Users */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifyUsers || false}
              onChange={(e) => setSettings({ ...settings, notifyUsers: e.target.checked })}
            />
            <span className="text-gray-700">
              🔔 {t('quiz.publish.notifyUsers') || 'Notify followers when published'}
            </span>
          </label>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span className="font-medium">ℹ️ {t('quiz.publish.info') || 'What happens next'}:</span>
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
              {settings.requireReview ? (
                <>
                  <li>• {t('quiz.publish.step1') || 'Quiz will be submitted for review'}</li>
                  <li>• {t('quiz.publish.step2') || 'Admin will review your quiz'}</li>
                  <li>• {t('quiz.publish.step3') || 'You will be notified of the decision'}</li>
                  {settings.schedulePublish && (
                    <li>• {t('quiz.publish.step4') || 'Quiz will be published at scheduled time'}</li>
                  )}
                </>
              ) : (
                <>
                  <li>• {t('quiz.publish.immediate1') || 'Quiz will be published immediately'}</li>
                  <li>• {t('quiz.publish.immediate2') || 'Users can start taking it right away'}</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handlePublish}
            disabled={loading || (settings.visibility === 'password' && !settings.password)}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('quiz.publish.publishing') || 'Publishing...'}
              </>
            ) : (
              <>
                🚀 {settings.requireReview 
                  ? (t('quiz.publish.submitReview') || 'Submit for Review')
                  : (t('quiz.publish.publishNow') || 'Publish Now')
                }
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

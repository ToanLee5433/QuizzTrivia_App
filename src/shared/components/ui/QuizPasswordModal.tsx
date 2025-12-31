/**
 * Quiz Password Modal Component
 * Shows password input for password-protected quizzes
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Button from './Button';

interface QuizPasswordModalProps {
  isOpen: boolean;
  quizTitle: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean>;
}

const QuizPasswordModal: React.FC<QuizPasswordModalProps> = ({
  isOpen,
  quizTitle,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError(t('quiz.password.required', 'Vui lòng nhập mật khẩu'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const success = await onSubmit(password);
      
      if (success) {
        // Success - modal will close from parent
        setPassword('');
        setError('');
      } else {
        // Wrong password
        setError(t('quiz.password.wrong', 'Mật khẩu không đúng'));
        setPassword(''); // Clear for retry
      }
    } catch (err) {
      console.error('Error submitting password:', err);
      setError(t('quiz.password.error', 'Có lỗi xảy ra, vui lòng thử lại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setPassword('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {t('quiz.password.title', 'Quiz Yêu Cầu Mật Khẩu')}
            </h3>
            <p className="text-sm text-gray-500 truncate max-w-[250px]">
              {quizTitle}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">
          {t('quiz.password.description', 'Quiz này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu để tiếp tục.')}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Password Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('quiz.password.label', 'Mật khẩu')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(''); // Clear error on input
                }}
                disabled={submitting}
                placeholder={t('quiz.password.placeholder', 'Nhập mật khẩu...')}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={submitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              variant="secondary"
              className="flex-1"
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button
              type="submit"
              disabled={submitting || !password.trim()}
              loading={submitting}
              className="flex-1"
            >
              {submitting 
                ? t('quiz.password.checking', 'Đang kiểm tra...')
                : t('quiz.password.submit', 'Xác nhận')
              }
            </Button>
          </div>
        </form>

        {/* Hint */}
        <p className="text-xs text-gray-400 text-center mt-4">
          {t('quiz.password.hint', '💡 Liên hệ người tạo quiz nếu bạn chưa có mật khẩu')}
        </p>
      </div>
    </div>
  );
};

export default QuizPasswordModal;

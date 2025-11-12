import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { ArrowLeft, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ForgotPasswordProps {
  onBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      // Sử dụng Firebase sendPasswordResetEmail
      await sendPasswordResetEmail(auth, email);
      toast.success('Email đặt lại mật khẩu đã được gửi! Hãy kiểm tra hộp thư của bạn.');
      setSent(true);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('Không tìm thấy tài khoản với email này');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email không hợp lệ');
      } else {
        toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-3 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{t('auth.forgotPassword')}</h2>
        </div>

        {!sent ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t("auth.emailPlaceholder")}
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {t('auth.resetPasswordHint')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
              }`}
            >
              {loading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {t("common.back")}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{t('auth.emailSent')}</h3>
            <p className="text-sm text-gray-600">
              {t('auth.resetEmailSentTo')}<br />
              <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              {t('auth.checkInboxAndClick')}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

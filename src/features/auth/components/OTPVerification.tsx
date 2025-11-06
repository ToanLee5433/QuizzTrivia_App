import React, { useState, useEffect, useRef } from 'react';
import { verifyOTP, generateAndSendOTP, getOTPExpiryTime } from '../services/otpService';
import { toast } from 'react-toastify';
import { Mail, RefreshCw, CheckCircle, Timer, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OTPVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onCancel: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onVerificationSuccess,
  onCancel
}) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer, canResend]);

  // Calculate remaining time from expiry
  useEffect(() => {
    const expiryTime = getOTPExpiryTime(email);
    if (expiryTime) {
      const remaining = Math.floor((expiryTime - Date.now()) / 1000);
      if (remaining > 0) {
        setTimer(remaining);
      } else {
        setCanResend(true);
      }
    }
  }, [email]);

  // Handle OTP input
  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single character
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(['', '', '', '', '', '']).slice(0, 6);
    setOtp(newOtp);

    // Focus on next empty input or last input
    const nextEmptyIndex = newOtp.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : Math.min(nextEmptyIndex, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error(t('auth.otp.errors.incomplete'));
      return;
    }

    setLoading(true);
    try {
      const result = verifyOTP(email, otpCode);
      const getErrorMessage = () => {
        switch (result.code) {
          case 'otp.notFound':
            return t('auth.otp.errors.notFound');
          case 'otp.expired':
            return t('auth.otp.errors.expired');
          case 'otp.maxAttempts':
            return t('auth.otp.errors.maxAttempts');
          case 'otp.incorrect':
            return t('auth.otp.errors.incorrect', {
              remaining: result.metadata?.remaining ?? 0
            });
          default:
            return t('auth.otp.errors.generic');
        }
      };
      
      if (result.success) {
        toast.success(t('auth.otp.verifySuccess'));
        onVerificationSuccess();
      } else {
        toast.error(getErrorMessage());
        // Clear OTP on failure
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error(t('auth.otp.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const result = await generateAndSendOTP(email);
      const resendErrorKey =
        result.code === 'otp.emailFailed'
          ? 'auth.otp.errors.emailFailed'
          : 'auth.otp.errors.resend';
      
      if (result.success) {
        toast.success(t('auth.otp.resendSuccess'));
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        toast.error(t(resendErrorKey));
      }
    } catch (error) {
      toast.error(t('auth.otp.errors.resend'));
    } finally {
      setResendLoading(false);
    }
  };

  // Auto verify when all 6 digits are entered
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 6 && !loading) {
      handleVerifyOTP();
    }
  }, [otp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.emailVerification')}
          </h2>
          <p className="text-gray-600">
            {t('auth.otp.sentHint')}
          </p>
          <p className="font-semibold text-blue-600 mt-1">{email}</p>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('auth.otp.codeInputLabel')}
          </label>
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={e => handleOTPChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          {!canResend ? (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Timer className="w-4 h-4" />
              <span>{t('auth.otp.timer', { seconds: timer })}</span>
            </div>
          ) : (
            <button
              onClick={handleResendOTP}
              disabled={resendLoading}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mx-auto disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
              {resendLoading ? t('auth.otp.resendLoading') : t('auth.otp.resendAction')}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleVerifyOTP}
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('profile.authenticating')}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('auth.otp.verifyAction')}
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </button>
        </div>

        {/* Help text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{t('auth.otp.help.noCode')}</p>
          <p>{t('auth.otp.help.checkSpam')}</p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;

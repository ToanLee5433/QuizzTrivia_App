import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPassword: string;
  quizTitle: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPassword,
  quizTitle,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (attempts >= maxAttempts) {
      setError('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau.');
      return;
    }

    if (password === correctPassword) {
      setError('');
      setPassword('');
      setAttempts(0);
      onSuccess();
    } else {
      const remainingAttempts = maxAttempts - attempts - 1;
      setAttempts(prev => prev + 1);
      setError(
        remainingAttempts > 0
          ? `Mật khẩu không đúng! Còn ${remainingAttempts} lần thử.`
          : 'Mật khẩu không đúng! Đây là lần thử cuối cùng.'
      );
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setAttempts(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Quiz được bảo vệ</h3>
                <p className="text-sm text-white/80 mt-1">Nhập mật khẩu để tiếp tục</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-600 text-sm mb-2">
              Quiz: <span className="font-semibold text-gray-900">{quizTitle}</span>
            </p>
            <p className="text-gray-500 text-xs">
              Quiz này được bảo vệ bằng mật khẩu. Vui lòng liên hệ người tạo để lấy mật khẩu.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`
                    w-full h-11 px-4 pr-12 rounded-xl border-2 
                    focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all
                    ${error 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-200 focus:border-purple-500'
                    }
                  `}
                  placeholder="Nhập mật khẩu..."
                  disabled={attempts >= maxAttempts}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full" />
                  {error}
                </p>
              )}
              {attempts > 0 && attempts < maxAttempts && (
                <p className="mt-2 text-xs text-gray-500">
                  Lần thử: {attempts}/{maxAttempts}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 h-11 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!password || attempts >= maxAttempts}
                className="flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Xác nhận
              </button>
            </div>
          </form>

          {attempts >= maxAttempts && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800 text-center">
                ⚠️ Bạn đã vượt quá số lần thử cho phép. Vui lòng liên hệ người tạo quiz để được hỗ trợ.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;

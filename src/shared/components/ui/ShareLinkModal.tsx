import React, { useState } from 'react';
import { Link2, Copy, Check, X, Lock, Eye, EyeOff, Share2 } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  quizTitle: string;
  hasPassword: boolean;
  password?: string;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  quizId,
  quizTitle,
  hasPassword,
  password,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const quizLink = `${window.location.origin}/quiz/${quizId}/preview`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(quizLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  };

  const handleCopyAll = async () => {
    const textToCopy = hasPassword && password
      ? `Quiz: ${quizTitle}\nLink: ${quizLink}\nMật khẩu: ${password}`
      : `Quiz: ${quizTitle}\nLink: ${quizLink}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      if (hasPassword) setCopiedPassword(true);
      setTimeout(() => {
        setCopiedLink(false);
        setCopiedPassword(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">🎉 Quiz đã được xuất bản!</h3>
                <p className="text-sm text-white/80 mt-1">Chia sẻ quiz với học viên của bạn</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quiz Title */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Tiêu đề Quiz</p>
            <h4 className="text-lg font-bold text-gray-900">{quizTitle}</h4>
          </div>

          {/* Quiz Link */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Link2 className="w-4 h-4" />
              Link chia sẻ
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quizLink}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  copiedLink
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Password Section */}
          {hasPassword && password && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Lock className="w-4 h-4" />
                Mật khẩu quiz
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    readOnly
                    className="w-full px-4 py-3 pr-12 bg-purple-50 border border-purple-300 rounded-xl text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  onClick={handleCopyPassword}
                  className={`px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                    copiedPassword
                      ? 'bg-green-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {copiedPassword ? (
                    <>
                      <Check className="w-4 h-4" />
                      Đã copy
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Học viên cần nhập mật khẩu này để làm bài quiz
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              💡 Hướng dẫn
            </h5>
            <ul className="text-sm text-blue-800 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Quiz đang chờ admin phê duyệt. Sau khi được duyệt, quiz sẽ hiển thị công khai.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Bạn có thể chia sẻ link này với học viên. {hasPassword ? 'Họ cần nhập mật khẩu để truy cập.' : 'Họ có thể truy cập ngay.'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Quản lý quiz của bạn tại trang "My Quizzes" trong Creator Dashboard.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy tất cả thông tin
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;

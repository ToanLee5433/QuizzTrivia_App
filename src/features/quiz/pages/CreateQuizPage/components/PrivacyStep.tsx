import React, { useState } from 'react';
import { Globe, Lock, Eye, EyeOff, Share2, Key, Shield, AlertCircle } from 'lucide-react';

interface PrivacyStepProps {
  privacy: 'public' | 'password';
  password?: string;
  onChange: (field: string, value: any) => void;
}

const PrivacyStep: React.FC<PrivacyStepProps> = ({ privacy, password = '', onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordValid = privacy === 'password' ? (password && password.length >= 6) : true;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-block p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Cài đặt quyền truy cập</h2>
        <p className="text-gray-600">Chọn cách mọi người truy cập quiz của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Public Option */}
        <div 
          onClick={() => onChange('privacy', 'public')} 
          className={`cursor-pointer rounded-2xl p-6 transition-all transform hover:scale-105 ${
            privacy === 'public' 
              ? 'ring-4 ring-blue-500 ring-offset-2 shadow-2xl' 
              : 'ring-2 ring-gray-200 hover:ring-gray-300 shadow-md hover:shadow-xl'
          }`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Công khai</h3>
          <p className="text-sm text-gray-600 mb-4">Mọi người đều có thể xem và làm quiz ngay lập tức</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Hiển thị trong danh sách</span>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Có link chia sẻ</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Làm ngay không cần mật khẩu</span>
            </div>
          </div>
        </div>

        {/* Password Option */}
        <div 
          onClick={() => onChange('privacy', 'password')} 
          className={`cursor-pointer rounded-2xl p-6 transition-all transform hover:scale-105 ${
            privacy === 'password' 
              ? 'ring-4 ring-purple-500 ring-offset-2 shadow-2xl' 
              : 'ring-2 ring-gray-200 hover:ring-gray-300 shadow-md hover:shadow-xl'
          }`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Có mật khẩu</h3>
          <p className="text-sm text-gray-600 mb-4">Mọi người thấy quiz nhưng cần mật khẩu để làm bài</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-600" />
              <span>Hiển thị trong danh sách</span>
            </div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-600" />
              <span>Yêu cầu mật khẩu để làm bài</span>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-600" />
              <span>Chia sẻ link + mật khẩu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Password Input */}
      {privacy === 'password' && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 animate-in fade-in duration-300">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Đặt mật khẩu</h3>
              <p className="text-sm text-gray-600">Người dùng cần nhập mật khẩu này để làm bài</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => onChange('password', e.target.value)}
                className={`w-full h-12 px-4 pr-12 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all ${
                  isPasswordValid 
                    ? 'border-gray-200 focus:border-purple-500' 
                    : 'border-red-300 focus:border-red-500'
                }`}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {!isPasswordValid && password.length > 0 && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Mật khẩu phải có ít nhất 6 ký tự
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-1">📎 Link chia sẻ</h4>
            <p className="text-sm text-blue-800">
              {privacy === 'public' 
                ? 'Sau khi xuất bản, bạn sẽ nhận được link để chia sẻ. Mọi người click vào link sẽ làm quiz ngay lập tức.'
                : 'Sau khi xuất bản, bạn sẽ nhận được link để chia sẻ. Người dùng cần nhập mật khẩu để bắt đầu làm bài.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyStep;

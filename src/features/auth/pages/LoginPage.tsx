import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase/config';
import { signIn } from '../services';
import { toast } from 'react-toastify';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    // role luôn là 'user' khi đăng ký
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 LoginPage: Starting login process...', { email: formData.email });

    try {
      if (isLogin) {
        console.log('🔐 LoginPage: Calling custom signIn...');
        let loginSuccess = false;
        try {
          await signIn({ email: formData.email, password: formData.password });
          loginSuccess = true;
        } catch (err: any) {
          if (err.message && err.message.includes('Tài khoản đã bị khoá')) {
            setError('Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.');
            setLoading(false);
            return;
          }
          throw err;
        }
        if (loginSuccess) {
          toast.success('Đăng nhập thành công!');
        }
        // Let App routing handle the redirect automatically
        console.log('🔐 LoginPage: Login complete, App will handle redirect');
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp');
        }
        
        if (formData.password.length < 6) {
          throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
        }

        console.log('🔐 LoginPage: Creating user account...');
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        console.log('🔐 LoginPage: Creating user document...');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: formData.email,
          displayName: formData.displayName,
          // Don't set role here - let user choose in RoleSelection
          needsRoleSelection: true,
          createdAt: new Date(),
          isActive: true
        });
        toast.success('Đăng ký thành công! Hãy chọn vai trò của bạn.');
        
        // Let App routing handle the redirect automatically
        console.log('🔐 LoginPage: Registration complete, App will handle redirect');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Tài khoản đã bị khoá')) {
        setError('Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.');
        // Không hiện toast lỗi khi bị khoá
      } else {
        setError(err.message || 'Có lỗi xảy ra');
        // Không hiện toast lỗi nếu đã có error trên form
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg font-semibold relative">
              <span>{error}</span>
              <button
                type="button"
                aria-label="Đóng thông báo"
                className="absolute top-2 right-3 text-xl text-red-500 hover:text-red-700 focus:outline-none"
                onClick={() => setError('')}
              >
                ×
              </button>
            </div>
          )}
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">Q</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Chào mừng trở lại với Quiz App' : 'Tạo tài khoản mới'}
          </p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isLogin 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isLogin 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập họ và tên"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập lại mật khẩu"
                required={!isLogin}
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
            }`}
          >
            {loading 
              ? (isLogin ? 'Đang đăng nhập...' : 'Đang đăng ký...') 
              : (isLogin ? 'Đăng nhập' : 'Đăng ký')
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

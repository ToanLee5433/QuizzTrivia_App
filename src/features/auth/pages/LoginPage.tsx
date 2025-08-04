import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase/config';
import { signIn } from '../services';
import { toast } from 'react-toastify';
import { ForgotPassword } from '../components/ForgotPassword';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    // role luôn là 'user' khi đăng ký
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false); // State cho email verification

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Google Sign-in function
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Kiểm tra xem user đã có trong Firestore chưa
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Tạo user document mới
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'user',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: user.emailVerified,
          provider: 'google'
        };

        await setDoc(userDocRef, userData);
        console.log('✅ Created new user document for Google user');
      }

      toast.success('Đăng nhập Google thành công!');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error('Đăng nhập Google thất bại: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
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
          // Đăng nhập với Firebase Auth trước
          const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
          
          // KIỂM TRA EMAIL VERIFICATION - CHỈ APPLY CHO TÀI KHOẢN EMAIL/PASSWORD
          if (!userCredential.user.emailVerified && !userCredential.user.providerData.some(p => p.providerId === 'google.com')) {
            // Đăng xuất ngay lập tức nếu email chưa verify
            await auth.signOut();
            setError('⚠️ Tài khoản của bạn chưa được xác thực email. Vui lòng kiểm tra hộp thư và click vào link xác thực, sau đó thử đăng nhập lại.');
            setLoading(false);
            return;
          }
          
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
        
        // GỬI EMAIL VERIFICATION CHO TÀI KHOẢN MỚI
        console.log('� Sending email verification...');
        await sendEmailVerification(userCredential.user);
        setEmailSent(true);
        
        console.log('�🔐 LoginPage: Creating user document...');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: formData.email,
          displayName: formData.displayName,
          // Don't set role here - let user choose in RoleSelection
          needsRoleSelection: true,
          createdAt: new Date(),
          isActive: true,
          emailVerified: false // Chưa verify email
        });
        
        toast.success('Đăng ký thành công! Hãy kiểm tra email để xác thực tài khoản.');
        
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

  // Hiển thị component ForgotPassword nếu được yêu cầu
  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

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

          {emailSent && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                📧 Email xác thực đã được gửi! Hãy kiểm tra hộp thư và click vào link xác thực.
              </p>
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

          {/* Link Quên mật khẩu - chỉ hiển thị khi đang ở mode đăng nhập */}
          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc</span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium transition-colors hover:bg-gray-50 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Đăng nhập với Google</span>
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

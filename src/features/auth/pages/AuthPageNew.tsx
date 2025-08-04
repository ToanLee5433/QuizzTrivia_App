import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase/config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Chrome } from 'lucide-react';
import { generateAndSendOTP } from '../services/otpService';
import OTPVerification from '../components/OTPVerification';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    acceptTerms: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      toast.error('Vui lòng nhập email');
      return false;
    }

    if (!formData.password) {
      toast.error('Vui lòng nhập mật khẩu');
      return false;
    }

    if (!isLogin) {
      if (!formData.displayName.trim()) {
        toast.error('Vui lòng nhập tên hiển thị');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error('Mật khẩu xác nhận không khớp');
        return false;
      }

      if (formData.password.length < 6) {
        toast.error('Mật khẩu phải có ít nhất 6 ký tự');
        return false;
      }

      if (!formData.acceptTerms) {
        toast.error('Vui lòng đồng ý với điều khoản sử dụng');
        return false;
      }
    }

    return true;
  };

  const createUserDocument = async (user: User, additionalData: any = {}) => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        role: 'user',
        createdAt: new Date(),
        isActive: true,
        emailVerified: user.emailVerified,
        needsRoleSelection: true,
        ...additionalData
      });
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // First, send OTP to email
      const otpResult = await generateAndSendOTP(formData.email.trim());
      
      if (otpResult.success) {
        // Store pending user data for after OTP verification
        setPendingUserData({
          email: formData.email.trim(),
          password: formData.password,
          displayName: formData.displayName.trim()
        });
        
        setShowOTPVerification(true);
        toast.success(otpResult.message);
      } else {
        toast.error(otpResult.message);
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Có lỗi xảy ra khi gửi mã xác thực: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerificationSuccess = async () => {
    if (!pendingUserData) {
      toast.error('Không tìm thấy thông tin đăng ký');
      return;
    }

    setLoading(true);
    try {
      // Create user account after OTP verification
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        pendingUserData.email, 
        pendingUserData.password
      );

      // Create user document in Firestore (already verified)
      await createUserDocument(userCredential.user, {
        displayName: pendingUserData.displayName,
        emailVerified: true, // Already verified via OTP
        verificationMethod: 'otp'
      });

      toast.success('Đăng ký thành công! Chào mừng bạn đến với Quiz App!');
      
      // Reset form and states
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        acceptTerms: false
      });
      setPendingUserData(null);
      setShowOTPVerification(false);
      
      // Navigate to role selection or dashboard
      navigate('/role-selection');

    } catch (error: any) {
      console.error('Final registration error:', error);
      
      // Handle specific Firebase errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          toast.error('Email này đã được sử dụng');
          break;
        case 'auth/weak-password':
          toast.error('Mật khẩu quá yếu');
          break;
        case 'auth/invalid-email':
          toast.error('Email không hợp lệ');
          break;
        default:
          toast.error('Lỗi tạo tài khoản: ' + (error.message || 'Vui lòng thử lại'));
      }
      
      // Reset OTP verification state on error
      setShowOTPVerification(false);
      setPendingUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPCancel = () => {
    setShowOTPVerification(false);
    setPendingUserData(null);
    toast.info('Đã hủy quá trình đăng ký');
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );

      // Update user document with login time
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        lastLoginAt: new Date(),
        emailVerified: userCredential.user.emailVerified
      }, { merge: true });

      toast.success('Đăng nhập thành công!');
      navigate('/');

    } catch (error: any) {
      console.error('Login error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error('Email không tồn tại');
          break;
        case 'auth/wrong-password':
          toast.error('Mật khẩu không đúng');
          break;
        case 'auth/invalid-email':
          toast.error('Email không hợp lệ');
          break;
        case 'auth/user-disabled':
          toast.error('Tài khoản đã bị vô hiệu hóa');
          break;
        default:
          toast.error('Lỗi đăng nhập: ' + (error.message || 'Vui lòng thử lại'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      await createUserDocument(userCredential.user, {
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        provider: 'google',
        emailVerified: true
      });

      toast.success('Đăng nhập Google thành công!');
      navigate('/');
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error('Lỗi đăng nhập Google: ' + (error.message || 'Vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  };

  // Show OTP verification screen
  if (showOTPVerification && pendingUserData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <OTPVerification
          email={pendingUserData.email}
          onVerificationSuccess={handleOTPVerificationSuccess}
          onCancel={handleOTPCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Đăng nhập' : 'Đăng ký'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập email của bạn"
                  required
                />
              </div>
            </div>

            {/* Display Name - Only for register */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên hiển thị
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập tên hiển thị"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password - Only for register */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Xác nhận mật khẩu"
                    required={!isLogin}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Terms & Conditions - Only for register */}
            {!isLogin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  required={!isLogin}
                />
                <label className="ml-2 text-sm text-gray-600">
                  Tôi đồng ý với{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500">
                    điều khoản sử dụng
                  </a>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={isLogin ? handleLogin : handleRegister}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
            </button>

            {/* Google Login */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Chrome className="w-5 h-5" />
              Đăng nhập với Google
            </button>

            {/* Switch between login/register */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({
                    email: '',
                    password: '',
                    confirmPassword: '',
                    displayName: '',
                    acceptTerms: false
                  });
                }}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                {isLogin 
                  ? 'Chưa có tài khoản? Đăng ký ngay' 
                  : 'Đã có tài khoản? Đăng nhập'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

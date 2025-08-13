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
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Chrome } from 'lucide-react';
import { generateAndSendOTP } from '../services/otpService';
import OTPVerification from '../components/OTPVerification';
import { ForgotPassword } from '../components/ForgotPassword';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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
      toast.error(t('auth.validation.emailRequired'));
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error(t('auth.validation.emailInvalid'));
      return false;
    }

    if (!formData.password) {
      toast.error(t('auth.validation.passwordRequired'));
      return false;
    }

    if (!isLogin) {
      if (!formData.displayName.trim()) {
        toast.error(t('auth.validation.displayNameRequired'));
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error(t('auth.validation.passwordMismatch'));
        return false;
      }

      if (formData.password.length < 6) {
        toast.error(t('auth.validation.passwordTooShort'));
        return false;
      }

      if (!formData.acceptTerms) {
        toast.error(t('auth.validation.termsRequired'));
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
      toast.error(t('auth.errors.otpSendError'));
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

      toast.success(t('auth.registerSuccess'));
      
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
          toast.error(t('auth.errors.emailAlreadyInUse'));
          break;
        case 'auth/weak-password':
          toast.error(t('auth.errors.weakPassword'));
          break;
        case 'auth/invalid-email':
          toast.error(t('auth.errors.invalidEmail'));
          break;
        default:
      toast.error(t('auth.errors.registerError'));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success(t('auth.loginSuccess'));
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(t('auth.errors.googleLoginError'));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('🔐 Attempting login with email:', formData.email.trim());
      
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email.trim().toLowerCase(), // Normalize email to lowercase
        formData.password
      );

      console.log('✅ Login successful for user:', userCredential.user.uid);

      // Get user document to check role
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let redirectPath = '/dashboard'; // Default redirect
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role;
        
        console.log('👤 User role:', userRole);
        
        // Redirect based on role
        switch (userRole) {
          case 'admin':
            redirectPath = '/dashboard'; // Admin cũng vào dashboard chính
            break;
          case 'creator':
            redirectPath = '/dashboard'; // Creator cũng vào dashboard chính
            break;
          case 'user':
          default:
            redirectPath = '/dashboard';
            break;
        }
        
        // Update user document with login time
        await setDoc(userDocRef, {
          lastLoginAt: new Date(),
          emailVerified: userCredential.user.emailVerified
        }, { merge: true });
      } else {
        // Handle case where user document doesn't exist
        console.log('⚠️ User document not found, redirecting to dashboard');
      }

      toast.success(t('auth.loginSuccess'));
      console.log('🚀 Redirecting to:', redirectPath);
      navigate(redirectPath);

    } catch (error: any) {
      console.error('❌ Login error:', error.code, error.message);
      
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error(t('auth.errors.userNotFound'));
          break;
        case 'auth/wrong-password':
          toast.error(t('auth.errors.wrongPassword'));
          break;
        case 'auth/invalid-credential':
          toast.error(t('auth.errors.invalidCredential'));
          break;
        case 'auth/invalid-email':
          toast.error(t('auth.errors.invalidEmail'));
          break;
        case 'auth/user-disabled':
          toast.error(t('auth.errors.userDisabled'));
          break;
        case 'auth/too-many-requests':
          toast.error(t('auth.errors.tooManyRequests'));
          break;
        default:
          toast.error(t('auth.errors.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
          <div className="text-center">
            <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
              {isLogin ? t('auth.login') : t('auth.register')}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isLogin ? t('auth.welcomeBack') : t('auth.createNewAccount')}
            </p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Display Name - Only for register */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.displayName')}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('auth.displayNamePlaceholder')}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('auth.passwordPlaceholder')}
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
                  {t('auth.confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
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
                  {t('auth.agreeToTerms')}{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500">
                    {t('auth.termsOfService')}
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
              {loading ? t('loading') : (isLogin ? t('auth.login') : t('auth.register'))}
            </button>

            {/* Forgot Password Link - Only show for login */}
            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            {/* Google Login */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('or')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Chrome className="w-5 h-5" />
              {t('auth.loginWithGoogle')}
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
                  ? t('auth.noAccount')
                  : t('auth.hasAccount')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    );
}

export default AuthPage;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, AlertCircle } from 'lucide-react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import ErrorDisplay from './ErrorDisplay';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, password?: string) => void;
  loading?: boolean;
  error?: string;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  loading = false,
  error
}) => {
  const { t } = useTranslation();
  
  // ⚡ Auto-fill room code từ URL (nếu có)
  const pendingCode = (window as any).__pendingRoomCode || '';
  const [roomCode, setRoomCode] = useState(pendingCode);
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(!!pendingCode);
  const [step, setStep] = useState<'code' | 'password'>(pendingCode ? 'password' : 'code');
  const [checkingCode, setCheckingCode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Join room submit:', { step, roomCode, hasPassword: !!password });
    
    if (step === 'code') {
      if (!roomCode.trim()) return;
      
      // Try joining with room code first (no password)
      console.log('🚪 Attempting to join without password');
      onJoinRoom(roomCode.trim().toUpperCase());
    } else if (step === 'password') {
      if (!password.trim()) return;
      
      // Join with password
      console.log('🔑 Attempting to join with password');
      onJoinRoom(roomCode.trim().toUpperCase(), password.trim());
    }
  };

  const handleClose = () => {
    setRoomCode('');
    setPassword('');
    setShowPasswordField(false);
    setStep('code');
    // Clear pending code
    (window as any).__pendingRoomCode = undefined;
    onClose();
  };

  // ⚡ Auto-focus password field khi có pending code
  React.useEffect(() => {
    if (isOpen && pendingCode && step === 'password') {
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      if (passwordInput) {
        setTimeout(() => passwordInput.focus(), 100);
      }
    }
  }, [isOpen, pendingCode, step]);

  // Handle specific errors
  React.useEffect(() => {
    if (!error) return;
    
    console.log('❌ Join room error received:', error);
    const lower = error.toLowerCase();
    
    // Check for password-related errors in Vietnamese and English
    if (lower.includes('yêu cầu mật khẩu') || 
        lower.includes('password') || 
        lower.includes('room_requires_password') ||
        lower.includes('passwordrequired')) {
      console.log('🔒 Password required, switching to password step');
      setStep('password');
      setShowPasswordField(true);
    }
  }, [error]);

  // Auto-check room code to know if password is required without forcing a failed join
  React.useEffect(() => {
    const check = async () => {
      const code = roomCode.trim().toUpperCase();
      
      // Only check when we have a complete code and not already in password step
      if (code.length !== 6 || loading || step === 'password') return;
      
      // Prevent concurrent checks
      if (checkingCode) return;
      
      try {
        setCheckingCode(true);
        const q = query(collection(db, 'multiplayer_rooms'), where('code', '==', code), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          console.log('🔍 Room check:', { code, isPrivate: data.isPrivate });
          
          if (data.isPrivate) {
            console.log('🔒 Room requires password, showing password field');
            setShowPasswordField(true);
            setStep('password');
          }
        }
      } catch (e) {
        console.error('Error checking room:', e);
        // Silent fail; will be handled on submit
      } finally {
        setCheckingCode(false);
      }
    };
    
    // Add small delay to avoid checking on every keystroke
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [roomCode, loading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {t('multiplayer.joinRoom')}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Room Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('multiplayer.roomCode')}
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder={t('multiplayer.enterRoomCode')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              maxLength={6}
              required
              disabled={loading || step === 'password'}
            />
            <div className="text-xs text-gray-500 mt-1 text-center">
              {t('multiplayer.roomCodeHint')}
            </div>
          </div>

          {/* Password Field */}
          {showPasswordField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                {t('multiplayer.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('multiplayer.enterPassword')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={step === 'password'}
                disabled={loading}
              />
            </div>
          )}

          {/* Error Message */}
          <ErrorDisplay
            error={error}
            type="error"
            onDismiss={() => {}}
          />

          {/* Wrong Password Error (only shown in password step) */}
          {error && step === 'password' && error.toLowerCase().includes('sai') && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm">
                {error}
              </span>
            </div>
          )}

          {/* Password Required Info */}
          {step === 'password' && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <span className="text-yellow-700 text-sm">
                {t('multiplayer.passwordRequired')}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            
            {step === 'password' && (
              <button
                type="button"
                onClick={() => {
                  setStep('code');
                  setShowPasswordField(false);
                  setPassword('');
                }}
                className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                disabled={loading}
              >
                {t('common.back')}
              </button>
            )}
            
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-50"
              disabled={loading || !roomCode.trim() || (step === 'password' && !password.trim())}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                step === 'code' 
                  ? t('multiplayer.joinRoom')
                  : t('common.submit')
              )}
            </button>
          </div>
        </form>
        
        {/* Loading Overlay */}
        {(loading || checkingCode) && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-700 font-medium">
                {loading ? t('multiplayer.joining') : t('common.checking')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinRoomModal;

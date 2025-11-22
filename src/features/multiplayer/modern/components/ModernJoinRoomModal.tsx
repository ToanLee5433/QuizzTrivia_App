import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Lock, 
  AlertCircle,
  LogIn,
  Users,
  Shield
} from 'lucide-react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { modernMultiplayerService } from '../services/modernMultiplayerService';

interface ModernJoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, password?: string) => void;
  loading?: boolean;
  error?: string;
}

const ModernJoinRoomModal: React.FC<ModernJoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  loading = false,
  error
}) => {
  const { t } = useTranslation('multiplayer');
  
  // Auto-fill room code from URL (if any)
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

  // Auto-focus password field when there's pending code
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
        const q = query(
          collection(modernMultiplayerService.db, 'multiplayer_rooms'), 
          where('code', '==', code), 
          limit(1)
        );
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
  }, [roomCode, loading, step]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-gradient-to-br from-blue-900/90 to-cyan-900/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full relative border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {t('joinRoom')}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Room Code Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>{t('roomCode')}</span>
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-xl font-mono tracking-widest"
                maxLength={6}
                disabled={loading}
              />
              <p className="text-xs text-blue-300 text-center">
                {t('enterRoomCode')}
              </p>
            </div>

            {/* Password Input (shown when required) */}
            {showPasswordField && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <label className="text-sm font-medium text-blue-200 flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>{t('password')}</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('enterPassword')}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-blue-300 text-center">
                  {t('roomPasswordRequired')}
                </p>
              </motion.div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
                className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
                disabled={loading}
              >
                {t('cancel')}
              </motion.button>
              
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !roomCode.trim() || (showPasswordField && !password.trim())}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('joining')}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{step === 'password' ? t('joinWithPassword') : t('joinRoom')}</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Security Notice */}
            <div className="flex items-center space-x-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-300">
                {t('secureConnection')}
              </p>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModernJoinRoomModal;

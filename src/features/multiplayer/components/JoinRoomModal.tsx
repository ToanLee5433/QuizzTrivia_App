import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, AlertCircle } from 'lucide-react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, password?: string) => void;
  onRoomJoined: (roomId: string, roomData: any) => void;
  loading?: boolean;
  error?: string;
  currentUserId: string;
  currentUserName: string;
  multiplayerService: any;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  // onRoomJoined,
  loading = false,
  error,
  // currentUserId,
  // currentUserName,
  // multiplayerService
}) => {
  const { t } = useTranslation();
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [checkingCode, setCheckingCode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 'code') {
      if (!roomCode.trim()) return;
      
      // Try joining with room code first
      onJoinRoom(roomCode.trim().toUpperCase());
    } else if (step === 'password') {
      if (!password.trim()) return;
      
      // Join with password
      onJoinRoom(roomCode.trim().toUpperCase(), password.trim());
    }
  };

  const handleClose = () => {
    setRoomCode('');
    setPassword('');
    setShowPasswordField(false);
    setStep('code');
    onClose();
  };

  // Handle specific errors
  React.useEffect(() => {
    if (!error) return;
    const lower = error.toLowerCase();
    if (lower.includes('yêu cầu mật khẩu') || lower.includes('password')) {
      setStep('password');
      setShowPasswordField(true);
    }
  }, [error]);

  // Auto-check room code to know if password is required without forcing a failed join
  React.useEffect(() => {
    const check = async () => {
      const code = roomCode.trim().toUpperCase();
      if (step !== 'code' || code.length !== 6 || loading || checkingCode) return;
      try {
        setCheckingCode(true);
        const q = query(collection(db, 'multiplayer_rooms'), where('code', '==', code), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          if (data.isPrivate) {
            setShowPasswordField(true);
            setStep('password');
          }
        }
      } catch (e) {
        // Silent fail; will be handled on submit
      } finally {
        setCheckingCode(false);
      }
    };
    check();
  }, [roomCode, step, loading, checkingCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
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

          {/* Error Display */}
          {error && error !== 'Phòng này yêu cầu mật khẩu' && (
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
      </div>
    </div>
  );
};

export default JoinRoomModal;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, AlertCircle } from 'lucide-react';

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
    if (error === 'room_requires_password') {
      setStep('password');
      setShowPasswordField(true);
    }
  }, [error]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {t('multiplayer.joinRoom', 'Tham gia phòng')}
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
              {t('multiplayer.roomCode', 'Mã phòng')}
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder={t('multiplayer.enterRoomCode', 'Nhập mã phòng...')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              maxLength={6}
              required
              disabled={loading || step === 'password'}
            />
            <div className="text-xs text-gray-500 mt-1 text-center">
              {t('multiplayer.roomCodeHint', 'Mã phòng gồm 6 ký tự')}
            </div>
          </div>

          {/* Password Field */}
          {showPasswordField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                {t('multiplayer.password', 'Mật khẩu')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('multiplayer.enterPassword', 'Nhập mật khẩu...')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={step === 'password'}
                disabled={loading}
              />
            </div>
          )}

          {/* Error Display */}
          {error && error !== 'room_requires_password' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm">
                {error === 'room_not_found' && t('multiplayer.errors.roomNotFound', 'Không tìm thấy phòng')}
                {error === 'room_full' && t('multiplayer.errors.roomFull', 'Phòng đã đầy')}
                {error === 'wrong_password' && t('multiplayer.errors.wrongPassword', 'Mật khẩu không đúng')}
                {error === 'game_in_progress' && t('multiplayer.errors.gameInProgress', 'Game đang diễn ra')}
                {!['room_not_found', 'room_full', 'wrong_password', 'game_in_progress'].includes(error) && error}
              </span>
            </div>
          )}

          {/* Password Required Info */}
          {step === 'password' && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <span className="text-yellow-700 text-sm">
                {t('multiplayer.passwordRequired', 'Phòng này yêu cầu mật khẩu')}
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
              {t('common.cancel', 'Hủy')}
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
                {t('common.back', 'Quay lại')}
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
                  {t('common.loading', 'Đang tải...')}
                </div>
              ) : (
                step === 'code' 
                  ? t('multiplayer.joinRoom', 'Tham gia')
                  : t('common.submit', 'Xác nhận')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinRoomModal;

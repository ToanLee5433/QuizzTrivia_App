import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, Users, Clock, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Quiz, RoomConfig } from '../types/index';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomConfig: RoomConfig) => void;
  selectedQuiz?: Quiz;
  loading?: boolean;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  selectedQuiz,
  loading = false
}) => {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [timeLimit, setTimeLimit] = useState(30);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  
  // Reset password when isPrivate is unchecked
  React.useEffect(() => {
    if (!isPrivate) {
      setPassword('');
    }
  }, [isPrivate]);

  // Constants for validation
  const MIN_TIME_LIMIT = 5;
  const MAX_TIME_LIMIT = 300; // 5 minutes max for better UX
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      return;
    }

    // Validate time limit
    if (timeLimit < MIN_TIME_LIMIT || timeLimit > MAX_TIME_LIMIT) {
      toast.error(t('multiplayer.timeLimitRange', { min: MIN_TIME_LIMIT, max: MAX_TIME_LIMIT }));
      return;
    }

    // Validate max players
    if (maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS) {
      toast.error(t('multiplayer.playersRange', { min: MIN_PLAYERS, max: MAX_PLAYERS }));
      return;
    }

    const roomConfig = {
      name: roomName.trim(),
      maxPlayers,
      isPrivate,
      password: isPrivate ? password : undefined,
      settings: {
        timePerQuestion: timeLimit,
        showLeaderboard,
        allowLateJoin: true
      }
    };

    console.log('🏗️ CreateRoomModal: Submitting room config', {
      isPrivate,
      hasPassword: !!password,
      roomConfig
    });

    onCreateRoom(roomConfig);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {t('multiplayer.createRoom')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('multiplayer.roomName')}
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t('multiplayer.enterRoomName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          {/* Max Players */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              {t('multiplayer.maxPlayers')} ({MIN_PLAYERS}-{MAX_PLAYERS})
            </label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= MIN_PLAYERS && value <= MAX_PLAYERS) {
                  setMaxPlayers(value);
                }
              }}
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              {t('multiplayer.timeLimit')} ({t('multiplayer.timeLimitRange', { min: MIN_TIME_LIMIT, max: MAX_TIME_LIMIT })})
            </label>
            <input
              type="number"
              value={timeLimit || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setTimeLimit('' as any);
                } else {
                  const num = parseInt(val);
                  if (!isNaN(num)) {
                    setTimeLimit(num);
                  }
                }
              }}
              min={MIN_TIME_LIMIT}
              max={MAX_TIME_LIMIT}
              placeholder={t('placeholders.enterNumber')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                timeLimit && (timeLimit < MIN_TIME_LIMIT || timeLimit > MAX_TIME_LIMIT)
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
              required
              disabled={loading}
            />
            {timeLimit && (timeLimit < MIN_TIME_LIMIT || timeLimit > MAX_TIME_LIMIT) && (
              <p className="text-sm text-red-600 mt-1">⚠️ {t('multiplayer.timeLimitRange', { min: MIN_TIME_LIMIT, max: MAX_TIME_LIMIT })}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {t('multiplayer.timeLimitHint', { min: MIN_TIME_LIMIT, max: MAX_TIME_LIMIT })}
            </p>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              {t('multiplayer.roomSettings')}
            </h3>

            {/* Show Leaderboard */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showLeaderboard"
                checked={showLeaderboard}
                onChange={(e) => setShowLeaderboard(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="showLeaderboard" className="ml-2 text-sm text-gray-700">
                {t('multiplayer.showLeaderboard')}
              </label>
            </div>

            {/* Private Room */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="isPrivate" className="ml-2 text-sm text-gray-700 flex items-center">
                <Lock className="w-4 h-4 mr-1" />
                {t('multiplayer.private')}
              </label>
            </div>

            {/* Password */}
            {isPrivate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('multiplayer.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('multiplayer.enterPassword')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={isPrivate}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Selected Quiz Info */}
          {selectedQuiz && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-xs font-medium text-blue-600 mb-1">
                {t('quiz.selectedQuiz')}
              </h4>
              <div className="text-sm text-blue-800">
                <div className="font-medium">{selectedQuiz.title}</div>
                <div className="text-blue-600">
                  {t('multiplayer.questionsCount', { count: selectedQuiz.questions?.length || 0 })}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('multiplayer.createRoom')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;

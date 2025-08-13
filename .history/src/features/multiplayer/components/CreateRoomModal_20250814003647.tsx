import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Lock, Users, Clock, Settings } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomConfig: any) => void;
  onRoomCreated: (roomId: string, roomData: any) => void;
  selectedQuiz?: any;
  currentUserId: string;
  currentUserName: string;
  multiplayerService: any;
  loading?: boolean;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  // onRoomCreated,
  selectedQuiz,
  // currentUserId,
  // currentUserName,
  // multiplayerService,
  loading = false
}) => {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [timeLimit, setTimeLimit] = useState(30);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
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
              {t('multiplayer.maxPlayers')} (1-20)
            </label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= 20) {
                  setMaxPlayers(value);
                }
              }}
              min="1"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          {/* Time Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              {t('multiplayer.timeLimit')} (giây, tối đa 1000)
            </label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 5 && value <= 1000) {
                  setTimeLimit(value);
                }
              }}
              min="5"
              max="1000"
              placeholder="VD: 30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Từ 5 đến 1000 giây cho mỗi câu hỏi</p>
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
              <h4 className="font-medium text-blue-900 mb-2">
                {t('quiz.selectedQuiz')}
              </h4>
              <div className="text-sm text-blue-800">
                <div className="font-medium">{selectedQuiz.title}</div>
                <div className="text-blue-600">
                  {selectedQuiz.questions?.length || 0} câu hỏi
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

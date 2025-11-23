import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Users, 
  Play, 
  Pause, 
  SkipForward, 
  Crown, 
  UserMinus, 
  Volume2, 
  Zap,
  Clock,
  Trophy,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  MessageSquare,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDatabase, ref, update, onValue, off } from 'firebase/database';

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  isReady: boolean;
  isOnline: boolean;
  score: number;
  joinedAt: number;
}

interface RoomSettings {
  maxPlayers: number;
  timePerQuestion: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isPrivate: boolean;
  autoStart: boolean;
  soundEnabled: boolean;
  chatEnabled: boolean;
  screenEnabled: boolean;
}

interface ModernHostControlPanelProps {
  roomId: string;
  currentUserId: string;
  isHost: boolean;
  players: Player[];
  onGameStart: () => void;
  onGamePause: () => void;
  onGameResume: () => void;
  onKickPlayer: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  onSettingsUpdate: (settings: RoomSettings) => void;
}

const ModernHostControlPanel: React.FC<ModernHostControlPanelProps> = ({
  roomId,
  currentUserId,
  isHost,
  players,
  onGameStart,
  onGamePause,
  onGameResume,
  onKickPlayer,
  onTransferHost,
  onSettingsUpdate
}) => {
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 8,
    timePerQuestion: 30,
    difficulty: 'medium',
    isPrivate: false,
    autoStart: true,      // Auto start ON by default
    soundEnabled: true,   // Sound ON by default
    chatEnabled: true,    // Chat ON by default
    screenEnabled: false  // Screen OFF by default (as requested)
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'paused'>('waiting');
  const { t } = useTranslation('multiplayer');

  const db = getDatabase();

  // Listen to room settings
  useEffect(() => {
    if (!roomId || !db) return;

    const settingsRef = ref(db, `rooms/${roomId}/settings`);
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings(data);
      }
    });

    return () => off(settingsRef, 'value', unsubscribe);
  }, [roomId, db]);

  // Listen to game status
  useEffect(() => {
    if (!roomId || !db) return;

    const gameStatusRef = ref(db, `rooms/${roomId}/gameStatus`);
    const unsubscribe = onValue(gameStatusRef, (snapshot) => {
      const status = snapshot.val();
      if (status) {
        setGameStatus(status);
      }
    });

    return () => off(gameStatusRef, 'value', unsubscribe);
  }, [roomId, db]);

  const updateSetting = (key: keyof RoomSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsUpdate(newSettings);

    // Update in database
    const settingsRef = ref(db, `rooms/${roomId}/settings`);
    update(settingsRef, { [key]: value });
  };

  const handleKickPlayer = (playerId: string) => {
    if (window.confirm(t('kickPlayerTooltip') + '?')) {
      onKickPlayer(playerId);
      
      // Update database
      const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
      update(playerRef, { isKicked: true, kickedAt: Date.now() });
    }
  };

  const handleTransferHost = (playerId: string) => {
    const isSelf = playerId === currentUserId;
    const confirmMessage = isSelf 
      ? t('switchToPlayerMode') + '?'
      : t('transferHostTooltip') + '?';
      
    if (window.confirm(confirmMessage)) {
      onTransferHost(playerId);
      
      // Update database
      const roomRef = ref(db, `rooms/${roomId}`);
      update(roomRef, { hostId: playerId });
    }
  };

  const canStartGame = () => {
    const readyPlayers = players.filter(p => p.isReady && p.isOnline).length;
    return readyPlayers >= 2 && gameStatus === 'waiting';
  };

  const getGameStatusColor = () => {
    switch (gameStatus) {
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'playing': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getGameStatusText = () => {
    switch (gameStatus) {
      case 'waiting': return t('gameWaiting');
      case 'playing': return t('gamePlaying');
      case 'paused': return t('gamePaused');
      default: return t('gameWaiting');
    }
  };

  if (!isHost) {
    return null; // Only show for hosts
  }

  return (
    <div className="bg-gradient-to-br from-white via-purple-50/30 to-white rounded-2xl shadow-2xl border border-purple-200/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Crown className="w-5 h-5 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{t('hostControl')}</h3>
            <p className="text-purple-100 text-xs">{t('manageRoomAndGame')}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${getGameStatusColor()}`}>
          {getGameStatusText()}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-4">
        {/* Game Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGameStart}
            disabled={!canStartGame()}
            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 ${
              canStartGame()
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-6 h-6 mb-2" />
            <span className="text-sm font-bold">{t('startButton')}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={gameStatus === 'playing' ? onGamePause : onGameResume}
            disabled={gameStatus === 'waiting'}
            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 ${
              gameStatus === 'waiting'
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : gameStatus === 'playing'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-xl'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {gameStatus === 'playing' ? <Pause className="w-6 h-6 mb-2" /> : <Play className="w-6 h-6 mb-2" />}
            <span className="text-sm font-bold">{gameStatus === 'playing' ? t('pauseButton') : t('resumeButton')}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <SkipForward className="w-6 h-6 mb-2" />
            <span className="text-sm font-bold">{t('skipButton')}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <RotateCcw className="w-6 h-6 mb-2" />
            <span className="text-sm font-bold">{t('resetButton')}</span>
          </motion.button>
        </div>

        {/* Management Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 rounded-xl transition-all duration-200"
          >
            <Settings className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">{t('settingsButton')}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Find first online player who is not current user
              const targetPlayer = players.find(p => p.isOnline && p.id !== currentUserId);
              if (targetPlayer) {
                handleTransferHost(targetPlayer.id);
              } else {
                alert(t('noOtherOnlinePlayer'));
              }
            }}
            className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 rounded-xl transition-all duration-200"
            title={t('switchToPlayerMode')}
          >
            <Users className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">{t('joinGameButton')}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPlayerManagement(!showPlayerManagement)}
            className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-xl transition-all duration-200"
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">
              {t('manageButton')} ({players.length})
            </span>
          </motion.button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50"
            >
              <h4 className="font-bold text-blue-900 mb-3">{t('roomSettingsTitle')}</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Time per question */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{t('timePerQuestion')}</span>
                    </span>
                    <span className="text-blue-600 font-bold">{settings.timePerQuestion}s</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={settings.timePerQuestion || 30}
                    onChange={(e) => updateSetting('timePerQuestion', parseInt(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Max players */}
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{t('maxPlayersLabel')}</span>
                    </span>
                    <span className="text-blue-600 font-bold">{settings.maxPlayers}</span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={settings.maxPlayers || 8}
                    onChange={(e) => updateSetting('maxPlayers', parseInt(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggle Settings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'chatEnabled', icon: MessageSquare, label: t('chatLabel'), color: 'blue' },
                  { key: 'screenEnabled', icon: Monitor, label: t('screenLabel'), color: 'purple' },
                  { key: 'soundEnabled', icon: Volume2, label: t('soundLabel'), color: 'green' },
                  { key: 'autoStart', icon: Play, label: t('autoStartLabel'), color: 'yellow' }
                ].map(({ key, icon: Icon, label, color }) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting(key as keyof RoomSettings, !settings[key as keyof RoomSettings])}
                    className={`flex items-center space-x-2 p-3 rounded-xl transition-all duration-200 ${
                      settings[key as keyof RoomSettings]
                        ? `bg-${color}-100 text-${color}-700 border-2 border-${color}-300`
                        : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{label}</span>
                    {settings[key as keyof RoomSettings] && (
                      <CheckCircle className="w-3 h-3 ml-auto" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Management Panel */}
        <AnimatePresence>
          {showPlayerManagement && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200/50"
            >
              <h4 className="font-bold text-purple-900 mb-3">{t('playerManagementTitle')}</h4>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200/50"
                  >
                    <div className="flex items-center space-x-3">
                      {player.photoURL ? (
                        <img
                          src={player.photoURL}
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {player.name}
                          {player.id === currentUserId && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                              Host
                            </span>
                          )}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className={`flex items-center space-x-1 ${player.isReady ? 'text-green-600' : 'text-yellow-600'}`}>
                            {player.isReady ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            <span>{player.isReady ? t('readyStatus') : t('notReadyStatus')}</span>
                          </span>
                          <span className={`flex items-center space-x-1 ${player.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${player.isOnline ? 'bg-green-500' : 'bg-gray-400'} ${player.isOnline ? 'animate-pulse' : ''}`}></div>
                            <span>{player.isOnline ? t('onlineStatus') : t('offlineStatus')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {player.id !== currentUserId && (
                      <div className="flex items-center space-x-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleTransferHost(player.id)}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                          title={t('transferHostTooltip')}
                        >
                          <Crown className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleKickPlayer(player.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title={t('kickPlayerTooltip')}
                        >
                          <UserMinus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
          <div className="text-center">
            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{players.length}</p>
            <p className="text-xs text-gray-600">{t('playersCount')}</p>
          </div>
          <div className="text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">
              {players.filter(p => p.isReady).length}
            </p>
            <p className="text-xs text-gray-600">{t('readyCount')}</p>
          </div>
          <div className="text-center">
            <Zap className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">
              {Math.max(0, players.filter(p => p.isReady && p.isOnline).length - 1)}
            </p>
            <p className="text-xs text-gray-600">{t('opponentsCount')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernHostControlPanel;

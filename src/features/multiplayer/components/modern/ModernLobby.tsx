import React, { useState, useEffect, useMemo } from 'react';
// import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Copy, 
  Settings,
  Music,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import type { MultiplayerServiceInterface } from '../../services/enhancedMultiplayerService';
import realtimeService from '../../services/realtimeMultiplayerService';

interface Player {
  id: string;
  username: string;
  isReady: boolean;
  isOnline: boolean;
  joinedAt: Date;
  avatar?: string;
  avatarEmoji?: string;
  avatarColor?: string;
}

interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string; // ✅ Host ID for identifying creator
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  settings: {
    timeLimit: number;
    showLeaderboard: boolean;
    allowLateJoin: boolean;
    showIntermediateLeaderboard?: boolean;
    enablePowerUps?: boolean;
    musicVolume?: number;
    musicTrack?: 'chill' | 'energetic' | 'intense';
  };
}

interface ModernLobbyProps {
  roomData?: Room;
  currentUserId: string;
  isHost: boolean;
  onLeaveRoom: () => void;
  multiplayerService?: MultiplayerServiceInterface;
}

const AVATAR_EMOJIS = ['🐉', '🦁', '🐯', '🦊', '🐺', '🐻', '🐼', '🐨', '🐸', '🦄', '🦋', '🐙', '🦀', '🐢', '🦖', '🤖'];
// const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

const ModernLobby: React.FC<ModernLobbyProps> = ({
  roomData,
  currentUserId,
  isHost,
  onLeaveRoom,
  multiplayerService
}) => {
  // const { t } = useTranslation();
  const [qrCode, setQrCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [countdownData, setCountdownData] = useState<{ remaining: number; isActive: boolean } | null>(null);
  const [gameStartTriggered, setGameStartTriggered] = useState(false);
  
  const [settings, setSettings] = useState({
    timeLimit: roomData?.settings?.timeLimit || 30,
    showLeaderboard: roomData?.settings?.showLeaderboard ?? true,
    allowLateJoin: roomData?.settings?.allowLateJoin ?? true,
    showIntermediateLeaderboard: roomData?.settings?.showIntermediateLeaderboard ?? true,
    enablePowerUps: roomData?.settings?.enablePowerUps ?? false,
    musicVolume: roomData?.settings?.musicVolume || 50,
    musicTrack: (roomData?.settings?.musicTrack as 'chill' | 'energetic' | 'intense') || 'energetic'
  });

  const players = useMemo(() => roomData?.players || [], [roomData?.players]);
  const readyCount = useMemo(() => players.filter(p => p.isReady).length, [players]);
  const allReady = useMemo(() => players.length >= 2 && players.every(p => p.isReady), [players]);
  const currentPlayer = players.find(p => p.id === currentUserId);
  
  // ✅ Join URL thống nhất: /multiplayer/game?code=XXX
  const joinUrl = `${window.location.origin}/multiplayer/game?code=${roomData?.code}`;

  // Generate QR Code
  useEffect(() => {
    if (roomData?.code) {
      QRCode.toDataURL(joinUrl, { width: 200, margin: 2 })
        .then(setQrCode)
        .catch(console.error);
    }
  }, [joinUrl, roomData?.code]);

  // Listen to countdown
  useEffect(() => {
    if (!roomData?.id) return;

    const unsubscribe = realtimeService.listenToCountdown(roomData.id, (data) => {
      setCountdownData(data);
      
      if (data && data.remaining === 0 && !data.isActive && !gameStartTriggered) {
        setGameStartTriggered(true);
        
        if (multiplayerService) {
          multiplayerService.startGame(roomData.id, true)
            .then(() => {
              realtimeService.cancelCountdown(roomData.id);
            })
            .catch(err => {
              console.error('Failed to start game:', err);
              setGameStartTriggered(false);
            });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomData?.id, multiplayerService, gameStartTriggered]);

  // Start countdown when all ready
  useEffect(() => {
    if (allReady && players.length >= 2 && !gameStartTriggered && countdownData === null) {
      const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));
      const shouldStartCountdown = sortedPlayers[0].id === currentUserId;
      
      if (shouldStartCountdown && roomData?.id) {
        realtimeService.startCountdown(roomData.id, 5);
        realtimeService.setGameStatus(roomData.id, 'starting');
      }
    } else if (!allReady && countdownData?.isActive) {
      if (roomData?.id) {
        realtimeService.cancelCountdown(roomData.id);
        realtimeService.setGameStatus(roomData.id, 'waiting');
        setGameStartTriggered(false);
      }
    }
  }, [allReady, players, countdownData, currentUserId, roomData?.id, gameStartTriggered]);

  const handleCopyCode = async () => {
    if (roomData?.code) {
      await navigator.clipboard.writeText(roomData.code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleToggleReady = async () => {
    if (!multiplayerService || !roomData?.id) return;
    await multiplayerService.updatePlayerStatus(roomData.id, !currentPlayer?.isReady);
  };

  const handleUpdateSettings = async () => {
    if (!multiplayerService || !roomData?.id || !isHost) return;
    await multiplayerService.updateRoomSettings(roomData.id, settings);
    setShowSettings(false);
  };

  // HOST VIEW - For projector/big screen
  if (isHost) {
    console.log('🖥️ ModernLobby - Rendering HOST VIEW', { 
      isHost, 
      currentUserId, 
      roomHostId: roomData?.hostId,
      playersCount: players.length 
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-20 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-40 w-64 h-64 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Music Control */}
        <div className="absolute top-6 right-6 z-50">
          <button
            onClick={() => setMusicEnabled(!musicEnabled)}
            className="bg-white/10 backdrop-blur-md p-3 rounded-xl hover:bg-white/20 transition-all"
          >
            {musicEnabled ? <Volume2 className="w-6 h-6 text-white" /> : <VolumeX className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-8 py-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-7xl font-black text-white mb-4 tracking-tight">
              {roomData?.name || 'Quiz Room'}
            </h1>
            <p className="text-2xl text-purple-200">
              Waiting for players to join...
            </p>
          </motion.div>

          {/* PIN Code Section */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid grid-cols-2 gap-8">
              {/* PIN Code */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 text-center"
              >
                <p className="text-xl text-purple-200 mb-4">Join at: quiztrivia.app/join</p>
                <div className="text-9xl font-black text-white tracking-wider mb-4">
                  {roomData?.code}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-orange-500 px-8 py-4 rounded-2xl text-white font-bold text-lg hover:scale-105 transition-transform"
                >
                  <Copy className="w-5 h-5" />
                  {copySuccess ? 'Copied!' : 'Copy Code'}
                </button>
              </motion.div>

              {/* QR Code */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 flex flex-col items-center justify-center"
              >
                <QrCode className="w-12 h-12 text-purple-200 mb-4" />
                {qrCode && (
                  <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-2xl bg-white p-4" />
                )}
                <p className="text-lg text-purple-200 mt-4">Scan to Join</p>
              </motion.div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-4xl font-bold text-white flex items-center gap-3">
                <Users className="w-10 h-10" />
                Players ({players.length}/{roomData?.maxPlayers})
              </h2>
              <div className="text-2xl font-bold text-white">
                {readyCount}/{players.length} Ready
              </div>
            </div>

            <div className="grid grid-cols-5 gap-6">
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0, rotate: 180 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: index * 0.05 
                    }}
                    className={`relative bg-gradient-to-br ${
                      player.isReady 
                        ? 'from-green-400 to-emerald-600' 
                        : 'from-gray-400 to-gray-600'
                    } rounded-3xl p-6 text-center transition-all duration-300`}
                  >
                    {/* Avatar */}
                    <div className="text-7xl mb-3 animate-bounce-slow">
                      {player.avatarEmoji || AVATAR_EMOJIS[index % AVATAR_EMOJIS.length]}
                    </div>
                    
                    {/* Username */}
                    <p className="text-white font-bold text-lg truncate mb-2">
                      {player.username}
                    </p>

                    {/* Ready Badge */}
                    {player.isReady && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-3 -right-3 bg-green-500 rounded-full p-2 shadow-lg"
                      >
                        <Sparkles className="w-6 h-6 text-white" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Settings Button */}
          <div className="text-center">
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl text-white hover:bg-white/20 transition-all"
            >
              <Settings className="w-5 h-5" />
              Game Settings
            </button>
          </div>
        </div>

        {/* Countdown Overlay */}
        <AnimatePresence>
          {countdownData && countdownData.isActive && countdownData.remaining > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center"
            >
              <motion.div
                key={countdownData.remaining}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className={`text-[20rem] font-black ${
                  countdownData.remaining === 3 ? 'text-green-400' :
                  countdownData.remaining === 2 ? 'text-yellow-400' :
                  'text-red-400'
                }`}
                style={{ textShadow: '0 0 100px currentColor' }}
              >
                {countdownData.remaining}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <AdvancedSettingsModal
              settings={settings}
              onSettingsChange={setSettings}
              onClose={() => setShowSettings(false)}
              onSave={handleUpdateSettings}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // PLAYER VIEW - For mobile/tablet
  console.log('📱 ModernLobby - Rendering PLAYER VIEW', { 
    isHost, 
    currentUserId, 
    roomHostId: roomData?.hostId,
    currentPlayerReady: currentPlayer?.isReady 
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-6">
      {/* Player Status */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-8xl mb-6 animate-pulse">
          {currentPlayer?.avatarEmoji || '👤'}
        </div>
        <h2 className="text-4xl font-bold text-white mb-2">
          {currentPlayer?.username}
        </h2>
        <p className="text-xl text-purple-200">
          You're in! See your name on screen?
        </p>
      </motion.div>

      {/* Radar Effect */}
      <div className="relative w-64 h-64 mb-8">
        <motion.div
          animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 border-4 border-cyan-400 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          className="absolute inset-0 border-4 border-pink-400 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Users className="w-24 h-24 text-white" />
        </div>
      </div>

      {/* Player Count */}
      <p className="text-3xl font-bold text-white mb-12">
        {players.length} / {roomData?.maxPlayers} Players
      </p>

      {/* Ready Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggleReady}
        className={`w-full max-w-md py-8 rounded-3xl text-3xl font-black shadow-2xl transition-all ${
          currentPlayer?.isReady
            ? 'bg-gradient-to-r from-green-400 to-emerald-600 text-white'
            : 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
        }`}
      >
        {currentPlayer?.isReady ? (
          <span className="flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8" />
            I'M READY!
            <Sparkles className="w-8 h-8" />
          </span>
        ) : (
          'TAP TO READY'
        )}
      </motion.button>

      {/* Leave Button */}
      <button
        onClick={onLeaveRoom}
        className="mt-6 text-white/70 hover:text-white transition-colors"
      >
        Leave Room
      </button>
    </div>
  );
};

// Advanced Settings Modal Component
const AdvancedSettingsModal: React.FC<{
  settings: any;
  onSettingsChange: (settings: any) => void;
  onClose: () => void;
  onSave: () => void;
}> = ({ settings, onSettingsChange, onClose, onSave }) => {
  // const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
      >
        <h2 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
          <Settings className="w-10 h-10" />
          Game Settings
        </h2>

        <div className="space-y-6">
          {/* Time Limit */}
          <div>
            <label className="text-xl text-white font-semibold mb-2 block">
              Time per Question: {settings.timeLimit}s
            </label>
            <input
              type="range"
              min="10"
              max="120"
              value={settings.timeLimit}
              onChange={(e) => onSettingsChange({ ...settings, timeLimit: Number(e.target.value) })}
              className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Intermediate Leaderboard */}
          <div className="bg-white/10 rounded-2xl p-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xl text-white font-semibold">Show Leaderboard After Each Question</p>
                <p className="text-sm text-purple-200 mt-1">Display rankings between questions for competition</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showIntermediateLeaderboard}
                onChange={(e) => onSettingsChange({ ...settings, showIntermediateLeaderboard: e.target.checked })}
                className="w-12 h-12 rounded-xl"
              />
            </label>
          </div>

          {/* Final Leaderboard */}
          <div className="bg-white/10 rounded-2xl p-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xl text-white font-semibold">Show Final Leaderboard</p>
                <p className="text-sm text-purple-200 mt-1">Display final rankings at the end</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showLeaderboard}
                onChange={(e) => onSettingsChange({ ...settings, showLeaderboard: e.target.checked })}
                className="w-12 h-12 rounded-xl"
              />
            </label>
          </div>

          {/* Power-ups */}
          <div className="bg-white/10 rounded-2xl p-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xl text-white font-semibold flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  Enable Power-Ups
                </p>
                <p className="text-sm text-purple-200 mt-1">50/50, x2 Score, Freeze Time</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enablePowerUps}
                onChange={(e) => onSettingsChange({ ...settings, enablePowerUps: e.target.checked })}
                className="w-12 h-12 rounded-xl"
              />
            </label>
          </div>

          {/* Music Track */}
          <div>
            <label className="text-xl text-white font-semibold mb-3 block flex items-center gap-2">
              <Music className="w-6 h-6" />
              Music Track
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['chill', 'energetic', 'intense'].map((track) => (
                <button
                  key={track}
                  onClick={() => onSettingsChange({ ...settings, musicTrack: track })}
                  className={`py-3 px-4 rounded-xl font-bold capitalize transition-all ${
                    settings.musicTrack === track
                      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {track}
                </button>
              ))}
            </div>
          </div>

          {/* Music Volume */}
          <div>
            <label className="text-xl text-white font-semibold mb-2 block">
              Music Volume: {settings.musicVolume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.musicVolume}
              onChange={(e) => onSettingsChange({ ...settings, musicVolume: Number(e.target.value) })}
              className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Late Join */}
          <div className="bg-white/10 rounded-2xl p-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xl text-white font-semibold">Allow Late Join</p>
                <p className="text-sm text-purple-200 mt-1">Let players join after game starts</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowLateJoin}
                onChange={(e) => onSettingsChange({ ...settings, allowLateJoin: e.target.checked })}
                className="w-12 h-12 rounded-xl"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={onSave}
            className="flex-1 bg-gradient-to-r from-green-400 to-emerald-600 py-4 rounded-2xl text-white text-xl font-bold hover:scale-105 transition-transform"
          >
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="px-8 bg-white/10 py-4 rounded-2xl text-white text-xl font-bold hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModernLobby;

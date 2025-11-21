import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Users, 
  CheckCircle, 
  Clock,
  Copy,
  LogOut,
  Trophy,
  Zap,
  Star,
  Settings,
  X,
  QrCode,
  Share2,
  Volume2,
  VolumeX,
  UserMinus,
  Crown,
  Gamepad2,
  Radio,
  Play
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import type { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';
import realtimeService from '../services/realtimeMultiplayerService';
import optimizedRealtimeService from '../services/optimizedRealtimeService';

interface Player {
  id: string;
  username: string;
  photoURL?: string;
  isReady: boolean;
  // Removed isHost - all players are equal
  isOnline: boolean;
  joinedAt: Date;
}

interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string; // ✅ Restored - needed for host controls
  players: Player[];
  maxPlayers: number;
  isPrivate: boolean;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  settings: {
    timeLimit: number;
    showLeaderboard: boolean;
    allowLateJoin: boolean;
  };
}

interface RoomLobbyProps {
  roomData?: Room;
  currentUserId: string;
  onLeaveRoom: () => void;
  multiplayerService?: MultiplayerServiceInterface;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({
  roomData,
  currentUserId,
  onLeaveRoom,
  multiplayerService
}) => {
  const { t } = useTranslation();
  const [copySuccess, setCopySuccess] = useState(false);
  const [countdownData, setCountdownData] = useState<{ remaining: number; isActive: boolean } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [gameStartTriggered, setGameStartTriggered] = useState(false);
  const [roomSettings, setRoomSettings] = useState({
    timeLimit: roomData?.settings?.timeLimit || 30,
    showLeaderboard: roomData?.settings?.showLeaderboard ?? true,
    allowLateJoin: roomData?.settings?.allowLateJoin ?? true
  });
  const [realtimePlayers, setRealtimePlayers] = useState<Player[]>([]);

  // Use real-time players instead of static roomData.players
  const players = useMemo(() => realtimePlayers.length > 0 ? realtimePlayers : (roomData?.players || []), [realtimePlayers, roomData?.players]);
  const readyCount = useMemo(() => players.filter(p => p.isReady).length, [players]);
  const onlineCount = useMemo(() => players.filter(p => p.isOnline).length, [players]);
  const allReady = useMemo(() => players.length >= 2 && players.every(p => p.isReady), [players]);
  const currentPlayer = players.find(p => p.id === currentUserId);
  const isHost = roomData?.hostId === currentUserId;
  
  // Log player updates for debugging
  useEffect(() => {
    console.log('🎮 RoomLobby - Players updated:', {
      total: players.length,
      ready: readyCount,
      allReady,
      playerList: players.map(p => ({ id: p.id, username: p.username, isReady: p.isReady }))
    });
  }, [players, readyCount, allReady]);
  
  // ⚡ REAL-TIME PLAYER LISTENER - Fix avatar sync and near-zero latency updates
  useEffect(() => {
    if (!roomData?.id) return;

    console.log('⚡ Setting up real-time player listener for room:', roomData.id);
    
    // Connect to optimized service for instant updates
    optimizedRealtimeService.connect(
      currentUserId, 
      currentPlayer?.username || 'Player', 
      currentPlayer?.photoURL
    ).catch(err => console.error('Failed to connect to optimized service:', err));

    // Listen to real-time player updates including avatars
    const unsubscribe = optimizedRealtimeService.listenToPlayers(
      roomData.id, 
      (playersList) => {
        console.log('⚡ Real-time players updated:', playersList.map(p => ({
          id: p.id,
          name: p.name,
          hasAvatar: !!p.photoURL,
          isReady: p.isReady
        })));
        
        setRealtimePlayers(playersList);
      }
    );

    return () => {
      console.log('⚡ Cleaning up real-time player listener');
      unsubscribe();
    };
  }, [roomData?.id, currentUserId, currentPlayer?.username, currentPlayer?.photoURL]);
  
  // Listen to RTDB countdown (synchronized across all clients)
  useEffect(() => {
    if (!roomData?.id) return;

    const unsubscribe = realtimeService.listenToCountdown(roomData.id, (data) => {
      setCountdownData(data);
      
      // When countdown reaches 0, start the game immediately
      // Service sets isActive = false when remaining = 0
      if (data && data.remaining === 0 && !data.isActive && !gameStartTriggered) {
        console.log('⏰ Countdown finished - starting game immediately');
        console.log('🔍 Room ID:', roomData.id);
        console.log('🔍 Has multiplayerService:', !!multiplayerService);
        
        setGameStartTriggered(true); // Set flag to prevent re-trigger
        
        if (multiplayerService) {
          // Use skipCountdown parameter to start game immediately without another 5s countdown
          console.log('🚀 Calling multiplayerService.startGame with skipCountdown=true');
          multiplayerService.startGame(roomData.id, true)
            .then(() => {
              console.log('✅ startGame completed successfully');
              // Clean up countdown after successful start
              realtimeService.cancelCountdown(roomData.id);
            })
            .catch(err => {
              console.error('❌ Failed to start game:', err);
              setGameStartTriggered(false); // Reset on error
            });
        } else {
          console.error('❌ multiplayerService is null!');
          setGameStartTriggered(false); // Reset on error
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomData?.id, multiplayerService]);

  // Start countdown when all players ready (only one player triggers it)
  useEffect(() => {
    console.log('🔍 Countdown trigger check:', {
      allReady,
      playersLength: players.length,
      countdownData,
      hasCountdownData: !!countdownData,
      gameStartTriggered,
      currentUserId,
      roomId: roomData?.id,
      shouldTrigger: allReady && players.length >= 2 && !gameStartTriggered && (!countdownData || (countdownData && countdownData.isActive === false))
    });

    // Only start countdown if game hasn't been triggered yet AND countdown doesn't exist
    // Do NOT start if countdown exists (even if isActive=false), wait for it to be removed
    if (allReady && players.length >= 2 && !gameStartTriggered && countdownData === null) {
      // Only the first player alphabetically starts countdown to avoid race condition
      const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));
      const shouldStartCountdown = sortedPlayers[0].id === currentUserId;
      
      console.log('🔍 Should start countdown?', {
        firstPlayerId: sortedPlayers[0].id,
        currentUserId,
        shouldStartCountdown,
        sortedPlayerIds: sortedPlayers.map(p => p.id)
      });
      
      if (shouldStartCountdown && roomData?.id) {
        console.log('🚀 Starting countdown (triggered by first player)');
        realtimeService.startCountdown(roomData.id, 5);
        realtimeService.setGameStatus(roomData.id, 'starting');
      }
    } else if (!allReady && countdownData?.isActive) {
      // Cancel countdown if someone unreadies
      if (roomData?.id) {
        console.log('❌ Cancelling countdown (player unreadied)');
        realtimeService.cancelCountdown(roomData.id);
        realtimeService.setGameStatus(roomData.id, 'waiting');
        setGameStartTriggered(false); // Reset flag when countdown cancelled
      }
    }
  }, [allReady, players, countdownData, currentUserId, roomData?.id, gameStartTriggered]);

  const handleCopyRoomCode = async () => {
    if (roomData?.code) {
      try {
        await navigator.clipboard.writeText(roomData.code);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy room code:', err);
      }
    }
  };

  const handleToggleReady = async () => {
    if (!roomData?.id) return;
    
    const newReadyState = !currentPlayer?.isReady;
    
    try {
      // ⚡ Use optimized service for instant sync (near-zero latency)
      await optimizedRealtimeService.updatePlayerStatus(roomData.id, currentUserId, newReadyState);
      console.log(`⚡ Ready status updated instantly: ${newReadyState}`);
    } catch (error) {
      console.error('Failed to update ready status:', error);
      // Fallback to original service if optimized fails
      if (multiplayerService) {
        await multiplayerService.updatePlayerStatus(roomData.id, newReadyState);
      }
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!multiplayerService || !roomData?.id || !isHost) return;
    if (playerId === currentUserId) return; // Can't kick yourself
    
    try {
      // TODO: Implement kick player functionality in service
      console.log('Kick player:', playerId);
      alert('Kick player feature coming soon!');
    } catch (error) {
      console.error('Failed to kick player:', error);
    }
  };

  const handleShareRoom = async () => {
    const roomUrl = `${window.location.origin}/multiplayer/join?code=${roomData?.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${roomData?.name}!`,
          text: `Join our quiz room with code: ${roomData?.code}`,
          url: roomUrl,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(roomUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/lobby-music.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }

    if (isMusicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  // Generate QR Code
  useEffect(() => {
    if (roomData?.code) {
      const roomUrl = `${window.location.origin}/multiplayer/join?code=${roomData.code}`;
      QRCodeLib.toDataURL(roomUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#4F46E5',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR Code generation failed:', err));
    }
  }, [roomData?.code]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const playerJoinVariants = {
    initial: { opacity: 0, scale: 0.8, x: -20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      x: 0,
      transition: { type: 'spring', bounce: 0.5 }
    }
  };

  const readyPulseVariants = {
    ready: {
      scale: [1, 1.05, 1],
      transition: { 
        repeat: Infinity, 
        duration: 2,
        ease: 'easeInOut'
      }
    }
  };

  // Player slot emojis
  const emptySlotEmojis = ['😴', '⏳', '👤', '🕹️', '🎮', '🎯', '🎲', '🎪'];

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4"
          ></motion.div>
          <p className="text-white text-lg font-semibold">{t('common.loading')}</p>
        </motion.div>
      </div>
    );
  }

  const handleUpdateSettings = async () => {
    if (!multiplayerService || !roomData?.id) return;
    try {
      await multiplayerService.updateRoomSettings(roomData.id, roomSettings);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 relative overflow-hidden flex flex-col"
    >
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      {/* Neon Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut' }}
          className="absolute top-20 left-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
        ></motion.div>
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ repeat: Infinity, duration: 25, ease: 'easeInOut' }}
          className="absolute top-40 right-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
        ></motion.div>
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
          className="absolute -bottom-20 left-1/2 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl"
        ></motion.div>
      </div>

      {/* Floating Geometric Shapes - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
          {/* Premium Glass Header */}
          <motion.div 
            variants={itemVariants as any}
            className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 lg:p-8 mb-6"
            style={{
              boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.3), inset 0 1px 2px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Neon Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-3xl"></div>
            
            {/* Room Title Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-6">
              <div className="flex-1 flex items-center gap-4">
                {/* Game Icon with Glow */}
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' }}
                >
                  <Gamepad2 className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-purple-400/30 rounded-2xl blur-xl"
                  ></motion.div>
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white truncate">
                      {roomData.name}
                    </h1>
                    {isHost && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                        transition={{ delay: 0.3, rotate: { repeat: Infinity, duration: 3 } }}
                        className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full"
                      >
                        <Crown className="w-4 h-4 text-white fill-white" />
                        <span className="text-xs font-black text-white">HOST</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Radio className="w-4 h-4 animate-pulse text-green-400" />
                    <span className="text-sm font-semibold">{t('multiplayer.roomTitle')}</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      Room #{roomData.code}
                    </span>
                  </div>
                </div>
              </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Player Count */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transition-shadow">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                    <span className="text-white font-bold text-sm sm:text-base">{players.length}/{roomData.maxPlayers}</span>
                    <span className="text-blue-50 text-xs sm:text-sm font-medium hidden sm:inline">{t('multiplayer.players')}</span>
                    <div className="hidden md:flex items-center gap-1 ml-1 pl-1 border-l border-blue-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-blue-50 text-xs font-medium">{onlineCount} {t('multiplayer.online')}</span>
                    </div>
                  </div>

                  {/* Ready Count */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg transition-shadow">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                    <span className="text-white font-bold text-sm sm:text-base">{readyCount}</span>
                    <span className="text-green-50 text-xs sm:text-sm font-medium hidden sm:inline">{t('multiplayer.ready')}</span>
                  </div>

                  {/* Giant Room Code with Neon */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyRoomCode}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                    <div className={`relative px-6 py-3 rounded-2xl flex items-center gap-3 transition-all ${
                      copySuccess
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600'
                    }`}>
                      {copySuccess ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Copy className="w-6 h-6 text-white" />
                      )}
                      <span className="text-white font-mono font-black text-2xl tracking-wider">
                        {roomData.code}
                      </span>
                    </div>
                  </motion.button>
                </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:gap-3 w-full lg:w-auto">
                {/* Countdown Timer - Enhanced Visual */}
                {countdownData && countdownData.isActive && countdownData.remaining > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transform hover:scale-105 transition-transform">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white rounded-full blur animate-ping"></div>
                        <Clock className="relative w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-black text-white tabular-nums">
                          {countdownData.remaining}
                        </div>
                        <div className="text-sm text-orange-50 font-bold uppercase tracking-wider">
                          {t('multiplayer.starting')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  {/* QR Code Button */}
                  <button
                    onClick={() => setShowQRCode(!showQRCode)}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 text-indigo-700 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-md text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="hidden sm:inline">QR</span>
                  </button>
                  
                  {/* Share Button */}
                  <button
                    onClick={handleShareRoom}
                    className="px-4 py-2.5 bg-gradient-to-r from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 text-green-700 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-md text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('multiplayer.share')}</span>
                  </button>
                  
                  {/* Music Toggle */}
                  <button
                    onClick={toggleMusic}
                    className="px-4 py-2.5 bg-gradient-to-r from-pink-100 to-rose-100 hover:from-pink-200 hover:to-rose-200 text-pink-700 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-md text-sm"
                  >
                    {isMusicPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  
                  {/* Settings Button - Host Only */}
                  {isHost && (
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="px-4 py-2.5 bg-gradient-to-r from-gray-100 to-slate-100 hover:from-gray-200 hover:to-slate-200 text-gray-700 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-md text-sm"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Leave Button */}
                  <button
                    onClick={onLeaveRoom}
                    className="px-4 py-2.5 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-700 rounded-xl font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-md text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('multiplayer.leave')}</span>
                  </button>
                  
                  {/* Giant Ready Button with Neon */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleToggleReady}
                    className="relative group flex-1 lg:flex-none"
                  >
                    <div className={`absolute inset-0 rounded-2xl blur-xl transition-all ${
                      currentPlayer?.isReady
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 opacity-75 group-hover:opacity-100'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 opacity-75 group-hover:opacity-100'
                    }`}></div>
                    <div className={`relative px-8 py-4 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 transition-all ${
                      currentPlayer?.isReady
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white'
                    }`}>
                      {currentPlayer?.isReady ? (
                        <>
                          <Play className="w-6 h-6" />
                          <span>{t('multiplayer.notReady').toUpperCase()}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-6 h-6" />
                          <span>{t('multiplayer.ready').toUpperCase()}</span>
                        </>
                      )}
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {/* Total Players */}
              <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-blue-100 hover:border-blue-200 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-0.5 sm:mb-1">{players.length}</div>
                    <div className="text-blue-600 text-xs sm:text-sm font-semibold">{t('multiplayer.total')}</div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* Ready Players */}
              <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-green-100 hover:border-green-200 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-0.5 sm:mb-1">{readyCount}</div>
                    <div className="text-green-600 text-xs sm:text-sm font-semibold">{t('multiplayer.ready')}</div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                </div>
              </div>

              {/* Time Limit */}
              <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-purple-100 hover:border-purple-200 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-0.5 sm:mb-1">{t('multiplayer.secondsShort', { value: roomData.settings.timeLimit })}</div>
                    <div className="text-purple-600 text-xs sm:text-sm font-semibold">{t('multiplayer.time')}</div>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-5 lg:p-6 mb-4 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t('multiplayer.roomSettings')}
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('multiplayer.timeLimit')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      value={roomSettings.timeLimit}
                      onChange={(e) => setRoomSettings({ ...roomSettings, timeLimit: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-purple-600 min-w-[60px] text-right">{t('multiplayer.secondsShort', { value: roomSettings.timeLimit })}</span>
                  </div>
                </div>
                
                {/* Show Leaderboard */}
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={roomSettings.showLeaderboard}
                    onChange={(e) => setRoomSettings({ ...roomSettings, showLeaderboard: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-700">
                    {t('multiplayer.showLeaderboard')}
                  </span>
                </label>
                
                {/* Allow Late Join */}
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={roomSettings.allowLateJoin}
                    onChange={(e) => setRoomSettings({ ...roomSettings, allowLateJoin: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-700">
                    {t('multiplayer.allowLateJoin')}
                  </span>
                </label>
                
                <button
                  onClick={handleUpdateSettings}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Settings className="w-5 h-5" />
                  {t('multiplayer.updateSettings')}
                </button>
              </div>
            </div>
          )}

          {/* QR Code Modal */}
          {showQRCode && qrCodeUrl && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-5 lg:p-6 mb-4 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-600" />
                  Scan to Join
                </h3>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-2xl shadow-lg border-4 border-indigo-500 mb-4">
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className="text-center text-gray-600 mb-2">
                  Scan this QR code to join the room
                </p>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-3 rounded-xl border border-indigo-200">
                  <p className="text-center">
                    <span className="text-gray-600 text-sm">Room Code:</span>
                    <span className="font-mono font-bold text-2xl text-indigo-600 ml-2">{roomData.code}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Players Grid - Glass Morphism */}
          <motion.div 
            variants={itemVariants as any}
            className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 lg:p-8"
            style={{ boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.3)' }}
          >
            <div className="flex items-center gap-4 mb-8">
              <motion.div 
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }}
              >
                <Users className="w-7 h-7 text-white" />
              </motion.div>
              <div className="flex-1">
                <h2 className="text-2xl lg:text-3xl font-black text-white">{t('multiplayer.players')}</h2>
                <p className="text-white/60 text-sm">Who's ready to play?</p>
              </div>
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <span className="text-white font-bold text-lg">{players.length}/{roomData.maxPlayers}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {players.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">👥</div>
                  <p className="text-gray-500 font-medium">{t('multiplayer.noPlayers')}</p>
                  <p className="text-gray-400 text-sm mt-1">{t('multiplayer.waitingForPlayers')}</p>
                </div>
              ) : (
                players.map((player, index) => {
                const isCurrentUser = player.id === currentUserId;
                const isPlayerHost = player.id === roomData.hostId;
                
                // Vibrant gradient colors
                const avatarGradients = [
                  'from-blue-500 via-blue-600 to-indigo-600',
                  'from-green-500 via-emerald-600 to-teal-600',
                  'from-purple-500 via-purple-600 to-pink-600',
                  'from-orange-500 via-red-500 to-pink-600',
                  'from-cyan-500 via-blue-500 to-indigo-600',
                  'from-pink-500 via-rose-500 to-red-600',
                  'from-teal-500 via-cyan-500 to-blue-600',
                  'from-yellow-500 via-orange-500 to-red-600'
                ];
                const avatarGradient = avatarGradients[index % avatarGradients.length];
                
                return (
                  <motion.div
                    key={player.id}
                    variants={playerJoinVariants as any}
                    initial="initial"
                    animate="animate"
                    whileHover={{ y: -8, scale: 1.02 }}
                    className={`group relative backdrop-blur-xl rounded-2xl p-4 lg:p-6 border-2 transition-all ${
                      isCurrentUser
                        ? 'bg-blue-500/20 border-blue-400/50 shadow-blue-500/50'
                        : player.isReady
                        ? 'bg-green-500/20 border-green-400/50 shadow-green-500/50'
                        : 'bg-white/10 border-white/20'
                    }`}
                    style={{
                      boxShadow: player.isReady ? '0 0 30px rgba(34, 197, 94, 0.4)' : '0 8px 24px rgba(0,0,0,0.2)'
                    }}
                  >
                    {/* Host Crown Badge */}
                    {isPlayerHost && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 p-2 rounded-full shadow-lg animate-bounce">
                          <Crown className="w-5 h-5 text-white fill-white" />
                        </div>
                      </div>
                    )}

                    {/* "You" Badge */}
                    {isCurrentUser && !isPlayerHost && (
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
                        <div className="bg-gradient-to-r from-blue-400 to-indigo-400 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5 shadow-lg animate-pulse">
                          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white flex-shrink-0" />
                          <span className="text-xs font-black text-white">{t('multiplayer.you')}</span>
                        </div>
                      </div>
                    )}

                    {/* Kick Button - Host Only */}
                    {isHost && !isCurrentUser && player.id !== roomData.hostId && (
                      <button
                        onClick={() => handleKickPlayer(player.id)}
                        className="absolute top-2 right-2 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Kick player"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}

                    {/* Player Content */}
                    <div className="flex items-center gap-4 mb-3">
                      {/* HUGE Avatar with Glow */}
                      <div className="relative flex-shrink-0">
                        <motion.div 
                          animate={player.isReady ? (readyPulseVariants.ready as any) : {}}
                          className="relative"
                        >
                          {/* Glow effect */}
                          {player.isReady && (
                            <motion.div 
                              animate={{ 
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 0.8, 0.5]
                              }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute inset-0 bg-green-400/50 rounded-3xl blur-xl"
                            ></motion.div>
                          )}
                          {/* Avatar - Real photo or gradient initials */}
                          {player.photoURL ? (
                            <img 
                              src={player.photoURL} 
                              alt={player.username}
                              className={`relative w-20 h-20 lg:w-24 lg:h-24 rounded-3xl object-cover shadow-2xl border-4 ${
                                player.isReady ? 'border-green-400' : 'border-purple-400'
                              }`}
                              style={{ boxShadow: `0 0 30px ${player.isReady ? 'rgba(34, 197, 94, 0.6)' : 'rgba(139, 92, 246, 0.4)'}` }}
                            />
                          ) : (
                            <div 
                              className={`relative w-20 h-20 lg:w-24 lg:h-24 rounded-3xl flex items-center justify-center text-3xl lg:text-4xl font-black shadow-2xl bg-gradient-to-br ${avatarGradient} text-white border-4 ${
                                player.isReady ? 'border-green-400' : 'border-purple-400'
                              }`}
                              style={{ boxShadow: `0 0 30px ${player.isReady ? 'rgba(34, 197, 94, 0.6)' : 'rgba(139, 92, 246, 0.4)'}` }}
                            >
                              {player.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </motion.div>
                        
                        {/* Online Pulse Indicator */}
                        {player.isOnline && (
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg"
                          >
                            <div className="w-full h-full bg-green-400 rounded-full animate-ping opacity-75"></div>
                          </motion.div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <h3 className={`font-bold text-sm sm:text-base lg:text-lg truncate ${
                            isCurrentUser ? 'text-blue-700' : player.isReady ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {player.username}
                          </h3>
                          {isPlayerHost && (
                            <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                              Host
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500">
                          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                            player.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span className="truncate">{player.isOnline ? t('multiplayer.online') : t('multiplayer.offline')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <div className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-bounce flex-shrink-0" />
                          <span className="text-xs font-bold text-white">{t('multiplayer.ready')}</span>
                        </div>
                      ) : (
                        <div className="flex-1 bg-gradient-to-r from-gray-400 to-slate-400 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white flex-shrink-0" />
                          <span className="text-xs font-bold text-white">{t('multiplayer.waiting')}</span>
                        </div>
                      )}
                    </div>

                    {/* Decorative Element */}
                    {player.isReady && (
                      <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 opacity-10">
                        <Trophy className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-green-600" />
                      </div>
                    )}
                  </motion.div>
                );
              })
              )}

              {/* Empty Slots with Cute Emojis */}
              {Array.from({ length: Math.max(0, roomData.maxPlayers - players.length) }).map((_, index) => (
                <motion.div
                  key={`empty-${index}`}
                  variants={itemVariants as any}
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 lg:p-6 border-2 border-dashed border-white/20 hover:border-white/40 transition-all"
                >
                  <div className="flex flex-col items-center justify-center gap-4 opacity-60">
                    {/* Cute Emoji Avatar */}
                    <motion.div 
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ repeat: Infinity, duration: 3, delay: index * 0.2 }}
                      className="w-20 h-20 lg:w-24 lg:h-24 bg-white/10 rounded-3xl flex items-center justify-center text-5xl"
                    >
                      {emptySlotEmojis[index % emptySlotEmojis.length]}
                    </motion.div>
                    
                    <div className="text-center">
                      <p className="text-white/60 text-sm font-semibold mb-1">
                        {t('multiplayer.waitingForPlayer')}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                          className="w-2 h-2 bg-white/40 rounded-full"
                        />
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                          className="w-2 h-2 bg-white/40 rounded-full"
                        />
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                          className="w-2 h-2 bg-white/40 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomLobby;

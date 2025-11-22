import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Users, 
  CheckCircle, 
  Clock,
  Copy,
  LogOut,
  Zap,
  Settings,
  X,
  QrCode,
  Share2,
  UserMinus,
  Crown,
  Gamepad2,
  MessageCircle
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import { toast } from 'react-toastify';
import type { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';
import realtimeService from '../services/realtimeMultiplayerService';
import RealtimeChat from './RealtimeChat';
import { AnimatePresence } from 'framer-motion';
import soundService from '../services/soundService';
import musicService from '../services/musicService';

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
  const [showChat, setShowChat] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [gameStartTriggered, setGameStartTriggered] = useState(false);
  const [roomSettings, setRoomSettings] = useState({
    timeLimit: roomData?.settings?.timeLimit || 30,
    showLeaderboard: roomData?.settings?.showLeaderboard ?? true,
    allowLateJoin: roomData?.settings?.allowLateJoin ?? true
  });

  const players = useMemo(() => roomData?.players || [], [roomData?.players]);
  const readyCount = useMemo(() => players.filter(p => p.isReady).length, [players]);
  const allReady = useMemo(() => players.length >= 2 && players.every(p => p.isReady), [players]);
  const currentPlayer = players.find(p => p.id === currentUserId);
  const isHost = roomData?.hostId === currentUserId;
  
  // 🎵 Play lobby music when entering room
  useEffect(() => {
    musicService.play('lobby', true);

    return () => {
      musicService.stop(true);
    };
  }, []);

  // Log player updates for debugging + play join sound
  useEffect(() => {
    console.log('🎮 RoomLobby - Players updated:', {
      total: players.length,
      ready: readyCount,
      allReady,
      playerList: players.map(p => ({ id: p.id, username: p.username, isReady: p.isReady }))
    });
    
    // Play join sound when new player joins (not on initial load)
    if (players.length > 0) {
      soundService.play('join');
    }
  }, [players.length]);
  
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
          soundService.play('gameStart'); // 🔊 Game start sound
          musicService.crossfade('game', 2000); // 🎵 Crossfade to game music
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
        soundService.play('countdown'); // 🔊 Countdown sound
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
    if (!multiplayerService || !roomData?.id) return;
    
    const newReadyState = !currentPlayer?.isReady;
    
    // ⚡ Unlock audio context on first user interaction
    console.log('🔊 User interaction detected - unlocking audio...');
    soundService.unlock();
    musicService.unlock();
    
    // Play ready sound
    console.log('🔊 Playing ready sound:', newReadyState ? 'ready' : 'click');
    soundService.play(newReadyState ? 'ready' : 'click');
    
    await multiplayerService.updatePlayerStatus(roomData.id, newReadyState);
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!multiplayerService || !roomData?.id || !isHost) {
      console.warn('❌ Cannot kick player - missing requirements:', { 
        hasService: !!multiplayerService, 
        hasRoomId: !!roomData?.id, 
        isHost 
      });
      return;
    }
    if (playerId === currentUserId) return; // Can't kick yourself
    
    // Find player name for confirmation
    const playerToKick = players.find(p => p.id === playerId);
    const playerName = playerToKick?.username || 'this player';
    
    // Confirm before kicking
    if (!confirm(`${t('multiplayer.kickConfirm', { playerName })}?`)) {
      return;
    }
    
    try {
      console.log('🚀 Kicking player:', { playerId, playerName, roomId: roomData.id });
      
      // Call Cloud Function to kick player
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const kickPlayerFn = httpsCallable<{ roomId: string; playerIdToKick: string }, { success: boolean; message: string }>(functions, 'kickPlayer');
      
      const result = await kickPlayerFn({
        roomId: roomData.id,
        playerIdToKick: playerId
      });
      
      console.log('✅ Player kicked successfully:', result.data);
      soundService.play('kick'); // 🔊 Kick sound
      toast.success(t('multiplayer.kickSuccess', { playerName }), { autoClose: 3000 });
    } catch (error: any) {
      console.error('❌ Failed to kick player:', error);
      const errorMessage = error.message || error.code || 'Unknown error';
      toast.error(t('multiplayer.kickFailed', { error: errorMessage }), { autoClose: 5000 });
    }
  };

  const handleShareRoom = async () => {
    // ✅ Share link sử dụng /multiplayer/game?code=XXX
    const roomUrl = `${window.location.origin}/multiplayer/game?code=${roomData?.code}`;
    
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

  // Removed toggleMusic - lobby music file doesn't exist

  // Generate QR Code
  useEffect(() => {
    if (roomData?.code) {
      // ✅ QR code sử dụng /multiplayer/game?code=XXX
      const roomUrl = `${window.location.origin}/multiplayer/game?code=${roomData.code}`;
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

  // Animation variants
  // const containerVariants = {
  //   hidden: { opacity: 0 },
  //   visible: {
  //     opacity: 1,
  //     transition: { staggerChildren: 0.1 }
  //   }
  // };

  // const itemVariants = {
  //   hidden: { opacity: 0, y: 20 },
  //   visible: { 
  //     opacity: 1, 
  //     y: 0,
  //     transition: { type: 'spring', stiffness: 100 }
  //   }
  // };

  // const playerJoinVariants = {
  //   initial: { opacity: 0, scale: 0.8, x: -20 },
  //   animate: { 
  //     opacity: 1, 
  //     scale: 1, 
  //     x: 0,
  //     transition: { type: 'spring', bounce: 0.5 }
  //   }
  // };

  // const readyPulseVariants = {
  //   ready: {
  //     scale: [1, 1.05, 1],
  //     transition: { 
  //       repeat: Infinity, 
  //       duration: 2,
  //       ease: 'easeInOut'
  //     }
  //   }
  // };

  // Player slot emojis
  // const emptySlotEmojis = ['😴', '⏳', '👤', '🕹️', '🎮', '🎯', '🎲', '🎪'];

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
    <div className="min-h-screen bg-[#2e1065] text-white overflow-hidden relative selection:bg-pink-500/30 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 container mx-auto px-4 py-4 h-screen flex flex-col max-h-screen">
        {/* Header Bar */}
        <header className="flex-none flex items-center justify-between mb-6 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{roomData.name}</h1>
              <div className="flex items-center gap-2 text-white/60 text-xs font-medium">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {players.length}/{roomData.maxPlayers}
                </span>
                <span>•</span>
                <span className="text-green-400">{t('multiplayer.waiting')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Desktop Actions */}
             <div className="hidden md:flex items-center gap-2 mr-2">
                <button onClick={handleCopyRoomCode} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white" title="Copy Code">
                   {copySuccess ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
                <button onClick={() => setShowQRCode(!showQRCode)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white" title="QR Code">
                   <QrCode className="w-5 h-5" />
                </button>
                <button onClick={handleShareRoom} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white" title="Share">
                   <Share2 className="w-5 h-5" />
                </button>
                {isHost && (
                  <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white" title="Settings">
                    <Settings className="w-5 h-5" />
                  </button>
                )}
             </div>

             {/* Mobile Chat Toggle */}
             <button 
               onClick={() => setShowChat(true)}
               className="md:hidden p-2 hover:bg-white/10 rounded-xl transition-colors text-white relative"
             >
               <MessageCircle className="w-5 h-5" />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#2e1065]"></span>
             </button>
             
             <div className="h-8 w-px bg-white/10 hidden md:block mx-2"></div>

             <button 
               onClick={onLeaveRoom}
               className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors"
               title={t('multiplayer.leave')}
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
          {/* Left Column: Game Area (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
             
             {/* Hero Join Info Banner */}
             <div className="flex-none relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                
                <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="text-center sm:text-left">
                      <p className="text-indigo-200 font-medium mb-1 uppercase tracking-widest text-xs sm:text-sm">Join at {window.location.hostname}</p>
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                         <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                            {roomData.code}
                         </h2>
                         <button onClick={handleCopyRoomCode} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white/60 hover:text-white">
                            {copySuccess ? <CheckCircle className="w-6 h-6 text-green-300" /> : <Copy className="w-6 h-6" />}
                         </button>
                      </div>
                   </div>

                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={handleToggleReady}
                     className={`px-8 py-4 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center gap-3 min-w-[200px] justify-center ${
                       currentPlayer?.isReady
                         ? 'bg-white/10 text-white border-2 border-white/20'
                         : 'bg-white text-indigo-600 hover:bg-indigo-50'
                     }`}
                   >
                     {currentPlayer?.isReady ? (
                       <>
                         <Clock className="w-6 h-6" />
                         {t('multiplayer.notReady')}
                       </>
                     ) : (
                       <>
                         <Zap className="w-6 h-6 fill-current" />
                         {t('multiplayer.ready')}
                       </>
                     )}
                   </motion.button>
                </div>
             </div>

             {/* Countdown Overlay */}
             {countdownData && countdownData.isActive && countdownData.remaining > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 flex items-center justify-center gap-6 shadow-lg"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-white blur-lg opacity-30 animate-pulse"></div>
                      <Clock className="relative w-10 h-10 text-white" />
                   </div>
                   <div className="text-3xl font-black text-white">
                      {t('multiplayer.starting')} <span className="text-yellow-300 text-4xl mx-2">{countdownData.remaining}</span>
                   </div>
                </motion.div>
             )}

             {/* Players Grid */}
             <div>
                <div className="flex items-center justify-between mb-4 px-2">
                   <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-fuchsia-400" />
                      {t('multiplayer.players')} <span className="bg-white/10 px-2 py-0.5 rounded-lg text-sm">{players.length}</span>
                   </h3>
                   <div className="text-sm text-white/40">
                      {readyCount} {t('multiplayer.ready')}
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {players.map((player) => {
                      const isCurrentUser = player.id === currentUserId;
                      const isPlayerHost = player.id === roomData.hostId;
                      
                      return (
                          <motion.div
                            key={player.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`relative group overflow-hidden rounded-2xl transition-all duration-300 ${
                              player.isReady 
                                ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 shadow-lg shadow-green-500/10' 
                                : 'bg-white/5 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="p-4 flex flex-col items-center gap-3">
                                <div className="relative">
                                  {player.photoURL ? (
                                      <img src={player.photoURL} alt={player.username} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
                                  ) : (
                                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg ${
                                        player.isReady ? 'bg-green-500 text-white' : 'bg-gradient-to-br from-gray-700 to-gray-600 text-white'
                                      }`}>
                                        {player.username.charAt(0).toUpperCase()}
                                      </div>
                                  )}
                                  
                                  {isPlayerHost && (
                                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-1 rounded-full shadow-md z-10">
                                        <Crown className="w-3 h-3 fill-current" />
                                      </div>
                                  )}
                                  
                                  {player.isReady && (
                                      <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-md z-10">
                                        <CheckCircle className="w-4 h-4" />
                                      </div>
                                  )}
                                </div>
                                
                                <div className="text-center w-full">
                                  <div className={`font-bold truncate text-sm ${isCurrentUser ? 'text-fuchsia-300' : 'text-white'}`}>
                                      {player.username}
                                  </div>
                                  <div className="text-xs text-white/40 font-medium mt-0.5">
                                      {player.isReady ? 'READY' : 'WAITING'}
                                  </div>
                                </div>
                            </div>
                            
                            {/* Kick Button (visible to host on hover) */}
                            {isHost && !isCurrentUser && !isPlayerHost && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleKickPlayer(player.id);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg z-20 hover:scale-110"
                                title={t('multiplayer.kickPlayer')}
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </motion.div>
                      );
                    })}

                    {/* Empty Slots */}
                    {Array.from({ length: Math.max(0, roomData.maxPlayers - players.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-[4/5] sm:aspect-auto sm:h-full rounded-2xl border-2 border-dashed border-white/5 bg-white/5 flex flex-col items-center justify-center gap-2 opacity-30">
                          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-medium text-white">Empty</span>
                      </div>
                    ))}
                </div>
             </div>
          </div>

          {/* Right Column: Chat (4 cols) */}
          <div className="hidden lg:block lg:col-span-4 h-full min-h-0 bg-black/20 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-md">
             <RealtimeChat 
                roomId={roomData.id}
                currentUserId={currentUserId}
                currentUsername={currentPlayer?.username || 'Unknown'}
                transparent={true}
             />
          </div>
        </div>

        {/* Mobile Chat Drawer */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 bg-[#1e1b4b] md:hidden"
            >
              <RealtimeChat 
                roomId={roomData.id}
                currentUserId={currentUserId}
                currentUsername={currentPlayer?.username || 'Unknown'}
                isMobile={true}
                onClose={() => setShowChat(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Modals (Settings, QR) */}
        {showSettings && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{t('multiplayer.roomSettings')}</h3>
                    <button onClick={() => setShowSettings(false)}><X className="w-5 h-5 text-white/60" /></button>
                 </div>
                 {/* Settings Content */}
                 <div className="space-y-6">
                    <div>
                       <label className="block text-sm font-medium text-white/60 mb-2">{t('multiplayer.timeLimit')}</label>
                       <input 
                          type="range" min="5" max="60" step="5" 
                          value={roomSettings.timeLimit}
                          onChange={(e) => setRoomSettings({...roomSettings, timeLimit: parseInt(e.target.value)})}
                          className="w-full accent-blue-500"
                       />
                       <div className="text-right text-blue-400 font-mono mt-1">{roomSettings.timeLimit}s</div>
                    </div>
                    <button onClick={handleUpdateSettings} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">
                       {t('multiplayer.updateSettings')}
                    </button>
                 </div>
              </div>
           </div>
        )}

        {showQRCode && qrCodeUrl && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                 <h3 className="text-xl font-bold text-gray-900 mb-4">Join Room</h3>
                 <img src={qrCodeUrl} alt="QR Code" className="w-full aspect-square object-contain mb-4" />
                 <p className="text-2xl font-mono font-bold text-blue-600 tracking-widest">{roomData.code}</p>
                 <button onClick={() => setShowQRCode(false)} className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold">{t('common.close')}</button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default RoomLobby;

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Trophy, 
  Crown,
  Loader,
  Play,
  X,
  ArrowLeft,
  QrCode,
  Share2,
  Copy,
  CheckCircle
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, deleteDoc, getDocs } from 'firebase/firestore';
import QRCodeLib from 'qrcode';
import { modernMultiplayerService, ModernPlayer, ModernQuiz } from '../services/modernMultiplayerService';
import MemoizedPlayerCard from './MemoizedPlayerCard';
import KickPlayerConfirmDialog from './KickPlayerConfirmDialog';

// Import enhanced components
import ModernRealtimeChat from './ModernRealtimeChat';
import ModernLiveLeaderboard from './ModernLiveLeaderboard';
import ModernHostControlPanel from './ModernHostControlPanel';
import ModernConnectionStatus from './ModernConnectionStatus';
import ModernPowerUpsPanel from './ModernPowerUpsPanel';
import ModernGameAnnouncements from './ModernGameAnnouncements';
import { useGameAnnouncements } from './ModernGameAnnouncements';

interface ModernRoomLobbyProps {
  roomId: string;
  selectedQuiz: ModernQuiz | null;
  onGameStart: () => void;
  onBack: () => void;
}

const ModernRoomLobby: React.FC<ModernRoomLobbyProps> = ({
  roomId,
  selectedQuiz,
  onGameStart,
  onBack
}) => {
  const { t } = useTranslation('multiplayer');
  const [players, setPlayers] = useState<{ [key: string]: ModernPlayer }>({});
  const [isStarting, setIsStarting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [kickDialog, setKickDialog] = useState<{
    isOpen: boolean;
    player: ModernPlayer | null;
    isKicking: boolean;
  }>({
    isOpen: false,
    player: null,
    isKicking: false
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Enhanced features hooks
  const announcements = useGameAnnouncements(roomId);

  // Host control functions
  const handleKickPlayerClick = useCallback((player: ModernPlayer) => {
    setKickDialog({
      isOpen: true,
      player,
      isKicking: false
    });
  }, []);

  const handleKickPlayer = useCallback(async () => {
    if (!kickDialog.player) return;

    try {
      setKickDialog(prev => ({ ...prev, isKicking: true }));
      await modernMultiplayerService.kickPlayer(kickDialog.player.id);
      
      // Close dialog on success
      setKickDialog({
        isOpen: false,
        player: null,
        isKicking: false
      });
    } catch (error) {
      console.error('❌ Failed to kick player:', error);
      // Reset loading state but keep dialog open for retry
      setKickDialog(prev => ({ ...prev, isKicking: false }));
    }
  }, [kickDialog.player]);

  const handleKickDialogCancel = useCallback(() => {
    setKickDialog({
      isOpen: false,
      player: null,
      isKicking: false
    });
  }, []);

  const handleTransferHost = useCallback(async (playerId: string) => {
    try {
      await modernMultiplayerService.transferHost(playerId);
    } catch (error) {
      console.error('❌ Failed to transfer host:', error);
    }
  }, []);

  // Helper functions
  const generateQRCode = async () => {
    try {
      const roomUrl = `${window.location.origin}/multiplayer/${roomId}`;
      const qrDataUrl = await QRCodeLib.toDataURL(roomUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setShowQRModal(true);
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
    }
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('❌ Failed to copy room code:', error);
    }
  };

  const handleShareRoom = async () => {
    try {
      const roomUrl = `${window.location.origin}/multiplayer/${roomId}`;
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Quiz Room',
          text: `Join my quiz room with code: ${roomId}`,
          url: roomUrl
        });
      } else {
        await navigator.clipboard.writeText(roomUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('❌ Failed to share room:', error);
    }
  };

  const clearChatMessages = async () => {
    try {
      if (!roomId) return;
      
      const messagesQuery = query(
        collection(modernMultiplayerService.db, 'multiplayer_rooms', roomId, 'messages')
      );
      const snapshot = await getDocs(messagesQuery);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Cleared chat messages');
    } catch (error) {
      console.error('❌ Failed to clear chat messages:', error);
    }
  };

  const handleStartGame = async () => {
    try {
      setIsStarting(true);
      
      // Clear chat messages before starting game
      await clearChatMessages();
      
      // Make announcement
      announcements.announceGameStarting(5);
      
      await modernMultiplayerService.startGame();
      setTimeout(() => {
        onGameStart();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      setIsStarting(false);
    }
  };

  // Memoized derived state to prevent unnecessary recalculations
  const playersList = useMemo(() => Object.values(players), [players]);
  const readyCount = useMemo(() => playersList.filter((p) => p.isReady).length, [playersList]);
  const allReady = useMemo(() => 
    playersList.length >= 2 && playersList.every((p) => p.isReady), 
    [playersList]
  );
  const isHost = useMemo(() => 
    playersList.length > 0 && playersList[0]?.id === currentUserId, 
    [playersList, currentUserId]
  );

  useEffect(() => {
    const initializeLobby = async () => {
      try {
        // Get current user ID
        const auth = getAuth();
        setCurrentUserId(auth.currentUser?.uid || '');

        // Set up real-time listeners
        const playersUpdateId = modernMultiplayerService.on('players:updated', handlePlayersUpdate);
        const gameUpdateId = modernMultiplayerService.on('game:updated', handleGameStateUpdate);
        const errorId = modernMultiplayerService.on('error', handleError);

        // Set up chat listener
        let unsubscribe: (() => void) | undefined;
        if (roomId) {
          const messagesQuery = query(
            collection(modernMultiplayerService.db, 'multiplayer_rooms', roomId, 'messages'),
            orderBy('timestamp', 'asc')
          );
          
          unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMessages(newMessages);
          });
        }
        
        return () => {
          if (unsubscribe) {
            unsubscribe();
          }
          modernMultiplayerService.off('players:updated', playersUpdateId);
          modernMultiplayerService.off('game:updated', gameUpdateId);
          modernMultiplayerService.off('error', errorId);
          
          // Clear large state objects to prevent memory leaks
          setPlayers({});
          setMessages([]);
        };
      } catch (error) {
        console.error('❌ Failed to initialize lobby:', error);
      }
    };

    const cleanup = initializeLobby();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [roomId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePlayersUpdate = useCallback((playersData: { [key: string]: ModernPlayer }) => {
    setPlayers(playersData);
    
    // Check if current player was kicked (no longer in players list)
    if (currentUserId && !playersData[currentUserId]) {
      // Current player was kicked - show notification and redirect
      console.log('🚫 Player was kicked from room');
      
      // Show alert to user
      alert('You have been removed from this room by the host.');
      
      // Redirect back to multiplayer main page
      setTimeout(() => {
        window.location.href = '/multiplayer';
      }, 1000);
    }
  }, [currentUserId]);

  const handleGameStateUpdate = useCallback((_gameStateData: any) => {
    // Game state updates handled by RTDB listeners
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('❌ Lobby error:', error);
  }, []);

  const handleReconnect = useCallback(async () => {
    try {
      await modernMultiplayerService.reconnect();
      console.log('✅ Reconnected successfully');
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }, []);

  const handlePowerUpUse = (powerUpId: any) => {
    console.log('Power-up used:', powerUpId);
    // Power-up logic will be handled in game play
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 sm:p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </motion.button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t('roomLobby')}</h2>
              <p className="text-blue-100 text-sm sm:text-base">{t('code')}: {roomId}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
            {/* Sharing Buttons */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyRoomCode}
                className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                title="Copy room code"
              >
                <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateQRCode}
                className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                title="Show QR code"
              >
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShareRoom}
                className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                title="Share room"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </motion.button>
            </div>
            
            <div className="text-center sm:text-right">
              <p className="text-blue-200 text-xs sm:text-sm">{t('readyPlayers')}</p>
              <p className="text-lg sm:text-xl font-bold text-white">{readyCount}/{playersList.length}</p>
            </div>
            {isHost && allReady && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                disabled={isStarting}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all text-sm sm:text-base"
              >
                {isStarting ? (
                  <>
                    <Loader className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">{t('startingGame')}</span>
                    <span className="sm:hidden">Starting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('startGame')}</span>
                    <span className="sm:hidden">Start</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        {/* Main Lobby Area */}
        <div className="xl:col-span-3 space-y-4 sm:space-y-6">
          {/* Quiz Info */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl sm:rounded-2xl">
                  <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{selectedQuiz?.title}</h2>
                  <p className="text-blue-200 text-sm sm:text-base truncate">{selectedQuiz?.description}</p>
                </div>
              </div>
              {isHost && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="p-1.5 sm:p-2 bg-yellow-500/20 rounded-xl self-start sm:self-auto"
                >
                  <Crown className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-400" />
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{selectedQuiz?.questionCount}</div>
                <div className="text-xs sm:text-sm text-blue-200">{t('questions')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{selectedQuiz?.timeLimit}s</div>
                <div className="text-xs sm:text-sm text-blue-200">{t('timeLimit')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{selectedQuiz?.difficulty}</div>
                <div className="text-xs sm:text-sm text-blue-200">{t('difficulty')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{playersList.length}</div>
                <div className="text-xs sm:text-sm text-blue-200">{t('players')}</div>
              </div>
            </div>
          </motion.div>

          {/* Players List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                <span>{t('players')} ({playersList.length})</span>
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs sm:text-sm text-green-400">{t('liveSync')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {playersList.map((player) => (
                  <MemoizedPlayerCard
                    key={player.id}
                    player={player}
                    isHost={isHost}
                    currentUserId={currentUserId}
                    hostId={playersList[0]?.id || ''}
                    onKickPlayer={handleKickPlayerClick}
                  />
                ))}
              </AnimatePresence>

              {playersList.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6 sm:py-8"
                >
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-blue-100 text-sm sm:text-base">{t('waitingForPlayers')}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Side Panel */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {/* Enhanced Chat Component */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ModernRealtimeChat
              roomId={roomId}
              currentUserId={currentUserId}
              currentUsername={players[currentUserId]?.name || 'Player'}
              currentUserPhoto={players[currentUserId]?.photoURL}
              isMobile={false}
            />
          </motion.div>

          {/* Connection Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ModernConnectionStatus
              roomId={roomId}
              currentUserId={currentUserId}
              onReconnect={handleReconnect}
              showDetailed={true}
              compact={false}
            />
          </motion.div>

          {/* Live Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <ModernLiveLeaderboard
              roomId={roomId}
              currentUserId={currentUserId}
              compact={true}
              showTop={5}
              showAnimations={true}
            />
          </motion.div>

          {/* Power-ups Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <ModernPowerUpsPanel
              roomId={roomId}
              currentUserId={currentUserId}
              onPowerUpUse={handlePowerUpUse}
              compact={true}
            />
          </motion.div>

          {/* Host Control Panel (only for host) */}
          {isHost && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <ModernHostControlPanel
                roomId={roomId}
                currentUserId={currentUserId}
                isHost={isHost}
                players={playersList}
                onGameStart={handleStartGame}
                onGamePause={() => {}}
                onGameResume={() => {}}
                onKickPlayer={() => {}}
                onTransferHost={handleTransferHost}
                onSettingsUpdate={() => {}}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Game Announcements */}
      <ModernGameAnnouncements
        roomId={roomId}
        currentUserId={currentUserId}
        maxAnnouncements={3}
        showSoundEffects={true}
        position="top-right"
      />

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-gradient-to-br from-blue-900/90 to-cyan-900/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full relative border border-white/20 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-cyan-400" />
                  <span>{t('shareRoom')}</span>
                </h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-2xl mb-4">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="Room QR Code" 
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* Room Code */}
              <div className="text-center mb-4">
                <p className="text-blue-200 text-sm mb-2">{t('roomCode')}</p>
                <p className="text-2xl font-bold text-white">{roomId}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyRoomCode}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center justify-center space-x-2"
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{t('copyCode')}</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShareRoom}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('shareLink')}</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kick Player Confirmation Dialog */}
      <KickPlayerConfirmDialog
        isOpen={kickDialog.isOpen}
        player={kickDialog.player}
        onConfirm={handleKickPlayer}
        onCancel={handleKickDialogCancel}
        isKicking={kickDialog.isKicking}
      />
    </motion.div>
  );
};

export default ModernRoomLobby;

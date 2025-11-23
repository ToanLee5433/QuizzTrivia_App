import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Play, 
  Crown, 
  Copy, 
  CheckCircle, 
  X, 
  ArrowLeft, 
  ArrowRight,
  QrCode,
  Share2,
  Monitor,
  MessageSquare,
  Loader,
  Trophy
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, onValue, getDatabase } from 'firebase/database';
import QRCodeLib from 'qrcode';
import { modernMultiplayerService, ModernPlayer, ModernQuiz } from '../services/modernMultiplayerService';
import MemoizedPlayerCard from './MemoizedPlayerCard';
import KickPlayerConfirmDialog from './KickPlayerConfirmDialog';
import SharedScreen from './SharedScreen';

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
  const [roomData, setRoomData] = useState<any>(null);
  const [quiz, setQuiz] = useState<ModernQuiz | null>(selectedQuiz);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
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
  const initializingRef = useRef(false); // Track if currently initializing

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

  const handleToggleReady = useCallback(async () => {
    try {
      await modernMultiplayerService.toggleReady();
      console.log('✅ Ready status toggled');
    } catch (error) {
      console.error('❌ Failed to toggle ready:', error);
    }
  }, []);

  const handleToggleHostParticipation = useCallback(async () => {
    try {
      await modernMultiplayerService.toggleHostParticipation();
      console.log('✅ Host participation toggled');
    } catch (error) {
      console.error('❌ Failed to toggle host participation:', error);
    }
  }, []);

  const handleToggleRole = useCallback(async () => {
    try {
      await modernMultiplayerService.toggleRole();
      console.log('✅ Role toggled');
    } catch (error) {
      console.error('❌ Failed to toggle role:', error);
    }
  }, []);

  const handleTransferHost = useCallback(async (player: ModernPlayer) => {
    try {
      const confirmed = window.confirm(`Chuyển quyền host cho ${player.name}?`);
      if (confirmed) {
        await modernMultiplayerService.transferHost(player.id);
        console.log('✅ Host transferred to:', player.name);
      }
    } catch (error) {
      console.error('❌ Failed to transfer host:', error);
    }
  }, []);

  const handleSharedScreenUpdate = useCallback(async (screenData: any) => {
    try {
      await modernMultiplayerService.updateSharedScreen(screenData);
      console.log('✅ Shared screen updated:', screenData);
    } catch (error) {
      console.error('❌ Failed to update shared screen:', error);
    }
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
      const codeToShare = roomData?.code || roomId;
      await navigator.clipboard.writeText(codeToShare);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('❌ Failed to copy room code:', error);
    }
  };

  const handleShareRoom = async () => {
    try {
      const roomCode = roomData?.code || roomId;
      const roomUrl = `${window.location.origin}/multiplayer/${roomId}`;
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Quiz Room',
          text: `Join my quiz room with code: ${roomCode}`,
          url: roomUrl
        });
      } else {
        await navigator.clipboard.writeText(roomCode);
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
  const playersList = useMemo(() => {
    return Object.values(players);
  }, [players]);
  
  // Spectators = those who are watching (spectator role + host not participating)
  const spectators = useMemo(() => {
    return playersList.filter(p => {
      return p.role === 'spectator' || (p.role === 'host' && p.isParticipating === false);
    });
  }, [playersList]);
  
  // Active players = those who are actually playing (not spectators, and host if participating)
  const activePlayers = useMemo(() => {
    return playersList.filter(p => {
      if (!p || !p.role) {
        return true; // ✅ Include players without role (assume they are active)
      }
      if (p.role === 'spectator') return false;
      if (p.role === 'host') return p.isParticipating !== false;
      return true; // regular players
    });
  }, [playersList]);
  
  const readyCount = useMemo(() => activePlayers.filter((p) => p.isReady).length, [activePlayers]);
  const allReady = useMemo(() => {
    // Game can start if: at least 2 active players AND at least 1 non-host player is ready
    const nonHostActivePlayers = activePlayers.filter(p => p.id !== roomData?.hostId);
    const readyNonHostPlayers = nonHostActivePlayers.filter(p => p.isReady);
    return activePlayers.length >= 2 && readyNonHostPlayers.length >= 1;
  }, [activePlayers, roomData?.hostId]);
  const isHost = useMemo(() => {
    // Only check roomData.hostId - no fallback to first player
    return roomData?.hostId === currentUserId;
  }, [roomData?.hostId, currentUserId]);

  // ✅ CRITICAL: Define handlers BEFORE useEffect so they have correct dependencies
  const handlePlayersUpdate = useCallback((playersData: { [key: string]: ModernPlayer }) => {
    // ✅ Force immediate update
    setPlayers(playersData);
    
    // Check if current player was kicked
    if (currentUserId && !playersData[currentUserId]) {
      alert('You have been removed from this room by the host.');
      setTimeout(() => {
        window.location.href = '/multiplayer';
      }, 1000);
    }
  }, [currentUserId]);

  const handleGameStateUpdate = useCallback((_gameStateData: any) => {
    // Game state updates handled by RTDB listeners
  }, []);

  const handleRoomUpdate = useCallback((updatedRoom: any) => {
    setRoomData(updatedRoom);
    if (updatedRoom.quiz) {
      setQuiz(updatedRoom.quiz);
    }
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('❌ Lobby error:', error);
  }, []);

  useEffect(() => {
    // ✅ Prevent duplicate initialization while one is in progress
    if (initializingRef.current) {
      return;
    }
    
    initializingRef.current = true;

    const initializeLobby = async () => {
      try {
        setIsLoadingRoom(true);
        
        // ✅ Get and set current user ID IMMEDIATELY
        const auth = getAuth();
        const userId = auth.currentUser?.uid || '';
        setCurrentUserId(userId); // Set NOW before fetch
        
        // ✅ Fetch players + room data in PARALLEL for faster loading
        const [playersData, roomData] = await Promise.all([
          // Fetch players from RTDB
          (async () => {
            const { ref: refFn, get: getFn } = await import('firebase/database');
            const playersRef = refFn(modernMultiplayerService['rtdb'], `rooms/${roomId}/players`);
            const playersSnapshot = await getFn(playersRef);
            return playersSnapshot.val() || {};
          })(),
          // Fetch room data from Firestore
          (async () => {
            const { doc: docFn, getDoc } = await import('firebase/firestore');
            const roomDocRef = docFn(modernMultiplayerService.db, 'multiplayer_rooms', roomId);
            const roomDocSnap = await getDoc(roomDocRef);
            return roomDocSnap.exists() ? roomDocSnap.data() : null;
          })()
        ]);
        
        // ✅ Set up real-time listeners FIRST (before setting state)
        const playersUpdateId = modernMultiplayerService.on('players:updated', handlePlayersUpdate);
        const gameUpdateId = modernMultiplayerService.on('game:updated', handleGameStateUpdate);
        const roomUpdateId = modernMultiplayerService.on('room:updated', handleRoomUpdate);
        const errorId = modernMultiplayerService.on('error', handleError);

        // ✅ NOW set initial data after listeners are ready
        setPlayers(playersData);
        if (roomData) {
          setRoomData(roomData);
          if (roomData.quiz) setQuiz(roomData.quiz);
        }
        
        setIsLoadingRoom(false);

        // Set up chat listener
        let chatUnsubscribe: (() => void) | undefined;
        let roomUnsubscribe: (() => void) | undefined;
        
        if (roomId) {
          // Chat messages listener
          const messagesQuery = query(
            collection(modernMultiplayerService.db, 'multiplayer_rooms', roomId, 'messages'),
            orderBy('timestamp', 'asc')
          );
          
          chatUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMessages(newMessages);
          });
          
          // Room data listener for quiz info and settings
          const { doc: docFn } = await import('firebase/firestore');
          roomUnsubscribe = onSnapshot(
            docFn(modernMultiplayerService.db, 'multiplayer_rooms', roomId),
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setRoomData(data);
                if (data.quiz) {
                  setQuiz(data.quiz);
                }
              } else {
                console.error('❌ Room document does not exist');
              }
            },
            (error) => {
              console.error('❌ Error listening to room:', error);
            }
          );
        }
        
        return () => {
          if (chatUnsubscribe) {
            chatUnsubscribe();
          }
          if (roomUnsubscribe) {
            roomUnsubscribe();
          }
          modernMultiplayerService.off('players:updated', playersUpdateId);
          modernMultiplayerService.off('game:updated', gameUpdateId);
          modernMultiplayerService.off('room:updated', roomUpdateId);
          modernMultiplayerService.off('error', errorId);
          
          // Note: Don't clear state here as it causes race conditions in StrictMode
          // State will be cleaned up when component truly unmounts
          
          // Reset initializing flag
          initializingRef.current = false;
        };
      } catch (error) {
        console.error('❌ Failed to initialize lobby:', error);
        initializingRef.current = false;
      }
    };

    let cleanupFn: (() => void) | undefined;
    initializeLobby().then(fn => {
      cleanupFn = fn;
    });

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [roomId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to RTDB room data for real-time updates (including sharedScreen)
  useEffect(() => {
    if (!roomId) return;
    
    const database = getDatabase();
    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        // ⚠️ CRITICAL: RTDB has players at rooms/{roomId}/players (separate from room data)
        // This listener is for room-level data ONLY (sharedScreen, gameState, etc)
        // Players are managed separately via handlePlayersUpdate
        
        const { players: rtdbPlayers, ...rtdbData } = data;
        
        // Update roomData with RTDB data EXCLUDING players
        // Players state is managed separately to avoid race conditions
        setRoomData((prev: any) => {
          if (!prev) return rtdbData; // First time
          
          // Merge but preserve Firestore data
          return {
            ...prev, // Keep Firestore data (hostId, quiz, etc)
            ...rtdbData, // Add RTDB data (sharedScreen, gameState, etc)
            // Never overwrite players - it's managed separately
          };
        });
      }
    }, (error) => {
      console.error('❌ RTDB room listener error:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [roomId]);

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
              <p className="text-blue-100 text-sm sm:text-base">{t('code')}: {roomData?.code || roomId}</p>
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
              <p className="text-lg sm:text-xl font-bold text-white">{readyCount}/{activePlayers.length}</p>
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
                    <div className="relative">
                      <Loader className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-blue-400/20 rounded-full animate-ping"></div>
                    </div>
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

      {/* Loading State */}
      {isLoadingRoom && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center"
        >
          <Loader className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
          <p className="text-white text-lg font-semibold">{t('loadingRoom')}</p>
          <p className="text-blue-200 text-sm mt-2">{t('pleaseWait')}</p>
        </motion.div>
      )}

      {/* Main Content - Only show after loading */}
      {!isLoadingRoom && (
        <>
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
                  <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{quiz?.title || 'Loading...'}</h2>
                  <p className="text-blue-200 text-sm sm:text-base truncate">{quiz?.description || ''}</p>
                </div>
              </div>
              {isHost && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="p-1.5 sm:p-2 bg-yellow-500/20 rounded-xl self-start sm:self-auto"
                  title="You are the host"
                >
                  <Crown className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-400" />
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{quiz?.questionCount || quiz?.questions?.length || 0}</div>
                <div className="text-xs sm:text-sm text-blue-200">{t('questions')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">{quiz?.timeLimit || roomData?.settings?.timePerQuestion || 30}s</div>
                <div className="text-xs sm:text-sm text-blue-200">{t('timeLimit')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">
                  {quiz?.difficulty ? t(quiz.difficulty.toLowerCase()) : t('medium')}
                </div>
                <div className="text-xs sm:text-sm text-blue-200">{t('difficulty')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-white">
                  {activePlayers.length}
                  {playersList.length !== activePlayers.length && (
                    <span className="text-sm text-gray-400 ml-1">({playersList.length} total)</span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-blue-200">{t('players')}</div>
              </div>
            </div>
          </motion.div>

          {/* Shared Screen - Central Display */}
          {(roomData?.settings?.screenEnabled ?? false) ? (
            <SharedScreen
              roomData={roomData}
              isHost={isHost}
              onScreenUpdate={handleSharedScreenUpdate}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center"
            >
              <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 text-lg font-medium">
                {isHost ? t('screenShareDisabledHost') : t('screenShareDisabledPlayer')}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {isHost ? "Bật tính năng này trong cài đặt host để chia sẻ nội dung" : "Host đã vô hiệu hóa tính năng chia sẻ màn hình"}
              </p>
            </motion.div>
          )}

          {/* Spectators Section - Same Interface as Players */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  <span>
                    👁️ {t('spectators')} ({t('spectatorCount', { count: spectators.length })})
                  </span>
                </h3>
                
                {/* Prominent Toggle Button - Only show if current user is player or host playing */}
                {(players[currentUserId]?.role === 'player' || (players[currentUserId]?.role === 'host' && players[currentUserId]?.isParticipating !== false)) && (
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(168, 85, 247, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={players[currentUserId]?.role === 'host' ? handleToggleHostParticipation : handleToggleRole}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all flex items-center space-x-2"
                  >
                    <span className="text-lg">👁️</span>
                    <span>{t('switchToSpectator')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span className="text-xs sm:text-sm text-purple-400">{t('spectators')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {spectators.map((spectator) => (
                  <MemoizedPlayerCard
                    key={spectator.id}
                    player={spectator}
                    isHost={isHost}
                    currentUserId={currentUserId}
                    hostId={roomData?.hostId || ''}
                    onKickPlayer={handleKickPlayerClick}
                    onTransferHost={handleTransferHost}
                    onToggleReady={handleToggleReady}
                    onToggleHostParticipation={handleToggleHostParticipation}
                    onToggleRole={handleToggleRole}
                  />
                ))}
              </AnimatePresence>

              {spectators.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6 sm:py-8"
                >
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm sm:text-base">{t('noSpectatorsYet')}</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1">{t('playersCanSwitchToSpectator')}</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Players List - Restored to Original */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  <span>
                    🎮 {t('activePlayers')} ({t('activePlayerCount', { count: activePlayers.length })})
                  </span>
                </h3>
                
                {/* Prominent Toggle Button - Only show if current user is spectator or host spectating */}
                {(players[currentUserId]?.role === 'spectator' || (players[currentUserId]?.role === 'host' && players[currentUserId]?.isParticipating === false)) && (
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={players[currentUserId]?.role === 'host' ? handleToggleHostParticipation : handleToggleRole}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 transition-all flex items-center space-x-2"
                  >
                    <span className="text-lg">🎮</span>
                    <span>{t('joinGameButton')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs sm:text-sm text-green-400">{t('liveSync')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {activePlayers.map((player) => (
                  <MemoizedPlayerCard
                    key={player.id}
                    player={player}
                    isHost={isHost}
                    currentUserId={currentUserId}
                    hostId={roomData?.hostId || ''}
                    onKickPlayer={handleKickPlayerClick}
                    onTransferHost={handleTransferHost}
                    onToggleReady={handleToggleReady}
                    onToggleHostParticipation={handleToggleHostParticipation}
                    onToggleRole={handleToggleRole}
                  />
                ))}
              </AnimatePresence>

              {activePlayers.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6 sm:py-8"
                >
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm sm:text-base">{t('noPlayersYet')}</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1">{t('waitingForPlayers')}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Side Panel */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {/* Host Control Panel (only for host) - MOVED TO TOP */}
          {isHost && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
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
                onTransferHost={(playerId) => {
                  const player = playersList.find(p => p.id === playerId);
                  if (player) handleTransferHost(player);
                }}
                onToggleHostParticipation={handleToggleHostParticipation}
                onSettingsUpdate={() => {}}
              />
            </motion.div>
          )}

          {/* Enhanced Chat Component */}
          {(roomData?.settings?.chatEnabled ?? true) ? (
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
                isMobile={typeof window !== 'undefined' && window.innerWidth < 768}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center"
            >
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 text-lg font-medium">
                {isHost ? t('chatDisabledHost') : t('chatDisabledPlayer')}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {isHost ? t('chatDisabledHostDesc') : t('chatDisabledPlayerDesc')}
              </p>
            </motion.div>
          )}

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
                  <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-blue-100/50">
                    <div className="text-center space-y-3">
                      <div className="relative">
                        <Loader className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                        <div className="absolute inset-0 w-8 h-8 bg-blue-400/20 rounded-full animate-ping mx-auto"></div>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Generating QR Code...</p>
                    </div>
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
      </>
      )}
    </motion.div>
  );
};

export default ModernRoomLobby;

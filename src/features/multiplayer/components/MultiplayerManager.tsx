import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { 
  Users, 
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { logger } from '../utils/logger';

// Import các components con
import GameModeSelector from './GameModeSelector';
import CreateRoomModal from './CreateRoomModal';
import JoinRoomModal from './JoinRoomModal';
import RoomLobby from './RoomLobby';
import MultiplayerQuiz from './MultiplayerQuiz';
import GameResults from './GameResults';
import RealtimeChat from './RealtimeChat';
import MobileChatModal from './MobileChatModal';

// Import services
import { getMultiplayerService, MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';

// Types
import type { Quiz } from '../types/index';
import type { GameResults as GameResultsType } from '../types/index';

export interface MultiplayerState {
  currentState: 'mode-selection' | 'create-room' | 'join-room' | 'lobby' | 'game' | 'results';
  roomId?: string;
  roomData?: any;
  gameData?: any;
  results?: GameResultsType;
  error?: string;
  isConnecting: boolean;
  isConnected: boolean;
}

interface MultiplayerManagerProps {
  selectedQuiz?: Quiz;
  currentUserId: string;
  currentUserName: string;
  onBackToLobby: () => void;
  onQuizComplete: (results: GameResultsType) => void;
  initialRoomId?: string;
}

const MultiplayerManager: React.FC<MultiplayerManagerProps> = ({
  selectedQuiz: initialSelectedQuiz,
  currentUserId,
  currentUserName,
  onBackToLobby,
  onQuizComplete,
  initialRoomId
}) => {
  const { t } = useTranslation();
  const [selectedQuiz] = useState<Quiz | undefined>(initialSelectedQuiz);
  const [state, setState] = useState<MultiplayerState>({
    currentState: 'mode-selection', // Luôn bắt đầu từ mode-selection vì quiz đã được chọn từ MultiplayerLobby
    isConnecting: false,
    isConnected: false
  });
  
  const [multiplayerService, setMultiplayerService] = useState<MultiplayerServiceInterface | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [joinError, setJoinError] = useState<string | undefined>(undefined);
	const [createLoading, setCreateLoading] = useState<boolean>(false);
	const [joinLoading, setJoinLoading] = useState<boolean>(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Initialize multiplayer service
  useEffect(() => {
    const service = getMultiplayerService();
    setMultiplayerService(service);
    
    // Connect to service
    const connectToService = async () => {
      try {
        setConnectionStatus('connecting');
        await service.connect(currentUserId, currentUserName);
        setConnectionStatus('connected');
        setState(prev => ({ ...prev, isConnected: true }));
        
        // Set up event listeners
        service.on('room:updated', handleRoomUpdate);
        service.on('players:updated', handlePlayersUpdate);
        // messages:updated listener removed - RealtimeChat handles this directly
        service.on('game:start', handleGameStart);
        service.on('game:next-question', handleNextQuestion);
        service.on('game:finish', handleGameFinish);
        service.on('connection:lost', handleConnectionLost);
        service.on('connection:restored', handleConnectionRestored);
        
      } catch (error) {
        console.error('Failed to connect to multiplayer service:', error);
        setConnectionStatus('error');
        toast.error(t('multiplayer.errors.connectionFailed'));
      }
    };

    connectToService();

    return () => {
      service.disconnect();
    };
  }, [currentUserId, currentUserName, t]);
  // Handlers are intentionally omitted from dependencies to prevent infinite loop from re-subscription

  // Try resuming room from state (if page reload)
  useEffect(() => {
    const previousRoomId = initialRoomId || state.roomId || (state.roomData?.id as string | undefined);
    if (!previousRoomId || !multiplayerService || connectionStatus !== 'connected') return;
    // Mark presence online and resume streams
    multiplayerService.setPresence(previousRoomId, true).catch(() => {});
    multiplayerService.resumeRoom(previousRoomId).catch(() => {});
    // Set UI state to lobby immediately while streams resume
    setState(prev => ({ ...prev, currentState: 'lobby', roomId: previousRoomId }));
  }, [multiplayerService, connectionStatus, initialRoomId, state.roomId, state.roomData?.id]);

  // Event handlers
  const handleRoomUpdate = useCallback((roomData: any) => {
    logger.debug('Room updated', { 
      roomId: roomData?.id, 
      status: roomData?.status,
      playerCount: roomData?.players?.length 
    });
    
    setState(prev => {
      // Preserve existing players if not in new roomData
      const updatedRoomData = {
        ...roomData,
        players: roomData.players || prev.roomData?.players || []
      };
      
      // Auto-transition to game state when room status changes
      if (roomData?.status === 'playing' && prev.currentState === 'lobby') {
        logger.info('Room status changed to playing, transitioning to game');
        return { ...prev, roomData: updatedRoomData, currentState: 'game' };
      }
      
      return { ...prev, roomData: updatedRoomData };
    });
  }, []);

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (connectionStatus === 'error' && !isReconnecting && multiplayerService) {
      setIsReconnecting(true);
      const timer = setTimeout(async () => {
        logger.info('Attempting to reconnect...');
        try {
          setConnectionStatus('connecting');
          await multiplayerService.connect(currentUserId, currentUserName);
          setConnectionStatus('connected');
          toast.success(t('multiplayer.success.connectionRestored'));
        } catch (error) {
          logger.error('Reconnection failed:', error);
          setConnectionStatus('error');
        } finally {
          setIsReconnecting(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, isReconnecting, multiplayerService, currentUserId, currentUserName, t]);

  const handleGameStart = useCallback((gameData: any) => {
    logger.debug('Game Start Event Received', {
      hasQuestions: gameData?.questions?.length || 0
    });
    
    setState(prev => ({ 
      ...prev, 
      currentState: 'game', 
      gameData 
    }));
  }, []);

  const handleNextQuestion = useCallback((gameData: any) => {
    setState(prev => ({ 
      ...prev, 
      gameData
    }));
  }, []);

  const handleGameFinish = useCallback((results: GameResultsType) => {
    setState(prev => ({ 
      ...prev, 
      currentState: 'results', 
      results 
    }));
    onQuizComplete(results);
  }, [onQuizComplete]);

  const handlePlayersUpdate = useCallback((players: any[]) => {
    logger.debug('Players updated', { count: players.length, playerIds: players.map(p => p.id) });
    setState(prev => {
      // Ensure we merge players into existing roomData
      if (!prev.roomData) {
        logger.warn('Received players update but no roomData exists');
        return prev;
      }
      
      return {
        ...prev,
        roomData: { 
          ...prev.roomData, 
          players 
        }
      };
    });
  }, []);

  // Messages are now handled directly by RealtimeChat component via RTDB listeners
  // No need for handleMessagesUpdate callback

  // const handleChatMessage = useCallback((message: any) => {
  //   console.log('MultiplayerManager received chat message:', message);
  //   setChatMessages(prev => {
  //     const newMessages = [...prev, message];
  //     console.log('Updated chat messages count:', newMessages.length);
  //     return newMessages;
  //   });
  // }, []);

  const handleConnectionLost = useCallback(() => {
    setConnectionStatus('disconnected');
    // toast.warning(t('multiplayer.errors.connectionLost'));
  }, []);

  const handleConnectionRestored = useCallback(() => {
    setConnectionStatus('connected');
    // toast.success(t('multiplayer.success.connectionRestored'));
  }, []);

  // Navigation handlers
  const handleModeSelection = (mode: 'create' | 'join') => {
    if (mode === 'create') {
      setState(prev => ({ ...prev, currentState: 'create-room' }));
    } else {
      setState(prev => ({ ...prev, currentState: 'join-room' }));
    }
  };

  const handleBackToModeSelection = () => {
    setState(prev => ({ 
      ...prev, 
      currentState: 'mode-selection',
      roomId: undefined,
      roomData: undefined,
      gameData: undefined,
      results: undefined
    }));
  };

  const handleBackToQuizSelection = () => {
    // Navigate back to lobby to select another quiz
    onBackToLobby();
  };

  const handleRoomCreated = (roomId: string, roomData: any) => {
    setState(prev => ({ 
      ...prev, 
      currentState: 'lobby',
      roomId,
      roomData
    }));
    // toast.success(t('multiplayer.success.roomCreated')); // Removed - too many notifications
  };

  const handleRoomJoined = (roomId: string, roomData: any) => {
    setState(prev => ({ 
      ...prev, 
      currentState: 'lobby',
      roomId,
      roomData
    }));
    // toast.success(t('multiplayer.success.joinedRoom')); // Removed - too many notifications
  };

  const handleLeaveRoom = () => {
    if (multiplayerService && state.roomId) {
      multiplayerService.leaveRoom(state.roomId);
    }
    setState(prev => ({ 
      ...prev, 
      currentState: 'mode-selection',
      roomId: undefined,
      roomData: undefined,
      gameData: undefined,
      results: undefined
    }));
    toast.info(t('multiplayer.success.leftRoom'));
  };

  // Chat message handler - not needed with RealtimeChat component
  // Messages are sent directly from RealtimeChat via RTDB

  // Render connection status
  const renderConnectionStatus = () => {
    const statusConfig = {
      disconnected: { icon: WifiOff, color: 'text-red-500', text: t('multiplayer.errors.connectionLost') },
      connecting: { icon: Wifi, color: 'text-yellow-500', text: t('multiplayer.errors.reconnecting') },
      connected: { icon: Wifi, color: 'text-green-500', text: t('multiplayer.success.connectionRestored') },
      error: { icon: AlertCircle, color: 'text-red-500', text: t('multiplayer.errors.connectionFailed') }
    } as const;

    const config = statusConfig[connectionStatus];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 ${config.color} text-sm`}>
        <Icon size={16} />
        <span>{config.text}</span>
      </div>
    );
  };

  // Render current state
  const renderCurrentState = () => {
    switch (state.currentState) {
      case 'mode-selection':
        return (
          <GameModeSelector
            isOpen={true}
            onClose={handleBackToQuizSelection}
            onSelectMultiplayer={handleModeSelection}
            connectionStatus={connectionStatus}
          />
        );

      case 'create-room':
        return (
				<CreateRoomModal
            isOpen={true}
				onClose={handleBackToModeSelection}
            onCreateRoom={async (roomConfig) => {
					try {
						setCreateLoading(true);
						if (!multiplayerService || connectionStatus !== 'connected') {
							toast.info(t('multiplayer.errors.reconnecting'));
							return;
						}
						
						// Pass full quiz object instead of just quizId
						console.log('🎮 Manager: Creating room with quiz', { 
							quizId: selectedQuiz?.id, 
							quizTitle: selectedQuiz?.title,
							hasQuestions: !!selectedQuiz?.questions?.length
						});
						
						const result = await multiplayerService.createRoom(roomConfig as any, selectedQuiz);
						if (result) {
							handleRoomCreated(result.room.id, result.room);
						}
					} catch (error: any) {
						console.error('❌ Manager: Failed to create room:', error);
						const errorMessage = error.message || t('multiplayer.errors.createRoomFailed');
						toast.error(errorMessage);
						} finally {
							setCreateLoading(false);
						}
            }}
            selectedQuiz={selectedQuiz}
					loading={createLoading || connectionStatus !== 'connected'}
          />
        );

      case 'join-room':
        return (
				<JoinRoomModal
            isOpen={true}
            onClose={() => {
              setJoinError(undefined);
              handleBackToModeSelection();
            }}
            onJoinRoom={async (roomCode, password) => {
              try {
							setJoinError(undefined);
							setJoinLoading(true);
							
							console.log('🎮 Manager: Attempting to join room', { roomCode, hasPassword: !!password });
							
							if (!multiplayerService || connectionStatus !== 'connected') {
								toast.info(t('multiplayer.errors.reconnecting'));
								return;
							}
							
							const result = await multiplayerService.joinRoom(roomCode, password);
                if (result) {
                  console.log('✅ Manager: Successfully joined room');
                  handleRoomJoined(result.room.id, result.room);
                }
              } catch (error: any) {
                console.error('❌ Manager: Failed to join room:', error);
                console.log('Error details:', { message: error.message, code: error.code });
                
                // Translate error messages
                let errorMessage = t('multiplayer.errors.joinRoomFailed');
                const errorCode = error.message || '';
                
                if (errorCode === 'room_not_found') {
                  errorMessage = t('multiplayer.errors.roomNotFound', 'Không tìm thấy phòng');
                } else if (errorCode === 'room_requires_password') {
                  errorMessage = t('multiplayer.errors.passwordRequired', 'Phòng này yêu cầu mật khẩu');
                } else if (errorCode === 'wrong_password') {
                  errorMessage = t('multiplayer.errors.wrongPassword', 'Mật khẩu không đúng');
                } else if (errorCode === 'room_full') {
                  errorMessage = t('multiplayer.errors.roomFull', 'Phòng đã đầy');
                } else if (errorCode === 'game_in_progress') {
                  errorMessage = t('multiplayer.errors.gameInProgress', 'Game đang diễn ra');
                } else if (errorCode) {
                  errorMessage = errorCode;
                }
                
                console.log('📨 Manager: Setting error message:', errorMessage);
                setJoinError(errorMessage);
                
                // Don't show toast for password required error - let modal handle it
                if (errorCode !== 'room_requires_password') {
                  toast.error(errorMessage);
                }
						} finally {
							setJoinLoading(false);
						}
            }}
					loading={joinLoading || connectionStatus !== 'connected'}
            error={joinError}
          />
        );

      case 'lobby':
        return (
          <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
            {/* Main Lobby - Full width on mobile, flex-1 on desktop */}
            <div className="flex-1 overflow-y-auto">
              <RoomLobby
                roomData={state.roomData}
                currentUserId={currentUserId}
                onLeaveRoom={handleLeaveRoom}
                multiplayerService={multiplayerService ?? undefined}
              />
            </div>
            
            {/* Chat Sidebar - Hidden on mobile, show on lg+ */}
            <div className="hidden lg:block lg:w-80 xl:w-96 border-l border-gray-200 bg-white">
              <div className="h-screen sticky top-0">
                <RealtimeChat
                  roomId={state.roomId || ''}
                  currentUserId={currentUserId}
                  currentUsername={currentUserName}
                  isMobile={false}
                />
              </div>
            </div>

            {/* Mobile Chat Button - Show only on mobile */}
            <button 
              className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 transition-transform"
              onClick={() => setIsMobileChatOpen(true)}
            >
              <Users className="w-6 h-6" />
            </button>

            {/* Mobile Chat Modal */}
            <MobileChatModal
              isOpen={isMobileChatOpen}
              onClose={() => setIsMobileChatOpen(false)}
              roomId={state.roomId || ''}
              currentUserId={currentUserId}
              currentUsername={currentUserName}
            />
          </div>
        );

      case 'game':
        return (
          <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
            {/* Game Area - Full width on mobile */}
            <div className="flex-1 overflow-y-auto">
              <MultiplayerQuiz
                gameData={state.gameData ?? null}
                roomData={state.roomData ?? null}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                multiplayerService={multiplayerService}
              />
            </div>
            
            {/* Chat Sidebar - Hidden on mobile during game */}
            <div className="hidden lg:block lg:w-80 xl:w-96 border-l border-gray-200 bg-white">
              <div className="h-screen sticky top-0">
                <RealtimeChat
                  roomId={state.roomId || ''}
                  currentUserId={currentUserId}
                  currentUsername={currentUserName}
                  isMobile={false}
                />
              </div>
            </div>
          </div>
        );

      case 'results':
        return (
          <GameResults
            players={state.results?.players as any || []}
            currentUserId={currentUserId}
            onPlayAgain={handleBackToModeSelection}
            onBackToLobby={onBackToLobby}
            onLeaveRoom={handleLeaveRoom}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header with connection status */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToQuizSelection}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ← {t('common.back')}
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {t('multiplayer.title')}
              </h1>
              {selectedQuiz && (
                <p className="text-sm text-purple-200">
                  🎯 {selectedQuiz.title} • {selectedQuiz.questions?.length || 0} câu hỏi
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {renderConnectionStatus()}
            {state.roomData && (
              <div className="flex items-center gap-2 text-white">
                <Users size={16} />
                <span>{state.roomData.players?.length || 0}/{state.roomData.settings?.maxPlayers || 10}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {renderCurrentState()}
      </div>
    </div>
  );
};

export default MultiplayerManager;

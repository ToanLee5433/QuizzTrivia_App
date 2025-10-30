import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { 
  Users, 
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';

// Import các components con
import GameModeSelector from './GameModeSelector';
import CreateRoomModal from './CreateRoomModal';
import JoinRoomModal from './JoinRoomModal';
import RoomLobby from './RoomLobby';
import MultiplayerQuiz from './MultiplayerQuiz';
import GameResults from './GameResults';
import MultiplayerChat from './MultiplayerChat';

// Import services
import { getMultiplayerService, MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';

// Types
export interface MultiplayerState {
  currentState: 'mode-selection' | 'create-room' | 'join-room' | 'lobby' | 'game' | 'results';
  roomId?: string;
  roomData?: any;
  gameData?: any;
  results?: any;
  error?: string;
  isConnecting: boolean;
  isConnected: boolean;
}

interface MultiplayerManagerProps {
  selectedQuiz?: any;
  currentUserId: string;
  currentUserName: string;
  onBackToQuizSelection: () => void;
  onQuizComplete: (results: any) => void;
  initialRoomId?: string;
}

const MultiplayerManager: React.FC<MultiplayerManagerProps> = ({
  selectedQuiz,
  currentUserId,
  currentUserName,
  onBackToQuizSelection,
  onQuizComplete,
  initialRoomId
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<MultiplayerState>({
    currentState: 'mode-selection',
    isConnecting: false,
    isConnected: false
  });
  
  const [multiplayerService, setMultiplayerService] = useState<MultiplayerServiceInterface | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [readyCountdown, setReadyCountdown] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | undefined>(undefined);
	const [createLoading, setCreateLoading] = useState<boolean>(false);
	const [joinLoading, setJoinLoading] = useState<boolean>(false);

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
        service.on('messages:updated', handleMessagesUpdate);
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

  // Try resuming room from state (if page reload)
  useEffect(() => {
    const previousRoomId = initialRoomId || state.roomId || (state.roomData?.id as string | undefined);
    if (!previousRoomId || !multiplayerService || connectionStatus !== 'connected') return;
    // Mark presence online and resume streams
    multiplayerService.setPresence(previousRoomId, true).catch(() => {});
    multiplayerService.resumeRoom(previousRoomId).catch(() => {});
    // Set UI state to lobby immediately while streams resume
    setState(prev => ({ ...prev, currentState: 'lobby', roomId: previousRoomId }));
  }, [multiplayerService, connectionStatus]);

  // Event handlers
  const handleRoomUpdate = useCallback((roomData: any) => {
    setState(prev => ({ ...prev, roomData }));
    
    // Auto-start countdown when all players ready (no host restriction)
    try {
      const players = roomData?.players || [];
      const total = players.length;
      const ready = players.filter((p: any) => p.isReady).length;
      const allReady = total >= 2 && ready === total;
      
      if (allReady && state.currentState === 'lobby') {
        if (readyCountdown === null) {
          setReadyCountdown(5);
        }
      } else {
        if (readyCountdown !== null) {
          setReadyCountdown(null);
        }
      }
    } catch (error) {
      console.error('Error in handleRoomUpdate:', error);
    }
  }, [state.currentState, readyCountdown]);

  useEffect(() => {
    if (readyCountdown === null) return;
    
    if (readyCountdown <= 0) {
      // Start game when countdown reaches 0 (any player can trigger)
      if (multiplayerService && state.roomId) {
        console.log('🎮 Starting game from countdown...');
        multiplayerService.startGame(state.roomId).then(() => {
          console.log('✅ Game started successfully');
        }).catch((error) => {
          console.error('❌ Failed to start game:', error);
          toast.error('Failed to start game');
        });
      }
      setReadyCountdown(null);
      return;
    }
    
    const timer = setTimeout(() => {
      setReadyCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [readyCountdown, multiplayerService, state.roomId]);

  const handleGameStart = useCallback((gameData: any) => {
    console.log('🎮 Game Start Event Received:', {
      gameData,
      gameDataKeys: gameData ? Object.keys(gameData) : 'No gameData',
      hasQuestions: gameData?.questions ? gameData.questions.length : 'No questions',
      firstQuestion: gameData?.questions?.[0] || 'No first question'
    });
    
    setState(prev => ({ 
      ...prev, 
      currentState: 'game', 
      gameData 
    }));
    // toast.success(t('multiplayer.success.gameStarted')); // Removed - too many notifications
  }, [t]);

  const handleNextQuestion = useCallback((gameData: any) => {
    // console.log('🔄 Next question data:', gameData); // Removed debug
    setState(prev => ({ 
      ...prev, 
      gameData
    }));
    // toast.info(`Question ${gameData.index}/${gameData.total}`); // Removed - too many notifications
  }, []);

  const handleGameFinish = useCallback((results: any) => {
    setState(prev => ({ 
      ...prev, 
      currentState: 'results', 
      results 
    }));
    onQuizComplete(results);
  }, [onQuizComplete]);

  const handlePlayersUpdate = useCallback((players: any[]) => {
    console.log('Players updated:', players);
    setState(prev => ({
      ...prev,
      roomData: prev.roomData ? { ...prev.roomData, players } : undefined
    }));
  }, []);

  const handleMessagesUpdate = useCallback((messages: any[]) => {
    console.log('Messages updated:', messages);
    setChatMessages(messages);
  }, []);

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
  }, [t]);

  const handleConnectionRestored = useCallback(() => {
    setConnectionStatus('connected');
    // toast.success(t('multiplayer.success.connectionRestored'));
  }, [t]);

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

  const handleSendChatMessage = (message: string) => {
    if (multiplayerService && state.roomId) {
      multiplayerService.sendChatMessage(state.roomId, message).catch((error) => {
        console.error('Failed to send chat message:', error);
      });
    } else {
      console.error('Cannot send message - service or roomId missing:', { 
        hasService: !!multiplayerService, 
        roomId: state.roomId 
      });
    }
  };

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
            onClose={onBackToQuizSelection}
            onSelectSinglePlayer={onBackToQuizSelection}
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
							const result = await multiplayerService.createRoom(roomConfig, selectedQuiz);
							if (result) {
								handleRoomCreated(result.room.id, result.room);
							}
						} catch (error: any) {
							console.error('Failed to create room:', error);
							const errorMessage = error.message || t('multiplayer.errors.createRoomFailed');
							toast.error(errorMessage);
						} finally {
							setCreateLoading(false);
						}
            }}
            onRoomCreated={handleRoomCreated}
            selectedQuiz={selectedQuiz}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
					multiplayerService={multiplayerService}
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
							if (!multiplayerService || connectionStatus !== 'connected') {
								toast.info(t('multiplayer.errors.reconnecting'));
								return;
							}
							const result = await multiplayerService.joinRoom(roomCode, password);
                if (result) {
                  handleRoomJoined(result.room.id, result.room);
                }
              } catch (error: any) {
                console.error('Failed to join room:', error);
                const errorMessage = error.message || t('multiplayer.errors.joinRoomFailed');
                setJoinError(errorMessage);
                toast.error(errorMessage);
						} finally {
							setJoinLoading(false);
						}
            }}
            onRoomJoined={handleRoomJoined}
					loading={joinLoading || connectionStatus !== 'connected'}
            error={joinError}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            multiplayerService={multiplayerService}
          />
        );

      case 'lobby':
        return (
          <div className="flex h-screen">
            <div className="flex-1">
              <RoomLobby
                roomData={state.roomData}
                currentUserId={currentUserId}
                onLeaveRoom={handleLeaveRoom}
                multiplayerService={multiplayerService}
              />
              {readyCountdown !== null && (
                <div className="m-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 inline-block">
                  {t('common.start')}: {readyCountdown}s
                </div>
              )}
            </div>
            <div className="w-80 border-l border-gray-200">
              <MultiplayerChat
                messages={chatMessages}
                onSendMessage={handleSendChatMessage}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        );

      case 'game':
        return (
          <div className="flex h-screen">
            <div className="flex-1">
              <MultiplayerQuiz
                gameData={state.gameData}
                roomData={state.roomData}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                multiplayerService={multiplayerService}
              />
            </div>
            <div className="w-80 border-l border-gray-200">
              <MultiplayerChat
                messages={chatMessages}
                onSendMessage={handleSendChatMessage}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        );

      case 'results':
        return (
          <GameResults
            results={state.results}
            roomData={state.roomData}
            onPlayAgain={handleBackToModeSelection}
            onBackToMenu={onBackToQuizSelection}
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
              onClick={onBackToQuizSelection}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ← {t('common.back')}
            </button>
            <h1 className="text-xl font-bold text-white">
              {t('multiplayer.title')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {renderConnectionStatus()}
            {state.roomData && (
              <div className="flex items-center gap-2 text-white">
                <Users size={16} />
                <span>{state.roomData.players?.length || 0}/{state.roomData.maxPlayers || 10}</span>
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

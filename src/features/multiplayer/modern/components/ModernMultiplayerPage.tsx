import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Sparkles, 
  Zap, 
  TrendingUp
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { modernMultiplayerService } from '../services/modernMultiplayerService';
import ModernQuizSelector from './ModernQuizSelector';
import ModernRoomLobby from './ModernRoomLobby';
import ModernGamePlay from './ModernGamePlay';
import ModernGameResults from './ModernGameResults';
import { ToastProvider, useToast } from './ToastContext';

// Main component with toast integration
const ModernMultiplayerPageWithToast: React.FC = () => {
  return (
    <ToastProvider>
      <ModernMultiplayerPage />
    </ToastProvider>
  );
};

const ModernMultiplayerPage: React.FC = () => {
  const { t } = useTranslation('multiplayer');
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams<{ roomId?: string }>();
  const { showToast } = useToast();
  // ✅ FIX: If URL has roomId, start with room-lobby to avoid flashing quiz-selection
  const [currentView, setCurrentView] = useState<'quiz-selection' | 'room-lobby' | 'game-play' | 'game-results'>(urlRoomId ? 'room-lobby' : 'quiz-selection');
  const [roomId, setRoomId] = useState<string | null>(urlRoomId || null);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Refs for keyboard navigation
  const mainContentRef = useRef<HTMLDivElement>(null);
  const createRoomButtonRef = useRef<HTMLButtonElement>(null);
  const joinRoomButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation setup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + N: Create new room
      if (event.altKey && event.key === 'n') {
        event.preventDefault();
        createRoomButtonRef.current?.click();
      }
      // Alt + J: Join room
      else if (event.altKey && event.key === 'j') {
        event.preventDefault();
        joinRoomButtonRef.current?.click();
      }
      // Escape: Close modal or go back
      else if (event.key === 'Escape') {
        if (showJoinModal) {
          setShowJoinModal(false);
        } else {
          handleBack();
        }
      }
      // Tab navigation is handled by browser, but we ensure focus stays within content
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showJoinModal, currentView]);

  // Focus management for view changes
  useEffect(() => {
    // Set focus to main content when component mounts
    mainContentRef.current?.focus();
  }, []);

  useEffect(() => {
    // Focus appropriate element when view changes
    if (currentView === 'quiz-selection') {
      createRoomButtonRef.current?.focus();
    } else {
      backButtonRef.current?.focus();
    }
  }, [currentView]);

  // Handle URL roomId parameter (for page reload or direct link)
  useEffect(() => {
    const rejoinRoomFromUrl = async () => {
      if (urlRoomId && !roomId) {
        console.log('🔄 Detected room identifier in URL, attempting to rejoin:', urlRoomId);
        
        try {
          // Try to rejoin the room (handles both roomCode and roomId)
          const joinResult = await modernMultiplayerService.joinRoom(urlRoomId);
          setRoomId(joinResult.roomId);
          setCurrentView('room-lobby');
          
          // Only show toast once (avoid duplicate in strict mode)
          if (!sessionStorage.getItem(`rejoined-${urlRoomId}`)) {
            sessionStorage.setItem(`rejoined-${urlRoomId}`, 'true');
            showToast({
              type: 'success',
              title: 'Reconnected to Room',
              message: 'Successfully rejoined the game room.',
              duration: 3000
            });
          }
        } catch (error) {
          console.error('❌ Failed to rejoin room from URL:', error);
          showToast({
            type: 'error',
            title: 'Failed to Rejoin Room',
            message: 'Could not reconnect to the room. Returning to lobby.',
            duration: 4000
          });
          navigate('/multiplayer');
        }
      }
    };

    rejoinRoomFromUrl();
  }, [urlRoomId, roomId, navigate, showToast]);

  useEffect(() => {
    // Initialize the modern multiplayer service
    const initializeService = async () => {
      try {
        await modernMultiplayerService.initialize();
        console.log('✅ Modern multiplayer service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize service:', error);
      }
    };

    initializeService();

    return () => {
      modernMultiplayerService.cleanup();
    };
  }, []);

  const handleRoomCreated = (newRoomId: string, roomCode?: string) => {
    setRoomId(newRoomId);
    setCurrentView('room-lobby');
    // Use roomCode in URL if available (6 chars), fallback to roomId
    const urlIdentifier = roomCode || newRoomId;
    navigate(`/multiplayer/${urlIdentifier}`);
    showToast({
      type: 'success',
      title: 'Room Created Successfully!',
      message: `Room code: ${roomCode || newRoomId}. Share this with your friends!`,
      duration: 4000
    });
  };

  const handleGameStart = () => {
    setCurrentView('game-play');
    showToast({
      type: 'info',
      title: 'Game Starting!',
      message: 'Get ready for an exciting quiz battle!',
      duration: 3000
    });
  };

  const handleGameEnd = () => {
    setCurrentView('game-results');
    showToast({
      type: 'success',
      title: 'Game Completed!',
      message: 'Great job! Check out the results.',
      duration: 4000
    });
  };

  const handleBackToSelection = () => {
    setCurrentView('quiz-selection');
    setSelectedQuiz(null);
    setRoomId('');
    navigate('/multiplayer');
    showToast({
      type: 'info',
      title: 'Back to Quiz Selection',
      message: 'Choose another quiz to play or create a new room.',
      duration: 3000
    });
  };

  const handleBack = () => {
    if (currentView === 'room-lobby') {
      handleBackToSelection();
    } else if (currentView === 'game-play') {
      setCurrentView('room-lobby');
    } else if (currentView === 'game-results') {
      setCurrentView('room-lobby');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-black/20 backdrop-blur-lg border-b border-white/10"
        role="banner"
        aria-label="Multiplayer game header"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                aria-hidden="true"
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  {t('title')}
                  <Sparkles className="w-6 h-6 text-yellow-300" aria-hidden="true" />
                </h1>
                <p className="text-blue-50 text-sm mt-1">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <motion.div
                className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full"
                whileHover={{ scale: 1.05 }}
                role="status"
                aria-live="polite"
              >
                <Zap className="w-4 h-4 text-yellow-300" aria-hidden="true" />
                <span className="text-white font-semibold">{t('nearZeroLatency')}</span>
              </motion.div>
              <motion.div
                className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full"
                whileHover={{ scale: 1.05 }}
                role="status"
                aria-live="polite"
              >
                <TrendingUp className="w-4 h-4 text-green-300" aria-hidden="true" />
                <span className="text-white font-semibold">{t('liveSync')}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main 
        ref={mainContentRef}
        className="relative z-10"
        role="main"
        tabIndex={-1}
        aria-label="Multiplayer game content"
      >
        {/* Screen reader announcements */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
          id="screen-reader-announcements"
        >
          {currentView === 'quiz-selection' && 'Select a quiz to create or join a multiplayer room'}
          {currentView === 'room-lobby' && 'Waiting in room lobby for players to join'}
          {currentView === 'game-play' && 'Game in progress'}
          {currentView === 'game-results' && 'Game completed - viewing results'}
        </div>
        <AnimatePresence mode="wait">
          {currentView === 'quiz-selection' && (
            <ModernQuizSelector
              key="quiz-selection"
              onRoomCreated={handleRoomCreated}
              onJoinRoom={() => setShowJoinModal(true)}
              createRoomButtonRef={createRoomButtonRef}
              joinRoomButtonRef={joinRoomButtonRef}
            />
          )}

          {currentView === 'room-lobby' && roomId && (
            <ModernRoomLobby
              key="room-lobby"
              roomId={roomId}
              selectedQuiz={selectedQuiz}
              onGameStart={handleGameStart}
              onBack={handleBackToSelection}
            />
          )}

          {currentView === 'game-play' && roomId && (
            <ModernGamePlay
              key="game-play"
              roomId={roomId}
              quiz={selectedQuiz}
              onGameEnd={handleGameEnd}
            />
          )}

          {currentView === 'game-results' && roomId && (
            <ModernGameResults
              key="game-results"
              roomId={roomId}
              onPlayAgain={handleGameStart}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ModernMultiplayerPageWithToast;

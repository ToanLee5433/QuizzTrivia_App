import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Zap, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { modernMultiplayerService, ModernQuiz } from '../services/modernMultiplayerService';
import ModernQuizSelector from './ModernQuizSelector';
import ModernRoomLobby from './ModernRoomLobby';
import ModernGamePlay from './ModernGamePlay';
import ModernGameResults from './ModernGameResults';
import ModernJoinRoomModal from './ModernJoinRoomModal';
import ModernMultiplayerErrorBoundary from './ModernMultiplayerErrorBoundary';

type ViewState = 'quiz-selection' | 'room-lobby' | 'game-play' | 'game-results';

const ModernMultiplayerPageContent: React.FC = () => {
  const { t } = useTranslation('multiplayer');
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewState>('quiz-selection');
  const [selectedQuiz, setSelectedQuiz] = useState<ModernQuiz | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [isLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

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

  const handleRoomCreated = (newRoomId: string) => {
    setRoomId(newRoomId);
    setCurrentView('room-lobby');
    navigate(`/multiplayer/${newRoomId}`);
  };

  const handleJoinRoom = async (roomCode: string, password?: string) => {
    try {
      const room = await modernMultiplayerService.joinRoom(roomCode, password);
      setRoomId(room.id);
      setSelectedQuiz(room.quiz);
      setCurrentView('room-lobby');
      setShowJoinModal(false);
      navigate(`/multiplayer/${room.id}`);
    } catch (error) {
      console.error('❌ Failed to join room:', error);
    }
  };

  const handleGameStart = () => {
    setCurrentView('game-play');
  };

  const handleGameEnd = () => {
    setCurrentView('game-results');
  };

  const handleBackToSelection = () => {
    setCurrentView('quiz-selection');
    setSelectedQuiz(null);
    setRoomId('');
    navigate('/multiplayer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Users className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  {t('title')}
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </h1>
                <p className="text-blue-100 text-sm mt-1">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <motion.div
                className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full"
                whileHover={{ scale: 1.05 }}
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold">{t('nearZeroLatency')}</span>
              </motion.div>
              <motion.div
                className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full"
                whileHover={{ scale: 1.05 }}
              >
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-white font-semibold">{t('liveSync')}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {currentView === 'quiz-selection' && (
            <ModernQuizSelector
              key="quiz-selection"
              onRoomCreated={handleRoomCreated}
              onJoinRoom={() => setShowJoinModal(true)}
            />
          )}

          {currentView === 'room-lobby' && (
            <ModernRoomLobby
              key="room-lobby"
              roomId={roomId}
              selectedQuiz={selectedQuiz}
              onGameStart={handleGameStart}
              onBack={handleBackToSelection}
            />
          )}

          {currentView === 'game-play' && (
            <ModernGamePlay
              key="game-play"
              roomId={roomId}
              quiz={selectedQuiz}
              onGameEnd={handleGameEnd}
            />
          )}

          {currentView === 'game-results' && (
            <ModernGameResults
              key="game-results"
              roomId={roomId}
              onPlayAgain={handleBackToSelection}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Join Room Modal */}
      <ModernJoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinRoom={handleJoinRoom}
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Wrap with Error Boundary
const ModernMultiplayerPage: React.FC = () => {
  return (
    <ModernMultiplayerErrorBoundary>
      <ModernMultiplayerPageContent />
    </ModernMultiplayerErrorBoundary>
  );
};

export default ModernMultiplayerPage;

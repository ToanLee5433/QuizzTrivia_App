import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Users, Trophy, Copy, Check } from 'lucide-react';
import { modernMultiplayerService, ModernQuiz } from '../services/modernMultiplayerService';

interface ModernCreateRoomModalProps {
  quizzes?: ModernQuiz[];
  selectedQuiz?: ModernQuiz | null;
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string, roomCode?: string) => void;
}

const ModernCreateRoomModal: React.FC<ModernCreateRoomModalProps> = ({
  quizzes = [],
  selectedQuiz: propSelectedQuiz,
  onClose,
  onRoomCreated
}) => {
  const { t } = useTranslation('multiplayer');
  const [selectedQuiz, setSelectedQuiz] = useState<ModernQuiz | null>(propSelectedQuiz || null);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = async () => {
    if (!selectedQuiz || !roomName.trim()) {
      return;
    }

    try {
      setIsCreating(true);
      const result = await modernMultiplayerService.createRoom(
        roomName.trim(),
        selectedQuiz.id,
        maxPlayers,
        isPrivate,
        isPrivate ? password.trim() : undefined
      );
      setRoomCode(result.roomCode);
      setCopied(false);
      // Store roomId for navigation
      (window as any).__createdRoomId = result.roomId;
    } catch (error) {
      console.error('❌ Failed to create room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('❌ Failed to copy code:', error);
    }
  };

  const handleContinue = () => {
    if (roomCode) {
      const roomId = (window as any).__createdRoomId;
      // Pass roomId first, roomCode second for routing
      onRoomCreated(roomId, roomCode);
      console.log('✅ Room created - ID:', roomId, 'Code:', roomCode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-blue-900/90 to-cyan-900/90 backdrop-blur-xl rounded-3xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{t('createRoom')}</h2>
              <p className="text-blue-100 text-sm">{t('roomSettings')}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        <div className="p-6 space-y-6">
          {!roomCode ? (
            // Room Creation Form
            <>
              {/* Quiz Selection */}
              <div>
                <label className="block text-white font-semibold mb-3">
                  {t('selectQuizLabel')}
                </label>
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {quizzes.map((quiz) => (
                    <motion.div
                      key={quiz.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedQuiz(quiz)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        selectedQuiz?.id === quiz.id
                          ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{quiz.title}</h3>
                          <p className="text-blue-200 text-sm mt-1">{quiz.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-blue-300">
                            <span>{quiz.questionCount} {t('questions')}</span>
                            <span>{quiz.timeLimit}s {t('timeLimit')}</span>
                            <span>{t('difficulty')}: {quiz.difficulty}</span>
                          </div>
                        </div>
                        {selectedQuiz?.id === quiz.id && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Room Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-2">
                    {t('roomName')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('enterRoomName')}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">
                    {t('maxPlayers')}
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="2" className="bg-gray-800">2 {t('players')}</option>
                    <option value="3" className="bg-gray-800">3 {t('players')}</option>
                    <option value="4" className="bg-gray-800">4 {t('players')}</option>
                    <option value="6" className="bg-gray-800">6 {t('players')}</option>
                    <option value="8" className="bg-gray-800">8 {t('players')}</option>
                  </select>
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-5 h-5 bg-white/10 border-white/20 rounded text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label htmlFor="isPrivate" className="text-white font-semibold cursor-pointer">
                    {t('privateRoom')}
                  </label>
                </div>

                {isPrivate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="block text-white font-semibold mb-2">
                      {t('password')}
                    </label>
                    <input
                      type="password"
                      placeholder={t('enterPassword')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-blue-300">
                      {t('passwordRequired')}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Selected Quiz Summary */}
              {selectedQuiz && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-4 border border-white/10"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-semibold text-white">{t('quizSummary')}</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-300">{t('questions')}</span>
                      <p className="text-white font-semibold">{selectedQuiz.questionCount}</p>
                    </div>
                    <div>
                      <span className="text-blue-300">{t('timeLimit')}</span>
                      <p className="text-white font-semibold">{selectedQuiz.timeLimit}s</p>
                    </div>
                    <div>
                      <span className="text-blue-300">{t('difficulty')}</span>
                      <p className="text-white font-semibold">{selectedQuiz.difficulty}</p>
                    </div>
                    <div>
                      <span className="text-blue-300">{t('category')}</span>
                      <p className="text-white font-semibold">{selectedQuiz.category}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
                >
                  {t('cancel')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateRoom}
                  disabled={!selectedQuiz || !roomName.trim() || isCreating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  {isCreating ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('create')}...</span>
                    </div>
                  ) : (
                    t('createRoom')
                  )}
                </motion.button>
              </div>
            </>
          ) : (
            // Room Created Success
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {t('roomCreated')}
                </h3>
                <p className="text-blue-100">
                  {t('shareCode')}
                </p>
              </div>
              
              {/* Room Code Display */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-blue-200 font-medium">{t('roomCode')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl font-mono font-bold text-white">{roomCode}</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyCode}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>{t('codeCopied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>{t('copy')}</span>
                    </>
                  )}
                </motion.button>
              </div>
              
              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinue}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                {t('continueToLobby')}
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModernCreateRoomModal;

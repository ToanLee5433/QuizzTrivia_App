import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, StopCircle, Users, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import gameStateService from '../services/gameStateService';
import { logger } from '../utils/logger';

interface HostControlPanelProps {
  roomId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  isHost: boolean;
  timePerQuestion: number;
}

const HostControlPanel: React.FC<HostControlPanelProps> = ({
  roomId,
  currentQuestionIndex,
  totalQuestions,
  isHost,
  timePerQuestion,
}) => {
  const { t } = useTranslation();
  const [answerCounts, setAnswerCounts] = useState<Record<number, number>>({});
  const [totalPlayers] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Listen to answer submissions for current question
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = gameStateService.listenToQuestionAnswers(
      roomId,
      currentQuestionIndex,
      (answers) => {
        setAnswerCounts(prev => ({
          ...prev,
          [currentQuestionIndex]: Object.keys(answers).length,
        }));
        logger.info('[HostControlPanel] Answer count updated', {
          questionIndex: currentQuestionIndex,
          count: Object.keys(answers).length,
        });
      }
    );

    return () => unsubscribe();
  }, [roomId, currentQuestionIndex]);

  if (!isHost) return null;

  const currentAnswerCount = answerCounts[currentQuestionIndex] || 0;
  const allAnswered = totalPlayers > 0 && currentAnswerCount >= totalPlayers;

  const handleSkipQuestion = async () => {
    try {
      logger.info('[HostControlPanel] Skipping to next question', { currentQuestionIndex });
      await gameStateService.showResults(roomId);
      
      // After 3 seconds, advance
      setTimeout(async () => {
        if (currentQuestionIndex < totalQuestions - 1) {
          await gameStateService.advanceToNextQuestion(roomId, currentQuestionIndex, timePerQuestion);
        } else {
          await gameStateService.endGame(roomId);
        }
      }, 3000);
    } catch (error) {
      logger.error('[HostControlPanel] Failed to skip question', error);
    }
  };

  const handleEndGame = async () => {
    if (!confirm(t('multiplayer.host.confirmEndGame'))) return;
    
    try {
      logger.info('[HostControlPanel] Ending game early');
      await gameStateService.endGame(roomId);
    } catch (error) {
      logger.error('[HostControlPanel] Failed to end game', error);
    }
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    // TODO: Implement pause/resume logic in gameStateService
    logger.info('[HostControlPanel] Toggle pause', { isPaused: !isPaused });
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 text-purple-900 px-3 py-1 rounded-full text-xs font-black">
            {t('multiplayer.host.hostControl')}
          </div>
          <div className="text-white text-sm font-medium">
            {t('multiplayer.host.questionProgress', { 
              current: currentQuestionIndex + 1, 
              total: totalQuestions 
            })}
          </div>
        </div>
      </div>

      {/* Answer Status */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Users size={18} />
            <span className="text-sm font-medium">
              {t('multiplayer.host.answersReceived')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{currentAnswerCount}</span>
            <span className="text-sm opacity-75">/ {totalPlayers}</span>
            {allAnswered && (
              <CheckCircle size={20} className="text-green-400 ml-2" />
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-green-400 h-full transition-all duration-300"
            style={{ 
              width: `${totalPlayers > 0 ? (currentAnswerCount / totalPlayers) * 100 : 0}%` 
            }}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleTogglePause}
          className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all"
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          {isPaused ? t('multiplayer.host.resume') : t('multiplayer.host.pause')}
        </button>

        <button
          onClick={handleSkipQuestion}
          className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all"
          disabled={currentQuestionIndex >= totalQuestions - 1}
        >
          <SkipForward size={16} />
          {t('multiplayer.host.skipQuestion')}
        </button>

        <button
          onClick={handleEndGame}
          className="col-span-2 flex items-center justify-center gap-2 bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
        >
          <StopCircle size={16} />
          {t('multiplayer.host.endGame')}
        </button>
      </div>
    </div>
  );
};

export default HostControlPanel;

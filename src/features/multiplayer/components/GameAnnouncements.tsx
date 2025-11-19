import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameStateData } from '../services/gameStateService';

interface GameAnnouncementsProps {
  gameState: GameStateData | null;
  roomId: string;
}

/**
 * Accessibility component that announces game state changes to screen readers
 * Uses ARIA live regions for non-intrusive announcements
 */
export function GameAnnouncements({ gameState }: GameAnnouncementsProps) {
  const { t } = useTranslation();
  const [announcement, setAnnouncement] = useState('');
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');

  useEffect(() => {
    if (!gameState) {
      setPoliteAnnouncement(t('multiplayer.game.loading'));
      return;
    }

    const { phase, currentQuestionIndex, totalQuestions, timeLimit } = gameState;

    switch (phase) {
      case 'question':
        setAnnouncement(
          t('multiplayer.accessibility.questionAnnouncement', {
            current: currentQuestionIndex + 1,
            total: totalQuestions,
            timeLimit,
          })
        );
        break;

      case 'results':
        setPoliteAnnouncement(
          t('multiplayer.accessibility.resultsAnnouncement', {
            current: currentQuestionIndex + 1,
          })
        );
        break;

      case 'finished':
        setAnnouncement(t('multiplayer.accessibility.gameFinished'));
        break;

      default:
        setPoliteAnnouncement(t('multiplayer.accessibility.waitingForHost'));
    }
  }, [gameState, t]);

  return (
    <>
      {/* Assertive announcements for time-sensitive updates */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Polite announcements for less urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeAnnouncement}
      </div>
    </>
  );
}

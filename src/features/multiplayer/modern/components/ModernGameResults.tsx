import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Star, 
  Award,
  Target,
  Home,
  Share2,
  Crown,
  Medal,
  CheckCircle,
  XCircle,
  Clock,
  Flame,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { ModernPlayer, RTDB_PATHS } from '../types/game.types';

interface ModernGameResultsProps {
  roomId: string;
  onPlayAgain?: () => void; // Optional, kept for backward compatibility
  onBackToLobby: () => void;
  isSpectator?: boolean; // Whether current user is spectator
}

interface QuestionReview {
  questionIndex: number;
  questionText: string;
  userAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  timeSpent: number;
  points: number;
}

const ModernGameResults: React.FC<ModernGameResultsProps> = ({
  roomId,
  onBackToLobby,
  isSpectator = false
}) => {
  const { t } = useTranslation('multiplayer');
  const [players, setPlayers] = useState<{ [key: string]: ModernPlayer }>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [playerAnswerHistory, setPlayerAnswerHistory] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showConfetti, setShowConfetti] = useState(true);
  const [showQuestionReview, setShowQuestionReview] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const db = getDatabase();

  // Get current user ID first
  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid || '';
    setCurrentUserId(userId);
  }, []);

  // Listen to game data
  useEffect(() => {
    // Listen to game state for players and game data
    const gameRef = ref(db, RTDB_PATHS.games(roomId));
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.players) {
          setPlayers(data.players);
        }
        // Get questions from game state
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
        }
        setIsLoading(false);
      }
    });

    // Hide confetti after 5 seconds
    setTimeout(() => setShowConfetti(false), 5000);

    return () => {
      unsubscribe();
    };
  }, [roomId, db]);

  // Listen to answer history - separate useEffect that depends on currentUserId
  useEffect(() => {
    if (!currentUserId) return; // Wait for userId

    // Path: games/{roomId}/answerHistory/{playerId}
    const answerHistoryRef = ref(db, `games/${roomId}/answerHistory/${currentUserId}`);
    console.log('🔍 Listening to answer history at:', `games/${roomId}/answerHistory/${currentUserId}`);
    
    const unsubAnswerHistory = onValue(answerHistoryRef, (snapshot) => {
      const data = snapshot.val();
      console.log('📝 Answer history raw data:', data);
      if (data) {
        // Data is object with questionIndex as keys: { 0: {...}, 1: {...}, ... }
        const answers = Object.entries(data).map(([key, value]: [string, any]) => ({
          ...value,
          questionIndex: parseInt(key, 10)
        })).sort((a, b) => a.questionIndex - b.questionIndex);
        console.log('📝 Processed answers:', answers);
        setPlayerAnswerHistory(answers);
      }
    });

    return () => {
      unsubAnswerHistory();
    };
  }, [roomId, db, currentUserId]);

  // Calculate sorted players list
  const playersList = useMemo(() => {
    return Object.values(players)
      .filter(p => p.role === 'player')
      .sort((a, b) => b.score - a.score);
  }, [players]);

  const currentPlayer = players[currentUserId];
  const winner = playersList[0];
  const isWinner = winner?.id === currentUserId;
  const playerRank = playersList.findIndex(p => p.id === currentUserId) + 1;
  
  // Check if current user is spectator (from prop or player role)
  // Note: Host who didn't participate will have score = 0 and totalAnswers = 0
  const isUserSpectator = isSpectator || currentPlayer?.role === 'spectator' || (currentPlayer?.role === 'host' && currentPlayer?.totalAnswers === 0 && currentPlayer?.score === 0);

  // Helper function to format answer text (handle objects, strings, etc.)
  const formatAnswerText = (answer: any): string => {
    if (answer === null || answer === undefined) return t('noAnswer', 'Chưa trả lời');
    if (typeof answer === 'string') return answer;
    if (typeof answer === 'object') {
      // Answer object from quiz system
      if (answer.text) return answer.text;
      if (answer.content) return answer.content;
      if (answer.label) return answer.label;
      // Try to get first string property
      const firstValue = Object.values(answer).find(v => typeof v === 'string');
      if (firstValue) return firstValue as string;
    }
    return String(answer);
  };

  // Calculate stats for current player
  const stats = useMemo(() => {
    if (!currentPlayer) return { correct: 0, wrong: 0, total: 0, accuracy: 0, avgTime: 0, streak: 0 };
    
    const correct = currentPlayer.correctAnswers || 0;
    const total = currentPlayer.totalAnswers || 0;
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgTime = currentPlayer.avgResponseTime ? Math.round(currentPlayer.avgResponseTime / 1000) : 0;
    const streak = currentPlayer.maxStreak || 0;
    
    return { correct, wrong, total, accuracy, avgTime, streak };
  }, [currentPlayer]);

  // Get question review data - try multiple sources
  const questionReviews = useMemo((): QuestionReview[] => {
    const reviews: QuestionReview[] = [];
    
    console.log('🔍 Building question reviews:', {
      playerAnswerHistoryLength: playerAnswerHistory.length,
      questionsLength: questions.length,
      currentPlayer: currentPlayer?.name,
      statsTotal: stats.total
    });
    
    // Source 1: From playerAnswerHistory (dedicated answer history)
    if (playerAnswerHistory.length > 0) {
      console.log('📝 Using playerAnswerHistory source');
      playerAnswerHistory.forEach((answer: any, index: number) => {
        const question = questions[answer.questionIndex] || questions[index];
        reviews.push({
          questionIndex: answer.questionIndex ?? index,
          questionText: question?.text || answer.questionText || `Câu hỏi ${(answer.questionIndex ?? index) + 1}`,
          userAnswer: answer.answer ?? answer.userAnswer,
          correctAnswer: question?.correctAnswer || answer.correctAnswer,
          isCorrect: answer.isCorrect ?? false,
          timeSpent: answer.responseTime || answer.timeSpent || 0,
          points: answer.points || 0
        });
      });
      console.log('📝 Reviews from playerAnswerHistory:', reviews);
      return reviews;
    }
    
    // Source 2: From currentPlayer.freeMode?.answers (for free mode games)
    if (currentPlayer?.freeMode?.answers) {
      console.log('📝 Using freeMode.answers source');
      const playerAnswers = currentPlayer.freeMode.answers;
      const answerArray = Object.values(playerAnswers);
      
      answerArray.forEach((answer: any, index: number) => {
        const qIndex = answer.questionIndex ?? index;
        const question = questions[qIndex];
        reviews.push({
          questionIndex: qIndex,
          questionText: question?.text || `Câu hỏi ${qIndex + 1}`,
          userAnswer: answer.answer ?? answer.userAnswer,
          correctAnswer: question?.correctAnswer || answer.correctAnswer,
          isCorrect: answer.isCorrect ?? false,
          timeSpent: answer.responseTime || 0,
          points: answer.points || 0
        });
      });
      return reviews;
    }
    
    // Source 3: Build from questions if we have them but no answer history
    // This happens when answer history wasn't saved properly
    if (questions.length > 0 && stats.total > 0) {
      console.log('📝 Building reviews from questions + player stats');
      questions.forEach((question: any, index: number) => {
        // We don't have detailed answer data, but we can show the questions
        reviews.push({
          questionIndex: index,
          questionText: question?.text || `Câu hỏi ${index + 1}`,
          userAnswer: null, // Don't know the answer
          correctAnswer: question?.correctAnswer || question?.answers?.find((a: any) => a.isCorrect)?.text,
          isCorrect: false, // Unknown
          timeSpent: 0,
          points: 0
        });
      });
      return reviews;
    }
    
    return reviews;
  }, [currentPlayer, questions, playerAnswerHistory, stats.total]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-400/30';
      case 2:
        return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-400/30';
      default:
        return 'bg-white/10 border-white/20';
    }
  };

  const getPerformanceEmoji = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 5) return '⭐';
    return '💪';
  };

  const getPerformanceMessage = () => {
    if (stats.accuracy >= 90) return t('excellentPerformance', 'Xuất sắc! Bạn gần như hoàn hảo!');
    if (stats.accuracy >= 70) return t('goodPerformance', 'Tốt lắm! Hãy cố gắng hơn nữa!');
    if (stats.accuracy >= 50) return t('averagePerformance', 'Khá ổn! Còn nhiều chỗ để cải thiện.');
    return t('keepPracticing', 'Hãy luyện tập thêm nhé!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white text-lg">{t('loadingResults', 'Đang tải kết quả...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600 p-2 sm:p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && isWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: -50,
                  rotate: Math.random() * 360
                }}
                animate={{ 
                  y: window.innerHeight + 50,
                  rotate: Math.random() * 720
                }}
                transition={{ 
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
                className="absolute w-3 h-3"
                style={{
                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD700'][Math.floor(Math.random() * 6)],
                  left: `${Math.random() * 100}%`
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-4 sm:mb-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="inline-flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-md px-4 sm:px-6 py-2 rounded-full border border-white/20 mb-2 sm:mb-3"
        >
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <span className="text-white font-bold text-sm sm:text-base">{t('finished', 'Kết thúc')}</span>
        </motion.div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
          🎮 {t('gameOver', 'Kết thúc')}! 🎮
        </h1>
        <p className="text-blue-100 text-sm sm:text-lg">
          {isUserSpectator 
            ? t('spectatorGameEnded', 'Trận đấu đã kết thúc')
            : `${t('youFinishedAt', 'Bạn đã về vị trí thứ')} ${playerRank || 0}`
          }
        </p>
      </motion.header>

      <div className={`max-w-6xl mx-auto ${isUserSpectator ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'}`}>
        {/* Left Column - Leaderboard */}
        <div className={`${isUserSpectator ? '' : 'lg:col-span-2'} space-y-4 sm:space-y-6`}>
          {/* Full Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                <span>{t('fullLeaderboard', 'Bảng xếp hạng đầy đủ')}</span>
              </h3>
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full self-start sm:self-auto">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-blue-100 text-xs sm:text-sm">{playersList.length} {t('players', 'người chơi')}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {playersList.length === 0 ? (
                <div className="text-center py-8 text-blue-100">
                  {t('noPlayersYet', 'Chưa có người chơi nào')}
                </div>
              ) : (
                <AnimatePresence>
                  {playersList.map((player, index) => {
                    const pCorrect = player.correctAnswers || 0;
                    const pTotal = player.totalAnswers || 0;
                    const pWrong = pTotal - pCorrect;
                    const pAccuracy = pTotal > 0 ? Math.round((pCorrect / pTotal) * 100) : 0;
                    
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all ${getRankColor(index + 1)} ${player.id === currentUserId ? 'ring-2 ring-blue-400' : ''}`}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                          {/* Rank */}
                          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                            {getRankIcon(index + 1)}
                          </div>

                          {/* Avatar & Name */}
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            {player.photoURL ? (
                              <img
                                src={player.photoURL}
                                alt={player.name}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white/20 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                                {player.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
                                <span className="font-bold text-white text-sm sm:text-base truncate">{player.name || t('unknown', 'Không xác định')}</span>
                                {player.id === currentUserId && (
                                  <span className="text-xs bg-blue-500/30 text-blue-300 px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                                    {t('you', 'Bạn')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-blue-200 flex-wrap">
                                <span className="flex items-center space-x-1">
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  <span>{pCorrect}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <XCircle className="w-3 h-3 text-red-400" />
                                  <span>{pWrong}</span>
                                </span>
                                <span className="hidden sm:flex items-center space-x-1">
                                  <Target className="w-3 h-3 text-yellow-400" />
                                  <span>{pAccuracy}%</span>
                                </span>
                                {player.maxStreak && player.maxStreak >= 3 && (
                                  <span className="hidden sm:flex items-center space-x-1">
                                    <Flame className="w-3 h-3 text-orange-400" />
                                    <span>{player.maxStreak}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Score - Never show negative */}
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xl sm:text-2xl font-bold text-white">{Math.max(0, player.score || 0)}</p>
                          <p className="text-blue-200 text-xs">{t('points', 'điểm')}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          {/* Question Review Section - Show for players with answers OR spectators with questions */}
          {(stats.total > 0 || (isUserSpectator && questions.length > 0)) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20"
            >
              <button
                onClick={() => setShowQuestionReview(!showQuestionReview)}
                className="w-full flex items-center justify-between mb-3 sm:mb-4"
              >
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white flex items-center space-x-2">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  <span className="truncate">
                    {isUserSpectator 
                      ? `${t('questionReview', 'Xem lại câu hỏi')} (${questions.length})`
                      : `${t('reviewAnswers', 'Xem lại câu trả lời')} (${stats.correct}✓ / ${stats.wrong}✗)`
                    }
                  </span>
                </h3>
                {showQuestionReview ? (
                  <ChevronUp className="w-5 h-5 text-white" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white" />
                )}
              </button>

              <AnimatePresence>
                {showQuestionReview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 sm:space-y-3 overflow-hidden"
                  >
                    {isUserSpectator ? (
                      // Spectator view: Show all questions with correct answers
                      questions.map((question, index) => (
                        <div
                          key={index}
                          className="p-3 sm:p-4 rounded-xl border bg-blue-500/10 border-blue-400/30"
                        >
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/30 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium mb-1 sm:mb-2 text-sm sm:text-base line-clamp-2">
                                {question.text || `Câu hỏi ${index + 1}`}
                              </p>
                              <p className="text-blue-200 text-xs sm:text-sm">
                                <span className="text-green-400 font-medium">
                                  {t('correctAnswer', 'Đáp án đúng')}: {
                                    question.correctAnswer || 
                                    question.answers?.find((a: any) => a.isCorrect)?.text ||
                                    'N/A'
                                  }
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : questionReviews.length > 0 ? (
                      // Player view: Show detailed answers
                      questionReviews.map((review, index) => (
                        <div
                          key={index}
                          className={`p-3 sm:p-4 rounded-xl border ${review.isCorrect ? 'bg-green-500/10 border-green-400/30' : 'bg-red-500/10 border-red-400/30'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                            <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                              {review.isCorrect ? (
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 sm:mt-1 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mt-0.5 sm:mt-1 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium mb-1 text-sm sm:text-base">
                                  {t('questionNumber', 'Câu {{number}}', { number: review.questionIndex + 1 })}
                                </p>
                                <p className="text-blue-100 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                                  {review.questionText}
                                </p>
                                <div className="text-xs sm:text-sm space-y-1.5 sm:space-y-2">
                                  {/* Always show user's answer */}
                                  <div className={`flex flex-col sm:flex-row sm:items-start sm:space-x-2 p-1.5 sm:p-2 rounded-lg ${review.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    <span className="text-blue-200 text-xs">{t('yourAnswer', 'Câu trả lời của bạn')}:</span>
                                    <span className={`font-medium ${review.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatAnswerText(review.userAnswer)}
                                    </span>
                                  </div>
                                  
                                  {/* Show correct answer only if wrong */}
                                  {!review.isCorrect && (
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2 p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                                      <span className="text-blue-200 text-xs">{t('correctAnswerIs', 'Đáp án đúng')}:</span>
                                      <span className="font-medium text-green-400">
                                        {formatAnswerText(review.correctAnswer)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-left sm:text-right ml-6 sm:ml-3 flex-shrink-0 flex sm:block items-center space-x-2 sm:space-x-0">
                              <p className={`font-bold text-base sm:text-lg ${review.points > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                +{Math.max(0, review.points)}
                              </p>
                              <p className="text-blue-200 text-xs">
                                {Math.round(review.timeSpent / 1000)}s
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback when no detailed history available
                      <div className="text-center py-6">
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                          <div className="bg-green-500/20 rounded-xl p-3 sm:p-4">
                            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.correct}</p>
                            <p className="text-green-200 text-xs sm:text-sm">{t('correctAnswers', 'Câu trả lời đúng')}</p>
                          </div>
                          <div className="bg-red-500/20 rounded-xl p-3 sm:p-4">
                            <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 mx-auto mb-1 sm:mb-2" />
                            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.wrong}</p>
                            <p className="text-red-200 text-xs sm:text-sm">{t('wrongAnswers', 'Câu trả lời sai')}</p>
                          </div>
                        </div>
                        <p className="text-blue-200 text-xs sm:text-sm">
                          {t('detailedReviewNotAvailable', 'Chi tiết câu trả lời sẽ hiển thị ở lần chơi tiếp theo')}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* Spectator Actions - Inline buttons */}
          {isUserSpectator && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onBackToLobby}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('backToLobby', 'Về phòng chờ')}</span>
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Right Column - Stats & Actions (Only for players, not spectators) */}
        {!isUserSpectator && (
        <div className="space-y-4 sm:space-y-6">
          {/* Your Performance Stats */}
          {currentPlayer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  <span>{t('yourResult', 'Kết quả của bạn')}</span>
                </h3>
                <span className="text-xl sm:text-2xl">{getPerformanceEmoji(playerRank)}</span>
              </div>

              {/* Rank Display */}
              <div className="text-center mb-4 sm:mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full ${getRankColor(playerRank)} border-2`}>
                  <span className="text-2xl sm:text-3xl font-bold text-white">#{playerRank || '?'}</span>
                </div>
                <p className="text-white font-bold text-base sm:text-lg mt-2">{Math.max(0, currentPlayer.score || 0)} {t('points', 'điểm')}</p>
                <p className="text-blue-200 text-xs sm:text-sm mt-1">{getPerformanceMessage()}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-green-500/20 rounded-xl p-2.5 sm:p-3 text-center">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.correct}</p>
                  <p className="text-green-200 text-xs">{t('correct', 'Đúng')}</p>
                </div>
                <div className="bg-red-500/20 rounded-xl p-2.5 sm:p-3 text-center">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mx-auto mb-1" />
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.wrong}</p>
                  <p className="text-red-200 text-xs">{t('wrong', 'Sai')}</p>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center bg-white/5 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                  <span className="text-blue-100 flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm">
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{t('accuracy', 'Độ chính xác')}</span>
                  </span>
                  <span className="text-white font-bold text-sm sm:text-base">{stats.accuracy}%</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                  <span className="text-blue-100 flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{t('avgTime', 'TB thời gian')}</span>
                  </span>
                  <span className="text-white font-bold text-sm sm:text-base">{stats.avgTime}s</span>
                </div>
                {stats.streak >= 3 && (
                  <div className="flex justify-between items-center bg-orange-500/10 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border border-orange-400/20">
                    <span className="text-orange-200 flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm">
                      <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{t('bestStreak', 'Chuỗi tốt nhất')}</span>
                    </span>
                    <span className="text-orange-400 font-bold text-sm sm:text-base">{stats.streak}🔥</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-3 sm:mt-4">
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span className="text-blue-200">{t('progress', 'Tiến độ')}</span>
                  <span className="text-white">{stats.correct}/{stats.total}</span>
                </div>
                <div className="h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.accuracy}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Improvement Tips */}
          {stats.accuracy < 70 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-yellow-400/20"
            >
              <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">{t('improvementTips', 'Gợi ý cải thiện')}</h3>
              </div>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-yellow-100">
                <li>• {t('tip1', 'Đọc kỹ câu hỏi trước khi trả lời')}</li>
                <li>• {t('tip2', 'Ôn lại các chủ đề bạn sai nhiều')}</li>
                <li>• {t('tip3', 'Luyện tập thường xuyên để cải thiện')}</li>
              </ul>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2 sm:space-y-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBackToLobby}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl sm:rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('backToLobby', 'Về phòng chờ')}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                // Share results
                if (navigator.share) {
                  navigator.share({
                    title: t('quizResults', 'Kết quả Quiz'),
                    text: `${t('iScored', 'Tôi đạt')} ${Math.max(0, currentPlayer?.score || 0)} ${t('points', 'điểm')} - ${t('rank', 'Hạng')} #${playerRank}!`,
                  }).catch(console.error);
                }
              }}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 border border-white/20 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-white/20 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('shareResults', 'Chia sẻ kết quả')}</span>
            </motion.button>
          </motion.div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ModernGameResults;

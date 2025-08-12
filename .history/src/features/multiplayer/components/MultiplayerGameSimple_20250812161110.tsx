import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { 
  Trophy, 
  Users,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Crown,
  Clock
} from 'lucide-react';
// import { firestoreMultiplayerService } from '../services';

// Mock service for legacy components
const firestoreMultiplayerService = {
  onRoomUpdate: (_callback: any) => {
    // Mock implementation
    return () => {}; // unsubscribe function
  },
  getCurrentRoom: () => null,
  submitAnswer: async (...args: any[]) => {
    console.log('Mock submitAnswer called with:', args);
  },
  getQuestionResults: async (questionIndex: number) => {
    console.log('Mock getQuestionResults called with:', questionIndex);
    return {};
  }
};
import { MultiplayerRoom } from '../types';
import { Question } from '../../quiz/types';
import { toast } from 'react-toastify';

interface GameState {
  currentQuestion: number;
  question: Question | null;
  timeLeft: number;
  gameFinished: boolean;
}

interface PlayerResult {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  answer?: string;
  isCorrect?: boolean;
  pointsEarned?: number;
}

const MultiplayerGameSimple: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Debug logging helper
  const debugLog = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  };
  
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    currentQuestion: 0,
    question: null,
    timeLeft: 30,
    gameFinished: false
  });
  
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [currentResults, setCurrentResults] = useState<PlayerResult[]>([]);
  
  // New states for enhanced UX
  const [scoreGained, setScoreGained] = useState<number>(0);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [showQuestionResults, setShowQuestionResults] = useState(false);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number>(0);
  
  // State for short answer input
  const [shortAnswerInput, setShortAnswerInput] = useState<string>('');

  // Ref for timeout cleanup
  const scorePopupTimeoutRef = useRef<number | null>(null);
  
  // Ref for auto advance timer cleanup
  const autoAdvanceTimerRef = useRef<number | null>(null);

  // Initialize game - wait for both roomId and user
  useEffect(() => {
    if (!roomId || !user) return; // Wait for user to be ready
    initializeGame();
  }, [roomId, user]);

  // Timer effect - 30s countdown
  useEffect(() => {
    if (gameState.timeLeft > 0 && !showQuestionResults && !hasAnswered) {
      const timer = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeLeft: Math.max(0, prev.timeLeft - 1)
        }));
      }, 1000);
      
      return () => clearInterval(timer);
    }
    
    if (gameState.timeLeft === 0 && !showQuestionResults && !hasAnswered) {
      handleTimeUp();
    }
  }, [gameState.timeLeft, showQuestionResults, hasAnswered]);

  // Auto advance timer - all players show countdown, server controls advancement
  useEffect(() => {
    // Clear any existing timer first
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    
    if (showQuestionResults && autoAdvanceTimer > 0) {
      autoAdvanceTimerRef.current = window.setInterval(() => {
        setAutoAdvanceTimer(prev => {
          const newValue = prev - 1;
          debugLog('⏰ Auto advance timer:', newValue, 'showResults:', showQuestionResults);
          return newValue;
        });
      }, 1000);
      
      return () => {
        if (autoAdvanceTimerRef.current) {
          clearInterval(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
      };
    }
    
    // Timer is just for display - server will handle advancement automatically
    if (autoAdvanceTimer === 0 && showQuestionResults) {
      debugLog('⏰ Timer finished - waiting for server to advance...');
    }
  }, [autoAdvanceTimer, showQuestionResults]);

  // Room listener
  useEffect(() => {
    if (room) {
      const unsubscribe = firestoreMultiplayerService.onRoomUpdate((updatedRoom: any) => {
        setRoom(updatedRoom);
        
        // Sync game finished status from room
        if (updatedRoom.status === 'finished' && !gameState.gameFinished) {
          debugLog('🏁 Room finished - showing final leaderboard for all players');
          setGameState(prev => ({ ...prev, gameFinished: true }));
          setShowQuestionResults(false); // Hide question results if showing
          return; // Don't process other updates when game is finished
        }
        
        // Always sync when question changes - no blocking conditions
        if (updatedRoom.currentQuestion !== gameState.currentQuestion) {
          debugLog('🔄 Room question updated from', gameState.currentQuestion, 'to', updatedRoom.currentQuestion);
          
          // Reset ALL question-specific states for all players
          setShowQuestionResults(false);
          setAutoAdvanceTimer(0);
          setHasAnswered(false);
          setWaitingForOthers(false);
          setScoreGained(0);
          setSelectedAnswer('');
          setShowScorePopup(false);
          setCurrentResults([]);
          
          loadQuestion(updatedRoom.currentQuestion, updatedRoom);
        }
        
        // Sync with server phase - show results when server sets phase to 'results'
        if ((updatedRoom as any).phase === 'results' && !showQuestionResults) {
          debugLog('📊 Server triggered results phase');
          setWaitingForOthers(false);
          setShowQuestionResults(true);
          setAutoAdvanceTimer(3);
          
          // Load results for current question
          loadCurrentQuestionResults();
        }
        
        // Hide results when server moves to question phase
        if ((updatedRoom as any).phase === 'question' && showQuestionResults) {
          debugLog('❓ Server triggered question phase');
          setShowQuestionResults(false);
          setAutoAdvanceTimer(0);
        }
      });
      
      return unsubscribe;
    }
  }, [room?.id, gameState.currentQuestion, showQuestionResults]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scorePopupTimeoutRef.current) {
        clearTimeout(scorePopupTimeoutRef.current);
      }
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const initializeGame = async () => {
    try {
      if (!roomId || !user) {
        toast.error('Thiếu thông tin phòng hoặc người dùng');
        navigate('/multiplayer');
        return;
      }

      const currentRoom = firestoreMultiplayerService.getCurrentRoom();
      if (!currentRoom) {
        toast.error('Không tìm thấy phòng');
        navigate('/multiplayer');
        return;
      }

      setRoom(currentRoom);
      
      // loadQuestion((currentRoom as any)?.currentQuestion || 0, currentRoom);
      
    } catch (error) {
      console.error('❌ Error initializing game:', error); // Keep error logs always
      toast.error('Lỗi khởi tạo game');
      navigate('/multiplayer');
    }
  };

  const loadQuestion = (questionIndex: number, roomData: MultiplayerRoom) => {
    debugLog('📝 Loading question:', questionIndex);
    
    // Check if game is finished based on room status
    if (roomData.status === 'finished') {
      debugLog('🏁 Game is finished according to room status');
      setGameState(prev => ({ ...prev, gameFinished: true }));
      return;
    }
    
    if (questionIndex >= roomData.quiz.questions.length) {
      debugLog('🏁 No more questions - game should be finished');
      setGameState(prev => ({ ...prev, gameFinished: true }));
      return;
    }

    const question = roomData.quiz.questions[questionIndex];
    
    // Reset ALL states for new question
    setGameState({
      currentQuestion: questionIndex,
      question: question as any, // Convert question types
      timeLeft: 30,
      gameFinished: false
    });
    
    setSelectedAnswer('');
    setHasAnswered(false);
    setQuestionStartTime(Date.now());
    setCurrentResults([]);
    setWaitingForOthers(false);
    setShowQuestionResults(false);
    setShowScorePopup(false);
    setAutoAdvanceTimer(0);
    setScoreGained(0);
    setShortAnswerInput(''); // Reset short answer input
    
    // Clear any pending score popup timeout
    if (scorePopupTimeoutRef.current) {
      clearTimeout(scorePopupTimeoutRef.current);
      scorePopupTimeoutRef.current = null;
    }
    
    // 🔑 Clear any pending auto advance timer
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
      debugLog('🛑 Cleared auto advance timer for new question');
    }
    
    debugLog('✅ Question loaded:', questionIndex, question.text.substring(0, 50));
  };

  const calculateScore = (timeLeft: number): number => {
    return Math.max(0, 300 - (30 - timeLeft) * 10);
  };

  // Normalize boolean values for consistent comparison
  const normalizeBool = (s: string): string => {
    const x = s.trim().toLowerCase();
    if (['đúng', 'true', 't', '1', 'yes', 'y'].includes(x)) return 'true';
    if (['sai', 'false', 'f', '0', 'no', 'n'].includes(x)) return 'false';
    return x; // fallback to original
  };

  // Convert standard boolean value to display label
  const getBooleanLabel = (value: string): string => {
    const normalized = normalizeBool(value);
    return normalized === 'true' ? 'Đúng' : (normalized === 'false' ? 'Sai' : value);
  };

  // Check if answer is correct based on question type
  const checkAnswerCorrectness = (answer: string, question: Question): boolean => {
    if (question.type === 'short_answer') {
      // For short answer questions, check against correctAnswer and acceptedAnswers
      const correctAnswer = question.correctAnswer?.toLowerCase().trim();
      const userAnswer = answer.toLowerCase().trim();
      
      if (correctAnswer && userAnswer === correctAnswer) {
        return true;
      }
      
      // Check against accepted answers
      if (question.acceptedAnswers?.length) {
        return question.acceptedAnswers.some(accepted => 
          accepted.toLowerCase().trim() === userAnswer
        );
      }
      
      return false;
    } else if (question.type === 'boolean') {
      // For boolean questions, normalize both expected and received values
      const correctAnswerOption = question.answers.find(a => a.isCorrect);
      if (!correctAnswerOption) return false;
      
      // Prioritize value field if exists, fallback to text
      const expectedValue = (correctAnswerOption as any).value ?? correctAnswerOption.text;
      const expectedNormalized = normalizeBool(String(expectedValue));
      const receivedNormalized = normalizeBool(answer);
      
      return expectedNormalized === receivedNormalized;
    } else {
      // For multiple choice questions, check against answers array
      const correctAnswerOption = question.answers.find(a => a.isCorrect);
      return !!(correctAnswerOption && answer === correctAnswerOption.text);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    if (hasAnswered || showQuestionResults || !room || !gameState.question) return;
    
    setSelectedAnswer(answer);
    setHasAnswered(true);
    
    const timeToAnswer = Date.now() - questionStartTime;
    const currentTimeLeft = gameState.timeLeft;
    
    const isCorrect = checkAnswerCorrectness(answer, gameState.question);
    const points = isCorrect ? calculateScore(currentTimeLeft) : 0;
    
    debugLog('📝 Submitting answer:', {
      answer,
      isCorrect,
      points,
      timeLeft: currentTimeLeft,
      questionIndex: gameState.currentQuestion,
      questionType: gameState.question.type
    });
    
    setScoreGained(points);
    setShowScorePopup(true);
    setWaitingForOthers(true);
    
    try {
      await firestoreMultiplayerService.submitAnswer(
        gameState.currentQuestion, 
        answer, 
        timeToAnswer,
        points
      );
      
      // Clear existing timeout and set new one
      if (scorePopupTimeoutRef.current) {
        clearTimeout(scorePopupTimeoutRef.current);
      }
      scorePopupTimeoutRef.current = window.setTimeout(() => {
        setShowScorePopup(false);
        scorePopupTimeoutRef.current = null;
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      toast.error('Lỗi gửi câu trả lời');
    }
  };

  const handleShortAnswerSubmit = async () => {
    if (!shortAnswerInput.trim() || hasAnswered || !gameState.question) return;
    await handleAnswerSelect(shortAnswerInput.trim());
  };

  const handleShortAnswerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleShortAnswerSubmit();
    }
  };

  const handleTimeUp = () => {
    if (hasAnswered || showQuestionResults) return;
    setHasAnswered(true);
    setWaitingForOthers(true);
  };

  const loadCurrentQuestionResults = async () => {
    try {
      const results = await firestoreMultiplayerService.getQuestionResults(gameState.currentQuestion);
      
      if (Array.isArray(results)) {
        setCurrentResults(results);
        debugLog('✅ Results loaded from server:', results.length, 'players');
      }
    } catch (error) {
      console.error('❌ Error loading results:', error);
    }
  };

  const handleBackToLobby = () => {
    navigate('/multiplayer');
  };

  // Memoized scores for performance - O(P×Q) -> O(Q) 
  const scoresByPlayer = useMemo(() => {
    const map: Record<string, number> = {};
    if (!room?.questionAnswers) return map;
    
    Object.values(room.questionAnswers).forEach(questionData => {
      Object.entries(questionData).forEach(([playerId, answerData]) => {
        map[playerId] = (map[playerId] || 0) + (answerData.pointsEarned || 0);
      });
    });
    
    return map;
  }, [room?.questionAnswers]);

  const getPlayerTotalScore = (playerId: string): number => {
    return scoresByPlayer[playerId] || 0;
  };

  const getFinalLeaderboard = (): PlayerResult[] => {
    if (!room) return [];
    
    // Use memoized scores for better performance
    return room.players.map(player => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      score: scoresByPlayer[player.id] || 0
    })).sort((a, b) => b.score - a.score);
  };

  // Early return for loading state
  if (!room || (!gameState.question && !gameState.gameFinished)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Đang tải trò chơi...</div>
      </div>
    );
  }

  // Game finished - show final leaderboard for ALL players
  if (gameState.gameFinished) {
    const finalLeaderboard = getFinalLeaderboard();
    debugLog('🏆 Showing final leaderboard for', finalLeaderboard.length, 'players');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBackToLobby}
            className="mb-6 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>

          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">🎉 Kết quả cuối game 🎉</h1>
            <p className="text-white/70 mb-8">
              Quiz "{room.quiz.title}" đã hoàn thành với {room.players.length} người chơi
            </p>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              {finalLeaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 border border-gray-300/30'
                      : index === 2
                      ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-white/20 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    {index === 0 && <Crown className="w-5 h-5 text-yellow-400" />}
                    <span className="text-white font-medium">{player.name}</span>
                  </div>
                  <div className="text-white font-bold text-lg">
                    {player.score} điểm
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleBackToLobby}
              className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium"
            >
              Quay lại lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show question results
  if (showQuestionResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Kết quả câu {gameState.currentQuestion + 1}
              </h2>
              <p className="text-white/70">
                Tự động chuyển sang câu tiếp theo sau {autoAdvanceTimer > 0 ? autoAdvanceTimer : 0}s
              </p>
            </div>

            <div className="mb-6 p-4 bg-white/5 rounded-lg">
              <h3 className="text-white font-medium mb-2">Câu hỏi:</h3>
              {gameState.question?.richText ? (
                <div 
                  className="text-white/90"
                  dangerouslySetInnerHTML={{ __html: gameState.question.richText }}
                />
              ) : (
                <p className="text-white/90">{gameState.question?.text}</p>
              )}
              
              {/* Question media */}
              {gameState.question?.imageUrl && (
                <div className="mt-3">
                  <img
                    src={gameState.question.imageUrl}
                    alt="Question image"
                    className="max-w-full max-h-48 rounded-lg border border-white/20"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="mt-3 text-green-400 font-medium">
                Đáp án đúng: {
                  gameState.question?.type === 'short_answer' 
                    ? gameState.question?.correctAnswer || 'N/A'
                    : gameState.question?.type === 'boolean'
                    ? (() => {
                        const correctOption = gameState.question?.answers.find(a => a.isCorrect);
                        if (!correctOption) return 'N/A';
                        
                        const expectedValue = (correctOption as any).value ?? correctOption.text;
                        return getBooleanLabel(String(expectedValue));
                      })()
                    : gameState.question?.answers.find(a => a.isCorrect)?.text || 'N/A'
                }
                {gameState.question?.type === 'short_answer' && gameState.question?.acceptedAnswers?.length && (
                  <div className="text-sm text-green-300 mt-1">
                    Các đáp án được chấp nhận: {gameState.question.acceptedAnswers.join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {Array.isArray(currentResults) && currentResults.map((result) => {
                // For boolean answers, convert standard value back to display label
                const displayAnswer = gameState.question?.type === 'boolean' 
                  ? getBooleanLabel(result.answer || '')
                  : result.answer;
                  
                return (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {result.isCorrect ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-white font-medium">{result.name}</span>
                      <span className="text-white/70">({displayAnswer})</span>
                    </div>
                    <div className="text-white font-bold">
                      +{result.pointsEarned || 0} điểm
                    </div>
                  </div>
                );
              })}
              
              {/* Show message if no results */}
              {(!Array.isArray(currentResults) || currentResults.length === 0) && (
                <div className="text-center text-white/70 py-4">
                  Đang tải kết quả...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main game UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleBackToLobby}
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Rời khỏi
          </button>
          
          <div className="flex items-center gap-4 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>{room.players.length} người chơi</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className={`font-bold ${gameState.timeLeft <= 10 ? 'text-red-400' : ''}`}>
                {gameState.timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Score popup */}
        {showScorePopup && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                +{scoreGained} điểm
              </div>
              <div className="text-white/70">Thời gian còn lại: {gameState.timeLeft}s</div>
            </div>
          </div>
        )}

        {/* Waiting for others */}
        {waitingForOthers && !showScorePopup && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-center">
            <div className="text-white font-medium">
              Đang chờ các người chơi khác...
            </div>
          </div>
        )}

        {/* Question */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="text-purple-300 font-medium mb-2">
              Câu {gameState.currentQuestion + 1}/{room.quiz.questions.length}
            </div>
            
            {/* Question text/rich text */}
            {gameState.question?.richText ? (
              <div 
                className="text-2xl font-bold text-white mb-4"
                dangerouslySetInnerHTML={{ __html: gameState.question.richText }}
              />
            ) : (
              <h2 className="text-2xl font-bold text-white mb-4">
                {gameState.question?.text}
              </h2>
            )}
            
            {/* Question Image */}
            {gameState.question?.imageUrl && (
              <div className="mb-6">
                <img
                  src={gameState.question.imageUrl}
                  alt="Question image"
                  className="max-w-full max-h-64 mx-auto rounded-lg border-2 border-white/20"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Question Attachments */}
            {gameState.question?.attachments && gameState.question.attachments.length > 0 && (
              <div className="mb-6 space-y-3">
                {gameState.question.attachments.map((attachment, index) => (
                  <div key={index} className="flex justify-center">
                    {attachment.type === 'image' && (
                      <img
                        src={attachment.url}
                        alt={attachment.description || `Attachment ${index + 1}`}
                        className="max-w-full max-h-64 rounded-lg border-2 border-white/20"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    {attachment.type === 'audio' && (
                      <audio
                        controls
                        className="w-full max-w-md"
                        preload="metadata"
                      >
                        <source src={attachment.url} type="audio/mpeg" />
                        <source src={attachment.url} type="audio/wav" />
                        <source src={attachment.url} type="audio/ogg" />
                        Trình duyệt không hỗ trợ audio.
                      </audio>
                    )}
                    {attachment.type === 'video' && (
                      <video
                        controls
                        className="w-full max-w-md max-h-64"
                        preload="metadata"
                      >
                        <source src={attachment.url} type="video/mp4" />
                        <source src={attachment.url} type="video/webm" />
                        <source src={attachment.url} type="video/ogg" />
                        Trình duyệt không hỗ trợ video.
                      </video>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Score indicator */}
            <div className="text-white/70 text-sm">
              Điểm hiện tại: {calculateScore(gameState.timeLeft)} / 300
            </div>
          </div>

          {/* Answers - Multiple Choice, Boolean, or Short Answer */}
          {gameState.question?.type === 'short_answer' ? (
            // Short Answer Input
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-white/70 mb-4">Nhập câu trả lời của bạn:</p>
                <div className="max-w-md mx-auto">
                  <input
                    type="text"
                    value={shortAnswerInput}
                    onChange={(e) => setShortAnswerInput(e.target.value)}
                    onKeyDown={handleShortAnswerKeyDown}
                    disabled={hasAnswered}
                    placeholder="Nhập câu trả lời..."
                    className="w-full p-4 rounded-lg bg-white/10 border-2 border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none disabled:bg-white/5 disabled:border-white/10 disabled:text-white/50"
                  />
                  <button
                    onClick={handleShortAnswerSubmit}
                    disabled={hasAnswered || !shortAnswerInput.trim()}
                    className="mt-3 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hasAnswered ? 'Đã trả lời' : 'Gửi câu trả lời'}
                  </button>
                </div>
              </div>
            </div>
          ) : gameState.question?.type === 'boolean' ? (
            // True/False Questions - use standard values for comparison
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {(['true', 'false'] as const).map((value) => {
                const option = {
                  value,
                  label: value === 'true' ? 'Đúng' : 'Sai',
                  icon: value === 'true' ? '✓' : '✗'
                };
                return (
                  <button
                    key={value}
                    onClick={() => handleAnswerSelect(value)} // Send standard value
                    disabled={hasAnswered}
                    className={`p-6 rounded-lg text-center transition-all duration-200 ${
                      selectedAnswer === value
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : hasAnswered
                        ? 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                    } border-2`}
                  >
                    <div className="text-xl font-bold mb-2">
                      {option.icon}
                    </div>
                    <div className="text-lg font-medium">{option.label}</div>
                    {selectedAnswer === value && (
                      <CheckCircle className="w-6 h-6 text-white mx-auto mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : gameState.question?.answers && gameState.question.answers.length > 0 ? (
            // Multiple Choice Options
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gameState.question.answers.map((answer, index) => (
                <button
                  key={`${index}-${answer.text}`} // Use index + text to ensure uniqueness
                  onClick={() => handleAnswerSelect(answer.text)}
                  disabled={hasAnswered}
                  className={`p-4 rounded-lg text-left transition-all duration-200 ${
                    selectedAnswer === answer.text
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : hasAnswered
                      ? 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                  } border-2`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedAnswer === answer.text
                        ? 'bg-white text-purple-600'
                        : 'bg-white/20 text-white'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    
                    {/* Answer content */}
                    <div className="flex-1">
                      {/* Answer image */}
                      {answer.imageUrl && (
                        <div className="mb-2">
                          <img
                            src={answer.imageUrl}
                            alt={`Answer ${String.fromCharCode(65 + index)}`}
                            className="max-w-full max-h-32 rounded-md border border-white/20"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Answer text */}
                      <span>{answer.text}</span>
                      
                      {/* Rich text content */}
                      {answer.richText && (
                        <div 
                          className="mt-2 text-sm opacity-90"
                          dangerouslySetInnerHTML={{ __html: answer.richText }}
                        />
                      )}
                    </div>
                    
                    {selectedAnswer === answer.text && (
                      <CheckCircle className="w-5 h-5 text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-white/70">Đang tải câu hỏi...</div>
            </div>
          )}
        </div>

        {/* Players list */}
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Người chơi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {room.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {player.id === room.hostId && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                <div className="text-white/70 text-sm">
                  {getPlayerTotalScore(player.id)} điểm
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerGameSimple;

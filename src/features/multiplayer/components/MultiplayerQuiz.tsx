import React, { useMemo, useRef, useState, useEffect } from 'react';
import { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { toast } from 'react-toastify';
import SafeHTML from '../../../shared/components/ui/SafeHTML';


// Type definitions
interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text?: string;
  title?: string;
  answers?: Answer[];
  options?: string[];
  type?: string;
  points?: number;
}

interface PlayerResult {
  playerId: string;
  playerName: string;
  isCorrect: boolean;
  selectedAnswer: number | null;
  points: number;
  timeSpent: number;
}

interface GameData {
  currentQuestionIndex: number;
  questions: Question[];
  timePerQuestion: number;
  showingResults?: boolean;
  nextQuestionAt?: { seconds: number };
  questionEndAt?: { seconds: number };
  phase?: 'countdown' | 'question' | 'results' | 'finished';
  questionResults?: {
    [questionId: string]: PlayerResult[];
  };
}

interface RoomData {
  id: string;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  gameData?: GameData;
  gameStartAt?: { seconds: number };
  gameStartDelay?: number;
  settings?: {
    timePerQuestion?: number;
  };
  quiz?: {
    id?: string;
    title?: string;
    questions: Question[];
  };
  players?: any[];
  questionAnswers?: {
    [questionIndex: number]: {
      [playerId: string]: {
        questionId?: string;
        selectedAnswer: number;
        answer?: string;
        timeToAnswer: number;
        timeSpent?: number;
        pointsEarned: number;
        isCorrect: boolean;
        timestamp: number;
      };
    };
  };
}

interface ProcessedQuestion {
  id: string;
  title: string;
  options: string[];
  correct: number;
  type?: string;
  points?: number;
  explanation?: string;
}

interface QuestionResults {
  isCorrect: boolean;
  correctAnswer: number;
  selectedAnswer: number | null;
  points: number;
  explanation: string;
}

interface MultiplayerQuizProps {
  gameData: GameData | null;
  roomData: RoomData | null;
  currentUserId: string;
  currentUserName: string;
  multiplayerService: MultiplayerServiceInterface | null;
}

const MultiplayerQuiz: React.FC<MultiplayerQuizProps> = ({
  gameData,
  roomData,
  currentUserName,
  multiplayerService
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState<QuestionResults | null>(null);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState<number | null>(null);
  const [gameStartCountdown, setGameStartCountdown] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(0);
  const [realtimeGameData, setRealtimeGameData] = useState<GameData | null>(gameData);
  const [realtimeRoomData, setRealtimeRoomData] = useState<RoomData | null>(roomData);
  
  // Client-side game state for fast performance
  const [playerScores, setPlayerScores] = useState<{[playerId: string]: number}>({});
  const [playerAnswers, setPlayerAnswers] = useState<{[playerId: string]: any[]}>({});
  const [currentQuestionAnswers, setCurrentQuestionAnswers] = useState<{[playerId: string]: any}>({});

  const [waitingForOthers, setWaitingForOthers] = useState<boolean>(false);
  
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const gameStartRef = useRef<number | null>(null);
  const previousQuestionIndexRef = useRef<number>(-1);

  // Use real-time data consistently
  const currentGameData = realtimeGameData || gameData;
  const currentRoomData = realtimeRoomData || roomData;
  
  const timePerQuestion = currentGameData?.timePerQuestion ?? currentRoomData?.settings?.timePerQuestion ?? 30;
  const [timeLeft, setTimeLeft] = useState<number>(timePerQuestion);
  
  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // Get current game phase
  const gamePhase = currentGameData?.phase || 'question';
  const roomStatus = currentRoomData?.status || 'waiting';

  // Real-time Firestore listener
  useEffect(() => {
    if (!roomData?.id) return;

    const roomRef = doc(db, 'multiplayer_rooms', roomData.id);
    
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as RoomData;
        
        setRealtimeRoomData(data);
        if (data.gameData) {
          setRealtimeGameData(data.gameData as GameData);
        }
        
        // Handle game starting phase
        if (data.status === 'starting') {
          if (data.gameStartAt && data.gameStartDelay) {
            const startTime = new Date(data.gameStartAt.seconds * 1000);
            const now = new Date();
            const elapsedTime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const secondsLeft = Math.max(0, Math.floor(data.gameStartDelay / 1000) - elapsedTime);
            
            setGameStartCountdown(secondsLeft > 0 ? secondsLeft : 0);
          } else {
            setGameStartCountdown(5);
          }
        }
        
        // Clear countdown when game actually starts OR countdown reaches 0
        if ((data.status === 'playing' && data.gameData?.phase === 'question') || 
            (data.status === 'starting' && gameStartCountdown === 0)) {
          setGameStartCountdown(null);
        }
        
        // Handle question timing
        if (data.gameData?.questionEndAt && data.gameData?.phase === 'question') {
          const endTime = new Date(data.gameData.questionEndAt.seconds * 1000);
          const now = new Date();
          const secondsLeft = Math.max(0, Math.ceil((endTime.getTime() - now.getTime()) / 1000));
          
          if (secondsLeft > 0) {
            setQuestionTimeLeft(secondsLeft);
            setTimeLeft(secondsLeft);
          }
        }
        
        // Detect question change
        const newIndex = data.gameData?.currentQuestionIndex ?? 0;
        if (newIndex !== previousQuestionIndexRef.current) {
          previousQuestionIndexRef.current = newIndex;
          
          // Reset UI state for new question
          setSelectedIndex(null);
          setLocked(false);
          setShowResults(false);
          setQuestionResults(null);
          setTimeLeft(timePerQuestion);
          setWaitingForOthers(false);
          setCurrentQuestionAnswers({});
          
          // Clear existing timers
          if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          if (countdownRef.current) {
            window.clearTimeout(countdownRef.current);
            countdownRef.current = null;
          }
        }
        
        // Handle results phase
        if (data.gameData?.phase === 'results' && data.gameData?.nextQuestionAt) {
          const nextTime = new Date(data.gameData.nextQuestionAt.seconds * 1000);
          const now = new Date();
          const secondsLeft = Math.max(0, Math.ceil((nextTime.getTime() - now.getTime()) / 1000));
          
          if (secondsLeft > 0) {
            setShowResults(true);
            setNextQuestionCountdown(secondsLeft);
          }
        }
        
        // Handle game finished
        if (data.gameData?.phase === 'finished') {
          setShowResults(true);
          setNextQuestionCountdown(null);
        }
      }
    });

    // Cleanup function
    return () => {
      unsubscribe();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        window.clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
      if (gameStartRef.current) {
        window.clearTimeout(gameStartRef.current);
        gameStartRef.current = null;
      }
    };
  }, [roomData?.id]);

  // Sync all players' scores and answers from server data
  useEffect(() => {
    if (!currentRoomData?.questionAnswers) return;

    const serverPlayerScores: {[playerId: string]: number} = {};
    const serverPlayerAnswers: {[playerId: string]: any[]} = {};

    // Calculate scores and answers from server data for ALL players
    Object.values(currentRoomData.questionAnswers).forEach(questionData => {
      Object.entries(questionData).forEach(([playerId, answerData]: [string, any]) => {
        // Calculate scores
        serverPlayerScores[playerId] = (serverPlayerScores[playerId] || 0) + (answerData.pointsEarned || 0);
        
        // Track answer history
        if (!serverPlayerAnswers[playerId]) {
          serverPlayerAnswers[playerId] = [];
        }
        serverPlayerAnswers[playerId].push({
          questionId: answerData.questionId,
          selectedAnswer: answerData.selectedAnswer,
          isCorrect: answerData.isCorrect,
          timeSpent: answerData.timeToAnswer || answerData.timeSpent,
          points: answerData.pointsEarned || 0
        });
      });
    });
    
    // Update state with server data for all players
    setPlayerScores(serverPlayerScores);
    setPlayerAnswers(serverPlayerAnswers);
  }, [currentRoomData?.questionAnswers]);

  // Game start countdown effect
  useEffect(() => {
    if (gameStartCountdown !== null && gameStartCountdown > 0) {
      gameStartRef.current = window.setTimeout(() => {
        setGameStartCountdown(prev => {
          const newCount = (prev ?? 0) - 1;
          return newCount;
        });
      }, 1000);
    } else if (gameStartCountdown === 0) {
      // Countdown finished - game should start
      setGameStartCountdown(null);
    }
    
    return () => {
      if (gameStartRef.current) {
        window.clearTimeout(gameStartRef.current);
        gameStartRef.current = null;
      }
    };
  }, [gameStartCountdown]);

  // Question timer countdown effect
  useEffect(() => {
    if (questionTimeLeft !== null && questionTimeLeft > 0 && realtimeGameData?.phase === 'question') {
      const timer = window.setTimeout(() => {
        setQuestionTimeLeft(prev => {
          const newTime = (prev ?? 0) - 1;
          return newTime;
        });
      }, 1000);
      
      return () => window.clearTimeout(timer);
    }
  }, [questionTimeLeft, realtimeGameData?.phase]);

  // Get current game phase from room data
  const currentGamePhase = realtimeGameData?.phase || gamePhase;
  const currentRoomStatus = realtimeRoomData?.status || roomStatus;

  // Save final results to server when game finishes
  // Convert quiz format from Firestore to multiplayer format (using index-based answers)
  const processedQuestions = useMemo((): ProcessedQuestion[] => {
    const rawQuestions = currentGameData?.questions || [];
    
    return rawQuestions.map((q: Question): ProcessedQuestion => {
      let options: string[] = [];
      let correctIndex = 0;

      if (q.answers && Array.isArray(q.answers)) {
        options = q.answers.map(a => a.text);
        correctIndex = q.answers.findIndex(a => a.isCorrect);
      } else if (q.options && Array.isArray(q.options)) {
        options = q.options;
        correctIndex = 0;
      }

      return {
        id: q.id || `q${rawQuestions.indexOf(q)}`,
        title: q.text || q.title || '',
        options,
        correct: correctIndex,
        type: q.type || 'multiple',
        points: q.points || 10,
        explanation: ''
      };
    });
  }, [currentGameData?.questions]);

  useEffect(() => {
    const saveFinalResults = async () => {
      if (currentGamePhase === 'finished' && currentUser?.uid && currentRoomData?.id) {
        try {
          const myAnswers = playerAnswers[currentUser.uid] || [];
          const myScore = playerScores[currentUser.uid] || 0;
          const correctAnswers = myAnswers.filter(a => a.isCorrect).length;
          const totalQuestions = processedQuestions.length;
          const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

          // Save to quiz_results collection
          await addDoc(collection(db, 'quiz_results'), {
            userId: currentUser.uid,
            quizId: currentRoomData.quiz?.id || currentRoomData.id,
            quizTitle: currentRoomData.quiz?.title || 'Multiplayer Quiz',
            mode: 'multiplayer',
            roomId: currentRoomData.id,
            score: myScore,
            correctAnswers,
            totalQuestions,
            percentage: Math.round(percentage * 10) / 10,
            timeSpent: myAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0),
            completedAt: serverTimestamp(),
            answers: myAnswers.map((a, index) => ({
              questionId: processedQuestions[index]?.id || `q${index}`,
              questionText: processedQuestions[index]?.title || '',
              selectedAnswer: a.selectedAnswer,
              isCorrect: a.isCorrect,
              timeSpent: a.timeSpent || 0,
              points: a.points || 0
            }))
          });

          console.log('✅ Multiplayer results saved successfully');
        } catch (error) {
          console.error('❌ Failed to save multiplayer results:', error);
          toast.error('Failed to save your results');
        }
      }
    };
    
    saveFinalResults();
  }, [currentGamePhase, currentUser?.uid, currentRoomData?.id, currentRoomData?.quiz, playerAnswers, playerScores, processedQuestions]);

  // Get current question
  const currentQuestionIndex = currentGameData?.currentQuestionIndex || 0;
  const currentQuestion = processedQuestions[currentQuestionIndex];

  // Fallback for missing question data
  const finalQuestion: ProcessedQuestion = currentQuestion || {
    id: 'error',
    title: 'No question available',
    options: ['Please wait...'],
    correct: 0,
    explanation: 'Question loading...'
  };

  // Countdown timer (optimized - minimal dependencies)
  useEffect(() => {
    if (locked || showResults || timeLeft <= 0) return;
    
    timerRef.current = window.setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, locked, showResults]);

  // Handle time up
  useEffect(() => {
    if (timeLeft <= 0 && !locked) {
      // Auto-submit with selected answer, or undefined if no selection
      handleSubmit(selectedIndex ?? undefined);
    }
  }, [timeLeft, locked]);

  // Next question countdown (server-controlled)
  useEffect(() => {
    if (nextQuestionCountdown === null || nextQuestionCountdown <= 0) return;
    
    countdownRef.current = window.setTimeout(() => {
      setNextQuestionCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => {
      if (countdownRef.current) {
        window.clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [nextQuestionCountdown]);

  const handleSelect = (answerIndex: number) => {
    if (locked) return;
    setSelectedIndex(answerIndex);
    // Auto-submit immediately after selection (like MultiplayerGameSimple)
    setTimeout(() => handleSubmit(answerIndex), 100);
  };
  
  const handleSubmit = async (answerIndex?: number) => {
    const indexToSubmit = answerIndex !== undefined ? answerIndex : selectedIndex;
    if (locked) return; // Prevent double submission
    
    setLocked(true);
    
    if (!multiplayerService || !currentRoomData?.id || !finalQuestion?.id || !currentUser?.uid) {
      console.warn('Cannot submit answer - missing data:', { 
        hasService: !!multiplayerService, 
        roomId: currentRoomData?.id, 
        questionId: finalQuestion?.id,
        userId: currentUser?.uid
      });
      setLocked(false); // Allow retry
      return;
    }
    
    try {
      const timeSpent = timePerQuestion - timeLeft;
      const isCorrect = indexToSubmit !== null ? indexToSubmit === finalQuestion.correct : false;
      const points = isCorrect ? Math.max(10, Math.floor(100 - (timeSpent * 2))) : 0; // 10-100 points based on speed
      
      // Update client-side scores immediately for fast UI response
      setPlayerScores(prev => ({
        ...prev,
        [currentUser.uid]: (prev[currentUser.uid] || 0) + points
      }));
      
      // Store current question answer for real-time leaderboard during results
      setCurrentQuestionAnswers(prev => ({
        ...prev,
        [currentUser.uid]: {
          answer: indexToSubmit ?? -1,
          timeSpent,
          isCorrect,
          points
        }
      }));
      
      // Update player's answer history
      setPlayerAnswers(prev => ({
        ...prev,
        [currentUser.uid]: [
          ...(prev[currentUser.uid] || []),
          {
            questionId: finalQuestion.id,
            selectedAnswer: indexToSubmit ?? -1,
            isCorrect,
            timeSpent,
            points
          }
        ]
      }));
      
      // Submit to server (for sync with other players) - only if answer was selected
      if (indexToSubmit !== null) {
        await multiplayerService.submitAnswer(currentRoomData.id, finalQuestion.id, indexToSubmit, timeSpent);
      }
      
      // Set waiting state
      setWaitingForOthers(true);
      
      // Show results after 1 second
      setTimeout(() => {
        setQuestionResults({
          isCorrect,
          correctAnswer: finalQuestion.correct,
          selectedAnswer: indexToSubmit ?? -1,
          points,
          explanation: finalQuestion.explanation || ''
        });
        setShowResults(true);
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      setLocked(false); // Allow retry on error
    }
  };

  // Calculate progress percentage with proper pathLength
  const progressPercent = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round((timeLeft / timePerQuestion) * 100)));
  }, [timeLeft, timePerQuestion]);

  // SVG circle properties for accurate progress
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 p-2 sm:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Game Start Countdown Phase */}
        {currentRoomStatus === 'starting' && gameStartCountdown !== null && gameStartCountdown >= 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Starting Soon!</h2>
            <div className="text-6xl font-bold text-purple-600 mb-4">{gameStartCountdown}</div>
            <p className="text-gray-600">Get ready to answer questions!</p>
          </div>
        )}

        {/* Question Results Phase */}
        {currentGamePhase === 'results' && questionResults && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Question Results</h3>
            
            {/* Your Result */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-center">
                <div className={`text-2xl font-bold mb-2 ${questionResults.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {questionResults.isCorrect ? '✅ Correct!' : '❌ Wrong!'}
                </div>
                <div className="text-lg text-gray-700 mb-2">
                  You earned <span className="font-bold text-blue-600">+{questionResults.points}</span> points
                </div>
                <div className="text-sm text-gray-600">
                  Correct Answer: <span className="font-semibold">{finalQuestion.options?.[questionResults.correctAnswer] || 'N/A'}</span>
                </div>
                {questionResults.explanation && (
                  <SafeHTML content={questionResults.explanation} className="text-xs text-gray-500 mt-2" />
                )}
              </div>
            </div>

            {/* Live Leaderboard */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-3 text-center">Current Standings</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(currentRoomData?.players || [])
                  .map((player: any) => ({
                    ...player,
                    score: playerScores[player.id] || 0
                  }))
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => {
                    const isCurrentUser = player.id === currentUser?.uid;
                    const position = index + 1;
                    const trophy = position === 1 ? '👑' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
                    const currentAnswer = currentQuestionAnswers[player.id];
                    const correctAnswersCount = playerAnswers[player.id]?.filter(a => a.isCorrect).length || 0;
                    
                    return (
                      <div 
                        key={player.id} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isCurrentUser ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{trophy}</span>
                          <div>
                            <div className={`font-medium text-sm ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
                              #{position} {isCurrentUser 
                                ? (currentUserName || player?.username || player?.name || 'You')
                                : (player?.username || player?.name || player?.displayName || `Player ${position}`)
                              }
                              {isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {correctAnswersCount} đúng • {player.score} điểm
                              {currentAnswer && (
                                <span className={`ml-2 ${currentAnswer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  {currentAnswer.isCorrect ? '✓' : '✗'} +{currentAnswer.points}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`text-right ${isCurrentUser ? 'text-blue-700' : 'text-gray-700'}`}>
                          <div className="font-bold text-sm">{player.score}</div>
                          <div className="text-xs text-gray-500">pts</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {nextQuestionCountdown !== null && (
              <div className="mt-4 text-center">
                {nextQuestionCountdown > 0 ? (
                  <p className="text-gray-600">Câu hỏi tiếp theo trong: <span className="font-bold text-blue-600">{nextQuestionCountdown}s</span></p>
                ) : (
                  <p className="text-gray-600">Đang chờ người chơi khác...</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Final Results Phase - Ultra Modern Leaderboard */}
        {currentGamePhase === 'finished' && (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
            <div className="max-w-4xl mx-auto">
              
              {/* Trophy Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4 shadow-2xl">
                  <span className="text-4xl">🏆</span>
                </div>
                <h1 className="text-5xl font-black text-white mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  GAME COMPLETE!
                </h1>
                <p className="text-xl text-blue-200">Amazing performance by all players</p>
              </div>

              {/* Champion Podium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Object.entries(playerScores)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([playerId, score], index) => {
                    const player = currentRoomData?.players?.find((p: any) => p.id === playerId);
                    const isCurrentUser = playerId === currentUser?.uid;
                    const position = index + 1;
                    const playerAnswerHistory = playerAnswers[playerId] || [];
                    const correctAnswers = playerAnswerHistory.filter(a => a.isCorrect).length;
                    const totalQuestions = processedQuestions.length;
                    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers/totalQuestions)*100) : 0;
                    
                    const podiumData = {
                      1: { 
                        trophy: '🥇', 
                        color: 'from-yellow-400 to-yellow-600', 
                        bgColor: 'from-yellow-50 to-orange-50',
                        borderColor: 'border-yellow-400',
                        height: 'h-32'
                      },
                      2: { 
                        trophy: '🥈', 
                        color: 'from-gray-400 to-gray-600', 
                        bgColor: 'from-gray-50 to-slate-50',
                        borderColor: 'border-gray-400',
                        height: 'h-24'
                      },
                      3: { 
                        trophy: '🥉', 
                        color: 'from-amber-600 to-amber-800', 
                        bgColor: 'from-amber-50 to-yellow-50',
                        borderColor: 'border-amber-500',
                        height: 'h-20'
                      }
                    };
                    
                    const podium = podiumData[position as keyof typeof podiumData];
                    
                    return (
                      <div key={playerId} className="text-center">
                        <div className={`bg-white rounded-2xl shadow-2xl border-4 ${podium.borderColor} overflow-hidden transform hover:scale-105 transition-all duration-300 ${isCurrentUser ? 'ring-4 ring-blue-400' : ''}`}>
                          
                          {/* Podium Height Indicator */}
                          <div className={`bg-gradient-to-r ${podium.color} ${podium.height} flex items-end justify-center pb-4`}>
                            <span className="text-6xl">{podium.trophy}</span>
                          </div>
                          
                          {/* Player Info */}
                          <div className={`bg-gradient-to-r ${podium.bgColor} p-6`}>
                            <div className="text-2xl font-bold text-gray-800 mb-1">
                              #{position}
                            </div>
                            <div className={`text-lg font-semibold mb-2 ${isCurrentUser ? 'text-blue-700' : 'text-gray-700'}`}>
                              {player?.username || player?.name || 'Player'}
                              {isCurrentUser && <div className="text-sm text-blue-600 font-medium">(You)</div>}
                            </div>
                            
                            {/* Score Display */}
                            <div className="bg-white rounded-xl p-4 mb-3 shadow-inner">
                              <div className="text-3xl font-black text-gray-800">{score}</div>
                              <div className="text-sm text-gray-600 font-medium">POINTS</div>
                            </div>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-white rounded-lg p-2">
                                <div className="font-bold text-green-600">{correctAnswers}</div>
                                <div className="text-gray-600">Correct</div>
                              </div>
                              <div className="bg-white rounded-lg p-2">
                                <div className="font-bold text-blue-600">{accuracy}%</div>
                                <div className="text-gray-600">Accuracy</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Complete Leaderboard */}
              <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
                <h2 className="text-3xl font-black text-gray-800 mb-6 text-center">
                  🏅 COMPLETE RANKINGS
                </h2>
                
                <div className="space-y-3">
                  {Object.entries(playerScores)
                    .sort(([,a], [,b]) => b - a)
                    .map(([playerId, score], index) => {
                      const player = currentRoomData?.players?.find((p: any) => p.id === playerId);
                      const isCurrentUser = playerId === currentUser?.uid;
                      const position = index + 1;
                      const playerAnswerHistory = playerAnswers[playerId] || [];
                      const correctAnswers = playerAnswerHistory.filter(a => a.isCorrect).length;
                      const totalQuestions = processedQuestions.length;
                      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers/totalQuestions)*100) : 0;
                      const avgTimePerQuestion = playerAnswerHistory.length > 0 ? 
                        Math.round(playerAnswerHistory.reduce((sum, a) => sum + a.timeSpent, 0) / playerAnswerHistory.length) : 0;
                      
                      const positionColors = {
                        1: 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-400',
                        2: 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-400', 
                        3: 'bg-gradient-to-r from-amber-100 to-yellow-100 border-amber-400'
                      };
                      
                      const defaultColor = isCurrentUser ? 
                        'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400' : 
                        'bg-white border-gray-200';
                      
                      const cardColor = positionColors[position as keyof typeof positionColors] || defaultColor;
                      
                      return (
                        <div 
                          key={playerId}
                          className={`${cardColor} border-2 rounded-2xl p-4 transform hover:scale-102 transition-all duration-200 shadow-lg hover:shadow-xl`}
                        >
                          <div className="flex items-center justify-between">
                            
                            {/* Left: Rank & Player Info */}
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                                  position <= 3 ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                  #{position}
                                </div>
                              </div>
                              
                              <div>
                                <div className={`text-xl font-bold ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
                                  {player?.username || player?.name || 'Player'}
                                  {isCurrentUser && <span className="ml-2 text-sm bg-blue-500 text-white px-2 py-1 rounded-full">YOU</span>}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {correctAnswers}/{totalQuestions} correct • {accuracy}% accuracy • Avg: {avgTimePerQuestion}s
                                </div>
                              </div>
                            </div>
                            
                            {/* Right: Score */}
                            <div className="text-right">
                              <div className={`text-3xl font-black ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
                                {score}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">POINTS</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Game Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-3xl mb-2">📝</div>
                  <div className="text-2xl font-bold text-gray-800">{processedQuestions.length}</div>
                  <div className="text-sm text-gray-600 font-medium">Total Questions</div>
                </div>
                <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-gray-800">{Object.keys(playerScores).length}</div>
                  <div className="text-sm text-gray-600 font-medium">Players</div>
                </div>
                <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {playerAnswers[currentUser?.uid || '']?.filter(a => a.isCorrect).length || 0}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Your Correct</div>
                </div>
                <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {playerScores[currentUser?.uid || ''] || 0}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Your Score</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="text-center">
                <p className="text-xl text-blue-200 mb-6">Thanks for playing! 🎉</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => window.location.href = '/multiplayer'}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-2xl hover:shadow-purple-500/25"
                  >
                    🎮 Play Again
                  </button>
                  <button 
                    onClick={() => window.location.href = '/profile'}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-gray-700 hover:to-gray-800 transform hover:scale-105 transition-all duration-200 shadow-2xl"
                  >
                    👤 View Profile
                  </button>
                  <button 
                    onClick={() => window.location.href = '/leaderboard'}
                    className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-green-700 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
                  >
                    🏆 Global Leaderboard
                  </button>
                </div>
              </div>
              
            </div>
          </div>
        )}

        {/* Regular Game UI - show when ready to play */}
        {((currentRoomStatus === 'playing' && currentGamePhase === 'question') || 
          (currentRoomStatus === 'starting' && gameStartCountdown === 0)) && 
         currentGamePhase !== 'finished' && 
         processedQuestions.length > 0 && (
          <>
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base text-center">
                Question {currentQuestionIndex + 1} of {processedQuestions.length}
              </div>
              <div className="flex items-center gap-2 text-gray-600 justify-center sm:justify-start">
                <Users size={18} />
                <span className="text-sm sm:text-base">{currentRoomData?.players?.length || 0} players</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              {locked && (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-xl font-medium text-sm">
                  <CheckCircle size={16} />
                  <span>Submitted!</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base ${
                  timeLeft <= 5 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Clock size={16} />
                  <span>{timeLeft}s</span>
                </div>
                
                <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                    <circle 
                      cx="18" cy="18" r="16" fill="none" 
                      stroke={timeLeft <= 5 ? "#ef4444" : "#3b82f6"}
                      strokeWidth="3" 
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                      {progressPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {timeLeft <= 10 && !locked && (
            <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-lg mb-4">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertCircle size={18} />
                <span className="font-medium">Time is running out!</span>
              </div>
            </div>
          )}
          
          {waitingForOthers && (
            <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Clock size={18} />
                <span className="font-medium">Waiting for other players...</span>
              </div>
            </div>
          )}
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-4">
              {finalQuestion.title || 'No question available'}
            </h2>
            <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-purple-500 to-blue-600 mx-auto rounded-full"></div>
          </div>
          
          {/* Show message if no options */}
          {(!finalQuestion.options || finalQuestion.options.length === 0) && (
            <div className="text-center p-8 bg-gray-50 rounded-xl">
              <p className="text-gray-600">Waiting for question options to load...</p>
              <p className="text-sm text-gray-500 mt-2">
                Questions available: {processedQuestions.length} | Current index: {currentQuestionIndex}
              </p>
            </div>
          )}
          
          {/* Show options if available */}
          {finalQuestion.options && finalQuestion.options.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 mb-6 sm:mb-8">
              {finalQuestion.options.map((option: string, idx: number) => {
                const isSelected = selectedIndex === idx;
                const optionLabels = ['A', 'B', 'C', 'D'];
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`group relative px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-left transition-all duration-200 transform hover:scale-105 ${
                      isSelected 
                        ? 'border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg' 
                        : 'border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    } ${locked ? 'opacity-60 cursor-not-allowed transform-none' : ''}`}
                    disabled={locked}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm ${
                        isSelected 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}>
                        {optionLabels[idx] || idx + 1}
                      </div>
                      <span className="font-medium text-gray-800 text-sm sm:text-base">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-red-100 p-4 rounded-lg">
              <p className="text-red-700">❌ No options available for this question</p>
            </div>
          )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-sm text-gray-500 text-center sm:text-left">
                {locked ? 'Answer submitted' : 
                 selectedIndex !== null ? 'Answer selected' : 
                 'Choose your answer'}
              </div>
              
              {locked && (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-medium">
                  <CheckCircle size={16} />
                  <span>Submitted!</span>
                </div>
              )}
            </div>
        </div>

        {/* Question Results Modal */}
        {showResults && questionResults && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  questionResults.isCorrect 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {questionResults.isCorrect ? (
                    <CheckCircle size={40} />
                  ) : (
                    <AlertCircle size={40} />
                  )}
                </div>
                
                <h3 className={`text-2xl font-bold mb-2 ${
                  questionResults.isCorrect ? 'text-green-600' : 'text-red-600'
                }`}>
                  {questionResults.isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
                </h3>
                
                <div className="text-3xl font-bold text-blue-600 mb-4">
                  +{questionResults.points} points
                </div>
                
                <SafeHTML content={questionResults.explanation} className="text-gray-600 mb-4" />
                
                {nextQuestionCountdown !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <Clock size={20} />
                      <span className="font-semibold">
                        {nextQuestionCountdown > 0 
                          ? `Câu hỏi tiếp theo trong ${nextQuestionCountdown} giây...`
                          : "Đang chờ người chơi khác..."
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default MultiplayerQuiz;

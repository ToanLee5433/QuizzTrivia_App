import React, { useMemo, useRef, useState, useEffect } from 'react';
import { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

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
  settings?: {
    timePerQuestion?: number;
  };
  quiz?: {
    questions: Question[];
  };
  players?: any[];
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
  const [currentQuestionAnswers, setCurrentQuestionAnswers] = useState<{[playerId: string]: {answer: number, timeSpent: number, isCorrect: boolean, points: number}}>({});
  
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

  // Real-time Firestore listener (optimized - only depends on roomId)
  useEffect(() => {
    if (!roomData?.id) return;

    console.log('🔄 Setting up real-time listener for room:', roomData.id);
    const roomRef = doc(db, 'multiplayer_rooms', roomData.id);
    
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as RoomData;
        console.log('🔥 Firestore update received:', {
          status: data.status,
          phase: data.gameData?.phase,
          currentQuestionIndex: data.gameData?.currentQuestionIndex,
          questionsCount: data.gameData?.questions?.length || 0,
          hasGameData: !!data.gameData
        });
        
        setRealtimeRoomData(data);
        if (data.gameData) {
          setRealtimeGameData(data.gameData as GameData);
        }
        
        // Handle different game phases
        if (data.status === 'starting') {
          // Game is starting - calculate countdown from server time
          if (data.gameStartAt) {
            const startTime = new Date(data.gameStartAt.seconds * 1000);
            const now = new Date();
            const secondsLeft = Math.max(0, Math.ceil((startTime.getTime() - now.getTime()) / 1000));
            
            if (secondsLeft > 0) {
              setGameStartCountdown(secondsLeft);
              console.log(`🚀 Game starting countdown: ${secondsLeft} seconds (synced)`);
            } else {
              setGameStartCountdown(0);
            }
          } else {
            // Fallback if no timestamp
            setGameStartCountdown(5);
            console.log('🚀 Game starting countdown: 5 seconds (fallback)');
          }
        }
        
        // Handle question timing with server sync
        if (data.gameData?.questionEndAt && data.gameData?.phase === 'question') {
          const endTime = new Date(data.gameData.questionEndAt.seconds * 1000);
          const now = new Date();
          const secondsLeft = Math.max(0, Math.ceil((endTime.getTime() - now.getTime()) / 1000));
          
          if (secondsLeft > 0) {
            console.log(`⏱️ Synced question timer: ${secondsLeft} seconds left`);
            setQuestionTimeLeft(secondsLeft);
            setTimeLeft(secondsLeft);
          }
        }
        
        // Detect question change using ref comparison
        const newIndex = data.gameData?.currentQuestionIndex ?? 0;
        if (newIndex !== previousQuestionIndexRef.current) {
          console.log('📝 Question changed via Firestore sync:', previousQuestionIndexRef.current, '->', newIndex);
          previousQuestionIndexRef.current = newIndex;
          
          // Reset UI state for new question
          setSelectedIndex(null);
          setLocked(false);
          setShowResults(false);
          setQuestionResults(null);
          setTimeLeft(timePerQuestion);
          
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
            console.log(`⏱️ Synced results countdown: ${secondsLeft} seconds until next question`);
            setShowResults(true);
            setNextQuestionCountdown(secondsLeft);
          }
        }
        
        // Handle game finished
        if (data.gameData?.phase === 'finished') {
          console.log('🏁 Game finished - showing final results');
          setShowResults(true);
          setNextQuestionCountdown(null);
        }
      }
    }, (error) => {
      console.error('❌ Firestore listener error:', error);
    });

    // Cleanup function
    return () => {
      console.log('🔄 Cleaning up real-time listener');
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
  }, [roomData?.id]); // Only depend on roomId

  // Game start countdown effect
  useEffect(() => {
    if (gameStartCountdown !== null && gameStartCountdown > 0) {
      gameStartRef.current = window.setTimeout(() => {
        setGameStartCountdown(prev => {
          const newCount = (prev ?? 0) - 1;
          if (newCount === 0) {
            console.log('🎮 Game starting now!');
          }
          return newCount;
        });
      }, 1000);
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
          if (newTime === 0) {
            console.log('⏰ Question time expired!');
          }
          return newTime;
        });
      }, 1000);
      
      return () => window.clearTimeout(timer);
    }
  }, [questionTimeLeft, realtimeGameData?.phase]);

  // Get current game phase from room data
  const currentGamePhase = realtimeGameData?.phase || gamePhase;
  const currentRoomStatus = realtimeRoomData?.status || roomStatus;

  // Convert quiz format from Firestore to multiplayer format (using index-based answers)
  const processedQuestions = useMemo((): ProcessedQuestion[] => {
    const rawQuestions = currentGameData?.questions || [];
    
    return rawQuestions.map((q: Question): ProcessedQuestion => {
      let options: string[] = [];
      let correctIndex = 0;
      
      if (q.answers && Array.isArray(q.answers)) {
        // Firestore format: answers array with isCorrect flags
        options = q.answers.map(a => a.text);
        correctIndex = q.answers.findIndex(a => a.isCorrect);
        // Normalize -1 to 0 if no correct answer found
        if (correctIndex === -1) correctIndex = 0;
      } else if (q.options && Array.isArray(q.options)) {
        // Multiplayer format: options array with separate correct index
        options = q.options;
        correctIndex = 0; // Default to first option if no correct specified
      }
      
      return {
        id: q.id,
        title: q.text || q.title || 'No question text',
        options,
        correct: correctIndex,
        type: q.type,
        points: q.points,
        explanation: `Correct answer: ${options[correctIndex] || 'N/A'}`
      };
    });
  }, [currentGameData?.questions]);

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

  // Check if we have real quiz data
  const hasRealQuizData = processedQuestions.length > 0;
  
  if (!hasRealQuizData) {
    console.error('❌ NO REAL QUIZ DATA AVAILABLE - Quiz not loaded properly!');
  }

  // Debug logging (environment-aware)
  const isDevMode = import.meta.env?.DEV || import.meta.env?.NODE_ENV === 'development';
  
  if (isDevMode) {
    console.log('🎮 MultiplayerQuiz Debug:', {
      currentQuestionIndex,
      questionsCount: processedQuestions.length,
      question: finalQuestion,
      hasRealData: hasRealQuizData,
      timePerQuestion,
      timeLeft
    });
  }

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
    if (timeLeft <= 0 && !locked && selectedIndex !== null) {
      handleSubmit();
    }
  }, [timeLeft, locked, selectedIndex]);

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
    
    if (isDevMode) {
      console.log('✅ Answer selected (index):', answerIndex);
    }
  };
  
  const handleSubmit = async (answerIndex?: number) => {
    const indexToSubmit = answerIndex !== undefined ? answerIndex : selectedIndex;
    if (locked || indexToSubmit === null) return;
    setLocked(true);
    
    if (!multiplayerService || !currentRoomData?.id || !finalQuestion?.id || !currentUser?.uid) {
      console.warn('Cannot submit answer - missing data:', { 
        hasService: !!multiplayerService, 
        roomId: currentRoomData?.id, 
        questionId: finalQuestion?.id,
        userId: currentUser?.uid
      });
      return;
    }
    
    try {
      const timeSpent = timePerQuestion - timeLeft;
      const isCorrect = indexToSubmit === finalQuestion.correct;
      const points = isCorrect ? Math.max(10, Math.floor(100 - (timeSpent * 2))) : 0; // 10-100 points based on speed
      
      if (isDevMode) {
        console.log('📝 Submitting answer:', { 
          questionId: finalQuestion.id, 
          selectedIndex: indexToSubmit, 
          timeSpent,
          isCorrect,
          points
        });
      }
      
      // Update client-side scores immediately for fast UI response
      setPlayerScores(prev => ({
        ...prev,
        [currentUser.uid]: (prev[currentUser.uid] || 0) + points
      }));
      
      // Store current question answer for real-time leaderboard during results
      setCurrentQuestionAnswers(prev => ({
        ...prev,
        [currentUser.uid]: {
          answer: indexToSubmit,
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
            selectedAnswer: indexToSubmit,
            isCorrect,
            timeSpent,
            points
          }
        ]
      }));
      
      // Submit to server (for sync with other players)
      await multiplayerService.submitAnswer(currentRoomData.id, finalQuestion.id, indexToSubmit, timeSpent);
      
      // Show results after 1 second
      setTimeout(() => {
        setQuestionResults({
          isCorrect,
          correctAnswer: finalQuestion.correct,
          selectedAnswer: indexToSubmit,
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
        {currentRoomStatus === 'starting' && gameStartCountdown !== null && gameStartCountdown > 0 && (
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
                  <p className="text-xs text-gray-500 mt-2">{questionResults.explanation}</p>
                )}
              </div>
            </div>

            {/* Live Leaderboard */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-3 text-center">Current Standings</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(playerScores)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5) // Show top 5
                  .map(([playerId, score], index) => {
                    const player = currentRoomData?.players?.find((p: any) => p.id === playerId);
                    const isCurrentUser = playerId === currentUser?.uid;
                    const position = index + 1;
                    const trophy = position === 1 ? '👑' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
                    
                    return (
                      <div 
                        key={playerId} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isCurrentUser ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{trophy}</span>
                          <div>
                            <div className={`font-medium text-sm ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
                              #{position} {player?.username || player?.name || 'Player'}
                              {isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {playerAnswers[playerId]?.filter(a => a.isCorrect).length || 0} correct
                            </div>
                          </div>
                        </div>
                        <div className={`text-right ${isCurrentUser ? 'text-blue-700' : 'text-gray-700'}`}>
                          <div className="font-bold text-sm">{score}</div>
                          <div className="text-xs text-gray-500">pts</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {nextQuestionCountdown !== null && (
              <div className="mt-4 text-center">
                <p className="text-gray-600">Next question in: <span className="font-bold text-blue-600">{nextQuestionCountdown}s</span></p>
              </div>
            )}
          </div>
        )}

        {/* Final Results Phase */}
        {currentGamePhase === 'finished' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">🏆 Game Finished!</h2>
            
            {/* Final Leaderboard */}
            <div className="max-w-2xl mx-auto mb-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Final Leaderboard</h3>
              <div className="space-y-3">
                {Object.entries(playerScores)
                  .sort(([,a], [,b]) => b - a)
                  .map(([playerId, score], index) => {
                    const player = currentRoomData?.players?.find((p: any) => p.id === playerId);
                    const isCurrentUser = playerId === currentUser?.uid;
                    const position = index + 1;
                    const trophy = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
                    const playerAnswerHistory = playerAnswers[playerId] || [];
                    const correctAnswers = playerAnswerHistory.filter(a => a.isCorrect).length;
                    const totalQuestions = processedQuestions.length;
                    
                    return (
                      <div 
                        key={playerId} 
                        className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                          isCurrentUser 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{trophy}</span>
                          <div className="text-left">
                            <div className={`font-semibold ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
                              #{position} {player?.username || player?.name || 'Player'}
                              {isCurrentUser && <span className="ml-2 text-sm">(You)</span>}
                            </div>
                            <div className="text-sm text-gray-600">
                              {correctAnswers}/{totalQuestions} correct • Accuracy: {totalQuestions > 0 ? Math.round((correctAnswers/totalQuestions)*100) : 0}%
                            </div>
                          </div>
                        </div>
                        <div className={`text-right ${isCurrentUser ? 'text-blue-700' : 'text-gray-700'}`}>
                          <div className="text-xl font-bold">{score}</div>
                          <div className="text-sm text-gray-500">points</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {/* Game Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-800">{processedQuestions.length}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-800">{Object.keys(playerScores).length}</div>
                <div className="text-sm text-gray-600">Players</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-800">{playerAnswers[currentUser?.uid || '']?.filter(a => a.isCorrect).length || 0}</div>
                <div className="text-sm text-gray-600">Your Correct</div>
              </div>
            </div>
            
            <p className="text-lg text-gray-600 mb-4">Thanks for playing!</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => window.location.href = '/multiplayer'}
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Play Again
              </button>
              <button 
                onClick={() => window.location.href = '/profile'}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                View Profile
              </button>
            </div>
          </div>
        )}

        {/* Regular Game UI - only show during question/waiting phases */}
        {(!currentRoomStatus || currentRoomStatus === 'playing') && currentGamePhase !== 'finished' && gameStartCountdown === null && (
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
                  <span>Answer Submitted!</span>
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
                <span className="font-medium">Hurry up! Only {timeLeft} seconds left!</span>
              </div>
            </div>
          )}
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          {/* Debug info */}
          {isDevMode && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
              <strong>🐛 Question Debug:</strong><br/>
              Question ID: {finalQuestion?.id || 'None'}<br/>
              Question Title: {finalQuestion?.title || 'None'}<br/>
              Options Count: {finalQuestion?.options?.length || 0}<br/>
              Question Index: {currentQuestionIndex}/{processedQuestions.length}<br/>
              <strong>Data Source:</strong> {currentGameData?.questions?.length ? 'GameData (Firestore)' : 'No Data'}<br/>
              <strong>Real Questions Available:</strong> {processedQuestions.length}
            </div>
          )}
          
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
                    onClick={() => {
                      if (!locked) {
                        handleSelect(idx);
                        // Auto-submit when option is selected
                        setTimeout(() => handleSubmit(idx), 100);
                      }
                    }}
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
              {locked ? 'Answer submitted! Waiting for results...' : 
               selectedIndex !== null ? 'Answer selected - Click Submit when ready' : 
               'Choose your answer first'}
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
                
                <p className="text-gray-600 mb-4">
                  {questionResults.explanation}
                </p>
                
                {nextQuestionCountdown !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <Clock size={20} />
                      <span className="font-semibold">
                        Next question in {nextQuestionCountdown} seconds...
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

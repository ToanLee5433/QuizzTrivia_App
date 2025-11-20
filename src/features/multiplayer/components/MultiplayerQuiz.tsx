import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MultiplayerServiceInterface } from '../services/enhancedMultiplayerService';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { toast } from 'react-toastify';
import SafeHTML from '../../../shared/components/ui/SafeHTML';
import { logger } from '../utils/logger';
import gameStateService, { GameStateData, LeaderboardEntry } from '../services/gameStateService';
import QuestionTimer from './QuestionTimer';
import LiveLeaderboard from './LiveLeaderboard';
import HostControlPanel from './HostControlPanel';
import AnswerResultAnimation from './AnswerResultAnimation';
import SoundSettings from './SoundSettings';
import { GameAnnouncements } from './GameAnnouncements';
import { AnswerOptions } from './AnswerOptions';
import soundService from '../services/soundService';
import { useHostTransfer } from '../hooks/useHostTransfer';
import { useReconnection } from '../hooks/useReconnection';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import PowerUpsPanel from './PowerUpsPanel';
import powerUpsService, { PowerUpType } from '../services/powerUpsService';


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

interface Player {
  id: string;
  username: string;
  name?: string; // Alias for username
  displayName?: string; // Alternative name field
  isReady: boolean;
  isOnline: boolean;
  joinedAt: Date;
}

interface PlayerAnswer {
  questionId?: string;
  selectedAnswer: number;
  answer?: string;
  timeToAnswer: number;
  timeSpent?: number;
  pointsEarned: number;
  points?: number; // Alias for pointsEarned
  isCorrect: boolean;
  timestamp: number;
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
  players?: Player[];
  questionAnswers?: {
    [questionIndex: number]: {
      [playerId: string]: PlayerAnswer;
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
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionResults, setQuestionResults] = useState<QuestionResults | null>(null);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState<number | null>(null);
  const [gameStartCountdown, setGameStartCountdown] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(0);
  const [realtimeGameData, setRealtimeGameData] = useState<GameData | null>(gameData);
  const [realtimeRoomData, setRealtimeRoomData] = useState<RoomData | null>(roomData);
  
  // Real-time game state sync
  const [syncedGameState, setSyncedGameState] = useState<GameStateData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [previousRank, setPreviousRank] = useState<number>(0);
  
  // Client-side game state for fast performance
  const [playerScores, setPlayerScores] = useState<{[playerId: string]: number}>({});
  const [playerAnswers, setPlayerAnswers] = useState<{[playerId: string]: PlayerAnswer[]}>({});
  const [currentQuestionAnswers, setCurrentQuestionAnswers] = useState<{[playerId: string]: PlayerAnswer}>({});

  const [waitingForOthers, setWaitingForOthers] = useState<boolean>(false);
  
  // Power-ups state
  const [, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState<number>(1);
  const [freezeTimeActive, setFreezeTimeActive] = useState<boolean>(false);
  
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const gameStartRef = useRef<number | null>(null);
  const previousQuestionIndexRef = useRef<number>(-1);
  const freezeTimerRef = useRef<number | null>(null);

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
  const currentRoomStatus = realtimeRoomData?.status || roomStatus;
  const currentGamePhase = realtimeGameData?.phase || gamePhase;
  
  // ✅ Production Features: Auto host transfer, reconnection, performance monitoring
  useHostTransfer(roomData?.id || '', currentRoomData?.quiz?.id || '', currentRoomStatus === 'playing');
  const { isReconnecting } = useReconnection(roomData?.id || '', currentUser?.uid || '', currentUserName || '', true);
  usePerformanceMonitoring(roomData?.id || '', currentUser?.uid || '');

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
  }, [roomData?.id, gameStartCountdown, timePerQuestion]);

  // Listen to real-time game state sync
  useEffect(() => {
    if (!roomData?.id) return;

    const unsubscribe = gameStateService.listenToGameState(roomData.id, (state) => {
      setSyncedGameState(state);
      logger.info('[MultiplayerQuiz] Game state updated', { state });
    });

    return () => unsubscribe();
  }, [roomData?.id]);

  // Listen to real-time leaderboard
  useEffect(() => {
    if (!roomData?.id) return;

    const unsubscribe = gameStateService.listenToLeaderboard(roomData.id, (entries) => {
      setLeaderboard(entries);
      logger.info('[MultiplayerQuiz] Leaderboard updated', { count: entries.length });
    });

    return () => unsubscribe();
  }, [roomData?.id]);

  // Sync all players' scores and answers from server data
  useEffect(() => {
    if (!currentRoomData?.questionAnswers) return;

    const serverPlayerScores: {[playerId: string]: number} = {};
    const serverPlayerAnswers: {[playerId: string]: PlayerAnswer[]} = {};

    // Calculate scores and answers from server data for ALL players
    Object.values(currentRoomData.questionAnswers).forEach(questionData => {
      Object.entries(questionData).forEach(([playerId, answerData]: [string, PlayerAnswer]) => {
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
          timeToAnswer: answerData.timeToAnswer || answerData.timeSpent || 0,
          pointsEarned: answerData.pointsEarned || 0,
          points: answerData.pointsEarned || 0,
          timestamp: answerData.timestamp || Date.now()
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
      // Countdown finished - trigger game start if room still in 'starting' status
      setGameStartCountdown(null);
      
      // CRITICAL FIX: If room is still 'starting' after countdown, force start the game
      // This handles cases where the host's setTimeout failed (refresh, disconnect, etc.)
      if (realtimeRoomData?.status === 'starting' && realtimeRoomData?.id && multiplayerService) {
        logger.info('Countdown finished but room still starting - triggering game start');
        multiplayerService.startGame(realtimeRoomData.id).catch((error: Error) => {
          logger.error('Failed to start game after countdown', error);
          toast.error('Failed to start game. Please try again.');
        });
      }
    }
    
    return () => {
      if (gameStartRef.current) {
        window.clearTimeout(gameStartRef.current);
        gameStartRef.current = null;
      }
    };
  }, [gameStartCountdown, realtimeRoomData?.status, realtimeRoomData?.id, multiplayerService]);

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
  // (Already defined above with hooks)

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

  // Initialize game state when game starts (host only)
  useEffect(() => {
    if (!roomData?.id || !currentUser?.uid || !currentRoomData) return;
    
    // Check if this user is the host and game just started
    const isHost = currentRoomData.players?.find((p: Player) => p.id === currentUser.uid)?.isReady === true;
    const isGameStarting = currentRoomStatus === 'playing' && currentGamePhase === 'question';
    
    if (isHost && isGameStarting && processedQuestions.length > 0 && !syncedGameState) {
      logger.info('[MultiplayerQuiz] Host initializing game state', {
        roomId: roomData.id,
        hostId: currentUser.uid,
        totalQuestions: processedQuestions.length,
        timePerQuestion,
      });
      
      gameStateService.initializeGameState(
        roomData.id,
        currentUser.uid,
        processedQuestions.length,
        timePerQuestion
      ).then(() => {
        logger.info('[MultiplayerQuiz] Game state initialized successfully');
      }).catch((error: Error) => {
        logger.error('[MultiplayerQuiz] Failed to initialize game state', error);
      });
    }
  }, [roomData?.id, currentUser?.uid, currentRoomStatus, currentGamePhase, processedQuestions.length, syncedGameState, currentRoomData, timePerQuestion]);

  useEffect(() => {
    const saveFinalResults = async () => {
      if (currentGamePhase === 'finished' && currentUser?.uid && currentRoomData?.id) {
        try {
          const myAnswers = playerAnswers[currentUser.uid] || [];
          const myScore = playerScores[currentUser.uid] || 0;
          const correctAnswers = myAnswers.filter(a => a.isCorrect).length;
          const totalQuestions = processedQuestions.length;
          const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

          // Save to quizResults collection (match Firestore rules)
          await addDoc(collection(db, 'quizResults'), {
            userId: currentUser.uid,
            quizId: currentRoomData.quiz?.id || currentRoomData.id,
            quizTitle: currentRoomData.quiz?.title || 'Multiplayer Quiz',
            mode: 'multiplayer',
            roomId: currentRoomData.id,
            score: myScore,
            correctAnswers,
            totalQuestions,
            percentage: Math.round(percentage * 10) / 10,
            timeSpent: myAnswers.reduce<number>((sum, a) => sum + (a.timeSpent || 0), 0),
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

          logger.success('Multiplayer results saved successfully');
        } catch (error) {
          logger.error('Failed to save multiplayer results', error);
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
  const finalQuestion: ProcessedQuestion = useMemo(() => currentQuestion || {
    id: 'error',
    title: 'No question available',
    options: ['Please wait...'],
    correct: 0,
    explanation: 'Question loading...'
  }, [currentQuestion]);

  // Countdown timer (optimized - minimal dependencies, respects freeze-time)
  useEffect(() => {
    if (locked || showResults || timeLeft <= 0 || freezeTimeActive) return;
    
    timerRef.current = window.setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, locked, showResults, freezeTimeActive]);

  // Power-up handler
  const handlePowerUpUsed = useCallback((type: PowerUpType) => {
    setActivePowerUp(type);
    
    switch (type) {
      case '50-50':
        // Eliminate 2 wrong answers
        const correctAnswer = finalQuestion.correct;
        const eliminated = powerUpsService.apply5050(correctAnswer, finalQuestion.options.length);
        setEliminatedOptions(eliminated);
        toast.info(t('multiplayer.powerUps.5050') + ' activated!', { autoClose: 2000 });
        soundService.play('powerup');
        break;
        
      case 'x2-score':
        // Double score for this question
        setScoreMultiplier(2);
        toast.info(t('multiplayer.powerUps.x2Score') + ' activated!', { autoClose: 2000 });
        soundService.play('powerup');
        break;
        
      case 'freeze-time':
        // Freeze timer for 5 seconds
        setFreezeTimeActive(true);
        toast.info(t('multiplayer.powerUps.freezeTime') + ' activated!', { autoClose: 2000 });
        soundService.play('powerup');
        
        // Unfreeze after 5 seconds
        freezeTimerRef.current = window.setTimeout(() => {
          setFreezeTimeActive(false);
        }, 5000);
        break;
    }
  }, [finalQuestion, t]);
  
  // Reset power-up effects when question changes
  useEffect(() => {
    setActivePowerUp(null);
    setEliminatedOptions([]);
    setScoreMultiplier(1);
    setFreezeTimeActive(false);
    
    if (freezeTimerRef.current) {
      window.clearTimeout(freezeTimerRef.current);
      freezeTimerRef.current = null;
    }
  }, [currentQuestionIndex]);

  // Submit answer function - defined before useEffect that uses it
  const handleSubmit = useCallback(async (answerIndex?: number) => {
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
      
      // Declare variables outside try-catch for scope access
      let isCorrect = false;
      let points = 0;
      
      // ✅ SERVER-SIDE VALIDATION: Call Cloud Function to validate answer and calculate score
      // This prevents client-side score manipulation and cheating
      const validateAnswerFunction = import('firebase/functions').then(({ getFunctions, httpsCallable }) => {
        const functions = getFunctions();
        return httpsCallable(functions, 'validateAnswer');
      });
      
      const validateAnswer = await validateAnswerFunction;
      
      try {
        const result = await validateAnswer({
          roomId: currentRoomData.id,
          questionIndex: currentQuestionIndex,
          answer: indexToSubmit ?? -1,
          clientTimestamp: Date.now(),
          scoreMultiplier: scoreMultiplier // Send power-up multiplier to server
        });
        
        const validationData = result.data as {
          success: boolean;
          isCorrect: boolean;
          points: number;
          correctAnswer: number;
          timeToAnswer: number;
        };
        
        isCorrect = validationData.isCorrect;
        points = Math.floor(validationData.points * scoreMultiplier); // Apply power-up multiplier
        
        // Update client-side scores with server-validated points
        setPlayerScores(prev => ({
          ...prev,
          [currentUser.uid]: (prev[currentUser.uid] || 0) + points
        }));
        
        // Store current question answer for real-time leaderboard during results
        setCurrentQuestionAnswers(prev => ({
          ...prev,
          [currentUser.uid]: {
            selectedAnswer: indexToSubmit ?? -1,
            answer: `${indexToSubmit ?? -1}`,
            timeToAnswer: timeSpent,
            timeSpent,
            isCorrect,
            pointsEarned: points,
            points,
            timestamp: Date.now()
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
              answer: `${indexToSubmit ?? -1}`,
              timeToAnswer: timeSpent,
              timeSpent,
              isCorrect,
              pointsEarned: points,
              points,
              timestamp: Date.now()
            }
          ]
        }));
        
        logger.info('Answer validated by server', { isCorrect, points });
        
      } catch (serverError: any) {
        // Fallback to client-side if server validation fails (network issues)
        logger.warn('Server validation failed, using client fallback', serverError);
        
        isCorrect = indexToSubmit !== null ? indexToSubmit === finalQuestion.correct : false;
        const basePoints = isCorrect ? Math.max(10, Math.floor(100 - (timeSpent * 2))) : 0;
        points = Math.floor(basePoints * scoreMultiplier);
        
        // Update client-side scores as fallback
        setPlayerScores(prev => ({
          ...prev,
          [currentUser.uid]: (prev[currentUser.uid] || 0) + points
        }));
        
        setCurrentQuestionAnswers(prev => ({
          ...prev,
          [currentUser.uid]: {
            selectedAnswer: indexToSubmit ?? -1,
            answer: `${indexToSubmit ?? -1}`,
            timeToAnswer: timeSpent,
            timeSpent,
            isCorrect,
            pointsEarned: points,
            points,
            timestamp: Date.now()
          }
        }));
        
        setPlayerAnswers(prev => ({
          ...prev,
          [currentUser.uid]: [
            ...(prev[currentUser.uid] || []),
            {
              questionId: finalQuestion.id,
              selectedAnswer: indexToSubmit ?? -1,
              answer: `${indexToSubmit ?? -1}`,
              timeToAnswer: timeSpent,
              timeSpent,
              isCorrect,
              pointsEarned: points,
              points,
              timestamp: Date.now()
            }
          ]
        }));
      }
      
      // Submit to server (for sync with other players) - only if answer was selected
      if (indexToSubmit !== null) {
        await multiplayerService.submitAnswer(currentRoomData.id, finalQuestion.id, indexToSubmit, timeSpent);
      }
      
      // Submit to game state service for real-time sync
      if (roomData?.id) {
        await gameStateService.submitAnswer(
          roomData.id,
          currentQuestionIndex,
          currentUser.uid,
          indexToSubmit ?? -1,
          isCorrect,
          timeSpent,
          points
        );
        
        // Update leaderboard with new score
        const currentLeaderboard = [...leaderboard];
        const userEntry = currentLeaderboard.find(e => e.userId === currentUser.uid);
        
        if (userEntry) {
          userEntry.score += points;
          userEntry.correctAnswers += isCorrect ? 1 : 0;
          if (isCorrect) {
            userEntry.streak = (userEntry.streak || 0) + 1;
          } else {
            userEntry.streak = 0;
          }
        } else {
          currentLeaderboard.push({
            userId: currentUser.uid,
            username: currentUser.displayName || currentUserName,
            score: points,
            correctAnswers: isCorrect ? 1 : 0,
            rank: 0,
            streak: isCorrect ? 1 : 0,
            avatar: currentUser.photoURL || undefined,
          });
        }
        
        // Sort and update ranks
        currentLeaderboard.sort((a, b) => b.score - a.score);
        currentLeaderboard.forEach((entry, idx) => {
          entry.rank = idx + 1;
        });
        
        await gameStateService.updateLeaderboard(roomData.id, currentLeaderboard);
        logger.info('[MultiplayerQuiz] Leaderboard updated after answer submission', { 
          userId: currentUser.uid, 
          points, 
          isCorrect,
          newScore: userEntry ? userEntry.score : points 
        });
      }
      
      // Set waiting state
      setWaitingForOthers(true);
      
      // Play sound effect
      soundService.play(isCorrect ? 'correct' : 'wrong');
      
      // Show animation first
      const userRankBefore = leaderboard.findIndex(e => e.userId === currentUser.uid);
      setShowResultAnimation(true);
      
      // Show results after animation (2 seconds)
      setTimeout(() => {
        setShowResultAnimation(false);
        setQuestionResults({
          isCorrect,
          correctAnswer: finalQuestion.correct,
          selectedAnswer: indexToSubmit ?? -1,
          points,
          explanation: finalQuestion.explanation || ''
        });
        setShowResults(true);
        
        // Calculate rank change
        const userRankAfter = leaderboard.findIndex(e => e.userId === currentUser.uid);
        setPreviousRank(userRankBefore - userRankAfter);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      setLocked(false); // Allow retry on error
    }
  }, [selectedIndex, locked, multiplayerService, currentRoomData, finalQuestion, currentUser, timePerQuestion, timeLeft]);

  // Handle time up
  useEffect(() => {
    if (timeLeft <= 0 && !locked) {
      // Auto-submit with selected answer, or undefined if no selection
      handleSubmit(selectedIndex ?? undefined);
    }
  }, [timeLeft, locked, handleSubmit, selectedIndex]);

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

  // Check if current user is host
  const isHost = currentRoomData?.players?.some((p: Player) => p.id === currentUser?.uid && p.isReady);

  return (
    <>
      {/* ✅ Accessibility: Screen reader announcements */}
      <GameAnnouncements
        gameState={syncedGameState}
        roomId={roomData?.id || ''}
      />
      
      {isReconnecting && (
        <div className="fixed top-20 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Reconnecting...</span>
        </div>
      )}
      
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 p-2 sm:p-4 lg:p-6">
      <div className="flex gap-4 max-w-7xl mx-auto">
        {/* Main Content */}
        <div className="flex-1 max-w-4xl">
        
        {/* Host Control Panel */}
        {isHost && roomData?.id && currentRoomStatus === 'playing' && (
          <HostControlPanel
            roomId={roomData.id}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={processedQuestions.length}
            isHost={isHost}
            timePerQuestion={timePerQuestion}
          />
        )}
        
        {/* Sound Settings */}
        {currentRoomStatus === 'waiting' && (
          <SoundSettings />
        )}
        
        {/* Game Start Countdown Phase */}
        {currentRoomStatus === 'starting' && gameStartCountdown !== null && gameStartCountdown >= 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('multiplayer.game.startingSoon')}</h2>
            <div className="text-6xl font-bold text-purple-600 mb-4">{gameStartCountdown}</div>
            <p className="text-gray-600">{t('multiplayer.game.getReady')}</p>
          </div>
        )}

        {/* Question Results Phase */}
        {currentGamePhase === 'results' && questionResults && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">{t('multiplayer.game.questionResults')}</h3>
            
            {/* Your Result */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-center">
                <div className={`text-2xl font-bold mb-2 ${questionResults.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {questionResults.isCorrect ? t('multiplayer.game.correct') : t('multiplayer.game.wrong')}
                </div>
                <div className="text-lg text-gray-700 mb-2">
                  {t('multiplayer.game.youEarned')} <span className="font-bold text-blue-600">+{questionResults.points}</span> {t('multiplayer.game.points')}
                </div>
                <div className="text-sm text-gray-600">
                  {t('multiplayer.game.correctAnswer')} <span className="font-semibold">{finalQuestion.options?.[questionResults.correctAnswer] || 'N/A'}</span>
                </div>
                {questionResults.explanation && (
                  <SafeHTML content={questionResults.explanation} className="text-xs text-gray-500 mt-2" />
                )}
              </div>
            </div>

            {/* Live Leaderboard */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-3 text-center">{t('multiplayer.game.currentStandings')}</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(currentRoomData?.players || [])
                  .map((player: Player) => ({
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
                                ? (currentUserName || player?.username || player?.name || t('common.you', 'You'))
                                : (player?.username || player?.name || player?.displayName || `Player ${position}`)
                              }
                              {isCurrentUser && <span className="ml-1 text-xs">({t('common.you', 'You')})</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {t('multiplayer.game.correctCount', '{{count}} đúng', { count: correctAnswersCount })} • {t('multiplayer.game.pointsCount', '{{points}} điểm', { points: player.score })}
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
                          <div className="text-xs text-gray-500">{t('multiplayer.game.pts')}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {nextQuestionCountdown !== null && (
              <div className="mt-4 text-center">
                {nextQuestionCountdown > 0 ? (
                  <p className="text-gray-600">{t('multiplayer.game.nextQuestionIn')} <span className="font-bold text-blue-600">{t('multiplayer.secondsShort', { value: nextQuestionCountdown })}</span></p>
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
                  {t('multiplayer.game.gameComplete', 'GAME COMPLETE!')}
                </h1>
                <p className="text-xl text-blue-200">{t('multiplayer.game.amazingPerformance')}</p>
              </div>

              {/* Champion Podium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {Object.entries(playerScores)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([playerId, score], index) => {
                    const player = currentRoomData?.players?.find((p: Player) => p.id === playerId);
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
                              {isCurrentUser && <div className="text-sm text-blue-600 font-medium">({t('multiplayer.game.you')})</div>}
                            </div>
                            
                            {/* Score Display */}
                            <div className="bg-white rounded-xl p-4 mb-3 shadow-inner">
                              <div className="text-3xl font-black text-gray-800">{score}</div>
                              <div className="text-sm text-gray-600 font-medium">{t('common.points').toUpperCase()}</div>
                            </div>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-white rounded-lg p-2">
                                <div className="font-bold text-green-600">{correctAnswers}</div>
                                <div className="text-gray-600">{t('common.correct')}</div>
                              </div>
                              <div className="bg-white rounded-lg p-2">
                                <div className="font-bold text-blue-600">{accuracy}%</div>
                                <div className="text-gray-600">{t('multiplayer.game.accuracy')}</div>
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
                  🏅 {t('multiplayer.game.completeRankings').toUpperCase()}
                </h2>
                
                <div className="space-y-3">
                  {Object.entries(playerScores)
                    .sort(([,a], [,b]) => b - a)
                    .map(([playerId, score], index) => {
                      const player = currentRoomData?.players?.find((p: Player) => p.id === playerId);
                      const isCurrentUser = playerId === currentUser?.uid;
                      const position = index + 1;
                      const playerAnswerHistory = playerAnswers[playerId] || [];
                      const correctAnswers = playerAnswerHistory.filter(a => a.isCorrect).length;
                      const totalQuestions = processedQuestions.length;
                      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers/totalQuestions)*100) : 0;
                      const avgTimePerQuestion = playerAnswerHistory.length > 0 ? 
                        Math.round(playerAnswerHistory.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / playerAnswerHistory.length) : 0;
                      
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
                                  {isCurrentUser && <span className="ml-2 text-sm bg-blue-500 text-white px-2 py-1 rounded-full">{t('multiplayer.game.you').toUpperCase()}</span>}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {t('multiplayer.game.playerStats', { correct: correctAnswers, total: totalQuestions, accuracy, avgTime: avgTimePerQuestion })}
                                </div>
                              </div>
                            </div>
                            
                            {/* Right: Score */}
                            <div className="text-right">
                              <div className={`text-3xl font-black ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>
                                {score}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">{t('common.points').toUpperCase()}</div>
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
                  <div className="text-sm text-gray-600 font-medium">{t('multiplayer.game.totalQuestions')}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-gray-800">{Object.keys(playerScores).length}</div>
                  <div className="text-sm text-gray-600 font-medium">{t('multiplayer.game.players')}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {playerAnswers[currentUser?.uid || '']?.filter(a => a.isCorrect).length || 0}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{t('multiplayer.game.yourCorrect')}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {playerScores[currentUser?.uid || ''] || 0}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{t('multiplayer.game.yourScore')}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="text-center">
                <p className="text-xl text-blue-200 mb-6">{t('multiplayer.game.thanksForPlaying')} 🎉</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => window.location.href = '/multiplayer'}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-2xl hover:shadow-purple-500/25"
                  >
                    🎮 {t('multiplayer.game.playAgain')}
                  </button>
                  <button 
                    onClick={() => window.location.href = '/profile'}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-gray-700 hover:to-gray-800 transform hover:scale-105 transition-all duration-200 shadow-2xl"
                  >
                    👤 {t('multiplayer.game.viewProfile')}
                  </button>
                  <button 
                    onClick={() => window.location.href = '/leaderboard'}
                    className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-green-700 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
                  >
                    🏆 {t('multiplayer.game.globalLeaderboard')}
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
                {t('multiplayer.game.questionProgress', { current: currentQuestionIndex + 1, total: processedQuestions.length })}
              </div>
              <div className="flex items-center gap-2 text-gray-600 justify-center sm:justify-start">
                <Users size={18} />
                <span className="text-sm sm:text-base">{t('multiplayer.game.playersCount', { count: currentRoomData?.players?.length || 0 })}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              {locked && (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-xl font-medium text-sm">
                  <CheckCircle size={16} />
                  <span>{t('multiplayer.game.submitted')}</span>
                </div>
              )}
              
              {/* Question Timer Component */}
              {syncedGameState?.questionStartTime && syncedGameState?.timeLimit ? (
                <QuestionTimer
                  startTime={syncedGameState.questionStartTime}
                  timeLimit={syncedGameState.timeLimit}
                  onTimeUp={() => {
                    if (!locked) {
                      handleSubmit(selectedIndex ?? undefined);
                    }
                  }}
                  isPaused={locked}
                />
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base ${
                    timeLeft <= 5 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Clock size={16} />
                    <span>{t('multiplayer.secondsShort', { value: timeLeft })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {timeLeft <= 10 && !locked && (
            <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-lg mb-4">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertCircle size={18} />
                <span className="font-medium">{t('multiplayer.game.timeRunningOut')}</span>
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
          
          {/* Power-Ups Panel */}
          {!showResults && currentUser?.uid && currentRoomData?.id && (
            <div className="mb-6">
              <PowerUpsPanel
                roomCode={currentRoomData.id}
                playerId={currentUser.uid}
                currentQuestionIndex={currentQuestionIndex}
                onPowerUpUsed={handlePowerUpUsed}
                disabled={locked}
              />
            </div>
          )}

          {/* Show options if available */}
          {finalQuestion.options && finalQuestion.options.length > 0 ? (
            <AnswerOptions
              options={finalQuestion.options.map((text: string, idx: number) => ({ 
                id: idx, 
                text,
                eliminated: eliminatedOptions.includes(idx) // Fade out eliminated options
              }))}
              selectedAnswer={selectedIndex}
              onSelect={handleSelect}
              disabled={locked || eliminatedOptions.includes(selectedIndex ?? -1)}
              correctAnswer={showResults ? questionResults?.correctAnswer : undefined}
              showResults={showResults}
            />
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
                  <span>{t('multiplayer.game.submitted')}</span>
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
                          ? `${t('multiplayer.game.nextQuestionIn')} ${nextQuestionCountdown} ${t('multiplayer.timer.seconds')}...`
                          : t('multiplayer.game.waitingForOthers')
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
        
        {/* Sidebar - Live Leaderboard */}
        {currentUser?.uid && roomData?.id && (currentRoomStatus === 'playing' || currentGamePhase === 'results') && (
          <div className="hidden lg:block w-80">
            <div className="sticky top-6">
              <LiveLeaderboard 
                roomId={roomData.id} 
                currentUserId={currentUser.uid}
                showTop={5}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Answer Result Animation Overlay */}
      {showResultAnimation && questionResults && (
        <AnswerResultAnimation
          isCorrect={questionResults.isCorrect}
          points={questionResults.points}
          rankChange={previousRank}
          explanation={questionResults.explanation}
          onAnimationComplete={() => setShowResultAnimation(false)}
        />
      )}
    </div>
    </>
  );
};

export default MultiplayerQuiz;

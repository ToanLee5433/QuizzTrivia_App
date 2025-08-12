import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Check, 
  X, 
  Zap,
  Star,
  Crown,
  Target,
  Timer
} from 'lucide-react';

interface MultiplayerQuizProps {
  room: {
    id: string;
    name: string;
    timePerQuestion: number;
    showCorrectAnswers: boolean;
  };
  quiz: {
    id: string;
    title: string;
    questions: Question[];
  };
  players: Player[];
  currentUserId: string;
  onAnswerSubmit: (questionId: string, selectedAnswer: string, timeRemaining: number) => void;
  onQuizComplete: () => void;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  hasAnswered: boolean;
  isReady: boolean;
}

export const MultiplayerQuiz: React.FC<MultiplayerQuizProps> = ({
  room,
  quiz,
  players,
  currentUserId,
  onAnswerSubmit
}) => {
  const [currentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(room.timePerQuestion);
  const [gamePhase] = useState<'question' | 'results' | 'waiting' | 'finished'>('question');

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredPlayersCount = players.filter(p => p.hasAnswered).length;
  const currentPlayer = players.find(p => p.id === currentUserId);

  // Timer effect
  useEffect(() => {
    if (gamePhase === 'question' && timeRemaining > 0 && !hasAnswered) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !hasAnswered && gamePhase === 'question') {
      // Auto-submit when time runs out
      handleAnswerSubmit();
    }
  }, [timeRemaining, hasAnswered, gamePhase]);

  const handleAnswerSubmit = () => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    if (selectedAnswer) {
      onAnswerSubmit(currentQuestion.id, selectedAnswer, timeRemaining);
    }
  };

  const getTimerColor = () => {
    const percentage = (timeRemaining / room.timePerQuestion) * 100;
    if (percentage > 60) return 'text-green-400';
    if (percentage > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTimerBgColor = () => {
    const percentage = (timeRemaining / room.timePerQuestion) * 100;
    if (percentage > 60) return 'from-green-500 to-emerald-600';
    if (percentage > 30) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-red-600';
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (gamePhase === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto p-6">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
            <p className="text-gray-400">{quiz.title}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-center mb-6">Final Leaderboard</h2>
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/30'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30'
                      : index === 2
                      ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-600/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index < 3 ? (
                        <Crown className="w-6 h-6" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-gray-400">Streak: {player.streak}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{player.score}</p>
                    <p className="text-sm text-gray-400">points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-gray-400">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm">{answeredPlayersCount}/{players.length} answered</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">Time Remaining</span>
                </div>
                <span className={`text-2xl font-bold ${getTimerColor()}`}>
                  {timeRemaining}s
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getTimerBgColor()} transition-all duration-1000 ease-linear`}
                  style={{ width: `${(timeRemaining / room.timePerQuestion) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">{currentQuestion.text}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => !hasAnswered && setSelectedAnswer(option)}
                    disabled={hasAnswered}
                    className={`p-4 rounded-xl text-left transition-all ${
                      hasAnswered
                        ? selectedAnswer === option
                          ? option === currentQuestion.correctAnswer
                            ? 'bg-green-500/20 border-2 border-green-400 text-green-400'
                            : 'bg-red-500/20 border-2 border-red-400 text-red-400'
                          : option === currentQuestion.correctAnswer && room.showCorrectAnswers
                          ? 'bg-green-500/20 border-2 border-green-400 text-green-400'
                          : 'bg-white/5 border border-white/10 text-gray-400'
                        : selectedAnswer === option
                        ? 'bg-blue-500/20 border-2 border-blue-400 text-blue-400'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        hasAnswered && selectedAnswer === option
                          ? option === currentQuestion.correctAnswer
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : hasAnswered && option === currentQuestion.correctAnswer && room.showCorrectAnswers
                          ? 'bg-green-500 text-white'
                          : selectedAnswer === option
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1">{option}</span>
                      {hasAnswered && selectedAnswer === option && (
                        option === currentQuestion.correctAnswer ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <X className="w-5 h-5 text-red-400" />
                        )
                      )}
                      {hasAnswered && option === currentQuestion.correctAnswer && selectedAnswer !== option && room.showCorrectAnswers && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedAnswer && !hasAnswered && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleAnswerSubmit}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center gap-2"
                  >
                    <Target className="w-5 h-5" />
                    Submit Answer
                  </button>
                </div>
              )}

              {hasAnswered && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-xl">
                    <Check className="w-4 h-4" />
                    Answer submitted! Waiting for other players...
                  </div>
                </div>
              )}
            </div>

            {/* Question Progress */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm font-medium">
                  {currentQuestionIndex + 1}/{quiz.questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Live Leaderboard
              </h2>
              
              <div className="space-y-3">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      player.id === currentUserId 
                        ? 'bg-blue-500/20 border border-blue-400/30' 
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {index < 3 && index === 0 ? (
                          <Crown className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{player.name}</p>
                          {player.hasAnswered && (
                            <Check className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        {player.streak > 1 && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-yellow-400">
                              {player.streak} streak
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{player.score}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-gray-400">{player.streak}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {currentPlayer && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-xl">
                  <h3 className="font-semibold mb-2">Your Stats</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Score</p>
                      <p className="font-bold text-lg">{currentPlayer.score}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Streak</p>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-lg">{currentPlayer.streak}</p>
                        {currentPlayer.streak > 0 && (
                          <Zap className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

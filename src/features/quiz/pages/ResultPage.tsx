import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { Quiz } from '../types';
import Button from '../../../shared/components/ui/Button';
import { getQuizResults, getQuizResultById, getQuizById } from '../services/quizService';
import { toast } from 'react-toastify';
import QuickReviewSection from '../../../shared/components/QuickReviewSection';
import { quizStatsService } from '../../../services/quizStatsService';

interface ResultState {
  score: number;
  correct: number;
  total: number;
  answers: Record<string, string>;
  isTimeUp?: boolean;
  timeSpent?: number;
  quizId?: string;
  tracked?: boolean; // Add this to prevent duplicate tracking
}

interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  completedAt: Date;
}

// **THÊM MỚI**: Confetti animation component
const Confetti: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        >
          <div 
            className="w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'][Math.floor(Math.random() * 5)]
            }}
          />
        </div>
      ))}
    </div>
  );
};

// **THÊM MỚI**: Score circle component
const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const increment = score / 50; // Animation in 50 steps
      const stepTimer = setInterval(() => {
        current += increment;
        if (current >= score) {
          setAnimatedScore(score);
          clearInterval(stepTimer);
        } else {
          setAnimatedScore(Math.floor(current));
        }
      }, 20);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [score]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };



  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${
            animatedScore >= 80 ? 'text-green-500' :
            animatedScore >= 60 ? 'text-yellow-500' : 'text-red-500'
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(animatedScore)}`}>
            {animatedScore}%
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: format seconds to mm:ss
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Helper ép kiểu an toàn cho số
const safeNumber = (val: any, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

export const ResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { quizzes } = useSelector((state: RootState) => state.quiz);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [result, setResult] = useState<ResultState | null>(location.state as ResultState || null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    console.log('🔍 ResultPage useEffect - attemptId:', attemptId, 'location.state:', location.state);
    
    if (location.state) {
      // Có state từ navigation - sử dụng ngay
      const resultData = location.state as ResultState;
      console.log('✅ Using state from navigation:', resultData);
      setResult(resultData);
      setQuizId(resultData.quizId || attemptId || null);
    } else if (attemptId) {
      // Không có state, cần fetch từ Firestore
      console.log('📡 Fetching result from Firestore for attemptId:', attemptId);
      getQuizResultById(attemptId).then((res: any) => {
        if (res) {
          console.log('✅ Fetched result from Firestore:', res);
          const resultData = res as ResultState;
          setResult(resultData);
          setQuizId(resultData.quizId || null);
        } else {
          console.error('❌ No result found for attemptId:', attemptId);
          toast.error('Không tìm thấy kết quả quiz!');
          navigate('/quiz-list');
        }
      }).catch(error => {
        console.error('❌ Error fetching result:', error);
        toast.error('Không thể tải kết quả quiz!');
        navigate('/quiz-list');
      });
    } else {
      console.error('❌ No attemptId or state provided');
      navigate('/quiz-list');
    }
  }, [attemptId, location.state, navigate]);

  useEffect(() => {
    if (!quizId) return;
    
    console.log('🔍 Looking for quiz with ID:', quizId);
    const foundQuiz = quizzes.find(q => q.id === quizId);
    
    if (foundQuiz) {
      console.log('✅ Found quiz in store:', foundQuiz.title);
      setQuiz(foundQuiz);
    } else {
      console.log('📡 Quiz not in store, fetching from Firestore...');
      // Nếu không có trong store, fetch từ Firestore
      getQuizById(quizId).then(qz => {
        if (qz) {
          console.log('✅ Fetched quiz from Firestore:', qz.title);
          setQuiz(qz);
        } else {
          console.error('❌ Quiz not found:', quizId);
          toast.error('Không tìm thấy quiz!');
          navigate('/quiz-list');
        }
      }).catch(error => {
        console.error('❌ Error fetching quiz:', error);
        toast.error('Không thể tải quiz!');
        navigate('/quiz-list');
      });
    }
  }, [quizId, quizzes, navigate]);

  // Track completion when result and quiz are both available
  useEffect(() => {
    if (result && quiz && user && !result.tracked) {
      console.log('📊 Tracking quiz completion for user:', user.uid);
      const score = safeNumber(result.correct, 0);
      const total = safeNumber(result.total, quiz.questions.length);
      
      quizStatsService.trackCompletion(quiz.id, user.uid, score, total);
      
      // Mark as tracked to prevent duplicate tracking
      setResult(prev => prev ? { ...prev, tracked: true } : null);
    }
  }, [result, quiz, user]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!quizId) return;
      
      try {
        setLoadingStats(true);
        console.log('📊 Fetching leaderboard for quiz:', quizId);
        const results = await getQuizResults(quizId);
        console.log('📊 Raw results from Firebase:', results);
        
        // Transform results to leaderboard entries with user info
        const leaderboardData: LeaderboardEntry[] = results.map((result: any) => {
          console.log('🔍 Processing result:', result);
          return {
            id: result.id,
            userId: result.userId,
            userName: result.userName || result.userEmail?.split('@')[0] || 'Anonymous',
            userEmail: result.userEmail || '',
            score: result.score,
            correctAnswers: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            timeSpent: result.timeSpent || 0,
            completedAt: result.completedAt?.toDate?.() || new Date(result.completedAt)
          };
        });

        console.log('📊 Leaderboard data processed:', leaderboardData);

        // Sort by score (descending) then by time (ascending) for same scores
        const sortedLeaderboard = leaderboardData.sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score; // Higher score first
          }
          return a.timeSpent - b.timeSpent; // Faster time first if same score
        });

        console.log('📊 Sorted leaderboard:', sortedLeaderboard);
        setLeaderboard(sortedLeaderboard.slice(0, 10)); // Top 10

        // Find current user's rank
        if (user) {
          const userResultIndex = sortedLeaderboard.findIndex(r => r.userId === user.uid);
          setUserRank(userResultIndex >= 0 ? userResultIndex + 1 : null);
          console.log('👤 User rank:', userResultIndex >= 0 ? userResultIndex + 1 : 'Not found');
        }

        console.log('📊 Leaderboard loaded:', sortedLeaderboard.length, 'entries');
      } catch (error) {
        console.error('❌ Failed to fetch leaderboard:', error);
        toast.error('Không thể tải bảng xếp hạng!');
      } finally {
        setLoadingStats(false);
      }
    };

    fetchLeaderboard();
  }, [quizId, user]);

  if (!result || !quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading results...</h2>
          <Button onClick={() => navigate('/quiz-list')}>
            Back to Quiz List
          </Button>
        </div>
      </div>
    );
  }

  // Tính toán điểm số, kiểm tra hợp lệ
  const correct = safeNumber(result.correct);
  const total = safeNumber(result.total);
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isExcellent = percentage >= 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      {isExcellent && <Confetti />}
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Kết quả tổng quan */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            {result.isTimeUp && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg mb-6">
                ⏰ Time's up! Quiz was automatically submitted.
              </div>
            )}
            <div className="flex flex-col items-center">
              <ScoreCircle score={percentage} />
              <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
                Quiz Completed!
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                {percentage >= 90 ? 'Outstanding! 🏆' :
                 percentage >= 80 ? 'Excellent! 🌟' :
                 percentage >= 70 ? 'Great Job! 👏' :
                 percentage >= 60 ? 'Good Work! 👍' :
                 percentage >= 50 ? 'Not Bad! 📚' :
                 'Keep Practicing! 💪'}
              </p>
              <div className="text-lg text-gray-700 mb-2">
                You got <span className="font-bold text-blue-600">{correct}</span> out of{' '}
                <span className="font-bold">{total}</span> questions correct
              </div>
              {/* Hiển thị thời gian làm bài */}
              {typeof result.timeSpent === 'number' && (
                <div className="text-md text-gray-500 mt-2">
                  ⏱️ Time taken: <span className="font-semibold text-blue-700">{formatTime(safeNumber(result.timeSpent))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* **THÊM MỚI**: Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{correct}</div>
            <div className="text-gray-600">Correct Answers</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{total - correct}</div>
            <div className="text-gray-600">Incorrect Answers</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{percentage}%</div>
            <div className="text-gray-600">Final Score</div>
          </div>
        </div>

        {/* **THÊM MỚI**: Performance Analysis */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Analysis</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Accuracy Rate</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="font-semibold">{percentage}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Quiz Difficulty</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                quiz.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Time Management</span>
              <span className="font-semibold text-green-600">
                {result.isTimeUp ? 'Used full time' : 'Completed early'}
              </span>
            </div>
          </div>
        </div>

        {/* **THÊM MỚI**: Review Answers Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Review Answers</h2>
            <Button
              variant="outline"
              onClick={() => setShowAnswers(!showAnswers)}
            >
              {showAnswers ? 'Hide' : 'Show'} Detailed Review
            </Button>
          </div>

          {showAnswers && (
            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const userAnswerId = result.answers[question.id];
                const userAnswer = question.answers.find(a => a.id === userAnswerId);
                const isCorrect = userAnswer?.isCorrect || false;

                return (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {index + 1}. {question.text}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {question.answers.map(answer => (
                        <div
                          key={answer.id}
                          className={`p-3 rounded-lg border ${
                            answer.isCorrect 
                              ? 'border-green-300 bg-green-50' 
                              : answer.id === userAnswerId 
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium mr-3">
                              {String.fromCharCode(65 + question.answers.indexOf(answer))}.
                            </span>
                            <span>{answer.text}</span>
                            {answer.isCorrect && (
                              <span className="ml-auto text-green-600 font-medium">
                                ✓ Correct Answer
                              </span>
                            )}
                            {answer.id === userAnswerId && !answer.isCorrect && (
                              <span className="ml-auto text-red-600 font-medium">
                                Your Answer
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="font-medium text-blue-800">Explanation: </span>
                        <span className="text-blue-700">{question.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🏆 Leaderboard</h2>
          {loadingStats ? (
            <div className="flex justify-center items-center h-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading leaderboard...</span>
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    entry.userId === user?.uid 
                      ? 'bg-blue-50 border-blue-200 shadow-md' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-100' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {entry.userName}
                        {entry.userId === user?.uid && <span className="text-blue-600 ml-2">(You)</span>}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.correctAnswers}/{entry.totalQuestions} correct
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-gray-900">{safeNumber(entry.score)}%</div>
                    <div className="text-sm text-gray-500">
                      ⏱️ {formatTime(safeNumber(entry.timeSpent))}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show user rank if not in top 10 */}
              {user && userRank && userRank > 10 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-center">
                      <span className="text-blue-800 font-medium">Your Rank: #{userRank}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-lg">No results yet!</p>
              <p>Be the first to complete this quiz and claim the top spot!</p>
            </div>
          )}
        </div>

        {/* Quiz Review Section */}
        {quiz && (
          <div className="mb-8">
            <QuickReviewSection 
              quizId={quiz.id} 
              quizTitle={quiz.title}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            onClick={() => navigate(`/quiz/${quiz.id}`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Retake Quiz
          </Button>
          
          <Button
            onClick={() => navigate('/quizzes')}
            variant="outline"
          >
            More Quizzes
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              // Share functionality
              navigator.clipboard.writeText(
                `I scored ${percentage}% on "${quiz.title}" quiz! 🎯`
              );
              toast.success('Result copied to clipboard!');
            }}
          >
            Share Result
          </Button>
          
          <Button
            onClick={() => navigate('/profile')}
            variant="outline"
          >
            View All Results
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;


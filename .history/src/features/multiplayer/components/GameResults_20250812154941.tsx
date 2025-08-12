import React from 'react';
import { Trophy } from 'lucide-react';

interface GameResultsProps {
  roomId: string;
}

const GameResults: React.FC<GameResultsProps> = ({ roomId }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-4">Game Results</h1>
        <p className="text-white/70 mb-6">Room ID: {roomId}</p>
        <p className="text-white/70">Results feature coming soon...</p>
      </div>
    </div>
  );
};

export default GameResults;

const GameResults: React.FC<GameResultsProps> = ({ roomId }) => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [gameStats, setGameStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGameResults();
  }, [roomId]);

  const loadGameResults = async () => {
    try {
      setIsLoading(true);
      
      // const roomData = await firestoreMultiplayerService.getRoomById(roomId);
      // Mock data for now
      const roomData = null;
      if (!roomData) {
        toast.error('Không tìm thấy phòng');
        navigate('/multiplayer');
        return;
      }

      setRoom(roomData);
      
      // Calculate leaderboard
      const leaderboardData = calculateLeaderboard(roomData);
      setLeaderboard(leaderboardData);
      
      // Calculate player stats
      if (user) {
        const playerStatsData = calculatePlayerStats(roomData, user.uid);
        setPlayerStats(playerStatsData);
      }
      
      // Get game statistics
      const gameStatsData = await firestoreMultiplayerService.getGameStatistics();
      setGameStats(gameStatsData);
      
    } catch (error) {
      console.error('Error loading game results:', error);
      toast.error('Lỗi tải kết quả');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLeaderboard = (roomData: MultiplayerRoom): LeaderboardEntry[] => {
    const playerScores: Record<string, number> = {};
    const playerCorrectAnswers: Record<string, number> = {};
    const playerTotalTime: Record<string, number> = {};
    const playerAnswerCount: Record<string, number> = {};

    // Calculate scores and stats from all answers
    Object.values(roomData.questionAnswers || {}).forEach(questionData => {
      Object.entries(questionData).forEach(([playerId, answerData]) => {
        playerScores[playerId] = (playerScores[playerId] || 0) + (answerData.pointsEarned || 0);
        if (answerData.isCorrect) {
          playerCorrectAnswers[playerId] = (playerCorrectAnswers[playerId] || 0) + 1;
        }
        playerTotalTime[playerId] = (playerTotalTime[playerId] || 0) + answerData.timeToAnswer;
        playerAnswerCount[playerId] = (playerAnswerCount[playerId] || 0) + 1;
      });
    });

    // Create leaderboard entries
    const entries = roomData.players.map((player, index) => ({
      playerId: player.id,
      playerName: player.name,
      score: playerScores[player.id] || 0,
      correctAnswers: playerCorrectAnswers[player.id] || 0,
      totalQuestions: roomData.quiz.questions.length,
      averageTime: playerAnswerCount[player.id] 
        ? (playerTotalTime[player.id] / playerAnswerCount[player.id]) 
        : 0,
      rank: 0, // Will be calculated after sorting
      avatar: player.avatar
    }));

    // Sort by score and assign ranks
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      return a.averageTime - b.averageTime; // Lower time is better
    });

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  };

  const calculatePlayerStats = (roomData: MultiplayerRoom, playerId: string): PlayerStats | null => {
    const player = roomData.players.find(p => p.id === playerId);
    if (!player) return null;

    let totalScore = 0;
    let correctAnswers = 0;
    let totalTime = 0;
    let answerCount = 0;
    let streak = 0;
    let currentStreak = 0;

    Object.values(roomData.questionAnswers || {}).forEach(questionData => {
      const answerData = questionData[playerId];
      if (answerData) {
        totalScore += answerData.pointsEarned || 0;
        totalTime += answerData.timeToAnswer;
        answerCount++;
        
        if (answerData.isCorrect) {
          correctAnswers++;
          currentStreak++;
          streak = Math.max(streak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
    });

    const leaderboardEntry = leaderboard.find(entry => entry.playerId === playerId);

    return {
      playerId,
      playerName: player.name,
      totalScore,
      correctAnswers,
      averageTimePerAnswer: answerCount > 0 ? totalTime / answerCount : 0,
      streak,
      rank: leaderboardEntry?.rank || 0
    };
  };

  const handlePlayAgain = () => {
    navigate('/multiplayer/create');
  };

  const handleShareResults = async () => {
    if (!room) return;
    
    const shareText = `Tôi vừa hoàn thành quiz "${room.quiz.title}" trong chế độ multiplayer!\nĐiểm số: ${playerStats?.totalScore || 0}\nXếp hạng: #${playerStats?.rank || 0}/${room.players.length}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kết quả Quiz Multiplayer',
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Đã sao chép kết quả!');
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-orange-600';
      default: return 'text-white';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Award className="w-6 h-6 text-orange-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-white font-bold">#{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Đang tải kết quả...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Không tìm thấy kết quả</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/multiplayer')}
            className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại lobby
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleShareResults}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ
            </button>
            
            <button
              onClick={handlePlayAgain}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Chơi lại
            </button>
          </div>
        </div>

        {/* Game Complete Header */}
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">🎉 Hoàn thành! 🎉</h1>
          <p className="text-white/70 text-lg">Quiz "{room.quiz.title}"</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player Performance */}
          {playerStats && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Thành tích của bạn
              </h2>
              
              <div className="space-y-4">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className={`text-3xl font-bold mb-1 ${getRankColor(playerStats.rank)}`}>
                    #{playerStats.rank}
                  </div>
                  <div className="text-white/70 text-sm">Xếp hạng</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{playerStats.totalScore}</div>
                    <div className="text-white/70 text-sm">Điểm</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">
                      {playerStats.correctAnswers}/{room.quiz.questions.length}
                    </div>
                    <div className="text-white/70 text-sm">Đúng</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{playerStats.streak}</div>
                    <div className="text-white/70 text-sm">Streak</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-orange-400">
                      {playerStats.averageTimePerAnswer.toFixed(1)}s
                    </div>
                    <div className="text-white/70 text-sm">Thời gian TB</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-white/70 text-sm mb-2">Độ chính xác</div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${(playerStats.correctAnswers / room.quiz.questions.length) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="text-white font-medium mt-1">
                    {((playerStats.correctAnswers / room.quiz.questions.length) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Bảng xếp hạng
            </h2>
            
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    entry.playerId === user?.uid
                      ? 'bg-purple-500/20 border border-purple-400/30'
                      : index === 0
                      ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 border border-gray-300/30'
                      : index === 2
                      ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.playerName}
                          className="w-10 h-10 rounded-full border-2 border-white/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {entry.playerName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          {entry.playerName}
                          {entry.playerId === user?.uid && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-white/60 text-sm">
                          {entry.correctAnswers}/{entry.totalQuestions} đúng • {entry.averageTime.toFixed(1)}s TB
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getRankColor(entry.rank)}`}>
                      {entry.score}
                    </div>
                    <div className="text-white/60 text-sm">điểm</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Statistics */}
        {gameStats && (
          <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Thống kê trò chơi
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{gameStats.totalPlayers}</div>
                <div className="text-white/70 text-sm">Người chơi</div>
              </div>
              
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{gameStats.averageScore.toFixed(0)}</div>
                <div className="text-white/70 text-sm">Điểm TB</div>
              </div>
              
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{gameStats.averageTime.toFixed(1)}s</div>
                <div className="text-white/70 text-sm">Thời gian TB</div>
              </div>
              
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{gameStats.accuracyRate.toFixed(1)}%</div>
                <div className="text-white/70 text-sm">Độ chính xác</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameResults;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Clock,
  Play,
  Search,
  BookOpen,
  Star
} from 'lucide-react';
// import { firestoreMultiplayerService } from '../services';

// Mock service for legacy components
const firestoreMultiplayerService = {
  createRoom: async (roomData: any) => {
    console.log('Mock createRoom called with:', roomData);
    return { id: 'mock-room-id' };
  }
};
import { Quiz } from '../../quiz/types';
import { getQuizzes } from '../../quiz/services/quizService';
import { toast } from 'react-toastify';

const CreateMultiplayerRoom: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Room settings
  const [settings, setSettings] = useState({
    maxPlayers: 8,
    questionTimeLimit: 30,
    showLeaderboard: true,
    allowSpectators: false,
    isPrivate: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    loadQuizzes();
  }, [user]);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      
      // Load quizzes using the main service
      const result = await getQuizzes({}, 50, undefined, user);
      setQuizzes(result.quizzes);
      
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Lỗi tải danh sách quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedQuiz || !user) {
      toast.error('Vui lòng chọn quiz');
      return;
    }

    if (selectedQuiz.questions.length === 0) {
      toast.error('Quiz phải có ít nhất 1 câu hỏi');
      return;
    }

    try {
      setIsCreating(true);
      
      const quizData = {
        id: selectedQuiz.id,
        title: selectedQuiz.title,
        questions: selectedQuiz.questions
      };

      const roomId = await firestoreMultiplayerService.createRoom({
        hostId: user.uid,
        hostName: user.displayName || 'Host',
        quiz: quizData,
        settings
      });

      toast.success('Tạo phòng thành công!');
      navigate(`/multiplayer/lobby/${roomId}`);
      
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Lỗi tạo phòng');
    } finally {
      setIsCreating(false);
    }
  };

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(quizzes.map(q => q.category).filter(Boolean)))];

  // Filter quizzes
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || quiz.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/multiplayer')}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            
            <div>
              <h1 className="text-3xl font-bold text-white">Tạo phòng Multiplayer</h1>
              <p className="text-white/70">Chọn quiz và cài đặt cho phòng chơi</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quiz Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Chọn Quiz
              </h2>

              {/* Search and Filter */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm quiz..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-400 focus:outline-none"
                  />
                </div>
                
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="all" className="bg-gray-800">Tất cả danh mục</option>
                  {categories.filter(c => c !== 'all').map(category => (
                    <option key={category} value={category} className="bg-gray-800">
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quiz List */}
              {isLoading ? (
                <div className="text-center text-white py-8">
                  Đang tải quiz...
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="text-center text-white/70 py-8">
                  {searchTerm || filterCategory !== 'all' 
                    ? 'Không tìm thấy quiz phù hợp'
                    : 'Chưa có quiz nào'
                  }
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      onClick={() => setSelectedQuiz(quiz)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedQuiz?.id === quiz.id
                          ? 'border-purple-400 bg-purple-500/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-lg">{quiz.title}</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm">5.0</span>
                          </div>
                          {quiz.isPublic && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                              Công khai
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {quiz.description && (
                        <p className="text-white/70 text-sm mb-3 line-clamp-2">
                          {quiz.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <div className="flex items-center gap-4">
                          <span>{quiz.questions.length} câu hỏi</span>
                          {quiz.category && (
                            <span className="px-2 py-1 bg-white/10 rounded">
                              {quiz.category}
                            </span>
                          )}
                        </div>
                        <span>Bởi {quiz.createdBy || 'Ẩn danh'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Room Settings */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Cài đặt phòng
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Số người chơi tối đa
                  </label>
                  <select
                    value={settings.maxPlayers}
                    onChange={(e) => setSettings({...settings, maxPlayers: parseInt(e.target.value)})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value={2} className="bg-gray-800">2 người</option>
                    <option value={4} className="bg-gray-800">4 người</option>
                    <option value={6} className="bg-gray-800">6 người</option>
                    <option value={8} className="bg-gray-800">8 người</option>
                    <option value={10} className="bg-gray-800">10 người</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Thời gian trả lời (giây)
                  </label>
                  <select
                    value={settings.questionTimeLimit}
                    onChange={(e) => setSettings({...settings, questionTimeLimit: parseInt(e.target.value)})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  >
                    <option value={15} className="bg-gray-800">15 giây</option>
                    <option value={20} className="bg-gray-800">20 giây</option>
                    <option value={30} className="bg-gray-800">30 giây</option>
                    <option value={45} className="bg-gray-800">45 giây</option>
                    <option value={60} className="bg-gray-800">60 giây</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-white/70 text-sm">Hiển thị bảng xếp hạng</label>
                    <input
                      type="checkbox"
                      checked={settings.showLeaderboard}
                      onChange={(e) => setSettings({...settings, showLeaderboard: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-white/70 text-sm">Cho phép khán giả</label>
                    <input
                      type="checkbox"
                      checked={settings.allowSpectators}
                      onChange={(e) => setSettings({...settings, allowSpectators: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-white/70 text-sm">Phòng riêng tư</label>
                    <input
                      type="checkbox"
                      checked={settings.isPrivate}
                      onChange={(e) => setSettings({...settings, isPrivate: e.target.checked})}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Quiz Info */}
            {selectedQuiz && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Quiz đã chọn</h3>
                <div className="text-white/70 space-y-2">
                  <p className="font-medium text-white">{selectedQuiz.title}</p>
                  <p className="text-sm">{selectedQuiz.questions.length} câu hỏi</p>
                  {selectedQuiz.category && (
                    <p className="text-sm">Danh mục: {selectedQuiz.category}</p>
                  )}
                  {selectedQuiz.description && (
                    <p className="text-sm line-clamp-3">{selectedQuiz.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateRoom}
              disabled={!selectedQuiz || isCreating}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {isCreating ? 'Đang tạo phòng...' : 'Tạo phòng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMultiplayerRoom;

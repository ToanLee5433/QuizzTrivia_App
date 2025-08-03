import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizById, updateQuiz } from '../api';
import { Quiz, Question } from '../types';
import { QuestionEditor } from '../components/QuestionEditor';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, Save, Loader2, Plus, 
  BookOpen, Target, MessageSquare, AlertCircle,
  FileText, Tag, Star, Clock
} from 'lucide-react';

// Import categories and difficulties from CreateQuizPage
const categories = [
  { value: 'general', label: 'Tổng hợp' },
  { value: 'science', label: 'Khoa học' },
  { value: 'history', label: 'Lịch sử' },
  { value: 'geography', label: 'Địa lý' },
  { value: 'literature', label: 'Văn học' },
  { value: 'math', label: 'Toán học' },
  { value: 'technology', label: 'Công nghệ' },
  { value: 'sports', label: 'Thể thao' },
  { value: 'entertainment', label: 'Giải trí' },
  { value: 'food', label: 'Ẩm thực' }
];

const difficulties = [
  { value: 'easy', label: 'Dễ', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Trung bình', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: 'Khó', color: 'bg-red-100 text-red-800' }
];

const EditQuizPageAdvanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'settings'>('info');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const [quizInfo, setQuizInfo] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    status: 'pending' as 'pending' | 'approved' | 'rejected',
    timeLimit: 30,
    passingScore: 70,
    tags: [] as string[],
    isPublished: false
  });

  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (id) loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const quizData = await getQuizById(id);
      if (quizData) {
        setQuiz(quizData);
        setQuizInfo({
          title: quizData.title || '',
          description: quizData.description || '',
          category: quizData.category || '',
          difficulty: quizData.difficulty || 'medium',
          status: quizData.status || 'pending',
          timeLimit: quizData.duration || 30,
          passingScore: 70,
          tags: quizData.tags || [],
          isPublished: quizData.isPublished || false
        });
        setQuestions(quizData.questions || []);
      } else {
        toast.error('Quiz not found');
        navigate('/admin/stats-test');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !quiz) return;

    if (!quizInfo.title.trim()) {
      toast.error('Quiz title is required');
      return;
    }

    if (questions.length === 0) {
      toast.error('Quiz must have at least one question');
      return;
    }

    setSaving(true);
    try {
      const updatedQuiz: Quiz = {
        ...quiz,
        ...quizInfo,
        duration: quizInfo.timeLimit,
        questions,
        updatedAt: new Date()
      };

      await updateQuiz(id, updatedQuiz);
      toast.success('✅ Quiz updated successfully!');
      navigate('/admin/stats-test');
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Failed to update quiz');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      text: '',
      type: 'multiple',
      answers: [
        { id: 'a1', text: '', isCorrect: true },
        { id: 'a2', text: '', isCorrect: false },
        { id: 'a3', text: '', isCorrect: false },
        { id: 'a4', text: '', isCorrect: false }
      ],
      explanation: '',
      points: 10,
      difficulty: 'medium'
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const deleteQuestion = (questionId: string) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      setQuestions(questions.filter(q => q.id !== questionId));
      if (editingQuestionId === questionId) {
        setEditingQuestionId(null);
      }
    }
  };

  const updateQuestion = (questionId: string, updatedQuestion: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updatedQuestion } : q
    ));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      setQuestions(newQuestions);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <p className="text-gray-600 mb-6">The quiz you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/stats-test')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: 'Quiz Info', icon: BookOpen },
    { id: 'questions', label: 'Questions', icon: MessageSquare, count: questions.length },
    { id: 'settings', label: 'Settings', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/stats-test')}
              className="p-3 text-gray-600 hover:text-gray-900 hover:bg-white rounded-2xl transition-all shadow-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edit Quiz
              </h1>
              <p className="text-gray-600 text-lg">Modify quiz content and settings</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 font-semibold"
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Save className="w-6 h-6" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-2 bg-white/80 backdrop-blur-sm rounded-3xl p-2 shadow-lg border border-white/20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  {tab.label}
                  {'count' in tab && tab.count !== undefined && (
                    <span className={`px-3 py-1 text-sm rounded-full font-bold ${
                      activeTab === tab.id ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'info' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
              <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Thông tin cơ bản</h2>
                  <p className="text-gray-600">Chỉnh sửa thông tin quiz của bạn</p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FileText className="w-4 h-4" />
                      Tiêu đề quiz *
                    </label>
                    <input
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg"
                      placeholder="Nhập tiêu đề thu hút cho quiz của bạn..."
                      value={quizInfo.title}
                      onChange={(e) => setQuizInfo({ ...quizInfo, title: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FileText className="w-4 h-4" />
                      Mô tả quiz *
                    </label>
                    <textarea
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Mô tả ngắn gọn về nội dung quiz..."
                      rows={4}
                      value={quizInfo.description}
                      onChange={(e) => setQuizInfo({ ...quizInfo, description: e.target.value })}
                    />
                  </div>

                  {/* Category & Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Tag className="w-4 h-4" />
                        Danh mục *
                      </label>
                      <select
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={quizInfo.category}
                        onChange={(e) => setQuizInfo({ ...quizInfo, category: e.target.value })}
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Star className="w-4 h-4" />
                        Độ khó *
                      </label>
                      <select
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={quizInfo.difficulty}
                        onChange={(e) => setQuizInfo({ ...quizInfo, difficulty: e.target.value as any })}
                      >
                        {difficulties.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Time Limit & Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Clock className="w-4 h-4" />
                        Thời gian (phút)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={quizInfo.timeLimit}
                        onChange={(e) => setQuizInfo({ ...quizInfo, timeLimit: parseInt(e.target.value) || 30 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Target className="w-4 h-4" />
                        Trạng thái
                      </label>
                      <select
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={quizInfo.status}
                        onChange={(e) => setQuizInfo({ ...quizInfo, status: e.target.value as any })}
                      >
                        <option value="pending">⏳ Chờ duyệt</option>
                        <option value="approved">✅ Đã duyệt</option>
                        <option value="rejected">❌ Từ chối</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-gray-900">Questions ({questions.length})</h2>
                  <button
                    onClick={addQuestion}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-semibold"
                  >
                    <Plus className="w-6 h-6" />
                    Add Question
                  </button>
                </div>
                {questions.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">No Questions Yet</h3>
                    <p className="text-gray-600 mb-8 text-lg">Start building your quiz by adding questions.</p>
                    <button
                      onClick={addQuestion}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
                    >
                      Add First Question
                    </button>
                  </div>
                )}
              </div>

              {questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  isEditing={editingQuestionId === question.id}
                  onEdit={setEditingQuestionId}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                  onMove={moveQuestion}
                  totalQuestions={questions.length}
                />
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Quiz Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Time Limit (minutes)</label>
                  <input
                    type="number"
                    value={quizInfo.timeLimit}
                    onChange={(e) => setQuizInfo({ ...quizInfo, timeLimit: parseInt(e.target.value) || 30 })}
                    min="1"
                    max="180"
                    className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Passing Score (%)</label>
                  <input
                    type="number"
                    value={quizInfo.passingScore}
                    onChange={(e) => setQuizInfo({ ...quizInfo, passingScore: parseInt(e.target.value) || 70 })}
                    min="0"
                    max="100"
                    className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="mt-8">
                <label className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={quizInfo.isPublished}
                    onChange={(e) => setQuizInfo({ ...quizInfo, isPublished: e.target.checked })}
                    className="w-6 h-6 text-blue-600 rounded-lg focus:ring-blue-500"
                  />
                  <span className="text-lg font-semibold text-gray-700">Published (visible to users)</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuizPageAdvanced;

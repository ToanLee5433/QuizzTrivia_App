import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizById } from '../api';
import { updateQuiz } from '../api';
import { Quiz } from '../types';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const EditQuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    status: 'pending' as 'pending' | 'approved' | 'rejected'
  });

  useEffect(() => {
    if (id) {
      loadQuiz();
    }
  }, [id]);

  const loadQuiz = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const quizData = await getQuizById(id);
      if (quizData) {
        setQuiz(quizData);
        setFormData({
          title: quizData.title || '',
          description: quizData.description || '',
          category: quizData.category || '',
          difficulty: quizData.difficulty || 'medium',
          status: quizData.status || 'pending'
        });
      } else {
        toast.error('Không tìm thấy quiz này');
        navigate('/admin');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast.error('Lỗi khi tải quiz');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !quiz) return;

    setSaving(true);
    try {
      const updatedQuiz = {
        ...quiz,
        ...formData,
        updatedAt: new Date()
      };

      await updateQuiz(id, updatedQuiz);
      toast.success('Cập nhật quiz thành công!');
      navigate('/admin');
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Lỗi khi cập nhật quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
            <span className="text-lg text-gray-600">Đang tải quiz...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-500">Không tìm thấy quiz</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Admin
          </button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ✏️ Chỉnh sửa Quiz
            </h1>
            <p className="text-gray-600">
              ID: <code className="bg-gray-100 px-2 py-1 rounded">{id}</code>
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề Quiz
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Độ khó
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Bị từ chối</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>

        {/* Quiz Info */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Thông tin Quiz</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Số câu hỏi:</span>
              <span className="ml-2 text-gray-600">{quiz.questions?.length || 0}</span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Người tạo:</span>
              <span className="ml-2 text-gray-600">{quiz.createdBy || 'N/A'}</span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Ngày tạo:</span>
              <span className="ml-2 text-gray-600">
                {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Lần sửa cuối:</span>
              <span className="ml-2 text-gray-600">
                {quiz.updatedAt ? new Date(quiz.updatedAt).toLocaleDateString('vi-VN') : 'Chưa sửa'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuizPage;

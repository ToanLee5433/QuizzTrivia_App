import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  limit
} from 'firebase/firestore';

// Helper function to strip HTML tags from text
const stripHtml = (html: string): string => {
  if (!html) return '';
  // Create a temporary div element to parse HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};
import { db } from '../../../lib/firebase/config';
import { initializeCategories } from '../../../utils/initializeCategories';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  FolderOpen,
  BookOpen,
  BarChart3,
  Eye,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  ExternalLink,
  Play,
  Target
} from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  questionCount: number;
  playCount: number;
  avgScore?: number;
  difficulty?: string;
  createdAt: Date;
  createdBy: string;
  creatorName?: string;
  status: string;
  timeLimit?: number;
  passingScore?: number;
  likes?: number;
  rating?: number;
  tags?: string[];
}

type DetailTab = 'overview' | 'quizzes' | 'analytics';

interface CategoryStats {
  totalPlays: number;
  avgScore: number;
  totalUsers: number;
  completionRate: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: Date;
  quizCount?: number;
  stats?: CategoryStats;
  quizzes?: Quiz[];
}

type SortField = 'name' | 'quizCount' | 'createdAt' | 'totalPlays';
type SortOrder = 'asc' | 'desc';

const CategoryManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [quizSearchTerm, setQuizSearchTerm] = useState('');
  const [quizSortBy, setQuizSortBy] = useState<'createdAt' | 'playCount' | 'avgScore' | 'title'>('createdAt');
  
  // Sorting and filtering
  const [sortField, setSortField] = useState<SortField>('quizCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterEmpty, setFilterEmpty] = useState<'all' | 'withQuizzes' | 'empty'>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: 'blue'
  });

  const colors = [
    { value: 'blue', label: t('categories.colors.blue', 'Xanh dương'), class: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600' },
    { value: 'green', label: t('categories.colors.green', 'Xanh lá'), class: 'bg-green-500', gradient: 'from-green-500 to-green-600' },
    { value: 'purple', label: t('categories.colors.purple', 'Tím'), class: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600' },
    { value: 'red', label: t('categories.colors.red', 'Đỏ'), class: 'bg-red-500', gradient: 'from-red-500 to-red-600' },
    { value: 'yellow', label: t('categories.colors.yellow', 'Vàng'), class: 'bg-yellow-500', gradient: 'from-yellow-500 to-yellow-600' },
    { value: 'pink', label: t('categories.colors.pink', 'Hồng'), class: 'bg-pink-500', gradient: 'from-pink-500 to-pink-600' },
    { value: 'indigo', label: t('categories.colors.indigo', 'Chàm'), class: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600' },
    { value: 'teal', label: t('categories.colors.teal', 'Xanh ngọc'), class: 'bg-teal-500', gradient: 'from-teal-500 to-teal-600' },
    { value: 'orange', label: t('categories.colors.orange', 'Cam'), class: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600' },
    { value: 'cyan', label: t('categories.colors.cyan', 'Lam'), class: 'bg-cyan-500', gradient: 'from-cyan-500 to-cyan-600' },
    { value: 'emerald', label: t('categories.colors.emerald', 'Ngọc lục bảo'), class: 'bg-emerald-500', gradient: 'from-emerald-500 to-emerald-600' },
    { value: 'gray', label: t('categories.colors.gray', 'Xám'), class: 'bg-gray-500', gradient: 'from-gray-500 to-gray-600' }
  ];

  const icons = ['📚', '🔬', '💻', '🎨', '📊', '🌍', '🏃‍♂️', '🎵', '🍳', '📈', '🧮', '📝', '🎯', '🧠', '💡', '🏆', '⚡', '🔥', '🌟', '💎', '🎮', '🎬', '📱', '🚀'];

  const loadCategories = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔍 Loading categories with stats from Firebase...');
      
      // Initialize default categories if none exist
      await initializeCategories();
      
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      
      console.log('📊 Found categories in DB:', snapshot.size);
      const loadedCategories: Category[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Get quizzes in this category
        const quizzesRef = collection(db, 'quizzes');
        const quizzesQuery = query(quizzesRef, where('category', '==', data.name));
        const quizzesSnapshot = await getDocs(quizzesQuery);
        
        // Calculate stats from quiz results
        let totalPlays = 0;
        let totalScore = 0;
        let scoreCount = 0;
        const uniqueUsers = new Set<string>();
        
        for (const quizDoc of quizzesSnapshot.docs) {
          const quizData = quizDoc.data();
          totalPlays += quizData.playCount || 0;
          
          // Get results for this quiz
          try {
            const resultsRef = collection(db, 'quizResults');
            const resultsQuery = query(resultsRef, where('quizId', '==', quizDoc.id), limit(100));
            const resultsSnapshot = await getDocs(resultsQuery);
            
            resultsSnapshot.docs.forEach(resultDoc => {
              const resultData = resultDoc.data();
              if (resultData.score !== undefined) {
                totalScore += resultData.score;
                scoreCount++;
              }
              if (resultData.userId) {
                uniqueUsers.add(resultData.userId);
              }
            });
          } catch (err) {
            console.warn('Could not load results for quiz:', quizDoc.id);
          }
        }
        
        loadedCategories.push({
          id: docSnap.id,
          name: data.name,
          description: data.description || '',
          icon: data.icon || '📚',
          color: data.color || 'blue',
          createdAt: data.createdAt?.toDate() || new Date(),
          quizCount: quizzesSnapshot.size,
          stats: {
            totalPlays,
            avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
            totalUsers: uniqueUsers.size,
            completionRate: totalPlays > 0 ? Math.round((scoreCount / totalPlays) * 100) : 0
          }
        });
      }
      
      console.log('✅ Loaded categories with stats:', loadedCategories);
      setCategories(loadedCategories);
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      toast.error(t('categories.loadError', 'Lỗi khi tải danh mục'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Load quizzes for selected category
  const loadCategoryQuizzes = useCallback(async (category: Category) => {
    setLoadingQuizzes(true);
    setDetailTab('overview');
    setQuizSearchTerm('');
    try {
      const quizzesRef = collection(db, 'quizzes');
      // Simple query without orderBy to avoid index requirement
      const quizzesQuery = query(
        quizzesRef, 
        where('category', '==', category.name)
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      
      const quizzes: Quiz[] = await Promise.all(quizzesSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        // Handle different date formats (Timestamp, number, Date, string)
        let createdAt: Date;
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'number') {
          createdAt = new Date(data.createdAt);
        } else if (data.createdAt instanceof Date) {
          createdAt = data.createdAt;
        } else if (typeof data.createdAt === 'string') {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }
        
        // Get creator name if available
        let creatorName = '';
        if (data.createdBy) {
          try {
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', data.createdBy), limit(1)));
            if (!userDoc.empty) {
              creatorName = userDoc.docs[0].data().displayName || userDoc.docs[0].data().email || '';
            }
          } catch {
            // Ignore error
          }
        }
        
        return {
          id: docSnap.id,
          title: data.title || t('categories.untitled'),
          description: data.description || '',
          questionCount: data.questions?.length || data.questionCount || 0,
          playCount: data.playCount || 0,
          avgScore: data.avgScore || 0,
          difficulty: data.difficulty || 'medium',
          createdAt,
          createdBy: data.createdBy || '',
          creatorName,
          status: data.status || 'approved',
          timeLimit: data.settings?.timeLimit || data.timeLimit || 30,
          passingScore: data.settings?.passingScore || data.passingScore || 60,
          likes: data.likes || 0,
          rating: data.rating || 0,
          tags: data.tags || []
        };
      }));
      
      // Sort on client side by createdAt desc
      quizzes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setSelectedCategory({ ...category, quizzes });
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error(t('categories.loadQuizzesError'));
    } finally {
      setLoadingQuizzes(false);
    }
  }, [t]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    loadCategories();
  }, [user, loadCategories]);

  // Sorted and filtered categories
  const processedCategories = useMemo(() => {
    let result = [...categories];
    
    // Filter
    if (filterEmpty === 'withQuizzes') {
      result = result.filter(c => (c.quizCount || 0) > 0);
    } else if (filterEmpty === 'empty') {
      result = result.filter(c => !c.quizCount || c.quizCount === 0);
    }
    
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quizCount':
          comparison = (a.quizCount || 0) - (b.quizCount || 0);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'totalPlays':
          comparison = (a.stats?.totalPlays || 0) - (b.stats?.totalPlays || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [categories, filterEmpty, searchTerm, sortField, sortOrder]);

  // Total stats
  const totalStats = useMemo(() => {
    return {
      totalCategories: categories.length,
      categoriesWithQuizzes: categories.filter(c => (c.quizCount || 0) > 0).length,
      totalQuizzes: categories.reduce((sum, c) => sum + (c.quizCount || 0), 0),
      emptyCategories: categories.filter(c => !c.quizCount || c.quizCount === 0).length,
      totalPlays: categories.reduce((sum, c) => sum + (c.stats?.totalPlays || 0), 0),
      totalUsers: categories.reduce((sum, c) => sum + (c.stats?.totalUsers || 0), 0),
      avgScore: categories.length > 0 
        ? Math.round(categories.reduce((sum, c) => sum + (c.stats?.avgScore || 0), 0) / categories.filter(c => (c.stats?.avgScore || 0) > 0).length) || 0
        : 0
    };
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('categories.enterName', 'Vui lòng nhập tên danh mục'));
      return;
    }

    // Check duplicate name
    const duplicateName = categories.find(
      c => c.name.toLowerCase() === formData.name.trim().toLowerCase() && c.id !== editingCategory?.id
    );
    if (duplicateName) {
      toast.error(t('categories.duplicateName', 'Tên danh mục đã tồn tại'));
      return;
    }

    try {
      if (editingCategory) {
        const categoryRef = doc(db, 'categories', editingCategory.id);
        await updateDoc(categoryRef, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          icon: formData.icon,
          color: formData.color,
          updatedAt: new Date()
        });
        
        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id 
            ? { ...cat, ...formData, name: formData.name.trim(), description: formData.description.trim() }
            : cat
        ));
        
        toast.success(t('categories.updateSuccess', 'Cập nhật danh mục thành công'));
      } else {
        const docRef = await addDoc(collection(db, 'categories'), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          icon: formData.icon,
          color: formData.color,
          createdAt: new Date()
        });
        
        const newCategory: Category = {
          id: docRef.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          icon: formData.icon,
          color: formData.color,
          createdAt: new Date(),
          quizCount: 0,
          stats: { totalPlays: 0, avgScore: 0, totalUsers: 0, completionRate: 0 }
        };
        
        setCategories(prev => [newCategory, ...prev]);
        toast.success(t('categories.addSuccess', 'Thêm danh mục thành công'));
      }
      
      setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
      setShowAddForm(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(t('categories.saveError', 'Lỗi khi lưu danh mục'));
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color
    });
    setShowAddForm(true);
  };

  const handleDelete = async (categoryId: string, categoryName: string, quizCount: number) => {
    if (quizCount > 0) {
      toast.warning(t('categories.cannotDeleteWithQuizzes', 'Không thể xóa danh mục có quiz. Hãy di chuyển các quiz sang danh mục khác trước.'));
      return;
    }
    
    if (!confirm(t('categories.confirmDeleteName', { name: categoryName, defaultValue: `Bạn có chắc muốn xóa danh mục "${categoryName}"?` }))) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      toast.success(t('categories.deleteSuccess', 'Xóa danh mục thành công'));
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(t('categories.deleteError', 'Lỗi khi xóa danh mục'));
    }
  };

  const getGradientClass = (color: string) => {
    const colorObj = colors.find(c => c.value === color);
    return colorObj?.gradient || 'from-blue-500 to-blue-600';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
            <FolderOpen className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">{t('categories.loading', 'Đang tải danh mục...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.categoryManagement', 'Quản lý danh mục')}</h1>
                <p className="text-gray-500 text-sm">{t('admin.categories.headerDesc', 'Quản lý các danh mục quiz của hệ thống')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadCategories(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t('refresh', 'Làm mới')}</span>
              </button>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-200"
              >
                <Plus className="w-5 h-5" />
                {t('categories.add', 'Thêm danh mục')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{totalStats.totalCategories}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('categories.total', 'Tổng danh mục')}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-green-600">{totalStats.categoriesWithQuizzes}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('categories.withQuizzes', 'Có quiz')}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-blue-600">{totalStats.totalQuizzes}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('categories.totalQuizzes', 'Tổng quiz')}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-2xl font-bold text-orange-600">{totalStats.emptyCategories}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('categories.empty', 'Trống')}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-2xl font-bold text-indigo-600">{totalStats.totalPlays.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('categories.totalPlays', 'Lượt chơi')}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-600" />
              </div>
              <span className="text-2xl font-bold text-cyan-600">{totalStats.totalUsers.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('categories.totalUsers', 'Người chơi')}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-amber-600">{totalStats.avgScore}%</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('categories.avgScore', 'Điểm TB')}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('categories.searchPlaceholder', 'Tìm kiếm danh mục...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterEmpty}
                onChange={(e) => setFilterEmpty(e.target.value as 'all' | 'withQuizzes' | 'empty')}
                className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
              >
                <option value="all">{t('categories.filterAll', 'Tất cả')}</option>
                <option value="withQuizzes">{t('categories.filterWithQuizzes', 'Có quiz')}</option>
                <option value="empty">{t('categories.filterEmpty', 'Trống')}</option>
              </select>
            </div>
            
            {/* Sort buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 hidden sm:inline">{t('sortBy')}:</span>
              {[
                { field: 'name' as SortField, label: t('name') },
                { field: 'quizCount' as SortField, label: t('quizCount') },
                { field: 'totalPlays' as SortField, label: t('plays') },
                { field: 'createdAt' as SortField, label: t('date') }
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all ${
                    sortField === field 
                      ? 'bg-purple-100 text-purple-700 font-medium' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                  {sortField === field && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        {processedCategories.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('categories.noCategories', 'Không có danh mục nào')}</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? t('categories.noSearchMatch', 'Không tìm thấy danh mục phù hợp') 
                : t('categories.noneCreated', 'Chưa có danh mục nào được tạo')}
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                {t('categories.createFirst', 'Tạo danh mục đầu tiên')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {processedCategories.map((category, index) => (
              <div 
                key={category.id} 
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => loadCategoryQuizzes(category)}
              >
                {/* Header with gradient */}
                <div className={`bg-gradient-to-r ${getGradientClass(category.color)} p-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl shadow-lg">
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{category.name}</h3>
                        <p className="text-white/80 text-sm">{category.quizCount || 0} quiz</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(category); }}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title={t('edit', 'Sửa')}
                      >
                        <Edit className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(category.id, category.name, category.quizCount || 0); }}
                        className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition-colors"
                        title={t('delete', 'Xóa')}
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                    {category.description || t('categories.noDescription', 'Chưa có mô tả')}
                  </p>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-indigo-600 mb-1">
                        <Play className="w-4 h-4" />
                        <span className="font-bold">{(category.stats?.totalPlays || 0).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500">{t('plays', 'Lượt chơi')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                        <Award className="w-4 h-4" />
                        <span className="font-bold">{category.stats?.avgScore || 0}%</span>
                      </div>
                      <p className="text-xs text-gray-500">{t('avgScore', 'Điểm TB')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-cyan-600 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="font-bold">{category.stats?.totalUsers || 0}</span>
                      </div>
                      <p className="text-xs text-gray-500">{t('categories.totalUsers')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                        <Target className="w-4 h-4" />
                        <span className="font-bold">{category.stats?.completionRate || 0}%</span>
                      </div>
                      <p className="text-xs text-gray-500">{t('completion', 'Hoàn thành')}</p>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {t('categories.createdAtLabel', 'Tạo ngày')}: {category.createdAt.toLocaleDateString('vi-VN')}
                    </span>
                    <div className="flex items-center gap-1 text-purple-600 text-sm font-medium group-hover:text-purple-700">
                      <span>{t('viewDetails', 'Xem chi tiết')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Detail Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${getGradientClass(selectedCategory.color)} p-4 sm:p-6`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl sm:text-5xl shrink-0">
                    {selectedCategory.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{selectedCategory.name}</h2>
                    <p className="text-white/80 text-sm sm:text-base mt-1">
                      {selectedCategory.description || t('categories.noDescription')}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-white/90 text-sm">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {selectedCategory.quizCount || 0} quiz
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {(selectedCategory.stats?.totalPlays || 0).toLocaleString()} {t('plays')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {selectedCategory.stats?.totalUsers || 0} {t('categories.players', 'người chơi')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { handleEdit(selectedCategory); setSelectedCategory(null); }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                    title={t('edit')}
                  >
                    <Edit className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-1 mt-4 bg-white/10 rounded-xl p-1">
                {[
                  { id: 'overview' as DetailTab, label: t('categories.tabs.overview', 'Tổng quan'), icon: BarChart3 },
                  { id: 'quizzes' as DetailTab, label: t('categories.tabs.quizzes', 'Danh sách Quiz'), icon: BookOpen },
                  { id: 'analytics' as DetailTab, label: t('categories.tabs.analytics', 'Phân tích'), icon: Eye }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      detailTab === tab.id 
                        ? 'bg-white text-gray-900 shadow-lg' 
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-220px)]">
              {/* Tab: Overview */}
              {detailTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-indigo-700">{(selectedCategory.stats?.totalPlays || 0).toLocaleString()}</p>
                          <p className="text-xs text-indigo-600">{t('categories.stats.totalPlays', 'Tổng lượt chơi')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-amber-700">{selectedCategory.stats?.avgScore || 0}%</p>
                          <p className="text-xs text-amber-600">{t('categories.stats.avgScore', 'Điểm trung bình')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-cyan-700">{selectedCategory.stats?.totalUsers || 0}</p>
                          <p className="text-xs text-cyan-600">{t('categories.stats.uniquePlayers', 'Người chơi')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-700">{selectedCategory.stats?.completionRate || 0}%</p>
                          <p className="text-xs text-green-600">{t('categories.stats.completionRate', 'Hoàn thành')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Category Info */}
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-purple-600" />
                      {t('categories.info', 'Thông tin danh mục')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{t('categories.name', 'Tên danh mục')}</p>
                        <p className="font-medium text-gray-900">{selectedCategory.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{t('categories.createdAtLabel', 'Ngày tạo')}</p>
                        <p className="font-medium text-gray-900">{selectedCategory.createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sm text-gray-500 mb-1">{t('categories.description', 'Mô tả')}</p>
                        <p className="font-medium text-gray-900">{selectedCategory.description || t('categories.noDescription')}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Top Quizzes Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        {t('categories.topQuizzes', 'Quiz nổi bật')}
                      </h3>
                      {selectedCategory.quizzes && selectedCategory.quizzes.length > 3 && (
                        <button 
                          onClick={() => setDetailTab('quizzes')}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                        >
                          {t('viewAll', 'Xem tất cả')} ({selectedCategory.quizzes.length})
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {loadingQuizzes ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-purple-600"></div>
                        <span className="ml-3 text-gray-500">{t('loading')}</span>
                      </div>
                    ) : selectedCategory.quizzes && selectedCategory.quizzes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedCategory.quizzes.slice(0, 3).map((quiz) => (
                          <div 
                            key={quiz.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-purple-200 transition-all cursor-pointer group"
                            onClick={() => navigate(`/quiz-preview/${quiz.id}`)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0 mr-2">
                                <h4 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors">{quiz.title}</h4>
                                {quiz.creatorName && (
                                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {quiz.creatorName}
                                  </p>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap shrink-0 ${getDifficultyColor(quiz.difficulty || 'medium')}`}>
                                {quiz.difficulty === 'easy' ? t('quiz.difficulty.easy') : quiz.difficulty === 'hard' ? t('quiz.difficulty.hard') : t('quiz.difficulty.medium')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[36px]">
                              {stripHtml(quiz.description || '') || t('categories.noDescription')}</p>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> {quiz.questionCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Play className="w-3 h-3" /> {quiz.playCount}
                                </span>
                              </div>
                              {(quiz.avgScore ?? 0) > 0 && (
                                <span className="text-amber-600 font-medium">{quiz.avgScore}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-xl">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">{t('categories.noQuizzesInCategory')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tab: Quizzes List */}
              {detailTab === 'quizzes' && (
                <div className="space-y-4">
                  {/* Search and Sort */}
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={quizSearchTerm}
                        onChange={(e) => setQuizSearchTerm(e.target.value)}
                        placeholder={t('categories.searchQuizzes', 'Tìm quiz...')}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-500">{t('sortBy')}:</span>
                      <select
                        value={quizSortBy}
                        onChange={(e) => setQuizSortBy(e.target.value as typeof quizSortBy)}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="createdAt">{t('categories.sortByDate', 'Mới nhất')}</option>
                        <option value="playCount">{t('categories.sortByPlays', 'Lượt chơi')}</option>
                        <option value="avgScore">{t('categories.sortByScore', 'Điểm TB')}</option>
                        <option value="title">{t('categories.sortByName', 'Tên')}</option>
                      </select>
                      {/* Export Button */}
                      <button
                        onClick={() => {
                          if (!selectedCategory.quizzes?.length) return;
                          const csvContent = [
                            ['ID', 'Tên Quiz', 'Tác giả', 'Số câu', 'Lượt chơi', 'Điểm TB', 'Độ khó', 'Trạng thái', 'Thời gian', 'Điểm đậu', 'Ngày tạo'].join(','),
                            ...selectedCategory.quizzes.map(q => [
                              q.id,
                              `"${q.title.replace(/"/g, '""')}"`,
                              `"${q.creatorName || ''}"`,
                              q.questionCount,
                              q.playCount,
                              q.avgScore || 0,
                              q.difficulty || 'medium',
                              q.status,
                              q.timeLimit || 30,
                              q.passingScore || 60,
                              q.createdAt.toLocaleDateString('vi-VN')
                            ].join(','))
                          ].join('\n');
                          const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedCategory.name}_quizzes_${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success(t('categories.exportSuccess', 'Xuất danh sách thành công!'));
                        }}
                        className="px-3 py-2 bg-green-50 text-green-600 border border-green-200 rounded-xl text-sm hover:bg-green-100 transition-colors flex items-center gap-1"
                        title={t('categories.exportCSV', 'Xuất CSV')}
                      >
                        📥 {t('export', 'Xuất')}
                      </button>
                    </div>
                  </div>
                  
                  {/* Quiz Count */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{t('categories.totalQuizzes', 'Tổng số')}: {selectedCategory.quizzes?.length || 0} quiz</span>
                    {quizSearchTerm && (
                      <span>{t('categories.found', 'Tìm thấy')}: {
                        selectedCategory.quizzes?.filter(q => 
                          q.title.toLowerCase().includes(quizSearchTerm.toLowerCase()) ||
                          q.description?.toLowerCase().includes(quizSearchTerm.toLowerCase())
                        ).length || 0
                      } quiz</span>
                    )}
                  </div>
                  
                  {loadingQuizzes ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-purple-600"></div>
                      <span className="ml-3 text-gray-500">{t('loading')}</span>
                    </div>
                  ) : selectedCategory.quizzes && selectedCategory.quizzes.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        let filtered = selectedCategory.quizzes.filter(q => 
                          !quizSearchTerm || 
                          q.title.toLowerCase().includes(quizSearchTerm.toLowerCase()) ||
                          q.description?.toLowerCase().includes(quizSearchTerm.toLowerCase())
                        );
                        
                        // Sort
                        filtered.sort((a, b) => {
                          switch (quizSortBy) {
                            case 'playCount': return b.playCount - a.playCount;
                            case 'avgScore': return (b.avgScore || 0) - (a.avgScore || 0);
                            case 'title': return a.title.localeCompare(b.title);
                            default: return b.createdAt.getTime() - a.createdAt.getTime();
                          }
                        });
                        
                        return filtered.map((quiz, index) => (
                          <div 
                            key={quiz.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer"
                            onClick={() => navigate(`/quiz-preview/${quiz.id}`)}
                          >
                            <div className="flex items-start gap-4">
                              <span className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 font-bold shrink-0">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 hover:text-purple-600">{quiz.title}</h4>
                                    {quiz.creatorName && (
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {t('categories.by', 'Bởi')}: {quiz.creatorName}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(quiz.difficulty || 'medium')}`}>
                                      {quiz.difficulty === 'easy' ? t('quiz.difficulty.easy') : quiz.difficulty === 'hard' ? t('quiz.difficulty.hard') : t('quiz.difficulty.medium')}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      quiz.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                      quiz.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {quiz.status === 'approved' ? t('categories.approved', 'Đã duyệt') : 
                                       quiz.status === 'pending' ? t('categories.pending', 'Chờ duyệt') : 
                                       t('categories.rejected', 'Từ chối')}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-1 mb-3">
                                  {stripHtml(quiz.description || '') || t('categories.noDescription')}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                    <BookOpen className="w-3 h-3" /> {quiz.questionCount} {t('questions')}
                                  </span>
                                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                    <Play className="w-3 h-3" /> {quiz.playCount.toLocaleString()} {t('plays')}
                                  </span>
                                  <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg" title={t('categories.timeLimit', 'Thời gian')}>
                                    ⏱️ {quiz.timeLimit || 30}s
                                  </span>
                                  <span className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-1 rounded-lg" title={t('categories.passingScore', 'Điểm đậu')}>
                                    🎯 {quiz.passingScore || 60}%
                                  </span>
                                  {(quiz.avgScore ?? 0) > 0 && (
                                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                                      <Award className="w-3 h-3" /> {quiz.avgScore}%
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-gray-400 ml-auto">
                                    📅 {quiz.createdAt.toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                              </div>
                              <ExternalLink className="w-5 h-5 text-gray-300 shrink-0 mt-2" />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">{t('categories.noQuizzesInCategory')}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Tab: Analytics */}
              {detailTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Performance Metrics */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                      {t('categories.analytics.performance', 'Hiệu suất danh mục')}
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-purple-600">{selectedCategory.quizCount || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">{t('categories.analytics.totalQuizzes', 'Tổng quiz')}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-indigo-600">
                          {selectedCategory.quizzes?.reduce((acc, q) => acc + q.questionCount, 0) || 0}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{t('categories.analytics.totalQuestions', 'Tổng câu hỏi')}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-green-600">
                          {selectedCategory.quizCount && selectedCategory.stats?.totalPlays 
                            ? Math.round(selectedCategory.stats.totalPlays / selectedCategory.quizCount) 
                            : 0}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{t('categories.analytics.avgPlaysPerQuiz', 'TB lượt/quiz')}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-3xl font-bold text-amber-600">
                          {selectedCategory.quizzes?.filter(q => q.status === 'approved').length || 0}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{t('categories.analytics.approvedQuizzes', 'Đã duyệt')}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Difficulty Distribution */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {t('categories.analytics.difficultyDist', 'Phân bố độ khó')}
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const quizzes = selectedCategory.quizzes || [];
                        const easy = quizzes.filter(q => q.difficulty === 'easy').length;
                        const medium = quizzes.filter(q => q.difficulty === 'medium').length;
                        const hard = quizzes.filter(q => q.difficulty === 'hard').length;
                        const total = quizzes.length || 1;
                        
                        return (
                          <>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-green-600">{t('quiz.difficulty.easy', 'Dễ')}</span>
                                <span className="text-sm text-gray-500">{easy} ({Math.round(easy/total*100)}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-3">
                                <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${easy/total*100}%` }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-amber-600">{t('quiz.difficulty.medium', 'Trung bình')}</span>
                                <span className="text-sm text-gray-500">{medium} ({Math.round(medium/total*100)}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-3">
                                <div className="bg-amber-500 h-3 rounded-full transition-all" style={{ width: `${medium/total*100}%` }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-red-600">{t('quiz.difficulty.hard', 'Khó')}</span>
                                <span className="text-sm text-gray-500">{hard} ({Math.round(hard/total*100)}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-3">
                                <div className="bg-red-500 h-3 rounded-full transition-all" style={{ width: `${hard/total*100}%` }}></div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Time & Score Statistics */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {t('categories.analytics.timeScoreStats', 'Thống kê thời gian & điểm')}
                    </h3>
                    {(() => {
                      const quizzes = selectedCategory.quizzes || [];
                      if (quizzes.length === 0) return <p className="text-gray-500 text-center py-4">{t('categories.noQuizzesInCategory')}</p>;
                      
                      const avgTimeLimit = Math.round(quizzes.reduce((acc, q) => acc + (q.timeLimit || 30), 0) / quizzes.length);
                      const avgPassingScore = Math.round(quizzes.reduce((acc, q) => acc + (q.passingScore || 60), 0) / quizzes.length);
                      const avgQuestions = Math.round(quizzes.reduce((acc, q) => acc + q.questionCount, 0) / quizzes.length);
                      const totalQuestions = quizzes.reduce((acc, q) => acc + q.questionCount, 0);
                      const avgScoreAll = Math.round(quizzes.reduce((acc, q) => acc + (q.avgScore || 0), 0) / quizzes.length);
                      
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{avgTimeLimit}s</p>
                            <p className="text-xs text-blue-600 mt-1">{t('categories.analytics.avgTimeLimit', 'TB thời gian/câu')}</p>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-purple-600">{avgPassingScore}%</p>
                            <p className="text-xs text-purple-600 mt-1">{t('categories.analytics.avgPassingScore', 'TB điểm đậu')}</p>
                          </div>
                          <div className="bg-indigo-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-indigo-600">{avgQuestions}</p>
                            <p className="text-xs text-indigo-600 mt-1">{t('categories.analytics.avgQuestions', 'TB câu hỏi/quiz')}</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{totalQuestions}</p>
                            <p className="text-xs text-green-600 mt-1">{t('categories.analytics.totalQuestions', 'Tổng câu hỏi')}</p>
                          </div>
                          <div className="bg-amber-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-amber-600">{avgScoreAll}%</p>
                            <p className="text-xs text-amber-600 mt-1">{t('categories.analytics.avgScoreAll', 'Điểm TB chung')}</p>
                          </div>
                          <div className="bg-cyan-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-cyan-600">
                              {quizzes.filter(q => q.status === 'approved').length}/{quizzes.length}
                            </p>
                            <p className="text-xs text-cyan-600 mt-1">{t('categories.analytics.approvedRatio', 'Đã duyệt/Tổng')}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Top Performers */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {t('categories.analytics.topPerformers', 'Quiz phổ biến nhất')}
                    </h3>
                    {selectedCategory.quizzes && selectedCategory.quizzes.length > 0 ? (
                      <div className="space-y-3">
                        {[...selectedCategory.quizzes]
                          .sort((a, b) => b.playCount - a.playCount)
                          .slice(0, 5)
                          .map((quiz, idx) => (
                            <div 
                              key={quiz.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                              onClick={() => navigate(`/quiz-preview/${quiz.id}`)}
                            >
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                idx === 1 ? 'bg-gray-300 text-gray-700' :
                                idx === 2 ? 'bg-amber-600 text-white' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{quiz.title}</p>
                                <p className="text-xs text-gray-500">
                                  {quiz.playCount.toLocaleString()} {t('plays')} • {quiz.avgScore || 0}% {t('avgScore')}
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">{t('categories.noQuizzesInCategory')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? t('categories.editTitle', 'Chỉnh sửa danh mục') : t('categories.addTitle', 'Thêm danh mục mới')}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Preview */}
            <div className={`bg-gradient-to-r ${getGradientClass(formData.color)} rounded-xl p-4 mb-6`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                  {formData.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white">{formData.name || t('categories.namePlaceholder')}</h3>
                  <p className="text-white/80 text-sm">{t('preview')}</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('categories.name', 'Tên danh mục')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder={t('categories.namePlaceholder', 'Nhập tên danh mục')}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('categories.description', 'Mô tả')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all"
                  rows={3}
                  placeholder={t('categories.descriptionPlaceholder', 'Mô tả ngắn về danh mục')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-2.5 text-xl border-2 rounded-xl hover:bg-gray-50 transition-all ${
                        formData.icon === icon ? 'border-purple-500 bg-purple-50 scale-110' : 'border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('categories.color', 'Màu sắc')}
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-2 border-2 rounded-xl hover:bg-gray-50 transition-all ${
                        formData.color === color.value ? 'border-purple-500 bg-purple-50 scale-105' : 'border-gray-200'
                      }`}
                    >
                      <div className={`w-6 h-6 ${color.class} rounded-full mx-auto`}></div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingCategory(null);
                    setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('cancel', 'Hủy')}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? t('update', 'Cập nhật') : t('categories.create', 'Tạo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;

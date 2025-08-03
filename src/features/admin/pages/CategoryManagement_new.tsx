import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';
import { toast } from 'react-toastify';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  FolderOpen,
  BookOpen,
  User,
  BarChart3,
  Eye
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: Date;
  quizCount?: number;
}

const CategoryManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: 'blue'
  });

  const colors = [
    { value: 'blue', label: 'Xanh dương', class: 'bg-blue-500' },
    { value: 'green', label: 'Xanh lá', class: 'bg-green-500' },
    { value: 'purple', label: 'Tím', class: 'bg-purple-500' },
    { value: 'red', label: 'Đỏ', class: 'bg-red-500' },
    { value: 'yellow', label: 'Vàng', class: 'bg-yellow-500' },
    { value: 'pink', label: 'Hồng', class: 'bg-pink-500' },
    { value: 'indigo', label: 'Chàm', class: 'bg-indigo-500' },
    { value: 'gray', label: 'Xám', class: 'bg-gray-500' }
  ];

  const icons = ['📚', '🔬', '💻', '🎨', '📊', '🌍', '🏃‍♂️', '🎵', '🍳', '📈', '🧮', '📝'];

  // Kiểm tra quyền admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Truy cập bị từ chối</h2>
          <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      
      const loadedCategories: Category[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Đếm số quiz trong danh mục này
        const quizzesRef = collection(db, 'quizzes');
        const quizzesSnapshot = await getDocs(query(quizzesRef, where('category', '==', data.name)));
        
        loadedCategories.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          icon: data.icon,
          color: data.color,
          createdAt: data.createdAt?.toDate() || new Date(),
          quizCount: quizzesSnapshot.size
        });
      }
      
      setCategories(loadedCategories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
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
        
        toast.success('Danh mục đã được cập nhật');
      } else {
        // Add new category
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
          quizCount: 0
        };
        
        setCategories(prev => [newCategory, ...prev]);
        toast.success('Danh mục mới đã được tạo');
      }
      
      // Reset form
      setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
      setShowAddForm(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Không thể lưu danh mục');
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

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${categoryName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      toast.success('Danh mục đã được xóa');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Không thể xóa danh mục');
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500',
      gray: 'bg-gray-500'
    };
    return colorMap[color] || 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Danh mục</h1>
                <p className="text-gray-600">Tạo và quản lý các danh mục quiz</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Thêm danh mục
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Admin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng Danh mục</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Danh mục có Quiz</p>
                <p className="text-2xl font-bold text-green-600">{categories.filter(c => c.quizCount && c.quizCount > 0).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng Quiz</p>
                <p className="text-2xl font-bold text-blue-600">{categories.reduce((sum, c) => sum + (c.quizCount || 0), 0)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Danh mục Trống</p>
                <p className="text-2xl font-bold text-orange-600">{categories.filter(c => !c.quizCount || c.quizCount === 0).length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có danh mục nào</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Không tìm thấy danh mục nào phù hợp với từ khóa tìm kiếm.' : 'Chưa có danh mục nào được tạo.'}
            </p>
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingCategory(null);
                setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
            >
              <Plus className="w-5 h-5" />
              Tạo danh mục đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${getColorClass(category.color)} rounded-xl flex items-center justify-center text-2xl`}>
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.quizCount || 0} quiz</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Tạo: {category.createdAt.toLocaleDateString('vi-VN')}</span>
                  <span className={`px-2 py-1 rounded-full text-white ${getColorClass(category.color)}`}>
                    {category.color}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', icon: '📚', color: 'blue' });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Nhập tên danh mục..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  rows={3}
                  placeholder="Nhập mô tả danh mục..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-3 text-2xl border-2 rounded-lg hover:bg-gray-50 transition-colors ${
                        formData.icon === icon ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Màu sắc
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors ${
                        formData.color === color.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      <div className={`w-6 h-6 ${color.class} rounded-full mx-auto mb-1`}></div>
                      <span className="text-xs">{color.label}</span>
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? 'Cập nhật' : 'Tạo danh mục'}
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

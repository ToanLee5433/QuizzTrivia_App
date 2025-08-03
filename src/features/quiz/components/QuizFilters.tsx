import React, { useState } from 'react';

interface QuizFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  categories: string[];
  difficulties: string[];
  totalQuizzes: number;
  filteredCount: number;
}

interface FilterOptions {
  search: string;
  category: string;
  difficulty: string;
  sortBy: string;
  showCompleted: boolean;
  tags: string[];
  minQuestions: number;
  maxDuration: number;
}

const QuizFilters: React.FC<QuizFiltersProps> = ({
  onFilterChange,
  categories,
  difficulties,
  totalQuizzes,
  filteredCount
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'all',
    difficulty: 'all',
    sortBy: 'newest',
    showCompleted: true,
    tags: [],
    minQuestions: 0,
    maxDuration: 120
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      search: '',
      category: 'all',
      difficulty: 'all',
      sortBy: 'newest',
      showCompleted: true,
      tags: [],
      minQuestions: 0,
      maxDuration: 120
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      {/* Quick Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div className="text-sm text-gray-600">
            Hiển thị <span className="font-semibold text-blue-600">{filteredCount}</span> / {totalQuizzes} quiz
          </div>
          {filteredCount !== totalQuizzes && (
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              🔄 Xóa bộ lọc
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
        >
          <span>{showAdvanced ? 'Ẩn' : 'Hiện'} tùy chọn nâng cao</span>
          <svg 
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm quiz..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Category */}
        <select 
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">🏷️ Tất cả danh mục</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        {/* Difficulty */}
        <select 
          value={filters.difficulty}
          onChange={(e) => updateFilter('difficulty', e.target.value)}
          className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">📊 Tất cả độ khó</option>
          {difficulties.map(d => <option key={d} value={d}>
            {d === 'easy' ? '😊 Dễ' : d === 'medium' ? '😐 Trung bình' : '😤 Khó'}
          </option>)}
        </select>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Sort Options */}
            <select 
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">🆕 Mới nhất</option>
              <option value="oldest">📅 Cũ nhất</option>
              <option value="popular">🔥 Phổ biến nhất</option>
              <option value="difficulty">📈 Theo độ khó</option>
              <option value="questions">🔢 Theo số câu hỏi</option>
              <option value="duration">⏱️ Theo thời lượng</option>
            </select>

            {/* Min Questions */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Số câu hỏi tối thiểu: {filters.minQuestions}</label>
              <input
                type="range"
                min="0"
                max="50"
                value={filters.minQuestions}
                onChange={(e) => updateFilter('minQuestions', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Max Duration */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Thời lượng tối đa: {filters.maxDuration} phút</label>
              <input
                type="range"
                min="5"
                max="120"
                value={filters.maxDuration}
                onChange={(e) => updateFilter('maxDuration', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filters.showCompleted}
                onChange={(e) => updateFilter('showCompleted', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Hiện quiz đã hoàn thành
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizFilters;

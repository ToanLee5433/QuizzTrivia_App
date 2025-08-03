import React, { useState } from 'react';
import { seedTestData } from '../../lib/utils/seedTestData';
import { toast } from 'react-toastify';

const TestDataSeeder: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleSeedData = async () => {
    setLoading(true);
    try {
      await seedTestData();
      toast.success('Đã tạo dữ liệu test thành công!');
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Có lỗi khi tạo dữ liệu test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-bold text-yellow-800 mb-2">Công cụ phát triển</h3>
      <p className="text-yellow-700 mb-4">
        Tạo dữ liệu mẫu để test chức năng đánh giá quiz
      </p>
      <button
        onClick={handleSeedData}
        disabled={loading}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
      >
        {loading ? 'Đang tạo...' : 'Tạo dữ liệu test'}
      </button>
    </div>
  );
};

export default TestDataSeeder;

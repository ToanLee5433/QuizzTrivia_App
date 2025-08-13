import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Database, Loader, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminUtilities: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const { t } = useTranslation();

  const handleCreateTestQuizzes = async () => {
    if (created) {
      toast.warning(t('admin.utilities.createTestQuizzes.alreadyCreated'));
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement createTestQuizzes function if needed
      console.log('Creating test quizzes...');
      setCreated(true);
      toast.success(t('admin.utilities.createTestQuizzes.success'));
    } catch (error) {
      console.error('Error creating test quizzes:', error);
      toast.error(t('admin.utilities.createTestQuizzes.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">{t('admin.utilities.title')}</h2>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{t('admin.utilities.createTestQuizzes.title')}</h3>
          <p className="text-gray-600 mb-4">
            {t('admin.utilities.createTestQuizzes.desc')}
          </p>
          
          <button
            onClick={handleCreateTestQuizzes}
            disabled={loading || created}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              created
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : loading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {t('admin.utilities.createTestQuizzes.creating')}
              </>
            ) : created ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('admin.utilities.createTestQuizzes.created')}
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                {t('admin.utilities.createTestQuizzes.button')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUtilities;

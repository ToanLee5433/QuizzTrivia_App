import React, { useState } from 'react';
import { Wrench, CheckCircle, AlertCircle, Loader2, TrendingUp, Calculator } from 'lucide-react';
import { fixQuizTimestamps, fixAllQuizTimestamps } from '../../../scripts/fixQuizTimestamps';
import { recalculateQuizStats, recalculateAllQuizStats } from '../../../services/recalculateQuizStats';

export const AdminQuizUtilities: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [quizId, setQuizId] = useState('');

  const handleFixSingleQuiz = async () => {
    if (!quizId.trim()) {
      setResult({ type: 'error', message: 'Please enter a Quiz ID' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      await fixQuizTimestamps(quizId.trim());
      setResult({ 
        type: 'success', 
        message: `✅ Successfully fixed timestamps for quiz: ${quizId}` 
      });
    } catch (error: any) {
      console.error('Error fixing quiz:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Error: ${error.message || 'Failed to fix timestamps'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFixAllQuizzes = async () => {
    if (!confirm('⚠️ This will scan and fix ALL quizzes with placeholder timestamps. Continue?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      await fixAllQuizTimestamps();
      setResult({ 
        type: 'success', 
        message: '✅ Successfully fixed all quizzes with placeholder timestamps' 
      });
    } catch (error: any) {
      console.error('Error fixing quizzes:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Error: ${error.message || 'Failed to fix timestamps'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateStats = async () => {
    if (!quizId.trim()) {
      setResult({ type: 'error', message: 'Please enter a Quiz ID' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      await recalculateQuizStats(quizId.trim());
      setResult({ 
        type: 'success', 
        message: `✅ Successfully recalculated stats for quiz: ${quizId}` 
      });
    } catch (error: any) {
      console.error('Error recalculating stats:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Error: ${error.message || 'Failed to recalculate stats'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateAllStats = async () => {
    if (!confirm('⚠️ This will recalculate stats for ALL quizzes. Continue?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      await recalculateAllQuizStats();
      setResult({ 
        type: 'success', 
        message: '✅ Successfully recalculated stats for all quizzes' 
      });
    } catch (error: any) {
      console.error('Error recalculating stats:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Error: ${error.message || 'Failed to recalculate stats'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Quiz Utilities</h1>
          </div>
          <p className="text-gray-600">Admin tools to fix and maintain quiz data</p>
        </div>

        {/* Fix Single Quiz */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Fix Single Quiz Timestamps
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Fix createdAt/updatedAt timestamps for a specific quiz that has serverTimestamp placeholders.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz ID
              </label>
              <input
                type="text"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                placeholder="Enter quiz ID..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleFixSingleQuiz}
              disabled={loading || !quizId.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5" />
                  Fix This Quiz
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fix All Quizzes */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            Fix All Quizzes (Batch)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Scan all quizzes and fix any that have serverTimestamp placeholders.
            This operation may take a while.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> This will scan and update ALL quizzes in the database.
                Only use this if you know what you're doing.
              </span>
            </p>
          </div>

          <button
            onClick={handleFixAllQuizzes}
            disabled={loading}
            className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning and Fixing...
              </>
            ) : (
              <>
                <Wrench className="w-5 h-5" />
                Fix All Quizzes
              </>
            )}
          </button>
        </div>

        {/* Recalculate Single Quiz Stats */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            Recalculate Single Quiz Stats
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Recalculate completion stats (completions, averageScore, completionRate) from quiz results for a specific quiz.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz ID
              </label>
              <input
                type="text"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                placeholder="Enter quiz ID (e.g., 4Ojcp76MooLWyV7V1Ehr)..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleRecalculateStats}
              disabled={loading || !quizId.trim()}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Recalculating...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  Recalculate This Quiz
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recalculate All Quiz Stats */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Recalculate All Quiz Stats (Batch)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Recalculate completion stats for ALL quizzes in the system. This will update completions, averageScore, and completionRate fields.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> This will recalculate stats for ALL quizzes. May take several minutes.
              </span>
            </p>
          </div>

          <button
            onClick={handleRecalculateAllStats}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Recalculating All...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Recalculate All Quiz Stats
              </>
            )}
          </button>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`rounded-2xl shadow-lg border p-6 ${
              result.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.type === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h3
                  className={`font-bold mb-1 ${
                    result.type === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.type === 'success' ? 'Success!' : 'Error'}
                </h3>
                <p
                  className={`text-sm ${
                    result.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-3">How to use:</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>
              <strong>Fix Single Quiz:</strong> Enter the quiz ID from the URL (e.g., from /quiz/YOUR_QUIZ_ID)
              and click "Fix This Quiz"
            </li>
            <li>
              <strong>Fix All Quizzes:</strong> Click "Fix All Quizzes" to scan and fix all quizzes
              with placeholder timestamps
            </li>
            <li>
              The script will update createdAt/updatedAt using the approvedAt timestamp if available,
              or use the current timestamp
            </li>
            <li>
              Check the browser console (F12) for detailed logs
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AdminQuizUtilities;

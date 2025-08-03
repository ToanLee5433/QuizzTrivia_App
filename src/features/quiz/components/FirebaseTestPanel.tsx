import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { testFirebaseConnection, createSampleReviews, getAllReviews } from '../services/testFirebaseConnection';
import { createSampleQuizzes, getAllQuizzes } from '../services/sampleQuizService';
import { reviewService } from '../services/reviewService';

interface FirebaseTestProps {
  quizId?: string;
}

const FirebaseTestPanel: React.FC<FirebaseTestProps> = ({ quizId = 'sample-quiz-1' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [reviewCount, setReviewCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    checkConnection();
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      addTestResult('🔥 Checking Firebase connection...');
      const isConnected = await testFirebaseConnection();
      
      if (isConnected) {
        setConnectionStatus('connected');
        addTestResult('✅ Firebase connection successful');
        
        // Get current review count
        const reviews = await getAllReviews();
        setReviewCount(reviews.length);
        addTestResult(`📊 Found ${reviews.length} reviews in database`);
        
        // Get current quiz count
        const quizzes = await getAllQuizzes();
        setQuizCount(quizzes.length);
        addTestResult(`📝 Found ${quizzes.length} quizzes in database`);
      } else {
        setConnectionStatus('failed');
        addTestResult('❌ Firebase connection failed');
      }
    } catch (error) {
      setConnectionStatus('failed');
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createSampleData = async () => {
    setIsLoading(true);
    try {
      addTestResult('📝 Creating sample quiz and review data...');
      
      // First create sample quizzes
      const quizzes = await createSampleQuizzes();
      addTestResult(`✅ Created ${quizzes.length} sample quizzes`);
      
      // Then create sample reviews
      await createSampleReviews();
      addTestResult('✅ Sample reviews created successfully');
      
      // Refresh counts
      const reviews = await getAllReviews();
      setReviewCount(reviews.length);
      const allQuizzes = await getAllQuizzes();
      setQuizCount(allQuizzes.length);
      
      toast.success('Sample data created successfully!');
    } catch (error) {
      addTestResult(`❌ Error creating sample data: ${error}`);
      toast.error('Failed to create sample data');
    } finally {
      setIsLoading(false);
    }
  };

  const testReviewLoad = async () => {
    setIsLoading(true);
    try {
      addTestResult(`🔍 Testing review load for quiz: ${quizId}`);
      const reviews = await reviewService.getQuizReviews(quizId);
      addTestResult(`✅ Loaded ${reviews.length} reviews for quiz ${quizId}`);
      
      if (reviews.length > 0) {
        addTestResult(`📝 First review: ${reviews[0].comment.substring(0, 50)}...`);
      }
      
      toast.success(`Loaded ${reviews.length} reviews`);
    } catch (error) {
      addTestResult(`❌ Error loading reviews: ${error}`);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">🔥 Firebase Review System Test</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
          connectionStatus === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {connectionStatus === 'connected' ? '✅ Connected' :
           connectionStatus === 'failed' ? '❌ Failed' :
           '🔄 Checking...'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{reviewCount}</div>
          <div className="text-sm text-blue-800">Total Reviews</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{connectionStatus === 'connected' ? '✅' : '❌'}</div>
          <div className="text-sm text-green-800">Firebase Status</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{quizCount}</div>
          <div className="text-sm text-purple-800">Sample Quizzes</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={checkConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          🔄 Test Connection
        </button>
        
        <button
          onClick={createSampleData}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          📝 Create Sample Quizzes & Reviews
        </button>
        
        <button
          onClick={testReviewLoad}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          🔍 Test Review Load
        </button>
        
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          🗑️ Clear Logs
        </button>
      </div>

      {/* Test Results Log */}
      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
        <div className="text-sm font-medium text-gray-700 mb-2">📋 Test Results:</div>
        {testResults.length === 0 ? (
          <div className="text-gray-500 text-sm">No test results yet. Click a test button to start.</div>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-xs font-mono text-gray-600 break-all">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default FirebaseTestPanel;

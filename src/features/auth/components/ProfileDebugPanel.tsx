import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../lib/store';

const ProfileDebugPanel: React.FC = () => {
  const userResults = useSelector((state: RootState) => state.quiz.userResults);
  
  useEffect(() => {
    console.log('🔍 [ProfileDebugPanel] Current userResults:', userResults);
    
    if (userResults.length > 0) {
      console.log('🔍 [ProfileDebugPanel] Sample result structure:', {
        firstResult: userResults[0],
        resultId: userResults[0].id,
        isValidDocumentId: userResults[0].id && userResults[0].id.length > 10, // Firestore IDs are usually long
        linkPath: `/results/${userResults[0].id}`,
        fields: Object.keys(userResults[0])
      });
      
      // Check if any results have invalid IDs
      userResults.forEach((result, index) => {
        const isLikelyDocId = result.id && result.id.length > 15 && !result.id.includes('-');
        const isLikelyQuizId = result.id && (result.id.length < 15 || result.id.includes('-'));
        
        console.log(`📋 Result ${index + 1} ID analysis:`, {
          id: result.id,
          length: result.id?.length,
          likelyFirestoreDocId: isLikelyDocId,
          likelyQuizId: isLikelyQuizId,
          score: result.score,
          correctAnswers: result.correctAnswers,
          totalQuestions: result.totalQuestions
        });
      });
    }
  }, [userResults]);

  if (userResults.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Debug: No Results</h3>
        <p className="text-yellow-700">No user results found in Redux store.</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Debug: User Results</h3>
      <div className="space-y-2 text-sm">
        <p><strong>Total Results:</strong> {userResults.length}</p>
        {userResults.slice(0, 3).map((result, index) => (
          <div key={result.id} className="bg-white p-2 rounded border">
            <p><strong>Result {index + 1}:</strong></p>
            <p>ID: <code className="bg-gray-100 px-1 rounded">{result.id}</code></p>
            <p>Score: {result.score} | Correct: {result.correctAnswers}/{result.totalQuestions}</p>
            <p>Link: <code className="bg-gray-100 px-1 rounded">/results/{result.id}</code></p>
            <p>ID Type: {result.id?.length > 15 ? '✅ Firestore Doc ID' : '❌ Possibly Quiz ID'}</p>
          </div>
        ))}
        {userResults.length > 3 && (
          <p className="text-gray-600">... and {userResults.length - 3} more results</p>
        )}
      </div>
    </div>
  );
};

export default ProfileDebugPanel;

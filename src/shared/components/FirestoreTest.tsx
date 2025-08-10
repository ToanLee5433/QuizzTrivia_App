import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const FirestoreTest: React.FC = () => {
  const [status, setStatus] = useState('Testing...');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic Firestore connection
        const testQuery = await getDocs(collection(db, 'quizReviews'));
        setStatus(`Connected! Found ${testQuery.size} reviews in total`);
      } catch (error) {
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-blue-50 mb-4">
      <h4 className="font-bold mb-2">Firestore Connection Test</h4>
      <p>{status}</p>
    </div>
  );
};

export default FirestoreTest;

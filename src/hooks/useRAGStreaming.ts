/**
 * 🚀 RAG Streaming Hook
 * 
 * Custom hook for streaming RAG responses via Firestore real-time updates.
 * Provides a ChatGPT-like experience where text appears progressively.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getFirestore, 
  doc, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/config';

const db = getFirestore(app);
const functions = getFunctions(app);

// Session status from backend
type SessionStatus = 'pending' | 'processing' | 'completed' | 'error';

// Streaming session document structure
interface StreamingSession {
  status: SessionStatus;
  userId: string;
  question: string;
  chunks: string[];
  currentText: string;
  citations?: any[];
  quizRecommendations?: any[];
  usedChunks?: number;
  processingTime?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  error?: string;
}

// Hook return type
interface UseRAGStreamingReturn {
  // Current streaming text
  streamingText: string;
  
  // Session status
  status: SessionStatus | 'idle';
  
  // Final response data
  citations: any[];
  quizRecommendations: any[];
  usedChunks: number;
  processingTime: number;
  
  // Error message if any
  error: string | null;
  
  // Loading state
  isLoading: boolean;
  
  // Start a new streaming request
  startStreaming: (question: string, history: any[], topK?: number, targetLang?: string) => Promise<void>;
  
  // Cancel current streaming
  cancel: () => void;
}

export function useRAGStreaming(): UseRAGStreamingReturn {
  const [streamingText, setStreamingText] = useState('');
  const [status, setStatus] = useState<SessionStatus | 'idle'>('idle');
  const [citations, setCitations] = useState<any[]>([]);
  const [quizRecommendations, setQuizRecommendations] = useState<any[]>([]);
  const [usedChunks, setUsedChunks] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Unsubscribe function ref
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Current session ID
  const sessionIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Cancel current streaming
  const cancel = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    sessionIdRef.current = null;
    setIsLoading(false);
    setStatus('idle');
  }, []);

  // Start streaming
  const startStreaming = useCallback(async (
    question: string,
    history: any[],
    topK: number = 4,
    targetLang: string = 'vi'
  ) => {
    // Cancel any existing stream
    cancel();
    
    // Reset state
    setStreamingText('');
    setStatus('pending');
    setCitations([]);
    setQuizRecommendations([]);
    setUsedChunks(0);
    setProcessingTime(0);
    setError(null);
    setIsLoading(true);

    try {
      // Call streaming function to create session
      const askRAGStreaming = httpsCallable(functions, 'askRAGStreaming', {
        timeout: 60000, // 60s to create session
      });
      
      const result = await askRAGStreaming({
        question,
        history,
        topK,
        targetLang,
      });
      
      const { sessionId, success } = result.data as { sessionId: string; success: boolean };
      
      if (!success || !sessionId) {
        throw new Error('Failed to create streaming session');
      }
      
      sessionIdRef.current = sessionId;
      
      // Listen to Firestore session document
      const sessionRef = doc(db, 'ragStreamingSessions', sessionId);
      
      unsubscribeRef.current = onSnapshot(
        sessionRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            console.warn('Session document not found');
            return;
          }
          
          const data = snapshot.data() as StreamingSession;
          
          // Update status
          setStatus(data.status);
          
          // Update streaming text
          if (data.currentText) {
            setStreamingText(data.currentText);
          }
          
          // Handle completion
          if (data.status === 'completed') {
            setCitations(data.citations || []);
            setQuizRecommendations(data.quizRecommendations || []);
            setUsedChunks(data.usedChunks || 0);
            setProcessingTime(data.processingTime || 0);
            setIsLoading(false);
            
            // Cleanup listener
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
              unsubscribeRef.current = null;
            }
          }
          
          // Handle error
          if (data.status === 'error') {
            setError(data.error || 'An error occurred');
            setIsLoading(false);
            
            // Cleanup listener
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
              unsubscribeRef.current = null;
            }
          }
        },
        (err) => {
          console.error('Firestore listener error:', err);
          setError('Connection lost. Please try again.');
          setIsLoading(false);
          setStatus('error');
        }
      );
      
    } catch (err) {
      console.error('Failed to start streaming:', err);
      
      let errorMessage = 'Failed to start streaming. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('unauthenticated')) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (err.message.includes('resource-exhausted')) {
          errorMessage = err.message;
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setStatus('error');
    }
  }, [cancel]);

  return {
    streamingText,
    status,
    citations,
    quizRecommendations,
    usedChunks,
    processingTime,
    error,
    isLoading,
    startStreaming,
    cancel,
  };
}

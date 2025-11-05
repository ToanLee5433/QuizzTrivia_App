import { useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase/config';
import { Quiz } from '../types';

interface AutoSaveOptions {
  quizId: string;
  quizData: Partial<Quiz>;
  enabled?: boolean;
  debounceMs?: number;
  onSave?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook tự động lưu draft quiz (giống Google Forms, Notion)
 * 
 * Features:
 * - Auto-save sau mỗi thay đổi (debounced)
 * - Visual indicator khi đang lưu
 * - Error handling
 * - Không lưu khi quiz đã approved
 */
export const useAutoSaveDraft = ({
  quizId,
  quizData,
  enabled = true,
  debounceMs = 2000,
  onSave,
  onError
}: AutoSaveOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const saveDraft = useCallback(async () => {
    if (!enabled || !quizId || isSavingRef.current) return;

    // Không auto-save nếu quiz không phải draft/rejected
    if (quizData.status && !['draft', 'rejected'].includes(quizData.status)) {
      return;
    }

    const dataString = JSON.stringify(quizData);
    
    // Không lưu nếu data không thay đổi
    if (dataString === lastSavedRef.current) return;

    try {
      isSavingRef.current = true;
      
      const quizRef = doc(db, 'quizzes', quizId);
      await setDoc(quizRef, {
        ...quizData,
        status: 'draft',
        updatedAt: serverTimestamp(),
        lastAutoSaved: serverTimestamp()
      }, { merge: true });

      lastSavedRef.current = dataString;
      onSave?.();
      
      console.log('✅ Draft auto-saved:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      onError?.(error as Error);
    } finally {
      isSavingRef.current = false;
    }
  }, [quizId, quizData, enabled, onSave, onError]);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [quizData, enabled, debounceMs, saveDraft]);

  // Save on unmount (khi rời trang)
  useEffect(() => {
    return () => {
      if (enabled && quizId) {
        saveDraft();
      }
    };
  }, [enabled, quizId, saveDraft]);

  return {
    saveDraft, // Manual save function
    isSaving: isSavingRef.current
  };
};

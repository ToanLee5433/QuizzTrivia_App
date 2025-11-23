import { db } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Fix quiz timestamps that still have serverTimestamp placeholder
 * This happens when quiz was created but timestamps weren't resolved
 */
export async function fixQuizTimestamps(quizId: string): Promise<void> {
  try {
    console.log(`🔧 Fixing timestamps for quiz: ${quizId}`);
    
    const quizRef = doc(db, 'quizzes', quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      console.error('❌ Quiz not found');
      return;
    }
    
    const data = quizDoc.data();
    const createdAt = data.createdAt;
    const updatedAt = data.updatedAt;
    
    console.log('Current timestamps:', { createdAt, updatedAt });
    
    // Check if timestamps are placeholders
    const isCreatedAtPlaceholder = 
      createdAt && 
      typeof createdAt === 'object' && 
      '_methodName' in createdAt && 
      createdAt._methodName === 'serverTimestamp';
      
    const isUpdatedAtPlaceholder = 
      updatedAt && 
      typeof updatedAt === 'object' && 
      '_methodName' in updatedAt && 
      updatedAt._methodName === 'serverTimestamp';
    
    if (isCreatedAtPlaceholder || isUpdatedAtPlaceholder) {
      console.log('⚠️ Found placeholder timestamps, fixing...');
      
      const updates: any = {};
      const now = Timestamp.now();
      
      // If createdAt is placeholder, set it to now
      if (isCreatedAtPlaceholder) {
        updates.createdAt = data.approvedAt || now;  // Use approvedAt if available
      }
      
      // If updatedAt is placeholder, set it to now
      if (isUpdatedAtPlaceholder) {
        updates.updatedAt = data.approvedAt || now;  // Use approvedAt if available
      }
      
      await updateDoc(quizRef, updates);
      
      console.log('✅ Timestamps fixed!');
      
      // Wait a bit and refetch to see actual values
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedDoc = await getDoc(quizRef);
      const updatedData = updatedDoc.data();
      
      console.log('New timestamps:', {
        createdAt: updatedData?.createdAt,
        updatedAt: updatedData?.updatedAt
      });
      
    } else {
      console.log('✅ Timestamps are already valid');
    }
    
  } catch (error) {
    console.error('❌ Error fixing timestamps:', error);
    throw error;
  }
}

/**
 * Fix all quizzes with placeholder timestamps
 */
export async function fixAllQuizTimestamps(): Promise<void> {
  const { collection, getDocs, query } = await import('firebase/firestore');
  
  console.log('🔧 Finding quizzes with placeholder timestamps...');
  
  // This is tricky - we can't query for objects with _methodName
  // So we need to get all quizzes and check client-side
  const quizzesQuery = query(collection(db, 'quizzes'));
  const snapshot = await getDocs(quizzesQuery);
  
  let fixedCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt;
    const updatedAt = data.updatedAt;
    
    const isCreatedAtPlaceholder = 
      createdAt && 
      typeof createdAt === 'object' && 
      '_methodName' in createdAt;
      
    const isUpdatedAtPlaceholder = 
      updatedAt && 
      typeof updatedAt === 'object' && 
      '_methodName' in updatedAt;
    
    if (isCreatedAtPlaceholder || isUpdatedAtPlaceholder) {
      console.log(`Found quiz with placeholder: ${doc.id}`);
      try {
        await fixQuizTimestamps(doc.id);
        fixedCount++;
      } catch (error) {
        console.error(`Failed to fix ${doc.id}:`, error);
      }
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} quizzes`);
}

// Usage in browser console:
// import { fixQuizTimestamps } from './src/scripts/fixQuizTimestamps';
// fixQuizTimestamps('your-quiz-id');

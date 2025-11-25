/**
 * 🗑️ Quiz Deletion Trigger
 * 
 * Automatically removes quiz from RAG index when quiz is deleted
 * Ensures index stays in sync with actual quiz database
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { removeQuizFromIndex } from '../lib/indexManager';
import { invalidateGlobalCache } from '../rag/optimizedRAG';

/**
 * Firestore Trigger: When quiz document is deleted
 * Removes corresponding chunks from RAG index
 */
export const onQuizDeleted = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .firestore.document('quizzes/{quizId}')
  .onDelete(async (snapshot, context) => {
    const quizId = context.params.quizId;
    const quizData = snapshot.data();

    console.log(`🗑️ Quiz ${quizId} deleted. Checking if removal from RAG index needed...`);

    // Only try to remove if quiz was approved (had been indexed)
    if (quizData?.status === 'approved') {
      console.log(`📝 Deleted quiz ${quizId} was approved. Removing from RAG index...`);
      
      try {
        await removeQuizFromIndex(quizId);
        
        // Invalidate global cache
        invalidateGlobalCache();
        
        // Log deletion
        await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
          type: 'quiz_deleted_from_index',
          quizId,
          quizTitle: quizData.title,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: true,
        });
        
        console.log(`✅ Deleted quiz ${quizId} removed from RAG index`);
      } catch (error) {
        console.error(`❌ Failed to remove deleted quiz ${quizId} from index:`, error);
        
        // Log error but don't fail - quiz is already deleted
        await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
          type: 'quiz_delete_from_index_failed',
          quizId,
          quizTitle: quizData.title,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      console.log(`ℹ️ Deleted quiz ${quizId} had status '${quizData?.status}', was not in index`);
    }
  });

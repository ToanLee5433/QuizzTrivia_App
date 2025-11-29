/**
 * 🔄 Rebuild Full Index Cloud Function
 * 
 * Admin function to rebuild the entire RAG index from all approved quizzes
 * Use this to:
 * 1. Initialize index for the first time
 * 2. Recover from corrupted index
 * 3. Force re-index all content
 * 
 * Only callable by admin users
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStorage } from 'firebase-admin/storage';
import { invalidateGlobalCache } from './optimizedRAG';

const EMBEDDING_MODEL = 'text-embedding-004';

interface IndexedChunk {
  chunkId: string;
  text: string;
  title: string;
  sourceType: string;
  visibility: string;
  quizId?: string;
  embedding: number[];
  contentHash: string;
  createdAt: number;
}

interface VectorIndex {
  version: string;
  createdAt: number;
  totalChunks: number;
  chunks: IndexedChunk[];
  sources: Record<string, number>;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not set');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Simple hash function
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Admin Cloud Function to rebuild the entire index
 */
export const rebuildFullIndex = functions
  .region('us-central1')
  .runWith({
    secrets: ['GOOGLE_AI_API_KEY'],
    timeoutSeconds: 540, // 9 minutes (max)
    memory: '512MB',
  })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Bạn cần đăng nhập để sử dụng tính năng này'
      );
    }

    // Check if user is admin
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Chỉ admin mới có thể rebuild index'
      );
    }

    console.log(`🔄 Admin ${context.auth.uid} starting full index rebuild...`);

    try {
      const startTime = Date.now();

      // 1. Get all approved quizzes
      const quizzesSnapshot = await admin.firestore()
        .collection('quizzes')
        .where('status', '==', 'approved')
        .get();

      console.log(`📚 Found ${quizzesSnapshot.size} approved quizzes`);

      if (quizzesSnapshot.empty) {
        return {
          success: true,
          message: 'Không có quiz nào được approve',
          stats: { totalChunks: 0, quizCount: 0 }
        };
      }

      const chunks: IndexedChunk[] = [];
      let processedQuizzes = 0;
      let failedQuizzes = 0;

      // 2. Process each quiz
      for (const quizDoc of quizzesSnapshot.docs) {
        const quizId = quizDoc.id;
        const quizData = quizDoc.data();

        try {
          console.log(`📝 Processing quiz: ${quizData.title} (${quizId})`);

          const visibility = quizData.visibility || 'public';
          const hasPassword = !!(quizData.password || quizData.accessCode);

          // Strip HTML from description
          const cleanDescription = (quizData.description || '')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();

          // Extract quiz metadata with more details
          const quizText = `
Quiz: ${quizData.title}
Mô tả: ${cleanDescription || 'Không có mô tả'}
Danh mục: ${quizData.category || 'Chưa phân loại'}
Độ khó: ${quizData.difficulty || 'Trung bình'}
Chủ đề: ${quizData.tags?.join(', ') || quizData.category || 'Tổng hợp'}
          `.trim();

          // Generate embedding for metadata
          const metaEmbedding = await generateEmbedding(quizText);
          
          chunks.push({
            chunkId: `quiz_${quizId}_meta`,
            text: quizText,
            title: quizData.title,
            sourceType: 'quiz',
            visibility,
            quizId,
            embedding: metaEmbedding,
            contentHash: simpleHash(quizText),
            createdAt: quizData.createdAt?.toMillis?.() || Date.now(),
          });

          // Extract ALL questions for better search
          // Try both: subcollection (new structure) and field (old structure)
          let questions: any[] = [];

          // 1. First try subcollection
          const questionsSnap = await admin.firestore()
            .collection('quizzes')
            .doc(quizId)
            .collection('questions')
            .limit(100)
            .get();

          if (!questionsSnap.empty) {
            questions = questionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log(`   📋 Found ${questions.length} questions in subcollection for quiz ${quizId}`);
          }

          // 2. Fallback to questions field in quiz document
          if (questions.length === 0 && quizData.questions && Array.isArray(quizData.questions)) {
            questions = quizData.questions.map((q: any, idx: number) => ({
              id: `q_${idx}`,
              ...q
            }));
            console.log(`   📋 Found ${questions.length} questions in document field for quiz ${quizId}`);
          }

          console.log(`   📋 Total ${questions.length} questions for quiz ${quizId}`);

          for (const q of questions) {
            // Build comprehensive question text for better search
            let questionText = `Quiz: ${quizData.title}\n`;
            questionText += `Danh mục: ${quizData.category || 'Tổng hợp'}\n`;
            questionText += `Câu hỏi: ${q.text || q.question || ''}\n`;
            
            // Add answers
            if (q.answers && Array.isArray(q.answers)) {
              questionText += 'Đáp án:\n';
              q.answers.forEach((ans: any, i: number) => {
                const text = typeof ans === 'string' ? ans : ans.text;
                const isCorrect = typeof ans === 'object' && ans.isCorrect;
                questionText += `  ${String.fromCharCode(65 + i)}. ${text}${isCorrect ? ' (Đáp án đúng)' : ''}\n`;
              });
            } else if (q.options && Array.isArray(q.options)) {
              questionText += 'Đáp án:\n';
              q.options.forEach((opt: string, i: number) => {
                const isCorrect = i === q.correctAnswer || i === q.correct;
                questionText += `  ${String.fromCharCode(65 + i)}. ${opt}${isCorrect ? ' (Đáp án đúng)' : ''}\n`;
              });
            }
            
            // Add explanation if available
            if (q.explanation) {
              const cleanExplanation = q.explanation.replace(/<[^>]*>/g, '').trim();
              questionText += `Giải thích: ${cleanExplanation}\n`;
            }

            // Generate embedding
            const qEmbedding = await generateEmbedding(questionText.trim());
            
            chunks.push({
              chunkId: `quiz_${quizId}_q_${q.id}`,
              text: questionText.trim(),
              title: `${quizData.title} - Câu hỏi`,
              sourceType: 'question',
              visibility: hasPassword ? 'password' : visibility,
              quizId,
              embedding: qEmbedding,
              contentHash: simpleHash(questionText),
              createdAt: Date.now(),
            });

            // Rate limiting - wait 50ms between embeddings (faster but safe)
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          processedQuizzes++;
          console.log(`✅ Processed quiz ${quizId}: ${chunks.length} total chunks`);

        } catch (error) {
          console.error(`❌ Failed to process quiz ${quizId}:`, error);
          failedQuizzes++;
        }
      }

      // 3. Build index object
      const index: VectorIndex = {
        version: '2.0.0',
        createdAt: Date.now(),
        totalChunks: chunks.length,
        chunks,
        sources: {
          quiz: chunks.length,
        },
      };

      // 4. Save to Firebase Storage
      const bucket = getStorage().bucket('datn-quizapp.firebasestorage.app');
      const file = bucket.file('rag/indices/vector-index.json');
      
      await file.save(JSON.stringify(index), {
        contentType: 'application/json',
        metadata: {
          cacheControl: 'no-cache',
        },
      });

      // 5. Invalidate cache
      invalidateGlobalCache();

      const duration = Date.now() - startTime;

      // 6. Log event
      await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
        type: 'full_rebuild',
        userId: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: true,
        stats: {
          totalChunks: chunks.length,
          processedQuizzes,
          failedQuizzes,
          durationMs: duration,
        },
      });

      console.log(`🎉 Index rebuild complete: ${chunks.length} chunks in ${duration}ms`);

      return {
        success: true,
        message: `Đã rebuild index thành công!`,
        stats: {
          totalChunks: chunks.length,
          processedQuizzes,
          failedQuizzes,
          durationMs: duration,
        },
      };

    } catch (error) {
      console.error('❌ Index rebuild failed:', error);
      
      // Log error
      await admin.firestore().collection('system').doc('rag-logs').collection('events').add({
        type: 'full_rebuild_failed',
        userId: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new functions.https.HttpsError(
        'internal',
        `Lỗi rebuild index: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Get index statistics
 */
export const getIndexStats = functions
  .region('us-central1')
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30,
  })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Bạn cần đăng nhập'
      );
    }

    try {
      const bucket = getStorage().bucket('datn-quizapp.firebasestorage.app');
      const file = bucket.file('rag/indices/vector-index.json');
      
      const [exists] = await file.exists();
      if (!exists) {
        return {
          exists: false,
          message: 'Index chưa được tạo',
        };
      }

      const [content] = await file.download();
      const index = JSON.parse(content.toString()) as VectorIndex;

      // Count unique quizzes
      const quizIds = new Set<string>();
      index.chunks.forEach(chunk => {
        if (chunk.quizId) {
          quizIds.add(chunk.quizId);
        }
      });

      return {
        exists: true,
        version: index.version,
        totalChunks: index.totalChunks,
        uniqueQuizzes: quizIds.size,
        sources: index.sources,
        createdAt: new Date(index.createdAt).toISOString(),
      };

    } catch (error) {
      console.error('Error getting index stats:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Lỗi: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  });

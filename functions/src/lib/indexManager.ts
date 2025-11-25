/**
 * 📊 Vector Index Manager
 * 
 * High-level operations for managing the vector index
 * Provides CRUD operations with concurrency control
 */

import * as admin from 'firebase-admin';
import { IndexedChunk, ChunkMetadata } from '../types/genkit';
import { loadIndexFromStorage, saveIndexToStorage } from './storageUtils';
import { invalidateIndexCache } from './indexCache';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as CryptoJS from 'crypto-js';

// Load API key from environment variable
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Extract chunks from a quiz document
 */
export async function extractQuizChunks(
  quizId: string,
  quizData: any
): Promise<ChunkMetadata[]> {
  const chunks: ChunkMetadata[] = [];

  // Skip non-approved quizzes
  if (quizData.status !== 'approved') {
    return chunks;
  }

  const visibility = quizData.visibility || 'public';

  // Extract quiz metadata as chunk
  const quizText = `
Tiêu đề: ${quizData.title}
Mô tả: ${quizData.description || 'Không có mô tả'}
Danh mục: ${quizData.category || 'Chưa phân loại'}
Độ khó: ${quizData.difficulty || 'Chưa xác định'}
  `.trim();

  chunks.push({
    chunkId: `quiz_${quizId}_meta`,
    text: quizText,
    title: quizData.title,
    sourceType: 'quiz',
    visibility,
    quizId: visibility === 'password' ? quizId : undefined,
    createdAt: quizData.createdAt?.toMillis?.() || Date.now(),
    contentHash: CryptoJS.SHA256(quizText).toString(),
  });

  // Extract questions (if public)
  if (visibility === 'public') {
    try {
      const questionsSnap = await admin
        .firestore()
        .collection('quizzes')
        .doc(quizId)
        .collection('questions')
        .get();

      for (const qDoc of questionsSnap.docs) {
        const question = qDoc.data();

        const questionText = `
Câu hỏi: ${question.question}
Các đáp án:
${question.options.map((opt: string, i: number) => `  ${i + 1}. ${opt}`).join('\n')}
Đáp án đúng: ${question.options[question.correctAnswer]}
${question.explanation ? `Giải thích: ${question.explanation}` : ''}
        `.trim();

        chunks.push({
          chunkId: `quiz_${quizId}_q_${qDoc.id}`,
          text: questionText,
          title: `${quizData.title} - Câu ${qDoc.id}`,
          sourceType: 'quiz',
          visibility: 'public',
          createdAt: Date.now(),
          contentHash: CryptoJS.SHA256(questionText).toString(),
        });
      }
    } catch (error) {
      console.error(`Error extracting questions for quiz ${quizId}:`, error);
    }
  }

  return chunks;
}

/**
 * Generate embeddings for chunks
 */
export async function embedChunks(chunks: ChunkMetadata[]): Promise<IndexedChunk[]> {
  const indexedChunks: IndexedChunk[] = [];

  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.text);
      indexedChunks.push({
        ...chunk,
        embedding,
      });
    } catch (error) {
      console.error(`Failed to embed chunk ${chunk.chunkId}:`, error);
    }
  }

  return indexedChunks;
}

/**
 * Add quiz to index (CREATE operation)
 */
export async function addQuizToIndex(quizId: string, quizData: any): Promise<void> {
  console.log(`➕ Adding quiz to index: ${quizId}`);

  try {
    // 1. Extract chunks
    const chunks = await extractQuizChunks(quizId, quizData);
    if (chunks.length === 0) {
      console.log(`⏭️ No chunks to add for quiz ${quizId}`);
      return;
    }

    // 2. Generate embeddings
    const indexedChunks = await embedChunks(chunks);
    console.log(`✅ Generated ${indexedChunks.length} embeddings`);

    // 3. Load current index
    let index = await loadIndexFromStorage();
    if (!index) {
      // Create new index if doesn't exist
      index = {
        version: '1.0.0',
        createdAt: Date.now(),
        totalChunks: 0,
        chunks: [],
        sources: {},
      };
    }

    // 4. Remove any existing chunks for this quiz (in case of duplicates)
    index.chunks = index.chunks.filter(
      (c) => !c.chunkId.startsWith(`quiz_${quizId}`)
    );

    // 5. Add new chunks
    index.chunks.push(...indexedChunks);
    index.totalChunks = index.chunks.length;
    index.sources.quiz = (index.sources.quiz || 0) + indexedChunks.length;

    // 6. Save back
    const startTime = Date.now();
    await saveIndexToStorage(index);
    const duration = Date.now() - startTime;

    // 7. Invalidate cache
    invalidateIndexCache();

    // 8. Log metric (simplified)
    console.log(`✅ Added quiz ${quizId} to index (${duration}ms, ${indexedChunks.length} chunks)`);
  } catch (error) {
    console.error(`❌ Error adding quiz ${quizId} to index:`, error);
    throw error;
  }
}

/**
 * Update quiz in index (UPDATE operation)
 */
export async function updateQuizInIndex(
  quizId: string,
  oldData: any,
  newData: any
): Promise<void> {
  console.log(`🔄 Updating quiz in index: ${quizId}`);

  try {
    // Check if important fields changed
    const importantFields = ['title', 'description', 'category', 'status', 'visibility'];
    const hasImportantChange = importantFields.some(
      (field) => oldData?.[field] !== newData?.[field]
    );

    if (!hasImportantChange) {
      console.log(`⏭️ No important changes for quiz ${quizId}, skipping update`);
      return;
    }

    // Check content hash to avoid unnecessary re-embedding
    const oldHash = oldData?.contentHash;
    const newText = `${newData.title} ${newData.description} ${newData.category}`;
    const newHash = CryptoJS.SHA256(newText).toString();

    if (oldHash === newHash && newData.status === 'approved') {
      console.log(`⏭️ Content unchanged for quiz ${quizId}, skipping re-embedding`);
      return;
    }

    // If quiz is no longer approved, remove it
    if (newData.status !== 'approved') {
      await removeQuizFromIndex(quizId);
      return;
    }

    // Otherwise, treat as add (which handles removal + addition)
    await addQuizToIndex(quizId, newData);
  } catch (error) {
    console.error(`❌ Error updating quiz ${quizId} in index:`, error);
    throw error;
  }
}

/**
 * Remove quiz from index (DELETE operation)
 */
export async function removeQuizFromIndex(quizId: string): Promise<void> {
  console.log(`➖ Removing quiz from index: ${quizId}`);

  try {
    // Load current index
    const index = await loadIndexFromStorage();
    if (!index) {
      console.log('⚠️ No index found, nothing to remove');
      return;
    }

    // Count chunks before removal
    const beforeCount = index.chunks.length;

    // Remove all chunks for this quiz
    index.chunks = index.chunks.filter((c) => !c.chunkId.startsWith(`quiz_${quizId}`));

    const removedCount = beforeCount - index.chunks.length;

    if (removedCount === 0) {
      console.log(`ℹ️ No chunks found for quiz ${quizId}`);
      return;
    }

    // Update metadata
    index.totalChunks = index.chunks.length;

    // Save back
    await saveIndexToStorage(index);

    console.log(`✅ Removed ${removedCount} chunks for quiz ${quizId}`);
  } catch (error) {
    console.error(`❌ Error removing quiz ${quizId} from index:`, error);
    throw error;
  }
}

/**
 * Check if index needs update for a quiz
 */
export async function needsIndexUpdate(
  quizId: string,
  quizData: any
): Promise<boolean> {
  try {
    const index = await loadIndexFromStorage();
    if (!index) return true; // No index, needs update

    // Check if quiz exists in index
    const existingChunks = index.chunks.filter((c) =>
      c.chunkId.startsWith(`quiz_${quizId}`)
    );

    if (existingChunks.length === 0) {
      // Quiz not in index
      return quizData.status === 'approved';
    }

    // Check content hash
    const existingChunk = existingChunks[0];
    const newText = `${quizData.title} ${quizData.description} ${quizData.category}`;
    const newHash = CryptoJS.SHA256(newText).toString();

    return existingChunk.contentHash !== newHash;
  } catch (error) {
    console.error('Error checking if index needs update:', error);
    return true; // Err on the side of updating
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  try {
    const index = await loadIndexFromStorage();
    if (!index) {
      return {
        exists: false,
        totalChunks: 0,
        sources: {},
      };
    }

    // Count by source type
    const quizIds = new Set<string>();
    index.chunks.forEach((chunk) => {
      const match = chunk.chunkId.match(/^quiz_([^_]+)/);
      if (match) {
        quizIds.add(match[1]);
      }
    });

    return {
      exists: true,
      totalChunks: index.totalChunks,
      sources: index.sources,
      uniqueQuizzes: quizIds.size,
      createdAt: new Date(index.createdAt),
      version: index.version,
    };
  } catch (error) {
    console.error('Error getting index stats:', error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate index integrity
 */
export async function validateIndex(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const index = await loadIndexFromStorage();
    if (!index) {
      return {
        valid: false,
        issues: ['Index does not exist'],
      };
    }

    // Check for duplicate chunk IDs
    const chunkIds = new Set<string>();
    const duplicates: string[] = [];

    index.chunks.forEach((chunk) => {
      if (chunkIds.has(chunk.chunkId)) {
        duplicates.push(chunk.chunkId);
      } else {
        chunkIds.add(chunk.chunkId);
      }
    });

    if (duplicates.length > 0) {
      issues.push(`Found ${duplicates.length} duplicate chunk IDs`);
    }

    // Check for invalid embeddings
    const invalidEmbeddings = index.chunks.filter(
      (chunk) => !chunk.embedding || chunk.embedding.length === 0
    );

    if (invalidEmbeddings.length > 0) {
      issues.push(`Found ${invalidEmbeddings.length} chunks with invalid embeddings`);
    }

    // Check totalChunks matches actual count
    if (index.totalChunks !== index.chunks.length) {
      issues.push(
        `Metadata mismatch: totalChunks=${index.totalChunks}, actual=${index.chunks.length}`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
